"use client"

import { useStellarWallet } from "@/contexts/StellarContext"
import { Wallet } from "lucide-react"

export function WalletConnect() {
  const { isConnected, address, balance, connect, disconnect } = useStellarWallet()

  if (isConnected && address) {
    return (
      <div className="flex justify-center">
        <button
          onClick={disconnect}
          className="flex items-center gap-2 bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] border border-[#333] text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          <Wallet className="w-4 h-4 text-[var(--accent-green)]" />
          <span>{address.slice(0, 6)}...{address.slice(-4)}</span>
          {balance && <span className="text-[var(--accent-green)] text-xs ml-1">{parseFloat(balance).toFixed(2)} XLM</span>}
        </button>
      </div>
    )
  }

  return (
    <div className="flex justify-center">
      <button
        onClick={connect}
        className="flex items-center gap-2 bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] border border-[#333] text-white text-sm px-4 py-2 rounded-lg transition-colors"
      >
        <Wallet className="w-4 h-4 text-[var(--accent-green)]" />
        Connect Wallet
      </button>
    </div>
  )
}
