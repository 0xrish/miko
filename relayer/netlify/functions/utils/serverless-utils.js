// Shared utilities for Netlify serverless functions
const { Keypair, Connection, PublicKey } = require('@solana/web3.js');
const { getAssociatedTokenAddress } = require('@solana/spl-token');
const axios = require('axios');

// Configuration
const SOLANA_RPC = process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com';
const JUPITER_API = process.env.JUPITER_API_URL || 'https://quote-api.jup.ag/v6';
const SOL_MINT = 'So11111111111111111111111111111111111111112';

// Create Solana connection
const connection = new Connection(SOLANA_RPC, 'confirmed');

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json'
};

// Handle OPTIONS preflight requests
const handleOptions = () => ({
  statusCode: 200,
  headers: corsHeaders,
  body: ''
});

// Error response helper
const errorResponse = (statusCode, error, message = '') => ({
  statusCode,
  headers: corsHeaders,
  body: JSON.stringify({
    success: false,
    error,
    message,
    timestamp: new Date().toISOString()
  })
});

// Success response helper
const successResponse = (data) => ({
  statusCode: 200,
  headers: corsHeaders,
  body: JSON.stringify({
    success: true,
    data,
    timestamp: new Date().toISOString()
  })
});

// Generate temporary wallet (serverless adapted)
const generateTempWallet = () => {
  try {
    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toBase58();
    
    // In serverless, we can't store to filesystem
    // Store in temporary memory or return keypair data
    return {
      publicKey,
      secretKey: Array.from(keypair.secretKey),
      createdAt: Date.now()
    };
  } catch (error) {
    throw new Error(`Failed to generate wallet: ${error.message}`);
  }
};

// Validate swap request
const validateSwapRequest = (body) => {
  const { fromToken, toToken, amount, destinationWallet, slippageBps } = body;
  const errors = [];
  const warnings = [];
  
  // Enforce SOL-only input
  if (!fromToken || fromToken !== SOL_MINT) {
    errors.push('fromToken must be SOL (So11111111111111111111111111111111111111112). This relayer only accepts SOL as input token.');
  }
  
  if (!toToken || typeof toToken !== 'string') {
    errors.push('toToken is required and must be a string');
  }
  
  if (fromToken === toToken) {
    errors.push('fromToken and toToken must be different. Cannot swap SOL to SOL.');
  }
  
  if (!amount || !Number.isInteger(Number(amount)) || Number(amount) <= 0) {
    errors.push('amount is required and must be a positive integer (in lamports for SOL)');
  } else {
    const amountNum = Number(amount);
    const minAmount = 1; // 1 lamport minimum
    const warnThreshold = 100000; // 0.0001 SOL
    const recAmount = 1000000; // 0.001 SOL
    
    if (amountNum < minAmount) {
      errors.push(`Amount too small. Minimum 1 lamport required for SOL swaps. You provided: ${amountNum} lamports.`);
    } else if (amountNum < warnThreshold) {
      warnings.push(`⚠️ Very small amount detected! For better rates consider using 0.0001 SOL or more. Current: ${(amountNum / 1000000000).toFixed(9)} SOL`);
    } else if (amountNum < recAmount) {
      warnings.push(`💡 Small amount. For optimal rates consider using 0.001 SOL or more.`);
    }
  }
  
  if (!destinationWallet || typeof destinationWallet !== 'string') {
    errors.push('destinationWallet is required and must be a string');
  }
  
  if (slippageBps && (!Number.isInteger(Number(slippageBps)) || Number(slippageBps) < 0 || Number(slippageBps) > 10000)) {
    errors.push('slippageBps must be an integer between 0 and 10000');
  }
  
  return { errors, warnings };
};

// Get Jupiter swap quote
const getJupiterQuote = async ({ fromToken, toToken, amount, slippageBps = 50 }) => {
  try {
    const params = new URLSearchParams({
      inputMint: fromToken,
      outputMint: toToken,
      amount: amount.toString(),
      slippageBps: slippageBps.toString(),
      swapMode: 'ExactIn',
      onlyDirectRoutes: 'false',
      asLegacyTransaction: 'false'
    });

    const response = await axios.get(`${JUPITER_API}/quote?${params}`, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Miko-Relayer-Netlify/1.0'
      }
    });
    
    if (!response.data) {
      throw new Error('No quote received from Jupiter');
    }
    
    return response.data;
  } catch (error) {
    throw new Error(`Failed to get swap quote: ${error.response?.data?.error || error.message}`);
  }
};

// Validate quote response
const validateQuoteResponse = (quote, inputAmount) => {
  if (!quote || !quote.outAmount) {
    throw new Error('Invalid quote response from Jupiter');
  }
  
  const outputAmount = Number(quote.outAmount);
  const priceImpactPct = Number(quote.priceImpactPct || 0);
  
  if (outputAmount <= 0) {
    throw new Error('Invalid output amount in quote');
  }
  
  const warnings = [];
  if (priceImpactPct > 5) {
    warnings.push(`⚠️ High price impact: ${priceImpactPct.toFixed(2)}%. Consider using a smaller amount.`);
  } else if (priceImpactPct > 1) {
    warnings.push(`💡 Moderate price impact: ${priceImpactPct.toFixed(2)}%. Larger amounts may get better rates.`);
  }
  
  return {
    ...quote,
    validated: true,
    warnings,
    calculatedAt: new Date().toISOString()
  };
};

// Check token balance
const checkTokenBalance = async (walletAddress, tokenMint, expectedAmount) => {
  try {
    const publicKey = new PublicKey(walletAddress);
    
    if (tokenMint === SOL_MINT) {
      // Check SOL balance
      const balance = await connection.getBalance(publicKey);
      return {
        hasTokens: balance >= expectedAmount,
        currentBalance: balance,
        expectedAmount,
        tokenMint: SOL_MINT
      };
    } else {
      // Check SPL token balance
      const tokenMintPubkey = new PublicKey(tokenMint);
      const tokenAccount = await getAssociatedTokenAddress(tokenMintPubkey, publicKey);
      
      try {
        const tokenAccountInfo = await connection.getTokenAccountBalance(tokenAccount);
        const balance = BigInt(tokenAccountInfo.value.amount);
        const expected = BigInt(expectedAmount);
        
        return {
          hasTokens: balance >= expected,
          currentBalance: balance.toString(),
          expectedAmount: expectedAmount.toString(),
          tokenMint
        };
      } catch (error) {
        return {
          hasTokens: false,
          currentBalance: '0',
          expectedAmount: expectedAmount.toString(),
          tokenMint
        };
      }
    }
  } catch (error) {
    throw new Error(`Failed to check token balance: ${error.message}`);
  }
};

// JWT-like token generation for temporary wallet storage
const generateWalletToken = (walletData) => {
  const payload = {
    publicKey: walletData.publicKey,
    createdAt: walletData.createdAt,
    exp: Date.now() + (30 * 60 * 1000) // 30 minutes
  };
  
  // Simple base64 encoding (in production, use proper JWT)
  return Buffer.from(JSON.stringify(payload)).toString('base64');
};

// Decode wallet token
const decodeWalletToken = (token) => {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    
    // Check expiration
    if (Date.now() > payload.exp) {
      throw new Error('Wallet token expired');
    }
    
    return payload;
  } catch (error) {
    throw new Error('Invalid wallet token');
  }
};

// Environment-specific configuration
const getConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    isProduction,
    solanaRpc: process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com',
    jupiterApi: process.env.JUPITER_API_URL || 'https://quote-api.jup.ag/v6',
    corsOrigins: process.env.CORS_ORIGINS || '*',
    defaultSlippage: parseInt(process.env.DEFAULT_SLIPPAGE_BPS) || 50,
    maxSlippage: parseInt(process.env.MAX_SLIPPAGE_BPS) || 1000,
    tokenReceiptTimeout: parseInt(process.env.TOKEN_RECEIPT_TIMEOUT) || 300000,
    enableMevProtection: process.env.ENABLE_MEV_PROTECTION === 'true',
    debugMode: process.env.DEBUG_MODE === 'true'
  };
};

// Export all functions
module.exports = {
  corsHeaders,
  handleOptions,
  errorResponse,
  successResponse,
  generateTempWallet,
  validateSwapRequest,
  getJupiterQuote,
  validateQuoteResponse,
  checkTokenBalance,
  generateWalletToken,
  decodeWalletToken,
  getConfig,
  connection,
  SOL_MINT
}; 