// Relayer API service for handling swap operations
export interface SwapRequest {
  fromToken: string;
  toToken: string;
  amount: string; // Amount in smallest units (lamports for SOL)
  destinationWallet: string;
  slippageBps?: number;
}

export interface SwapResponse {
  success: boolean;
  data: {
    // Temporary wallet details
    tempWallet: {
      address: string;
      createdAt: string;
    };
    
    // Swap details
    swap: {
      fromToken: string;
      toToken: string;
      inputAmount: number;
      expectedOutputAmount: number;
      slippageBps: number;
      priceImpactPct: number;
      route: any[];
    };
    
    // Destination
    destinationWallet: string;
    
    // Quote response (needed for confirmation)
    quoteResponse: any;
    
    // Instructions for user
    instructions: string[];
    
    // Warnings from validation
    warnings?: string[];
  };
}

export interface ConfirmRequest {
  tempWalletAddress: string;
  confirmation: boolean;
  destinationWallet: string;
  quoteResponse: any;
}

export interface ConfirmResponse {
  success: boolean;
  status: 'completed' | 'cancelled' | 'failed';
  data?: {
    swapTransaction: string;
    transferTransaction: string;
    tempWalletAddress: string;
    destinationWallet: string;
    message: string;
    explorerLinks: {
      swap: string;
      transfer: string | null;
    };
  };
  message?: string;
  error?: string;
}

export interface RelayerError {
  success: false;
  error: string;
  message?: string;
  details?: string[];
  suggestions?: string[];
}

export class RelayerService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_RELAYER_URL || 'http://localhost:3000';
  }

  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: any
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle API errors
        throw new Error(data.message || data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        // Check for network errors
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          throw new Error('Unable to connect to relayer service. Please ensure the relayer is running.');
        }
        throw error;
      }
      throw new Error('Unknown error occurred while calling relayer API');
    }
  }

  /**
   * Get a swap quote from the relayer
   */
  async getSwapQuote(request: SwapRequest): Promise<SwapResponse> {
    console.log('Getting swap quote:', request);
    
    const response = await this.makeRequest<SwapResponse | RelayerError>(
      '/api/swap',
      'POST',
      request
    );

    if (!response.success) {
      const error = response as RelayerError;
      const errorMessage = error.message || error.error || 'Failed to get swap quote';
      const fullError = error.suggestions 
        ? `${errorMessage}\n\nSuggestions:\n${error.suggestions.map(s => `• ${s}`).join('\n')}`
        : errorMessage;
      throw new Error(fullError);
    }

    return response as SwapResponse;
  }

  /**
   * Confirm and execute the swap
   */
  async confirmSwap(request: ConfirmRequest): Promise<ConfirmResponse> {
    console.log('Confirming swap:', {request});
    
    const response = await this.makeRequest<ConfirmResponse>(
      '/api/confirm',
      'POST',
      request
    );

    return response;
  }

  /**
   * Check relayer health status
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.makeRequest<{ status: string; timestamp: string }>('/health');
  }

  /**
   * Convert token amount to smallest units (lamports for SOL, micro units for USDC/USDT)
   */
  convertToSmallestUnits(amount: string, decimals: number): string {
    const amountFloat = parseFloat(amount);
    if (isNaN(amountFloat) || amountFloat <= 0) {
      throw new Error('Invalid amount');
    }
    
    // Convert to smallest units
    const smallestUnits = Math.floor(amountFloat * Math.pow(10, decimals));
    return smallestUnits.toString();
  }

  /**
   * Convert from smallest units to readable amount
   */
  convertFromSmallestUnits(amount: string | number, decimals: number): string {
    const amountNum = typeof amount === 'string' ? parseInt(amount) : amount;
    const readable = amountNum / Math.pow(10, decimals);
    return readable.toString();
  }

  /**
   * Format amount for display
   */
  formatAmount(amount: string | number, decimals: number, displayDecimals: number = 6): string {
    const readable = this.convertFromSmallestUnits(amount, decimals);
    const num = parseFloat(readable);
    
    if (num === 0) return '0';
    if (num < 0.000001) return num.toExponential(2);
    
    return num.toFixed(displayDecimals).replace(/\.?0+$/, '');
  }

  /**
   * Get token info for common Solana tokens
   */
  getTokenInfo(address: string): { symbol: string; decimals: number } {
    const tokenMap: Record<string, { symbol: string; decimals: number }> = {
      'So11111111111111111111111111111111111111112': { symbol: 'SOL', decimals: 9 },
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { symbol: 'USDC', decimals: 6 },
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': { symbol: 'USDT', decimals: 6 },
    };

    return tokenMap[address] || { symbol: 'TOKEN', decimals: 6 };
  }
}

export const relayerService = new RelayerService(); 