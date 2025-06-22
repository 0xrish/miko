# Mainnet Swap Test Guide

This guide explains how to use the mainnet swap test functionality to test swaps directly on Solana mainnet using your own wallet.

## ⚠️ Important Security Warning

**NEVER share your private key with anyone!** This test uses your real private key and real funds on mainnet. Only use this for testing purposes and ensure you understand the risks.

## 🚀 Quick Start

### 1. Run the Test

```bash
npm run test:mainnet "YOUR_PRIVATE_KEY"
```

### 2. Private Key Formats

The test accepts private keys in two formats:

#### Base58 Format (Phantom/Solflare export):
```bash
npm run test:mainnet "5Kb8kLf9CJRdnvx7W8p2Bz..."
```

#### JSON Array Format (Solana CLI keypair):
```bash
npm run test:mainnet "[123,45,67,89,...]"
```

## 📋 What the Test Does

### Step-by-Step Process:

1. **Wallet Loading** - Creates a keypair from your private key
2. **Balance Check** - Checks your SOL and USDC balances
3. **Swap Configuration** - Sets up a SOL → USDC swap (5% of your SOL balance)
4. **Jupiter Quote** - Gets the best swap rate from Jupiter
5. **Transaction Preparation** - Creates the swap transaction
6. **Execution** - Executes the swap on mainnet
7. **Confirmation** - Waits for transaction confirmation
8. **Final Balance Check** - Shows your updated balances

### Default Swap Parameters:
- **Input Token**: SOL
- **Output Token**: USDC
- **Amount**: 5% of your SOL balance (reduced for safety)
- **Slippage**: 0.3% (30 basis points)
- **Minimum SOL Required**: 0.005 SOL (for fees and token accounts)

## 🔧 Customization

### Modify Swap Parameters

Edit the `test-mainnet-swap.js` file to customize:

```javascript
// Change the swap amount (currently 10% of balance)
const swapAmount = Math.floor(initialSOLBalance.balance * 0.1);

// Change the output token
const swapConfig = {
  inputMint: TOKENS.SOL,
  outputMint: TOKENS.USDC, // Change to USDT, RAY, BONK, etc.
  amount: swapAmount.toString(),
  slippageBps: 100, // Change slippage (100 = 1%)
};
```

### Available Tokens:
- **SOL**: `So11111111111111111111111111111111111111112`
- **USDC**: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- **USDT**: `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`
- **RAY**: `4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R`
- **BONK**: `DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263`

## 📊 Example Output

```
🚀 Testing Mainnet Swap Functionality
====================================

1️⃣ Loading wallet from private key...
✅ Wallet loaded: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU

2️⃣ Checking initial balances...
💰 SOL Balance: 0.125000000 SOL (125000000 lamports)
💰 USDC Balance: 0 USDC

3️⃣ Swap Configuration:
   Input Token: SOL
   Output Token: USDC
   Amount: 0.0125 SOL (12500000 lamports)
   Slippage: 1%
   User Wallet: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU

4️⃣ Getting Jupiter quote...
✅ Quote received successfully!
📊 Quote Details:
   Input Amount: 0.0125 SOL
   Output Amount: 2.85 USDC
   Price Impact: 0.01%
   Route: Raydium CLMM → Orca

5️⃣ Getting swap transaction...
✅ Swap transaction prepared successfully!

6️⃣ Executing swap transaction...
⚠️  This will use real funds on mainnet!
⏳ Processing swap...
📤 Sending swap transaction...
🔄 Transaction sent: 3x7K9tg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU...
⏳ Waiting for confirmation...
✅ Swap transaction confirmed: 3x7K9tg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU...

7️⃣ Waiting for balance updates and checking final balances...
📊 Final Balances:
💰 SOL Balance: 0.112345678 SOL
   Change: -0.012654322 SOL
💰 USDC Balance: 2.85 USDC
   Change: 2.85 USDC

🎯 Mainnet Swap Test Summary:
============================
✅ Wallet loading: PASSED
✅ Balance checking: PASSED
✅ Jupiter quote: PASSED
✅ Swap transaction: EXECUTED
✅ Transaction confirmation: PASSED

🔧 System Status: MAINNET SWAP COMPLETED
📝 Wallet: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
🔗 Transaction: https://solscan.io/tx/3x7K9tg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU...
💱 Swapped: 0.0125 SOL → 2.85 USDC
```

## 🛡️ Safety Features

### Built-in Protections:
- **Minimum Balance Check**: Ensures you have at least 0.01 SOL
- **Percentage-based Swaps**: Only swaps 10% of your balance by default
- **Slippage Protection**: 1% maximum slippage
- **Transaction Confirmation**: Waits for blockchain confirmation
- **Error Handling**: Comprehensive error handling and rollback

### Pre-flight Checks:
- Validates private key format
- Checks sufficient balance
- Verifies token account existence
- Calculates transaction fees

## 🔍 Troubleshooting

### Common Issues:

#### "Insufficient SOL balance for swap"
- **Solution**: Ensure you have at least 0.005 SOL in your wallet

#### "Transfer: insufficient lamports"
- **Solution**: Your wallet needs more SOL for transaction fees and token account creation
- **Fix**: Add more SOL to your wallet or reduce the swap amount
- **Note**: Token swaps require additional SOL for creating associated token accounts

#### "Invalid private key format"
- **Solution**: Check that your private key is in the correct format (Base58 or JSON array)

#### "Transaction failed"
- **Solution**: Check network status, increase slippage, or try again

#### "Token account doesn't exist"
- **Solution**: The test will automatically handle token account creation

### Network Issues:
- The test uses Helius RPC for reliable connections
- Includes retry logic for network failures
- Timeout handling for slow transactions

## 🔧 Advanced Usage

### Testing Different Token Pairs:

```bash
# Edit the TOKENS object in test-mainnet-swap.js
const TOKENS = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  // Add more tokens as needed
};
```

### Custom Swap Amounts:

```javascript
// Instead of percentage-based
const swapAmount = Math.floor(initialSOLBalance.balance * 0.1);

// Use fixed amount (e.g., 0.01 SOL)
const swapAmount = 10000000; // 0.01 SOL in lamports
```

## 📝 Notes

- **Real Money**: This test uses real funds on mainnet
- **Gas Fees**: Each transaction incurs network fees
- **Slippage**: Market conditions may affect final amounts
- **Rate Limits**: Jupiter API has rate limits for quotes
- **Security**: Never commit private keys to version control

## 🆘 Support

If you encounter issues:
1. Check the console output for detailed error messages
2. Verify your private key format
3. Ensure sufficient SOL balance
4. Check network connectivity
5. Review the transaction on Solscan using the provided link

## 🎯 Next Steps

After successful testing:
1. Integrate the swap logic into your main application
2. Add additional token pairs as needed
3. Implement custom slippage settings
4. Add transaction history tracking
5. Consider implementing MEV protection 