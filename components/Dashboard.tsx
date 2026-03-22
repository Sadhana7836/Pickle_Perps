"use client";

import { useCallback, useEffect, lazy, Suspense, memo } from "react";
import { MainContent } from "./MainContent";
import { TokenData } from "./TokenCard";
import { type RWAAssetConfig } from "@/lib/rwaAssets";
import {
  useSelectedToken,
  useSelectedRWA,
  useAppActions,
  useHydration,
  useURLSync
} from "@/lib/store";
import { getAssetById } from "@/lib/rwaAssets";

// Lazy load heavy components
const TokenDetailPage = lazy(() => import("./TokenDetailPage").then(m => ({ default: m.TokenDetailPage })));
const RWADetailPage = lazy(() => import("./RWADetailPage").then(m => ({ default: m.RWADetailPage })));

// Memoized loading fallback
const LoadingFallback = memo(function LoadingFallback() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[var(--accent-green)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
});

export function Dashboard() {
  // Wait for hydration to complete
  const hydrated = useHydration();

  // Use Zustand store for persisted state
  const selectedToken = useSelectedToken();
  const selectedRWA = useSelectedRWA();
  const { setSelectedToken, setSelectedRWA } = useAppActions();

  // Sync state to URL for sharing
  useURLSync();

  // Handle URL-based RWA restoration (RWAs are static, so we can resolve immediately)
  useEffect(() => {
    if (!hydrated) return;

    const pendingRwaId = sessionStorage.getItem('pendingRwaId');
    if (pendingRwaId) {
      const asset = getAssetById(pendingRwaId);
      if (asset) {
        setSelectedRWA(asset);
      }
      sessionStorage.removeItem('pendingRwaId');
    }
  }, [hydrated, setSelectedRWA]);

  // All hooks must be called before any conditional returns
  const handleTokenSelect = useCallback((token: TokenData | null) => {
    setSelectedToken(token);
  }, [setSelectedToken]);

  const handleRWASelect = useCallback((asset: RWAAssetConfig | null) => {
    setSelectedRWA(asset);
  }, [setSelectedRWA]);

  // Show loading while hydrating to prevent flash
  if (!hydrated) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <div className="w-8 h-8 border-2 border-[var(--accent-green)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Main Content - Either Trenches, Token Detail, or RWA Detail */}
      {selectedToken ? (
        <Suspense fallback={<LoadingFallback />}>
          <TokenDetailPage token={selectedToken} onBack={() => handleTokenSelect(null)} />
        </Suspense>
      ) : selectedRWA ? (
        <Suspense fallback={<LoadingFallback />}>
          <RWADetailPage asset={selectedRWA} onBack={() => handleRWASelect(null)} />
        </Suspense>
      ) : (
        <MainContent onTokenSelect={handleTokenSelect} onRWASelect={handleRWASelect} />
      )}
    </>
  );
}
