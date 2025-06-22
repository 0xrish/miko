#!/usr/bin/env node

import { 
  Connection, 
  PublicKey, 
  SystemProgram, 
  Transaction, 
  sendAndConfirmTransaction,
  Keypair,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { 
  getAssociatedTokenAddress, 
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction
} from '@solana/spl-token';
import fs from 'fs/promises';
import path from 'path';

// Configuration
const MAINNET_RPC = process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com';
const DESTINATION_WALLET = 'EQ1iJf9TGTGs163zcsoKq1JgrXdDK2KGAdoYtB1adoev';
const WALLET_PATH = '../relayer/secrets/G1uzkCoBaw2txLGSPcv4hbgDCh43rpT8nafnmCBmyJXV.json'; // Updated to use plain format wallet

// Native SOL mint address
const SOL_MINT = 'So11111111111111111111111111111111111111112';

const connection = new Connection(MAINNET_RPC, 'confirmed');

class AssetTransferService {
  constructor() {
    this.sourceKeypair = null;
    this.destinationPubkey = new PublicKey(DESTINATION_WALLET);
  }

  // Load wallet from plain JSON format
  async loadWallet() {
    try {
      console.log('🔑 Loading wallet...');
      
      const fileContent = await fs.readFile(WALLET_PATH, 'utf-8');
      const walletData = JSON.parse(fileContent);
      
      // Handle plain JSON format
      if (walletData.secretKey && Array.isArray(walletData.secretKey)) {
        const secretKey = Uint8Array.from(walletData.secretKey);
        this.sourceKeypair = Keypair.fromSecretKey(secretKey);
        
        console.log(`✅ Wallet loaded: ${this.sourceKeypair.publicKey.toBase58()}`);
        return this.sourceKeypair;
      } else {
        throw new Error('Invalid wallet format. Expected plain JSON with secretKey array.');
      }
    } catch (error) {
      console.error('❌ Error loading wallet:', error);
      throw new Error(`Failed to load wallet: ${error.message}`);
    }
  }

  // Get SOL balance
  async getSOLBalance() {
    try {
      const balance = await connection.getBalance(this.sourceKeypair.publicKey);
      return balance;
    } catch (error) {
      console.error('Error getting SOL balance:', error);
      return 0;
    }
  }

  // Get all SPL token accounts with balances
  async getAllTokenAccounts() {
    try {
      console.log('🔍 Discovering SPL token accounts...');
      
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        this.sourceKeypair.publicKey,
        {
          programId: TOKEN_PROGRAM_ID,
        }
      );

      const tokenBalances = [];
      
      for (const tokenAccount of tokenAccounts.value) {
        const accountData = tokenAccount.account.data.parsed;
        const mintAddress = accountData.info.mint;
        const balance = accountData.info.tokenAmount.amount;
        const decimals = accountData.info.tokenAmount.decimals;
        
        if (balance !== '0') {
          tokenBalances.push({
            mint: mintAddress,
            balance: balance,
            decimals: decimals,
            tokenAccount: tokenAccount.pubkey.toBase58()
          });
        }
      }

      console.log(`✅ Found ${tokenBalances.length} SPL tokens with balances`);
      return tokenBalances;
    } catch (error) {
      console.error('Error getting token accounts:', error);
      return [];
    }
  }

  // Transfer SOL
  async transferSOL() {
    try {
      const balance = await this.getSOLBalance();
      
      if (balance === 0) {
        console.log('⚠️  No SOL balance to transfer');
        return null;
      }

      // Reserve some SOL for transaction fees
      const reserveAmount = 5000; // ~0.000005 SOL for transaction fees
      const transferAmount = balance - reserveAmount;
      
      if (transferAmount <= 0) {
        console.log('⚠️  Insufficient SOL balance for transfer (need to reserve for fees)');
        return null;
      }
      
      console.log(`💰 Transferring ${transferAmount / LAMPORTS_PER_SOL} SOL...`);
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: this.sourceKeypair.publicKey,
          toPubkey: this.destinationPubkey,
          lamports: transferAmount,
        })
      );
      
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [this.sourceKeypair],
        { commitment: 'confirmed' }
      );
      
      console.log(`✅ SOL transfer completed: ${signature}`);
      return signature;
    } catch (error) {
      console.error('❌ Error transferring SOL:', error);
      throw error;
    }
  }

  // Transfer a single SPL token
  async transferSPLToken(tokenInfo) {
    try {
      const { mint, balance, tokenAccount } = tokenInfo;
      const tokenMintPubkey = new PublicKey(mint);
      
      console.log(`💎 Transferring ${balance} tokens (${mint.substring(0, 8)}...)`);
      
      // Get destination token account
      const destinationTokenAccount = await getAssociatedTokenAddress(
        tokenMintPubkey,
        this.destinationPubkey
      );
      
      // Check if destination token account exists
      const destinationAccountInfo = await connection.getAccountInfo(destinationTokenAccount);
      const needsDestinationAccount = !destinationAccountInfo;
      
      const transaction = new Transaction();
      
      // Add create destination account instruction if needed
      if (needsDestinationAccount) {
        console.log(`   Creating destination token account...`);
        transaction.add(
          createAssociatedTokenAccountInstruction(
            this.sourceKeypair.publicKey,
            destinationTokenAccount,
            this.destinationPubkey,
            tokenMintPubkey,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          )
        );
      }
      
      // Add transfer instruction
      transaction.add(
        createTransferInstruction(
          new PublicKey(tokenAccount),
          destinationTokenAccount,
          this.sourceKeypair.publicKey,
          BigInt(balance),
          [],
          TOKEN_PROGRAM_ID
        )
      );
      
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [this.sourceKeypair],
        { commitment: 'confirmed' }
      );
      
      console.log(`✅ SPL token transfer completed: ${signature}`);
      return signature;
    } catch (error) {
      console.error(`❌ Error transferring SPL token ${tokenInfo.mint}:`, error);
      throw error;
    }
  }

  // Transfer all assets
  async transferAllAssets() {
    try {
      console.log('🚀 Starting asset transfer process...');
      console.log(`📍 Source wallet: ${this.sourceKeypair.publicKey.toBase58()}`);
      console.log(`📍 Destination wallet: ${DESTINATION_WALLET}`);
      console.log('');

      const results = {
        solTransfer: null,
        tokenTransfers: [],
        errors: []
      };

      // Get initial balances
      const solBalance = await this.getSOLBalance();
      const tokenAccounts = await this.getAllTokenAccounts();

      console.log(`💰 SOL Balance: ${solBalance / LAMPORTS_PER_SOL} SOL`);
      console.log(`💎 SPL Tokens: ${tokenAccounts.length} tokens with balances`);
      console.log('');

      // Transfer SPL tokens first (they require SOL for fees)
      if (tokenAccounts.length > 0) {
        console.log('📦 Transferring SPL tokens...');
        
        for (const tokenInfo of tokenAccounts) {
          try {
            const signature = await this.transferSPLToken(tokenInfo);
            results.tokenTransfers.push({
              mint: tokenInfo.mint,
              signature: signature,
              success: true
            });
          } catch (error) {
            console.error(`Failed to transfer token ${tokenInfo.mint}:`, error.message);
            results.errors.push({
              type: 'token',
              mint: tokenInfo.mint,
              error: error.message
            });
          }
        }
        
        console.log('');
      }

      // Transfer remaining SOL last
      if (solBalance > 0) {
        console.log('💰 Transferring remaining SOL...');
        try {
          const signature = await this.transferSOL();
          results.solTransfer = {
            signature: signature,
            success: true
          };
        } catch (error) {
          console.error('Failed to transfer SOL:', error.message);
          results.errors.push({
            type: 'sol',
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      console.error('❌ Critical error during asset transfer:', error);
      throw error;
    }
  }

  // Print summary
  printSummary(results) {
    console.log('');
    console.log('📊 TRANSFER SUMMARY');
    console.log('==================');
    
    if (results.solTransfer) {
      if (results.solTransfer.success) {
        console.log(`✅ SOL Transfer: ${results.solTransfer.signature}`);
      } else {
        console.log('❌ SOL Transfer: Failed');
      }
    } else {
      console.log('⚠️  SOL Transfer: Skipped (no balance or insufficient for fees)');
    }
    
    console.log(`✅ SPL Token Transfers: ${results.tokenTransfers.length} successful`);
    
    if (results.errors.length > 0) {
      console.log(`❌ Errors: ${results.errors.length}`);
      results.errors.forEach(error => {
        console.log(`   - ${error.type}: ${error.error}`);
      });
    }
    
    console.log('');
    console.log('🎉 Asset transfer process completed!');
    console.log(`📍 All assets transferred to: ${DESTINATION_WALLET}`);
  }
}

// Main execution
async function main() {
  try {
    console.log('🔄 SOLANA ASSET TRANSFER SCRIPT');
    console.log('================================');
    console.log('');

    const transferService = new AssetTransferService();
    
    // Load the wallet
    await transferService.loadWallet();
    
    // Transfer all assets
    const results = await transferService.transferAllAssets();
    
    // Print summary
    transferService.printSummary(results);
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
} 