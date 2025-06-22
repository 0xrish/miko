import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Enhanced Miko Relayer API (SOL-Only)',
      version: '2.0.0',
      description: `
# Enhanced Miko Relayer - SOL-Only Input System

A specialized Solana token swap relayer that **only accepts SOL as input** and can swap to any supported token on Jupiter.

## 🔒 Key Constraints
- **Input Token**: Must always be SOL (So11111111111111111111111111111111111111112)
- **Output Token**: Can be any Jupiter-supported token
- **Amount Format**: Always in lamports (1 SOL = 1,000,000,000 lamports)

## 💡 Amount Guidelines
- **Technical Minimum**: 1 lamport (Jupiter accepts any amount!)
- **Warning Threshold**: 100,000 lamports (0.0001 SOL) - triggers UX warnings
- **Recommended**: 1,000,000+ lamports (0.001+ SOL) - optimal user experience
- **Best Rates**: 10,000,000+ lamports (0.01+ SOL) - minimal price impact

## 🚀 Enhanced Features
- **SOL-Only Validation**: Automatic rejection of non-SOL input tokens
- **Smart Warning System**: Guides users to better amounts for optimal UX
- **Price Impact Analysis**: Real-time calculation and warnings
- **Temporary Wallet Security**: Each swap uses a unique temporary wallet
- **Jupiter Integration**: Best rates from Jupiter's aggregated DEX network

## 📋 Typical Workflow
1. **POST /api/swap** - Get quote and temporary wallet (SOL input only)
2. **Send SOL** - Transfer exact amount to the temporary wallet
3. **POST /api/confirm** - Execute swap and receive tokens at destination

## ⚠️ Important Notes
- All swaps must start with SOL as input
- Non-SOL input tokens will be rejected with validation errors
- SOL-to-SOL swaps are prevented
- Quotes expire after 30 minutes
- System waits up to 5 minutes for SOL receipt
      `,
      contact: {
        name: 'Enhanced Miko Relayer Support',
        email: 'support@mikorelayer.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    tags: [
      {
        name: 'Health',
        description: 'Server health monitoring'
      },
      {
        name: 'Swap',
        description: 'SOL-only token swap operations with Jupiter integration'
      }
    ],
    components: {
      schemas: {
        // Request Schemas
        SwapRequest: {
          type: 'object',
          required: ['fromToken', 'toToken', 'amount', 'destinationWallet'],
          properties: {
            fromToken: {
              type: 'string',
              description: 'Must always be SOL mint address (enforced)',
              example: 'So11111111111111111111111111111111111111112',
              enum: ['So11111111111111111111111111111111111111112']
            },
            toToken: {
              type: 'string',
              description: 'Destination token mint address (any Jupiter-supported token)',
              example: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
            },
            amount: {
              type: 'string',
              description: 'Amount in lamports (1 SOL = 1,000,000,000 lamports). Minimum: 1 lamport. Recommended: 1,000,000+ lamports',
              example: '1000000',
              pattern: '^[1-9][0-9]*$'
            },
            destinationWallet: {
              type: 'string',
              description: 'Solana wallet address to receive swapped tokens',
              example: 'YourWalletAddressHere',
              pattern: '^[1-9A-HJ-NP-Za-km-z]{32,44}$'
            },
            slippageBps: {
              type: 'integer',
              description: 'Slippage tolerance in basis points (optional, default: 50 = 0.5%)',
              minimum: 0,
              maximum: 10000,
              example: 50
            }
          }
        },
        ConfirmRequest: {
          type: 'object',
          required: ['tempWallet', 'destinationWallet', 'quoteResponse'],
          properties: {
            tempWallet: {
              type: 'object',
              required: ['address'],
              properties: {
                address: {
                  type: 'string',
                  description: 'Temporary wallet address from swap response',
                  example: '4AZii4qQf4zfmgLFhUik3Kmcdqpbi9vVAeDjP9zWN54v'
                }
              }
            },
            destinationWallet: {
              type: 'string',
              description: 'Destination wallet address (same as in swap request)',
              example: 'YourWalletAddressHere'
            },
            quoteResponse: {
              type: 'object',
              description: 'Complete Jupiter quote response from /api/swap',
              properties: {
                inputMint: { type: 'string', example: 'So11111111111111111111111111111111111111112' },
                outputMint: { type: 'string', example: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
                inAmount: { type: 'string', example: '1000000' },
                outAmount: { type: 'string', example: '137850' },
                priceImpactPct: { type: 'number', example: 0 }
              }
            },
            confirmed: {
              type: 'boolean',
              description: 'Set to true to execute swap, false to cancel (optional)',
              example: true
            }
          }
        },
        
        // Response Schemas
        SwapResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              properties: {
                tempWallet: {
                  type: 'object',
                  properties: {
                    address: {
                      type: 'string',
                      description: 'Temporary wallet address for this swap',
                      example: '9gGxEsaYLyCpfKSEj51VirAJ88rgXyJpSMnb1vnUc9fy'
                    },
                    createdAt: {
                      type: 'string',
                      format: 'date-time',
                      example: '2025-06-22T07:36:33.956Z'
                    }
                  }
                },
                swap: {
                  type: 'object',
                  properties: {
                    fromToken: {
                      type: 'string',
                      example: 'So11111111111111111111111111111111111111112'
                    },
                    toToken: {
                      type: 'string',
                      example: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
                    },
                    inputAmount: {
                      type: 'string',
                      example: '100000'
                    },
                    expectedOutputAmount: {
                      type: 'string',
                      example: '13539'
                    },
                    slippageBps: {
                      type: 'integer',
                      example: 50
                    },
                    priceImpactPct: {
                      type: 'number',
                      example: 0
                    },
                    route: {
                      type: 'array',
                      description: 'Jupiter routing information',
                      items: {
                        type: 'object',
                        properties: {
                          swapInfo: {
                            type: 'object',
                            properties: {
                              ammKey: { type: 'string', example: 'BPmGkx4Hg5fSM8ouqpfK1Uo4Pf6rzcJYiDDuqG67qC53' },
                              label: { type: 'string', example: 'Pump.fun Amm' },
                              inputMint: { type: 'string', example: 'So11111111111111111111111111111111111111112' },
                              outputMint: { type: 'string', example: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
                              inAmount: { type: 'string', example: '100000' },
                              outAmount: { type: 'string', example: '13539' },
                              feeAmount: { type: 'string', example: '250' },
                              feeMint: { type: 'string', example: 'So11111111111111111111111111111111111111112' }
                            }
                          },
                          percent: { type: 'integer', example: 100 }
                        }
                      }
                    }
                  }
                },
                destinationWallet: {
                  type: 'string',
                  example: 'EQ1iJf9TGTGs163zcsoKq1JgrXdDK2KGAdoYtB1adoev'
                },
                quoteResponse: {
                  type: 'object',
                  description: 'Complete Jupiter quote response (pass this to /api/confirm)',
                  properties: {
                    inputMint: { type: 'string', example: 'So11111111111111111111111111111111111111112' },
                    inAmount: { type: 'string', example: '100000' },
                    outputMint: { type: 'string', example: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
                    outAmount: { type: 'string', example: '13539' },
                    otherAmountThreshold: { type: 'string', example: '13472' },
                    swapMode: { type: 'string', example: 'ExactIn' },
                    slippageBps: { type: 'integer', example: 50 },
                    platformFee: { type: 'string', nullable: true, example: null },
                    priceImpactPct: { type: 'string', example: '0' },
                    routePlan: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          swapInfo: {
                            type: 'object',
                            properties: {
                              ammKey: { type: 'string' },
                              label: { type: 'string' },
                              inputMint: { type: 'string' },
                              outputMint: { type: 'string' },
                              inAmount: { type: 'string' },
                              outAmount: { type: 'string' },
                              feeAmount: { type: 'string' },
                              feeMint: { type: 'string' }
                            }
                          },
                          percent: { type: 'integer' }
                        }
                      }
                    },
                    contextSlot: { type: 'integer', example: 348417965 },
                    timeTaken: { type: 'number', example: 0.00124777 },
                    swapUsdValue: { type: 'string', example: '0.0135224454542075163404216685' },
                    simplerRouteUsed: { type: 'boolean', example: false },
                    mostReliableAmmsQuoteReport: {
                      type: 'object',
                      properties: {
                        info: {
                          type: 'object',
                          additionalProperties: { type: 'string' }
                        }
                      }
                    },
                    useIncurredSlippageForQuoting: { type: 'string', nullable: true },
                    otherRoutePlans: { type: 'array', nullable: true },
                    validated: { type: 'boolean', example: true },
                    warnings: { 
                      type: 'array', 
                      items: { type: 'string' },
                      example: []
                    },
                    calculatedAt: { 
                      type: 'string', 
                      format: 'date-time',
                      example: '2025-06-22T07:36:33.956Z'
                    }
                  }
                },
                instructions: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Step-by-step instructions for the user',
                  example: [
                    '📋 STEP 1: Send exactly 100000 lamports (0.000100000 SOL) to the temporary wallet: 9gGxEsaYLyCpfKSEj51VirAJ88rgXyJpSMnb1vnUc9fy',
                    '💱 STEP 2: Expected swap output: 13539 tokens of the destination token',
                    '📊 Price impact: 0.00%',
                    '🎯 Final destination: EQ1iJf9TGTGs163zcsoKq1JgrXdDK2KGAdoYtB1adoev',
                    '⏱️ STEP 3: Call /api/confirm with this response to execute the swap',
                    '⚠️ Important: The system will wait for SOL receipt before executing the swap'
                  ]
                },
                warnings: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Warnings about amount size or price impact (if any)',
                  example: ['💡 Small amount. For optimal rates and reliability, consider using 0.001 SOL or more.']
                },
                expiresAt: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Quote expiration time (30 minutes from generation)'
                }
              }
            }
          }
        },
        ConfirmResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            status: {
              type: 'string',
              enum: ['completed', 'cancelled', 'failed'],
              example: 'completed'
            },
            data: {
              type: 'object',
              properties: {
                swapTransaction: {
                  type: 'string',
                  description: 'Jupiter swap transaction signature',
                  example: '5J7XqWKGHYHKHqXqWKGHYHKHqXqWKGHYHKHqXqWKGHYHKHqXqWKGHY'
                },
                transferTransaction: {
                  type: 'string',
                  description: 'Token transfer transaction signature',
                  example: '3K5YpLKJHGHYHKHqXqWKGHYHKHqXqWKGHYHKHqXqWKGHYHKHqXqWKGH'
                },
                tempWalletAddress: {
                  type: 'string',
                  example: '4AZii4qQf4zfmgLFhUik3Kmcdqpbi9vVAeDjP9zWN54v'
                },
                destinationWallet: {
                  type: 'string',
                  example: 'YourWalletAddressHere'
                },
                message: {
                  type: 'string',
                  example: 'Swap and transfer completed successfully'
                },
                swapDetails: {
                  type: 'object',
                  properties: {
                    inputMint: { type: 'string' },
                    outputMint: { type: 'string' },
                    inputAmount: { type: 'string' },
                    outputAmount: { type: 'string' }
                  }
                },
                explorerLinks: {
                  type: 'object',
                  properties: {
                    swap: {
                      type: 'string',
                      format: 'uri',
                      example: 'https://solscan.io/tx/5J7XqWKGHYHKHqXqWKGHYHKHqXqWKGHYHKHqXqWKGHYHKHqXqWKGHY'
                    },
                    transfer: {
                      type: 'string',
                      format: 'uri',
                      example: 'https://solscan.io/tx/3K5YpLKJHGHYHKHqXqWKGHYHKHqXqWKGHYHKHqXqWKGHYHKHqXqWKGH'
                    }
                  }
                },
                completedAt: {
                  type: 'string',
                  format: 'date-time',
                  example: '2025-06-21T19:20:15.123Z'
                }
              }
            }
          }
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'ok'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2025-06-21T19:15:21.309Z'
            }
          }
        },
        
        // Error Response Schemas
        ValidationErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              example: 'Validation failed'
            },
            details: {
              type: 'array',
              items: { type: 'string' },
              example: ['fromToken must be SOL (So11111111111111111111111111111111111111112). This relayer only accepts SOL as input token.']
            }
          }
        },
        TimeoutErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            status: {
              type: 'string',
              example: 'timeout'
            },
            error: {
              type: 'string',
              example: 'Token receipt timeout'
            },
            message: {
              type: 'string',
              example: 'Tokens were not received in the temporary wallet within the timeout period.'
            },
            details: {
              type: 'object',
              properties: {
                tempWalletAddress: { type: 'string' },
                expectedAmount: { type: 'string' },
                tokenMint: { type: 'string' },
                timeoutSeconds: { type: 'integer', example: 300 }
              }
            }
          }
        },
        ServerErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            status: {
              type: 'string',
              example: 'failed'
            },
            error: {
              type: 'string',
              example: 'Swap execution failed'
            },
            message: {
              type: 'string',
              example: 'Internal server error occurred during swap execution'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2025-06-21T19:20:15.123Z'
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js', './src/app.js']
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec; 