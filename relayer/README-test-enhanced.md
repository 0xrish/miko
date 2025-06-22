# Enhanced Relayer Test Script

This document explains how to use the `test-enhanced-relayer.js` script to test the complete Miko Relayer functionality with real funds.

## Overview

The enhanced test script performs a complete end-to-end test of the relayer system:

1. **User Wallet Loading**: Loads your wallet from private key
2. **Balance Validation**: Checks if you have sufficient SOL for the test
3. **Price Fetching**: Gets current SOL price to calculate $1 USD worth
4. **Quotation**: Requests a swap quote from the relayer API
5. **Temp Wallet Funding**: Automatically sends SOL to the temporary wallet
6. **Balance Monitoring**: Waits for the temp wallet to receive funds
7. **Swap Execution**: Executes the swap and transfer via confirmation API
8. **Balance Verification**: Checks final balances to confirm success

## Prerequisites

1. **Relayer Server Running**: Make sure your relayer server is running on `http://localhost:3000`
2. **Solana Wallet**: You need a wallet with sufficient SOL balance
3. **Private Key**: Access to your wallet's private key
4. **Network Access**: Internet connection for price fetching and blockchain operations

## Usage

### Basic Usage

```bash
node test-enhanced-relayer.js "YOUR_PRIVATE_KEY"
```

### Private Key Formats

The script accepts private keys in two formats:

#### 1. Base58 Format (Phantom/Solflare export)
```bash
node test-enhanced-relayer.js "5Kb8kLf9CJRdnvx7W8vBa2Kh3dGpXxLm9Qr4Nt8Ys6Zp1A"
```

#### 2. JSON Array Format (Solana CLI export)
```bash
node test-enhanced-relayer.js "[123,45,67,89,12,34,56,78,90,12,34,56,78,90,12,34,56,78,90,12,34,56,78,90,12,34,56,78,90,12,34,56,78,90,12,34,56,78,90,12,34,56,78,90,12,34,56,78,90,12,34,56,78,90,12,34]"
```

## Balance Requirements

The script will automatically calculate the required SOL balance based on current prices:

- **Swap Amount**: $1 USD worth of SOL (calculated dynamically)
- **Gas Fees**: 0.01 SOL for transaction fees
- **Total Required**: ~$1 USD + 0.01 SOL

Example: If SOL is $100, you'll need ~0.01 SOL (swap) + 0.01 SOL (gas) = 0.02 SOL minimum

## Test Flow

### Step-by-Step Process

1. **🔐 Wallet Loading**
   - Loads your wallet from the provided private key
   - Displays your wallet address

2. **💰 Balance Check**
   - Checks your initial SOL and USDC balances
   - Displays current holdings

3. **💵 Price Calculation**
   - Fetches current SOL price from CoinGecko
   - Calculates exact SOL amount for $1 USD

4. **✅ Balance Validation**
   - Ensures you have enough SOL for swap + gas fees
   - Exits if insufficient balance

5. **🏥 Health Check**
   - Tests relayer server connectivity
   - Verifies API is responding

6. **📋 Quotation Request**
   - Requests swap quote for $1 USD SOL → USDC
   - Creates temporary wallet
   - Displays quote details and instructions

7. **💸 Funding**
   - Automatically sends SOL to temporary wallet
   - Includes both swap amount and gas fees

8. **⏳ Balance Monitoring**
   - Waits for temp wallet to receive funds
   - Polls balance every 5 seconds (2 minute timeout)

9. **🔄 Swap Execution**
   - Sends confirmation to relayer API
   - Executes swap and transfer
   - Waits for completion (3 minute timeout)

10. **📊 Final Verification**
    - Checks your final SOL and USDC balances
    - Displays transaction links
    - Shows net changes

## Expected Output

### Successful Test Run

```
🚀 Testing Enhanced Miko Relayer System - Complete Flow Test
============================================================

1️⃣ Loading user wallet...
✅ User wallet loaded: 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM

2️⃣ Checking initial balances...
💰 Initial SOL Balance: 0.050000000 SOL
💰 Initial USDC Balance: 0 USDC

3️⃣ Getting SOL price and calculating swap amount...
💵 SOL Price: $98.45 USD
🎯 Target: $1 USD = 0.010157648 SOL (10157648 lamports)

✅ Sufficient balance available
   Swap amount: 0.010157648 SOL
   Gas fees: 0.01 SOL
   Total needed: 0.020157648 SOL

4️⃣ Testing Health Check...
✅ Health check passed: { status: 'OK', timestamp: '2024-01-15T10:30:00.000Z' }

5️⃣ Getting swap quotation for $1 USD worth of SOL to USDC...
✅ Quotation received successfully!
📋 Quote Details:
   Temporary Wallet: 7xKXtg2CW9UwT5E2opqKBxepnaNjKaNVRvCaLRcCRQ1Q
   Input: 0.010157648 SOL ($1 USD)
   Expected Output: 0.995123 USDC
   Price Impact: 0.01%
   Destination: 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM

6️⃣ Funding temporary wallet...
📤 Sending 0.020157648 SOL to temp wallet 7xKXtg2CW9UwT5E2opqKBxepnaNjKaNVRvCaLRcCRQ1Q
   Breakdown: 0.010157648 SOL (swap) + 0.01 SOL (gas)
✅ Funding transaction completed: 2wiDDb9C8LQdjuYfLcnZfnVjNa9fobmiLambda9cKhg7wHpRvLaEFGdCxoCQtqg5v1x8L4jl6fHJr1H7LdDRpuqy

7️⃣ Waiting for temp wallet balance update...
✅ Balance updated! Current: 0.020157648 SOL

8️⃣ Executing swap confirmation...
📤 Sending confirmation request...
⏳ Processing swap and transfer...
✅ Swap and transfer completed successfully!
🎉 Transaction Results:
   Status: success
   Swap Transaction: 3N3UjuYfLcnZfnVjNa9fobmiLambda9cKhg7wHpRvLaEFGdCxoCQtqg5v1x8L4jl6fHJr1H7LdDRpuqy
   Transfer Transaction: 4O4VkZgMdOeGgGhJhKlMnPqRsStUvWxYzAaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZzAa
🔗 Swap on Solscan: https://solscan.io/tx/3N3UjuYfLcnZfnVjNa9fobmiLambda9cKhg7wHpRvLaEFGdCxoCQtqg5v1x8L4jl6fHJr1H7LdDRpuqy
🔗 Transfer on Solscan: https://solscan.io/tx/4O4VkZgMdOeGgGhJhKlMnPqRsStUvWxYzAaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZzAa

9️⃣ Checking final balances...
📊 Final Balances:
💰 SOL Balance: 0.029342352 SOL
   Change: -0.020657648 SOL
💰 USDC Balance: 0.995123 USDC
   Change: 0.995123 USDC

🎯 Complete Relayer Test Summary:
=================================
✅ User wallet loading: PASSED
✅ Balance validation: PASSED
✅ SOL price fetching: PASSED
✅ Health check: PASSED
✅ Swap quotation: PASSED
✅ Temp wallet funding: PASSED
✅ Balance monitoring: PASSED
✅ Swap execution: PASSED
✅ Final balance verification: PASSED

🔧 System Status: FULLY OPERATIONAL
📝 User Wallet: 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM
💱 Swap Completed: $1 USD SOL → USDC
🏦 Net Change: -0.020657648 SOL, +0.995123 USDC
```

## Error Handling

The script handles various error scenarios:

### Insufficient Balance
```
❌ Insufficient SOL balance!
   Required: 0.020157648 SOL (0.010157648 for swap + 0.01 for gas)
   Available: 0.005000000 SOL
```

### Invalid Private Key
```
❌ Error: Please provide your private key as an argument
Usage: node test-enhanced-relayer.js "YOUR_PRIVATE_KEY"
```

### Server Connection Issues
```
❌ Health check failed: connect ECONNREFUSED 127.0.0.1:3000
```

### Timeout Issues
```
⏰ Request timed out - swap may still be processing
```

## Security Notes

⚠️ **IMPORTANT SECURITY WARNINGS**:

1. **Never share your private key** with anyone
2. **Use testnet for development** - this script works with mainnet
3. **Start with small amounts** - test with minimum required balance
4. **Backup your wallet** before running tests
5. **Monitor transactions** using the provided Solscan links

## Troubleshooting

### Common Issues

1. **"Connection refused"**: Make sure relayer server is running
2. **"Insufficient balance"**: Add more SOL to your wallet
3. **"Invalid private key"**: Check private key format
4. **"Timeout"**: Network congestion, check transaction on Solscan

### Debug Mode

For detailed debugging, you can modify the script to add more logging or reduce timeouts for faster testing.

## Configuration

You can modify these constants in the script:

```javascript
// Gas fees allocation
const gasFeesLamports = 0.01 * 1000000000; // 0.01 SOL

// Slippage tolerance
slippageBps: 50 // 0.5%

// Timeout settings
timeout: 180000 // 3 minutes for confirmation
maxWaitTime: 120000 // 2 minutes for balance updates
```

## Integration with CI/CD

This script can be integrated into automated testing pipelines:

```bash
# Set private key as environment variable
export TEST_PRIVATE_KEY="your_private_key_here"

# Run test
node test-enhanced-relayer.js "$TEST_PRIVATE_KEY"
```

## Support

If you encounter issues:

1. Check the relayer server logs
2. Verify your wallet has sufficient balance
3. Confirm network connectivity
4. Review transaction details on Solscan
5. Check the console output for specific error messages 