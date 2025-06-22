#!/usr/bin/env node

import { 
  Connection, 
  PublicKey, 
  Keypair,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import fs from 'fs/promises';

// Configuration
const MAINNET_RPC = process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com';
const DESTINATION_WALLET = 'EQ1iJf9TGTGs163zcsoKq1JgrXdDK2KGAdoYtB1adoev';
const WALLET_PATH = '../relayer/secrets/G1uzkCoBaw2txLGSPcv4hbgDCh43rpT8nafnmCBmyJXV.json'; // Updated to use plain format wallet

const connection = new Connection(MAINNET_RPC, 'confirmed');

class AssetAnalyzer {
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
        const uiAmount = accountData.info.tokenAmount.uiAmount;
        
        if (balance !== '0') {
          tokenBalances.push({
            mint: mintAddress,
            balance: balance,
            decimals: decimals,
            uiAmount: uiAmount,
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

  // Analyze all assets
  async analyzeAssets() {
    try {
      console.log('🔍 ASSET ANALYSIS (DRY RUN)');
      console.log('============================');
      console.log(`📍 Source wallet: ${this.sourceKeypair.publicKey.toBase58()}`);
      console.log(`📍 Destination wallet: ${DESTINATION_WALLET}`);
      console.log('');

      // Get balances
      const solBalance = await this.getSOLBalance();
      const tokenAccounts = await this.getAllTokenAccounts();

      // Analyze SOL
      console.log('💰 SOL ANALYSIS');
      console.log('---------------');
      if (solBalance > 0) {
        const reserveAmount = 5000; // Reserve for fees
        const transferAmount = solBalance - reserveAmount;
        
        console.log(`Current SOL balance: ${solBalance / LAMPORTS_PER_SOL} SOL`);
        console.log(`Reserved for fees: ${reserveAmount / LAMPORTS_PER_SOL} SOL`);
        
        if (transferAmount > 0) {
          console.log(`✅ Would transfer: ${transferAmount / LAMPORTS_PER_SOL} SOL`);
        } else {
          console.log(`❌ Cannot transfer: Insufficient balance after reserving for fees`);
        }
      } else {
        console.log('❌ No SOL balance found');
      }
      
      console.log('');

      // Analyze SPL tokens
      console.log('💎 SPL TOKEN ANALYSIS');
      console.log('---------------------');
      if (tokenAccounts.length > 0) {
        console.log(`Found ${tokenAccounts.length} tokens with balances:`);
        console.log('');
        
        tokenAccounts.forEach((token, index) => {
          console.log(`${index + 1}. Token: ${token.mint}`);
          console.log(`   Balance: ${token.uiAmount} tokens (${token.balance} raw)`);
          console.log(`   Decimals: ${token.decimals}`);
          console.log(`   Token Account: ${token.tokenAccount}`);
          console.log(`   ✅ Would transfer: ALL tokens to destination`);
          console.log('');
        });
      } else {
        console.log('❌ No SPL tokens with balances found');
      }

      // Summary
      console.log('📊 TRANSFER SUMMARY (WHAT WOULD HAPPEN)');
      console.log('=======================================');
      
      let totalTransfers = 0;
      
      if (solBalance > 5000) {
        console.log('✅ SOL transfer: YES');
        totalTransfers++;
      } else {
        console.log('❌ SOL transfer: NO (insufficient balance)');
      }
      
      if (tokenAccounts.length > 0) {
        console.log(`✅ SPL token transfers: ${tokenAccounts.length} tokens`);
        totalTransfers += tokenAccounts.length;
      } else {
        console.log('❌ SPL token transfers: NO tokens found');
      }
      
      console.log('');
      console.log(`📈 Total transfers that would be executed: ${totalTransfers}`);
      console.log(`📍 All assets would be sent to: ${DESTINATION_WALLET}`);
      console.log('');
      console.log('⚠️  This was a DRY RUN - no actual transfers were made!');
      console.log('💡 To execute the actual transfers, run: node scripts/transfer-all-assets.js');
      
      return {
        solBalance,
        tokenAccounts,
        totalTransfers
      };
    } catch (error) {
      console.error('❌ Critical error during analysis:', error);
      throw error;
    }
  }
}

// Main execution
async function main() {
  try {
    console.log('🔄 SOLANA ASSET ANALYSIS (DRY RUN)');
    console.log('==================================');
    console.log('');

    const analyzer = new AssetAnalyzer();
    
    // Load the wallet
    await analyzer.loadWallet();
    
    // Analyze all assets
    await analyzer.analyzeAssets();
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
} 