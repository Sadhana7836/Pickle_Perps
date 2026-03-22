"use client"

import { useState } from "react"
import { useStellarWallet } from "@/contexts/StellarContext"
import { Trophy, Copy, Search, Settings, RefreshCw } from "lucide-react"
import { formatAmount } from "@/lib/soroban"

type TimeFrame = "1D" | "7D" | "30D"

interface Leader {
  address: string
  totalTrades: number
  totalBuys: number
  totalSells: number
  totalVolumeTraded: bigint
  totalPositions: number
  openPositions: number
  totalPnl: bigint
  winCount: number
  lossCount: number
  rank: number
  // Copy trading specific
  isRegisteredLeader: boolean
  profitSharePercent: string
  totalFollowers: number
}

interface CopyTradeTableProps {
  onlyRegisteredLeaders?: boolean
  onCopy?: (address: string) => void
}

export function CopyTradeTable({ onlyRegisteredLeaders = true, onCopy }: CopyTradeTableProps) {
  const { address: userAddress } = useStellarWallet()
  // Copy trading contract not yet deployed — show empty state
  const [leaders] = useState<Leader[]>([])
  const isLoading = false
  const [searchQuery, setSearchQuery] = useState("")
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("1D")
  const [activeTab, setActiveTab] = useState("All")

  const tabs = ["All", "Top PnL", "Top Volume", "Top Win Rate", "New Leaders"]

  const filteredLeaders = leaders.filter(leader => {
    if (!searchQuery) return true
    return leader.address.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const formatPnl = (pnl: bigint) => {
    const value = parseFloat(formatAmount(pnl))
    const isPositive = value >= 0
    return {
      value,
      formatted: `${isPositive ? "+" : ""}${value.toFixed(2)}`,
      percent: `${isPositive ? "+" : ""}${(value * 100 / Math.max(1, Math.abs(value))).toFixed(1)}%`,
      isPositive,
    }
  }

  const formatVolume = (vol: bigint) => {
    const value = parseFloat(formatAmount(vol))
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
    return `$${value.toFixed(2)}`
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs rounded whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? "bg-[var(--card-bg)] text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              placeholder="Search wallet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-40 bg-[var(--sidebar-bg)] border border-[var(--card-bg)] rounded pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#333]"
            />
          </div>

          {/* Time Frame */}
          <div className="flex items-center bg-[var(--sidebar-bg)] border border-[var(--card-bg)] rounded">
            {(["1D", "7D", "30D"] as TimeFrame[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeFrame(tf)}
                className={`px-2.5 py-1.5 text-xs transition-colors ${
                  timeFrame === tf
                    ? "bg-[var(--card-bg)] text-white"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <button className="p-1.5 text-gray-500 hover:text-white transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--sidebar-bg)] border border-[var(--card-bg)] rounded-lg overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-[var(--background)] border-b border-[var(--card-bg)] text-[11px] text-gray-500 font-medium">
          <div className="col-span-1">#</div>
          <div className="col-span-3">Wallet / XLM Bal</div>
          <div className="col-span-2 text-right">{timeFrame} PnL / XLM</div>
          <div className="col-span-1 text-right">{timeFrame} Win Rate</div>
          <div className="col-span-1 text-right">{timeFrame} TXs</div>
          <div className="col-span-1 text-right">{timeFrame} Volume</div>
          <div className="col-span-1 text-right">Followers</div>
          <div className="col-span-2 text-right"></div>
        </div>

        {/* Body */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-5 h-5 text-gray-500 animate-spin" />
          </div>
        ) : filteredLeaders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500">No leaders found</p>
            <p className="text-xs text-gray-600 mt-1">Copy trading contract not yet deployed</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--card-bg)]">
            {filteredLeaders.map((leader) => {
              const pnl = formatPnl(leader.totalPnl)
              const winRate = leader.winCount + leader.lossCount > 0
                ? ((leader.winCount / (leader.winCount + leader.lossCount)) * 100).toFixed(1)
                : "0.0"

              return (
                <div
                  key={leader.address}
                  className="grid grid-cols-12 gap-2 px-4 py-3 hover:bg-[var(--sidebar-bg)] transition-colors items-center"
                >
                  {/* Rank */}
                  <div className="col-span-1">
                    {leader.rank <= 3 ? (
                      <div className={`w-6 h-6 rounded flex items-center justify-center ${
                        leader.rank === 1 ? "bg-yellow-500/20 text-yellow-500" :
                        leader.rank === 2 ? "bg-gray-400/20 text-gray-400" :
                        "bg-orange-600/20 text-orange-500"
                      }`}>
                        <Trophy className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">{leader.rank}</span>
                    )}
                  </div>

                  {/* Wallet */}
                  <div className="col-span-3 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-[10px] font-bold text-white">
                      {leader.address.slice(2, 4).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-white font-medium">
                          {leader.address.slice(0, 6)}...{leader.address.slice(-4)}
                        </span>
                        {leader.isRegisteredLeader && (
                          <span className="text-[9px] bg-green-500/20 text-green-500 px-1 py-0.5 rounded">
                            {leader.profitSharePercent}%
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-500">
                        {leader.openPositions} open positions
                      </span>
                    </div>
                  </div>

                  {/* PnL */}
                  <div className="col-span-2 text-right">
                    <span className={`text-sm font-medium ${pnl.isPositive ? "text-green-500" : "text-red-500"}`}>
                      {pnl.formatted} XLM
                    </span>
                  </div>

                  {/* Win Rate */}
                  <div className="col-span-1 text-right">
                    <span className={`text-sm ${parseFloat(winRate) >= 50 ? "text-green-500" : "text-yellow-500"}`}>
                      {winRate}%
                    </span>
                  </div>

                  {/* TXs */}
                  <div className="col-span-1 text-right">
                    <span className="text-sm">
                      <span className="text-green-500">{leader.winCount}</span>
                      <span className="text-gray-500"> / </span>
                      <span className="text-red-500">{leader.lossCount}</span>
                    </span>
                  </div>

                  {/* Volume */}
                  <div className="col-span-1 text-right">
                    <span className="text-sm text-green-500">
                      {formatVolume(leader.totalVolumeTraded)}
                    </span>
                  </div>

                  {/* Followers */}
                  <div className="col-span-1 text-right">
                    <span className="text-sm text-white">
                      {leader.totalFollowers}
                    </span>
                  </div>

                  {/* Copy Button */}
                  <div className="col-span-2 text-right">
                    {userAddress?.toLowerCase() === leader.address.toLowerCase() ? (
                      <span className="text-xs text-gray-500 px-3 py-1.5">You</span>
                    ) : (
                      <button
                        onClick={() => onCopy?.(leader.address)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] border border-[#333] text-white text-xs rounded transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                        Copy
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
