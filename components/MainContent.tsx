"use client";


import { TrenchesColumn } from "./TrenchesColumn";
import { RWAColumn } from "./RWAColumn";
import { TrendingColumn } from "./TrendingColumn";
import { TokenData } from "./TokenCard";
import { type RWAAssetConfig } from "@/lib/rwaAssets";
import { RefreshCw } from "lucide-react";
import { useMemeTokens } from "@/hooks/useMemeTokens";
import { useCallback, memo, useEffect } from "react";
import { TokenCardSkeleton } from "./LoadingSkeleton";
import { useAppActions } from "@/lib/store";

interface MainContentProps {
  onTokenSelect?: (token: TokenData) => void;
  onRWASelect?: (asset: RWAAssetConfig) => void;
}

export const MainContent = memo(function MainContent({ onTokenSelect, onRWASelect }: MainContentProps) {
  // useMemeTokens already handles auto-refresh internally via POLLING.TOKENS_REFRESH
  const { tokens: realTokens, isLoading, isRefreshing, isError, refetch } = useMemeTokens();
  const { restoreTokenFromId } = useAppActions();

  // Restore selected token from persisted ID when tokens load
  useEffect(() => {
    if (realTokens.length > 0) {
      restoreTokenFromId(realTokens);
    }
  }, [realTokens, restoreTokenFromId]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Trenches Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--card-bg)] bg-[var(--sidebar-bg)]">
        <div className="flex items-center gap-4">
          {/* Chain Filter Pills */}
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-[#888]">Stellar Testnet</span>
          </div>
        </div>

        {/* Right Side Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className="flex items-center gap-1.5 text-xs text-[#888] hover:text-[var(--foreground)] transition-colors px-2 py-1 rounded hover:bg-[var(--card-bg)] disabled:opacity-50"
            title="Refresh tokens"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Columns Container - Responsive: 1 column on mobile, 2 on tablet, 3 on desktop */}
      <div className="flex-1 flex overflow-x-auto">
        {isError ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-8">
              <div className="w-12 h-12 rounded-full bg-[var(--accent-red)]/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <p className="text-[var(--foreground)] font-medium mb-2">Connection Error</p>
              <p className="text-[var(--text-muted)] text-sm mb-4">Failed to load tokens. Please check your connection.</p>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-[var(--accent-green)] hover:bg-[var(--accent-green)] text-black text-sm font-medium rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : isLoading ? (
          <>
            <div className="flex flex-col h-full min-w-[280px] sm:min-w-[320px] lg:min-w-[350px] xl:min-w-[380px] flex-1 bg-[var(--background)] border-r border-[var(--card-bg)] px-2 py-2 space-y-1.5">
              {[...Array(5)].map((_, i) => (
                <TokenCardSkeleton key={i} />
              ))}
            </div>
            <div className="hidden md:flex flex-col h-full min-w-[280px] sm:min-w-[320px] lg:min-w-[350px] xl:min-w-[380px] flex-1 bg-[var(--background)] border-r border-[var(--card-bg)] px-2 py-2 space-y-1.5">
              {[...Array(5)].map((_, i) => (
                <TokenCardSkeleton key={i} />
              ))}
            </div>
            <div className="hidden lg:flex flex-col h-full min-w-[280px] sm:min-w-[320px] lg:min-w-[350px] xl:min-w-[380px] flex-1 bg-[var(--background)] px-2 py-2 space-y-1.5">
              {[...Array(5)].map((_, i) => (
                <TokenCardSkeleton key={i} />
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Column 1: Tokens - always visible */}
            <TrenchesColumn
              title="Tokens"
              subtitle="All Tokens"
              tokens={realTokens}
              onTokenSelect={onTokenSelect}
            />

            {/* Column 2: RWA - hidden on mobile */}
            <RWAColumn onAssetSelect={onRWASelect} useDetailPage={!!onRWASelect} />

            {/* Column 3: Trending - hidden on mobile and tablet */}
            <TrendingColumn
              tokens={realTokens}
              onTokenSelect={onTokenSelect}
              onRWASelect={onRWASelect}
            />
          </>
        )}
      </div>
    </div>
  );
});
