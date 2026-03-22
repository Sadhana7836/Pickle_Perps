"use client"

import { useState } from "react"
import { useStellarWallet } from "@/contexts/StellarContext"
import { Plus, Copy, Users, Settings } from "lucide-react"
import { useCopyTrading } from "@/hooks/useCopyTrading"
import { CopyTradeTable } from "@/components/copy-trading/CopyTradeTable"
import { SubscribeModal } from "@/components/copy-trading/SubscribeModal"
import { BecomeLeaderModal } from "@/components/copy-trading/BecomeLeaderModal"
import { AutoCopyManager } from "@/components/copy-trading/AutoCopyManager"
import { SubscriptionConfig, Subscription } from "@/lib/copyTrading"
import { PageLayout } from "@/components/PageLayout"
import { formatAmount } from "@/lib/soroban"

export default function CopyTradingPage() {
  const { isConnected } = useStellarWallet()
  const {
    isDeployed,
    isLeader,
    subscriptions,
    leaderCapital,
    state,
    registerAsLeader,
    subscribe,
    setLeaderCapital,
  } = useCopyTrading()

  const [selectedAddress, setSelectedAddress] = useState<string | null>(null)
  const [showSubscribeModal, setShowSubscribeModal] = useState(false)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [capitalInput, setCapitalInput] = useState("")

  const handleCopy = (address: string) => {
    setSelectedAddress(address)
    setShowSubscribeModal(true)
  }

  const handleSubscribe = async (config: SubscriptionConfig) => {
    if (!selectedAddress) return
    await subscribe(selectedAddress, config)
    setShowSubscribeModal(false)
    setSelectedAddress(null)
  }

  const handleRegisterAsLeader = async (profitShareBps: number, minFollowAmount: string) => {
    await registerAsLeader(profitShareBps, minFollowAmount)
    setShowRegisterModal(false)
  }

  if (!isDeployed) {
    return (
      <PageLayout title="CopyTrade">
        <div className="max-w-4xl mx-auto py-12">
          <div className="text-center">
            <Copy className="w-16 h-16 mx-auto text-[var(--text-muted)] mb-6" />
            <h1 className="text-3xl font-bold text-[var(--foreground)] mb-4">Copy Trading</h1>
            <p className="text-[var(--text-muted)] mb-8">
              Copy the trades of top performers automatically. Coming soon!
            </p>
          </div>
        </div>
      </PageLayout>
    )
  }

  const handleSetCapital = async () => {
    if (!capitalInput || parseFloat(capitalInput) <= 0) return
    await setLeaderCapital(capitalInput)
    setCapitalInput("")
  }

  const activeSubscriptions = subscriptions.filter((sub: Subscription) => sub.isActive)

  return (
    <PageLayout title="CopyTrade">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Header with Create Copy Trade button */}
          {isConnected && !isLeader && (
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowRegisterModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] border border-[var(--border-color)] text-[var(--foreground)] text-sm rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Become a Leader
              </button>
            </div>
          )}

          {/* Leader Capital Setting (if user is a leader) */}
          {isConnected && isLeader && (
            <div className="bg-[var(--sidebar-bg)] border border-[var(--card-bg)] rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Settings className="w-4 h-4 text-[var(--accent-green)]" />
                <h3 className="text-[var(--foreground)] font-medium text-sm">Leader Settings</h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-xs text-[var(--text-muted)] mb-1 block">Your Trading Capital (XLM)</label>
                  <input
                    type="number"
                    value={capitalInput}
                    onChange={(e) => setCapitalInput(e.target.value)}
                    placeholder={leaderCapital || "Enter your capital"}
                    className="w-full bg-[var(--background)] border border-[var(--card-bg)] rounded px-3 py-2 text-[var(--foreground)] text-sm focus:border-[var(--border-color)] focus:outline-none"
                  />
                </div>
                <button
                  onClick={handleSetCapital}
                  disabled={state.isLoading || !capitalInput}
                  className="mt-5 px-4 py-2 bg-[var(--accent-green)] hover:bg-[var(--accent-green)]/80 disabled:bg-[var(--card-bg)] disabled:text-[var(--text-muted)] text-black text-sm font-medium rounded transition-colors"
                >
                  {state.isLoading ? "..." : "Set"}
                </button>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-2">
                Set your total trading capital so followers can proportionally copy your position sizes.
                {leaderCapital && parseFloat(leaderCapital) > 0 && (
                  <span className="text-[var(--accent-green)]"> Current: {parseFloat(leaderCapital).toFixed(4)} XLM</span>
                )}
              </p>
            </div>
          )}

          {/* Copy Trade Table */}
          <CopyTradeTable
            onlyRegisteredLeaders={true}
            onCopy={handleCopy}
          />
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Auto Copy Manager */}
          {isConnected && activeSubscriptions.length > 0 && (
            <AutoCopyManager />
          )}

          {/* My Subscriptions */}
          {isConnected && activeSubscriptions.length > 0 && (
            <div className="bg-[var(--sidebar-bg)] border border-[var(--card-bg)] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-[var(--accent-green)]" />
                <h3 className="text-[var(--foreground)] font-medium text-sm">My Subscriptions</h3>
              </div>
              <div className="space-y-2">
                {activeSubscriptions.map((sub: Subscription) => (
                  <div
                    key={sub.id.toString()}
                    className="bg-[var(--background)] rounded-lg p-3 border border-[var(--card-bg)]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[var(--foreground)] text-xs font-mono">
                        {sub.leader.slice(0, 6)}...{sub.leader.slice(-4)}
                      </span>
                      {sub.config.useProportionalCopy && (
                        <span className="text-[var(--accent-green)] text-[10px] bg-[var(--accent-green)]/10 px-1.5 py-0.5 rounded">
                          Proportional
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-muted)]">Allocation</span>
                      <span className="text-[var(--foreground)]">
                        {parseFloat(formatAmount(sub.config.allocationAmount)).toFixed(4)} XLM
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs mt-1">
                      <span className="text-[var(--text-muted)]">Trades</span>
                      <span className="text-[var(--foreground)]">{Number(sub.totalCopiedTrades)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs mt-1">
                      <span className="text-[var(--text-muted)]">PnL</span>
                      <span className={sub.totalPnlIsProfit ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"}>
                        {sub.totalPnlIsProfit ? "+" : "-"}
                        {parseFloat(formatAmount(sub.totalPnl)).toFixed(4)} XLM
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {isConnected && activeSubscriptions.length === 0 && (
            <div className="bg-[var(--sidebar-bg)] border border-[var(--card-bg)] rounded-lg p-4 text-center">
              <Users className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
              <p className="text-[var(--text-muted)] text-sm">No active subscriptions</p>
              <p className="text-[var(--text-muted)] text-xs mt-1">
                Subscribe to a leader to start copy trading
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Subscribe Modal */}
      {showSubscribeModal && selectedAddress && (
        <SubscribeModal
          leader={{
            address: selectedAddress as string,
            wallet: selectedAddress as string,
            profitSharePercent: "10",
            minFollowFormatted: "0.01",
            pnlFormatted: "0",
            volumeFormatted: "0",
            winRatePercent: "0",
            profitEarnedFormatted: "0",
            rank: 0,
            totalTrades: BigInt(0),
            totalBuys: BigInt(0),
            totalSells: BigInt(0),
            totalVolumeTraded: BigInt(0),
            totalPositions: BigInt(0),
            openPositions: BigInt(0),
            totalPnl: BigInt(0),
            winCount: BigInt(0),
            lossCount: BigInt(0),
            liquidationCount: BigInt(0),
            isRegisteredLeader: true,
            profitShareBps: BigInt(1000),
            minFollowAmount: BigInt(0),
            totalFollowers: BigInt(0),
            totalCopiedVolume: BigInt(0),
            totalProfitEarned: BigInt(0),
            registeredAt: BigInt(0),
            isActive: true,
          }}
          onClose={() => {
            setShowSubscribeModal(false)
            setSelectedAddress(null)
          }}
          onSubscribe={handleSubscribe}
          isLoading={state.isLoading}
        />
      )}

      {/* Become Leader Modal */}
      {showRegisterModal && (
        <BecomeLeaderModal
          onClose={() => setShowRegisterModal(false)}
          onRegister={handleRegisterAsLeader}
          isLoading={state.isLoading}
        />
      )}
    </PageLayout>
  )
}
