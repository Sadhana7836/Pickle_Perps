"use client";

import { memo, useState, useCallback, useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { RWACard } from "./RWACard";
import { RWATradingModal } from "./RWATradingModal";
import { RWA_ASSETS, type RWAAssetConfig, type RWACategory } from "@/lib/rwaAssets";

interface RWAColumnProps {
  onAssetSelect?: (asset: RWAAssetConfig) => void;
  useDetailPage?: boolean;
}

export const RWAColumn = memo(function RWAColumn({ onAssetSelect, useDetailPage = true }: RWAColumnProps) {
  const [selectedAsset, setSelectedAsset] = useState<RWAAssetConfig | null>(null);
  const [showTradingModal, setShowTradingModal] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<RWACategory | "all">("all");

  const handleAssetClick = useCallback((asset: RWAAssetConfig) => {
    if (useDetailPage && onAssetSelect) {
      // Navigate to detail page
      onAssetSelect(asset);
    } else {
      // Open trading modal
      setSelectedAsset(asset);
      setShowTradingModal(true);
      onAssetSelect?.(asset);
    }
  }, [onAssetSelect, useDetailPage]);

  const handleCloseModal = useCallback(() => {
    setShowTradingModal(false);
    setSelectedAsset(null);
  }, []);

  const handleFilterAll = useCallback(() => setCategoryFilter("all"), []);
  const handleFilterCommodity = useCallback(() => setCategoryFilter("commodity"), []);
  const handleFilterForex = useCallback(() => setCategoryFilter("forex"), []);
  const handleFilterIndex = useCallback(() => setCategoryFilter("index"), []);
  const handleFilterEquity = useCallback(() => setCategoryFilter("equity"), []);

  // Filter assets by category
  const filteredAssets = useMemo(() => {
    if (categoryFilter === "all") return RWA_ASSETS;
    return RWA_ASSETS.filter((asset) => asset.category === categoryFilter);
  }, [categoryFilter]);

  return (
    <div className="hidden md:flex flex-col h-full min-w-[280px] sm:min-w-[320px] lg:min-w-[350px] xl:min-w-[380px] flex-1 bg-[var(--background)] border-r border-[var(--card-bg)] last:border-r-0">
      {/* Column Header */}
      <div className="px-3 py-2 border-b border-[var(--card-bg)] bg-[var(--sidebar-bg)] h-12 flex items-center">
        <div className="flex items-center justify-between gap-3 w-full">
          {/* Category Pills */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleFilterAll}
              className={`text-xs px-2 py-1 rounded font-medium transition-colors ${
                categoryFilter === "all"
                  ? "bg-[var(--card-bg)] border border-[#333] text-[var(--foreground)]"
                  : "bg-transparent text-[var(--text-muted)] hover:text-[var(--foreground)]"
              }`}
            >
              All
            </button>
            <button
              onClick={handleFilterCommodity}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                categoryFilter === "commodity"
                  ? "bg-[#ffd700]/20 text-[#ffd700]"
                  : "bg-transparent text-[#ffd700]/60 hover:text-[#ffd700]"
              }`}
            >
              Commodity
            </button>
            <button
              onClick={handleFilterForex}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                categoryFilter === "forex"
                  ? "bg-[#00bfff]/20 text-[#00bfff]"
                  : "bg-transparent text-[#00bfff]/60 hover:text-[#00bfff]"
              }`}
            >
              Forex
            </button>
            <button
              onClick={handleFilterIndex}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                categoryFilter === "index"
                  ? "bg-[#a855f7]/20 text-[#a855f7]"
                  : "bg-transparent text-[#a855f7]/60 hover:text-[#a855f7]"
              }`}
            >
              Index
            </button>
            <button
              onClick={handleFilterEquity}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                categoryFilter === "equity"
                  ? "bg-[var(--accent-green)]/20 text-[var(--accent-green)]"
                  : "bg-transparent text-[var(--accent-green)]/60 hover:text-[var(--accent-green)]"
              }`}
            >
              Equity
            </button>
          </div>

          {/* Title */}
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#ffd700]" />
            <span className="text-[var(--foreground)] font-semibold text-sm whitespace-nowrap">RWA Synthetics</span>
          </div>
        </div>
      </div>

      {/* Asset List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5 scrollbar-thin scrollbar-thumb-[#333] scrollbar-track-transparent">
        {filteredAssets.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-[var(--text-muted)] text-sm">
            No assets found
          </div>
        ) : (
          filteredAssets.map((asset) => (
            <RWACard
              key={asset.id}
              asset={asset}
              onClick={handleAssetClick}
            />
          ))
        )}
      </div>

      {/* Footer Info */}
      <div className="px-3 py-2 border-t border-[var(--card-bg)] bg-[var(--sidebar-bg)]">
        <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
          <span>Powered by Pyth Network Oracle</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)] animate-pulse"></span>
            Live prices
          </span>
        </div>
      </div>

      {/* Trading Modal - only show when not using detail page */}
      {!useDetailPage && selectedAsset && (
        <RWATradingModal
          isOpen={showTradingModal}
          onClose={handleCloseModal}
          asset={selectedAsset}
        />
      )}
    </div>
  );
});
