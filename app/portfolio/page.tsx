"use client"

import { useState, memo, useCallback } from "react"
import Link from "next/link"
import { TrendingUp, TrendingDown, Wallet, History, Target, ExternalLink, Copy, Check, Users, ArrowUpRight } from "lucide-react"
import { usePortfolio, TokenHolding, Transaction, PortfolioPosition, CopyPositionWithDetails } from "@/hooks/usePortfolio"
import { IPFSImage } from "@/components/IPFSImage"
import { PageLayout } from "@/components/PageLayout"

// Holding Card
const HoldingCard = memo(function HoldingCard({ holding }: { holding: TokenHolding }) {
  const [copied, setCopied] = useState(false)

  const copyAddress = useCallback(() => {
    navigator.clipboard.writeText(holding.address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [holding.address])

  return (
    <div className="bg-[var(--sidebar-bg)] rounded-lg p-4 border border-[var(--card-bg)] hover:border-[var(--hover-bg)] transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-[var(--background)] border border-[var(--card-bg)]">
            {holding.imageHash ? (
              <IPFSImage
                src={holding.imageHash}
                alt={holding.name}
                width={40}
                height={40}
                className="w-full h-full object-cover"
                fallback={<div className="w-full h-full flex items-center justify-center text-lg">T</div>}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-lg">T</div>
            )}
          </div>
          <div>
            <p className="text-[var(--foreground)] font-medium text-sm">{holding.symbol}</p>
            <p className="text-[var(--text-muted)] text-xs">{holding.name}</p>
          </div>
        </div>
        <span className={`text-xs px-2 py-1 rounded ${holding.change24h >= 0 ? "bg-[var(--accent-green)]/10 text-[var(--accent-green)]" : "bg-[var(--accent-red)]/10 text-[var(--accent-red)]"}`}>
          {holding.change24h >= 0 ? "+" : ""}{holding.change24h.toFixed(1)}%
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">Balance</span>
          <span className="text-[var(--foreground)]">{holding.balanceFormatted}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">Value</span>
          <span className="text-[var(--accent-green)] font-medium">${holding.value.toFixed(4)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--card-bg)]">
        <button onClick={copyAddress} className="flex items-center gap-1 text-[var(--text-muted)] text-xs hover:text-[var(--foreground)] transition-colors">
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {holding.address.slice(0, 6)}...{holding.address.slice(-4)}
        </button>
        <a href={`https://stellar.expert/explorer/testnet/contract/${holding.address}`} target="_blank" rel="noopener noreferrer" className="text-[var(--text-muted)] hover:text-[var(--foreground)]">
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  )
})

// Position Card
const PositionCard = memo(function PositionCard({ position }: { position: PortfolioPosition }) {
  return (
    <div className="bg-[var(--sidebar-bg)] rounded-lg p-4 border border-[var(--card-bg)] hover:border-[var(--hover-bg)] transition-colors">
      {/* Token Info Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-[var(--background)] border border-[var(--card-bg)]">
            {position.tokenImageHash ? (
              <IPFSImage
                src={position.tokenImageHash}
                alt={position.tokenName}
                width={40}
                height={40}
                className="w-full h-full object-cover"
                fallback={<div className="w-full h-full flex items-center justify-center text-lg text-[var(--text-muted)]">T</div>}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-lg text-[var(--text-muted)]">T</div>
            )}
          </div>
          <div>
            <p className="text-[var(--foreground)] font-medium text-sm">{position.tokenSymbol}</p>
            <p className="text-[var(--text-muted)] text-xs">{position.tokenName}</p>
          </div>
        </div>
        <span className="text-[var(--text-secondary)] text-xs">#{position.positionId}</span>
      </div>

      {/* Position Type & Leverage */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-xs font-medium px-2 py-1 rounded ${position.isLong ? "bg-[var(--accent-green)]/10 text-[var(--accent-green)]" : "bg-[var(--accent-red)]/10 text-[var(--accent-red)]"}`}>
          {position.isLong ? "LONG" : "SHORT"}
        </span>
        <span className="text-[var(--foreground)] text-sm">{position.leverage}x</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        <div>
          <p className="text-[var(--text-muted)]">Size</p>
          <p className="text-[var(--foreground)]">${parseFloat(position.size).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-[var(--text-muted)]">Entry</p>
          <p className="text-[var(--foreground)]">${position.entryPrice.toFixed(6)}</p>
        </div>
      </div>

      <div className="flex justify-between items-center pt-3 border-t border-[var(--card-bg)]">
        <div>
          <p className="text-[var(--text-muted)] text-xs">PnL</p>
          <p className={`text-sm font-medium ${position.isProfit ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"}`}>
            {position.isProfit ? "+" : "-"}${Math.abs(position.pnl).toFixed(4)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[var(--text-muted)] text-xs">Liq. Price</p>
          <p className="text-[var(--accent-red)] text-xs">${position.liquidationPrice.toFixed(6)}</p>
        </div>
      </div>

      {/* Link to Token Page */}
      {position.token && (
        <Link
          href={`/?token=${position.token}`}
          className="flex items-center justify-center gap-1 mt-3 pt-3 border-t border-[var(--card-bg)] text-[var(--accent-green)] text-xs hover:text-[var(--accent-green)] transition-colors"
        >
          View Token <ArrowUpRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  )
})

// Transaction Row
const TransactionRow = memo(function TransactionRow({ tx }: { tx: Transaction }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[var(--card-bg)] last:border-0">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.type === "buy" ? "bg-[var(--accent-green)]/10" : "bg-[var(--accent-red)]/10"}`}>
          {tx.type === "buy" ? <TrendingUp className="w-4 h-4 text-[var(--accent-green)]" /> : <TrendingDown className="w-4 h-4 text-[var(--accent-red)]" />}
        </div>
        <div>
          <p className="text-[var(--foreground)] text-sm">{tx.type === "buy" ? "Bought" : "Sold"} <span className="font-medium">{tx.tokenSymbol}</span></p>
          <p className="text-[var(--text-muted)] text-xs">{new Date(tx.timestamp).toLocaleDateString()}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-[var(--foreground)] text-sm">{parseFloat(tx.amount).toFixed(2)}</p>
          <p className="text-[var(--text-muted)] text-xs">{tx.value.toFixed(4)} XLM</p>
        </div>
        <a href={`https://stellar.expert/explorer/testnet/tx/${tx.txHash}`} target="_blank" rel="noopener noreferrer" className="text-[var(--text-muted)] hover:text-[var(--foreground)]">
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  )
})

// Copy Position Card
const CopyPositionCard = memo(function CopyPositionCard({ position }: { position: CopyPositionWithDetails }) {
  return (
    <div className="bg-[var(--sidebar-bg)] rounded-lg p-4 border border-[var(--card-bg)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[var(--accent-green)]" />
          <span className="text-[var(--foreground)] text-sm">Copy Trade</span>
        </div>
        <span className={`text-xs px-2 py-1 rounded ${position.isRWA ? "bg-blue-600/10 text-blue-500" : "bg-purple-600/10 text-purple-500"}`}>
          {position.isRWA ? "RWA" : "Token"}
        </span>
      </div>

      <div className="space-y-2 text-xs mb-3">
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">Leader</span>
          <span className="text-[var(--foreground)] font-mono">
            {position.leader.slice(0, 6)}...{position.leader.slice(-4)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">Your Margin</span>
          <span className="text-[var(--foreground)]">{parseFloat(position.followerMargin).toFixed(4)} XLM</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">Leader Margin</span>
          <span className="text-[var(--text-secondary)]">{parseFloat(position.leaderMargin).toFixed(4)} XLM</span>
        </div>
      </div>

      <div className="flex justify-between items-center pt-3 border-t border-[var(--card-bg)] text-xs">
        <span className="text-[var(--text-muted)]">Opened</span>
        <span className="text-[var(--text-secondary)]">
          {new Date(position.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  )
})

export default function PortfolioPage() {
  const { holdings, transactions, positions, copyPositions, totalValue, totalPnL, isLoading, isConnected } = usePortfolio()
  const [activeTab, setActiveTab] = useState<"holdings" | "positions" | "copy" | "history">("holdings")

  return (
    <PageLayout title="Portfolio">
      {!isConnected ? (
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-[var(--sidebar-bg)] border border-[var(--card-bg)] flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-6 h-6 text-[var(--text-muted)]" />
            </div>
            <h2 className="text-[var(--foreground)] text-lg font-medium mb-1">Connect Wallet</h2>
            <p className="text-[var(--text-muted)] text-sm">Connect your wallet to view portfolio</p>
          </div>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto">
          {/* Subtitle */}
          <div className="mb-6">
            <p className="text-[var(--text-muted)] text-sm">Track your holdings and positions</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-[var(--sidebar-bg)] border border-[var(--card-bg)] rounded-lg p-4">
              <p className="text-[var(--text-muted)] text-xs mb-1">Total Value</p>
              <p className="text-xl font-semibold text-[var(--foreground)]">${totalValue.toFixed(4)}</p>
            </div>
            <div className="bg-[var(--sidebar-bg)] border border-[var(--card-bg)] rounded-lg p-4">
              <p className="text-[var(--text-muted)] text-xs mb-1">Total PnL</p>
              <p className={`text-xl font-semibold ${totalPnL >= 0 ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"}`}>
                {totalPnL >= 0 ? "+" : ""}{totalPnL.toFixed(4)}
              </p>
            </div>
            <div className="bg-[var(--sidebar-bg)] border border-[var(--card-bg)] rounded-lg p-4">
              <p className="text-[var(--text-muted)] text-xs mb-1">Positions</p>
              <p className="text-xl font-semibold text-[var(--foreground)]">{positions.length}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-[var(--sidebar-bg)] p-1 rounded-lg border border-[var(--card-bg)] w-fit">
            {[
              { id: "holdings", label: "Holdings", count: holdings.length, icon: Wallet },
              { id: "positions", label: "Positions", count: positions.length, icon: Target },
              { id: "copy", label: "Copy Trades", count: copyPositions.length, icon: Users },
              { id: "history", label: "History", count: transactions.length, icon: History },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as "holdings" | "positions" | "copy" | "history")}
                className={`flex items-center gap-2 px-4 py-2 rounded text-sm transition-colors ${
                  activeTab === tab.id ? "bg-[var(--card-bg)] text-[var(--foreground)]" : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                <span className="text-[var(--text-secondary)]">({tab.count})</span>
              </button>
            ))}
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {activeTab === "holdings" && (
                holdings.length === 0 ? (
                  <div className="bg-[var(--sidebar-bg)] border border-[var(--card-bg)] rounded-lg p-10 text-center">
                    <Wallet className="w-10 h-10 text-[var(--border-color)] mx-auto mb-3" />
                    <p className="text-[var(--foreground)] font-medium mb-1">No Holdings</p>
                    <p className="text-[var(--text-muted)] text-sm mb-4">Start trading to build your portfolio</p>
                    <Link href="/" className="text-[var(--accent-green)] text-sm hover:underline">Explore Tokens</Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {holdings.map((holding) => (
                      <HoldingCard key={holding.address} holding={holding} />
                    ))}
                  </div>
                )
              )}

              {activeTab === "positions" && (
                positions.length === 0 ? (
                  <div className="bg-[var(--sidebar-bg)] border border-[var(--card-bg)] rounded-lg p-10 text-center">
                    <Target className="w-10 h-10 text-[var(--border-color)] mx-auto mb-3" />
                    <p className="text-[var(--foreground)] font-medium mb-1">No Positions</p>
                    <p className="text-[var(--text-muted)] text-sm mb-4">Open a perpetual position to get started</p>
                    <Link href="/" className="text-[var(--accent-green)] text-sm hover:underline">Trade Now</Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {positions.map((position) => (
                      <PositionCard key={position.positionId} position={position} />
                    ))}
                  </div>
                )
              )}

              {activeTab === "copy" && (
                copyPositions.length === 0 ? (
                  <div className="bg-[var(--sidebar-bg)] border border-[var(--card-bg)] rounded-lg p-10 text-center">
                    <Users className="w-10 h-10 text-[var(--border-color)] mx-auto mb-3" />
                    <p className="text-[var(--foreground)] font-medium mb-1">No Copy Trades</p>
                    <p className="text-[var(--text-muted)] text-sm mb-4">Subscribe to a leader to start copy trading</p>
                    <Link href="/copy-trading" className="text-[var(--accent-green)] text-sm hover:underline">Find Leaders</Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {copyPositions.map((position) => (
                      <CopyPositionCard key={position.copyPositionId} position={position} />
                    ))}
                  </div>
                )
              )}

              {activeTab === "history" && (
                <div className="bg-[var(--sidebar-bg)] border border-[var(--card-bg)] rounded-lg">
                  {transactions.length === 0 ? (
                    <div className="p-10 text-center">
                      <History className="w-10 h-10 text-[var(--border-color)] mx-auto mb-3" />
                      <p className="text-[var(--foreground)] font-medium mb-1">No Transactions</p>
                      <p className="text-[var(--text-muted)] text-sm">Your history will appear here</p>
                    </div>
                  ) : (
                    <div className="p-4">
                      {transactions.map((tx, idx) => (
                        <TransactionRow key={`${tx.txHash}-${idx}`} tx={tx} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </PageLayout>
  )
}
