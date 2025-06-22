// Netlify serverless function for swap quotation
const {
  corsHeaders,
  handleOptions,
  errorResponse,
  successResponse,
  generateTempWallet,
  validateSwapRequest,
  getJupiterQuote,
  validateQuoteResponse
} = require('./utils/serverless-utils.cjs');

exports.handler = async (event, context) => {
  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return errorResponse(405, 'Method Not Allowed');
  }

  try {
    // Parse request body
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (error) {
      return errorResponse(400, 'Invalid JSON', 'Request body must be valid JSON');
    }

    console.log('Swap quotation request received:', body);

    // Validate input
    const validation = validateSwapRequest(body);
    if (validation.errors.length > 0) {
      return errorResponse(400, 'Validation failed', validation.errors.join('; '));
    }

    const { fromToken, toToken, amount, destinationWallet, slippageBps = 50 } = body;

    // Generate a new temporary wallet
    console.log('Generating temporary wallet for swap...');
    const walletInfo = generateTempWallet();

    // Get swap quote from Jupiter
    console.log('Getting swap quote from Jupiter...');
    const quote = await getJupiterQuote({
      fromToken,
      toToken,
      amount,
      slippageBps
    });

    // Validate and enhance quote
    const validatedQuote = validateQuoteResponse(quote, amount);

    // Create wallet token for temporary storage
    const walletToken = Buffer.from(JSON.stringify({
      publicKey: walletInfo.publicKey,
      secretKey: walletInfo.secretKey,
      createdAt: walletInfo.createdAt,
      exp: Date.now() + (30 * 60 * 1000) // 30 minutes
    })).toString('base64');

    // Prepare response with detailed instructions
    const responseData = {
      // Temporary wallet details
      tempWallet: {
        address: walletInfo.publicKey,
        createdAt: new Date(walletInfo.createdAt).toISOString(),
        token: walletToken // Store wallet data in token for stateless operation
      },

      // Swap details
      swap: {
        fromToken,
        toToken,
        inputAmount: amount,
        expectedOutputAmount: validatedQuote.outAmount,
        slippageBps,
        priceImpactPct: Number(validatedQuote.priceImpactPct || 0),
        route: validatedQuote.routePlan || []
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
        `⏱️ STEP 3: Call /api/confirm with this response to execute the swap`,
        `⚠️ Important: The system will wait for SOL receipt before executing the swap`,
        `🔗 Serverless: This runs on Netlify serverless functions`
      ],

      // Warnings from validation
      warnings: validation.warnings.concat(validatedQuote.warnings || []),

      // Expiration time
      expiresAt: new Date(Date.now() + (30 * 60 * 1000)).toISOString()
    };

    console.log(`Quotation prepared successfully. Temp wallet: ${walletInfo.publicKey}`);
    
    return successResponse(responseData);

  } catch (error) {
    console.error('Error in swap quotation:', error);

    // Handle Jupiter-specific errors
    let errorMessage = 'Swap quotation failed';
    let suggestions = ['Try again with a different amount', 'Check network connectivity'];

    if (error.message.includes('Could not find any route')) {
      errorMessage = 'No swap route available';
      suggestions = [
        'Increase the swap amount (minimum 0.001 SOL recommended)',
        'Check if both tokens are actively traded',
        'Try a different token pair'
      ];
    } else if (error.message.includes('Cannot compute other amount threshold')) {
      errorMessage = 'Amount too small for slippage calculation';
      suggestions = [
        'Use at least 0.001 SOL (1,000,000 lamports)',
        'Reduce slippage tolerance',
        'Try a larger amount for better liquidity'
      ];
    }

    return errorResponse(500, errorMessage, error.message);
  }
}; 