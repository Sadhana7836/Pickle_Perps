"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { X, TrendingUp, TrendingDown, AlertCircle, Loader2 } from "lucide-react";
import { useStellarWallet } from "@/contexts/StellarContext";
import { useRWAPerpetualTrading, useRWAPrice } from "@/hooks/useRWAPerpetualTrading";
import { type RWAAssetConfig, CATEGORY_CONFIG } from "@/lib/rwaAssets";

interface RWATradingModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: RWAAssetConfig;
}

export function RWATradingModal({ isOpen, onClose, asset }: RWATradingModalProps) {
  const { address, isConnected, balance: walletBalance } = useStellarWallet();
  const { openPosition, state, isDeployed } = useRWAPerpetualTrading();
  const { price, change24h, isLive } = useRWAPrice(asset.id);

  const [isLong, setIsLong] = useState(true);
  const [margin, setMargin] = useState("");
  const [leverage, setLeverage] = useState(10);
  const [error, setError] = useState<string | null>(null);

  const category = CATEGORY_CONFIG[asset.category];

  // Calculate position details
  const marginNum = parseFloat(margin) || 0;
  const positionSize = marginNum * leverage;
  const liquidationPrice = isLong
    ? parseFloat(price) * (1 - 0.95 / leverage)
    : parseFloat(price) * (1 + 0.95 / leverage);

  const handleSubmit = useCallback(async () => {
    if (!isConnected) {
      setError("Please connect your wallet");
      return;
    }

    if (!margin || parseFloat(margin) <= 0) {
      setError("Please enter a valid margin amount");
      return;
    }

    if (parseFloat(margin) < 0.001) {
      setError("Minimum margin is 0.001 XLM");
      return;
    }

    if (walletBalance && parseFloat(margin) > parseFloat(walletBalance)) {
      setError("Insufficient balance");
      return;
    }

    setError(null);

    try {
      const positionId = await openPosition(asset.assetId, isLong, margin, leverage);
      console.log("Position opened:", positionId);
      onClose();
    } catch (err: unknown) {
      console.error("Failed to open position:", err);
      setError(err instanceof Error ? err.message : "Failed to open position");
    }
  }, [isConnected, margin, walletBalance, openPosition, asset.assetId, isLong, leverage, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-[var(--background)] border border-[var(--card-bg)] rounded-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--card-bg)]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-[var(--card-bg)] flex items-center justify-center border border-[#333] overflow-hidden">
              <Image
                src={asset.image}
                alt={asset.name}
                width={40}
                height={40}
                className="object-contain"
                unoptimized
              />
            </div>
            <div>
              <h2 className="text-[var(--foreground)] font-semibold">{asset.name}</h2>
              <div className="flex items-center gap-2">
                <span className="text-[#888] text-sm">{asset.symbol}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${category.bgColor} ${category.color}`}>
                  {category.label}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Price Display */}
        <div className="p-4 border-b border-[var(--card-bg)] bg-[var(--sidebar-bg)]">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[var(--text-muted)] text-xs">Current Price</span>
              <div className="flex items-center gap-2">
                <span className="text-[var(--foreground)] text-2xl font-bold">${price}</span>
                {!isLive && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#ff8c00]/20 text-[#ff8c00]">
                    Demo
                  </span>
                )}
              </div>
            </div>
            <div className={`flex items-center gap-1 ${change24h >= 0 ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"}`}>
              {change24h >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span className="font-medium">{change24h >= 0 ? "+" : ""}{change24h.toFixed(2)}%</span>
            </div>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#a855f7] animate-pulse"></span>
            <span className="text-[var(--text-muted)] text-xs">Powered by Pyth Network</span>
          </div>
        </div>

        {/* Trading Form */}
        <div className="p-4 space-y-4">
          {/* Long/Short Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setIsLong(true)}
              className={`flex-1 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                isLong
                  ? "bg-[var(--accent-green)] text-black"
                  : "bg-[var(--card-bg)] text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--hover-bg)]"
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Long
            </button>
            <button
              onClick={() => setIsLong(false)}
              className={`flex-1 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                !isLong
                  ? "bg-[var(--accent-red)] text-[var(--foreground)]"
                  : "bg-[var(--card-bg)] text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--hover-bg)]"
              }`}
            >
              <TrendingDown className="w-4 h-4" />
              Short
            </button>
          </div>

          {/* Margin Input */}
          <div>
            <label className="text-[#888] text-sm mb-1.5 block">Margin (XLM)</label>
            <div className="relative">
              <input
                type="number"
                value={margin}
                onChange={(e) => setMargin(e.target.value)}
                placeholder="0.01"
                step="0.001"
                min="0.001"
                className="w-full bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg px-4 py-3 text-[var(--foreground)] placeholder-[#555] focus:outline-none focus:border-[var(--accent-green)] transition-colors"
              />
              {walletBalance && (
                <button
                  onClick={() => setMargin(walletBalance)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--accent-green)] hover:text-[var(--accent-green)]"
                >
                  MAX
                </button>
              )}
            </div>
            {walletBalance && (
              <div className="text-[var(--text-muted)] text-xs mt-1">
                Balance: {parseFloat(walletBalance).toFixed(4)} XLM
              </div>
            )}
          </div>

          {/* Leverage Slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[#888] text-sm">Leverage</label>
              <span className="text-[var(--foreground)] font-semibold">{leverage}x</span>
            </div>
            <input
              type="range"
              min="1"
              max={asset.maxLeverage}
              value={leverage}
              onChange={(e) => setLeverage(parseInt(e.target.value))}
              className="w-full accent-[var(--accent-green)]"
            />
            <div className="flex justify-between text-xs text-[var(--text-muted)]">
              <span>1x</span>
              <span>Max: {asset.maxLeverage}x</span>
            </div>
          </div>

          {/* Position Summary */}
          {marginNum > 0 && (
            <div className="bg-[var(--card-bg)] rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#888]">Position Size</span>
                <span className="text-[var(--foreground)]">${positionSize.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#888]">Entry Price</span>
                <span className="text-[var(--foreground)]">${price}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#888]">Liq. Price</span>
                <span className="text-[var(--accent-red)]">${liquidationPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#888]">Trading Fee</span>
                <span className="text-[var(--foreground)]">{(marginNum * 0.001).toFixed(6)} XLM</span>
              </div>
            </div>
          )}

          {/* Warning */}
          {!isDeployed && (
            <div className="flex items-start gap-2 bg-[#ff8c00]/10 border border-[#ff8c00]/30 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 text-[#ff8c00] flex-shrink-0 mt-0.5" />
              <div className="text-xs text-[#ff8c00]">
                <strong>Demo Mode:</strong> Contract not yet deployed. This is a preview of the RWA perpetuals functionality.
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 text-[var(--accent-red)] flex-shrink-0 mt-0.5" />
              <span className="text-xs text-[var(--accent-red)]">{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={state.isLoading || !margin}
            className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
              isLong
                ? "bg-[var(--accent-green)] hover:bg-[var(--accent-green)] text-black"
                : "bg-[var(--accent-red)] hover:bg-[#ff5f6d] text-[var(--foreground)]"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {state.isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {state.isPending ? "Confirm in wallet..." : "Processing..."}
              </>
            ) : (
              <>
                {isLong ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {isLong ? "Long" : "Short"}
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[var(--card-bg)] bg-[var(--sidebar-bg)]">
          <div className="flex items-center justify-center gap-2 text-[10px] text-[var(--text-muted)]">
            <span className="px-1.5 py-0.5 rounded bg-[#ffd700]/15 text-[#ffd700]">RWA Synthetic</span>
            <span>Trade {asset.name} without holding the underlying asset</span>
          </div>
        </div>
      </div>
    </div>
  );
}
