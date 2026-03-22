"use client"

import { memo } from "react"
import { TrendingUp, TrendingDown, Users, BarChart3, Trophy, Activity, Copy } from "lucide-react"
import { LeaderWithStats } from "@/hooks/useLeaderboard"

interface LeaderCardProps {
  leader: LeaderWithStats
  onClick?: (leader: LeaderWithStats) => void
  onSubscribe?: (leader: LeaderWithStats) => void
  isSubscribed?: boolean
  compact?: boolean
}

export const LeaderCard = memo(function LeaderCard({
  leader,
  onClick,
  onSubscribe,
  isSubscribed = false,
  compact = false,
}: LeaderCardProps) {
  const pnl = parseFloat(leader.pnlFormatted)
  const isProfitable = pnl >= 0
  const winRate = parseFloat(leader.winRatePercent)
  const totalTrades = Number(leader.totalTrades)
  const volume = parseFloat(leader.volumeFormatted)

  if (compact) {
    return (
      <div
        onClick={() => onClick?.(leader)}
        className="flex items-center justify-between p-3 bg-[var(--background)] border border-[var(--card-bg)] rounded-lg hover:bg-[var(--sidebar-bg)] hover:border-[var(--hover-bg)] transition-all cursor-pointer"
      >
        <div className="flex items-center gap-3">
          {/* Rank Badge */}
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
            leader.rank === 1 ? "bg-yellow-500/20 text-yellow-500" :
            leader.rank === 2 ? "bg-gray-400/20 text-gray-400" :
            leader.rank === 3 ? "bg-orange-600/20 text-orange-600" :
            "bg-[var(--card-bg)] text-gray-500"
          }`}>
            {leader.rank <= 3 ? <Trophy className="w-4 h-4" /> : `#${leader.rank}`}
          </div>

          {/* Address */}
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-[var(--foreground)]">
                {leader.address.slice(0, 6)}...{leader.address.slice(-4)}
              </p>
              {leader.isRegisteredLeader && (
                <span className="text-[10px] bg-green-600/20 text-green-500 px-1.5 py-0.5 rounded">
                  Leader
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {totalTrades} trades
            </p>
          </div>
        </div>

        {/* PnL */}
        <div className={`text-right ${isProfitable ? "text-green-500" : "text-red-500"}`}>
          <p className="text-sm font-medium">
            {isProfitable ? "+" : ""}{pnl.toFixed(4)} XLM
          </p>
          <p className="text-xs text-gray-500">{leader.winRatePercent}% win</p>
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={() => onClick?.(leader)}
      className="bg-[var(--background)] border border-[var(--card-bg)] rounded-lg p-4 hover:bg-[var(--sidebar-bg)] hover:border-[var(--hover-bg)] transition-all cursor-pointer group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Rank Badge */}
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
            leader.rank === 1 ? "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30" :
            leader.rank === 2 ? "bg-gray-400/20 text-gray-400 border border-gray-400/30" :
            leader.rank === 3 ? "bg-orange-600/20 text-orange-600 border border-orange-600/30" :
            "bg-[var(--card-bg)] text-gray-500 border border-[#333]"
          }`}>
            {leader.rank <= 3 ? <Trophy className="w-5 h-5" /> : `#${leader.rank}`}
          </div>

          {/* Address & Status */}
          <div>
            <p className="text-sm font-medium text-[var(--foreground)]">
              {leader.address.slice(0, 6)}...{leader.address.slice(-4)}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              {leader.isRegisteredLeader ? (
                <span className="text-xs text-green-500 flex items-center gap-1">
                  <Copy className="w-3 h-3" />
                  Copyable
                </span>
              ) : (
                <span className="text-xs text-gray-500">Trader</span>
              )}
            </div>
          </div>
        </div>

        {/* Total Trades Badge */}
        <div className="text-right">
          <span className="text-xs text-gray-400">Total Trades</span>
          <p className="text-sm font-medium text-[var(--foreground)]">{totalTrades.toLocaleString()}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* PnL */}
        <div className="bg-[var(--sidebar-bg)] rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
            {isProfitable ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>Total PnL</span>
          </div>
          <p className={`text-sm font-medium ${isProfitable ? "text-green-500" : "text-red-500"}`}>
            {isProfitable ? "+" : ""}{pnl.toFixed(4)} XLM
          </p>
        </div>

        {/* Win Rate */}
        <div className="bg-[var(--sidebar-bg)] rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
            <BarChart3 className="w-3 h-3" />
            <span>Win Rate</span>
          </div>
          <p className={`text-sm font-medium ${winRate >= 50 ? "text-green-500" : "text-yellow-500"}`}>
            {leader.winRatePercent}%
          </p>
        </div>

        {/* Volume */}
        <div className="bg-[var(--sidebar-bg)] rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
            <Activity className="w-3 h-3" />
            <span>Volume</span>
          </div>
          <p className="text-sm font-medium text-[var(--foreground)]">
            {volume.toFixed(2)} XLM
          </p>
        </div>

        {/* Open Positions */}
        <div className="bg-[var(--sidebar-bg)] rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
            <Users className="w-3 h-3" />
            <span>{leader.isRegisteredLeader ? "Followers" : "Positions"}</span>
          </div>
          <p className="text-sm font-medium text-[var(--foreground)]">
            {leader.isRegisteredLeader
              ? Number(leader.totalFollowers).toLocaleString()
              : Number(leader.openPositions).toLocaleString()
            }
          </p>
        </div>
      </div>

      {/* Subscribe Button - only show for registered leaders */}
      {onSubscribe && leader.isRegisteredLeader && (
        <>
          {/* Min Follow Amount */}
          <div className="flex items-center justify-between text-xs text-gray-400 mb-3 px-1">
            <span>Profit share: {leader.profitSharePercent}%</span>
            <span>Min: {parseFloat(leader.minFollowFormatted).toFixed(4)} XLM</span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation()
              onSubscribe(leader)
            }}
            disabled={!leader.isActive}
            className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all ${
              isSubscribed
                ? "bg-[var(--card-bg)] text-gray-400 border border-[#333]"
                : leader.isActive
                ? "bg-green-600 hover:bg-green-700 text-[var(--foreground)]"
                : "bg-[var(--card-bg)] text-gray-500 cursor-not-allowed"
            }`}
          >
            {isSubscribed ? "Subscribed" : leader.isActive ? "Copy Trades" : "Inactive"}
          </button>
        </>
      )}

      {/* Non-leader indicator */}
      {!leader.isRegisteredLeader && (
        <div className="text-center py-2 text-xs text-gray-500">
          Not registered as copy leader
        </div>
      )}
    </div>
  )
})

export default LeaderCard
