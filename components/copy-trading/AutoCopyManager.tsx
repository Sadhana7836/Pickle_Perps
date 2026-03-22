"use client"

import { useEffect, useState, useCallback } from "react"
import { useStellarWallet } from "@/contexts/StellarContext"
import { Bell, BellOff, Copy, Check, X, Clock, Zap, AlertTriangle } from "lucide-react"
import {
  copyTradingService,
  LeaderPositionEvent,
  PendingCopyTrade,
  calculateFollowerMargin,
  calculateLeaderCapitalPercentage,
} from "@/lib/copyTradingService"
import { useCopyTrading, useLeaderDetails } from "@/hooks/useCopyTrading"
import { Subscription } from "@/lib/copyTrading"

interface AutoCopyManagerProps {
  onCopyExecuted?: (copyPositionId: bigint) => void
}

export function AutoCopyManager({ onCopyExecuted }: AutoCopyManagerProps) {
  const { address, isConnected } = useStellarWallet()
  const { subscriptions, executeCopyMeme, executeCopyRWA, state } = useCopyTrading()

  const [isInitialized, setIsInitialized] = useState(false)
  const [pendingTrades, setPendingTrades] = useState<PendingCopyTrade[]>([])
  const [autoModeLeaders, setAutoModeLeaders] = useState<Set<string>>(new Set())
  const [recentTrades, setRecentTrades] = useState<LeaderPositionEvent[]>([])
  const [showNotifications, setShowNotifications] = useState(true)

  // Initialize the copy trading service
  useEffect(() => {
    if (isInitialized) return

    copyTradingService.initialize()
    setIsInitialized(true)

    return () => {
      // Don't stop the service on unmount - it's a singleton
    }
  }, [isInitialized])

  // Watch leaders from active subscriptions
  useEffect(() => {
    if (!isInitialized || !subscriptions.length) return

    // Get all active subscription leaders
    const activeLeaders = subscriptions
      .filter((sub: Subscription) => sub.isActive)
      .map((sub: Subscription) => sub.leader.toLowerCase())

    // Watch all subscribed leaders
    copyTradingService.clearWatchedLeaders()
    activeLeaders.forEach((leader) => {
      copyTradingService.watchLeader(leader)
    })
  }, [isInitialized, subscriptions])

  // Subscribe to pending copy trades
  useEffect(() => {
    if (!isInitialized) return

    const unsubscribe = copyTradingService.subscribeToPendingCopies((pending) => {
      setPendingTrades((prev) => {
        // Don't add if already exists
        if (prev.find((p) => p.id === pending.id)) return prev
        return [...prev, pending]
      })
    })

    return () => unsubscribe()
  }, [isInitialized])

  // Subscribe to all leader trades for notifications
  useEffect(() => {
    if (!isInitialized) return

    const unsubscribe = copyTradingService.subscribeToAllLeaderTrades((event) => {
      setRecentTrades((prev) => {
        const updated = [event, ...prev.slice(0, 9)] // Keep last 10
        return updated
      })
    })

    return () => unsubscribe()
  }, [isInitialized])

  // Handle auto-execute mode
  const toggleAutoMode = useCallback(
    (leader: string) => {
      const leaderKey = leader.toLowerCase()

      if (autoModeLeaders.has(leaderKey)) {
        // Disable auto mode
        copyTradingService.disableAutoMode(leader)
        setAutoModeLeaders((prev) => {
          const next = new Set(prev)
          next.delete(leaderKey)
          return next
        })
      } else {
        // Enable auto mode
        copyTradingService.enableAutoMode(leader, async (trade) => {
          // Find the subscription for this leader
          const subscription = subscriptions.find(
            (sub: Subscription) => sub.leader.toLowerCase() === trade.leaderEvent.leader.toLowerCase()
          )

          if (!subscription || !subscription.isActive) {
            return { success: false, error: "No active subscription" }
          }

          try {
            // Calculate margin using proportional method if enabled
            const marginAmount = trade.suggestedMargin

            if (trade.leaderEvent.isRWA) {
              const copyPositionId = await executeCopyRWA(
                trade.leaderEvent.leader,
                trade.leaderEvent.positionId,
                marginAmount
              )
              onCopyExecuted?.(copyPositionId)
              return { success: true, copyPositionId }
            } else {
              const copyPositionId = await executeCopyMeme(
                trade.leaderEvent.leader,
                trade.leaderEvent.positionId,
                marginAmount
              )
              onCopyExecuted?.(copyPositionId)
              return { success: true, copyPositionId }
            }
          } catch (error) {
            return { success: false, error: (error as Error).message }
          }
        })

        setAutoModeLeaders((prev) => {
          const next = new Set(prev)
          next.add(leaderKey)
          return next
        })
      }
    },
    [autoModeLeaders, subscriptions, executeCopyMeme, executeCopyRWA, onCopyExecuted]
  )

  // Accept a pending copy trade
  const acceptPendingTrade = useCallback(
    async (trade: PendingCopyTrade) => {
      try {
        if (trade.leaderEvent.isRWA) {
          await executeCopyRWA(
            trade.leaderEvent.leader,
            trade.leaderEvent.positionId,
            trade.suggestedMargin
          )
        } else {
          await executeCopyMeme(
            trade.leaderEvent.leader,
            trade.leaderEvent.positionId,
            trade.suggestedMargin
          )
        }
        copyTradingService.acceptPendingCopy(trade.id)
        setPendingTrades((prev) => prev.filter((p) => p.id !== trade.id))
      } catch (error) {
        console.error("Failed to execute copy trade:", error)
      }
    },
    [executeCopyMeme, executeCopyRWA]
  )

  // Reject a pending copy trade
  const rejectPendingTrade = useCallback((trade: PendingCopyTrade) => {
    copyTradingService.rejectPendingCopy(trade.id)
    setPendingTrades((prev) => prev.filter((p) => p.id !== trade.id))
  }, [])

  // Filter out expired trades
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setPendingTrades((prev) => prev.filter((t) => t.expiresAt > now && t.status === "pending"))
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  if (!isConnected || !subscriptions.length) return null

  const activeSubscriptions = subscriptions.filter((sub: Subscription) => sub.isActive)

  return (
    <div className="space-y-4">
      {/* Notifications Toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-[var(--foreground)] font-medium text-sm">Copy Trading Monitor</h3>
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className={`p-2 rounded-lg transition-colors ${
            showNotifications ? "bg-[var(--accent-green)]/10 text-[var(--accent-green)]" : "bg-[var(--card-bg)] text-[var(--text-muted)]"
          }`}
        >
          {showNotifications ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
        </button>
      </div>

      {/* Active Subscriptions with Auto-Copy Toggle */}
      {activeSubscriptions.length > 0 && (
        <div className="bg-[var(--sidebar-bg)] rounded-lg border border-[var(--card-bg)] p-3">
          <p className="text-[var(--text-muted)] text-xs mb-2">Auto-Copy Mode</p>
          <div className="space-y-2">
            {activeSubscriptions.map((sub: Subscription) => (
              <div key={sub.id.toString()} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[var(--foreground)] text-xs font-mono">
                    {sub.leader.slice(0, 6)}...{sub.leader.slice(-4)}
                  </span>
                  {sub.config.useProportionalCopy && (
                    <span className="text-[var(--accent-green)] text-[10px] bg-[var(--accent-green)]/10 px-1.5 py-0.5 rounded">
                      %
                    </span>
                  )}
                </div>
                <button
                  onClick={() => toggleAutoMode(sub.leader)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                    autoModeLeaders.has(sub.leader.toLowerCase())
                      ? "bg-[var(--accent-green)]/20 text-[var(--accent-green)]"
                      : "bg-[var(--card-bg)] text-[var(--text-muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <Zap className="w-3 h-3" />
                  {autoModeLeaders.has(sub.leader.toLowerCase()) ? "Auto" : "Manual"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Copy Trades */}
      {pendingTrades.length > 0 && showNotifications && (
        <div className="bg-[var(--sidebar-bg)] rounded-lg border border-[#ff9f1c]/30 p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-[#ff9f1c]" />
            <p className="text-[#ff9f1c] text-xs font-medium">Pending Copy Trades</p>
          </div>
          <div className="space-y-2">
            {pendingTrades.map((trade) => (
              <PendingTradeCard
                key={trade.id}
                trade={trade}
                onAccept={() => acceptPendingTrade(trade)}
                onReject={() => rejectPendingTrade(trade)}
                isLoading={state.isLoading}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recent Leader Trades */}
      {recentTrades.length > 0 && showNotifications && (
        <div className="bg-[var(--sidebar-bg)] rounded-lg border border-[var(--card-bg)] p-3">
          <p className="text-[var(--text-muted)] text-xs mb-2">Recent Leader Activity</p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {recentTrades.slice(0, 5).map((event, idx) => (
              <div key={`${event.txHash}-${idx}`} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-1.5 py-0.5 rounded ${
                      event.type === "OPEN"
                        ? event.isLong
                          ? "bg-[var(--accent-green)]/10 text-[var(--accent-green)]"
                          : "bg-[var(--accent-red)]/10 text-[var(--accent-red)]"
                        : "bg-[#555]/10 text-[var(--text-muted)]"
                    }`}
                  >
                    {event.type}
                  </span>
                  <span className="text-[#888] font-mono">
                    {event.leader.slice(0, 6)}...
                  </span>
                </div>
                <span className="text-[var(--text-muted)]">{parseFloat(event.margin).toFixed(4)} XLM</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Pending Trade Card Component
function PendingTradeCard({
  trade,
  onAccept,
  onReject,
  isLoading,
}: {
  trade: PendingCopyTrade
  onAccept: () => void
  onReject: () => void
  isLoading: boolean
}) {
  const [timeLeft, setTimeLeft] = useState(Math.max(0, trade.expiresAt - Date.now()))

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(Math.max(0, trade.expiresAt - Date.now()))
    }, 1000)
    return () => clearInterval(interval)
  }, [trade.expiresAt])

  const secondsLeft = Math.floor(timeLeft / 1000)

  return (
    <div className="bg-[var(--background)] rounded-lg p-2 border border-[var(--card-bg)]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-1.5 py-0.5 rounded ${
              trade.leaderEvent.isLong
                ? "bg-[var(--accent-green)]/10 text-[var(--accent-green)]"
                : "bg-[var(--accent-red)]/10 text-[var(--accent-red)]"
            }`}
          >
            {trade.leaderEvent.isLong ? "LONG" : "SHORT"}
          </span>
          <span className="text-[var(--foreground)] text-xs">{trade.suggestedLeverage}x</span>
        </div>
        <div className="flex items-center gap-1 text-[var(--text-muted)] text-xs">
          <Clock className="w-3 h-3" />
          {secondsLeft}s
        </div>
      </div>

      <div className="flex items-center justify-between mb-2 text-xs">
        <span className="text-[var(--text-muted)]">Margin</span>
        <span className="text-[var(--foreground)]">{parseFloat(trade.suggestedMargin).toFixed(4)} XLM</span>
      </div>

      {trade.useProportional && trade.leaderCapital && (
        <div className="flex items-center justify-between mb-2 text-xs">
          <span className="text-[var(--text-muted)]">Leader using</span>
          <span className="text-[var(--accent-green)]">
            {calculateLeaderCapitalPercentage(trade.leaderEvent.margin, trade.leaderCapital).toFixed(1)}%
          </span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={onAccept}
          disabled={isLoading || timeLeft === 0}
          className="flex-1 flex items-center justify-center gap-1 bg-[var(--accent-green)] hover:bg-[var(--accent-green)]/80 disabled:bg-[#333] disabled:text-[var(--text-muted)] text-black text-xs font-medium py-1.5 rounded transition-colors"
        >
          <Check className="w-3 h-3" />
          Copy
        </button>
        <button
          onClick={onReject}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-1 bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] text-[var(--text-muted)] hover:text-[var(--foreground)] text-xs py-1.5 rounded transition-colors"
        >
          <X className="w-3 h-3" />
          Skip
        </button>
      </div>
    </div>
  )
}
