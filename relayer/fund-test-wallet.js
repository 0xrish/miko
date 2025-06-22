import { Connection, PublicKey } from '@solana/web3.js';

const SOLANA_RPC = process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(SOLANA_RPC, 'confirmed');

// Wallet from the JSON file
const TEST_WALLET = "B92TJxyFGgK9tMtyzzQXDDxWNxSnwhbs1uvfnCVVdaS1";
const DESTINATION_WALLET = "EQ1iJf9TGTGs163zcsoKq1JgrXdDK2KGAdoYtB1adoev";

async function checkBalance(walletAddress, name) {
  try {
    const publicKey = new PublicKey(walletAddress);
    const balance = await connection.getBalance(publicKey);
    const solBalance = balance / 1000000000;
    console.log(`💰 ${name}: ${solBalance.toFixed(9)} SOL (${balance} lamports)`);
    return { balance, solBalance };
  } catch (error) {
    console.error(`❌ Error checking balance for ${name}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🔍 Checking Test Wallet Balances');
  console.log('================================\n');

  // Check test wallet balance
  const testBalance = await checkBalance(TEST_WALLET, 'Test Wallet');
  
  // Check destination wallet balance  
  const destBalance = await checkBalance(DESTINATION_WALLET, 'Destination Wallet');

  console.log('\n📊 Analysis:');
  console.log('============');
  
  if (testBalance) {
    const requiredForTest = 505000; // 500000 + 5000 for fees
    if (testBalance.balance >= requiredForTest) {
      console.log('✅ Test wallet has sufficient balance for testing');
      console.log(`   Available: ${testBalance.solBalance.toFixed(9)} SOL`);
      console.log(`   Required: ${requiredForTest / 1000000000} SOL`);
      console.log('   Ready to run: npm run test:wallet');
    } else {
      console.log('⚠️ Test wallet needs more SOL for testing');
      console.log(`   Available: ${testBalance.solBalance.toFixed(9)} SOL`);
      console.log(`   Required: ${requiredForTest / 1000000000} SOL`);
      console.log(`   Need: ${(requiredForTest - testBalance.balance) / 1000000000} SOL more`);
      console.log('\n💡 To fund the test wallet:');
      console.log(`   1. Send SOL to: ${TEST_WALLET}`);
      console.log('   2. Use a wallet like Phantom, Solflare, or CLI');
      console.log('   3. Minimum amount needed: 0.001 SOL');
    }
  }

  console.log('\n🔗 Useful Links:');
  console.log(`   Test Wallet on Solscan: https://solscan.io/account/${TEST_WALLET}`);
  console.log(`   Destination Wallet on Solscan: https://solscan.io/account/${DESTINATION_WALLET}`);
  
  if (process.env.SOLANA_RPC && process.env.SOLANA_RPC.includes('devnet')) {
    console.log('\n🚰 Devnet Faucet (if using devnet):');
    console.log('   https://faucet.solana.com/');
    console.log(`   Request SOL for: ${TEST_WALLET}`);
  }
}

main().catch(console.error); 