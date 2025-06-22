# Environment Configuration Guide

This guide explains how to set up and use environment configuration files for the Miko Relayer service.

## 📁 Environment Files Overview

The relayer includes several environment configuration files:

- **`.env`** - Main environment file (configured for mainnet with Helius RPC)
- **`.env.example`** - Template file with placeholder values
- **`.env.development`** - Development-optimized settings (devnet)
- **`.env.production`** - Production-ready settings with security focus

## 🚀 Quick Start

### 1. Initial Setup

```bash
# Navigate to relayer directory
cd relayer

# Copy the example file to create your .env
cp .env.example .env

# Edit with your specific values
nano .env
```

### 2. Choose Your Configuration

#### For Development (Recommended for testing)
```bash
# Use development settings with devnet
cp .env.development .env
```

#### For Production
```bash
# Use production settings with mainnet
cp .env.production .env

# ⚠️ Important: Update all placeholder values!
```

## 🔧 Key Configuration Sections

### 1. Network Configuration

#### Mainnet (Production)
```bash
SOLANA_NETWORK=mainnet-beta
SOLANA_RPC=https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY
```

#### Devnet (Development)
```bash
SOLANA_NETWORK=devnet
SOLANA_RPC=https://api.devnet.solana.com
```

### 2. RPC Endpoints

Choose from these recommended providers:

```bash
# Helius (Recommended - high performance)
SOLANA_RPC=https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY

# QuickNode (Premium)
SOLANA_RPC=https://your-endpoint.solana-mainnet.quiknode.pro/YOUR_TOKEN/

# Alchemy (Premium)
SOLANA_RPC=https://solana-mainnet.g.alchemy.com/v2/YOUR_API_KEY

# Public (Free but limited)
SOLANA_RPC=https://api.mainnet-beta.solana.com
```

## 🛠️ Configuration by Use Case

### Local Development

1. **Copy development config:**
   ```bash
   cp .env.development .env
   ```

2. **Key features:**
   - Uses devnet (free test SOL)
   - Disabled MEV protection (faster)
   - Verbose logging
   - Swagger UI enabled
   - Permissive CORS

3. **Get devnet SOL:**
   ```bash
   # Visit https://faucet.solana.com/
   # Request SOL for your test wallet
   ```

### Mainnet Testing

1. **Use main config:**
   ```bash
   # .env is already configured for mainnet
   ```

2. **Update RPC if needed:**
   ```bash
   # Replace with your premium RPC endpoint
   SOLANA_RPC=https://your-premium-endpoint.com
   ```

3. **Fund your wallet:**
   - Send real SOL to your test wallet
   - Start with small amounts (0.01 SOL)

### Production Deployment

1. **Copy production config:**
   ```bash
   cp .env.production .env
   ```

2. **Required updates:**
   ```bash
   # Update these values!
   SOLANA_RPC=https://your-premium-rpc.com
   CORS_ORIGINS=https://yourdomain.com
   API_KEY=your-secure-api-key
   MONITORING_WEBHOOK_URL=https://your-monitoring.com
   ```

3. **Security checklist:**
   - [ ] Premium RPC endpoint configured
   - [ ] CORS origins restricted
   - [ ] API key set
   - [ ] Monitoring configured
   - [ ] SSL enabled
   - [ ] Debug mode disabled

## 🔑 Essential Environment Variables

### Required for All Environments

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode | `development` |
| `SOLANA_RPC` | Primary RPC endpoint | `https://api.devnet.solana.com` |
| `JUPITER_API_URL` | Jupiter aggregator | `https://quote-api.jup.ag/v6` |

### Security-Critical (Production)

| Variable | Description | Example |
|----------|-------------|---------|
| `API_KEY` | API authentication | `secure-random-key` |
| `CORS_ORIGINS` | Allowed origins | `https://yourdomain.com` |
| `SSL_ENABLED` | Enable HTTPS | `true` |

### Performance Tuning

| Variable | Description | Default | Production |
|----------|-------------|---------|------------|
| `CONNECTION_POOL_SIZE` | RPC connections | `10` | `20` |
| `MAX_PRIORITY_FEE_LAMPORTS` | Max priority fee | `10000000` | `20000000` |
| `TOKEN_RECEIPT_TIMEOUT` | Wait timeout | `300000` | `600000` |

## 🧪 Testing Your Configuration

### 1. Validate Environment
```bash
# Check if all required variables are set
npm run validate-env

# Start the server
npm start

# Test health endpoint
curl http://localhost:3000/health
```

### 2. Test API Endpoints
```bash
# Test swap quotation
curl -X POST http://localhost:3000/api/swap \
  -H "Content-Type: application/json" \
  -d '{
    "fromToken": "So11111111111111111111111111111111111111112",
    "toToken": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "amount": "1000000",
    "destinationWallet": "YourWalletAddressHere"
  }'
```

### 3. Run Test Suite
```bash
# Run all tests
npm test

# Run specific test
npm run test:wallet
```

## 🔒 Security Best Practices

### Environment File Security

1. **Never commit sensitive values:**
   ```bash
   # Add to .gitignore
   .env
   .env.local
   .env.production
   ```

2. **Use different keys per environment:**
   ```bash
   # Development
   API_KEY=dev-key-12345

   # Production  
   API_KEY=prod-secure-key-98765
   ```

3. **Restrict file permissions:**
   ```bash
   chmod 600 .env
   chmod 600 .env.production
   ```

### Network Security

1. **Use premium RPC endpoints:**
   - Better reliability
   - Higher rate limits
   - Enhanced security

2. **Configure CORS properly:**
   ```bash
   # Development (permissive)
   CORS_ORIGINS=*

   # Production (restrictive)
   CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
   ```

3. **Enable rate limiting:**
   ```bash
   RATE_LIMIT_MAX_REQUESTS=50  # Adjust based on usage
   ```

## 🚨 Common Issues & Solutions

### Issue: RPC Connection Errors

**Symptoms:**
```
Error: 429 Too Many Requests
```

**Solutions:**
1. Upgrade to premium RPC endpoint
2. Add backup RPC endpoints:
   ```bash
   SOLANA_RPC_BACKUP=https://backup1.com,https://backup2.com
   ```

### Issue: Transaction Timeouts

**Symptoms:**
```
Error: Transaction timeout
```

**Solutions:**
1. Increase timeout values:
   ```bash
   TRANSACTION_TIMEOUT=120000
   TOKEN_RECEIPT_TIMEOUT=600000
   ```

2. Enable MEV protection:
   ```bash
   ENABLE_MEV_PROTECTION=true
   DEFAULT_PRIORITY_FEE_LAMPORTS=5000000
   ```

### Issue: Insufficient Funds

**Symptoms:**
```
Error: Insufficient SOL balance
```

**Solutions:**
1. Fund your wallet with more SOL
2. Reduce test amounts:
   ```bash
   INTEGRATION_TEST_AMOUNT=100000  # 0.0001 SOL
   ```

## 📊 Monitoring & Alerting

### Environment-based Monitoring

```bash
# Development (minimal)
PERFORMANCE_MONITORING=false
ENABLE_ERROR_REPORTING=false

# Production (comprehensive)
PERFORMANCE_MONITORING=true
ENABLE_ERROR_REPORTING=true
MONITORING_WEBHOOK_URL=https://your-monitoring.com/webhook
ERROR_WEBHOOK_URL=https://your-error-tracking.com/webhook
```

### Health Check Configuration

```bash
# Check every 30 seconds
HEALTH_CHECK_INTERVAL=30000

# Enable health endpoint
HEALTH_CHECK_ENABLED=true
```

## 🔄 Environment Switching

### Quick Environment Switch

```bash
# Switch to development
cp .env.development .env && npm restart

# Switch to production  
cp .env.production .env && npm restart

# Switch to custom mainnet
cp .env.example .env && nano .env && npm restart
```

### Docker Environment

```bash
# Use environment-specific Docker compose
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up

# Pass environment file
docker run --env-file .env.production miko-relayer
```

## 📝 Environment Variables Reference

For a complete list of all available environment variables, see:
- [Main configuration](.env)
- [Development settings](.env.development)  
- [Production settings](.env.production)
- [Template with descriptions](.env.example)

## 🆘 Support

If you encounter issues with environment configuration, refer to the main [README.md](./README.md) or open an issue in the repository. 