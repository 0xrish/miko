import axios from 'axios';
import { Connection, PublicKey, Keypair, SystemProgram, Transaction, VersionedTransaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import dotenv from 'dotenv';
import bs58 from 'bs58';

// Load environment variables
dotenv.config();

const BASE_URL = 'http://localhost:3000';
const SOLANA_RPC = process.env.SOLANA_RPC || 'https://mainnet.helius-rpc.com/?api-key=04701faa-3c75-446c-ba75-d0465245c7f7';

// Create connection with proper configuration
const connection = new Connection(SOLANA_RPC, {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 60000,
  wsEndpoint: undefined,
  httpHeaders: {
    'Content-Type': 'application/json',
  }
});

// Token addresses
const TOKENS = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  RAY: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'
};

// Helper function to create keypair from private key
function createKeypairFromPrivateKey(privateKey) {
  try {
    let secretKey;
    
    // Try to parse as base58 first
    try {
      secretKey = bs58.decode(privateKey);
    } catch (e) {
      // If base58 fails, try to parse as JSON array
      try {
        secretKey = new Uint8Array(JSON.parse(privateKey));
      } catch (e2) {
        throw new Error('Invalid private key format. Please provide either a base58 string or JSON array of numbers.');
      }
    }
    
    return Keypair.fromSecretKey(secretKey);
  } catch (error) {
    throw new Error(`Failed to create keypair: ${error.message}`);
  }
}

// Helper function to check SOL balance with retries
async function checkSOLBalance(walletAddress, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Checking balance (attempt ${attempt}/${maxRetries})...`);
      const publicKey = new PublicKey(walletAddress);
      const balance = await connection.getBalance(publicKey);
      const solBalance = balance / 1000000000; // Convert lamports to SOL
      return { balance, solBalance };
    } catch (error) {
      console.error(`Error checking balance for ${walletAddress} (attempt ${attempt}):`, error.message);
      if (attempt === maxRetries) {
        throw error;
      }
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

// Helper function to check token balance
async function checkTokenBalance(walletAddress, tokenMint) {
  try {
    const publicKey = new PublicKey(walletAddress);
    const mintPublicKey = new PublicKey(tokenMint);
    
    // Get associated token account
    const associatedTokenAccount = await getAssociatedTokenAddress(
      mintPublicKey,
      publicKey
    );
    
    try {
      const tokenBalance = await connection.getTokenAccountBalance(associatedTokenAccount);
      return {
        balance: tokenBalance.value.amount,
        decimals: tokenBalance.value.decimals,
        uiAmount: tokenBalance.value.uiAmount
      };
    } catch (error) {
      // Token account doesn't exist
      return {
        balance: '0',
        decimals: 0,
        uiAmount: 0
      };
    }
  } catch (error) {
    console.error(`Error checking token balance:`, error.message);
    return {
      balance: '0',
      decimals: 0,
      uiAmount: 0
    };
  }
}

// Helper function to get Jupiter quote
async function getJupiterQuote(inputMint, outputMint, amount, slippageBps = 30) {
  try {
    const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`;
    console.log(`🔍 Getting Jupiter quote: ${quoteUrl}`);
    
    const response = await axios.get(quoteUrl);
    return response.data;
  } catch (error) {
    console.error('Error getting Jupiter quote:', error.response?.data || error.message);
    throw error;
  }
}

// Helper function to get Jupiter swap transaction
async function getJupiterSwapTransaction(quoteResponse, userPublicKey) {
  try {
    const swapUrl = 'https://quote-api.jup.ag/v6/swap';
    const swapData = {
      quoteResponse,
      userPublicKey: userPublicKey.toString(),
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 'auto'
    };
    
    console.log('🔄 Getting Jupiter swap transaction...');
    const response = await axios.post(swapUrl, swapData);
    return response.data;
  } catch (error) {
    console.error('Error getting Jupiter swap transaction:', error.response?.data || error.message);
    throw error;
  }
}

// Helper function to execute swap transaction
async function executeSwapTransaction(swapTransactionData, userKeypair) {
  try {
    // Deserialize the transaction as a versioned transaction
    const transactionBuffer = Buffer.from(swapTransactionData.swapTransaction, 'base64');
    const transaction = VersionedTransaction.deserialize(transactionBuffer);
    
    // Sign the transaction
    transaction.sign([userKeypair]);
    
    // Send the transaction
    console.log('📤 Sending swap transaction...');
    const signature = await connection.sendTransaction(transaction, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
      maxRetries: 3
    });
    
    console.log(`🔄 Transaction sent: ${signature}`);
    console.log('⏳ Waiting for confirmation...');
    
    // Wait for confirmation
    const confirmation = await connection.confirmTransaction({
      signature,
      blockhash: transaction.message.recentBlockhash,
      lastValidBlockHeight: await connection.getBlockHeight() + 150
    }, 'confirmed');
    
    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }
    
    console.log(`✅ Swap transaction confirmed: ${signature}`);
    console.log(`🔗 View on Solscan: https://solscan.io/tx/${signature}`);
    
    return signature;
  } catch (error) {
    console.error('Error executing swap transaction:', error);
    throw error;
  }
}

// Main test function
async function testMainnetSwap() {
  console.log('🚀 Testing Mainnet Swap Functionality');
  console.log('====================================\n');

  // Get private key from command line arguments or prompt
  const privateKeyArg = process.argv[2];
  if (!privateKeyArg) {
    console.error('❌ Error: Please provide your private key as an argument');
    console.log('Usage: node test-mainnet-swap.js "YOUR_PRIVATE_KEY"');
    console.log('');
    console.log('Private key can be in one of these formats:');
    console.log('1. Base58 string: "5Kb8kLf9CJRdnvx..."');
    console.log('2. JSON array: "[123,45,67,...]"');
    console.log('');
    console.log('⚠️  WARNING: Never share your private key with anyone!');
    return;
  }

  try {
    // Step 1: Create keypair from private key
    console.log('1️⃣ Loading wallet from private key...');
    const userKeypair = createKeypairFromPrivateKey(privateKeyArg);
    const userPublicKey = userKeypair.publicKey;
    console.log(`✅ Wallet loaded: ${userPublicKey.toBase58()}`);

    // Step 2: Check initial balances
    console.log('\n2️⃣ Checking initial balances...');
    const initialSOLBalance = await checkSOLBalance(userPublicKey.toBase58());
    console.log(`💰 SOL Balance: ${initialSOLBalance.solBalance.toFixed(9)} SOL (${initialSOLBalance.balance} lamports)`);
    
    // Check USDC balance
    const initialUSDCBalance = await checkTokenBalance(userPublicKey.toBase58(), TOKENS.USDC);
    console.log(`💰 USDC Balance: ${initialUSDCBalance.uiAmount || 0} USDC`);

    // Ensure minimum SOL balance for swap
    const minSOLForSwap = 0.005; // 0.005 SOL minimum (increased for fees and token accounts)
    if (initialSOLBalance.solBalance < minSOLForSwap) {
      console.log(`⚠️ WARNING: Insufficient SOL balance for swap.`);
      console.log(`   Current: ${initialSOLBalance.solBalance} SOL`);
      console.log(`   Minimum needed: ${minSOLForSwap} SOL`);
      console.log(`   Note: Additional SOL needed for transaction fees and token account creation`);
      return;
    }

    // Step 3: Configure swap parameters
    const swapAmount = Math.floor(initialSOLBalance.balance * 0.05); // Use 5% of SOL balance (reduced from 10%)
    const swapConfig = {
      inputMint: TOKENS.SOL,
      outputMint: TOKENS.USDC,
      amount: swapAmount.toString(),
      slippageBps: 30, // 0.3% slippage
      userPublicKey: userPublicKey.toBase58()
    };

    console.log('\n3️⃣ Swap Configuration:');
    console.log(`   Input Token: SOL`);
    console.log(`   Output Token: USDC`);
    console.log(`   Amount: ${swapAmount / 1000000000} SOL (${swapAmount} lamports)`);
    console.log(`   Slippage: ${swapConfig.slippageBps / 100}%`);
    console.log(`   User Wallet: ${swapConfig.userPublicKey}`);

    // Validate we have enough SOL remaining for fees
    const remainingSOL = initialSOLBalance.balance - swapAmount;
    const estimatedFeesAndAccounts = 0.003 * 1000000000; // 0.003 SOL in lamports for fees and accounts
    
    if (remainingSOL < estimatedFeesAndAccounts) {
      console.log(`⚠️ WARNING: Not enough SOL remaining for transaction fees.`);
      console.log(`   Swap amount: ${swapAmount / 1000000000} SOL`);
      console.log(`   Remaining: ${remainingSOL / 1000000000} SOL`);
      console.log(`   Estimated fees needed: ${estimatedFeesAndAccounts / 1000000000} SOL`);
      console.log(`   Try reducing swap amount or adding more SOL to wallet`);
      return;
    }
    
    console.log(`   Remaining SOL after swap: ${remainingSOL / 1000000000} SOL`);
    console.log(`   Estimated fees reserved: ${estimatedFeesAndAccounts / 1000000000} SOL`);

    // Step 4: Get Jupiter quote
    console.log('\n4️⃣ Getting Jupiter quote...');
    const quote = await getJupiterQuote(
      swapConfig.inputMint,
      swapConfig.outputMint,
      swapConfig.amount,
      swapConfig.slippageBps
    );

    console.log('✅ Quote received successfully!');
    console.log(`📊 Quote Details:`);
    console.log(`   Input Amount: ${quote.inAmount / 1000000000} SOL`);
    console.log(`   Output Amount: ${quote.outAmount / 1000000} USDC`);
    console.log(`   Price Impact: ${quote.priceImpactPct}%`);
    console.log(`   Route: ${quote.routePlan.map(r => r.swapInfo.label).join(' → ')}`);

    // Step 5: Get swap transaction
    console.log('\n5️⃣ Getting swap transaction...');
    const swapTransaction = await getJupiterSwapTransaction(quote, userPublicKey);
    console.log('✅ Swap transaction prepared successfully!');

    // Step 6: Execute the swap
    console.log('\n6️⃣ Executing swap transaction...');
    console.log('⚠️  This will use real funds on mainnet!');
    console.log('⏳ Processing swap...');
    
    const swapSignature = await executeSwapTransaction(swapTransaction, userKeypair);

    // Step 7: Wait and check final balances
    console.log('\n7️⃣ Waiting for balance updates and checking final balances...');
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
    
    const finalSOLBalance = await checkSOLBalance(userPublicKey.toBase58());
    const finalUSDCBalance = await checkTokenBalance(userPublicKey.toBase58(), TOKENS.USDC);
    
    console.log('\n📊 Final Balances:');
    console.log(`💰 SOL Balance: ${finalSOLBalance.solBalance.toFixed(9)} SOL`);
    console.log(`   Change: ${(finalSOLBalance.solBalance - initialSOLBalance.solBalance).toFixed(9)} SOL`);
    console.log(`💰 USDC Balance: ${finalUSDCBalance.uiAmount || 0} USDC`);
    console.log(`   Change: ${(finalUSDCBalance.uiAmount || 0) - (initialUSDCBalance.uiAmount || 0)} USDC`);

    // Step 8: Test Summary
    console.log('\n🎯 Mainnet Swap Test Summary:');
    console.log('============================');
    console.log('✅ Wallet loading: PASSED');
    console.log('✅ Balance checking: PASSED');
    console.log('✅ Jupiter quote: PASSED');
    console.log('✅ Swap transaction: EXECUTED');
    console.log('✅ Transaction confirmation: PASSED');
    console.log('\n🔧 System Status: MAINNET SWAP COMPLETED');
    console.log(`📝 Wallet: ${userPublicKey.toBase58()}`);
    console.log(`🔗 Transaction: https://solscan.io/tx/${swapSignature}`);
    console.log(`💱 Swapped: ${swapAmount / 1000000000} SOL → ${(finalUSDCBalance.uiAmount || 0) - (initialUSDCBalance.uiAmount || 0)} USDC`);

  } catch (error) {
    console.error('💥 Mainnet swap test failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Export for potential use in other tests
export { testMainnetSwap, checkSOLBalance, checkTokenBalance, TOKENS };

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testMainnetSwap();
} 