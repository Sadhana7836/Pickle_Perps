"use client"

import { useState, useEffect, useCallback } from "react"
import { useStellarWallet } from "@/contexts/StellarContext"
import { callContract, toScVal, formatAmount, parseAmount } from "@/lib/soroban"
import { CONTRACT_IDS } from "@/lib/stellar"
import {
  copyTradingAddress,
  isCopyTradingDeployed,
  Leader,
  Subscription,
  SubscriptionConfig,
  CopyPosition,
  defaultSubscriptionConfig
} from "@/lib/copyTrading"
import { POLLING } from "@/lib/constants"

// ============ Types ============

export interface LeaderData extends Leader {
  address: string
}

export interface SubscriptionData extends Subscription {
  leaderAddress: string
}

export interface CopyPositionData extends CopyPosition {
  id: bigint
}

export interface CopyTradingState {
  isLoading: boolean
  isPending: boolean
  isConfirming: boolean
  isConfirmed: boolean
  hash: string | undefined
  error: Error | null
}

// ============ Main Hook ============

export const useCopyTrading = () => {
  const { address } = useStellarWallet()
  const [isLoading, setIsLoading] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [hash, setHash] = useState<string | undefined>(undefined)
  const [error, setError] = useState<Error | null>(null)

  const [isLeaderData, setIsLeaderData] = useState<boolean | undefined>(undefined)
  const [leaderProfile, setLeaderProfile] = useState<Leader | undefined>(undefined)
  const [subscriptionsData, setSubscriptionsData] = useState<Subscription[]>([])
  const [copyPositionsData, setCopyPositionsData] = useState<CopyPosition[]>([])
  const [pendingProfitShare, setPendingProfitShare] = useState<string>("0")
  const [leaderCapitalData, setLeaderCapitalData] = useState<string>("0")

  const contractId = CONTRACT_IDS.copyTrading
  const isDeployed = isCopyTradingDeployed()

  const fetchData = useCallback(async () => {
    if (!contractId || !address) return

    try {
      const isLeader = await callContract(
        contractId,
        "is_leader",
        [toScVal(address, 'address')],
        address
      )
      setIsLeaderData(isLeader)

      if (isLeader) {
        try {
          const profile = await callContract(
            contractId,
            "get_leader",
            [toScVal(address, 'address')],
            address
          )
          setLeaderProfile(profile)
        } catch { /* */ }

        try {
          const profitShare = await callContract(
            contractId,
            "leader_pending_profit_share",
            [toScVal(address, 'address')],
            address
          )
          setPendingProfitShare(profitShare ? formatAmount(profitShare) : "0")
        } catch { /* */ }

        try {
          const capital = await callContract(
            contractId,
            "get_leader_capital",
            [toScVal(address, 'address')],
            address
          )
          setLeaderCapitalData(capital ? formatAmount(capital) : "0")
        } catch { /* */ }
      }

      try {
        const subs = await callContract(
          contractId,
          "get_follower_subscriptions",
          [toScVal(address, 'address')],
          address
        )
        setSubscriptionsData(subs || [])
      } catch { /* */ }

      try {
        const positions = await callContract(
          contractId,
          "get_follower_copy_positions",
          [toScVal(address, 'address')],
          address
        )
        setCopyPositionsData(positions || [])
      } catch { /* */ }
    } catch {
      // Contract not deployed
    }
  }, [contractId, address])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, POLLING.POSITIONS_REFRESH)
    return () => clearInterval(interval)
  }, [fetchData])

  // ============ Leader Actions ============

  const registerAsLeader = useCallback(async (
    profitShareBps: number,
    minFollowAmount: string
  ): Promise<void> => {
    if (!isDeployed || !contractId || !address) throw new Error("CopyTrading contract not deployed or wallet not connected")

    try {
      setIsLoading(true)
      setIsPending(true)
      setError(null)

      const minFollowScaled = parseAmount(minFollowAmount)
      await callContract(
        contractId,
        "register_as_leader",
        [
          toScVal(BigInt(profitShareBps).toString(), 'u64'),
          toScVal(minFollowScaled.toString(), 'i128'),
        ],
        address,
        true
      )

      setIsConfirmed(true)
      await fetchData()
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setIsLoading(false)
      setIsPending(false)
    }
  }, [contractId, isDeployed, address, fetchData])

  const updateLeaderSettings = useCallback(async (
    profitShareBps: number,
    minFollowAmount: string
  ): Promise<void> => {
    if (!isDeployed || !contractId || !address) throw new Error("CopyTrading contract not deployed")

    try {
      setIsLoading(true)
      setIsPending(true)

      const minFollowScaled = parseAmount(minFollowAmount)
      await callContract(
        contractId,
        "update_leader_settings",
        [
          toScVal(BigInt(profitShareBps).toString(), 'u64'),
          toScVal(minFollowScaled.toString(), 'i128'),
        ],
        address,
        true
      )

      setIsConfirmed(true)
      await fetchData()
    } finally {
      setIsLoading(false)
      setIsPending(false)
    }
  }, [contractId, isDeployed, address, fetchData])

  const deactivateLeader = useCallback(async (): Promise<void> => {
    if (!isDeployed || !contractId || !address) throw new Error("CopyTrading contract not deployed")

    try {
      setIsLoading(true)
      await callContract(contractId, "deactivate_leader", [], address, true)
      setIsConfirmed(true)
      await fetchData()
    } finally {
      setIsLoading(false)
    }
  }, [contractId, isDeployed, address, fetchData])

  const reactivateLeader = useCallback(async (): Promise<void> => {
    if (!isDeployed || !contractId || !address) throw new Error("CopyTrading contract not deployed")

    try {
      setIsLoading(true)
      await callContract(contractId, "reactivate_leader", [], address, true)
      setIsConfirmed(true)
      await fetchData()
    } finally {
      setIsLoading(false)
    }
  }, [contractId, isDeployed, address, fetchData])

  const claimProfitShare = useCallback(async (): Promise<void> => {
    if (!isDeployed || !contractId || !address) throw new Error("CopyTrading contract not deployed")

    try {
      setIsLoading(true)
      await callContract(contractId, "claim_profit_share", [], address, true)
      setIsConfirmed(true)
      await fetchData()
    } finally {
      setIsLoading(false)
    }
  }, [contractId, isDeployed, address, fetchData])

  const setLeaderCapital = useCallback(async (capital: string): Promise<void> => {
    if (!isDeployed || !contractId || !address) throw new Error("CopyTrading contract not deployed")

    try {
      setIsLoading(true)
      const capitalScaled = parseAmount(capital)
      await callContract(
        contractId,
        "set_leader_capital",
        [toScVal(capitalScaled.toString(), 'i128')],
        address,
        true
      )
      setIsConfirmed(true)
      await fetchData()
    } finally {
      setIsLoading(false)
    }
  }, [contractId, isDeployed, address, fetchData])

  // ============ Follower Actions ============

  const subscribe = useCallback(async (
    leader: string,
    config: SubscriptionConfig
  ): Promise<void> => {
    if (!isDeployed || !contractId || !address) throw new Error("CopyTrading contract not deployed")

    try {
      setIsLoading(true)
      await callContract(
        contractId,
        "subscribe",
        [
          toScVal(leader, 'address'),
          toScVal(JSON.stringify(config), 'string'),
        ],
        address,
        true
      )
      setIsConfirmed(true)
      await fetchData()
    } finally {
      setIsLoading(false)
    }
  }, [contractId, isDeployed, address, fetchData])

  const unsubscribe = useCallback(async (leader: string): Promise<void> => {
    if (!isDeployed || !contractId || !address) throw new Error("CopyTrading contract not deployed")

    try {
      setIsLoading(true)
      await callContract(
        contractId,
        "unsubscribe",
        [toScVal(leader, 'address')],
        address,
        true
      )
      setIsConfirmed(true)
      await fetchData()
    } finally {
      setIsLoading(false)
    }
  }, [contractId, isDeployed, address, fetchData])

  const updateSubscription = useCallback(async (
    leader: string,
    config: SubscriptionConfig
  ): Promise<void> => {
    if (!isDeployed || !contractId || !address) throw new Error("CopyTrading contract not deployed")

    try {
      setIsLoading(true)
      await callContract(
        contractId,
        "update_subscription",
        [
          toScVal(leader, 'address'),
          toScVal(JSON.stringify(config), 'string'),
        ],
        address,
        true
      )
      setIsConfirmed(true)
      await fetchData()
    } finally {
      setIsLoading(false)
    }
  }, [contractId, isDeployed, address, fetchData])

  const addFunds = useCallback(async (
    leader: string,
    amount: string
  ): Promise<void> => {
    if (!isDeployed || !contractId || !address) throw new Error("CopyTrading contract not deployed")

    try {
      setIsLoading(true)
      const amountScaled = parseAmount(amount)
      await callContract(
        contractId,
        "add_funds",
        [
          toScVal(leader, 'address'),
          toScVal(amountScaled.toString(), 'i128'),
        ],
        address,
        true
      )
      setIsConfirmed(true)
      await fetchData()
    } finally {
      setIsLoading(false)
    }
  }, [contractId, isDeployed, address, fetchData])

  // ============ Copy Trading Actions ============

  const executeCopyMeme = useCallback(async (
    leader: string,
    leaderPositionId: bigint,
    marginAmount: string
  ): Promise<bigint> => {
    if (!isDeployed || !contractId || !address) throw new Error("CopyTrading contract not deployed")

    try {
      setIsLoading(true)
      const marginScaled = parseAmount(marginAmount)
      const result = await callContract(
        contractId,
        "execute_copy_meme",
        [
          toScVal(leader, 'address'),
          toScVal(leaderPositionId.toString(), 'u64'),
          toScVal(marginScaled.toString(), 'i128'),
        ],
        address,
        true
      )
      setIsConfirmed(true)
      await fetchData()
      return result ? BigInt(result) : BigInt(0)
    } finally {
      setIsLoading(false)
    }
  }, [contractId, isDeployed, address, fetchData])

  const executeCopyRWA = useCallback(async (
    leader: string,
    leaderPositionId: bigint,
    marginAmount: string,
    priceUpdateData: string[] = []
  ): Promise<bigint> => {
    if (!isDeployed || !contractId || !address) throw new Error("CopyTrading contract not deployed")

    try {
      setIsLoading(true)
      const marginScaled = parseAmount(marginAmount)
      const result = await callContract(
        contractId,
        "execute_copy_rwa",
        [
          toScVal(leader, 'address'),
          toScVal(leaderPositionId.toString(), 'u64'),
          toScVal(priceUpdateData.join(','), 'string'),
          toScVal(marginScaled.toString(), 'i128'),
        ],
        address,
        true
      )
      setIsConfirmed(true)
      await fetchData()
      return result ? BigInt(result) : BigInt(0)
    } finally {
      setIsLoading(false)
    }
  }, [contractId, isDeployed, address, fetchData])

  const closeCopiedPosition = useCallback(async (
    copyPositionId: bigint,
    priceUpdateData: string[] = []
  ): Promise<void> => {
    if (!isDeployed || !contractId || !address) throw new Error("CopyTrading contract not deployed")

    try {
      setIsLoading(true)
      await callContract(
        contractId,
        "close_copied_position",
        [
          toScVal(copyPositionId.toString(), 'u64'),
          toScVal(priceUpdateData.join(','), 'string'),
        ],
        address,
        true
      )
      setIsConfirmed(true)
      await fetchData()
    } finally {
      setIsLoading(false)
    }
  }, [contractId, isDeployed, address, fetchData])

  // ============ Return ============

  const state: CopyTradingState = {
    isLoading: isLoading || isPending || isConfirming,
    isPending,
    isConfirming,
    isConfirmed,
    hash,
    error,
  }

  return {
    isDeployed,
    isLeader: isLeaderData,
    leaderProfile,
    subscriptions: subscriptionsData,
    copyPositions: copyPositionsData,
    pendingProfitShare,
    leaderCapital: leaderCapitalData,
    state,

    registerAsLeader,
    updateLeaderSettings,
    deactivateLeader,
    reactivateLeader,
    claimProfitShare,
    setLeaderCapital,

    subscribe,
    unsubscribe,
    updateSubscription,
    addFunds,

    executeCopyMeme,
    executeCopyRWA,
    closeCopiedPosition,

    refetch: {
      isLeader: fetchData,
      leaderProfile: fetchData,
      subscriptions: fetchData,
      copyPositions: fetchData,
      profitShare: fetchData,
      leaderCapital: fetchData,
    },
  }
}

// ============ Leader Details Hook ============

export const useLeaderDetails = (leaderAddress: string | undefined) => {
  const { address } = useStellarWallet()
  const [leader, setLeader] = useState<Leader | null>(null)
  const [isActive, setIsActive] = useState<boolean>(false)
  const [followers, setFollowers] = useState<string[]>([])
  const [leaderCapital, setLeaderCapital] = useState<string>("0")

  const contractId = CONTRACT_IDS.copyTrading
  const isDeployed = isCopyTradingDeployed()

  const fetchData = useCallback(async () => {
    if (!leaderAddress || !contractId || !address) return

    try {
      const leaderData = await callContract(
        contractId,
        "get_leader",
        [toScVal(leaderAddress, 'address')],
        address
      )
      setLeader(leaderData)

      const active = await callContract(
        contractId,
        "is_active_leader",
        [toScVal(leaderAddress, 'address')],
        address
      )
      setIsActive(active || false)

      const followersList = await callContract(
        contractId,
        "get_leader_followers",
        [toScVal(leaderAddress, 'address')],
        address
      )
      setFollowers(followersList || [])

      const capital = await callContract(
        contractId,
        "get_leader_capital",
        [toScVal(leaderAddress, 'address')],
        address
      )
      setLeaderCapital(capital ? formatAmount(capital) : "0")
    } catch {
      // Fetch failed
    }
  }, [leaderAddress, contractId, address])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (!leader) return null

  return {
    leader,
    isActive,
    followers,
    leaderCapital,
    refetch: fetchData,
  }
}

// ============ Subscription Details Hook ============

export const useSubscriptionDetails = (
  followerAddress: string | undefined,
  leaderAddress: string | undefined
) => {
  const { address: walletAddress } = useStellarWallet()
  const [subscription, setSubscription] = useState<Subscription | undefined>(undefined)
  const [isSubscribed, setIsSubscribed] = useState<boolean | undefined>(undefined)

  const contractId = CONTRACT_IDS.copyTrading
  const isDeployed = isCopyTradingDeployed()

  const callerAddress = walletAddress || followerAddress || ''

  const fetchData = useCallback(async () => {
    if (!followerAddress || !leaderAddress || !contractId || !callerAddress) return

    try {
      const sub = await callContract(
        contractId,
        "get_subscription",
        [
          toScVal(followerAddress, 'address'),
          toScVal(leaderAddress, 'address'),
        ],
        callerAddress
      )
      setSubscription(sub)

      const subscribed = await callContract(
        contractId,
        "is_subscribed",
        [
          toScVal(followerAddress, 'address'),
          toScVal(leaderAddress, 'address'),
        ],
        callerAddress
      )
      setIsSubscribed(subscribed)
    } catch {
      // Fetch failed
    }
  }, [followerAddress, leaderAddress, contractId, callerAddress])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    subscription,
    isSubscribed,
    refetch: fetchData,
  }
}
