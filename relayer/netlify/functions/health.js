exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Basic health check
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'miko-relayer',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'production'
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(healthStatus),
    };
  } catch (error) {
    console.error('Health check error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      }),
    };
  }
}; 