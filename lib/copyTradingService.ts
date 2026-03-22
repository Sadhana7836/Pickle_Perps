/**
 * Copy Trading Event Service
 * Real-time monitoring of leader trades for copy execution
 * Uses Stellar/Soroban event polling instead of EVM event watching
 */

import { server } from './stellar';
import { CONTRACT_IDS } from './stellar';
import { formatAmount, parseAmount } from './soroban';

// ============ Types ============

export interface LeaderPositionEvent {
  type: "OPEN" | "CLOSE"
  leader: string
  positionId: bigint
  token: string | null
  assetId: string | null
  isLong: boolean
  size: string
  margin: string
  leverage: number
  entryPrice: string
  isRWA: boolean
  timestamp: number
  txHash: string
  blockNumber: bigint
}

export interface PendingCopyTrade {
  id: string
  leaderEvent: LeaderPositionEvent
  suggestedMargin: string
  suggestedLeverage: number
  expiresAt: number
  status: "pending" | "accepted" | "rejected" | "expired"
  leaderCapital?: string
  followerAllocation?: string
  useProportional?: boolean
}

export interface CopyExecutionResult {
  success: boolean
  copyPositionId?: bigint
  error?: string
  txHash?: string
}

type LeaderTradeCallback = (event: LeaderPositionEvent) => void
type PendingCopyCallback = (pending: PendingCopyTrade) => void

// ============ Service Class ============

class CopyTradingService {
  private watchedLeaders: Set<string> = new Set()
  private leaderTradeCallbacks: Map<string, Set<LeaderTradeCallback>> = new Map()
  private globalLeaderCallbacks: Set<LeaderTradeCallback> = new Set()
  private pendingCopyCallbacks: Set<PendingCopyCallback> = new Set()
  private isListening = false
  private pollingInterval: ReturnType<typeof setInterval> | null = null
  private lastLedger: number = 0

  private pendingCopyTrades: Map<string, PendingCopyTrade> = new Map()

  private autoModeEnabled: Map<string, boolean> = new Map()
  private autoExecuteCallback: ((trade: PendingCopyTrade) => Promise<CopyExecutionResult>) | null = null

  private readonly COPY_EXPIRY_MS = 30000

  initialize() {
    if (this.isListening) return;
    this.startListening();
  }

  private startListening() {
    if (this.isListening) return
    this.isListening = true
    console.log("[CopyTrading] Starting Soroban event polling...")

    const perpetualContractId = CONTRACT_IDS.perpetualTrading
    const rwaContractId = CONTRACT_IDS.rwaPerpeturalTrading

    if (!perpetualContractId && !rwaContractId) {
      console.warn("[CopyTrading] No trading contracts deployed")
      return
    }

    const contractIds: string[] = []
    if (perpetualContractId) contractIds.push(perpetualContractId)
    if (rwaContractId) contractIds.push(rwaContractId)

    // Poll for events every 3 seconds
    this.pollingInterval = setInterval(async () => {
      try {
        const events = await server.getEvents({
          startLedger: this.lastLedger || undefined,
          filters: contractIds.map(id => ({
            type: 'contract' as const,
            contractIds: [id],
          })),
          limit: 50,
        });

        if (events.events && events.events.length > 0) {
          for (const event of events.events) {
            const leaderEvent = this.parseTradeEvent(event)
            if (leaderEvent) {
              this.handleLeaderTrade(leaderEvent)
            }
          }

          const lastEvent = events.events[events.events.length - 1]
          if (lastEvent && lastEvent.ledger) {
            this.lastLedger = lastEvent.ledger
          }
        }
      } catch {
        // Polling error, will retry
      }
    }, 3000)

    this.startExpiryChecker()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseTradeEvent(event: any): LeaderPositionEvent | null {
    try {
      const args = event.value
      if (!args) return null

      return {
        type: args.type === "close" ? "CLOSE" : "OPEN",
        leader: args.user || '',
        positionId: BigInt(args.positionId || 0),
        token: args.token || null,
        assetId: args.assetId || null,
        isLong: args.isLong || false,
        size: args.size ? formatAmount(BigInt(args.size)) : "0",
        margin: args.margin ? formatAmount(BigInt(args.margin)) : "0",
        leverage: Number(args.leverage || 0),
        entryPrice: args.entryPrice ? String(args.entryPrice) : "0",
        isRWA: !!args.assetId,
        timestamp: Date.now(),
        txHash: event.txHash || '',
        blockNumber: BigInt(event.ledger || 0),
      }
    } catch (error) {
      console.error("[CopyTrading] Failed to parse trade event:", error)
      return null
    }
  }

  private handleLeaderTrade(event: LeaderPositionEvent) {
    const leaderKey = event.leader.toLowerCase()

    if (!this.watchedLeaders.has(leaderKey)) return

    console.log(`[CopyTrading] Leader ${leaderKey.slice(0, 10)}... ${event.type} position`)

    this.globalLeaderCallbacks.forEach((cb) => {
      try { cb(event) } catch (e) { console.error("[CopyTrading] Callback error:", e) }
    })

    const leaderCallbacks = this.leaderTradeCallbacks.get(leaderKey)
    if (leaderCallbacks) {
      leaderCallbacks.forEach((cb) => {
        try { cb(event) } catch (e) { console.error("[CopyTrading] Callback error:", e) }
      })
    }

    if (event.type === "OPEN") {
      this.createPendingCopyTrade(event)
    }
  }

  private createPendingCopyTrade(event: LeaderPositionEvent) {
    const id = `${event.leader}-${event.positionId}-${event.timestamp}`

    const pending: PendingCopyTrade = {
      id,
      leaderEvent: event,
      suggestedMargin: event.margin,
      suggestedLeverage: event.leverage,
      expiresAt: Date.now() + this.COPY_EXPIRY_MS,
      status: "pending",
    }

    this.pendingCopyTrades.set(id, pending)

    const leaderKey = event.leader.toLowerCase()
    if (this.autoModeEnabled.get(leaderKey) && this.autoExecuteCallback) {
      this.autoExecuteCallback(pending)
        .then((result) => {
          pending.status = result.success ? "accepted" : "rejected"
          this.pendingCopyTrades.set(id, pending)
        })
        .catch((e) => {
          pending.status = "rejected"
          this.pendingCopyTrades.set(id, pending)
        })
    } else {
      this.pendingCopyCallbacks.forEach((cb) => {
        try { cb(pending) } catch (e) { console.error("[CopyTrading] Pending copy callback error:", e) }
      })
    }
  }

  private startExpiryChecker() {
    setInterval(() => {
      const now = Date.now()
      this.pendingCopyTrades.forEach((pending, id) => {
        if (pending.status === "pending" && pending.expiresAt < now) {
          pending.status = "expired"
          this.pendingCopyTrades.set(id, pending)
        }
      })

      const cutoff = now - 5 * 60 * 1000
      this.pendingCopyTrades.forEach((pending, id) => {
        if (pending.expiresAt < cutoff) {
          this.pendingCopyTrades.delete(id)
        }
      })
    }, 5000)
  }

  // ============ Public API ============

  watchLeader(leader: string) {
    this.watchedLeaders.add(leader.toLowerCase())
  }

  unwatchLeader(leader: string) {
    this.watchedLeaders.delete(leader.toLowerCase())
  }

  watchLeaders(leaders: string[]) {
    leaders.forEach((l) => this.watchLeader(l))
  }

  clearWatchedLeaders() {
    this.watchedLeaders.clear()
  }

  subscribeToLeader(leader: string, callback: LeaderTradeCallback): () => void {
    const leaderKey = leader.toLowerCase()
    this.watchLeader(leader)

    if (!this.leaderTradeCallbacks.has(leaderKey)) {
      this.leaderTradeCallbacks.set(leaderKey, new Set())
    }

    this.leaderTradeCallbacks.get(leaderKey)!.add(callback)

    return () => {
      const callbacks = this.leaderTradeCallbacks.get(leaderKey)
      if (callbacks) {
        callbacks.delete(callback)
        if (callbacks.size === 0) {
          this.leaderTradeCallbacks.delete(leaderKey)
        }
      }
    }
  }

  subscribeToAllLeaderTrades(callback: LeaderTradeCallback): () => void {
    this.globalLeaderCallbacks.add(callback)
    return () => { this.globalLeaderCallbacks.delete(callback) }
  }

  subscribeToPendingCopies(callback: PendingCopyCallback): () => void {
    this.pendingCopyCallbacks.add(callback)
    return () => { this.pendingCopyCallbacks.delete(callback) }
  }

  getPendingCopyTrades(): PendingCopyTrade[] {
    return Array.from(this.pendingCopyTrades.values()).filter((p) => p.status === "pending")
  }

  acceptPendingCopy(id: string) {
    const pending = this.pendingCopyTrades.get(id)
    if (pending) {
      pending.status = "accepted"
      this.pendingCopyTrades.set(id, pending)
    }
  }

  rejectPendingCopy(id: string) {
    const pending = this.pendingCopyTrades.get(id)
    if (pending) {
      pending.status = "rejected"
      this.pendingCopyTrades.set(id, pending)
    }
  }

  enableAutoMode(leader: string, executeCallback: (trade: PendingCopyTrade) => Promise<CopyExecutionResult>) {
    this.autoModeEnabled.set(leader.toLowerCase(), true)
    this.autoExecuteCallback = executeCallback
  }

  disableAutoMode(leader: string) {
    this.autoModeEnabled.set(leader.toLowerCase(), false)
  }

  isAutoModeEnabled(leader: string): boolean {
    return this.autoModeEnabled.get(leader.toLowerCase()) || false
  }

  getWatchedLeaders(): string[] {
    return Array.from(this.watchedLeaders)
  }

  stop() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
    }
    this.isListening = false
    this.watchedLeaders.clear()
    this.leaderTradeCallbacks.clear()
    this.globalLeaderCallbacks.clear()
    this.pendingCopyCallbacks.clear()
    this.pendingCopyTrades.clear()
    this.autoModeEnabled.clear()
  }
}

// ============ Helper Functions ============

export function calculateFollowerMargin(
  leaderMargin: string,
  leaderCapital: string,
  followerAllocation: string,
  maxPositionSize: string = "0",
  useProportional: boolean = true
): string {
  const leaderMarginBn = parseAmount(leaderMargin)
  const leaderCapitalBn = parseAmount(leaderCapital)
  const followerAllocationBn = parseAmount(followerAllocation)
  const maxPositionSizeBn = parseAmount(maxPositionSize)

  let marginBn: bigint

  if (useProportional && leaderCapitalBn > BigInt(0)) {
    marginBn = (leaderMarginBn * followerAllocationBn) / leaderCapitalBn

    if (marginBn > followerAllocationBn) {
      marginBn = followerAllocationBn
    }
  } else {
    marginBn = followerAllocationBn

    if (leaderMarginBn < marginBn) {
      marginBn = leaderMarginBn
    }
  }

  if (maxPositionSizeBn > BigInt(0) && marginBn > maxPositionSizeBn) {
    marginBn = maxPositionSizeBn
  }

  const minMargin = parseAmount("0.001")
  if (marginBn < minMargin) {
    return "0"
  }

  return formatAmount(marginBn)
}

export function calculateLeaderCapitalPercentage(
  leaderMargin: string,
  leaderCapital: string
): number {
  const marginBn = parseAmount(leaderMargin)
  const capitalBn = parseAmount(leaderCapital)

  if (capitalBn === BigInt(0)) return 0

  return Number((marginBn * BigInt(10000)) / capitalBn) / 100
}

// Singleton instance
export const copyTradingService = new CopyTradingService()
