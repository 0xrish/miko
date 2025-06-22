import { Keypair } from '@solana/web3.js';
import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import fs from 'fs/promises';
import path from 'path';

const secretsDir = path.resolve('secrets');
const SOLANA_RPC = process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(SOLANA_RPC, 'confirmed');

// Native SOL mint address
const SOL_MINT = 'So11111111111111111111111111111111111111112';

// In-memory storage for temporary wallets (better than file system for security)
const walletStore = new Map();

export async function generateWalletAndStore() {
  try {
    // Ensure secrets directory exists
    await fs.mkdir(secretsDir, { recursive: true });

    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toBase58();
    const secretKey = Array.from(keypair.secretKey);
    
    // Store in memory
    walletStore.set(publicKey, {
      secretKey,
      createdAt: Date.now(),
      used: false
    });
    
    // Store as plain JSON file in secrets folder
    const secretKeyPath = path.join(secretsDir, `${publicKey}.json`);
    const walletData = {
      publicKey,
      secretKey,
      createdAt: Date.now(),
      used: false,
      generatedBy: 'walletService.js'
    };
    await fs.writeFile(secretKeyPath, JSON.stringify(walletData, null, 2));

    console.log(`Generated new wallet: ${publicKey}`);
    
    // Schedule cleanup (remove after 1 hour)
    setTimeout(() => {
      cleanupWallet(publicKey);
    }, 60 * 60 * 1000); // 1 hour

    return {
      publicKey,
      secretKeyPath: secretKeyPath // For backward compatibility
    };
  } catch (error) {
    console.error('Error generating wallet:', error);
    throw new Error(`Failed to generate wallet: ${error.message}`);
  }
}

export async function loadKeypair(publicKey) {
  try {
    // Try to load from memory first
    const walletData = walletStore.get(publicKey);
    if (walletData) {
      walletData.used = true;
      const secretKey = Uint8Array.from(walletData.secretKey);
      return Keypair.fromSecretKey(secretKey);
    }
    
    // Load from file system (plain JSON)
    const secretKeyPath = path.join(secretsDir, `${publicKey}.json`);
    const fileContent = await fs.readFile(secretKeyPath, 'utf-8');
    const data = JSON.parse(fileContent);
    
    // Handle plain JSON format only
    let secretKey;
    if (data.secretKey && Array.isArray(data.secretKey)) {
      // Plain format
      secretKey = Uint8Array.from(data.secretKey);
    } else {
      throw new Error(`Invalid wallet format for ${publicKey}. Expected plain JSON with secretKey array.`);
    }
    
    return Keypair.fromSecretKey(secretKey);
  } catch (error) {
    console.error(`Error loading keypair for ${publicKey}:`, error);
    throw new Error(`Failed to load wallet: ${error.message}`);
  }
}

export async function cleanupWallet(publicKey) {
  try {
    // Remove from memory
    walletStore.delete(publicKey);
    
    // Remove file
    const secretKeyPath = path.join(secretsDir, `${publicKey}.json`);
    await fs.unlink(secretKeyPath).catch(() => {}); // Ignore if file doesn't exist
    
    console.log(`Cleaned up wallet: ${publicKey}`);
  } catch (error) {
    console.error(`Error cleaning up wallet ${publicKey}:`, error);
  }
}

// Cleanup old wallets on startup
export async function cleanupOldWallets() {
  try {
    const files = await fs.readdir(secretsDir).catch(() => []);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(secretsDir, file);
        const content = await fs.readFile(filePath, 'utf-8').catch(() => null);
        if (content) {
          try {
            const data = JSON.parse(content);
            const createdAt = data.createdAt || 0;
            if (now - createdAt > maxAge) {
              await fs.unlink(filePath);
              console.log(`Cleaned up old wallet file: ${file}`);
            }
          } catch (error) {
            console.error(`Error parsing wallet file ${file}:`, error.message);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

// Initialize cleanup on module load
cleanupOldWallets();

// New function to check if tokens have been received in a wallet
export async function checkTokenBalance(walletAddress, tokenMint, expectedAmount) {
  try {
    const publicKey = new PublicKey(walletAddress);
    
    if (tokenMint === SOL_MINT) {
      // Check SOL balance
      const balance = await connection.getBalance(publicKey);
      console.log(`SOL balance for ${walletAddress}: ${balance} lamports`);
      return {
        hasTokens: balance >= expectedAmount,
        currentBalance: balance,
        expectedAmount,
        tokenMint: SOL_MINT
      };
    } else {
      // Check SPL token balance
      const tokenMintPubkey = new PublicKey(tokenMint);
      const tokenAccount = await getAssociatedTokenAddress(tokenMintPubkey, publicKey);
      
      try {
        const tokenAccountInfo = await connection.getTokenAccountBalance(tokenAccount);
        const balance = BigInt(tokenAccountInfo.value.amount);
        const expected = BigInt(expectedAmount);
        
        console.log(`Token balance for ${walletAddress}: ${balance} ${tokenMint}`);
        return {
          hasTokens: balance >= expected,
          currentBalance: balance.toString(),
          expectedAmount: expectedAmount.toString(),
          tokenMint
        };
      } catch (error) {
        // Token account doesn't exist or has no balance
        console.log(`No token account found for ${walletAddress} with mint ${tokenMint}`);
        return {
          hasTokens: false,
          currentBalance: '0',
          expectedAmount: expectedAmount.toString(),
          tokenMint
        };
      }
    }
  } catch (error) {
    console.error(`Error checking token balance for ${walletAddress}:`, error);
    throw new Error(`Failed to check token balance: ${error.message}`);
  }
}

// New function to wait for tokens to be received
export async function waitForTokens(walletAddress, tokenMint, expectedAmount, maxWaitTime = 300000) {
  const startTime = Date.now();
  const checkInterval = 5000; // Check every 5 seconds
  
  console.log(`Waiting for ${expectedAmount} tokens of ${tokenMint} in wallet ${walletAddress}`);
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      const balanceCheck = await checkTokenBalance(walletAddress, tokenMint, expectedAmount);
      
      if (balanceCheck.hasTokens) {
        console.log(`Tokens received! Balance: ${balanceCheck.currentBalance}`);
        return balanceCheck;
      }
      
      console.log(`Waiting for tokens... Current balance: ${balanceCheck.currentBalance}, Expected: ${expectedAmount}`);
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    } catch (error) {
      console.error('Error while waiting for tokens:', error);
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
  }
  
  throw new Error(`Timeout: Tokens not received within ${maxWaitTime / 1000} seconds`);
} 