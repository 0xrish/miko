import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Settings, TrendingUp, TrendingDown, Clock, AlertCircle, CheckCircle, Copy, ExternalLink, RefreshCw } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { TokenSelector } from "@/components/TokenSelector";
import { Token } from "@/lib/tokenService";
import { relayerService, SwapResponse } from "@/lib/relayerService";
import { useVault } from "@/contexts/VaultContext";
import { useWallet } from '@solana/wallet-adapter-react';
import { toast } from "sonner";

interface SwapFormProps {
  onComplete: () => void;
}

type SwapStep = 'input' | 'quote' | 'confirm' | 'success';

export const SwapForm = ({ onComplete }: SwapFormProps) => {
  const [fromToken] = useState("SOL");
  const [toToken, setToToken] = useState<Token | null>(null);
  const [amount, setAmount] = useState("");
  const [destinationWallet, setDestinationWallet] = useState("");
  const [slippage, setSlippage] = useState([0.5]);
  const [currentStep, setCurrentStep] = useState<SwapStep>('input');
  const [isLoading, setIsLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Quote data
  const [quoteData, setQuoteData] = useState<SwapResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmResult, setConfirmResult] = useState<any>(null);

  // Use vault context for balance management
  const { vaultBalance, isVaultCreated, refreshBalance, isLoading: isVaultLoading } = useVault();
  
  // Use wallet context to get connected wallet address
  const { publicKey, connected } = useWallet();

  // Refresh vault balance on component mount
  useEffect(() => {
    if (isVaultCreated) {
      refreshBalance();
    }
  }, [isVaultCreated]);

  // Set default destination wallet to connected wallet
  useEffect(() => {
    if (connected && publicKey && !destinationWallet) {
      setDestinationWallet(publicKey.toString());
    }
  }, [connected, publicKey, destinationWallet]);

  const estimatedOutput = amount && toToken?.price
    ? (parseFloat(amount) * parseFloat(toToken.price)).toLocaleString()
    : "0";

  const handleGetQuote = async () => {
    if (!connected || !publicKey) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!toToken || !amount || parseFloat(amount) <= 0) {
      toast.error("Please select a token and enter a valid amount");
      return;
    }

    if (!isVaultCreated) {
      toast.error("Please create a vault first");
      return;
    }

    if (parseFloat(amount) > vaultBalance) {
      toast.error("Insufficient vault balance");
      return;
    }

    const finalDestinationWallet = destinationWallet || publicKey.toString();

    setIsLoading(true);
    setError(null);

    try {
      // Convert amount to smallest units (lamports for SOL)
      const fromTokenDecimals = 9; // SOL has 9 decimals
      const amountInSmallestUnits = relayerService.convertToSmallestUnits(amount, fromTokenDecimals);
      
      const swapRequest = {
        fromToken: "So11111111111111111111111111111111111111112", // SOL
        toToken: toToken.address,
        amount: amountInSmallestUnits,
        destinationWallet: finalDestinationWallet,
        slippageBps: Math.round(slippage[0] * 100), // Convert percentage to basis points
      };

      const response = await relayerService.getSwapQuote(swapRequest);
      setQuoteData(response);
      setCurrentStep('quote');
      
      toast.success("Quote received successfully!");
      
      // Show warnings if any
      if (response.data.warnings && response.data.warnings.length > 0) {
        response.data.warnings.forEach(warning => {
          toast.warning(warning);
        });
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get quote';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmSwap = async () => {
    if (!quoteData || !connected || !publicKey) {
      toast.error("Missing quote data or wallet not connected");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const finalDestinationWallet = destinationWallet || publicKey.toString();
      
      const confirmRequest = {
        tempWalletAddress: quoteData.data.tempWallet.address,
        confirmation: true,
        destinationWallet: finalDestinationWallet,
        quoteResponse: quoteData.data.quoteResponse,
      };

      const response = await relayerService.confirmSwap(confirmRequest);
      
      if (response.success && response.status === 'completed') {
        setConfirmResult(response);
        setCurrentStep('success');
        toast.success("Swap completed successfully!");
        
        // Refresh vault balance after successful swap
        await refreshBalance();
        
        // Call onComplete after a short delay to show success state
        setTimeout(() => {
          onComplete();
        }, 3000);
      } else {
        throw new Error(response.error || response.message || 'Swap confirmation failed');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to confirm swap';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTokenSelect = (token: Token) => {
    setToToken(token);
    // Reset quote when token changes
    if (currentStep !== 'input') {
      setCurrentStep('input');
      setQuoteData(null);
      setError(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const handleMaxClick = () => {
    if (vaultBalance > 0) {
      // Leave a small buffer for transaction fees
      const maxAmount = Math.max(0, vaultBalance - 0.001);
      setAmount(maxAmount.toString());
    }
  };

  const handleRefreshBalance = () => {
    refreshBalance();
    toast.success("Balance refreshed!");
  };

  const renderQuoteDetails = () => {
    if (!quoteData) return null;

    const { swap } = quoteData.data;
    const fromTokenInfo = relayerService.getTokenInfo(swap.fromToken);
    const toTokenInfo = relayerService.getTokenInfo(swap.toToken);

    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-600/30 rounded-xl p-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-blue-300 text-sm">Input Amount</span>
              <span className="text-white font-semibold">
                {relayerService.formatAmount(swap.inputAmount, fromTokenInfo.decimals)} {fromTokenInfo.symbol}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-blue-300 text-sm">Expected Output</span>
              <span className="text-white font-semibold">
                {relayerService.formatAmount(swap.expectedOutputAmount, toTokenInfo.decimals)} {toTokenInfo.symbol}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-blue-300 text-sm">Price Impact</span>
              <span className={`text-sm ${swap.priceImpactPct > 1 ? 'text-yellow-400' : 'text-green-400'}`}>
                {swap.priceImpactPct.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-blue-300 text-sm">Slippage Tolerance</span>
              <span className="text-white text-sm">{(swap.slippageBps / 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-yellow-300 font-medium mb-2">Next Steps:</div>
              <div className="space-y-2 text-sm text-gray-300">
                {quoteData.data.instructions.map((instruction, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <span className="text-yellow-400 font-bold">{index + 1}.</span>
                    <span>{instruction}</span>
                  </div>
                ))}
              </div>
              {/* <div className="mt-3 p-2 bg-gray-800 rounded border">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Temporary Wallet:</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(quoteData.data.tempWallet.address)}
                    className="h-6 px-2 text-xs"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                </div>
                <div className="text-xs font-mono text-white break-all">
                  {quoteData.data.tempWallet.address}
                </div>
              </div> */}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSuccessDetails = () => {
    if (!confirmResult) return null;

    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-600/30 rounded-xl p-4">
          <div className="flex items-center space-x-3 mb-4">
            <CheckCircle className="w-6 h-6 text-green-400" />
            <div>
              <div className="text-green-300 font-medium">Swap Completed Successfully!</div>
              <div className="text-sm text-gray-300">{confirmResult.data.message}</div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-green-300 text-sm">Swap Transaction</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(confirmResult.data.explorerLinks.swap, '_blank')}
                className="h-6 px-2 text-xs text-green-400 hover:text-green-300"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                View
              </Button>
            </div>
            
            {confirmResult.data.explorerLinks.transfer && (
              <div className="flex justify-between items-center">
                <span className="text-green-300 text-sm">Transfer Transaction</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(confirmResult.data.explorerLinks.transfer, '_blank')}
                  className="h-6 px-2 text-xs text-green-400 hover:text-green-300"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  View
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Create Swap Intent</h2>
        <p className="text-gray-400">Set up your private swap with zero-knowledge protection</p>
      </div>
      
      {error && (
        <div className="bg-red-900/20 border border-red-600/30 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-red-300 font-medium mb-1">Error</div>
              <div className="text-sm text-gray-300 whitespace-pre-line">{error}</div>
            </div>
          </div>
        </div>
      )}
      
      <div className="space-y-6">
        {/* From Token - SOL from Vault */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-300">From (Vault Balance)</Label>
          <div className="bg-gray-800/80 border border-gray-600 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  ◎
                </div>
                <div>
                  <div className="font-semibold text-white">{fromToken}</div>
                  <div className="text-sm text-gray-400">Solana</div>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-2">
                  <div className="text-gray-400 text-sm">Available</div>
                  <Button
                    onClick={handleRefreshBalance}
                    disabled={isVaultLoading}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-blue-400 hover:text-blue-300"
                  >
                    <RefreshCw className={`w-3 h-3 ${isVaultLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                <div className="text-white font-medium">
                  {isVaultCreated ? `${vaultBalance.toFixed(4)} SOL` : 'No vault'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Amount Input */}
        <div className="space-y-3">
          <Label htmlFor="swap-amount" className="text-sm font-medium text-gray-300">
            Amount to Swap
          </Label>
          <div className="relative">
            <Input
              id="swap-amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              max={vaultBalance}
              className="bg-gray-800/90 border-gray-600 text-white text-lg py-6 rounded-xl focus:border-blue-500 pr-20"
              disabled={currentStep === 'confirm' || currentStep === 'success' || !isVaultCreated}
            />
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
              <Button
                type="button"
                onClick={handleMaxClick}
                disabled={!isVaultCreated || vaultBalance <= 0}
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs bg-blue-600 text-white hover:bg-blue-700"
              >
                MAX
              </Button>
              <span className="text-gray-400">SOL</span>
            </div>
          </div>
          {amount && parseFloat(amount) > vaultBalance && (
            <p className="text-red-400 text-sm">Amount exceeds vault balance</p>
          )}
        </div>

        {/* Destination Wallet Input */}
        <div className="space-y-3">
          <Label htmlFor="destination-wallet" className="text-sm font-medium text-gray-300">
            Destination Wallet
          </Label>
          <div className="space-y-2">
            <Input
              id="destination-wallet"
              type="text"
              placeholder={connected && publicKey ? publicKey.toString() : "Connect wallet to auto-fill"}
              value={destinationWallet}
              onChange={(e) => setDestinationWallet(e.target.value)}
              className="bg-gray-800/90 border-gray-600 text-white rounded-xl focus:border-blue-500"
              disabled={currentStep === 'confirm' || currentStep === 'success'}
            />
            {connected && publicKey && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">
                  {destinationWallet === publicKey.toString() ? "Using connected wallet" : "Custom destination"}
                </span>
                {destinationWallet !== publicKey.toString() && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDestinationWallet(publicKey.toString())}
                    className="text-blue-400 hover:text-blue-300 text-xs h-auto p-1"
                  >
                    Use connected wallet
                  </Button>
                )}
              </div>
            )}
            {!connected && (
              <p className="text-yellow-400 text-xs">
                Please connect your wallet to auto-fill destination address
              </p>
            )}
          </div>
        </div>

        {/* Swap Arrow with Settings */}
        <div className="flex justify-center items-center space-x-4">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center transform rotate-90">
            <span className="text-white">⟷</span>
          </div>
          
          {/* Settings Button */}
          <DropdownMenu open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
                disabled={currentStep === 'confirm' || currentStep === 'success'}
              >
                <Settings className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80 bg-gray-800 border-gray-600">
              <DropdownMenuLabel className="text-white">Swap Settings</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="p-4 space-y-4">
                <div>
                  <Label className="text-sm text-gray-300 mb-3 block">
                    Slippage Tolerance: {slippage[0]}%
                  </Label>
                  <Slider
                    value={slippage}
                    onValueChange={setSlippage}
                    max={5}
                    min={0.1}
                    step={0.1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-2">
                    <span>0.1%</span>
                    <span>5%</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">MEV Protection</span>
                  <span className="text-xs text-green-400">Enabled</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">Transaction Deadline</span>
                  <span className="text-xs text-gray-400">30 minutes</span>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* To Token Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-300">To</Label>
          <TokenSelector
            selectedToken={toToken}
            onSelectToken={handleTokenSelect}
            placeholder="Select destination token..."
          />
        </div>

        {/* Quote Details */}
        {currentStep === 'quote' && renderQuoteDetails()}
        
        {/* Success Details */}
        {currentStep === 'success' && renderSuccessDetails()}

        {/* Action Button */}
        <Button
          onClick={currentStep === 'input' ? handleGetQuote : handleConfirmSwap}
          disabled={
            isLoading || 
            !amount || 
            parseFloat(amount) <= 0 || 
            !toToken ||
            currentStep === 'success' ||
            !isVaultCreated ||
            parseFloat(amount) > vaultBalance ||
            !connected ||
            !publicKey
          }
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium py-6 text-lg rounded-xl transition-all duration-300 transform hover:scale-105 disabled:transform-none disabled:opacity-50"
        >
          {isLoading ? (
            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>
                {currentStep === 'input' ? 'Getting Quote...' : 'Submitting Intent...'}
              </span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span>🔐</span>
              <span>
                {!connected
                  ? 'Connect Wallet First'
                  : !isVaultCreated
                  ? 'Create Vault First'
                  : currentStep === 'input' 
                  ? 'Get Quote' 
                  : currentStep === 'quote'
                  ? 'Submit Private Swap Intent'
                  : 'Swap Completed'
                }
              </span>
            </div>
          )}
        </Button>

        {/* Privacy Notice */}
        <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-700/30 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs">🔒</span>
            </div>
            <div>
              <div className="text-blue-300 font-medium mb-1 text-sm">Zero-Knowledge Privacy</div>
              <p className="text-xs text-gray-300 leading-relaxed">
                Your swap intent will be encrypted and processed off-chain using zero-knowledge proofs. 
                No trading activity is visible on-chain until final execution. SOL will be swapped directly from your vault.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
