# Miko Relayer - Solana Token Swap Relayer

A powerful Node.js backend service that acts as a relayer for Solana token swaps using Jupiter aggregator. This service creates temporary wallets for secure token swapping and automatically transfers the swapped assets to the user's destination wallet.

## 🚀 Features

- **Secure Temporary Wallets**: Creates encrypted temporary wallets for each swap
- **Jupiter Integration**: Uses Jupiter v6 API for optimal swap routes and pricing
- **Multi-Token Support**: Supports both SOL and SPL token swaps
- **Automatic Cleanup**: Removes temporary wallets after use or expiration
- **Comprehensive API**: RESTful API with detailed responses and error handling
- **Production Ready**: CORS support, request logging, and proper error handling

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Solana RPC endpoint (defaults to mainnet)

## 🛠️ Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd miko-relayer
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Configuration (Optional)**
```bash
# Create .env file
cp .env.example .env

# Configure environment variables
SOLANA_RPC=https://api.mainnet-beta.solana.com
PORT=3000
NODE_ENV=development
```

4. **Start the server**
```bash
npm start
# or for development with auto-restart
npm run dev
```

5. **Access the API Documentation**
```
🌐 Interactive API Docs: http://localhost:3000/api-docs
📋 Health Check: http://localhost:3000/health
```

## 🔧 API Documentation

### 📚 **Interactive Swagger Documentation**
**🌟 NEW: Complete API documentation with interactive testing!**

**🔗 http://localhost:3000/api-docs**

Features:
- **Interactive API testing** directly in your browser
- **Pre-filled examples** for all endpoints
- **Real-time validation** and error handling
- **Comprehensive schemas** and response examples
- **Mobile-friendly** responsive design

### Base URL
```
http://localhost:3000/api
```

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 1. Initialize Swap

Creates a temporary wallet and gets a swap quote.

```http
POST /api/swap
```

**Request Body:**
```json
{
  "fromToken": "So11111111111111111111111111111111111111112",
  "toToken": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "amount": "1000000000",
  "destinationWallet": "YourWalletAddressHere",
  "slippageBps": 50
}
```

**Parameters:**
- `fromToken` (string): Source token mint address
- `toToken` (string): Destination token mint address  
- `amount` (string): Amount in smallest unit (lamports for SOL)
- `destinationWallet` (string): User's wallet address to receive swapped tokens
- `slippageBps` (number, optional): Slippage tolerance in basis points (default: 50 = 0.5%)

**Response:**
```json
{
  "success": true,
  "data": {
    "tempWalletAddress": "TempWalletAddressHere",
    "destinationWallet": "YourWalletAddressHere",
    "swap": {
      "fromToken": "So11111111111111111111111111111111111111112",
      "toToken": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "inputAmount": 1000000000,
      "expectedOutputAmount": 999500000,
      "slippageBps": 50,
      "priceImpactPct": 0.01
    },
    "quote": { /* Jupiter quote response */ },
    "instructions": [
      "1. Send 1000000000 SOL to: TempWalletAddressHere",
      "2. Call /api/confirm with confirmation=true to execute the swap",
      "3. Swapped tokens will be transferred to: YourWalletAddressHere"
    ],
    "expiresAt": "2024-01-15T11:00:00.000Z"
  }
}
```

### 2. Execute Swap

Confirms and executes the swap, then transfers assets to destination wallet.

```http
POST /api/confirm
```

**Request Body:**
```json
{
  "tempWalletAddress": "TempWalletAddressFromSwapResponse",
  "confirmation": true,
  "destinationWallet": "YourWalletAddressHere",
  "quoteResponse": { /* Quote object from /api/swap response */ }
}
```

**Parameters:**
- `tempWalletAddress` (string): Temporary wallet address from swap response
- `confirmation` (boolean): Must be `true` to execute the swap
- `destinationWallet` (string): Destination wallet address
- `quoteResponse` (object): Complete quote object from `/api/swap` response

**Response:**
```json
{
  "success": true,
  "status": "completed",
  "data": {
    "swapTransaction": "SwapTransactionSignatureHere",
    "transferTransaction": "TransferTransactionSignatureHere",
    "tempWalletAddress": "TempWalletAddressHere",
    "destinationWallet": "YourWalletAddressHere",
    "message": "Swap and transfer completed successfully",
    "explorerLinks": {
      "swap": "https://solscan.io/tx/SwapTransactionSignatureHere",
      "transfer": "https://solscan.io/tx/TransferTransactionSignatureHere"
    }
  }
}
```

## 💡 Usage Example

### Complete Swap Flow

1. **Get a swap quote and temporary wallet:**
```javascript
const swapResponse = await fetch('http://localhost:3000/api/swap', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fromToken: 'So11111111111111111111111111111111111111112', // SOL
    toToken: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',   // USDC
    amount: '1000000000', // 1 SOL in lamports
    destinationWallet: 'YourWalletAddressHere',
    slippageBps: 50 // 0.5% slippage
  })
});

const swapData = await swapResponse.json();
console.log('Temporary wallet:', swapData.data.tempWalletAddress);
```

2. **Send tokens to the temporary wallet** (using your preferred Solana wallet/SDK)

3. **Confirm and execute the swap:**
```javascript
const confirmResponse = await fetch('http://localhost:3000/api/confirm', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tempWalletAddress: swapData.data.tempWalletAddress,
    confirmation: true,
    destinationWallet: 'YourWalletAddressHere',
    quoteResponse: swapData.data.quote
  })
});

const result = await confirmResponse.json();
console.log('Swap completed:', result.data.explorerLinks.swap);
```

## 🔐 Security Features

- **Encrypted Private Keys**: All private keys are encrypted before storage
- **In-Memory Storage**: Primary storage is in-memory for better security
- **Automatic Cleanup**: Temporary wallets are automatically cleaned up
- **Input Validation**: Comprehensive validation of all API inputs
- **Error Handling**: Detailed error responses without exposing sensitive data

## 📊 Token Support

### Common Token Addresses

- **SOL**: `So11111111111111111111111111111111111111112`
- **USDC**: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- **USDT**: `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`
- **RAY**: `4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R`
- **SRM**: `SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt`

## 🐛 Error Handling

The API returns detailed error responses:

```json
{
  "success": false,
  "status": "failed",
  "error": "Detailed error message",
  "details": "Stack trace (development only)"
}
```

Common error scenarios:
- Invalid token addresses
- Insufficient balance in temporary wallet
- Network connectivity issues
- Invalid quote responses
- Slippage exceeded

## 🚀 Development

### Running in Development Mode
```bash
npm run dev
```

### Environment Variables
```bash
# .env file
SOLANA_RPC=https://api.mainnet-beta.solana.com
PORT=3000
NODE_ENV=development
```

### Testing

#### **🌟 Recommended: Use Swagger UI**
The easiest way to test the API is through the interactive Swagger documentation:
```
http://localhost:3000/api-docs
```

#### **Alternative: Command Line Testing**
Test the API endpoints using curl or Postman:

```bash
# Health check
curl http://localhost:3000/health

# Swap quote
curl -X POST http://localhost:3000/api/swap \
  -H "Content-Type: application/json" \
  -d '{"fromToken":"So11111111111111111111111111111111111111112","toToken":"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v","amount":"1000000000","destinationWallet":"YourWalletHere"}'
```

📖 **For detailed testing guide, see:** [SWAGGER_GUIDE.md](./SWAGGER_GUIDE.md)

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For issues and questions:
- Create an issue on GitHub
- Check the existing documentation
- Review the error messages and logs 