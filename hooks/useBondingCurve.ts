"use client"

import { useState, useEffect, useCallback } from "react"
import { useStellarWallet } from "@/contexts/StellarContext"
import { callContract, toScVal, formatAmount, parseAmount } from "@/lib/soroban"
import { CONTRACT_IDS } from "@/lib/stellar"

export interface CurveConfig {
  token: string
  creator: string
  creatorAllocationBps: number
  initialPrice: string
  curveCoefficient: string
  curveSupply: string
  soldFromCurve: string
  reserveBalance: string
  createdAt: bigint
  isActive: boolean
}

export interface CurveData {
  currentPrice: string
  curveConfig: CurveConfig | null
  isListed: boolean
  curveProgress: number
  reserve: string
}

export interface BuyQuote {
  tokensOut: string
  avgPrice: string
  fee: string
  priceImpact: number
}

export interface SellQuote {
  ethOut: string
  avgPrice: string
  fee: string
  priceImpact: number
}

export interface CurveState {
  isLoading: boolean
  isPending: boolean
  isConfirming: boolean
  isConfirmed: boolean
  hash: string | undefined
  error: Error | null
}

export interface CurveActions {
  buy: (xlmAmount: string, minTokensOut: string) => Promise<void>
  sell: (tokenAmount: string, minXlmOut: string) => Promise<void>
}

export const useBondingCurve = (tokenAddress: string | undefined) => {
  const { address } = useStellarWallet()
  const [isLoading, setIsLoading] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [hash, setHash] = useState<string | undefined>(undefined)
  const [error, setError] = useState<Error | null>(null)
  const [lastAction, setLastAction] = useState<"buy" | "sell" | null>(null)

  const [isListed, setIsListed] = useState(false)
  const [currentPrice, setCurrentPrice] = useState<string>("0")
  const [curveConfig, setCurveConfig] = useState<CurveConfig | null>(null)
  const [curveProgress, setCurveProgress] = useState<number>(0)

  const contractId = CONTRACT_IDS.bondingCurve

  const fetchData = useCallback(async () => {
    if (!contractId || !tokenAddress || !address) return

    try {
      const listed = await callContract(
        contractId,
        "is_listed",
        [toScVal(tokenAddress, 'address')],
        address
      )
      setIsListed(listed === true)

      if (listed) {
        try {
          const price = await callContract(
            contractId,
            "get_current_price",
            [toScVal(tokenAddress, 'address')],
            address
          )
          setCurrentPrice((Number(price) / 1e8).toFixed(8))
        } catch {
          // Price fetch failed
        }

        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const config: any = await callContract(
            contractId,
            "get_curve_config",
            [toScVal(tokenAddress, 'address')],
            address
          )
          if (config) {
            setCurveConfig({
              token: config.token,
              creator: config.creator,
              creatorAllocationBps: Number(config.creator_allocation_bps || config.creatorAllocationBps || 0),
              initialPrice: formatAmount(config.initial_price || config.initialPrice || BigInt(0)),
              curveCoefficient: formatAmount(config.curve_coefficient || config.curveCoefficient || BigInt(0)),
              curveSupply: formatAmount(config.curve_supply || config.curveSupply || BigInt(0)),
              soldFromCurve: formatAmount(config.sold_from_curve || config.soldFromCurve || BigInt(0)),
              reserveBalance: formatAmount(config.reserve_balance || config.reserveBalance || BigInt(0)),
              createdAt: config.created_at || config.createdAt || BigInt(0),
              isActive: config.is_active ?? config.isActive ?? false,
            })
          }
        } catch {
          // Config fetch failed
        }

        try {
          // get_curve_progress returns a CurveProgress struct { sold, total, progress_bps }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const progress: any = await callContract(
            contractId,
            "get_curve_progress",
            [toScVal(tokenAddress, 'address')],
            address
          )
          if (progress) {
            // progress_bps is in basis points (0-10000)
            const bps = Number(progress.progress_bps ?? progress.progressBps ?? progress ?? 0)
            setCurveProgress(bps / 100)
          }
        } catch {
          // Progress fetch failed
        }
      }
    } catch {
      // Contract not deployed
    }
  }, [contractId, tokenAddress, address])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Contract signature: buy(env, buyer: Address, token_id: Address, xlm_amount: i128, min_tokens_out: i128)
  const buyWithAmount = async (xlmAmount: string, minTokensOut: string): Promise<void> => {
    if (!tokenAddress || !contractId || !address) {
      throw new Error("Token address, contract, and wallet are required")
    }

    try {
      setIsLoading(true)
      setIsPending(true)
      setLastAction("buy")
      setError(null)
      setIsConfirmed(false)

      const xlmScaled = parseAmount(xlmAmount)
      const minTokensScaled = parseAmount(minTokensOut)

      await callContract(
        contractId,
        "buy",
        [
          toScVal(address, 'address'),           // buyer
          toScVal(tokenAddress, 'address'),       // token_id
          toScVal(xlmScaled.toString(), 'i128'),  // xlm_amount
          toScVal(minTokensScaled.toString(), 'i128'), // min_tokens_out
        ],
        address,
        true
      )

      setIsPending(false)
      setIsConfirming(false)
      setIsConfirmed(true)

      // Dispatch trade event for real-time chart updates
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("tradeConfirmed", {
          detail: { tokenAddress, action: lastAction }
        }))
      }

      await fetchData()
    } catch (err) {
      console.error("Error buying tokens:", err)
      setError(err as Error)
      setLastAction(null)
      throw err
    } finally {
      setIsLoading(false)
      setIsPending(false)
      setIsConfirming(false)
    }
  }

  // Contract signature: sell(env, seller: Address, token_id: Address, token_amount: i128, min_xlm_out: i128)
  const sell = async (tokenAmount: string, minXlmOut: string): Promise<void> => {
    if (!tokenAddress || !address || !contractId) {
      throw new Error("Token address, wallet, and contract are required")
    }

    try {
      setIsLoading(true)
      setIsPending(true)
      setLastAction("sell")
      setError(null)
      setIsConfirmed(false)

      const tokenAmountScaled = parseAmount(tokenAmount)
      const minXlmScaled = parseAmount(minXlmOut)

      await callContract(
        contractId,
        "sell",
        [
          toScVal(address, 'address'),                   // seller
          toScVal(tokenAddress, 'address'),               // token_id
          toScVal(tokenAmountScaled.toString(), 'i128'),  // token_amount
          toScVal(minXlmScaled.toString(), 'i128'),       // min_xlm_out
        ],
        address,
        true
      )

      setIsPending(false)
      setIsConfirming(false)
      setIsConfirmed(true)

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("tradeConfirmed", {
          detail: { tokenAddress, action: "sell" }
        }))
      }

      await fetchData()
    } catch (err) {
      console.error("Error selling tokens:", err)
      setError(err as Error)
      setLastAction(null)
      throw err
    } finally {
      setIsLoading(false)
      setIsPending(false)
      setIsConfirming(false)
    }
  }

  const data: CurveData = {
    currentPrice,
    curveConfig,
    isListed,
    curveProgress,
    reserve: curveConfig ? curveConfig.reserveBalance : "0",
  }

  const actions: CurveActions = {
    buy: buyWithAmount,
    sell,
  }

  const state: CurveState = {
    isLoading: isLoading || isPending || isConfirming,
    isPending,
    isConfirming,
    isConfirmed,
    hash,
    error,
  }

  return {
    data,
    actions,
    state,
    refetch: fetchData,
  }
}

// Hook to get buy quote
export const useBuyQuote = (tokenAddress: string | undefined, xlmAmount: string) => {
  const { address } = useStellarWallet()
  const [quote, setQuote] = useState<BuyQuote | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const contractId = CONTRACT_IDS.bondingCurve

  useEffect(() => {
    const fetchQuote = async () => {
      if (!tokenAddress || !xlmAmount || parseFloat(xlmAmount) <= 0 || !contractId || !address) {
        setQuote(null)
        return
      }

      try {
        setIsLoading(true)
        const xlmScaled = parseAmount(xlmAmount)

        // get_buy_quote(token_id, xlm_amount) -> Quote { amount, avg_price, fee }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const quoteData: any = await callContract(
          contractId,
          "get_buy_quote",
          [
            toScVal(tokenAddress, 'address'),
            toScVal(xlmScaled.toString(), 'i128'),
          ],
          address
        )

        if (quoteData) {
          // Soroban returns a Quote struct with fields: amount, avg_price, fee
          const tokensOut = quoteData.amount ?? quoteData[0]
          const avgPrice = quoteData.avg_price ?? quoteData.avgPrice ?? quoteData[1]
          const fee = quoteData.fee ?? quoteData[2]

          const currentPriceData = await callContract(
            contractId,
            "get_current_price",
            [toScVal(tokenAddress, 'address')],
            address
          ).catch(() => BigInt(0))

          const currentPriceNum = Number(currentPriceData)
          const avgPriceNum = Number(avgPrice)
          const priceImpact = currentPriceNum > 0
            ? ((avgPriceNum - currentPriceNum) / currentPriceNum) * 100
            : 0

          setQuote({
            tokensOut: formatAmount(tokensOut),
            avgPrice: (avgPriceNum / 1e8).toFixed(8),
            fee: formatAmount(fee),
            priceImpact,
          })
        }
      } catch {
        setQuote(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchQuote()
  }, [tokenAddress, xlmAmount, contractId, address])

  return { quote, isLoading }
}

// Hook to get sell quote
export const useSellQuote = (tokenAddress: string | undefined, tokenAmount: string) => {
  const { address } = useStellarWallet()
  const [quote, setQuote] = useState<SellQuote | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const contractId = CONTRACT_IDS.bondingCurve

  useEffect(() => {
    const fetchQuote = async () => {
      if (!tokenAddress || !tokenAmount || parseFloat(tokenAmount) <= 0 || !contractId || !address) {
        setQuote(null)
        return
      }

      try {
        setIsLoading(true)
        const tokenAmountScaled = parseAmount(tokenAmount)

        // get_sell_quote(token_id, token_amount) -> Quote { amount, avg_price, fee }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const quoteData: any = await callContract(
          contractId,
          "get_sell_quote",
          [
            toScVal(tokenAddress, 'address'),
            toScVal(tokenAmountScaled.toString(), 'i128'),
          ],
          address
        )

        if (quoteData) {
          const xlmOut = quoteData.amount ?? quoteData[0]
          const avgPrice = quoteData.avg_price ?? quoteData.avgPrice ?? quoteData[1]
          const fee = quoteData.fee ?? quoteData[2]

          const currentPriceData = await callContract(
            contractId,
            "get_current_price",
            [toScVal(tokenAddress, 'address')],
            address
          ).catch(() => BigInt(0))

          const currentPriceNum = Number(currentPriceData)
          const avgPriceNum = Number(avgPrice)
          const priceImpact = currentPriceNum > 0
            ? ((currentPriceNum - avgPriceNum) / currentPriceNum) * 100
            : 0

          setQuote({
            ethOut: formatAmount(xlmOut),
            avgPrice: (avgPriceNum / 1e8).toFixed(8),
            fee: formatAmount(fee),
            priceImpact,
          })
        }
      } catch {
        setQuote(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchQuote()
  }, [tokenAddress, tokenAmount, contractId, address])

  return { quote, isLoading }
}
