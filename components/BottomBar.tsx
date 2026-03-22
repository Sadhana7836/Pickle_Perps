"use client";


import { Wallet, TrendingUp, Star, Trophy, BarChart3, AtSign, ChevronDown } from "lucide-react";

export function BottomBar() {
  return (
    <div className="h-9 bg-[var(--sidebar-bg)] border-t border-[var(--card-bg)] flex items-center justify-between px-2 sm:px-3 text-xs overflow-x-auto">
      {/* Left Section */}
      <div className="flex items-center gap-1 min-w-0">
        {/* Settings Icon */}
        <button className="w-6 h-6 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--foreground)] rounded hover:bg-[var(--card-bg)] flex-shrink-0">
          <span className="text-sm">⚙</span>
        </button>

        {/* Wallet Tracker */}
        <button className="flex items-center gap-1.5 bg-[#1a3a2a] border border-[#2a5a3a] text-[var(--accent-green)] px-1.5 sm:px-2.5 py-1 rounded hover:bg-[#1a4a2a] transition-colors flex-shrink-0">
          <Wallet className="w-3.5 h-3.5" />
          <span className="font-medium hidden sm:inline">Wallet Tracker</span>
          <span className="font-medium sm:hidden">Wallet</span>
        </button>

        {/* X Tracker - hidden on mobile */}
        <button className="hidden sm:flex items-center gap-1.5 bg-[var(--card-bg)] border border-[#333] text-[var(--foreground)] px-2.5 py-1 rounded hover:bg-[var(--hover-bg)] transition-colors flex-shrink-0">
          <span className="font-bold">𝕏</span>
          <span className="hidden md:inline">Tracker</span>
        </button>

        {/* Divider - hidden on mobile */}
        <div className="hidden md:block w-px h-4 bg-[#333] mx-1" />

        {/* Holding - hidden on smaller screens */}
        <button className="hidden lg:flex items-center gap-1.5 text-[#888] hover:text-[var(--foreground)] px-2 py-1 rounded hover:bg-[var(--card-bg)] transition-colors">
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Holding</span>
        </button>

        {/* Watchlist - hidden on smaller screens */}
        <button className="hidden lg:flex items-center gap-1.5 text-[#888] hover:text-[var(--foreground)] px-2 py-1 rounded hover:bg-[var(--card-bg)] transition-colors">
          <Star className="w-3.5 h-3.5" />
          <span>Watchlist</span>
        </button>

        {/* Trending - hidden on smaller screens */}
        <button className="hidden xl:flex items-center gap-1.5 text-[#888] hover:text-[var(--foreground)] px-2 py-1 rounded hover:bg-[var(--card-bg)] transition-colors">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Trending</span>
        </button>

        {/* Rank - hidden on smaller screens */}
        <button className="hidden xl:flex items-center gap-1.5 text-[#888] hover:text-[var(--foreground)] px-2 py-1 rounded hover:bg-[var(--card-bg)] transition-colors">
          <Trophy className="w-3.5 h-3.5" />
          <span>Rank</span>
        </button>

        {/* Signal - hidden on smaller screens */}
        <button className="hidden 2xl:flex items-center gap-1.5 text-[#888] hover:text-[var(--foreground)] px-2 py-1 rounded hover:bg-[var(--card-bg)] transition-colors">
          <AtSign className="w-3.5 h-3.5" />
          <span>Signal</span>
        </button>

        {/* Divider - hidden on smaller screens */}
        <div className="hidden lg:block w-px h-4 bg-[#333] mx-1" />

        {/* Network Info */}
        <div className="flex items-center gap-1 text-[#888] flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"><circle cx="128" cy="128" r="128" fill="#000"/><path d="M199.2 73.6l-18.4 9.6c-14.4-13.6-33.6-22.4-55.2-22.4-44 0-79.2 35.2-79.2 79.2 0 8 1.6 16 4 23.2L32 172.8V152l12-6.4c-1.6-5.6-2.4-12-2.4-18.4 0-48 38.4-86.4 86.4-86.4 24 0 45.6 9.6 61.6 25.6l9.6-4.8v11.2zm24 9.6V104l-12 6.4c1.6 5.6 2.4 12 2.4 18.4 0 48-38.4 86.4-86.4 86.4-24 0-45.6-9.6-61.6-25.6l-9.6 4.8v-11.2l18.4-9.6c14.4 13.6 33.6 22.4 55.2 22.4 44 0 79.2-35.2 79.2-79.2 0-8-1.6-16-4-23.2L224 84.8z" fill="white"/></svg>
          <span className="text-[var(--foreground)] font-medium hidden sm:inline">Stellar Testnet</span>
          <span className="text-[var(--foreground)] font-medium sm:hidden">Stellar</span>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
        {/* Status Indicator */}
        <div className="flex items-center gap-1 sm:gap-2 text-[#888]">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[var(--accent-green)] animate-pulse" />
            <span className="text-[var(--accent-green)] hidden sm:inline">Stable</span>
            <span className="text-[var(--text-muted)] hidden md:inline">272 MS</span>
            <span className="text-[#333] hidden md:inline">|</span>
            <span className="text-[var(--text-muted)] hidden md:inline">129 FPS</span>
          </div>
        </div>

        {/* Divider - hidden on mobile */}
        <div className="hidden sm:block w-px h-4 bg-[#333]" />

        {/* Contest - simplified on mobile */}
        <button className="flex items-center gap-1 sm:gap-1.5 text-[#888] hover:text-[var(--foreground)] px-1.5 sm:px-2 py-1 rounded hover:bg-[var(--card-bg)] transition-colors">
          <Trophy className="w-3.5 h-3.5 text-[var(--accent-yellow)]" />
          <span className="hidden sm:inline">Contest</span>
          <span className="bg-[var(--accent-green)] text-black text-[10px] px-1.5 py-0.5 rounded font-medium">S9</span>
        </button>

        {/* About - hidden on mobile */}
        <button className="hidden sm:flex items-center gap-1 text-[#888] hover:text-[var(--foreground)] px-2 py-1 rounded hover:bg-[var(--card-bg)] transition-colors">
          <span>About</span>
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
