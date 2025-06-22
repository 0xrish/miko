# Miko Relayer - New Unencrypted Wallet System

## 🔄 What Changed

The Miko Relayer has been updated to remove wallet encryption and use plain JSON private key storage with enhanced Jupiter Ultra integration.

### Key Changes:
- ✅ **Removed encryption**: Wallets now stored as plain JSON files
- ✅ **Enhanced Jupiter integration**: Added Jupiter Ultra API support
- ✅ **User wallet swaps**: Direct swaps using user's own wallets
- ✅ **Permission-based swaps**: Users see quotes before confirming
- ✅ **Improved error handling**: Better error messages and validation

## 🔑 Wallet Management

### Generate New Wallets
```bash
# Generate a new wallet
npm run wallet:generate

# List existing wallets
npm run wallet:list
```

### Wallet File Format
Wallets are now stored as plain JSON in the `secrets/` folder:

```json
{
  "publicKey": "G1uzkCoBaw2txLGSPcv4hbgDCh43rpT8nafnmCBmyJXV",
  "secretKey": [27, 111, 237, 145, ...],
  "createdAt": 1750531046820,
  "used": false,
  "generatedBy": "generate-wallet.js"
}
```

## 🚀 New API Endpoints

### 1. List Available Wallets
```bash
GET /api/swap/wallets
```

**Response:**
```json
{
  "success": true,
  "data": {
    "wallets": [
      {
        "publicKey": "G1uzkCoBaw2txLGSPcv4hbgDCh43rpT8nafnmCBmyJXV",
        "createdAt": 1750531046820,
        "used": false
      }
    ],
    "count": 1
  }
}
```

### 2. User Wallet Swap (with Permission)
```bash
POST /api/swap/user
```

**Step 1: Get Quote (requires user permission)**
```json
{
  "userWallet": "G1uzkCoBaw2txLGSPcv4hbgDCh43rpT8nafnmCBmyJXV",
  "fromToken": "So11111111111111111111111111111111111111112",
  "toToken": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "amount": "1000000",
  "destinationWallet": "EQ1iJf9TGTGs163zcsoKq1JgrXdDK2KGAdoYtB1adoev",
  "slippageBps": 50
}
```

**Response (Quote for User Approval):**
```json
{
  "success": true,
  "requiresConfirmation": true,
  "data": {
    "userWallet": "G1uzkCoBaw2txLGSPcv4hbgDCh43rpT8nafnmCBmyJXV",
    "destinationWallet": "EQ1iJf9TGTGs163zcsoKq1JgrXdDK2KGAdoYtB1adoev",
    "swap": {
      "fromToken": "So11111111111111111111111111111111111111112",
      "toToken": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "inputAmount": 1000000,
      "expectedOutputAmount": 139420,
      "slippageBps": 50,
      "priceImpactPct": 0
    },
    "instructions": [
      "You are about to swap 1000000 tokens from SOL to USDC",
      "Expected output: 139420 tokens",
      "Price impact: 0%",
      "Tokens will be sent to: EQ1iJf9TGTGs163zcsoKq1JgrXdDK2KGAdoYtB1adoev",
      "To proceed, call this endpoint again with \"confirmed\": true"
    ]
  }
}
```

**Step 2: Execute Swap (after user confirmation)**
```json
{
  "userWallet": "G1uzkCoBaw2txLGSPcv4hbgDCh43rpT8nafnmCBmyJXV",
  "fromToken": "So11111111111111111111111111111111111111112",
  "toToken": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "amount": "1000000",
  "destinationWallet": "EQ1iJf9TGTGs163zcsoKq1JgrXdDK2KGAdoYtB1adoev",
  "slippageBps": 50,
  "confirmed": true
}
```

**Response (Execution Result):**
```json
{
  "success": true,
  "data": {
    "status": "success",
    "swapTransaction": "5K7Zx...",
    "transferTransaction": "8Hy3p...",
    "message": "Swap and transfer completed successfully",
    "inputAmount": "1000000",
    "outputAmount": "139420",
    "inputMint": "So11111111111111111111111111111111111111112",
    "outputMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "userWallet": "G1uzkCoBaw2txLGSPcv4hbgDCh43rpT8nafnmCBmyJXV",
    "destinationWallet": "EQ1iJf9TGTGs163zcsoKq1JgrXdDK2KGAdoYtB1adoev"
  }
}
```

## 🔒 Security Considerations

### ⚠️ Important Security Notes:
1. **Plain Text Storage**: Private keys are now stored as plain JSON
2. **File System Security**: Ensure proper file permissions on `secrets/` folder
3. **Access Control**: Limit access to the server and secrets directory
4. **Backup Strategy**: Securely backup wallet files
5. **Environment Security**: Run in a secure environment

### Recommended Security Measures:
```bash
# Set proper permissions on secrets folder
chmod 700 secrets/
chmod 600 secrets/*.json

# Consider encrypting the entire filesystem or using secure storage
```

## 🧪 Testing the New System

### 1. Start the Server
```bash
npm start
```

### 2. Generate a Test Wallet
```bash
npm run wallet:generate
```

### 3. List Available Wallets
```bash
curl http://localhost:3000/api/swap/wallets
```

### 4. Test User Swap (Quote)
```bash
curl -X POST http://localhost:3000/api/swap/user \
  -H "Content-Type: application/json" \
  -d '{
    "userWallet": "YOUR_WALLET_PUBLIC_KEY",
    "fromToken": "So11111111111111111111111111111111111111112",
    "toToken": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "amount": "1000000",
    "destinationWallet": "EQ1iJf9TGTGs163zcsoKq1JgrXdDK2KGAdoYtB1adoev",
    "slippageBps": 50
  }'
```

### 5. Execute Swap (with Confirmation)
```bash
curl -X POST http://localhost:3000/api/swap/user \
  -H "Content-Type: application/json" \
  -d '{
    "userWallet": "YOUR_WALLET_PUBLIC_KEY",
    "fromToken": "So11111111111111111111111111111111111111112",
    "toToken": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "amount": "1000000",
    "destinationWallet": "EQ1iJf9TGTGs163zcsoKq1JgrXdDK2KGAdoYtB1adoev",
    "slippageBps": 50,
    "confirmed": true
  }'
```

## 🔧 Common Token Addresses

```javascript
// Solana Native Token
const SOL = "So11111111111111111111111111111111111111112";

// Stablecoins
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";

// Popular Tokens (verify addresses before use)
// Add other token mint addresses as needed
```

## 🚨 Migration from Old System

### For Existing Encrypted Wallets:
**Note: Encryption has been removed from the system. All wallets are now stored as plain JSON.**

1. **Encrypted wallets have been moved to `secrets/encrypted_backup/`**
2. **To recover encrypted wallets**: You'll need to manually decrypt them using the original encryption key
3. **Recommended approach**: Generate new wallets and transfer funds manually

```bash
# Generate new wallets (recommended)
npm run wallet:generate

# Transfer funds from old wallets to new ones using external tools
```

### Security Considerations:
- Private keys are now stored in plain text JSON format
- Ensure proper file system permissions on the `secrets/` directory
- Consider using encrypted storage or secure environments for production

## 📚 API Documentation

Full API documentation is available at: `http://localhost:3000/api-docs`

## 🔄 Workflow Summary

1. **Generate Wallet**: Create a new wallet using the generate script
2. **Fund Wallet**: Send tokens to the wallet address
3. **Get Quote**: Call `/api/swap/user` to get a swap quote
4. **Review**: User reviews the quote and swap details
5. **Confirm**: Call the same endpoint with `confirmed: true`
6. **Execute**: System executes swap and transfers to destination

This new system provides better transparency, user control, and easier debugging while maintaining the core functionality of the relayer. 