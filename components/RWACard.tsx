"use client";

import { memo } from "react";
import Image from "next/image";
import { TrendingUp, TrendingDown, Globe } from "lucide-react";
import { type RWAAssetConfig, CATEGORY_CONFIG } from "@/lib/rwaAssets";
import { useRWAPrice } from "@/hooks/useRWAPerpetualTrading";

interface RWACardProps {
  asset: RWAAssetConfig;
  onClick?: (asset: RWAAssetConfig) => void;
}

export const RWACard = memo(function RWACard({ asset, onClick }: RWACardProps) {
  const { price, change24h, isLive } = useRWAPrice(asset.id);
  const isPositive = change24h >= 0;
  const category = CATEGORY_CONFIG[asset.category];

  return (
    <div
      onClick={() => onClick?.(asset)}
      className="bg-[var(--background)] border border-[var(--card-bg)] rounded-lg p-3 hover:bg-[var(--sidebar-bg)] hover:border-[var(--hover-bg)] transition-all cursor-pointer group"
    >
      {/* Main Content Row */}
      <div className="flex items-start gap-3">
        {/* Asset Icon */}
        <div className="relative flex-shrink-0">
          <div className="w-14 h-14 rounded-lg overflow-hidden bg-[var(--card-bg)] flex items-center justify-center border border-[#333]">
            <Image
              src={asset.image}
              alt={asset.name}
              width={40}
              height={40}
              className="object-contain"
              unoptimized
            />
          </div>
          {/* Live indicator */}
          <div className={`absolute -bottom-0.5 -right-0.5 rounded-full w-2.5 h-2.5 border border-[var(--background)] ${isLive ? 'bg-[var(--card-green)] animate-pulse' : 'bg-[#ff8c00]'}`}></div>
        </div>

        {/* Asset Info - Middle Section */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Row 1: Name, Symbol */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-white text-sm font-semibold truncate max-w-[120px]">{asset.name}</span>
            <span className="text-[#555] text-xs">{asset.symbol}</span>
            <Globe className="w-3 h-3 text-[#444] hover:text-[#888] flex-shrink-0" />
          </div>

          {/* Row 2: Category, Oracle */}
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className={`px-1.5 py-0.5 rounded ${category.bgColor} ${category.color} font-medium`}>
              {category.label}
            </span>
            <span className="text-[#555]">
              via <span className="text-[#888]">Pyth</span>
            </span>
          </div>

          {/* Row 3: Max Leverage */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#555]">Max Leverage:</span>
            <span className="text-white">{asset.maxLeverage}x</span>
          </div>
        </div>

        {/* Right Side - Price & Change */}
        <div className="text-right flex-shrink-0 space-y-1">
          <div className="text-white text-sm font-medium">${price}</div>
          <div className={`flex items-center gap-0.5 justify-end text-sm ${isPositive ? 'text-[var(--card-green)]' : 'text-[var(--accent-red)]'}`}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span className="font-medium">{isPositive ? '+' : ''}{change24h.toFixed(2)}%</span>
          </div>
          {!isLive && (
            <span className="text-[10px] text-[#ff8c00]">Demo</span>
          )}
        </div>
      </div>

      {/* Bottom Row - Actions */}
      <div className="flex items-center gap-1.5 mt-2.5">
        {/* Oracle Badge */}
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#a855f7]/15 text-[#a855f7]">
          Pyth Oracle
        </span>

        {/* RWA Badge */}
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#ffd700]/15 text-[#ffd700]">
          RWA Synthetic
        </span>

        {/* Description truncated */}
        <span className="text-[10px] text-[#555] truncate max-w-[80px]" title={asset.description}>
          {asset.description.split(' ').slice(0, 3).join(' ')}...
        </span>

        {/* Trade Buttons */}
        <div className="ml-auto flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick?.(asset);
            }}
            className="text-[10px] px-2 py-0.5 rounded bg-[var(--card-green)]/20 text-[var(--card-green)] hover:bg-[var(--card-green)]/30 transition-colors font-medium"
          >
            Long
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick?.(asset);
            }}
            className="text-[10px] px-2 py-0.5 rounded bg-[var(--accent-red)]/20 text-[var(--accent-red)] hover:bg-[var(--accent-red)]/30 transition-colors font-medium"
          >
            Short
          </button>
        </div>
      </div>
    </div>
  );
});
