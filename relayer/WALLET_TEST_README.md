# Wallet Integration Test

This test case uses the specific wallet from `secrets/B92TJxyFGgK9tMtyzzQXDDxWNxSnwhbs1uvfnCVVdaS1.json` to perform a complete integration test of the relayer system.

## Test Overview

The test performs the following operations:

1. **Wallet Loading**: Loads the wallet from the JSON file and verifies the keypair
2. **Balance Checking**: Checks the initial SOL balance of the source wallet
3. **Health Check**: Verifies the relayer API is running
4. **Swap Quotation**: Gets a quote for SOL to USDC swap
5. **SOL Transfer**: Sends SOL from the source wallet to the temporary wallet
6. **Balance Confirmation**: Waits for the SOL to appear in the temporary wallet
7. **Confirm API**: Executes the confirm API endpoint to perform the swap
8. **Final Balance Check**: Verifies the final balances of all wallets involved

## Prerequisites

1. **Relayer Server**: The relayer server must be running on `localhost:3000`
2. **Wallet Funding**: The wallet `B92TJxyFGgK9tMtyzzQXDDxWNxSnwhbs1uvfnCVVdaS1` must have sufficient SOL balance
3. **Network Access**: Must have access to Solana mainnet (or configure for devnet)

## Configuration

The test is configured with:

- **Source Wallet**: `B92TJxyFGgK9tMtyzzQXDDxWNxSnwhbs1uvfnCVVdaS1`
- **Destination Wallet**: `EQ1iJf9TGTGs163zcsoKq1JgrXdDK2KGAdoYtB1adoev`
- **Swap Amount**: 0.01 SOL (10,000,000 lamports)
- **Token Pair**: SOL → USDC
- **Slippage**: 0.5% (50 basis points)

## Running the Test

### Method 1: Using npm script
```bash
cd relayer
npm run test:wallet
```

### Method 2: Direct execution
```bash
cd relayer
node test-wallet-integration.js
```

## Expected Output

The test will provide detailed output for each step:

```
🚀 Testing Wallet Integration with Confirm API
==============================================

1️⃣ Loading wallet from JSON configuration...
✅ Wallet loaded: B92TJxyFGgK9tMtyzzQXDDxWNxSnwhbs1uvfnCVVdaS1
✅ Public key verification passed

2️⃣ Checking initial SOL balance...
💰 Current balance: 0.045123456 SOL (45123456 lamports)

3️⃣ Testing Health Check...
✅ Health check passed: { status: 'ok', timestamp: '2024-01-15T10:30:00.000Z' }

4️⃣ Getting swap quotation...
✅ Swap quotation received successfully!
📋 Quote Details:
   Temporary Wallet: 4AZii4qQf4zfmgLFhUik3Kmcdqpbi9vVAeDjP9zWN54v
   Input: 0.010000000 SOL
   Expected Output: 137850 tokens
   Price Impact: 0%
   Destination: EQ1iJf9TGTGs163zcsoKq1JgrXdDK2KGAdoYtB1adoev

5️⃣ Sending SOL to temporary wallet...
📤 Sending 0.01 SOL to 4AZii4qQf4zfmgLFhUik3Kmcdqpbi9vVAeDjP9zWN54v...
✅ SOL sent successfully! Transaction: 5J7XqWKGHYHKHqXqWKGHYHKHqXqWKGHYHKHqXqWKGHY
🔗 View on Solscan: https://solscan.io/tx/5J7XqWKGHYHKHqXqWKGHYHKHqXqWKGHYHKHqXqWKGHY

6️⃣ Waiting for balance confirmation...
⏳ Checking temporary wallet balance...
✅ Balance confirmed: 0.010000000 SOL in temporary wallet

7️⃣ Checking destination wallet balance before swap...
💰 Destination wallet balance before swap: 0.000000000 SOL

8️⃣ Executing confirmation API...
📤 Sending confirmation request...
⏳ This will execute the swap and transfer (may take 1-2 minutes)...
🎉 CONFIRMATION COMPLETED SUCCESSFULLY!
📊 Swap and Transfer Results:
   Status: completed
   Swap Transaction: 3K5YpLKJHGHYHKHqXqWKGHYHKHqXqWKGHYHKHqXqWKGH
   Transfer Transaction: 2L4XpMJHGHYHKHqXqWKGHYHKHqXqWKGHYHKHqXqWKGHY
   Message: Swap and transfer completed successfully

🔗 Explorer Links:
   Swap: https://solscan.io/tx/3K5YpLKJHGHYHKHqXqWKGHYHKHqXqWKGHYHKHqXqWKGH
   Transfer: https://solscan.io/tx/2L4XpMJHGHYHKHqXqWKGHYHKHqXqWKGHYHKHqXqWKGH

9️⃣ Checking final balances...
💰 Source wallet final balance: 0.034123456 SOL
   Change: -0.011000000 SOL
💰 Destination wallet final balance: 0.000000000 SOL
💰 Temporary wallet final balance: 0.000000000 SOL

🎯 Wallet Integration Test Summary:
==================================
✅ Wallet loading: PASSED
✅ Balance checking: PASSED
✅ Health check: PASSED
✅ Swap quotation: PASSED
✅ SOL transfer: PASSED
✅ Confirmation API: EXECUTED
```

## Test Features

### ✅ **Comprehensive Wallet Testing**
- Loads wallet from JSON file with secret key
- Verifies public key matches expected value
- Checks SOL balances throughout the process

### ✅ **Complete API Integration**
- Tests health endpoint
- Tests swap quotation endpoint
- Tests confirmation endpoint with real transactions

### ✅ **Real Transaction Execution**
- Sends actual SOL transactions
- Executes real swaps via Jupiter
- Transfers tokens to destination wallet

### ✅ **Balance Monitoring**
- Monitors source wallet balance
- Monitors temporary wallet balance
- Monitors destination wallet balance
- Shows balance changes throughout the process

### ✅ **Error Handling**
- Handles insufficient balance scenarios
- Handles API timeout scenarios
- Provides detailed error messages

## Troubleshooting

### Common Issues

1. **Insufficient Balance**
   ```
   ⚠️ WARNING: Insufficient SOL balance for testing
   ```
   **Solution**: Fund the wallet `B92TJxyFGgK9tMtyzzQXDDxWNxSnwhbs1uvfnCVVdaS1` with more SOL

2. **Relayer Not Running**
   ```
   ❌ Health check failed: connect ECONNREFUSED 127.0.0.1:3000
   ```
   **Solution**: Start the relayer server with `npm start`

3. **Network Issues**
   ```
   Error checking balance for B92TJxyFGgK9tMtyzzQXDDxWNxSnwhbs1uvfnCVVdaS1
   ```
   **Solution**: Check your internet connection and Solana RPC endpoint

4. **Timeout Errors**
   ```
   ⏰ Request timed out - swap may still be processing
   ```
   **Solution**: This is normal for complex swaps; check the transaction on Solscan

## Environment Variables

You can customize the test behavior with these environment variables:

```bash
# Solana RPC endpoint (default: mainnet)
export SOLANA_RPC="https://api.devnet.solana.com"

# Test amount in lamports (default: 10000000 = 0.01 SOL)
export TEST_AMOUNT="10000000"

# Relayer base URL (default: http://localhost:3000)
export RELAYER_URL="http://localhost:3000"
```

## Security Notes

⚠️ **Important**: This test uses a real wallet with a private key. In production:
- Never commit private keys to version control
- Use environment variables for sensitive data
- Consider using test networks for development

## Integration with CI/CD

This test can be integrated into automated testing pipelines:

```yaml
# Example GitHub Actions step
- name: Run Wallet Integration Test
  run: |
    cd relayer
    npm install
    npm start &
    sleep 10  # Wait for server to start
    npm run test:wallet
```

## Extending the Test

The test can be extended to include:

- Multiple token pairs (SOL → USDT, SOL → BONK, etc.)
- Different swap amounts
- Error scenario testing
- Performance benchmarking
- Multiple wallet testing

## Support

If you encounter issues with this test:

1. Check the relayer logs for detailed error information
2. Verify wallet balances on Solscan
3. Ensure all dependencies are installed
4. Check network connectivity to Solana RPC endpoints 