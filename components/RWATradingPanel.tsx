"use client";

import { useState } from "react";
import Image from "next/image";
import { useStellarWallet } from "@/contexts/StellarContext";
import { useRWAPerpetualTrading, useRWAPrice } from "@/hooks/useRWAPerpetualTrading";
import { type RWAAssetConfig, CATEGORY_CONFIG } from "@/lib/rwaAssets";
import { AlertCircle, Loader2, CheckCircle, X } from "lucide-react";

// Position Success Modal - matches the token position UI style
interface PositionSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: RWAAssetConfig;
  positionType: "Long" | "Short";
  leverage: number;
  margin: string;
  entryPrice: string;
  positionSize: number;
}

function PositionSuccessModal({
  isOpen,
  onClose,
  asset,
  positionType,
  leverage,
  margin,
  entryPrice,
  positionSize,
}: PositionSuccessModalProps) {
  if (!isOpen) return null;

  const liquidationPercent = (95 / leverage).toFixed(1);
  const liquidationPrice = positionType === "Long"
    ? (parseFloat(entryPrice) * (1 - 0.95 / leverage)).toFixed(8)
    : (parseFloat(entryPrice) * (1 + 0.95 / leverage)).toFixed(8);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--card-border)]">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-[var(--accent-green)]" />
            <span className="text-[var(--foreground)] font-medium">Position Opened</span>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Position Card - Same style as token positions */}
        <div className="p-4">
          <div className="bg-[var(--sidebar-bg)] rounded-lg p-4 border border-[var(--card-border)]">
            {/* Position Type & Leverage */}
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-sm font-bold ${positionType === "Long" ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
                {positionType.toUpperCase()}
              </span>
              <span className="text-[#888] text-sm">{leverage}x</span>
            </div>

            {/* Position Details */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Size</span>
                <span className="text-[var(--foreground)]">${positionSize.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Margin</span>
                <span className="text-[var(--foreground)]">${margin}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Entry Price</span>
                <span className="text-[var(--foreground)]">${entryPrice}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Liquidation Price</span>
                <span className="text-[var(--accent-red)]">${liquidationPrice}</span>
              </div>
              <div className="flex justify-between border-t border-[#222] pt-2 mt-2">
                <span className="text-[var(--text-muted)]">Unrealized PnL</span>
                <span className="text-[var(--accent-green)]">+$0.0000</span>
              </div>
            </div>
          </div>

          {/* Asset Info */}
          <div className="flex items-center gap-3 mt-4 p-3 bg-[var(--sidebar-bg)] rounded-lg border border-[var(--card-border)]">
            <Image
              src={asset.image}
              alt={asset.name}
              width={32}
              height={32}
              className="object-contain"
              unoptimized
            />
            <div>
              <p className="text-[var(--foreground)] text-sm font-medium">{asset.symbol}</p>
              <p className="text-[var(--text-muted)] text-xs">{asset.name}</p>
            </div>
            <span className="ml-auto text-[10px] px-2 py-1 rounded bg-[#ffd700]/15 text-[#ffd700]">
              RWA
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 pb-4">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-[var(--accent-green)] hover:bg-[var(--accent-green)] text-black font-semibold rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

interface RWATradingPanelProps {
  asset: RWAAssetConfig;
}

export function RWATradingPanel({ asset }: RWATradingPanelProps) {
  const { address, balance: walletBalance } = useStellarWallet();
  const { openPosition, state, isDeployed, refetch } = useRWAPerpetualTrading();
  const { price } = useRWAPrice(asset.id);

  const [positionType, setPositionType] = useState<"Long" | "Short">("Long");
  const [leverage, setLeverage] = useState<number>(Math.min(10, asset.maxLeverage));
  const [orderType, setOrderType] = useState<"Market" | "Limit">("Market");
  const [amount, setAmount] = useState("");
  const [tpSlEnabled, setTpSlEnabled] = useState(false);
  const [takeProfit, setTakeProfit] = useState("");
  const [tpGain, setTpGain] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [slLoss, setSlLoss] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [openedPosition, setOpenedPosition] = useState<{
    positionType: "Long" | "Short";
    leverage: number;
    margin: string;
    entryPrice: string;
    positionSize: number;
  } | null>(null);

  const category = CATEGORY_CONFIG[asset.category];

  const handleTrade = async () => {
    if (!address) {
      setTradeError("Please connect your wallet");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setTradeError("Please enter a valid amount");
      return;
    }

    if (Number(amount) < 0.001) {
      setTradeError("Minimum margin is 0.001 XLM");
      return;
    }

    setTradeError(null);

    try {
      setIsProcessing(true);
      const currentPositionSize = Number(amount) * leverage;
      const currentEntryPrice = price;

      const positionId = await openPosition(
        asset.assetId,
        positionType === "Long",
        amount,
        leverage
      );
      console.log("Position opened:", positionId);
      refetch();

      // Save position details for the success modal
      setOpenedPosition({
        positionType,
        leverage,
        margin: amount,
        entryPrice: currentEntryPrice,
        positionSize: currentPositionSize,
      });
      setShowSuccessModal(true);
      setAmount("");
    } catch (error: unknown) {
      console.error("Trading error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to open position";
      setTradeError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const isLoading = state.isLoading || isProcessing;
  const positionSize = Number(amount || 0) * leverage;
  const liquidationPercent = (95 / leverage).toFixed(1);

  // Calculate leverage buttons based on asset's max leverage
  const leverageButtons = asset.maxLeverage >= 100
    ? [5, 10, 25, 50, 100].filter(l => l <= asset.maxLeverage)
    : asset.maxLeverage >= 50
    ? [5, 10, 25, 50].filter(l => l <= asset.maxLeverage)
    : [2, 5, 10, 15, 20].filter(l => l <= asset.maxLeverage);

  return (
    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] overflow-hidden m-2">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--card-border)]">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-[var(--card-bg)] flex items-center justify-center border border-[#333]">
            <Image
              src={asset.image}
              alt={asset.name}
              width={32}
              height={32}
              className="object-contain"
              unoptimized
            />
          </div>
          <div>
            <h3 className="text-[var(--foreground)] font-semibold">{asset.name} Perpetual</h3>
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-muted)] text-xs">{asset.symbol}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${category.bgColor} ${category.color}`}>
                {category.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Warning */}
      {!isDeployed && (
        <div className="flex items-start gap-2 bg-[#ff8c00]/10 border-b border-[#ff8c00]/30 px-4 py-2">
          <AlertCircle className="w-4 h-4 text-[#ff8c00] flex-shrink-0 mt-0.5" />
          <span className="text-xs text-[#ff8c00]">
            <strong>Demo Mode:</strong> Contract not deployed. Trading is simulated.
          </span>
        </div>
      )}

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
            min={1}
            max={asset.maxLeverage}
            value={leverage}
            onChange={(e) => setLeverage(Number(e.target.value))}
            className="w-full h-1.5 bg-[var(--background)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-green)]"
          />
          <div className="flex gap-2 mt-2">
            {leverageButtons.map((lev) => (
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
          <label className="text-[#888] text-xs mb-1.5 block">Margin (XLM)</label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.01"
              step="0.001"
              min="0.001"
              className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-sm placeholder-[#555] focus:outline-none focus:border-[var(--accent-green)]"
            />
            {walletBalance && (
              <button
                onClick={() => setAmount(walletBalance)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--accent-green)] text-xs hover:text-[var(--accent-green)]"
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

        {/* Position Preview */}
        {amount && parseFloat(amount) > 0 && (
          <div className="bg-[var(--background)] rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">Position Size</span>
              <span className="text-[var(--foreground)] font-medium">
                ${positionSize.toFixed(2)} USD
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">Entry Price</span>
              <span className="text-[var(--foreground)]">${price}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">Liquidation Price</span>
              <span className="text-[var(--accent-red)]">~{liquidationPercent}% from entry</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">Fee (0.1%)</span>
              <span className="text-[var(--foreground)]">{(Number(amount) * 0.001).toFixed(6)} XLM</span>
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

        {/* Error Message */}
        {tradeError && (
          <div className="flex items-start gap-2 bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 rounded-lg p-2.5">
            <AlertCircle className="w-4 h-4 text-[var(--accent-red)] flex-shrink-0 mt-0.5" />
            <span className="text-xs text-[var(--accent-red)]">{tradeError}</span>
          </div>
        )}


        {/* Execute Button */}
        <button
          onClick={handleTrade}
          disabled={isLoading || !address}
          className={`w-full py-2.5 rounded-lg font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
            positionType === "Long"
              ? "bg-[var(--accent-green)] hover:bg-[var(--accent-green)] text-black"
              : "bg-[var(--accent-red)] hover:bg-[#ff5a67] text-[var(--foreground)]"
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            positionType
          )}
        </button>

        {/* RWA Info */}
        <div className="pt-3 border-t border-[var(--card-border)] space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-[var(--text-muted)]">Max Leverage</span>
            <span className="text-[var(--foreground)]">{asset.maxLeverage}x</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[var(--text-muted)]">Oracle</span>
            <span className="text-[#a855f7]">Pyth Network</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[var(--text-muted)]">Asset Type</span>
            <span className={category.color}>{category.label}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[var(--text-muted)]">Trading Fee</span>
            <span className="text-[var(--foreground)]">0.1%</span>
          </div>
        </div>

        {/* RWA Badge */}
        <div className="flex items-center justify-center gap-2 pt-2">
          <span className="text-[10px] px-2 py-1 rounded bg-[#ffd700]/15 text-[#ffd700]">
            RWA Synthetic Perpetual
          </span>
        </div>
      </div>

      {/* Position Success Modal */}
      {openedPosition && (
        <PositionSuccessModal
          isOpen={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false);
            setOpenedPosition(null);
          }}
          asset={asset}
          positionType={openedPosition.positionType}
          leverage={openedPosition.leverage}
          margin={openedPosition.margin}
          entryPrice={openedPosition.entryPrice}
          positionSize={openedPosition.positionSize}
        />
      )}
    </div>
  );
}
