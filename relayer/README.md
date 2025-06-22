# Miko Vault - Relayer Service

A high-performance Node.js service that facilitates private token swaps on Solana through Jupiter aggregator integration. The relayer acts as an intermediary layer, creating temporary wallets to obscure transaction origins and provide privacy-enhanced swapping capabilities.

## 🏗️ Architecture

The relayer service implements a sophisticated swap mechanism with the following components:

- **Temporary Wallet Generation**: Creates ephemeral wallets for each swap
- **Jupiter Integration**: Leverages Jupiter's aggregator for optimal swap routes
- **MEV Protection**: Optional MEV-resistant transaction execution
- **Automatic Asset Transfer**: Transfers swapped tokens to destination wallets
- **Transaction Monitoring**: Real-time swap status tracking
- **Wallet Cleanup**: Automatic cleanup of temporary wallets

### System Flow

1. **Quote Request**: Client requests swap quote for token pair
2. **Temp Wallet Creation**: Service generates temporary wallet
3. **Quote Validation**: Validates swap parameters and amounts
4. **User Confirmation**: Client confirms swap with temporary wallet details
5. **Swap Execution**: Execute swap through Jupiter in temporary wallet
6. **Asset Transfer**: Transfer swapped tokens to destination wallet
7. **Cleanup**: Clean up temporary wallet and sensitive data

## 📁 Directory Structure

```
relayer/
├── src/                        # Source code
│   ├── app.js                  # Express application setup
│   ├── config/
│   │   └── swagger.js          # Swagger/OpenAPI configuration
│   ├── routes/
│   │   ├── swap.js             # Swap quote and validation endpoints
│   │   └── confirm.js          # Swap confirmation and execution
│   └── services/
│       ├── jupiterService.js   # Jupiter aggregator integration
│       └── walletService.js    # Wallet generation and management
├── example/
│   └── test-relayer.js         # Comprehensive test suite
├── secrets/                    # Encrypted wallet storage
│   ├── encrypted_backup/
│   └── script/
│       ├── convert.js          # Keypair conversion utilities
│       └── convert-all.js      # Batch conversion script
├── docs/                       # Documentation
│   ├── ENHANCED_RELAYER_GUIDE.md
│   ├── MAINNET_SWAP_GUIDE.md
│   ├── SWAGGER_GUIDE.md
│   └── WALLET_TEST_README.md
├── test-scripts/               # Testing utilities
│   ├── test-enhanced-relayer.js
│   ├── test-mainnet-swap.js
│   └── test-wallet-integration.js
├── package.json               # Dependencies and scripts
├── Dockerfile                 # Container configuration
└── README.md                  # This file
```

## 🔧 Core Services

### 1. Jupiter Service (`src/services/jupiterService.js`)

**Primary Functions:**
- **Quote Generation**: Fetch optimal swap routes and pricing
- **Transaction Building**: Construct swap transactions
- **MEV Protection**: Optional Jito bundle integration
- **Swap Execution**: Execute swaps with priority fees
- **Asset Transfer**: Transfer tokens to destination wallets

**Key Features:**
```javascript
// Get swap quote
await getSwapQuote({
  fromToken: 'So11111111111111111111111111111111111111112', // SOL
  toToken: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  amount: '1000000000', // 1 SOL in lamports
  slippageBps: 50 // 0.5% slippage
});

// Execute swap with MEV protection
await executeSwapAndTransfer({
  tempWalletAddress: 'temp_wallet_pubkey',
  destinationWallet: 'destination_pubkey',
  quoteResponse: quote,
  mevProtectionOptions: { enabled: true }
});
```

### 2. Wallet Service (`src/services/walletService.js`)

**Wallet Management:**
- **Generation**: Create new ephemeral keypairs
- **Storage**: Secure encrypted storage with automatic cleanup
- **Balance Monitoring**: Real-time balance tracking
- **Asset Detection**: Monitor for incoming tokens
- **Cleanup**: Automatic wallet cleanup after completion

**Security Features:**
```javascript
// Generate temporary wallet
const { publicKey, encryptedKeypair } = await generateWalletAndStore();

// Wait for token arrival
await waitForTokens(walletAddress, tokenMint, expectedAmount);

// Secure cleanup
await cleanupWallet(publicKey);
```

## 🌐 API Endpoints

### Swagger Documentation
Access interactive API documentation at: `http://localhost:3001/api-docs`

### Core Endpoints

#### 1. Health Check
```http
GET /health
```
**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

#### 2. Get Swap Quote
```http
POST /api/swap/quote
```
**Request Body:**
```json
{
  "fromToken": "So11111111111111111111111111111111111111112",
  "toToken": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "amount": "1000000000",
  "destinationWallet": "destination_wallet_address",
  "slippageBps": 50
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tempWallet": {
      "address": "temp_wallet_address",
      "createdAt": "2024-01-20T10:30:00.000Z"
    },
    "swap": {
      "fromToken": "SOL",
      "toToken": "USDC",
      "inputAmount": 1000000000,
      "expectedOutputAmount": 95000000,
      "slippageBps": 50,
      "priceImpactPct": 0.1
    },
    "instructions": [
      "Send 1.0 SOL to temp_wallet_address",
      "Confirm the swap to proceed"
    ]
  }
}
```

#### 3. Confirm Swap
```http
POST /api/swap/confirm
```
**Request Body:**
```json
{
  "tempWalletAddress": "temp_wallet_address",
  "confirmation": true,
  "destinationWallet": "destination_wallet_address",
  "quoteResponse": { /* Quote response object */ }
}
```

**Response:**
```json
{
  "success": true,
  "status": "completed",
  "data": {
    "swapTransaction": "transaction_signature",
    "transferTransaction": "transfer_signature",
    "explorerLinks": {
      "swap": "https://solscan.io/tx/swap_signature",
      "transfer": "https://solscan.io/tx/transfer_signature"
    }
  }
}
```

## 🚀 Setup & Development

### Prerequisites
- [Node.js](https://nodejs.org/) 18+
- [npm](https://npmjs.com/) or [yarn](https://yarnpkg.com/)
- Solana CLI tools
- Valid Solana wallet with funds

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Start development server
npm run dev
```

### Environment Configuration

Create a `.env` file with the following variables:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Solana Configuration
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet

# Jupiter Configuration
JUPITER_API_URL=https://quote-api.jup.ag/v6

# Wallet Configuration
WALLET_STORAGE_PATH=./secrets/wallets
CLEANUP_INTERVAL=300000

# MEV Protection (Optional)
JITO_TIP_AMOUNT=10000
ENABLE_MEV_PROTECTION=false

# Monitoring
LOG_LEVEL=info
METRICS_ENABLED=true
```

### Available Scripts

```bash
# Development
npm run dev              # Start with nodemon
npm start               # Start production server

# Testing
npm run test            # Run all tests
npm run test:integration # Integration tests only
npm run test:wallet     # Wallet-specific tests

# Utilities
npm run generate-wallet # Generate new wallet
npm run fund-wallet     # Fund test wallet
npm run cleanup        # Clean old wallets
```

## 🧪 Testing

### Comprehensive Test Suite

The relayer includes extensive testing capabilities:

#### 1. Basic Functionality Tests
```bash
# Run health check and basic validation
node example/test-relayer.js
```

#### 2. Enhanced Relayer Tests
```bash
# Test complete swap flow with real tokens
node test-enhanced-relayer.js
```

#### 3. Mainnet Integration Tests
```bash
# Test against mainnet (use with caution)
node test-mainnet-swap.js
```

#### 4. Wallet Integration Tests
```bash
# Test wallet generation and management
node test-wallet-integration.js
```

### Test Scenarios

1. **Quote Generation**: Validate accurate pricing and routing
2. **Wallet Creation**: Test temporary wallet generation
3. **Asset Transfer**: Verify token transfers to temp wallets
4. **Swap Execution**: Execute complete swap flows
5. **Cleanup Process**: Verify proper wallet cleanup
6. **Error Handling**: Test various failure scenarios
7. **Amount Validation**: Test different swap amounts
8. **Slippage Handling**: Verify slippage protection

## 🔒 Security Features

### Wallet Security
- **Temporary Wallets**: Ephemeral keypairs for each swap
- **Encrypted Storage**: AES-256 encryption for stored keypairs
- **Automatic Cleanup**: Scheduled cleanup of old wallets
- **Access Control**: No persistent storage of user funds

### Transaction Security
- **Slippage Protection**: Configurable maximum slippage
- **Amount Validation**: Comprehensive input validation
- **MEV Protection**: Optional MEV-resistant execution
- **Priority Fees**: Dynamic fee calculation for fast execution

### Operational Security
- **Rate Limiting**: API rate limiting and DDoS protection
- **Input Sanitization**: Comprehensive input validation
- **Error Handling**: Secure error messages without sensitive data
- **Audit Logging**: Comprehensive transaction logging

## 📊 Monitoring & Analytics

### Health Monitoring
- **Health Checks**: Comprehensive system health endpoints
- **Balance Monitoring**: Real-time wallet balance tracking
- **Transaction Monitoring**: Swap success/failure rates
- **Performance Metrics**: Response time and throughput monitoring

### Logging
```javascript
// Structured logging with correlation IDs
logger.info('Swap initiated', {
  correlationId: 'swap_123',
  fromToken: 'SOL',
  toToken: 'USDC',
  amount: '1000000000'
});
```

## 🔧 Configuration

### Jupiter Configuration
```javascript
// Custom Jupiter options
const jupiterOptions = {
  slippageBps: 50,
  enableMevProtection: true,
  priorityFeesBps: 100,
  maxAccounts: 64
};
```

### MEV Protection
```javascript
// Jito bundle configuration
const mevProtectionOptions = {
  enabled: true,
  tipAmount: 10000, // lamports
  bundleOnly: false
};
```

## 🚀 Deployment

### Docker Deployment
```bash
# Build Docker image
docker build -t miko-relayer .

# Run container
docker run -p 3001:3001 -e NODE_ENV=production miko-relayer
```

### Production Considerations
- **Load Balancing**: Deploy multiple instances behind load balancer
- **Database**: Consider Redis for session storage
- **Monitoring**: Implement comprehensive monitoring and alerting
- **Backup**: Regular backup of critical configuration
- **Security**: Use proper secrets management

## 🔮 Future Enhancements

### Planned Features
- **Multi-chain Support**: Extend beyond Solana
- **Advanced Routing**: Custom routing algorithms
- **Batch Swaps**: Multiple swaps in single transaction
- **Governance Integration**: DAO-controlled parameters
- **Analytics Dashboard**: Real-time swap analytics

### Technical Improvements
- **Performance Optimization**: Connection pooling and caching
- **Enhanced Security**: Hardware security module integration
- **Monitoring Enhancement**: Advanced metrics and alerting
- **API Versioning**: Backward-compatible API evolution

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Install dependencies (`npm install`)
4. Set up environment variables
5. Run tests (`npm run test`)
6. Make your changes
7. Ensure all tests pass
8. Commit your changes (`git commit -m 'Add amazing feature'`)
9. Push to the branch (`git push origin feature/amazing-feature`)
10. Open a Pull Request

### Development Guidelines
- Follow Node.js best practices
- Maintain comprehensive test coverage
- Use structured logging
- Handle errors gracefully
- Document API changes
- Validate all inputs
- Use async/await for clarity

## 📄 License

This project is licensed under the ISC License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Review the documentation in the `docs/` directory
- Check the test examples in `example/` and `test-*` files
- Run the comprehensive test suite to validate setup
- Review the Swagger documentation at `/api-docs`

### Common Issues
- **Wallet Funding**: Ensure test wallets have sufficient funds
- **RPC Limits**: Use private RPC endpoints for production
- **Network Issues**: Verify Solana network connectivity
- **Token Validation**: Ensure token mints are valid and active 