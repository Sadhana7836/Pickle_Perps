"use client";

import { useState, useMemo } from "react";
import { usePosition } from "@/hooks/usePerpetualTrading";

interface PositionsListProps {
  positionIds: bigint[];
  tokenAddress: string;
  onClosePosition: (positionId: number) => Promise<void>;
}

interface PositionCardProps {
  positionId: number;
  tokenAddress: string;
  onClose: (positionId: number) => Promise<void>;
}

function PositionCard({ positionId, tokenAddress, onClose }: PositionCardProps) {
  const positionData = usePosition(positionId);
  const [isClosing, setIsClosing] = useState(false);

  if (!positionData || !positionData.position.isOpen) {
    return null;
  }

  const { position, pnl, isProfit, liquidationPrice, shouldLiquidate } = positionData;

  // Only show positions for this token
  if (position.token.toLowerCase() !== tokenAddress.toLowerCase()) {
    return null;
  }

  const handleClose = async () => {
    if (confirm("Are you sure you want to close this position?")) {
      setIsClosing(true);
      try {
        await onClose(positionId);
      } finally {
        setIsClosing(false);
      }
    }
  };

  return (
    <div className={`bg-[var(--card-bg)] rounded-lg p-3 border ${shouldLiquidate ? 'border-[var(--accent-red)]' : 'border-[#222]'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold ${position.isLong ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
            {position.isLong ? 'LONG' : 'SHORT'}
          </span>
          <span className="text-[#888] text-xs">{position.leverage}x</span>
        </div>
        {shouldLiquidate && (
          <span className="text-[var(--accent-red)] text-xs font-bold">LIQUIDATION RISK</span>
        )}
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-[#555]">Size</span>
          <span className="text-white">${parseFloat(position.size).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#555]">Margin</span>
          <span className="text-white">${parseFloat(position.margin).toFixed(4)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#555]">Entry Price</span>
          <span className="text-white">${(parseFloat(position.entryPrice) / 1e8).toFixed(8)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#555]">Liquidation Price</span>
          <span className="text-[var(--accent-red)]">${(parseFloat(liquidationPrice) / 1e8).toFixed(8)}</span>
        </div>
        <div className="flex justify-between border-t border-[#222] pt-1.5 mt-1.5">
          <span className="text-[#555]">Unrealized PnL</span>
          <span className={isProfit ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}>
            {isProfit ? '+' : '-'}${parseFloat(pnl).toFixed(4)}
          </span>
        </div>
      </div>

      <button
        onClick={handleClose}
        disabled={isClosing}
        className="w-full mt-3 py-2 bg-[var(--accent-red)] hover:bg-[#ff5a67] disabled:opacity-50 text-white text-xs font-bold rounded transition-colors"
      >
        {isClosing ? 'Closing...' : 'Close Position'}
      </button>
    </div>
  );
}

export function PositionsList({ positionIds, tokenAddress, onClosePosition }: PositionsListProps) {
  // Memoize the position IDs to prevent unnecessary re-renders
  const openPositions = useMemo(() =>
    positionIds.map(id => Number(id)).filter(id => id > 0),
    [positionIds]
  );

  if (openPositions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[#555] text-sm py-8">
        No open positions
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {openPositions.map((positionId) => (
        <PositionCard
          key={positionId}
          positionId={positionId}
          tokenAddress={tokenAddress}
          onClose={onClosePosition}
        />
      ))}
    </div>
  );
}
