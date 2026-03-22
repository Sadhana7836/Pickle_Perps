"use client";

import { useState } from "react";
import { useStellarWallet } from "@/contexts/StellarContext";
import { usePerpetualTrading } from "@/hooks/usePerpetualTrading";
import { TRADING } from "@/lib/constants";

interface TradingPanelProps {
  tokenAddress: string;
  tokenSymbol: string;
  tokenPrice: string;
}

export function TradingPanel({ tokenAddress, tokenSymbol, tokenPrice }: TradingPanelProps) {
  const { address, balance: walletBalance } = useStellarWallet();
  const { actions, state, refetch } = usePerpetualTrading();
  const [positionType, setPositionType] = useState<"Long" | "Short">("Long");
  const [leverage, setLeverage] = useState<number>(TRADING.DEFAULT_LEVERAGE);
  const [orderType, setOrderType] = useState<"Market" | "Limit">("Market");
  const [amount, setAmount] = useState("");
  const [tpSlEnabled, setTpSlEnabled] = useState(false);
  const [takeProfit, setTakeProfit] = useState("");
  const [tpGain, setTpGain] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [slLoss, setSlLoss] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleTrade = async () => {
    if (!address) {
      alert("Please connect your wallet");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    try {
      setIsProcessing(true);
      await actions.openPosition(
        tokenAddress,
        positionType === "Long",
        amount,
        leverage
      );
      // Wait for transaction to be mined
      await new Promise(resolve => setTimeout(resolve, 3000));
      // Refresh positions and prices immediately
      refetch();
      // Trigger a global refresh event for price updates
      window.dispatchEvent(new CustomEvent('priceUpdate'));
      alert("Position opened! Check the Positions tab.");
      setAmount("");
    } catch (error: unknown) {
      console.error("Trading error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to open position";
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const isLoading = state.isLoading || isProcessing;

  return (
    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] overflow-hidden m-2">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--card-border)]">
        <h3 className="text-[var(--foreground)] font-semibold">Perpetual Trading</h3>
        <p className="text-[var(--text-muted)] text-xs mt-0.5">
          Trade {tokenSymbol} with up to {TRADING.MAX_LEVERAGE}x leverage
        </p>
      </div>

      {/* Long/Short Toggle */}
      <div className="flex p-2 bg-[var(--background)]">
        <button
          onClick={() => setPositionType("Long")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            positionType === "Long"
              ? "bg-[var(--accent-green)] text-black"
              : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
          }`}
        >
          Long
        </button>
        <button
          onClick={() => setPositionType("Short")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            positionType === "Short"
              ? "bg-[var(--accent-red)] text-[var(--foreground)]"
              : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
          }`}
        >
          Short
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Order Type */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--text-muted)]">Order Type</span>
          <div className="flex gap-1">
            {["Market", "Limit"].map((type) => (
              <button
                key={type}
                onClick={() => setOrderType(type as "Market" | "Limit")}
                className={`px-3 py-1 rounded text-xs ${
                  orderType === type
                    ? "bg-[var(--accent-green)] text-black"
                    : "bg-[var(--background)] text-[var(--text-muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Leverage */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[var(--text-muted)] text-sm">Leverage</span>
            <span className="text-[var(--foreground)] font-medium">{leverage}x</span>
          </div>
          <input
            type="range"
            min={TRADING.MIN_LEVERAGE}
            max={TRADING.MAX_LEVERAGE}
            value={leverage}
            onChange={(e) => setLeverage(Number(e.target.value))}
            className="w-full h-1.5 bg-[var(--background)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-green)]"
          />
          <div className="flex gap-2 mt-2">
            {[5, 10, 25, 50, 100].map((lev) => (
              <button
                key={lev}
                onClick={() => setLeverage(lev)}
                className={`flex-1 py-1 rounded text-xs transition-colors ${
                  leverage === lev
                    ? "bg-[var(--accent-green)] text-black"
                    : "bg-[var(--background)] border border-[var(--card-border)] text-[var(--text-muted)] hover:border-[var(--accent-green)] hover:text-[var(--foreground)]"
                }`}
              >
                {lev}x
              </button>
            ))}
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[#888] text-xs">Amount (XLM)</label>
            {walletBalance && (
              <span className="text-[var(--text-muted)] text-xs">
                Balance: {parseFloat(walletBalance).toFixed(4)} XLM
              </span>
            )}
          </div>
          <div className="relative">
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2.5 pr-16 bg-[var(--background)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-sm placeholder-[#555] focus:outline-none focus:border-[var(--accent-green)]"
            />
            <button
              onClick={() => {
                if (walletBalance) {
                  // Leave some for gas fees
                  const maxAmount = Math.max(0, parseFloat(walletBalance) - 0.01);
                  setAmount(maxAmount.toFixed(6));
                }
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-[var(--accent-green)]/20 hover:bg-[var(--accent-green)]/30 text-[var(--accent-green)] text-xs font-medium rounded transition-colors"
            >
              MAX
            </button>
          </div>
          <div className="flex gap-2 mt-2">
            {[25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                onClick={() => {
                  if (walletBalance) {
                    const maxAmount = Math.max(0, parseFloat(walletBalance) - 0.01);
                    setAmount((maxAmount * pct / 100).toFixed(6));
                  }
                }}
                className="flex-1 py-1 bg-[var(--background)] border border-[var(--card-border)] rounded text-[var(--text-muted)] text-xs hover:border-[var(--accent-green)] hover:text-[var(--foreground)] transition-colors"
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>

        {/* Position Preview */}
        {amount && parseFloat(amount) > 0 && (
          <div className="bg-[var(--background)] rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">Position Size</span>
              <span className="text-[var(--foreground)] font-medium">
                ${(Number(amount) * leverage).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">Entry Price</span>
              <span className="text-[var(--foreground)]">{tokenPrice || "Market"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">Liquidation Price</span>
              <span className="text-[var(--accent-red)]">~{(100 / leverage).toFixed(1)}% from entry</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">Fee ({(TRADING.FEE_PERCENTAGE * 100).toFixed(2)}%)</span>
              <span className="text-[var(--foreground)]">${((Number(amount) * leverage) * TRADING.FEE_PERCENTAGE).toFixed(4)}</span>
            </div>
          </div>
        )}

        {/* TP/SL Toggle */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--text-muted)]">Take Profit / Stop Loss</span>
          <label className="flex items-center cursor-pointer">
            <div
              onClick={() => setTpSlEnabled(!tpSlEnabled)}
              className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                tpSlEnabled ? 'bg-[var(--accent-green)] border-[var(--accent-green)]' : 'border-[#444] bg-transparent'
              }`}
            >
              {tpSlEnabled && (
                <svg className="w-2.5 h-2.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </label>
        </div>

        {tpSlEnabled && (
          <div className="space-y-2">
            <div>
              <label className="text-[#666] text-[10px] mb-1 block">Take Profit</label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  placeholder="Price"
                  className="flex-1 min-w-0 px-2 py-1.5 bg-[var(--background)] border border-[var(--card-border)] rounded text-[var(--foreground)] text-xs placeholder-[#555] focus:outline-none focus:border-[var(--accent-green)]"
                />
                <input
                  type="text"
                  value={tpGain}
                  onChange={(e) => setTpGain(e.target.value)}
                  placeholder="+$"
                  className="w-16 px-2 py-1.5 bg-[var(--background)] border border-[var(--card-border)] rounded text-[var(--foreground)] text-xs placeholder-[#555] focus:outline-none focus:border-[var(--accent-green)]"
                />
              </div>
            </div>
            <div>
              <label className="text-[#666] text-[10px] mb-1 block">Stop Loss</label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  placeholder="Price"
                  className="flex-1 min-w-0 px-2 py-1.5 bg-[var(--background)] border border-[var(--card-border)] rounded text-[var(--foreground)] text-xs placeholder-[#555] focus:outline-none focus:border-[var(--accent-red)]"
                />
                <input
                  type="text"
                  value={slLoss}
                  onChange={(e) => setSlLoss(e.target.value)}
                  placeholder="-$"
                  className="w-16 px-2 py-1.5 bg-[var(--background)] border border-[var(--card-border)] rounded text-[var(--foreground)] text-xs placeholder-[#555] focus:outline-none focus:border-[var(--accent-red)]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Execute Button */}
        <button
          onClick={handleTrade}
          disabled={isLoading || !address}
          className={`w-full py-2.5 rounded-lg font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            positionType === "Long"
              ? "bg-[var(--accent-green)] hover:bg-[var(--accent-green)] text-black"
              : "bg-[var(--accent-red)] hover:bg-[#ff5a67] text-[var(--foreground)]"
          }`}
        >
          {isLoading
            ? "Processing..."
            : `${positionType} ${leverage}x`}
        </button>

        {/* Position Stats */}
        <div className="pt-3 border-t border-[var(--card-border)] space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-[var(--text-muted)]">Max Leverage</span>
            <span className="text-[var(--foreground)]">{TRADING.MAX_LEVERAGE}x</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[var(--text-muted)]">Funding Rate</span>
            <span className="text-[var(--accent-green)]">0.01%/8h</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[var(--text-muted)]">Open Interest</span>
            <span className="text-[var(--foreground)]">$0.00</span>
          </div>
        </div>
      </div>
    </div>
  );
}
