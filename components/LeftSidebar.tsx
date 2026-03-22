"use client";

import { useState, useRef, useEffect, useCallback } from "react";

import { ChevronDown, Wallet, Plus, Send, Globe, X, BarChart3, Settings, Star, TrendingUp, Trophy, AtSign } from "lucide-react";
import { useStellarWallet } from "@/contexts/StellarContext";
import { useMemeTokenFactory } from "@/hooks/useMemeTokenFactory";
import { useAppActions, useSidebarOpen } from "@/lib/store";
import { CHAT } from "@/lib/constants";
import ChatSection from "./Chatsection";

interface ChatMessage {
  id: string;
  user: string;
  message: string;
  timestamp: number;
}

export function LeftSidebar() {
  const { isConnected, address, balance, connect, disconnect } = useStellarWallet();
  const { data } = useMemeTokenFactory();
  const { setShowMintModal, setSidebarOpen } = useAppActions();
  const sidebarOpen = useSidebarOpen();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = useCallback(() => {
    if (!inputMessage.trim() || !address) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      user: address.slice(0, 6) + "..." + address.slice(-4),
      message: inputMessage.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => {
      const updated = [...prev, newMessage];
      // Prevent memory leak by trimming old messages
      if (updated.length > CHAT.MAX_MESSAGES) {
        return updated.slice(-CHAT.MESSAGE_TRIM_COUNT);
      }
      return updated;
    });
    setInputMessage("");
  }, [inputMessage, address]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 xl:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed xl:relative z-50 xl:z-auto
          w-[280px] xl:w-[280px] 2xl:w-[320px]
          min-w-[280px] xl:min-w-[280px] 2xl:min-w-[320px]
          bg-[var(--sidebar-bg)] border-r border-[var(--card-bg)] flex flex-col h-full
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full xl:translate-x-0'}
          ${!sidebarOpen ? 'xl:hidden' : ''}
        `}
      >
        {/* Mobile Close Button */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-3 right-3 p-1.5 rounded-lg bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] xl:hidden z-10"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>

        {/* Wallet & Create Token Section */}
        <div className="p-4 border-b border-[var(--card-bg)]">
        <div className="w-full space-y-3">
                {!isConnected ? (
                  <>
                    <div className="bg-[var(--sidebar-bg)] border border-[var(--card-bg)] rounded-lg p-4 mt-2">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-[var(--card-bg)] flex items-center justify-center">
                          <Wallet className="w-5 h-5 text-white/50" />
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">Welcome</p>
                          <p className="text-white/50 text-xs">Connect to get started</p>
                        </div>
                      </div>
                      <button
                        onClick={connect}
                        className="w-full flex items-center justify-center gap-2 bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] border border-[var(--card-border)] hover:border-[var(--accent-primary)]/50 text-white text-sm px-4 py-2.5 rounded-lg transition-all"
                      >
                        <Wallet className="w-4 h-4 text-[var(--accent-primary)]" />
                        Connect Wallet
                      </button>
                    </div>
                    <button
                      disabled
                      className="w-full flex items-center justify-center gap-2 bg-[var(--background)] border border-[var(--card-bg)] text-white/50 text-sm px-4 py-3 rounded-lg cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create Token</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={disconnect}
                      className="w-full flex items-center gap-3 bg-[var(--sidebar-bg)] hover:bg-[#161616] border border-[var(--card-bg)] text-white text-sm px-3 py-2.5 rounded-lg transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-[var(--accent-primary)] flex items-center justify-center flex-shrink-0">
                        <span className="text-sm text-black font-bold">
                          {address?.charAt(0)?.toUpperCase() || "W"}
                        </span>
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-white text-xs truncate">{address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''}</p>
                        {balance && (
                          <p className="text-[var(--accent-primary)] text-xs">{balance} XLM</p>
                        )}
                      </div>
                      <ChevronDown className="w-3 h-3 text-white/50 flex-shrink-0" />
                    </button>
                    <button
                      onClick={() => setShowMintModal(true)}
                      className="w-full flex items-center justify-center gap-2 bg-[var(--background)] hover:bg-[var(--sidebar-bg)] border border-[var(--accent-primary)]/30 hover:border-[var(--accent-primary)]/60 text-white text-sm px-4 py-3 rounded-lg transition-all"
                    >
                      <Plus className="w-4 h-4 text-[var(--accent-primary)]" />
                      <span>Create Token</span>
                    </button>
                  </>
                )}
              </div>
        </div>

      {/* Stats */}
      <div className="p-4 border-b border-[var(--card-bg)]">
        <span>Stats</span>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white/50 text-xs">Total Tokens</span>
            <span className="text-white text-sm font-medium">{data.tokenCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/50 text-xs">Your Tokens</span>
            <span className="text-white text-sm font-medium">{data.myTokens.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/50 text-xs">Mint Fee</span>
            <span className="text-[var(--accent-primary)] text-sm font-medium">{data.mintingFee} XLM</span>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-4 pt-4 border-t border-[var(--card-bg)]">
          <p className="text-[#fff]/60 text-[12px] uppercase tracking-wider mb-3">How it works</p>
          <div className="space-y-2 text-[12px] text-[#fff]/40">
            <div className="flex items-start gap-2">
              <span className="text-[var(--accent-primary)]">1.</span>
              <span>Create your token with an image</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[var(--accent-primary)]">2.</span>
              <span>Token becomes tradeable via perpetuals</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[var(--accent-primary)]">3.</span>
              <span>Trade long/short with up to 100x leverage</span>
            </div>
          </div>
        </div>
      </div>

      {/* <ChatSection /> */}

        {/* Footer */}
        <div className="px-3 pt-2 pb-1 border-t border-[var(--card-bg)] mt-auto mb-4">
          <div className="flex items-center justify-center my-2 text-white/50 text-sm">
            <span>Stellar Testnet</span>
          </div>

           {/* <div className="grid grid-cols-2 grid-rows-1 gap-2 mb-2 min-w-0 text-xs"> */}
            {/* Wallet Tracker */}
            {/* <button className="flex items-center gap-1.5 bg-[#1a3a2a] border border-[#2a5a3a] text-[var(--accent-green)] px-1.5 sm:px-2.5 py-1 rounded hover:bg-[#1a4a2a] transition-colors flex-shrink-0">
              <Wallet className="w-3.5 h-3.5" />
              <span className="font-medium hidden sm:inline">Wallet Tracker</span>
              <span className="font-medium sm:hidden">Wallet</span>
            </button> */}

            {/* X Tracker - hidden on mobile */}
            {/* <button className="hidden sm:flex items-center gap-1.5 bg-[var(--card-bg)] border border-[#333] text-white px-2.5 py-1 rounded hover:bg-[var(--hover-bg)] transition-colors flex-shrink-0">
              <span className="font-bold">𝕏</span>
              <span className="hidden md:inline">Tracker</span>
            </button>
          </div>

          <div className="grid grid-cols-3 grid-rows-2 text-xs">
            {/* Settings Icon */}
            {/* <button className="flex items-center gap-1.5 text-[#888] hover:text-white px-2 py-1 rounded hover:bg-[var(--card-bg)] transition-colors">
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button> */}

            {/* Holding - hidden on smaller screens */}
              {/* <button className="hidden lg:flex items-center gap-1.5 text-[#888] hover:text-white px-2 py-1 rounded hover:bg-[var(--card-bg)] transition-colors">
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Holding</span>
              </button> */}

              {/* Watchlist - hidden on smaller screens */}
              {/* <button className="hidden lg:flex items-center gap-1.5 text-[#888] hover:text-white px-2 py-1 rounded hover:bg-[var(--card-bg)] transition-colors">
                <Star className="w-3.5 h-3.5" />
                <span>Watchlist</span>
              </button> */}

              {/* Trending - hidden on smaller screens */}
              {/* <button className="hidden xl:flex items-center gap-1.5 text-[#888] hover:text-white px-2 py-1 rounded hover:bg-[var(--card-bg)] transition-colors">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Trending</span>
              </button> */}

              {/* Rank - hidden on smaller screens */}
              {/* <button className="hidden xl:flex items-center gap-1.5 text-[#888] hover:text-white px-2 py-1 rounded hover:bg-[var(--card-bg)] transition-colors">
                <Trophy className="w-3.5 h-3.5" />
                <span>Rank</span>
              </button> */}

              {/* Signal - hidden on smaller screens */}
              {/*<button className="hidden 2xl:flex items-center gap-1.5 text-[#888] hover:text-white px-2 py-1 rounded hover:bg-[var(--card-bg)] transition-colors">
                <AtSign className="w-3.5 h-3.5" />
                <span>Signal</span>
              </button>
          </div> */}
        </div>
      </div>
    </>
  );
}
