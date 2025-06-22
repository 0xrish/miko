#!/usr/bin/env node

import { Keypair } from '@solana/web3.js';
import fs from 'fs/promises';
import path from 'path';

const secretsDir = path.resolve('secrets');

async function generateWallet() {
  try {
    console.log('🔑 Generating new Solana wallet...');
    
    // Ensure secrets directory exists
    await fs.mkdir(secretsDir, { recursive: true });
    
    // Generate new keypair
    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toBase58();
    const secretKey = Array.from(keypair.secretKey);
    
    // Create wallet data
    const walletData = {
      publicKey,
      secretKey,
      createdAt: Date.now(),
      used: false,
      generatedBy: 'generate-wallet.js'
    };
    
    // Save to file
    const filePath = path.join(secretsDir, `${publicKey}.json`);
    await fs.writeFile(filePath, JSON.stringify(walletData, null, 2));
    
    console.log('✅ Wallet generated successfully!');
    console.log('');
    console.log('📋 WALLET DETAILS');
    console.log('=================');
    console.log(`Public Key: ${publicKey}`);
    console.log(`File: ${filePath}`);
    console.log(`Created: ${new Date(walletData.createdAt).toISOString()}`);
    console.log('');
    console.log('🔒 SECURITY NOTES');
    console.log('=================');
    console.log('• This wallet is stored as plain JSON in the secrets folder');
    console.log('• Make sure to secure the secrets folder appropriately');
    console.log('• Never share your private key with anyone');
    console.log('• Consider backing up your wallet files securely');
    console.log('');
    console.log('💡 USAGE');
    console.log('========');
    console.log('• Use this public key in the /api/swap/user endpoint');
    console.log('• The relayer will use this wallet to sign transactions');
    console.log('• Make sure the wallet has sufficient balance for swaps');
    
    return {
      publicKey,
      filePath
    };
  } catch (error) {
    console.error('❌ Error generating wallet:', error);
    throw error;
  }
}

async function listWallets() {
  try {
    const files = await fs.readdir(secretsDir).catch(() => []);
    const wallets = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const content = await fs.readFile(path.join(secretsDir, file), 'utf-8');
          const walletData = JSON.parse(content);
          wallets.push({
            publicKey: walletData.publicKey,
            createdAt: walletData.createdAt,
            used: walletData.used || false,
            file
          });
        } catch (error) {
          console.error(`Error reading ${file}:`, error.message);
        }
      }
    }
    
    if (wallets.length === 0) {
      console.log('📭 No wallets found in secrets folder');
      return;
    }
    
    console.log(`📋 Found ${wallets.length} wallet(s):`);
    console.log('');
    
    wallets.forEach((wallet, index) => {
      console.log(`${index + 1}. ${wallet.publicKey}`);
      console.log(`   Created: ${new Date(wallet.createdAt).toISOString()}`);
      console.log(`   Used: ${wallet.used ? 'Yes' : 'No'}`);
      console.log(`   File: ${wallet.file}`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Error listing wallets:', error);
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (command === 'list') {
    await listWallets();
  } else if (command === 'generate' || !command) {
    await generateWallet();
  } else {
    console.log('Usage:');
    console.log('  node generate-wallet.js           # Generate new wallet');
    console.log('  node generate-wallet.js generate  # Generate new wallet');
    console.log('  node generate-wallet.js list      # List existing wallets');
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
} 