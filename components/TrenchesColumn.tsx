"use client";

import { memo, useCallback, useState, useMemo } from "react";
import { Search } from "lucide-react";
import { TokenCard, TokenData } from "./TokenCard";

interface TrenchesColumnProps {
  title: string;
  subtitle?: string;
  tokens: TokenData[];
  showFilters?: boolean;
  onTokenSelect?: (token: TokenData) => void;
}

export const TrenchesColumn = memo(function TrenchesColumn({ title, subtitle, tokens, showFilters: _showFilters = true, onTokenSelect }: TrenchesColumnProps) {
  // showFilters is used to conditionally render filter controls (currently always shown)
  void _showFilters;

  const [searchQuery, setSearchQuery] = useState("");

  // Filter tokens based on local search
  const filteredTokens = useMemo(() => {
    if (!searchQuery.trim()) return tokens;
    const query = searchQuery.toLowerCase();
    return tokens.filter(token =>
      token.name.toLowerCase().includes(query) ||
      token.symbol.toLowerCase().includes(query)
    );
  }, [tokens, searchQuery]);

  // Memoize the click handler to prevent recreating on every render
  const handleTokenClick = useCallback((token: TokenData) => {
    onTokenSelect?.(token);
  }, [onTokenSelect]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  return (
    <div className="flex flex-col h-full min-w-[280px] sm:min-w-[320px] lg:min-w-[350px] xl:min-w-[380px] flex-1 bg-[var(--background)] border-r border-[var(--card-bg)] last:border-r-0">
      {/* Column Header */}
      <div className="px-3 py-2 border-b border-[var(--card-bg)] bg-[var(--sidebar-bg)] h-12 flex items-center">
        <div className="flex items-center justify-between gap-3 w-full">
          {/* Search */}
          <div className={`flex items-center bg-transparent border border-[var(--accent-primary)]/30 rounded-lg px-3 py-1.5 gap-2 w-[200px] text-[var(--text-muted)]`}>
            <Search className="w-4 h-4 text-[#555]" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search..."
              className="bg-transparent text-sm text-white placeholder-[#555] outline-none w-full"
            />
          </div>

          {/* Title */}
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold text-sm whitespace-nowrap">{title}</span>
            {subtitle && <span className="text-[#666] text-xs whitespace-nowrap">{subtitle}</span>}
          </div>
        </div>
      </div>

      {/* Token List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5 scrollbar-thin scrollbar-thumb-[#333] scrollbar-track-transparent">
        {filteredTokens.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[#555] text-sm">
            {searchQuery ? `No results for "${searchQuery}"` : "No tokens found"}
          </div>
        ) : (
          filteredTokens.map((token) => (
            <TokenCard
              key={token.id}
              token={token}
              onClick={handleTokenClick}
            />
          ))
        )}
      </div>
    </div>
  );
});
