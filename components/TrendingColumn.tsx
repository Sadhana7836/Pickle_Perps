"use client";

import { memo, useState, useMemo, useCallback } from "react";
import { Flame } from "lucide-react";
import { TokenCard, TokenData } from "./TokenCard";
import { RWACard } from "./RWACard";
import { RWA_ASSETS, type RWAAssetConfig } from "@/lib/rwaAssets";

type TrendingItem =
  | { type: "token"; data: TokenData; score: number }
  | { type: "rwa"; data: RWAAssetConfig; score: number };

interface TrendingColumnProps {
  tokens: TokenData[];
  onTokenSelect?: (token: TokenData) => void;
  onRWASelect?: (asset: RWAAssetConfig) => void;
}

export const TrendingColumn = memo(function TrendingColumn({
  tokens,
  onTokenSelect,
  onRWASelect
}: TrendingColumnProps) {
  const [filter, setFilter] = useState<"all" | "tokens" | "rwa">("all");

  // Memoize filter handlers
  const handleFilterAll = useCallback(() => setFilter("all"), []);
  const handleFilterTokens = useCallback(() => setFilter("tokens"), []);
  const handleFilterRWA = useCallback(() => setFilter("rwa"), []);
  
  // Static RWA scores - deterministic based on asset properties (no Math.random to prevent re-renders)
  const rwaScores = useMemo(() => {
    return RWA_ASSETS.map((asset) => {
      let baseScore = 50;
      if (asset.category === "equity") baseScore = 80;
      if (asset.category === "commodity") baseScore = 70;
      if (asset.id === "nvidia" || asset.id === "tesla") baseScore = 90;
      if (asset.id === "gold") baseScore = 75;

      // Use deterministic variation based on asset id hash instead of random
      const idHash = asset.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const variation = (idHash % 20);

      return {
        type: "rwa" as const,
        data: asset,
        score: baseScore + variation,
      };
    });
  }, []); // Only calculate once on mount

  // Create trending items combining tokens and RWA
  const trendingItems = useMemo(() => {
    const items: TrendingItem[] = [];

    // Add tokens with trending score based on volume and price change
    tokens.forEach((token) => {
      const volumeScore = token.volume ? parseFloat(token.volume) / 1000 : 0;
      const priceChangeScore = token.priceChange ? Math.abs(parseFloat(token.priceChange)) * 10 : 0;
      const progressScore = (token.progressBar || 0) * 2;
      const score = volumeScore + priceChangeScore + progressScore;

      items.push({
        type: "token",
        data: token,
        score,
      });
    });

    // Add pre-calculated RWA scores
    items.push(...rwaScores);

    // Sort by score (highest first)
    items.sort((a, b) => b.score - a.score);

    return items;
  }, [tokens, rwaScores]);

  // Filter items based on filter type
  const filteredItems = useMemo(() => {
    return trendingItems.filter((item) => {
      // Filter by type
      if (filter === "tokens" && item.type !== "token") return false;
      if (filter === "rwa" && item.type !== "rwa") return false;
      return true;
    });
  }, [trendingItems, filter]);

  return (
    <div className="hidden lg:flex flex-col h-full min-w-[280px] sm:min-w-[320px] lg:min-w-[350px] xl:min-w-[380px] flex-1 bg-[var(--background)] border-r border-[var(--card-bg)] last:border-r-0">
      {/* Column Header */}
      <div className="px-3 py-2 border-b border-[var(--card-bg)] bg-[var(--sidebar-bg)] h-12 flex items-center">
        <div className="flex items-center justify-between gap-3 w-full">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleFilterAll}
              className={`text-xs px-2 py-1 rounded font-medium transition-colors ${
                filter === "all"
                  ? "bg-[#ff6b35]/20 text-[#ff6b35] border border-[#ff6b35]/30"
                  : "bg-transparent text-[var(--text-muted)] hover:text-[var(--foreground)]"
              }`}
            >
              All
            </button>
            <button
              onClick={handleFilterTokens}
              className={`text-xs px-2 py-1 rounded font-medium transition-colors ${
                filter === "tokens"
                  ? "bg-[var(--accent-green)]/20 text-[var(--accent-green)] border border-[var(--accent-green)]/30"
                  : "bg-transparent text-[var(--text-muted)] hover:text-[var(--foreground)]"
              }`}
            >
              Tokens
            </button>
            <button
              onClick={handleFilterRWA}
              className={`text-xs px-2 py-1 rounded font-medium transition-colors ${
                filter === "rwa"
                  ? "bg-[#ffd700]/20 text-[#ffd700] border border-[#ffd700]/30"
                  : "bg-transparent text-[var(--text-muted)] hover:text-[var(--foreground)]"
              }`}
            >
              RWA
            </button>
          </div>

          {/* Title */}
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-[#ff6b35]" />
            <span className="text-[var(--foreground)] font-semibold text-sm whitespace-nowrap">Trending</span>
          </div>
        </div>
      </div>

      {/* Trending List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5 scrollbar-thin scrollbar-thumb-[#333] scrollbar-track-transparent">
        {filteredItems.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-[var(--text-muted)] text-sm">
            No trending items found
          </div>
        ) : (
          filteredItems.map((item) => (
            item.type === "token" ? (
              <TokenCard
                key={`token-${(item.data as TokenData).id}`}
                token={item.data as TokenData}
                onClick={onTokenSelect}
              />
            ) : (
              <RWACard
                key={`rwa-${(item.data as RWAAssetConfig).id}`}
                asset={item.data as RWAAssetConfig}
                onClick={onRWASelect}
              />
            )
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-[var(--card-bg)] bg-[var(--sidebar-bg)]">
        <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
          <span>Mixed trending assets</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff6b35] animate-pulse"></span>
            {filteredItems.length} items
          </span>
        </div>
      </div>
    </div>
  );
});
