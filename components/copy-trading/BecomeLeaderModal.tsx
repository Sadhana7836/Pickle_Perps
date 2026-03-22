"use client"

import { useState } from "react"
import { X, Trophy, Percent, Wallet, Info } from "lucide-react"

interface BecomeLeaderModalProps {
  onClose: () => void
  onRegister: (profitShareBps: number, minFollowAmount: string) => Promise<void>
  isLoading: boolean
}

export function BecomeLeaderModal({
  onClose,
  onRegister,
  isLoading,
}: BecomeLeaderModalProps) {
  const [profitShare, setProfitShare] = useState(10) // Default 10%
  const [minFollowAmount, setMinFollowAmount] = useState("0.01") // Default 0.01 XLM

  const handleSubmit = async () => {
    const profitShareBps = profitShare * 100 // Convert percentage to basis points
    await onRegister(profitShareBps, minFollowAmount)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-[var(--background)] border border-[var(--card-bg)] rounded-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--card-bg)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-600/20 rounded-full flex items-center justify-center">
              <Trophy className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Become a Leader</h2>
              <p className="text-sm text-gray-400">Let others copy your trades</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Profit Share */}
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
              <Percent className="w-4 h-4" />
              Profit Share
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={5}
                max={20}
                value={profitShare}
                onChange={(e) => setProfitShare(Number(e.target.value))}
                className="flex-1 h-2 bg-[var(--card-bg)] rounded-lg appearance-none cursor-pointer accent-green-500"
              />
              <span className="text-white font-medium w-12 text-right">
                {profitShare}%
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              You earn {profitShare}% of your followers&apos; profits on copied trades
            </p>
          </div>

          {/* Minimum Follow Amount */}
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
              <Wallet className="w-4 h-4" />
              Minimum Follow Amount (XLM)
            </label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={minFollowAmount}
              onChange={(e) => setMinFollowAmount(e.target.value)}
              className="w-full bg-[var(--sidebar-bg)] border border-[var(--card-bg)] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500/50"
              placeholder="0.01"
            />
            <p className="text-xs text-gray-500 mt-2">
              Minimum amount required to subscribe to you
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-[var(--sidebar-bg)] border border-[var(--card-bg)] rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-400 space-y-2">
                <p>As a leader, you will:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Have your trades visible to followers</li>
                  <li>Earn profit share when followers profit from copies</li>
                  <li>Build reputation through performance metrics</li>
                  <li>Appear on the leaderboard for others to find you</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--card-bg)]">
          <button
            onClick={handleSubmit}
            disabled={isLoading || !minFollowAmount}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Registering...
              </>
            ) : (
              <>
                <Trophy className="w-4 h-4" />
                Register as Leader
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
