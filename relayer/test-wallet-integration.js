import axios from 'axios';
import { Connection, PublicKey, Keypair, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

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

// Wallet configuration from the JSON file
const WALLET_CONFIG = {
  publicKey: "B92TJxyFGgK9tMtyzzQXDDxWNxSnwhbs1uvfnCVVdaS1",
  secretKey: [
    232, 221, 162, 86, 150, 107, 208, 3, 146, 225, 48, 141, 95, 87, 90, 182,
    235, 62, 232, 14, 200, 122, 39, 29, 117, 20, 66, 244, 14, 60, 193, 136,
    150, 163, 40, 202, 217, 107, 131, 171, 227, 150, 129, 186, 200, 149, 55,
    114, 246, 147, 141, 113, 234, 91, 120, 106, 38, 124, 52, 151, 133, 66, 37, 110
  ],
  destinationWallet: "EQ1iJf9TGTGs163zcsoKq1JgrXdDK2KGAdoYtB1adoev"
};

// Test configuration - transfer all available funds
const TEST_CONFIG = {
  fromToken: 'So11111111111111111111111111111111111111112', // SOL
  toToken: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',   // USDC
  amount: '0', // Will be calculated based on available balance
  destinationWallet: WALLET_CONFIG.destinationWallet,
  slippageBps: 50
};

// Helper function to create keypair from secret key
function createKeypairFromSecretKey(secretKeyArray) {
  const secretKey = Uint8Array.from(secretKeyArray);
  return Keypair.fromSecretKey(secretKey);
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

// Helper function to send ALL SOL to destination wallet (keeping only rent exempt amount)
async function transferAllSOLToDestination(fromKeypair, toAddress) {
  try {
    const toPublicKey = new PublicKey(toAddress);
    
    // Check current balance
    const fromBalance = await connection.getBalance(fromKeypair.publicKey);
    console.log(`💰 Current balance: ${fromBalance / 1000000000} SOL (${fromBalance} lamports)`);
    
    // Reserve amount for transaction fees and rent exempt minimum
    const rentExemptAmount = await connection.getMinimumBalanceForRentExemption(0);
    const transactionFee = 5000; // Estimated transaction fee in lamports
    const reserveAmount = rentExemptAmount + transactionFee;
    
    if (fromBalance <= reserveAmount) {
      throw new Error(`Insufficient balance. Have ${fromBalance} lamports, need at least ${reserveAmount} lamports for fees and rent exemption`);
    }
    
    // Calculate amount to transfer (all balance minus reserves)
    const transferAmount = fromBalance - reserveAmount;
    console.log(`📤 Transferring ${transferAmount / 1000000000} SOL (${transferAmount} lamports) to ${toAddress}`);
    console.log(`🔒 Keeping ${reserveAmount / 1000000000} SOL (${reserveAmount} lamports) for fees and rent exemption`);
    
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromKeypair.publicKey,
        toPubkey: toPublicKey,
        lamports: transferAmount,
      })
    );

    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [fromKeypair],
      { 
        commitment: 'confirmed',
        skipPreflight: false,
        preflightCommitment: 'confirmed'
      }
    );

    console.log(`✅ SOL transfer completed: ${signature}`);
    console.log(`🔗 View on Solscan: https://solscan.io/tx/${signature}`);
    
    return { signature, transferAmount, reserveAmount };
  } catch (error) {
    console.error('❌ Error transferring SOL:', error);
    throw error;
  }
}

// Helper function to send SOL to a wallet
async function sendSOLToWallet(fromKeypair, toAddress, amount) {
  try {
    const toPublicKey = new PublicKey(toAddress);
    
    // Check if we have enough balance
    const fromBalance = await connection.getBalance(fromKeypair.publicKey);
    const requiredAmount = amount + 5000; // Add fee buffer
    
    if (fromBalance < requiredAmount) {
      throw new Error(`Insufficient balance. Have ${fromBalance} lamports, need ${requiredAmount} lamports (${amount} + 5000 for fees)`);
    }
    
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromKeypair.publicKey,
        toPubkey: toPublicKey,
        lamports: amount,
      })
    );

    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [fromKeypair],
      { commitment: 'confirmed' }
    );

    console.log(`✅ SOL transfer completed: ${signature}`);
    return signature;
  } catch (error) {
    console.error('Error sending SOL:', error);
    throw error;
  }
}

// Helper function to wait for balance to update
async function waitForBalanceUpdate(walletAddress, expectedMinBalance, maxWaitTime = 60000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      const { balance } = await checkSOLBalance(walletAddress);
      if (balance >= expectedMinBalance) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
    } catch (error) {
      console.error('Error checking balance:', error);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  return false;
}

async function testWalletIntegration() {
  console.log('🚀 Testing Wallet Integration with Complete Money Transfer');
  console.log('========================================================\n');

  try {
    // Step 1: Create keypair from the wallet JSON
    console.log('1️⃣ Loading wallet from JSON configuration...');
    const sourceKeypair = createKeypairFromSecretKey(WALLET_CONFIG.secretKey);
    console.log(`✅ Wallet loaded: ${sourceKeypair.publicKey.toBase58()}`);
    
    // Verify it matches the expected public key
    if (sourceKeypair.publicKey.toBase58() !== WALLET_CONFIG.publicKey) {
      throw new Error('Public key mismatch! Secret key does not match the expected public key.');
    }
    console.log('✅ Public key verification passed');

    // Step 2: Check initial SOL balance
    console.log('\n2️⃣ Checking initial SOL balance...');
    const initialBalance = await checkSOLBalance(WALLET_CONFIG.publicKey);
    console.log(`💰 Current balance: ${initialBalance.solBalance.toFixed(9)} SOL (${initialBalance.balance} lamports)`);
    
    // Check if we have any meaningful balance
    const minTransferAmount = 10000; // 0.00001 SOL minimum
    if (initialBalance.balance < minTransferAmount) {
      console.log('⚠️ WARNING: Very low SOL balance. Cannot perform meaningful transfer.');
      console.log(`   Current: ${initialBalance.solBalance} SOL (${initialBalance.balance} lamports)`);
      console.log(`   Minimum needed: ${minTransferAmount / 1000000000} SOL (${minTransferAmount} lamports)`);
      return;
    }

    // Step 3: Check destination wallet balance before transfer
    console.log('\n3️⃣ Checking destination wallet balance before transfer...');
    try {
      const destBalanceBefore = await checkSOLBalance(TEST_CONFIG.destinationWallet);
      console.log(`📊 Destination wallet balance before: ${destBalanceBefore.solBalance.toFixed(9)} SOL`);
    } catch (error) {
      console.log('⚠️ Could not check destination wallet balance:', error.message);
    }

    // Step 4: Transfer ALL money to destination wallet
    console.log('\n4️⃣ Transferring ALL available SOL to destination wallet...');
    console.log(`🎯 Destination: ${TEST_CONFIG.destinationWallet}`);
    
    const transferResult = await transferAllSOLToDestination(sourceKeypair, TEST_CONFIG.destinationWallet);
    
    console.log('\n🎉 TRANSFER COMPLETED SUCCESSFULLY!');
    console.log('📊 Transfer Results:');
    console.log(`   Transaction: ${transferResult.signature}`);
    console.log(`   Amount Transferred: ${transferResult.transferAmount / 1000000000} SOL (${transferResult.transferAmount} lamports)`);
    console.log(`   Amount Kept for Fees: ${transferResult.reserveAmount / 1000000000} SOL (${transferResult.reserveAmount} lamports)`);
    console.log(`🔗 View on Solscan: https://solscan.io/tx/${transferResult.signature}`);

    // Step 5: Wait for transaction confirmation and check final balances
    console.log('\n5️⃣ Waiting for transaction confirmation and checking final balances...');
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds for confirmation
    
    try {
      // Check source wallet final balance
      const finalSourceBalance = await checkSOLBalance(WALLET_CONFIG.publicKey);
      console.log(`💰 Source wallet final balance: ${finalSourceBalance.solBalance.toFixed(9)} SOL`);
      console.log(`   Change: ${(finalSourceBalance.solBalance - initialBalance.solBalance).toFixed(9)} SOL`);
      
      // Check destination wallet final balance
      const finalDestBalance = await checkSOLBalance(TEST_CONFIG.destinationWallet);
      console.log(`💰 Destination wallet final balance: ${finalDestBalance.solBalance.toFixed(9)} SOL`);
      
    } catch (error) {
      console.error('⚠️ Error checking final balances:', error.message);
    }

    // Step 6: Test Summary
    console.log('\n🎯 Complete Money Transfer Summary:');
    console.log('==================================');
    console.log('✅ Wallet loading: PASSED');
    console.log('✅ Balance checking: PASSED');
    console.log('✅ Money transfer: COMPLETED');
    console.log('✅ All available funds transferred to destination');
    console.log('\n🔧 System Status: MONEY TRANSFER COMPLETED');
    console.log(`📝 Destination wallet: ${TEST_CONFIG.destinationWallet}`);
    console.log(`🎯 Transfer completed from wallet: ${WALLET_CONFIG.publicKey}`);
    console.log(`💸 Total transferred: ${transferResult.transferAmount / 1000000000} SOL`);

  } catch (error) {
    console.error('💥 Transfer failed with error:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Export for potential use in other tests
export { testWalletIntegration, checkSOLBalance, WALLET_CONFIG };

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testWalletIntegration();
} 