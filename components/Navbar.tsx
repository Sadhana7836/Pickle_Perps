"use client";

import { memo, useCallback, useState, useRef, useEffect } from "react";
import { Search, Flame, Star, Settings, ChevronDown, Wallet, X, Menu, Palette } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAppActions, useSearchQuery, useTheme } from "@/lib/store";
import { useStellarWallet } from "@/contexts/StellarContext";
import { themes } from "@/lib/themes";
import type { ThemeId } from "@/lib/themes";

const navLinks = [
  { name: "Trenches", href: "/", active: true },
  { name: "Create Token", href: "/create", active: false },
  { name: "CopyTrade", href: "/copy-trading" },
  { name: "Monitor", href: "/monitor" },
  { name: "Portfolio", href: "/portfolio" },
  { name: "Leaderboard", href: "/leaderboard" },
];

function WalletButton() {
  const { address: walletAddress, isConnected: walletConnected, isConnecting, balance: walletBalance, connect, disconnect } = useStellarWallet();

  if (!walletConnected) {
    return (
      <button
        onClick={connect}
        disabled={isConnecting}
        className="flex items-center gap-1.5 bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] border border-[var(--card-border)] hover:border-[var(--accent-primary)]/50 text-[var(--foreground)] text-xs px-3 py-1.5 rounded-lg transition-all"
      >
        <Wallet className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
        <span>{isConnecting ? 'Connecting...' : 'Connect'}</span>
      </button>
    );
  }

  return (
    <button
      onClick={disconnect}
      className="flex items-center gap-2 bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] border border-[var(--card-border)] text-xs px-2.5 py-1.5 rounded-lg transition-all group"
    >
      <div className="w-5 h-5 rounded-full bg-[var(--accent-primary)] flex items-center justify-center">
        <span className="text-[10px] text-black font-bold">
          {walletAddress?.charAt(0)?.toUpperCase() || "S"}
        </span>
      </div>
      <span className="text-[#888] group-hover:text-[var(--foreground)] transition-colors">
        {walletAddress ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}` : ''}
      </span>
      <div className="w-px h-3 bg-[var(--card-border)]" />
      <span className="text-[var(--accent-primary)]">{walletBalance} XLM</span>
    </button>
  );
}

function ThemeSwitcher() {
  const currentTheme = useTheme();
  const { setTheme } = useAppActions();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative hidden sm:block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-lg hover:bg-[var(--card-bg)] text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors"
        title="Switch theme"
      >
        <Palette className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-50 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-2 shadow-2xl w-44">
          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider px-2 pb-1.5">Theme</p>
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTheme(t.id as ThemeId); setOpen(false); }}
              className={`flex items-center gap-2.5 w-full px-2 py-1.5 rounded-lg text-xs transition-colors ${
                currentTheme === t.id
                  ? "bg-[var(--hover-bg)] text-[var(--foreground)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
              }`}
            >
              <span
                className="w-3 h-3 rounded-full flex-shrink-0 ring-1 ring-white/10"
                style={{ background: t.preview }}
              />
              {t.name}
              {currentTheme === t.id && <span className="ml-auto text-[var(--accent-primary)]">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export const Navbar = memo(function Navbar() {
  const pathname = usePathname();
  const [showAppModal, setShowAppModal] = useState(false);
  const searchQuery = useSearchQuery();
  const { toggleSidebar, setSearchQuery, setSelectedToken } = useAppActions();

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, [setSearchQuery]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
  }, [setSearchQuery]);

  return (
    <nav className="flex items-center justify-between px-2 sm:px-4 py-2 bg-[var(--background)] border-b border-[var(--card-bg)] h-16">
      {/* Left Section - Logo and Nav Links */}
      <div className="flex items-center gap-2 sm:gap-4 lg:gap-6">
        {/* Hamburger Menu - visible on smaller screens */}
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg hover:bg-[var(--card-bg)] xl:hidden"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5 text-gray-400" />
        </button>

        {/* Logo */}
        <Link href="/" onClick={() => setSelectedToken(null)} className="flex items-center gap-2 hover:opacity-80 transition-opacity group">
          <Image
            src="/logo.svg"
            alt="PicklePerps - Decentralized perpetual trading platform"
            width={36}
            height={36}
            className="object-contain transition-transform group-hover:scale-105 pb-1"
            priority
          />
          {/* <span className="rounded-full bg-[var(--accent-primary)] text-sm p-2 text-black font-bold aspect-square">PP</span> */}
          <span className="text-[var(--foreground)] text-base lg:text-lg font-bold hidden sm:inline">PicklePerps</span>
        </Link>

        {/* Nav Links - hidden on mobile, visible on larger screens */}
        <div className="hidden lg:flex items-center gap-2 xl:gap-4">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`text-xs xl:text-sm hover:text-[var(--accent-primary)] transition-colors whitespace-nowrap ${
                  isActive ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Right Section - Search, Icons, Wallet */}
      <div className="flex items-center gap-1.5 sm:gap-3">
        {/* Search Bar - responsive width */}
        <div className={`flex items-center bg-transparent border border-[var(--accent-primary)]/30 rounded-full px-2 sm:px-3 py-1.5 gap-2 w-[120px] sm:w-[180px] lg:w-[240px] transition-colors`}>
          <Search className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search..."
            className="bg-transparent text-xs sm:text-sm text-[var(--foreground)] placeholder-[var(--text-muted)] outline-none w-full min-w-0"
          />
          {searchQuery ? (
            <button onClick={handleClearSearch} className="text-[#888] hover:text-[var(--foreground)] flex-shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="text-[var(--text-muted)] text-xs hidden sm:inline">/</span>
          )}
        </div>

        {/* Cooking Icon - hidden on mobile
        <div className="hidden md:flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--foreground)] cursor-pointer">
          <Flame className="w-4 h-4" />
          <span className="text-xs text-[#ff6b35]">Cooking</span>
        </div>

        {/* APP Button - hidden on mobile */}
        {/* <button
          onClick={() => setShowAppModal(true)}
          className="hidden sm:flex items-center gap-1 bg-[var(--card-bg)] rounded px-2 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--hover-bg)] transition-colors"
        >
          <span className="text-[var(--accent-green)]">📱</span>
          <span className="hidden md:inline">APP</span>
        </button> */}


        {/* Icons - hidden on small screens */}
        {/* <Star className="w-4 h-4 text-[var(--text-muted)] hover:text-yellow-400 cursor-pointer hidden sm:block" />
        <Settings className="w-4 h-4 text-[var(--text-muted)] hover:text-[var(--foreground)] cursor-pointer hidden sm:block" /> */}

        {/* Theme Switcher */}
        <ThemeSwitcher />

        {/* Custom Stellar Wallet Button */}
        <WalletButton />
      </div>

      {/* App Modal */}
      {/* {showAppModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShowAppModal(false)}
        >
          <div
            className="relative bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 max-w-[280px] w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowAppModal(false)}
              className="absolute top-2 right-2 p-1 rounded-lg hover:bg-[var(--card-border)] text-[#888] hover:text-[var(--foreground)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center text-center">

              <h3 className="text-[var(--foreground)] text-sm font-bold mb-3">PicklePerps Mobile</h3>

              <div className="bg-white p-2 rounded-lg mb-3">
                <svg viewBox="0 0 37 37" className="w-40 h-40">
                  <path fill="#000" d="M0 0h7v1H0zM8 0h1v1H8zM10 0h1v1h-1zM12 0h2v1h-2zM15 0h1v1h-1zM17 0h2v1h-2zM20 0h2v1h-2zM23 0h1v1h-1zM26 0h1v1h-1zM28 0h2v1h-2zM30 0h7v1h-7zM0 1h1v1H0zM6 1h1v1H6zM8 1h2v1H8zM12 1h1v1h-1zM14 1h1v1h-1zM17 1h1v1h-1zM20 1h1v1h-1zM22 1h1v1h-1zM24 1h3v1h-3zM30 1h1v1h-1zM36 1h1v1h-1zM0 2h1v1H0zM2 2h3v1H2zM6 2h1v1H6zM9 2h1v1H9zM11 2h2v1h-2zM14 2h2v1h-2zM19 2h1v1h-1zM21 2h1v1h-1zM24 2h1v1h-1zM26 2h2v1h-2zM30 2h1v1h-1zM32 2h3v1h-3zM36 2h1v1h-1zM0 3h1v1H0zM2 3h3v1H2zM6 3h1v1H6zM8 3h1v1H8zM10 3h2v1h-2zM13 3h1v1h-1zM16 3h1v1h-1zM18 3h5v1h-5zM25 3h2v1h-2zM28 3h1v1h-1zM30 3h1v1h-1zM32 3h3v1h-3zM36 3h1v1h-1zM0 4h1v1H0zM2 4h3v1H2zM6 4h1v1H6zM9 4h1v1H9zM12 4h1v1h-1zM15 4h1v1h-1zM17 4h1v1h-1zM19 4h1v1h-1zM22 4h1v1h-1zM24 4h3v1h-3zM30 4h1v1h-1zM32 4h3v1h-3zM36 4h1v1h-1zM0 5h1v1H0zM6 5h1v1H6zM8 5h1v1H8zM11 5h1v1h-1zM14 5h2v1h-2zM18 5h2v1h-2zM21 5h3v1h-3zM26 5h2v1h-2zM30 5h1v1h-1zM36 5h1v1h-1zM0 6h7v1H0zM8 6h1v1H8zM10 6h1v1h-1zM12 6h1v1h-1zM14 6h1v1h-1zM16 6h1v1h-1zM18 6h1v1h-1zM20 6h1v1h-1zM22 6h1v1h-1zM24 6h1v1h-1zM26 6h1v1h-1zM28 6h1v1h-1zM30 6h7v1h-7zM9 7h1v1H9zM11 7h3v1h-3zM16 7h2v1h-2zM21 7h2v1h-2zM25 7h1v1h-1zM27 7h1v1h-1zM0 8h1v1H0zM2 8h1v1H2zM4 8h4v1H4zM11 8h4v1h-4zM17 8h1v1h-1zM19 8h4v1h-4zM24 8h2v1h-2zM27 8h2v1h-2zM30 8h2v1h-2zM33 8h2v1h-2zM36 8h1v1h-1zM1 9h1v1H1zM4 9h2v1H4zM7 9h1v1H7zM9 9h3v1H9zM13 9h2v1h-2zM16 9h3v1h-3zM21 9h1v1h-1zM24 9h3v1h-3zM29 9h5v1h-5zM35 9h2v1h-2zM0 10h2v1H0zM4 10h1v1H4zM7 10h3v1H7zM11 10h1v1h-1zM13 10h1v1h-1zM16 10h1v1h-1zM19 10h2v1h-2zM23 10h2v1h-2zM26 10h1v1h-1zM28 10h1v1h-1zM31 10h1v1h-1zM33 10h1v1h-1zM36 10h1v1h-1zM0 11h1v1H0zM2 11h1v1H2zM5 11h1v1H5zM9 11h1v1H9zM12 11h2v1h-2zM16 11h1v1h-1zM18 11h2v1h-2zM21 11h1v1h-1zM24 11h1v1h-1zM27 11h3v1h-3zM31 11h3v1h-3zM35 11h2v1h-2zM1 12h2v1H1zM5 12h1v1H5zM9 12h2v1H9zM12 12h2v1h-2zM15 12h1v1h-1zM17 12h4v1h-4zM22 12h5v1h-5zM28 12h2v1h-2zM31 12h2v1h-2zM34 12h1v1h-1zM0 13h1v1H0zM3 13h5v1H3zM10 13h2v1h-2zM13 13h1v1h-1zM15 13h1v1h-1zM19 13h1v1h-1zM22 13h1v1h-1zM24 13h1v1h-1zM27 13h2v1h-2zM30 13h1v1h-1zM33 13h2v1h-2zM36 13h1v1h-1zM0 14h3v1H0zM4 14h1v1H4zM7 14h1v1H7zM9 14h3v1H9zM14 14h1v1h-1zM16 14h1v1h-1zM18 14h2v1h-2zM22 14h2v1h-2zM25 14h1v1h-1zM28 14h3v1h-3zM34 14h1v1h-1zM1 15h1v1H1zM4 15h1v1H4zM6 15h3v1H6zM10 15h2v1h-2zM14 15h1v1h-1zM17 15h1v1h-1zM20 15h2v1h-2zM24 15h1v1h-1zM26 15h2v1h-2zM30 15h4v1h-4zM35 15h2v1h-2zM0 16h3v1H0zM4 16h3v1H4zM10 16h3v1h-3zM14 16h2v1h-2zM18 16h1v1h-1zM20 16h3v1h-3zM27 16h4v1h-4zM32 16h2v1h-2zM35 16h2v1h-2zM0 17h1v1H0zM3 17h3v1H3zM7 17h1v1H7zM10 17h1v1h-1zM12 17h4v1h-4zM17 17h1v1h-1zM19 17h2v1h-2zM22 17h1v1h-1zM25 17h3v1h-3zM30 17h2v1h-2zM33 17h4v1h-4zM0 18h2v1H0zM3 18h2v1H3zM6 18h2v1H6zM10 18h1v1h-1zM14 18h1v1h-1zM18 18h3v1h-3zM22 18h2v1h-2zM25 18h1v1h-1zM27 18h1v1h-1zM29 18h1v1h-1zM31 18h2v1h-2zM34 18h1v1h-1zM0 19h2v1H0zM3 19h5v1H3zM9 19h3v1H9zM14 19h3v1h-3zM18 19h2v1h-2zM22 19h1v1h-1zM24 19h1v1h-1zM26 19h2v1h-2zM29 19h1v1h-1zM31 19h2v1h-2zM34 19h3v1h-3zM0 20h1v1H0zM3 20h2v1H3zM6 20h2v1H6zM9 20h2v1H9zM13 20h3v1h-3zM18 20h1v1h-1zM21 20h1v1h-1zM23 20h1v1h-1zM25 20h2v1h-2zM28 20h1v1h-1zM31 20h2v1h-2zM35 20h2v1h-2zM0 21h1v1H0zM2 21h4v1H2zM7 21h3v1H7zM11 21h1v1h-1zM13 21h3v1h-3zM18 21h1v1h-1zM22 21h1v1h-1zM25 21h1v1h-1zM29 21h1v1h-1zM32 21h1v1h-1zM34 21h1v1h-1zM2 22h1v1H2zM4 22h1v1H4zM6 22h2v1H6zM9 22h2v1H9zM12 22h2v1h-2zM15 22h2v1h-2zM19 22h2v1h-2zM23 22h2v1h-2zM27 22h1v1h-1zM29 22h1v1h-1zM32 22h1v1h-1zM34 22h2v1h-2zM0 23h1v1H0zM4 23h1v1H4zM8 23h1v1H8zM10 23h4v1h-4zM18 23h1v1h-1zM20 23h1v1h-1zM23 23h1v1h-1zM25 23h2v1h-2zM28 23h1v1h-1zM30 23h1v1h-1zM32 23h2v1h-2zM35 23h2v1h-2zM0 24h2v1H0zM3 24h1v1H3zM5 24h2v1H5zM11 24h2v1h-2zM16 24h1v1h-1zM19 24h3v1h-3zM23 24h3v1h-3zM27 24h1v1h-1zM31 24h1v1h-1zM33 24h1v1h-1zM35 24h2v1h-2zM0 25h1v1H0zM2 25h1v1H2zM6 25h1v1H6zM9 25h2v1H9zM15 25h2v1h-2zM18 25h1v1h-1zM22 25h2v1h-2zM27 25h1v1h-1zM29 25h1v1h-1zM31 25h1v1h-1zM34 25h1v1h-1zM36 25h1v1h-1zM0 26h1v1H0zM2 26h2v1H2zM6 26h3v1H6zM10 26h1v1h-1zM13 26h2v1h-2zM18 26h3v1h-3zM22 26h2v1h-2zM25 26h1v1h-1zM27 26h1v1h-1zM30 26h1v1h-1zM33 26h1v1h-1zM35 26h1v1h-1zM0 27h1v1H0zM4 27h1v1H4zM6 27h1v1H6zM9 27h1v1H9zM11 27h1v1h-1zM13 27h3v1h-3zM18 27h1v1h-1zM21 27h2v1h-2zM24 27h4v1h-4zM30 27h1v1h-1zM32 27h1v1h-1zM34 27h1v1h-1zM0 28h1v1H0zM3 28h1v1H3zM6 28h1v1H6zM8 28h5v1H8zM14 28h2v1h-2zM20 28h1v1h-1zM22 28h2v1h-2zM25 28h3v1h-3zM29 28h4v1h-4zM34 28h1v1h-1zM8 29h3v1H8zM12 29h2v1h-2zM15 29h1v1h-1zM17 29h1v1h-1zM19 29h1v1h-1zM22 29h1v1h-1zM24 29h1v1h-1zM26 29h1v1h-1zM28 29h1v1h-1zM31 29h4v1h-4zM0 30h7v1H0zM9 30h2v1H9zM12 30h1v1h-1zM14 30h3v1h-3zM18 30h4v1h-4zM24 30h2v1h-2zM28 30h5v1h-5zM34 30h1v1h-1zM0 31h1v1H0zM6 31h1v1H6zM8 31h1v1H8zM12 31h1v1h-1zM14 31h1v1h-1zM18 31h1v1h-1zM21 31h2v1h-2zM24 31h1v1h-1zM26 31h2v1h-2zM29 31h3v1h-3zM33 31h2v1h-2zM36 31h1v1h-1zM0 32h1v1H0zM2 32h3v1H2zM6 32h1v1H6zM10 32h1v1h-1zM13 32h2v1h-2zM18 32h1v1h-1zM20 32h1v1h-1zM22 32h3v1h-3zM27 32h1v1h-1zM29 32h2v1h-2zM32 32h5v1h-5zM0 33h1v1H0zM2 33h3v1H2zM6 33h1v1H6zM8 33h1v1H8zM10 33h1v1h-1zM12 33h1v1h-1zM14 33h2v1h-2zM18 33h2v1h-2zM21 33h1v1h-1zM24 33h4v1h-4zM29 33h2v1h-2zM33 33h2v1h-2zM0 34h1v1H0zM2 34h3v1H2zM6 34h1v1H6zM8 34h4v1H8zM14 34h2v1h-2zM17 34h1v1h-1zM20 34h2v1h-2zM23 34h1v1h-1zM25 34h2v1h-2zM29 34h1v1h-1zM31 34h1v1h-1zM33 34h2v1h-2zM36 34h1v1h-1zM0 35h1v1H0zM6 35h1v1H6zM9 35h2v1H9zM13 35h1v1h-1zM17 35h1v1h-1zM19 35h1v1h-1zM21 35h2v1h-2zM24 35h1v1h-1zM26 35h1v1h-1zM29 35h2v1h-2zM33 35h2v1h-2zM36 35h1v1h-1zM0 36h7v1H0zM8 36h3v1H8zM12 36h1v1h-1zM14 36h2v1h-2zM18 36h1v1h-1zM21 36h3v1h-3zM25 36h4v1h-4zM30 36h1v1h-1zM32 36h3v1h-3zM36 36h1v1h-1z"/>
                </svg>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-[var(--accent-green)]/10 text-[var(--accent-green)] text-xs px-3 py-1.5 rounded-full">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-green)] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--accent-green)]"></span>
                </span>
                Mobile coming soon
              </div>
            </div>
          </div>
        </div>
      )} */}
    </nav>
  );
});
