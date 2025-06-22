import express from 'express';
import { generateWalletAndStore } from '../services/walletService.js';
import { getSwapQuote } from '../services/jupiterService.js';

const router = express.Router();

// Minimum amounts for different tokens (in their smallest units)
// Based on actual Jupiter testing - Jupiter is very permissive!
const MINIMUM_AMOUNTS = {
  'So11111111111111111111111111111111111111112': 1, // 1 lamport minimum (Jupiter accepts this)
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 1, // 1 micro-USDC minimum
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 1, // 1 micro-USDT minimum
  default: 1 // Default minimum for other tokens
};

// Recommended minimums for best user experience and reliable quotes
const RECOMMENDED_AMOUNTS = {
  'So11111111111111111111111111111111111111112': 1000000, // 0.001 SOL recommended
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 1000, // 0.001 USDC recommended
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 1000, // 0.001 USDT recommended
  default: 1000 // Default recommended for other tokens
};

// Warning thresholds for small amounts that might have poor UX
const WARNING_THRESHOLDS = {
  'So11111111111111111111111111111111111111112': 100000, // 0.0001 SOL
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 100, // 0.0001 USDC
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 100, // 0.0001 USDT
  default: 100 // Default warning threshold
};

// Input validation helper
function validateSwapRequest(body) {
  const { fromToken, toToken, amount, destinationWallet, slippageBps, enableMevProtection } = body;
  const errors = [];
  const warnings = [];
  
  // Enforce that fromToken must always be SOL
  const SOL_MINT = 'So11111111111111111111111111111111111111112';
  if (!fromToken || fromToken !== SOL_MINT) {
    errors.push('fromToken must be SOL (So11111111111111111111111111111111111111112). This relayer only accepts SOL as input token.');
  }
  
  if (!toToken || typeof toToken !== 'string') {
    errors.push('toToken is required and must be a string');
  }
  
  // Validate that fromToken and toToken are different
  if (fromToken === toToken) {
    errors.push('fromToken and toToken must be different. Cannot swap SOL to SOL.');
  }
  
  if (!amount || !Number.isInteger(Number(amount)) || Number(amount) <= 0) {
    errors.push('amount is required and must be a positive integer (in lamports for SOL)');
  } else {
    const amountNum = Number(amount);
    const minAmount = MINIMUM_AMOUNTS[SOL_MINT];
    const recAmount = RECOMMENDED_AMOUNTS[SOL_MINT];
    const warnThreshold = WARNING_THRESHOLDS[SOL_MINT];
    
    if (amountNum < minAmount) {
      errors.push(`Amount too small. Minimum 1 lamport required for SOL swaps. You provided: ${amountNum} lamports.`);
    } else if (amountNum < warnThreshold) {
      const warnAmountDisplay = (warnThreshold / 1000000000).toFixed(4) + ' SOL';
      warnings.push(`⚠️ Very small amount detected! For better rates and user experience, consider using ${warnAmountDisplay} or more. Current amount: ${(amountNum / 1000000000).toFixed(9)} SOL`);
    } else if (amountNum < recAmount) {
      const recAmountDisplay = (recAmount / 1000000000).toFixed(3) + ' SOL';
      warnings.push(`💡 Small amount. For optimal rates and reliability, consider using ${recAmountDisplay} or more.`);
    }
  }
  
  if (!destinationWallet || typeof destinationWallet !== 'string') {
    errors.push('destinationWallet is required and must be a string');
  }
  
  if (slippageBps && (!Number.isInteger(Number(slippageBps)) || Number(slippageBps) < 0 || Number(slippageBps) > 10000)) {
    errors.push('slippageBps must be an integer between 0 and 10000');
  }
  
  // Validate MEV protection parameter
  if (enableMevProtection !== undefined && typeof enableMevProtection !== 'boolean') {
    errors.push('enableMevProtection must be a boolean when provided');
  }
  
  return { errors, warnings };
}

// Helper function to validate and enhance quote data
function validateQuoteResponse(quote, inputAmount) {
  if (!quote || !quote.outAmount) {
    throw new Error('Invalid quote response from Jupiter');
  }
  
  const outputAmount = Number(quote.outAmount);
  const priceImpactPct = Number(quote.priceImpactPct || 0);
  
  // Check for suspicious quotes
  if (outputAmount <= 0) {
    throw new Error('Invalid output amount in quote');
  }
  
  // Warn about high price impact
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
}

// Helper function to get user-friendly error messages
function getJupiterErrorMessage(error) {
  const errorMessage = error.message || error.toString();
  
  if (errorMessage.includes('Could not find any route')) {
    return {
      error: 'No swap route available',
      message: 'Jupiter could not find a trading route for this token pair at the specified amount. Try increasing the amount or using a different token pair.',
      suggestions: [
        'Increase the swap amount (minimum 0.001 SOL recommended for reliable quotes)',
        'Check if both tokens are actively traded',
        'Try a different token pair',
        'Reduce slippage tolerance if it\'s very low'
      ]
    };
  }
  
  if (errorMessage.includes('Cannot compute other amount threshold')) {
    return {
      error: 'Amount too small for slippage calculation',
      message: 'The swap amount is too small for Jupiter to calculate slippage. Please increase the amount.',
      suggestions: [
        'Use at least 0.001 SOL (1,000,000 lamports)',
        'Reduce slippage tolerance (try 100-500 bps)',
        'Try a larger amount for better liquidity'
      ]
    };
  }
  
  if (errorMessage.includes('No quote') || errorMessage.includes('Invalid quote')) {
    return {
      error: 'Quote unavailable',
      message: 'Unable to get a valid price quote for this swap. The amount might be too small or the tokens might not have sufficient liquidity.',
      suggestions: [
        'Increase the swap amount',
        'Try during active trading hours',
        'Check token availability on Jupiter',
        'Verify token addresses are correct'
      ]
    };
  }
  
  return {
    error: 'Jupiter API error',
    message: errorMessage,
    suggestions: [
      'Try again with a larger amount',
      'Check network connectivity',
      'Verify token addresses are correct',
      'Contact support if the issue persists'
    ]
  };
}

/**
 * @swagger
 * /api/swap:
 *   post:
 *     summary: Get swap quotation for SOL to any token
 *     tags: [Swap]
 *     description: |
 *       Creates a temporary wallet and gets a swap quote from Jupiter for SOL to any supported token.
 *       
 *       **Enhanced Process:**
 *       1. Validates input parameters (fromToken must be SOL)
 *       2. Creates a secure temporary wallet
 *       3. Gets the best swap quote from Jupiter
 *       4. Returns wallet address, quote details, and instructions
 *       
 *       **Important Constraints:**
 *       - Input token (fromToken) must always be SOL
 *       - Output token (toToken) can be any supported token
 *       - Amount must be specified in lamports (1 SOL = 1,000,000,000 lamports)
 *       
 *       **Next Steps:**
 *       1. Send the specified amount of SOL to the returned temporary wallet
 *       2. Call `/api/confirm` to execute the swap (it will wait for SOL receipt)
 *       
 *       **Amount Requirements:**
 *       - Technical Minimum: 1 lamport
 *       - Practical Minimum: 0.0001 SOL (100,000 lamports) for reasonable UX
 *       - Recommended: 0.001+ SOL (1,000,000+ lamports) for optimal rates
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fromToken
 *               - toToken
 *               - amount
 *               - destinationWallet
 *             properties:
 *               fromToken:
 *                 type: string
 *                 description: Must always be SOL mint address
 *                 example: "So11111111111111111111111111111111111111112"
 *                 enum: ["So11111111111111111111111111111111111111112"]
 *               toToken:
 *                 type: string
 *                 description: Destination token mint address
 *                 example: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
 *               amount:
 *                 type: string
 *                 description: Amount in lamports (1 SOL = 1,000,000,000 lamports)
 *                 example: "1000000"
 *               destinationWallet:
 *                 type: string
 *                 description: Wallet address to receive the swapped tokens
 *                 example: "YourWalletAddressHere"
 *               slippageBps:
 *                 type: integer
 *                 description: Slippage tolerance in basis points (optional, default 50)
 *                 example: 50
 *                 minimum: 0
 *                 maximum: 10000
 *               enableMevProtection:
 *                 type: boolean
 *                 description: Enable MEV protection (optional, default false)
 *           examples:
 *             SOL_to_USDC_small:
 *               summary: Swap 0.0001 SOL to USDC
 *               value:
 *                 fromToken: "So11111111111111111111111111111111111111112"
 *                 toToken: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
 *                 amount: "100000"
 *                 destinationWallet: "YourWalletAddressHere"
 *                 slippageBps: 50
 *                 enableMevProtection: false
 *             SOL_to_USDC_recommended:
 *               summary: Swap 0.001 SOL to USDC (recommended)
 *               value:
 *                 fromToken: "So11111111111111111111111111111111111111112"
 *                 toToken: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
 *                 amount: "1000000"
 *                 destinationWallet: "YourWalletAddressHere"
 *                 slippageBps: 50
 *                 enableMevProtection: false
 *             SOL_to_USDT:
 *               summary: Swap 0.01 SOL to USDT
 *               value:
 *                 fromToken: "So11111111111111111111111111111111111111112"
 *                 toToken: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
 *                 amount: "10000000"
 *                 destinationWallet: "YourWalletAddressHere"
 *                 slippageBps: 50
 *                 enableMevProtection: false
 *             SOL_to_Custom_Token:
 *               summary: Swap SOL to any custom token
 *               value:
 *                 fromToken: "So11111111111111111111111111111111111111112"
 *                 toToken: "YourCustomTokenMintAddress"
 *                 amount: "5000000"
 *                 destinationWallet: "YourWalletAddressHere"
 *                 slippageBps: 100
 *                 enableMevProtection: false
 *     responses:
 *       200:
 *         description: Swap quote generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SwapResponse'
 *       400:
 *         description: Validation error or Jupiter API error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServerErrorResponse'
 */
router.post('/', async (req, res, next) => {
  try {
    console.log('Swap quotation request received:', req.body);
    
    // Validate input
    const validation = validateSwapRequest(req.body);
    if (validation.errors.length > 0) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validation.errors 
      });
    }
    
    const { fromToken, toToken, amount, destinationWallet, slippageBps = 50, enableMevProtection = false } = req.body;
    
    // Generate a new temporary wallet
    console.log('Generating temporary wallet for swap...');
    const walletInfo = await generateWalletAndStore();
    
    // Get swap quote from Jupiter
    const mevStatus = enableMevProtection ? 'MEV-protected' : 'standard';
    console.log(`Getting ${mevStatus} swap quote from Jupiter...`);
    const quote = await getSwapQuote({
      fromToken,
      toToken,
      amount,
      slippageBps,
      enableMevProtection
    });
    
    // Validate and enhance quote
    const validatedQuote = validateQuoteResponse(quote, amount);
    
    // Prepare response with detailed instructions
    const response = {
      success: true,
      data: {
        // Temporary wallet details
        tempWallet: {
          address: walletInfo.publicKey,
          createdAt: new Date().toISOString()
        },
        
        // Swap details
        swap: {
          fromToken,
          toToken,
          inputAmount: amount,
          expectedOutputAmount: validatedQuote.outAmount,
          slippageBps,
          priceImpactPct: Number(validatedQuote.priceImpactPct || 0),
          route: validatedQuote.routePlan || [],
          mevProtectionEnabled: enableMevProtection
        },
        
        // Destination
        destinationWallet,
        
        // Quote response (needed for confirmation)
        quoteResponse: validatedQuote,
        
        // Instructions for user
        instructions: [
          `📋 STEP 1: Send exactly ${amount} lamports (${(Number(amount) / 1000000000).toFixed(9)} SOL) to the temporary wallet: ${walletInfo.publicKey}`,
          `💱 STEP 2: Expected swap output: ${validatedQuote.outAmount} tokens of the destination token`,
          `📊 Price impact: ${Number(validatedQuote.priceImpactPct || 0).toFixed(2)}%`,
          `🎯 Final destination: ${destinationWallet}`,
          enableMevProtection ? `🛡️ MEV Protection: ENABLED - Your transaction will be protected from front-running and sandwich attacks` : `⚠️ MEV Protection: DISABLED - Consider enabling for better protection`,
          `⏱️ STEP 3: Call /api/confirm with this response to execute the swap`,
          `⚠️ Important: The system will wait for SOL receipt before executing the swap`
        ],
        
        // Warnings from validation
        warnings: validation.warnings.concat(validatedQuote.warnings || [])
      }
    };
    
    console.log(`Quotation prepared successfully. Temp wallet: ${walletInfo.publicKey}`);
    res.json(response);
    
  } catch (error) {
    console.error('Error in swap quotation:', error);
    
    // Handle Jupiter-specific errors
    const jupiterError = getJupiterErrorMessage(error);
    
    res.status(500).json({
      success: false,
      error: jupiterError.error,
      message: jupiterError.message,
      suggestions: jupiterError.suggestions,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router; 