const { executeSwapAndTransfer } = require('../../src/services/jupiterService');
const { validateConfirmRequest } = require('../../src/routes/confirm');

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body);
    
    // Validate request
    const validation = validateConfirmRequest(body);
    if (!validation.valid) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Invalid request',
          details: validation.errors
        }),
      };
    }

    // Execute swap and transfer
    const result = await executeSwapAndTransfer({
      tempWalletAddress: body.tempWalletAddress,
      destinationWallet: body.destinationWallet,
      quoteResponse: body.quoteResponse
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Confirm function error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error.message
      }),
    };
  }
}; 