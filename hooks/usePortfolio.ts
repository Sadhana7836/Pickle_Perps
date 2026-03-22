"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useStellarWallet } from "@/contexts/StellarContext"
import { callContract, toScVal, formatAmount } from "@/lib/soroban"
import { CONTRACT_IDS } from "@/lib/stellar"
import { CopyPosition } from "@/lib/copyTrading"

export interface TokenHolding {
  address: string
  name: string
  symbol: string
  balance: string
  balanceFormatted: string
  price: number
  value: number
  change24h: number
  imageHash?: string
}

export interface Transaction {
  txHash: string
  tokenAddress: string
  tokenSymbol: string
  type: "buy" | "sell"
  amount: string
  value: number
  timestamp: number
}

export interface PortfolioPosition {
  positionId: number
  token: string
  tokenName: string
  tokenSymbol: string
  tokenImageHash: string
  isLong: boolean
  size: string
  margin: string
  leverage: number
  entryPrice: number
  currentPrice: number
  pnl: number
  isProfit: boolean
  liquidationPrice: number
}

export interface CopyPositionWithDetails {
  copyPositionId: number
  originalPositionId: number
  copiedPositionId: number
  leader: string
  isRWA: boolean
  followerMargin: string
  leaderMargin: string
  isOpen: boolean
  createdAt: number
}

export interface ActivityDataPoint {
  timestamp: number
  value: number
}

// Dummy address used for read-only contract calls
const DUMMY_CALLER = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"

export const usePortfolio = () => {
  const { address, isConnected } = useStellarWallet()
  const [holdings, setHoldings] = useState<TokenHolding[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [positions, setPositions] = useState<PortfolioPosition[]>([])
  const [copyPositions, setCopyPositions] = useState<CopyPositionWithDetails[]>([])
  const [activityData, setActivityData] = useState<ActivityDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const perpetualContractId = CONTRACT_IDS.perpetualTrading
  const copyTradingContractId = CONTRACT_IDS.copyTrading
  const tokenFactoryContractId = CONTRACT_IDS.tokenFactory
  const bondingCurveContractId = CONTRACT_IDS.bondingCurve

  const fetchPositions = useCallback(async () => {
    if (!address) {
      setPositions([])
      return
    }

    try {
      if (!perpetualContractId) {
        setPositions([])
        return
      }

      let userPositionIds: bigint[] = []
      try {
        userPositionIds = await callContract(
          perpetualContractId,
          "get_user_positions",
          [toScVal(address, 'address')],
          address
        ) || []
      } catch {
        setPositions([])
        return
      }

      if (!userPositionIds || userPositionIds.length === 0) {
        setPositions([])
        return
      }

      const results: PortfolioPosition[] = []

      for (const positionId of userPositionIds) {
        try {
          const pos = await callContract(
            perpetualContractId,
            "get_position",
            [toScVal(positionId.toString(), 'u64')],
            address
          )

          // Soroban returns snake_case fields
          const isOpen = pos?.is_open ?? pos?.isOpen
          if (!isOpen) continue

          let pnlValue = 0
          let isProfit = false
          try {
            // get_position_pnl returns PnlResult { pnl, is_profit }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pnlData: any = await callContract(
              perpetualContractId,
              "get_position_pnl",
              [toScVal(positionId.toString(), 'u64')],
              address
            )
            if (pnlData) {
              const pnlVal = pnlData.pnl ?? pnlData[0]
              pnlValue = Number(formatAmount(pnlVal))
              isProfit = pnlData.is_profit ?? pnlData.isProfit ?? pnlData[1]
            }
          } catch { /* */ }

          let liquidationPrice = 0
          try {
            const liqData = await callContract(
              perpetualContractId,
              "get_liquidation_price",
              [toScVal(positionId.toString(), 'u64')],
              address
            )
            if (liqData) {
              liquidationPrice = Number(formatAmount(liqData))
            }
          } catch { /* */ }

          results.push({
            positionId: Number(positionId),
            token: pos.token || "",
            tokenName: "Unknown Token",
            tokenSymbol: "UNK",
            tokenImageHash: "",
            isLong: pos.is_long ?? pos.isLong ?? false,
            size: formatAmount(pos.size || BigInt(0)),
            margin: formatAmount(pos.margin || BigInt(0)),
            leverage: Number(pos.leverage || 0),
            entryPrice: Number(formatAmount(pos.entry_price || pos.entryPrice || BigInt(0))),
            currentPrice: 0,
            pnl: pnlValue,
            isProfit,
            liquidationPrice,
          })
        } catch { /* */ }
      }

      setPositions(results)
    } catch (err: unknown) {
      console.error('[Portfolio] Failed to fetch positions:', err instanceof Error ? err.message : err)
      setPositions([])
    }
  }, [address, perpetualContractId])

  const fetchCopyPositions = useCallback(async () => {
    if (!address || !copyTradingContractId) {
      setCopyPositions([])
      return
    }

    try {
      const rawPositions = await callContract(
        copyTradingContractId,
        "get_follower_copy_positions",
        [toScVal(address, 'address')],
        address
      ) as CopyPosition[] | null

      if (!rawPositions?.length) {
        setCopyPositions([])
        return
      }

      const processed: CopyPositionWithDetails[] = rawPositions
        .filter((pos) => pos.isOpen)
        .map((pos, idx) => ({
          copyPositionId: idx,
          originalPositionId: Number(pos.originalPositionId),
          copiedPositionId: Number(pos.copiedPositionId),
          leader: pos.leader,
          isRWA: pos.isRWA,
          followerMargin: formatAmount(pos.followerMargin),
          leaderMargin: formatAmount(pos.leaderMargin),
          isOpen: pos.isOpen,
          createdAt: Number(pos.createdAt) * 1000,
        }))

      setCopyPositions(processed)
    } catch (err: unknown) {
      console.warn('[Portfolio] Failed to fetch copy positions:', err instanceof Error ? err.message : err)
      setCopyPositions([])
    }
  }, [address, copyTradingContractId])

  const fetchHoldings = useCallback(async () => {
    if (!address || !isConnected) {
      setHoldings([])
      return
    }

    try {
      // Fetch token list from factory contract
      if (tokenFactoryContractId) {
        try {
          const tokens = await callContract(
            tokenFactoryContractId,
            "get_all_tokens",
            [],
            DUMMY_CALLER
          ) as string[] | null

          if (tokens?.length) {
            const results: TokenHolding[] = []

            for (const tokenAddr of tokens) {
              try {
                const balance = await callContract(
                  tokenAddr,
                  "balance",
                  [toScVal(address, 'address')],
                  address
                )

                const balanceFormatted = formatAmount(balance || BigInt(0))

                if (Number(balanceFormatted) > 0) {
                  // Get token info for name/symbol
                  let name = "Unknown"
                  let symbol = "UNK"
                  let imageHash = ""
                  let price = 0

                  try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const info: any = await callContract(
                      tokenFactoryContractId,
                      "get_token_info",
                      [toScVal(tokenAddr, 'address')],
                      DUMMY_CALLER
                    )
                    if (info) {
                      name = info.name || "Unknown"
                      symbol = info.symbol || "UNK"
                      imageHash = info.image_hash || ""
                    }
                  } catch { /* */ }

                  // Try to get price from bonding curve
                  if (bondingCurveContractId) {
                    try {
                      const curvePrice = await callContract(
                        bondingCurveContractId,
                        "get_current_price",
                        [toScVal(tokenAddr, 'address')],
                        DUMMY_CALLER
                      )
                      if (curvePrice) {
                        price = Number(curvePrice) / 1e8
                      }
                    } catch { /* */ }
                  }

                  results.push({
                    address: tokenAddr,
                    name,
                    symbol,
                    balance: balanceFormatted,
                    balanceFormatted: Number(balanceFormatted).toFixed(4),
                    price,
                    value: Number(balanceFormatted) * price,
                    change24h: 0,
                    imageHash,
                  })
                }
              } catch { /* */ }
            }

            setHoldings(results)
            return
          }
        } catch { /* */ }
      }

      setHoldings([])
    } catch (err: unknown) {
      console.warn('Failed to fetch holdings:', err instanceof Error ? err.message : err)
      setHoldings([])
    }
  }, [address, isConnected, tokenFactoryContractId, bondingCurveContractId])

  const fetchTransactionHistory = useCallback(async () => {
    // Transaction history would be fetched from Horizon API
    // Not available via Soroban contract calls directly
    setTransactions([])
    setActivityData([])
  }, [])

  const totalValue = useMemo(() => holdings.reduce((sum, h) => sum + h.value, 0), [holdings])
  const totalPnL = useMemo(() => positions.reduce((sum, p) => sum + p.pnl, 0), [positions])

  // Load initial data
  useEffect(() => {
    if (!isConnected || !address) {
      setIsLoading(false)
      return
    }

    const loadData = async () => {
      setIsLoading(true)
      await Promise.all([fetchHoldings(), fetchPositions(), fetchCopyPositions()])
      setIsLoading(false)
    }

    loadData()
    const handlePriceUpdate = () => setTimeout(loadData, 2000)
    window.addEventListener('priceUpdate', handlePriceUpdate)
    const interval = setInterval(loadData, 30000)

    return () => {
      clearInterval(interval)
      window.removeEventListener('priceUpdate', handlePriceUpdate)
    }
  }, [isConnected, address, fetchHoldings, fetchPositions, fetchCopyPositions])

  // Load transaction history after initial load
  useEffect(() => {
    if (!isConnected || !address) return

    const timeoutId = setTimeout(() => {
      fetchTransactionHistory()
    }, 2000)

    const interval = setInterval(() => {
      fetchTransactionHistory()
    }, 60000)

    return () => {
      clearTimeout(timeoutId)
      clearInterval(interval)
    }
  }, [isConnected, address, fetchTransactionHistory])

  // Reset transactions when address changes
  useEffect(() => {
    setTransactions([])
    setActivityData([])
  }, [address])

  return {
    holdings,
    transactions,
    positions,
    copyPositions,
    activityData,
    totalValue,
    totalPnL,
    isLoading,
    isConnected: !!isConnected,
    refetch: () => {
      fetchHoldings()
      fetchPositions()
      fetchCopyPositions()
      fetchTransactionHistory()
    },
  }
}
