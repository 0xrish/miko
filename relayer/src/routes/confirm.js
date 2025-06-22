import express from 'express';
import { executeSwapAndTransfer } from '../services/jupiterService.js';
import { waitForTokens, checkTokenBalance } from '../services/walletService.js';

const router = express.Router();

// Input validation helper
function validateConfirmRequest(body) {
  const { tempWallet, destinationWallet, quoteResponse, confirmed, mevProtectionOptions } = body;
  const errors = [];
  
  // Support both old and new format
  const tempWalletAddress = tempWallet?.address || body.tempWalletAddress;
  
  if (!tempWalletAddress || typeof tempWalletAddress !== 'string') {
    errors.push('tempWallet.address or tempWalletAddress is required and must be a string');
  }
  
  if (!destinationWallet || typeof destinationWallet !== 'string') {
    errors.push('destinationWallet is required and must be a string');
  }
  
  if (!quoteResponse || typeof quoteResponse !== 'object') {
    errors.push('quoteResponse is required and must be an object');
  }
  
  // Check if this is a confirmation request
  if (confirmed !== undefined && typeof confirmed !== 'boolean') {
    errors.push('confirmed must be a boolean when provided');
  }
  
  // Validate MEV protection options
  if (mevProtectionOptions !== undefined) {
    if (typeof mevProtectionOptions !== 'object') {
      errors.push('mevProtectionOptions must be an object when provided');
    } else {
      const { enableMevProtection, useJitoBundles, maxRetries } = mevProtectionOptions;
      
      if (enableMevProtection !== undefined && typeof enableMevProtection !== 'boolean') {
        errors.push('mevProtectionOptions.enableMevProtection must be a boolean when provided');
      }
      
      if (useJitoBundles !== undefined && typeof useJitoBundles !== 'boolean') {
        errors.push('mevProtectionOptions.useJitoBundles must be a boolean when provided');
      }
      
      if (maxRetries !== undefined && (!Number.isInteger(maxRetries) || maxRetries < 1 || maxRetries > 10)) {
        errors.push('mevProtectionOptions.maxRetries must be an integer between 1 and 10 when provided');
      }
    }
  }
  
  return errors;
}

/**
 * @swagger
 * /api/confirm:
 *   post:
 *     summary: Execute the SOL swap and transfer tokens to destination
 *     tags: [Swap]
 *     description: |
 *       Confirms and executes the SOL-to-token swap with enhanced workflow:
 *       
 *       **Enhanced Process:**
 *       1. Validates the confirmation request
 *       2. Waits for SOL to be received in the temporary wallet (up to 5 minutes)
 *       3. Executes the swap via Jupiter aggregator
 *       4. Transfers the swapped tokens to the destination wallet
 *       5. Returns transaction signatures and Solscan explorer links
 *       
 *       **Prerequisites:**
 *       1. Must have called `/api/swap` first to get a quote and temporary wallet
 *       2. Must send the exact amount of SOL to the temporary wallet address
 *       3. Must provide the complete quote response from the swap endpoint
 *       
 *       **SOL-Only Features:**
 *       - Automatic SOL detection and balance monitoring
 *       - Real-time confirmation of SOL receipt
 *       - Enhanced error handling for SOL-specific scenarios
 *       - Automatic cleanup of temporary wallets after completion
 *       
 *       **Timeout Behavior:**
 *       - Waits up to 5 minutes (300 seconds) for SOL receipt
 *       - Returns timeout error if SOL is not received within the timeframe
 *       - Provides detailed error information for troubleshooting
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConfirmRequest'
 *           examples:
 *             confirm_sol_swap:
 *               summary: Confirm SOL to USDC swap
 *               value:
 *                 tempWallet:
 *                   address: "4AZii4qQf4zfmgLFhUik3Kmcdqpbi9vVAeDjP9zWN54v"
 *                 destinationWallet: "YourWalletAddressHere"
 *                 quoteResponse:
 *                   inputMint: "So11111111111111111111111111111111111111112"
 *                   outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
 *                   inAmount: "1000000"
 *                   outAmount: "137850"
 *                   priceImpactPct: 0
 *                 confirmed: true
 *             cancel_swap:
 *               summary: Cancel the swap
 *               value:
 *                 tempWallet:
 *                   address: "4AZii4qQf4zfmgLFhUik3Kmcdqpbi9vVAeDjP9zWN54v"
 *                 destinationWallet: "YourWalletAddressHere"
 *                 quoteResponse:
 *                   inputMint: "So11111111111111111111111111111111111111112"
 *                   outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
 *                   inAmount: "1000000"
 *                   outAmount: "137850"
 *                   priceImpactPct: 0
 *                   confirmed: false
 *     responses:
 *       200:
 *         description: Swap executed successfully or cancelled
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ConfirmResponse'
 *                 - type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: false
 *                     status:
 *                       type: string
 *                       example: "cancelled"
 *                     message:
 *                       type: string
 *                       example: "Swap was cancelled by user"
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       408:
 *         description: SOL receipt timeout
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TimeoutErrorResponse'
 *       500:
 *         description: Swap execution failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServerErrorResponse'
 */
router.post('/', async (req, res, next) => {
  try {
    console.log('Confirmation request received:', {
      ...req.body,
      quoteResponse: req.body.quoteResponse ? '(quote data present)' : 'missing'
    });
    
    // Validate input
    const validationErrors = validateConfirmRequest(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Validation failed', 
        details: validationErrors 
      });
    }
    
    const { tempWallet, destinationWallet, quoteResponse, confirmed, mevProtectionOptions } = req.body;
    
    // Support both old and new format
    const tempWalletAddress = tempWallet?.address || req.body.tempWalletAddress;
    
    // Check if user wants to cancel
    if (confirmed === false) {
      return res.json({ 
        success: false,
        status: 'cancelled',
        message: 'Swap was cancelled by user'
      });
    }
    
    // Extract swap details from quote response
    const inputMint = quoteResponse.inputMint;
    const outputMint = quoteResponse.outputMint;
    const inputAmount = quoteResponse.inAmount;
    
    console.log(`Starting confirmation process for ${inputAmount} tokens from ${inputMint} to ${outputMint}`);
    console.log(`Temporary wallet: ${tempWalletAddress}`);
    console.log(`Destination wallet: ${destinationWallet}`);
    
    // Step 1: Wait for tokens to be received in the temporary wallet
    console.log('⏳ Waiting for tokens to be received in temporary wallet...');
    
    try {
      const tokenCheck = await waitForTokens(tempWalletAddress, inputMint, inputAmount, 300000); // 5 minutes timeout
      console.log('✅ Tokens received successfully:', tokenCheck);
    } catch (error) {
      console.error('❌ Token receipt timeout or error:', error);
      return res.status(408).json({
        success: false,
        status: 'timeout',
        error: 'Token receipt timeout',
        message: `Tokens were not received in the temporary wallet within the timeout period. Please ensure you sent exactly ${inputAmount} tokens to ${tempWalletAddress}`,
        details: {
          tempWalletAddress,
          expectedAmount: inputAmount,
          tokenMint: inputMint,
          timeoutSeconds: 300
        }
      });
    }
    
    // Step 2: Execute the swap and transfer
    console.log('🔄 Executing swap and transfer...');
    
    const result = await executeSwapAndTransfer({
      tempWalletAddress,
      destinationWallet,
      quoteResponse,
      mevProtectionOptions
    });
    
    const response = {
      success: true,
      status: 'completed',
      // Transaction IDs directly on response object for test compatibility
      swapTransaction: result.swapTransaction,
      transferTransaction: result.transferTransaction,
      // Detailed data object for API consumers
      data: {
        swapTransaction: result.swapTransaction,
        transferTransaction: result.transferTransaction,
        tempWalletAddress,
        destinationWallet,
        message: result.message,
        swapDetails: {
          inputMint,
          outputMint,
          inputAmount,
          outputAmount: quoteResponse.outAmount
        },
        explorerLinks: {
          swap: `https://solscan.io/tx/${result.swapTransaction}`,
          transfer: result.transferTransaction ? `https://solscan.io/tx/${result.transferTransaction}` : null
        },
        completedAt: new Date().toISOString()
      },
      // Include MEV protection results if available
      mevProtection: result.mevProtection || {
        enabled: mevProtectionOptions?.enableMevProtection || false,
        jitoUsed: false,
        attempts: 1
      }
    };
    
    console.log('✅ Swap and transfer completed successfully');
    res.json(response);
    
  } catch (error) {
    console.error('❌ Error in confirm route:', error);
    
    // Return detailed error information
    res.status(500).json({
      success: false,
      status: 'failed',
      error: 'Swap execution failed',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
});

export default router; 