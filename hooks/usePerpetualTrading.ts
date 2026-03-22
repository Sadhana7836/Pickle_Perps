"use client"

import { useState, useEffect, useCallback } from "react"
import { useStellarWallet } from "@/contexts/StellarContext"
import { callContract, toScVal, formatAmount, parseAmount } from "@/lib/soroban"
import { CONTRACT_IDS } from "@/lib/stellar"
import { POLLING } from "@/lib/constants"

export interface Position {
  user: string
  token: string
  isLong: boolean
  size: string
  margin: string
  leverage: number
  entryPrice: string
  entryTime: bigint
  lastFundingTime: bigint
  isOpen: boolean
}

export interface PositionData {
  positionId: number
  position: Position
  pnl: string
  isProfit: boolean
  liquidationPrice: string
  shouldLiquidate: boolean
}

export interface TradingState {
  isLoading: boolean
  isPending: boolean
  isConfirming: boolean
  isConfirmed: boolean
  hash: string | undefined
  error: Error | null
}

export interface TradingActions {
  openPosition: (token: string, isLong: boolean, margin: string, leverage: number) => Promise<number>
  closePosition: (positionId: number) => Promise<void>
  updateMemeTokenPrice: (token: string, price: string) => Promise<void>
}

export const usePerpetualTrading = () => {
  const { address } = useStellarWallet()
  const [isLoading, setIsLoading] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [hash, setHash] = useState<string | undefined>(undefined)
  const [error, setError] = useState<Error | null>(null)
  const [userPositionIds, setUserPositionIds] = useState<bigint[]>([])
  const [lastTradeToken, setLastTradeToken] = useState<string | null>(null)

  const contractId = CONTRACT_IDS.perpetualTrading

  const fetchPositions = useCallback(async () => {
    if (!contractId || !address) return

    try {
      const ids = await callContract(
        contractId,
        "get_user_positions",
        [toScVal(address, 'address')],
        address
      )
      setUserPositionIds(ids || [])
    } catch {
      // Contract not deployed
    }
  }, [contractId, address])

  useEffect(() => {
    fetchPositions()
    const interval = setInterval(fetchPositions, POLLING.POSITIONS_REFRESH)
    return () => clearInterval(interval)
  }, [fetchPositions])

  // Contract signature: open_position(env, user: Address, token_id: Address, is_long: bool, margin: i128, leverage: u32)
  const openPosition = async (
    token: string,
    isLong: boolean,
    margin: string,
    leverage: number
  ): Promise<number> => {
    if (!margin || !leverage || !contractId || !address) {
      throw new Error("Margin, leverage, contract, and wallet are required")
    }

    try {
      setIsLoading(true)
      setIsPending(true)
      setLastTradeToken(token)
      setError(null)
      setIsConfirmed(false)

      const marginScaled = parseAmount(margin)

      const result = await callContract(
        contractId,
        "open_position",
        [
          toScVal(address, 'address'),              // user
          toScVal(token, 'address'),                 // token_id
          toScVal(isLong, 'bool'),                   // is_long
          toScVal(marginScaled.toString(), 'i128'),  // margin
          toScVal(leverage, 'u32'),                  // leverage (u32, not u64)
        ],
        address,
        true
      )

      setIsPending(false)
      setIsConfirming(false)
      setIsConfirmed(true)

      if (lastTradeToken && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("tradeConfirmed", {
          detail: { tokenAddress: lastTradeToken, action: "perp" }
        }))
        setLastTradeToken(null)
      }

      await fetchPositions()
      return result ? Number(result) : 0
    } catch (err) {
      console.error("Error opening position:", err)
      setError(err as Error)
      const message = err instanceof Error ? err.message : String(err)
      if (message.includes("price not available")) {
        throw new Error("Price not set for this token. Please set a price first.")
      }
      throw err
    } finally {
      setIsLoading(false)
      setIsPending(false)
      setIsConfirming(false)
    }
  }

  // Contract signature: close_position(env, caller: Address, position_id: u64)
  const closePosition = async (positionId: number): Promise<void> => {
    if (!contractId || !address) {
      throw new Error("Contract and wallet are required")
    }

    try {
      setIsLoading(true)
      setIsPending(true)
      setError(null)

      await callContract(
        contractId,
        "close_position",
        [
          toScVal(address, 'address'),                    // caller
          toScVal(BigInt(positionId).toString(), 'u64'),   // position_id
        ],
        address,
        true
      )

      setIsConfirmed(true)
      await fetchPositions()
    } catch (err) {
      console.error("Error closing position:", err)
      setError(err as Error)
      throw err
    } finally {
      setIsLoading(false)
      setIsPending(false)
      setIsConfirming(false)
    }
  }

  // Contract signature: update_meme_token_price(env, caller: Address, token_id: Address, price: i128)
  const updateMemeTokenPrice = async (token: string, price: string): Promise<void> => {
    if (!contractId || !address) {
      throw new Error("Contract and wallet are required")
    }

    try {
      setIsLoading(true)
      const priceScaled = BigInt(Math.floor(parseFloat(price) * 1e8))

      await callContract(
        contractId,
        "update_meme_token_price",
        [
          toScVal(address, 'address'),              // caller
          toScVal(token, 'address'),                 // token_id
          toScVal(priceScaled.toString(), 'i128'),   // price
        ],
        address,
        true
      )
    } catch (err) {
      console.error("Error updating price:", err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const actions: TradingActions = {
    openPosition,
    closePosition,
    updateMemeTokenPrice,
  }

  const state: TradingState = {
    isLoading: isLoading || isPending || isConfirming,
    isPending,
    isConfirming,
    isConfirmed,
    hash,
    error,
  }

  return {
    userPositionIds,
    actions,
    state,
    refetch: fetchPositions,
  }
}

// Hook to get position details
export const usePosition = (positionId: number | null) => {
  const { address } = useStellarWallet()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [positionData, setPositionData] = useState<any>(null)
  const [pnlData, setPnlData] = useState<{ value: string; isProfit: boolean } | null>(null)
  const [liquidationPrice, setLiquidationPrice] = useState<string>("0")
  const [shouldLiquidate, setShouldLiquidate] = useState(false)

  const contractId = CONTRACT_IDS.perpetualTrading

  const fetchPosition = useCallback(async () => {
    if (positionId === null || !contractId || !address) return

    try {
      const pos = await callContract(
        contractId,
        "get_position",
        [toScVal(BigInt(positionId).toString(), 'u64')],
        address
      )

      if (!pos) {
        setPositionData(null)
        return
      }

      setPositionData(pos)

      if (pos.isOpen || pos.is_open) {
        try {
          // get_position_pnl returns PnlResult { pnl, is_profit }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pnl: any = await callContract(
            contractId,
            "get_position_pnl",
            [toScVal(BigInt(positionId).toString(), 'u64')],
            address
          )
          if (pnl) {
            const pnlValue = pnl.pnl ?? pnl[0]
            const isProfit = pnl.is_profit ?? pnl.isProfit ?? pnl[1]
            setPnlData({ value: formatAmount(pnlValue), isProfit })
          }
        } catch {
          // PnL fetch failed
        }

        try {
          const liqPrice = await callContract(
            contractId,
            "get_liquidation_price",
            [toScVal(BigInt(positionId).toString(), 'u64')],
            address
          )
          if (liqPrice) {
            setLiquidationPrice(formatAmount(liqPrice))
          }
        } catch {
          // Liquidation price fetch failed
        }

        try {
          const shouldLiq = await callContract(
            contractId,
            "should_liquidate",
            [toScVal(BigInt(positionId).toString(), 'u64')],
            address
          )
          setShouldLiquidate(shouldLiq || false)
        } catch {
          // Should liquidate fetch failed
        }
      }
    } catch {
      setPositionData(null)
    }
  }, [positionId, contractId, address])

  useEffect(() => {
    fetchPosition()
  }, [fetchPosition])

  if (!positionData) return null

  return {
    position: {
      user: positionData.user,
      token: positionData.token,
      isLong: positionData.is_long ?? positionData.isLong,
      size: formatAmount(positionData.size || BigInt(0)),
      margin: formatAmount(positionData.margin || BigInt(0)),
      leverage: Number(positionData.leverage || 0),
      entryPrice: formatAmount(positionData.entry_price || positionData.entryPrice || BigInt(0)),
      entryTime: positionData.entry_time || positionData.entryTime || BigInt(0),
      lastFundingTime: BigInt(0),
      isOpen: positionData.is_open ?? positionData.isOpen,
    },
    pnl: pnlData?.value || "0",
    isProfit: pnlData?.isProfit || false,
    liquidationPrice,
    shouldLiquidate,
    refetch: fetchPosition,
  }
}
