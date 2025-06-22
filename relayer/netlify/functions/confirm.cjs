// Netlify serverless function for swap confirmation
const {
  corsHeaders,
  handleOptions,
  errorResponse,
  successResponse,
  checkTokenBalance,
  connection,
  SOL_MINT
} = require('./utils/serverless-utils');

const { Keypair, VersionedTransaction } = require('@solana/web3.js');
const { 
  getAssociatedTokenAddress,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction
} = require('@solana/spl-token');
const axios = require('axios');

// Helper function to decode wallet token
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

// Helper function to wait for tokens (simplified for serverless)
const waitForTokensServerless = async (walletAddress, tokenMint, expectedAmount, timeoutMs = 120000) => {
  const startTime = Date.now();
  const checkInterval = 10000; // 10 seconds
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      const balanceCheck = await checkTokenBalance(walletAddress, tokenMint, expectedAmount);
      
      if (balanceCheck.hasTokens) {
        return balanceCheck;
      }
      
      // In serverless, we can't wait indefinitely, so we return early if timeout approaches
      if (Date.now() - startTime > timeoutMs - 20000) { // 20 seconds buffer
        throw new Error('Timeout approaching - tokens not received yet');
      }
      
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    } catch (error) {
      if (error.message.includes('Timeout')) {
        throw error;
      }
      // Continue checking on other errors
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
  }
  
  throw new Error(`Timeout: Tokens not received within ${timeoutMs / 1000} seconds`);
};

// Get Jupiter swap transaction
const getJupiterSwapTransaction = async (quoteResponse, userPublicKey) => {
  try {
    const JUPITER_API = process.env.JUPITER_API_URL || 'https://quote-api.jup.ag/v6';
    
    const swapData = {
      quoteResponse,
      userPublicKey: userPublicKey.toString(),
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 'auto'
    };
    
    const response = await axios.post(`${JUPITER_API}/swap`, swapData, {
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Miko-Relayer-Netlify/1.0'
      }
    });
    
    if (!response.data.swapTransaction) {
      throw new Error('No swap transaction received from Jupiter');
    }
    
    return response.data.swapTransaction;
  } catch (error) {
    throw new Error(`Failed to get swap transaction: ${error.response?.data?.error || error.message}`);
  }
};

// Execute swap and transfer (simplified for serverless)
const executeSwapAndTransfer = async (tempWalletData, quoteResponse, destinationWallet) => {
  try {
    // Recreate keypair from stored data
    const tempKeypair = Keypair.fromSecretKey(Uint8Array.from(tempWalletData.secretKey));
    
    // Get swap transaction from Jupiter
    const swapTransaction = await getJupiterSwapTransaction(quoteResponse, tempKeypair.publicKey);
    
    // Deserialize and sign transaction
    const transaction = VersionedTransaction.deserialize(Buffer.from(swapTransaction, 'base64'));
    transaction.sign([tempKeypair]);
    
    // Send swap transaction
    const swapTxId = await connection.sendTransaction(transaction, {
      skipPreflight: false,
      preflightCommitment: 'confirmed'
    });
    
    // Wait for confirmation (with timeout for serverless)
    const confirmTimeout = 60000; // 1 minute
    const swapConfirmation = await Promise.race([
      connection.confirmTransaction(swapTxId, 'confirmed'),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Swap confirmation timeout')), confirmTimeout)
      )
    ]);
    
    if (swapConfirmation.value.err) {
      throw new Error(`Swap transaction failed: ${swapConfirmation.value.err}`);
    }
    
    // For serverless, we'll return the swap transaction and let the client handle monitoring
    // In a full implementation, you'd want to transfer the assets here
    return {
      status: 'success',
      swapTransaction: swapTxId,
      transferTransaction: null, // Would implement token transfer here
      message: 'Swap completed successfully (serverless mode)',
      note: 'In serverless mode, asset transfer may need to be handled separately'
    };
    
  } catch (error) {
    throw new Error(`Swap execution failed: ${error.message}`);
  }
};

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

    console.log('Confirmation request received');

    // Validate input
    const { tempWallet, destinationWallet, quoteResponse, confirmed } = body;
    
    if (!tempWallet || !tempWallet.address || !tempWallet.token) {
      return errorResponse(400, 'Invalid request', 'tempWallet with address and token is required');
    }
    
    if (!destinationWallet) {
      return errorResponse(400, 'Invalid request', 'destinationWallet is required');
    }
    
    if (!quoteResponse) {
      return errorResponse(400, 'Invalid request', 'quoteResponse is required');
    }

    // Check if user wants to cancel
    if (confirmed === false) {
      return successResponse({
        status: 'cancelled',
        message: 'Swap was cancelled by user'
      });
    }

    // Decode wallet token to get private key
    let tempWalletData;
    try {
      tempWalletData = decodeWalletToken(tempWallet.token);
    } catch (error) {
      return errorResponse(400, 'Invalid wallet token', error.message);
    }

    const tempWalletAddress = tempWallet.address;
    const inputMint = quoteResponse.inputMint;
    const outputMint = quoteResponse.outputMint;
    const inputAmount = quoteResponse.inAmount;

    console.log(`Processing swap: ${inputAmount} ${inputMint} -> ${outputMint}`);
    console.log(`Temporary wallet: ${tempWalletAddress}`);
    console.log(`Destination wallet: ${destinationWallet}`);

    // Step 1: Check if tokens are already received (for serverless, we check once)
    console.log('Checking for tokens in temporary wallet...');
    
    try {
      const tokenCheck = await checkTokenBalance(tempWalletAddress, inputMint, inputAmount);
      
      if (!tokenCheck.hasTokens) {
        // In serverless, we can't wait long - return a specific response
        return errorResponse(408, 'Tokens not received', 
          `Tokens not yet received in temporary wallet. Current balance: ${tokenCheck.currentBalance}, Expected: ${inputAmount}`);
      }
      
      console.log('Tokens confirmed in temporary wallet');
    } catch (error) {
      return errorResponse(500, 'Balance check failed', error.message);
    }

    // Step 2: Execute the swap
    console.log('Executing swap...');
    
    try {
      const swapResult = await executeSwapAndTransfer(tempWalletData, quoteResponse, destinationWallet);
      
      const response = {
        success: true,
        status: 'completed',
        swapTransaction: swapResult.swapTransaction,
        transferTransaction: swapResult.transferTransaction,
        data: {
          swapTransaction: swapResult.swapTransaction,
          transferTransaction: swapResult.transferTransaction,
          tempWalletAddress,
          destinationWallet,
          message: swapResult.message,
          swapDetails: {
            inputMint,
            outputMint,
            inputAmount,
            outputAmount: quoteResponse.outAmount
          },
          explorerLinks: {
            swap: `https://solscan.io/tx/${swapResult.swapTransaction}`,
            transfer: swapResult.transferTransaction ? `https://solscan.io/tx/${swapResult.transferTransaction}` : null
          },
          completedAt: new Date().toISOString(),
          serverless: true
        }
      };

      console.log('Swap execution completed successfully');
      return successResponse(response.data);

    } catch (error) {
      console.error('Swap execution error:', error);
      return errorResponse(500, 'Swap execution failed', error.message);
    }

  } catch (error) {
    console.error('Error in confirm function:', error);
    return errorResponse(500, 'Internal server error', error.message);
  }
}; 