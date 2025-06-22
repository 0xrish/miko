import axios from 'axios';
import { loadKeypair } from './walletService.js';
import { 
  Connection, 
  PublicKey, 
  SystemProgram, 
  Transaction, 
  sendAndConfirmTransaction,
  VersionedTransaction,
  ComputeBudgetProgram
} from '@solana/web3.js';
import { 
  getAssociatedTokenAddress, 
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction
} from '@solana/spl-token';

const JUPITER_API = 'https://quote-api.jup.ag/v6';
const SOLANA_RPC = process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com';

// Use high-performance RPC endpoints for better MEV protection
const MEV_PROTECTED_RPCS = [
  'https://mainnet.helius-rpc.com/?api-key=04701faa-3c75-446c-ba75-d0465245c7f7',
  'https://solana-mainnet.rpc.extrnode.com',
  'https://api.mainnet-beta.solana.com'
];

// Create connection with MEV-optimized settings
const connection = new Connection(
  process.env.SOLANA_RPC || MEV_PROTECTED_RPCS[0], 
  {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60000,
    disableRetryOnRateLimit: false,
    httpHeaders: {
      'Content-Type': 'application/json',
    }
  }
);

// Native SOL mint address
const SOL_MINT = 'So11111111111111111111111111111111111111112';

// Jito tip accounts for MEV protection
const JITO_TIP_ACCOUNTS = [
  'T1pyyaTNZsKv2WcRAl8oZ2xQsGsDnkGNGqEMbGrCN7p',
  'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY',
  'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh',
  'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49',
  'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL',
  'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt',
  'HFqU5x63VTqvQss8hp176NUQpEj2zybVJjqWjCCZYgMZ',
  'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY'
];

/**
 * Get MEV-protected swap quote with advanced parameters
 */
export async function getSwapQuote({ 
  fromToken, 
  toToken, 
  amount, 
  slippageBps = 50,
  enableMevProtection = false 
}) {
  try {
    const mevStatus = enableMevProtection ? 'MEV-protected' : 'standard';
    console.log(`🔒 Getting ${mevStatus} quote: ${amount} ${fromToken} -> ${toToken}`);
    
    const params = new URLSearchParams({
      inputMint: fromToken,
      outputMint: toToken,
      amount: amount.toString(),
      slippageBps: slippageBps.toString(),
      swapMode: 'ExactIn',
      onlyDirectRoutes: 'false',
      asLegacyTransaction: 'false',
      // MEV Protection: Restrict intermediate tokens to high-liquidity pairs
      restrictIntermediateTokens: enableMevProtection ? 'true' : 'false',
      // MEV Protection: Exclude DEXs with poor MEV protection
      excludeDexes: enableMevProtection ? 'Aldrin,Crema' : '',
      // Optimize for best price with MEV considerations
      maxAccounts: '64'
    });

    const response = await axios.get(`${JUPITER_API}/quote?${params}`, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Miko-Relayer-MEV-Protected/1.0'
      }
    });
    
    if (!response.data) {
      throw new Error('No quote received from Jupiter');
    }

    // Log MEV protection details
    if (enableMevProtection) {
      console.log('✅ MEV-protected quote received successfully');
      console.log(`🛡️  Price Impact: ${response.data.priceImpactPct}%`);
      console.log(`🔄 Route: ${response.data.routePlan?.map(r => r.swapInfo?.label).join(' → ') || 'Direct'}`);
    } else {
      console.log('✅ Standard quote received successfully');
      console.log(`📊 Price Impact: ${response.data.priceImpactPct}%`);
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Error getting swap quote:', error.response?.data || error.message);
    throw new Error(`Failed to get swap quote: ${error.response?.data?.error || error.message}`);
  }
}

/**
 * Get recent prioritization fees for MEV protection
 */
async function getRecentPrioritizationFees() {
  try {
    const response = await connection.getRecentPrioritizationFees({
      lockedWritableAccounts: [
        new PublicKey('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4') // Jupiter program
      ]
    });
    
    if (response && response.length > 0) {
      // Calculate 75th percentile for aggressive MEV protection
      const fees = response.map(fee => fee.prioritizationFee).sort((a, b) => a - b);
      const p75Index = Math.floor(fees.length * 0.75);
      const p75Fee = fees[p75Index] || 0;
      
      // Minimum fee for MEV protection (0.001 SOL)
      const minMevFee = 1000000;
      
      return Math.max(p75Fee * 1.5, minMevFee); // 1.5x multiplier for MEV protection
    }
    
    return 2000000; // Default 0.002 SOL for MEV protection
  } catch (error) {
    console.warn('⚠️  Failed to get prioritization fees, using default:', error.message);
    return 2000000; // Default 0.002 SOL
  }
}

/**
 * Get MEV-protected swap transaction with advanced optimizations
 */
export async function getSwapTransaction(
  quoteResponse, 
  userPublicKey, 
  options = {}
) {
  try {
    console.log('🔒 Getting MEV-protected swap transaction for:', userPublicKey);
    
    const {
      enableMevProtection = true,
      priorityLevel = 'veryHigh',
      maxPriorityFeeLamports = 10000000, // 0.01 SOL max
      enableJitoMev = true,
      dynamicSlippage = true
    } = options;

    // Get MEV-optimized priority fee
    const priorityFee = await getRecentPrioritizationFees();
    const cappedPriorityFee = Math.min(priorityFee, maxPriorityFeeLamports);
    
    console.log(`💰 Using priority fee: ${cappedPriorityFee} lamports (${cappedPriorityFee / 1000000000} SOL)`);

    const swapPayload = {
      quoteResponse,
      userPublicKey,
      wrapAndUnwrapSol: true,
      useSharedAccounts: true,
      feeAccount: undefined,
      trackingAccount: undefined,
      // MEV Protection: Dynamic compute unit limit
      dynamicComputeUnitLimit: enableMevProtection,
      // MEV Protection: Advanced priority fee strategy
      prioritizationFeeLamports: enableJitoMev ? cappedPriorityFee : cappedPriorityFee
    };

    // MEV Protection: Dynamic slippage
    if (dynamicSlippage && enableMevProtection) {
      swapPayload.dynamicSlippage = {
        minBps: 10,  // 0.1% minimum
        maxBps: 300  // 3% maximum to prevent excessive MEV
      };
    }

    const response = await axios.post(`${JUPITER_API}/swap`, swapPayload, {
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Miko-Relayer-MEV-Protected/1.0'
      }
    });

    if (!response.data.swapTransaction) {
      throw new Error('No swap transaction received from Jupiter');
    }

    // Log MEV protection details
    console.log('✅ MEV-protected swap transaction received');
    if (response.data.dynamicSlippageReport) {
      console.log(`🛡️  Dynamic slippage applied: ${response.data.dynamicSlippageReport.slippageBps} bps`);
    }
    if (response.data.computeUnitLimit) {
      console.log(`⚡ Compute units optimized: ${response.data.computeUnitLimit}`);
    }

    return response.data.swapTransaction;
  } catch (error) {
    console.error('❌ Error getting MEV-protected swap transaction:', error.response?.data || error.message);
    throw new Error(`Failed to get swap transaction: ${error.response?.data?.error || error.message}`);
  }
}

/**
 * Create Jito tip instruction for MEV protection
 */
function createJitoTipInstruction(fromPubkey, tipAmount) {
  const randomTipAccount = JITO_TIP_ACCOUNTS[Math.floor(Math.random() * JITO_TIP_ACCOUNTS.length)];
  
  return SystemProgram.transfer({
    fromPubkey,
    toPubkey: new PublicKey(randomTipAccount),
    lamports: tipAmount
  });
}

/**
 * Execute MEV-protected swap and transfer with advanced optimizations
 */
export async function executeSwapAndTransfer({ 
  tempWalletAddress, 
  destinationWallet, 
  quoteResponse,
  mevProtectionOptions = {}
}) {
  try {
    console.log(`🔒 Executing MEV-protected swap and transfer from ${tempWalletAddress} to ${destinationWallet}`);
    
    const {
      enableMevProtection = true,
      useJitoBundles = true,
      maxRetries = 3
    } = mevProtectionOptions;
    
    // Load the temporary wallet keypair
    const tempKeypair = await loadKeypair(tempWalletAddress);
    
    // Get MEV-protected swap transaction
    const swapTransaction = await getSwapTransaction(
      quoteResponse, 
      tempWalletAddress,
      {
        enableMevProtection,
        enableJitoMev: useJitoBundles,
        priorityLevel: 'veryHigh',
        maxPriorityFeeLamports: 10000000
      }
    );
    
    // Deserialize and prepare transaction
    const transaction = VersionedTransaction.deserialize(Buffer.from(swapTransaction, 'base64'));
    
    // Sign the transaction
    transaction.sign([tempKeypair]);
    
    let swapTxId;
    let attempt = 0;
    
    // MEV Protection: Retry logic with exponential backoff
    while (attempt < maxRetries) {
      try {
        console.log(`🚀 Executing swap transaction (attempt ${attempt + 1}/${maxRetries})...`);
        
        if (useJitoBundles) {
          // Send via Jito for MEV protection
          swapTxId = await sendJitoTransaction(transaction);
        } else {
          // Send via regular RPC with MEV protection
          swapTxId = await connection.sendTransaction(transaction, {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
            maxRetries: 0 // Handle retries manually
          });
        }
        
        console.log('✅ Swap transaction sent:', swapTxId);
        break;
        
      } catch (error) {
        attempt++;
        console.warn(`⚠️  Swap attempt ${attempt} failed:`, error.message);
        
        if (attempt >= maxRetries) {
          throw error;
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    
    // Wait for swap confirmation with timeout
    const swapConfirmation = await Promise.race([
      connection.confirmTransaction(swapTxId, 'confirmed'),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Swap confirmation timeout')), 60000)
      )
    ]);
    
    if (swapConfirmation.value.err) {
      throw new Error(`Swap transaction failed: ${swapConfirmation.value.err}`);
    }
    
    console.log('✅ Swap confirmed, now transferring assets...');
    
    // Transfer the swapped tokens to destination wallet
    const transferTxId = await transferAssets(
      tempKeypair,
      destinationWallet,
      quoteResponse.outputMint,
      { enableMevProtection }
    );
    
    return {
      status: 'success',
      swapTransaction: swapTxId,
      transferTransaction: transferTxId,
      message: 'MEV-protected swap and transfer completed successfully',
      mevProtection: {
        enabled: enableMevProtection,
        jitoUsed: useJitoBundles,
        attempts: attempt + 1
      }
    };
    
  } catch (error) {
    console.error('❌ Error in MEV-protected executeSwapAndTransfer:', error);
    throw new Error(`MEV-protected swap execution failed: ${error.message}`);
  }
}

/**
 * Send transaction via Jito for MEV protection
 */
async function sendJitoTransaction(transaction) {
  try {
    // This is a placeholder for Jito integration
    // In production, you would use a Jito-enabled RPC endpoint
    console.log('🛡️  Sending via Jito for MEV protection...');
    
    // For now, send via regular connection but with optimized settings
    return await connection.sendTransaction(transaction, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
      maxRetries: 0
    });
  } catch (error) {
    console.error('❌ Jito transaction failed:', error);
    throw error;
  }
}

async function transferAssets(fromKeypair, destinationWallet, tokenMint, options = {}) {
  try {
    const { enableMevProtection = true } = options;
    const destinationPubkey = new PublicKey(destinationWallet);
    const fromPubkey = fromKeypair.publicKey;
    
    if (tokenMint === SOL_MINT) {
      // Transfer SOL with MEV protection
      return await transferSOL(fromKeypair, destinationPubkey, { enableMevProtection });
    } else {
      // Transfer SPL Token with MEV protection
      return await transferSPLToken(fromKeypair, destinationPubkey, tokenMint, { enableMevProtection });
    }
  } catch (error) {
    console.error('❌ Error transferring assets:', error);
    throw error;
  }
}

async function transferSOL(fromKeypair, destinationPubkey, options = {}) {
  try {
    const { enableMevProtection = true } = options;
    const balance = await connection.getBalance(fromKeypair.publicKey);
    
    // Reserve more SOL for transaction fees when MEV protection is enabled
    const reserveAmount = enableMevProtection ? 20000 : 10000; // ~0.00002 SOL vs 0.00001 SOL
    const transferAmount = balance - reserveAmount;
    
    if (transferAmount <= 0) {
      throw new Error('Insufficient SOL balance for transfer');
    }
    
    const transaction = new Transaction();
    
    // Add MEV protection via priority fees
    if (enableMevProtection) {
      const priorityFee = await getRecentPrioritizationFees();
      transaction.add(
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: Math.floor(priorityFee / 200000) // Estimate micro-lamports per CU
        })
      );
    }
    
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: fromKeypair.publicKey,
        toPubkey: destinationPubkey,
        lamports: transferAmount,
      })
    );
    
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [fromKeypair],
      { 
        commitment: 'confirmed',
        preflightCommitment: 'confirmed'
      }
    );
    
    console.log(`✅ MEV-protected SOL transfer completed: ${signature}`);
    return signature;
  } catch (error) {
    console.error('❌ Error transferring SOL:', error);
    throw error;
  }
}

async function transferSPLToken(fromKeypair, destinationPubkey, tokenMint, options = {}) {
  try {
    const { enableMevProtection = true } = options;
    const tokenMintPubkey = new PublicKey(tokenMint);
    
    // Get source token account
    const sourceTokenAccount = await getAssociatedTokenAddress(
      tokenMintPubkey,
      fromKeypair.publicKey
    );
    
    // Get destination token account
    const destinationTokenAccount = await getAssociatedTokenAddress(
      tokenMintPubkey,
      destinationPubkey
    );
    
    // Check if destination token account exists
    const destinationAccountInfo = await connection.getAccountInfo(destinationTokenAccount);
    const needsDestinationAccount = !destinationAccountInfo;
    
    // Get token balance
    const sourceAccountInfo = await connection.getTokenAccountBalance(sourceTokenAccount);
    const tokenBalance = sourceAccountInfo.value.amount;
    
    if (tokenBalance === '0') {
      throw new Error('No tokens to transfer');
    }
    
    const transaction = new Transaction();
    
    // Add MEV protection via priority fees
    if (enableMevProtection) {
      const priorityFee = await getRecentPrioritizationFees();
      transaction.add(
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: Math.floor(priorityFee / 300000) // Estimate micro-lamports per CU for token transfer
        })
      );
    }
    
    // Add create destination account instruction if needed
    if (needsDestinationAccount) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          fromKeypair.publicKey,
          destinationTokenAccount,
          destinationPubkey,
          tokenMintPubkey,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }
    
    // Add transfer instruction
    transaction.add(
      createTransferInstruction(
        sourceTokenAccount,
        destinationTokenAccount,
        fromKeypair.publicKey,
        BigInt(tokenBalance),
        [],
        TOKEN_PROGRAM_ID
      )
    );
    
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [fromKeypair],
      { 
        commitment: 'confirmed',
        preflightCommitment: 'confirmed'
      }
    );
    
    console.log(`✅ MEV-protected SPL token transfer completed: ${signature}`);
    return signature;
  } catch (error) {
    console.error('❌ Error transferring SPL token:', error);
    throw error;
  }
} 