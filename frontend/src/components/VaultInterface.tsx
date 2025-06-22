import { useState } from "react";
import { DepositForm } from "./DepositForm";
import { SwapForm } from "./SwapForm";
import { SwapStatus } from "./SwapStatus";
import { WithdrawForm } from "./WithdrawForm";
import { SwapHistory } from "./SwapHistory";
import { useVault } from "@/contexts/VaultContext";
import { Button } from "@/components/ui/button";

type VaultStep = "deposit" | "swap" | "status" | "withdraw" | "history";

export const VaultInterface = () => {
  const [currentStep, setCurrentStep] = useState<VaultStep>("deposit");
  const [depositComplete, setDepositComplete] = useState(false);
  const [swapIntent, setSwapIntent] = useState(false);
  const [proofReady, setProofReady] = useState(false);
  
  const { 
    vaultBalance, 
    isVaultCreated, 
    isLoading, 
    error, 
    createUserVault, 
    refreshBalance 
  } = useVault();

  const steps = [
    { id: "deposit", label: "Deposit", icon: "💰"},
    { id: "swap", label: "Swap Intent", icon: "🔄"},
    { id: "withdraw", label: "Withdraw", icon: "📤" },
  ];

  const canNavigateToStep = (stepId: string) => {
    switch (stepId) {
      case "deposit":
        return true;
      case "swap":
        return depositComplete || isVaultCreated;
      case "withdraw":
        return isVaultCreated && vaultBalance > 0;
      default:
        return false;
    }
  };

  const handleStepClick = (stepId: VaultStep) => {
    if (canNavigateToStep(stepId)) {
      setCurrentStep(stepId);
    }
  };

  const getPreviousStep = (): VaultStep | null => {
    const currentIndex = steps.findIndex(step => step.id === currentStep);
    if (currentIndex > 0) {
      return steps[currentIndex - 1].id as VaultStep;
    }
    return null;
  };

  const getNextStep = (): VaultStep | null => {
    const currentIndex = steps.findIndex(step => step.id === currentStep);
    if (currentIndex < steps.length - 1) {
      return steps[currentIndex + 1].id as VaultStep;
    }
    return null;
  };


  return (
    <div className="w-full max-w-6xl mx-auto px-2 sm:px-4">
      {/* Navigation Tabs */}


      {/* Step Progress Indicator (only for main flow) */}
      {currentStep !== "history" && (
        <div className="flex flex-wrap items-center justify-center mb-8 gap-2 sm:gap-4 transition-all duration-300">
          {steps.map((step, index) => {
            const isActive = step.id === currentStep;
            const isCompleted = 
              (step.id === "deposit" && depositComplete) ||
              (step.id === "swap" && swapIntent) ||
              (step.id === "withdraw" && proofReady);
            const canNavigate = canNavigateToStep(step.id);
            
            return (
              <div key={step.id} className="flex items-center gap-2 sm:gap-4">
                <button
                  onClick={() => handleStepClick(step.id as VaultStep)}
                  disabled={!canNavigate}
                  className={`
                    group relative flex flex-col items-center space-y-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:transform-none disabled:cursor-not-allowed
                    ${isActive 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25' 
                      : isCompleted 
                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/25' 
                        : canNavigate
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                          : 'bg-gray-800 text-gray-500 opacity-50'
                    }
                  `}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{step.icon}</span>
                    <span className="text-sm sm:text-base">{step.label}</span>
                  </div>
                  
                  {isCompleted && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white">✓</span>
                    </div>
                  )}
                </button>
                {index < steps.length - 1 && (
                  <div className={`w-8 h-0.5 transition-colors duration-300 ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-600'
                  }`}></div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Main Interface */}
      {currentStep === "history" ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] w-full">
          <div className="w-full flex justify-center">
            <SwapHistory />
          </div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8 transition-all duration-300 min-h-[60vh]">
          {/* Left Column - Current Action */}
          <section className="w-full lg:w-2/3 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-4 sm:p-6 mb-4 lg:mb-0 transition-all duration-300 shadow-md flex flex-col justify-center">
            {currentStep === "deposit" && (
              <DepositForm 
                onComplete={() => {
                  setDepositComplete(true);
                  setCurrentStep("swap");
                }} 
              />
            )}
            {currentStep === "swap" && (
              <SwapForm 
                onComplete={() => {
                  setSwapIntent(true);
                  setCurrentStep("status");
                }} 
              />
            )}
            {currentStep === "status" && (
              <SwapStatus 
                onProofReady={() => {
                  setProofReady(true);
                  setCurrentStep("withdraw");
                }} 
              />
            )}
            {currentStep === "withdraw" && <WithdrawForm />}
          </section>
          {/* Right Column - Account Overview */}
          <aside className="w-full lg:w-1/3 flex flex-col gap-6 sticky top-24 self-start transition-all duration-300">
            {/* Balance Card */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Vault Balance</h3>
                <Button
                  onClick={refreshBalance}
                  disabled={isLoading}
                  variant="ghost"
                  size="sm"
                  className="text-blue-400 hover:text-blue-300"
                >
                  {isLoading ? "🔄" : "↻"}
                </Button>
              </div>
              
              {!isVaultCreated ? (
                <div className="text-center py-4">
                  <p className="text-gray-400 mb-4">No vault found</p>
                  <Button
                    onClick={createUserVault}
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isLoading ? "Creating..." : "Create Vault"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">SOL</span>
                    <span className="text-white font-medium">{vaultBalance.toFixed(4)}</span>
                  </div>
                  <div className="border-t border-gray-700 pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Total Value</span>
                      <span className="text-white font-semibold">{vaultBalance.toFixed(4)} SOL</span>
                    </div>
                  </div>
                </div>
              )}
              
              {error && (
                <div className="mt-4 p-3 bg-red-900/20 border border-red-700/30 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
            </div>
            {/* Privacy Info */}
            <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-700/30 rounded-2xl p-6 shadow-md">
              <h3 className="text-lg font-semibold text-white mb-2">Privacy Protection</h3>
              <p className="text-sm text-gray-300 mb-4">
                Your swap intents are encrypted and processed off-chain. Only the final proof is submitted to Solana.
              </p>
              <div className="flex items-center space-x-2 text-xs text-green-400">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Zero-knowledge proofs active</span>
              </div>
            </div>
            {/* Quick Stats
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 shadow-md">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Total Swaps</span>
                  <span className="text-white font-medium">12</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Volume (24h)</span>
                  <span className="text-white font-medium">$2,450</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Success Rate</span>
                  <span className="text-green-400 font-medium">98.5%</span>
                </div>
              </div>
            </div> */}
          </aside>
        </div>
      )}
    </div>
  );
};
