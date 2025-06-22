# Enhanced Miko Relayer Guide (SOL-Only Input)

## Overview

The Enhanced Miko Relayer is a secure, automated token swapping service that facilitates **SOL-to-any-token** swaps using Jupiter's API. The system creates temporary wallets for secure token handling and provides a streamlined two-step process for token swapping.

### Key Constraint
🔒 **Input Token Restriction**: The relayer **ONLY accepts SOL** as the input token. You can swap SOL to any supported token, but all swaps must start with SOL.

## Enhanced Workflow

### Step 1: Get Quotation
- Request a swap quote from SOL to your desired token
- System generates a temporary wallet
- Provides swap details and instructions

### Step 2: Manual Token Deposit
- Send the specified amount of SOL to the temporary wallet
- System automatically detects the deposit

### Step 3: Execute Swap
- Call the confirmation API
- System waits for SOL receipt, then executes the swap
- Swapped tokens are transferred to your destination wallet

## API Endpoints

### POST /api/swap - Get SOL Swap Quotation

**Request Body:**
```json
{
  "fromToken": "So11111111111111111111111111111111111111112",  // Must always be SOL
  "toToken": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",    // Any supported token
  "amount": "1000000",                                        // Amount in lamports
  "destinationWallet": "YourWalletAddressHere",
  "slippageBps": 50                                          // Optional, default 50
}
```

**Response:**
```json
{
  "success": true,
  "transactionId": "temp_wallet_unique_id",
  "temporaryWallet": "GeneratedTempWalletAddress",
  "swapDetails": {
    "inputAmount": "0.001",
    "inputSymbol": "SOL",
    "expectedOutput": "1.234",
    "outputSymbol": "USDC",
    "priceImpactPct": 0.1,
    "destinationWallet": "YourWalletAddressHere"
  },
  "instructions": [
    "Send 0.001 SOL to GeneratedTempWalletAddress",
    "Call /api/confirm with transactionId to execute swap",
    "Swapped tokens will be sent to your destination wallet"
  ],
  "warnings": []
}
```

### POST /api/confirm - Execute SOL Swap

**Request Body:**
```json
{
  "transactionId": "temp_wallet_unique_id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Swap completed successfully",
  "swapTransaction": "SwapTransactionSignature",
  "transferTransaction": "TransferTransactionSignature"
}
```

## Testing Instructions

### Start the Server
```bash
cd relayer
npm install
npm start
```

### Run Enhanced Tests
```bash
npm test
```

### Manual API Testing

#### 1. Get SOL to USDC Quote
```bash
curl -X POST http://localhost:3000/api/swap \
  -H "Content-Type: application/json" \
  -d '{
    "fromToken": "So11111111111111111111111111111111111111112",
    "toToken": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "amount": "1000000",
    "destinationWallet": "YourWalletAddressHere"
  }'
```

#### 2. Send SOL to Temporary Wallet
```bash
# Use your preferred Solana wallet to send SOL to the returned temporary wallet address
```

#### 3. Confirm Swap
```bash
curl -X POST http://localhost:3000/api/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "returned_transaction_id"
  }'
```

## Workflow Example (JavaScript)

```javascript
// Step 1: Get SOL swap quote
const quoteResponse = await fetch('http://localhost:3000/api/swap', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fromToken: 'So11111111111111111111111111111111111111112', // SOL
    toToken: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',   // USDC
    amount: '1000000', // 0.001 SOL
    destinationWallet: 'YourWalletAddressHere'
  })
});

const quote = await quoteResponse.json();
console.log('Temporary wallet:', quote.temporaryWallet);
console.log('Send', quote.swapDetails.inputAmount, 'SOL to:', quote.temporaryWallet);

// Step 2: Send SOL to temporary wallet (manual step)
// Use your wallet to send the specified amount of SOL

// Step 3: Confirm swap
const confirmResponse = await fetch('http://localhost:3000/api/confirm', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    transactionId: quote.transactionId
  })
});

const result = await confirmResponse.json();
console.log('Swap completed:', result);
```

## Key Features

### 🔒 SOL-Only Input
- **Input Restriction**: Only SOL is accepted as the input token
- **Output Flexibility**: Swap to any supported token on Jupiter
- **Validation**: System rejects non-SOL input tokens

### 🛡️ Security Features
- Temporary wallet generation for each swap
- Input validation and sanitization
- Automatic cleanup of temporary wallets

### 📊 Enhanced Error Handling
- Detailed error messages
- Input validation feedback
- Jupiter-specific error translation

### 🔍 Transaction Transparency
- Real-time balance monitoring
- Transaction signature tracking
- Explorer link generation

## Supported Tokens

### Input Token (Required)
- **SOL**: `So11111111111111111111111111111111111111112` ✅ (ONLY)

### Output Tokens (Examples)
- **USDC**: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` ✅
- **USDT**: `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB` ✅
- **Any Jupiter-supported token** ✅

### Amount Guidelines
- **Technical Minimum**: 1 lamport
- **Practical Minimum**: 0.0001 SOL (100,000 lamports)
- **Recommended**: 0.001+ SOL (1,000,000+ lamports)

## Configuration

### Environment Variables
```bash
PORT=3000
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
JUPITER_API_URL=https://quote-api.jup.ag/v6
```

### Timeout Settings
```javascript
TOKEN_RECEIPT_TIMEOUT=300000  // 5 minutes
BALANCE_CHECK_INTERVAL=5000   // 5 seconds
```

## Error Handling

### Common Errors

#### Invalid Input Token
```json
{
  "error": "Invalid input token. Only SOL is supported as input token.",
  "code": "INVALID_FROM_TOKEN"
}
```

#### Same Token Swap
```json
{
  "error": "Cannot swap SOL to SOL. Please choose a different output token.",
  "code": "SAME_TOKEN_SWAP"
}
```

#### SOL Receipt Timeout
```json
{
  "error": "Timeout waiting for SOL receipt",
  "code": "TOKEN_RECEIPT_TIMEOUT",
  "timeout": 300000
}
```

#### Swap Execution Failure
```json
{
  "error": "Swap execution failed",
  "details": "Jupiter API error details"
}
```

## Production Deployment

### Environment Setup
1. Set production RPC endpoints
2. Configure proper logging
3. Set up monitoring and alerts
4. Implement rate limiting

### Security Considerations
1. **Input Validation**: All inputs are validated and sanitized
2. **SOL-Only Constraint**: System enforces SOL-only input policy
3. **Temporary Wallets**: Each swap uses a unique temporary wallet
4. **Timeout Protection**: Prevents indefinite waiting for deposits

### Monitoring
- Health check endpoint: `GET /health`
- Transaction logging
- Error tracking and alerting
- Performance metrics

### Backup and Recovery
- Temporary wallet private keys are securely managed
- Transaction history logging
- Error recovery procedures

## Support

For issues or questions:
1. Check the error message and code
2. Verify SOL input requirement
3. Ensure sufficient SOL balance
4. Check network connectivity
5. Contact system administrators

---

**Note**: This system is designed specifically for SOL-to-any-token swaps. If you need to swap other tokens to SOL or between non-SOL tokens, you'll need to use Jupiter directly or implement additional functionality. 