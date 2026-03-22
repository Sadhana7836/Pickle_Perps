import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { useEffect, useState } from 'react';
import type { TokenData } from '@/components/TokenCard';
import type { RWAAssetConfig } from '@/lib/rwaAssets';
import type { ThemeId } from '@/lib/themes';

interface AppState {
  // Selected trading item (full objects for current session)
  selectedToken: TokenData | null;
  selectedRWA: RWAAssetConfig | null;

  // Persisted IDs only (lightweight)
  selectedTokenId: string | null;
  selectedRWAId: string | null;

  // UI State
  searchQuery: string;
  showMintModal: boolean;
  sidebarOpen: boolean;
  theme: ThemeId;

  // Actions
  setSelectedToken: (token: TokenData | null) => void;
  setSelectedRWA: (asset: RWAAssetConfig | null) => void;
  setSearchQuery: (query: string) => void;
  setShowMintModal: (show: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setTheme: (theme: ThemeId) => void;

  // Clear selection
  clearSelection: () => void;

  // Restore from ID (called after hydration when token list is available)
  restoreTokenFromId: (tokens: TokenData[]) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      selectedToken: null,
      selectedRWA: null,
      selectedTokenId: null,
      selectedRWAId: null,
      searchQuery: '',
      showMintModal: false,
      sidebarOpen: true,
      theme: 'default' as ThemeId,

      // Actions
      setSelectedToken: (token) => set({
        selectedToken: token,
        selectedTokenId: token?.id ?? null,
        selectedRWA: null,
        selectedRWAId: null,
      }),

      setSelectedRWA: (asset) => set({
        selectedRWA: asset,
        selectedRWAId: asset?.id ?? null,
        selectedToken: null,
        selectedTokenId: null,
      }),

      setSearchQuery: (query) => set({ searchQuery: query }),

      setShowMintModal: (show) => set({ showMintModal: show }),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      setTheme: (theme) => set({ theme }),

      clearSelection: () => set({
        selectedToken: null,
        selectedTokenId: null,
        selectedRWA: null,
        selectedRWAId: null,
      }),

      // Restore full token object from persisted ID
      restoreTokenFromId: (tokens: TokenData[]) => {
        const { selectedTokenId, selectedToken } = get();
        // Only restore if we have an ID but no full object
        if (selectedTokenId && !selectedToken) {
          const token = tokens.find(t => t.id === selectedTokenId);
          if (token) {
            set({ selectedToken: token });
          }
        }
      },
    }),
    {
      name: 'stellaperps-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist lightweight IDs, not full objects
        selectedTokenId: state.selectedTokenId,
        selectedRWAId: state.selectedRWAId,
        searchQuery: state.searchQuery,
        theme: state.theme,
        // Don't persist: selectedToken, selectedRWA, showMintModal
      }),
    }
  )
);

// Selector hooks for better performance (prevents unnecessary re-renders)
export const useSelectedToken = () => useAppStore((state) => state.selectedToken);
export const useSelectedRWA = () => useAppStore((state) => state.selectedRWA);
export const useSearchQuery = () => useAppStore((state) => state.searchQuery);
export const useShowMintModal = () => useAppStore((state) => state.showMintModal);
export const useSidebarOpen = () => useAppStore((state) => state.sidebarOpen);
export const useTheme = () => useAppStore((state) => state.theme);

// Actions - use useShallow to prevent infinite loops
export const useAppActions = () => useAppStore(
  useShallow((state) => ({
    setSelectedToken: state.setSelectedToken,
    setSelectedRWA: state.setSelectedRWA,
    setSearchQuery: state.setSearchQuery,
    setShowMintModal: state.setShowMintModal,
    setSidebarOpen: state.setSidebarOpen,
    toggleSidebar: state.toggleSidebar,
    clearSelection: state.clearSelection,
    restoreTokenFromId: state.restoreTokenFromId,
    setTheme: state.setTheme,
  }))
);

// Hydration hook to prevent SSR mismatches
export const useHydration = () => {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Wait for Zustand to rehydrate from localStorage
    const unsubFinishHydration = useAppStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });

    // Check if already hydrated
    if (useAppStore.persist.hasHydrated()) {
      setHydrated(true);
    }

    return () => {
      unsubFinishHydration();
    };
  }, []);

  return hydrated;
};

// URL sync hook - syncs selectedToken/RWA to URL for sharing
export const useURLSync = () => {
  const selectedToken = useSelectedToken();
  const selectedRWA = useSelectedRWA();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const url = new URL(window.location.href);

    // Clear existing params
    url.searchParams.delete('token');
    url.searchParams.delete('rwa');

    // Set params based on selection
    if (selectedToken) {
      url.searchParams.set('token', selectedToken.id);
    } else if (selectedRWA) {
      url.searchParams.set('rwa', selectedRWA.id);
    }

    // Update URL without page reload
    window.history.replaceState({}, '', url.toString());
  }, [selectedToken, selectedRWA]);
};

// Hook to restore state from URL on initial load
export const useURLRestore = () => {
  const hydrated = useHydration();

  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    const tokenId = url.searchParams.get('token');
    const rwaId = url.searchParams.get('rwa');

    // URL params take precedence over localStorage
    // Token will be fetched and set by the component that can resolve the ID
    if (tokenId) {
      // Store the token ID - Dashboard will resolve it
      sessionStorage.setItem('pendingTokenId', tokenId);
    } else if (rwaId) {
      // For RWA, we can resolve immediately since it's static
      sessionStorage.setItem('pendingRwaId', rwaId);
    }
  }, [hydrated]);
};
