// Netlify serverless function for API documentation
const { corsHeaders } = require('./utils/serverless-utils');

const swaggerHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Miko Relayer API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@3.25.0/swagger-ui.css" />
    <style>
        .swagger-ui .topbar { display: none; }
        .swagger-ui .info .title { color: #3b82f6; }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@3.25.0/swagger-ui-bundle.js"></script>
    <script>
        const spec = {
            "openapi": "3.0.0",
            "info": {
                "title": "Miko Relayer API (Netlify Serverless)",
                "version": "1.0.0",
                "description": "SOL-only token swap relayer running on Netlify serverless functions"
            },
            "servers": [
                {
                    "url": "/.netlify/functions",
                    "description": "Netlify serverless functions"
                }
            ],
            "paths": {
                "/health": {
                    "get": {
                        "summary": "Health check",
                        "tags": ["Health"],
                        "responses": {
                            "200": {
                                "description": "Server is healthy",
                                "content": {
                                    "application/json": {
                                        "schema": {
                                            "type": "object",
                                            "properties": {
                                                "status": { "type": "string", "example": "ok" },
                                                "timestamp": { "type": "string", "format": "date-time" }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                "/swap": {
                    "post": {
                        "summary": "Get SOL swap quotation",
                        "tags": ["Swap"],
                        "description": "Generate a quote for SOL to any token swap",
                        "requestBody": {
                            "required": true,
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "required": ["fromToken", "toToken", "amount", "destinationWallet"],
                                        "properties": {
                                            "fromToken": {
                                                "type": "string",
                                                "enum": ["So11111111111111111111111111111111111111112"],
                                                "description": "Must be SOL"
                                            },
                                            "toToken": {
                                                "type": "string",
                                                "description": "Destination token mint"
                                            },
                                            "amount": {
                                                "type": "string",
                                                "description": "Amount in lamports"
                                            },
                                            "destinationWallet": {
                                                "type": "string",
                                                "description": "Destination wallet address"
                                            },
                                            "slippageBps": {
                                                "type": "integer",
                                                "description": "Slippage in basis points",
                                                "default": 50
                                            }
                                        }
                                    },
                                    "example": {
                                        "fromToken": "So11111111111111111111111111111111111111112",
                                        "toToken": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                                        "amount": "1000000",
                                        "destinationWallet": "YourWalletAddressHere",
                                        "slippageBps": 50
                                    }
                                }
                            }
                        },
                        "responses": {
                            "200": {
                                "description": "Swap quote generated successfully"
                            },
                            "400": {
                                "description": "Validation error"
                            }
                        }
                    }
                },
                "/confirm": {
                    "post": {
                        "summary": "Execute SOL swap",
                        "tags": ["Swap"],
                        "description": "Confirm and execute the SOL swap",
                        "requestBody": {
                            "required": true,
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "required": ["tempWallet", "destinationWallet", "quoteResponse"],
                                        "properties": {
                                            "tempWallet": {
                                                "type": "object",
                                                "properties": {
                                                    "address": { "type": "string" },
                                                    "token": { "type": "string" }
                                                }
                                            },
                                            "destinationWallet": { "type": "string" },
                                            "quoteResponse": { "type": "object" },
                                            "confirmed": { "type": "boolean" }
                                        }
                                    }
                                }
                            }
                        },
                        "responses": {
                            "200": {
                                "description": "Swap executed successfully"
                            },
                            "408": {
                                "description": "Tokens not received"
                            }
                        }
                    }
                }
            }
        };

        SwaggerUIBundle({
            url: '',
            spec: spec,
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIBundle.presets.standalone
            ]
        });
    </script>
</body>
</html>
`;

exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html',
      'Access-Control-Allow-Origin': '*'
    },
    body: swaggerHTML
  };
}; 