"use client";

import { memo } from "react";
import { ExternalLink, Users, MessageSquare, Heart, Globe, Send } from "lucide-react";
import { IPFSImage } from "./IPFSImage";

export interface TokenData {
  id: string;
  name: string;
  symbol: string;
  image: string;
  price: string;
  marketCap: string;
  age: string;
  ageColor?: string;
  holders?: number;
  transactions?: number;
  comments?: number;
  quotes?: number;
  priceChange?: string;
  volume?: string;
  netChange?: string;
  fundingValue?: string;
  socialLinks?: {
    twitter?: boolean;
    telegram?: boolean;
    website?: boolean;
    tiktok?: boolean;
  };
  metrics?: {
    label: string;
    value: string;
    color?: string;
  }[];
  tags?: string[];
  devAddress?: string;
  walletAddress?: string;
  percentages?: {
    value: string;
    color: "green" | "red" | "yellow" | "gray";
  }[];
  isHot?: boolean;
  rank?: number;
  progressBar?: number;
  isListed?: boolean;
  curvePrice?: string;
  curveProgress?: number;
  daysSinceLaunch?: number;
  buySellRatio?: string;
  topHolderPercent?: string;
  devHolderPercent?: string;
  sniperPercent?: string;
  insiderPercent?: string;
  bundlePercent?: string;
  totalVolume?: string;
  totalTrades?: string;
  totalBuys?: string;
  totalSells?: string;
  // V3 Social link URLs
  websiteUrl?: string;
  twitterUrl?: string;
  telegramUrl?: string;
}

interface TokenCardProps {
  token: TokenData;
  showRank?: boolean;
  onClick?: (token: TokenData) => void;
}

export const TokenCard = memo(function TokenCard({ token, showRank: _showRank = false, onClick }: TokenCardProps) {
  // Reserved for future feature: showing rank badges on tokens
  void _showRank;

  return (
    <div
      onClick={() => onClick?.(token)}
      className="bg-[var(--background)] border border-[var(--card-bg)] rounded-lg p-3 hover:bg-[var(--sidebar-bg)] hover:border-[var(--hover-bg)] transition-all cursor-pointer group"
    >
      {/* Main Content Row */}
      <div className="flex items-start gap-3">
        {/* Token Image */}
        <div className="relative flex-shrink-0">
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-[var(--card-bg)] flex items-center justify-center border border-[#333]">
            {token.image ? (
              <IPFSImage
                src={token.image}
                alt={token.name}
                width={64}
                height={64}
                className="w-full h-full object-cover"
                fallback={<span className="text-2xl">🪙</span>}
              />
            ) : (
              <span className="text-2xl">🪙</span>
            )}
          </div>
          {/* Progress indicator dot */}
          {token.progressBar !== undefined && token.progressBar > 80 && (
            <div className="absolute -bottom-0.5 -right-0.5 bg-[#ff8c00] rounded-full w-2.5 h-2.5 border border-[var(--background)]"></div>
          )}
        </div>

        {/* Token Info - Middle Section */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Row 1: Name, Symbol, Icons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[var(--foreground)] text-sm font-semibold truncate max-w-[100px]">{token.name}</span>
            <span className="text-[var(--text-muted)] text-xs truncate max-w-[80px]">{token.symbol}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                window.open(`https://stellar.expert/explorer/testnet/contract/${token.id}`, '_blank', 'noopener,noreferrer');
              }}
              className="flex-shrink-0 p-0.5 hover:bg-[var(--card-bg)] rounded cursor-pointer"
              title="View on Block Explorer"
            >
              <ExternalLink className="w-3 h-3 text-[#444] hover:text-[var(--card-green)] transition-colors" />
            </button>
            {/* Social Links - only show if URL exists */}
            {token.websiteUrl && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  window.open(token.websiteUrl, '_blank', 'noopener,noreferrer');
                }}
                className="flex-shrink-0 p-0.5 hover:bg-[var(--card-bg)] rounded cursor-pointer"
                title="Website"
              >
                <Globe className="w-3 h-3 text-[var(--text-muted)] hover:text-[#00bfff] transition-colors" />
              </button>
            )}
            {token.twitterUrl && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const url = token.twitterUrl!.startsWith('http')
                    ? token.twitterUrl
                    : `https://x.com/${token.twitterUrl!.replace(/^@/, '')}`;
                  window.open(url, '_blank', 'noopener,noreferrer');
                }}
                className="flex-shrink-0 p-0.5 hover:bg-[var(--card-bg)] rounded cursor-pointer"
                title="X"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-3 h-3 text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors"
                  fill="currentColor"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </button>
            )}
            {token.telegramUrl && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const url = token.telegramUrl!.startsWith('http')
                    ? token.telegramUrl
                    : `https://t.me/${token.telegramUrl!.replace(/^@/, '')}`;
                  window.open(url, '_blank', 'noopener,noreferrer');
                }}
                className="flex-shrink-0 p-0.5 hover:bg-[var(--card-bg)] rounded cursor-pointer"
                title="Telegram"
              >
                <Send className="w-3 h-3 text-[var(--text-muted)] hover:text-[#0088cc] transition-colors" />
              </button>
            )}
            {token.isListed && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--card-green)]/20 text-[var(--card-green)] font-medium">
                🔑
              </span>
            )}
          </div>

          {/* Row 2: Age, Social Stats, Metrics */}
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className={`font-medium ${token.ageColor || 'text-[var(--card-green)]'}`}>
              {token.age}
            </span>

            {/* Social/Holder Icons */}
            <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
              {token.holders !== undefined && (
                <span className="flex items-center gap-0.5">
                  <Users className="w-3 h-3" />
                </span>
              )}
              <span className="flex items-center gap-0.5">
                <MessageSquare className="w-3 h-3" />
              </span>
              <Heart className="w-3 h-3" />
              <span>0</span>
            </div>

            {/* Quote Stats */}
            <span className="text-[var(--text-muted)]">⊙ {token.comments || 0}/{token.quotes || 126}</span>

            {/* F Value */}
            {token.fundingValue && (
              <span className="text-[var(--text-muted)]">
                <span className="text-[#666]">F</span> {token.fundingValue}
              </span>
            )}

            {/* Net Change */}
            {token.netChange && (
              <span className={token.netChange.includes('+') ? 'text-[var(--card-green)]' : token.netChange.includes('-') ? 'text-[var(--accent-red)]' : 'text-[var(--text-muted)]'}>
                N{token.netChange}
              </span>
            )}

            {/* TX Count */}
            {token.transactions !== undefined && (
              <span className="text-[var(--text-muted)]">
                TX<span className="text-[var(--foreground)] ml-0.5">{token.transactions}</span>
              </span>
            )}

            {/* Progress Bar */}
            {token.progressBar !== undefined && (
              <div className="flex items-center gap-1">
                <div className="w-10 h-1.5 bg-[#222] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--card-green)] rounded-full"
                    style={{ width: `${Math.min(token.progressBar, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Row 3: Dev Address */}
          {token.devAddress && (
            <div className="text-xs">
              <span className="text-[var(--card-green)] hover:underline cursor-pointer">
                @{token.devAddress}
              </span>
            </div>
          )}
        </div>

        {/* Right Side - Price & MC */}
        <div className="text-right flex-shrink-0 space-y-1">
          <div className="flex items-center gap-1 justify-end">
            <span className="text-[var(--text-muted)] text-xs">V</span>
            <span className="text-[var(--foreground)] text-sm font-medium">{token.price}</span>
          </div>
          <div className="flex items-center gap-1 justify-end">
            <span className="text-[var(--text-muted)] text-xs">MC</span>
            <span className="text-[var(--card-green)] text-sm font-medium">{token.marketCap}</span>
          </div>
        </div>
      </div>

      {/* Bottom Row - Pills */}
      <div className="flex items-center gap-1.5 mt-2.5">
        {/* Wallet Address */}
        <span className="text-[10px] text-[var(--card-green)]">
          {token.walletAddress || '0x...'}
        </span>

        {/* Percentage Change */}
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--card-green)]/15 text-[var(--card-green)]">
          📈 0%
        </span>

        {/* Days Since Launch */}
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#00bfff]/15 text-[#00bfff]">
          ⚡DS {token.daysSinceLaunch ?? 0}d
        </span>

        {/* Top Holder % */}
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--card-bg)] text-[#666]">
          👤 0%
        </span>

        {/* Ratio */}
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--card-bg)] text-[#666]">
          ⚖️ 0%
        </span>

        {/* Sniper % */}
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--card-bg)] text-[#666]">
          🎯 0%
        </span>

        {/* Insider % */}
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--card-bg)] text-[#666]">
          🔒 0%
        </span>

        {/* Buy Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="ml-auto text-[10px] px-2 py-0.5 rounded bg-[var(--card-green)]/20 text-[var(--card-green)] hover:bg-[var(--card-green)]/30 transition-colors font-medium"
        >
          ⚡ Buy
        </button>
      </div>
    </div>
  );
});
