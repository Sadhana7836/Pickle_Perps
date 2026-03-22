"use client"

import { useState } from "react"
import { X, AlertCircle, Check, ChevronDown } from "lucide-react"
import { parseAmount } from "@/lib/soroban"
import { LeaderWithStats } from "@/hooks/useLeaderboard"
import { SubscriptionConfig } from "@/lib/copyTrading"

interface SubscribeModalProps {
  leader: LeaderWithStats
  onClose: () => void
  onSubscribe: (config: SubscriptionConfig) => Promise<void>
  isLoading?: boolean
}

export function SubscribeModal({
  leader,
  onClose,
  onSubscribe,
  isLoading = false,
}: SubscribeModalProps) {
  const [allocationAmount, setAllocationAmount] = useState("")
  const [maxLeverage, setMaxLeverage] = useState("10")
  const [maxPositionSize, setMaxPositionSize] = useState("")
  const [copyLongs, setCopyLongs] = useState(true)
  const [copyShorts, setCopyShorts] = useState(true)
  const [copyMeme, setCopyMeme] = useState(true)
  const [copyRWA, setCopyRWA] = useState(true)
  const [useProportionalCopy, setUseProportionalCopy] = useState(true)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [error, setError] = useState("")

  const minFollow = parseFloat(leader.minFollowFormatted)
  const allocationNum = parseFloat(allocationAmount) || 0

  const handleSubmit = async () => {
    setError("")

    if (allocationNum < minFollow) {
      setError(`Minimum allocation is ${minFollow.toFixed(4)} XLM`)
      return
    }

    if (!copyLongs && !copyShorts) {
      setError("Must enable at least longs or shorts")
      return
    }

    if (!copyMeme && !copyRWA) {
      setError("Must enable at least tokens or RWA trading")
      return
    }

    try {
      const config: SubscriptionConfig = {
        allocationAmount: parseAmount(allocationAmount),
        maxLeverage: BigInt(parseInt(maxLeverage) || 0),
        maxPositionSize: maxPositionSize ? parseAmount(maxPositionSize) : BigInt(0),
        copyLongs,
        copyShorts,
        copyMeme,
        copyRWA,
        useProportionalCopy,
      }

      await onSubscribe(config)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to subscribe")
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--background)] border border-[var(--card-bg)] rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--card-bg)]">
          <h2 className="text-lg font-semibold text-white">Subscribe to Leader</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Leader Info */}
        <div className="p-4 bg-[var(--sidebar-bg)] border-b border-[var(--card-bg)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Leader</p>
              <p className="text-white font-medium">
                {leader.address.slice(0, 8)}...{leader.address.slice(-6)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Profit Share</p>
              <p className="text-white font-medium">{leader.profitSharePercent}%</p>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--card-bg)]">
            <div>
              <p className="text-xs text-gray-500">Win Rate</p>
              <p className="text-sm text-green-500">{leader.winRatePercent}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Followers</p>
              <p className="text-sm text-white">{Number(leader.totalFollowers)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Min Follow</p>
              <p className="text-sm text-white">{minFollow.toFixed(4)} XLM</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4">
          {/* Allocation Amount */}
          <div>
            <label className="text-sm text-gray-400 block mb-2">
              Allocation Amount (XLM)
            </label>
            <input
              type="number"
              value={allocationAmount}
              onChange={(e) => setAllocationAmount(e.target.value)}
              placeholder={`Min: ${minFollow.toFixed(4)}`}
              className="w-full bg-[var(--sidebar-bg)] border border-[#333] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              {useProportionalCopy
                ? "Your total capital for proportional copy trading"
                : "This amount will be used for each copy trade"}
            </p>
          </div>

          {/* Max Leverage */}
          <div>
            <label className="text-sm text-gray-400 block mb-2">
              Max Leverage (0 = no limit)
            </label>
            <input
              type="number"
              value={maxLeverage}
              onChange={(e) => setMaxLeverage(e.target.value)}
              placeholder="10"
              min="0"
              max="100"
              className="w-full bg-[var(--sidebar-bg)] border border-[#333] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Cap leverage even if leader uses higher
            </p>
          </div>

          {/* Position Types */}
          <div>
            <label className="text-sm text-gray-400 block mb-2">Copy Position Types</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setCopyLongs(!copyLongs)}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg border transition-colors ${
                  copyLongs
                    ? "bg-green-600/20 border-green-600 text-green-500"
                    : "bg-[var(--sidebar-bg)] border-[#333] text-gray-400"
                }`}
              >
                {copyLongs && <Check className="w-4 h-4" />}
                Longs
              </button>
              <button
                onClick={() => setCopyShorts(!copyShorts)}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg border transition-colors ${
                  copyShorts
                    ? "bg-red-600/20 border-red-600 text-red-500"
                    : "bg-[var(--sidebar-bg)] border-[#333] text-gray-400"
                }`}
              >
                {copyShorts && <Check className="w-4 h-4" />}
                Shorts
              </button>
            </div>
          </div>

          {/* Asset Types */}
          <div>
            <label className="text-sm text-gray-400 block mb-2">Copy Asset Types</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setCopyMeme(!copyMeme)}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg border transition-colors ${
                  copyMeme
                    ? "bg-purple-600/20 border-purple-600 text-purple-500"
                    : "bg-[var(--sidebar-bg)] border-[#333] text-gray-400"
                }`}
              >
                {copyMeme && <Check className="w-4 h-4" />}
                Tokens
              </button>
              <button
                onClick={() => setCopyRWA(!copyRWA)}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg border transition-colors ${
                  copyRWA
                    ? "bg-blue-600/20 border-blue-600 text-blue-500"
                    : "bg-[var(--sidebar-bg)] border-[#333] text-gray-400"
                }`}
              >
                {copyRWA && <Check className="w-4 h-4" />}
                RWA
              </button>
            </div>
          </div>

          {/* Copy Mode */}
          <div>
            <label className="text-sm text-gray-400 block mb-2">Copy Mode</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setUseProportionalCopy(true)}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg border transition-colors ${
                  useProportionalCopy
                    ? "bg-green-600/20 border-green-600 text-green-500"
                    : "bg-[var(--sidebar-bg)] border-[#333] text-gray-400"
                }`}
              >
                {useProportionalCopy && <Check className="w-4 h-4" />}
                Proportional %
              </button>
              <button
                onClick={() => setUseProportionalCopy(false)}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg border transition-colors ${
                  !useProportionalCopy
                    ? "bg-yellow-600/20 border-yellow-600 text-yellow-500"
                    : "bg-[var(--sidebar-bg)] border-[#333] text-gray-400"
                }`}
              >
                {!useProportionalCopy && <Check className="w-4 h-4" />}
                Fixed Amount
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {useProportionalCopy
                ? "Use same % of your allocation as leader uses of their capital"
                : "Use your full allocation for each trade"}
            </p>
          </div>

          {/* Advanced Settings */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
              Advanced Settings
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">
                    Max Position Size (XLM, 0 = no limit)
                  </label>
                  <input
                    type="number"
                    value={maxPositionSize}
                    onChange={(e) => setMaxPositionSize(e.target.value)}
                    placeholder="0"
                    className="w-full bg-[var(--sidebar-bg)] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Info */}
          <div className="p-3 bg-[var(--sidebar-bg)] border border-[var(--card-bg)] rounded-lg">
            <p className="text-xs text-gray-400">
              By subscribing, you can copy this leader&apos;s trades.
              {useProportionalCopy
                ? " When the leader opens a position using X% of their capital, you'll use the same X% of your allocation."
                : " Each trade will use your full allocation amount."}
              {" "}You will pay {leader.profitSharePercent}% of profits + 5% protocol fee.
              Fees are only charged on profitable trades.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--card-bg)]">
          <button
            onClick={handleSubmit}
            disabled={isLoading || !allocationAmount || allocationNum < minFollow}
            className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-[#333] disabled:text-gray-500 text-white font-medium rounded-lg transition-colors"
          >
            {isLoading ? "Subscribing..." : `Subscribe with ${allocationAmount || "0"} XLM`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SubscribeModal
