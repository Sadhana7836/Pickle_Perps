"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { TokenData } from "@/components/TokenCard"
import { formatPrice, formatMarketCap, getTimeAgo, getOptimizedIpfsUrl } from "@/lib/utils"
import { POLLING, TOKEN_DEFAULTS, AGE_THRESHOLDS } from "@/lib/constants"
import { callContract, toScVal, formatAmount } from "@/lib/soroban"
import { CONTRACT_IDS } from "@/lib/stellar"
import { tokenCreationService, TokenCreatedEvent } from "@/lib/tokenCreationService"

// Helper function to convert TokenCreatedEvent to TokenData
function convertEventToTokenData(event: TokenCreatedEvent): TokenData {
  const createdAt = event.timestamp
  const daysSinceLaunch = Math.floor((Date.now() - createdAt) / (1000 * 60 * 60 * 24))
  const ageColor = daysSinceLaunch < AGE_THRESHOLDS.NEW
    ? "text-[var(--accent-green)]"
    : daysSinceLaunch < AGE_THRESHOLDS.RECENT
      ? "text-[var(--accent-yellow)]"
      : "text-[var(--accent-red)]"

  return {
    id: event.tokenAddress.toLowerCase(),
    name: event.name,
    symbol: event.symbol,
    image: event.imageHash ? getOptimizedIpfsUrl(event.imageHash) : "",
    price: "Not traded",
    marketCap: `$${formatMarketCap(event.totalSupply)}`,
    age: getTimeAgo(createdAt),
    ageColor,
    walletAddress: `${event.tokenAddress.slice(0, 6)}...${event.tokenAddress.slice(-4)}`,
    devAddress: `${event.creator.slice(0, 6)}...${event.creator.slice(-4)}`,
    holders: TOKEN_DEFAULTS.holders,
    transactions: TOKEN_DEFAULTS.transactions,
    comments: TOKEN_DEFAULTS.comments,
    quotes: TOKEN_DEFAULTS.quotes,
    fundingValue: TOKEN_DEFAULTS.fundingValue,
    netChange: TOKEN_DEFAULTS.netChange,
    isListed: true,
    curvePrice: "",
    curveProgress: 0,
    progressBar: 0,
    daysSinceLaunch,
    socialLinks: {
      twitter: false,
      telegram: false,
      website: false,
    },
    percentages: [
      { value: "0%", color: "gray" as const },
    ],
    topHolderPercent: TOKEN_DEFAULTS.topHolderPercent,
    buySellRatio: TOKEN_DEFAULTS.buySellRatio,
  }
}

// Dummy address used for read-only contract calls
const DUMMY_CALLER = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"

export const useMemeTokens = () => {
  const [tokens, setTokens] = useState<TokenData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isError, setIsError] = useState(false)
  const optimisticTokens = useRef<Set<string>>(new Set())
  const isMountedRef = useRef(true)
  const hasInitiallyLoaded = useRef(false)

  const fetchTokens = useCallback(async (forceRefresh = false) => {
    if (!isMountedRef.current) return

    if (forceRefresh) {
      setIsRefreshing(true)
    }

    if (!hasInitiallyLoaded.current) {
      setIsLoading(true)
    }
    setIsError(false)

    try {
      const factoryId = CONTRACT_IDS.tokenFactory
      const bondingCurveId = CONTRACT_IDS.bondingCurve

      if (!factoryId) {
        setIsError(true)
        setIsLoading(false)
        setIsRefreshing(false)
        return
      }

      // Get all token addresses from the factory contract
      const allTokenAddresses: string[] = await callContract(
        factoryId,
        "get_all_tokens",
        [],
        DUMMY_CALLER
      ) || []

      if (!isMountedRef.current) return

      if (!allTokenAddresses || allTokenAddresses.length === 0) {
        setTokens([])
        setIsLoading(false)
        setIsRefreshing(false)
        hasInitiallyLoaded.current = true
        return
      }

      // Fetch token info for each token
      const processedTokens: TokenData[] = []

      for (const tokenAddr of allTokenAddresses) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const info: any = await callContract(
            factoryId,
            "get_token_info",
            [toScVal(tokenAddr, 'address')],
            DUMMY_CALLER
          )

          if (!info) continue

          const createdAt = info.created_at ? Number(info.created_at) * 1000 : Date.now()
          const daysSinceLaunch = Math.floor((Date.now() - createdAt) / (1000 * 60 * 60 * 24))
          const ageColor = daysSinceLaunch < AGE_THRESHOLDS.NEW
            ? "text-[var(--accent-green)]"
            : daysSinceLaunch < AGE_THRESHOLDS.RECENT
              ? "text-[var(--accent-yellow)]"
              : "text-[var(--accent-red)]"

          // Try to get current price from bonding curve
          let priceDisplay = "Not traded"
          let curveProgress = 0
          if (bondingCurveId) {
            try {
              const price = await callContract(
                bondingCurveId,
                "get_current_price",
                [toScVal(tokenAddr, 'address')],
                DUMMY_CALLER
              )
              if (price && Number(price) > 0) {
                priceDisplay = formatPrice(Number(price) / 1e8)
              }
            } catch {
              // Token may not have a bonding curve yet
            }

            try {
              // get_curve_progress returns CurveProgress { sold, total, progress_bps }
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const progress: any = await callContract(
                bondingCurveId,
                "get_curve_progress",
                [toScVal(tokenAddr, 'address')],
                DUMMY_CALLER
              )
              if (progress != null) {
                const bps = Number(progress.progress_bps ?? progress.progressBps ?? progress ?? 0)
                curveProgress = bps / 100
              }
            } catch {
              // Curve progress not available
            }
          }

          const tokenId = typeof tokenAddr === 'string' ? tokenAddr : String(tokenAddr)

          // Mark token as now fetched from contract
          if (optimisticTokens.current.has(tokenId.toLowerCase())) {
            optimisticTokens.current.delete(tokenId.toLowerCase())
          }

          const name = info.name || "Unknown"
          const symbol = info.symbol || "UNK"
          const imageHash = info.image_hash || ""
          const creator = info.creator || ""
          const totalSupply = info.total_supply ? BigInt(info.total_supply) : BigInt(0)
          const website = info.website || ""
          const twitter = info.twitter || ""
          const telegram = info.telegram || ""

          processedTokens.push({
            id: tokenId,
            name,
            symbol,
            image: imageHash ? getOptimizedIpfsUrl(imageHash) : "",
            price: priceDisplay,
            marketCap: `$${formatMarketCap(formatAmount(totalSupply))}`,
            age: getTimeAgo(createdAt),
            ageColor,
            walletAddress: `${tokenId.slice(0, 6)}...${tokenId.slice(-4)}`,
            devAddress: creator ? `${creator.slice(0, 6)}...${creator.slice(-4)}` : undefined,
            holders: TOKEN_DEFAULTS.holders,
            transactions: TOKEN_DEFAULTS.transactions,
            comments: TOKEN_DEFAULTS.comments,
            quotes: TOKEN_DEFAULTS.quotes,
            fundingValue: TOKEN_DEFAULTS.fundingValue,
            netChange: TOKEN_DEFAULTS.netChange,
            isListed: true,
            curvePrice: priceDisplay !== "Not traded" ? priceDisplay : "",
            curveProgress,
            progressBar: curveProgress,
            daysSinceLaunch,
            socialLinks: {
              twitter: !!twitter,
              telegram: !!telegram,
              website: !!website,
            },
            websiteUrl: website || undefined,
            twitterUrl: twitter || undefined,
            telegramUrl: telegram || undefined,
            percentages: [
              { value: "0%", color: "gray" as const },
            ],
            topHolderPercent: TOKEN_DEFAULTS.topHolderPercent,
            buySellRatio: TOKEN_DEFAULTS.buySellRatio,
          })
        } catch (err) {
          console.error(`[useMemeTokens] Failed to fetch info for token ${tokenAddr}:`, err)
        }
      }

      // Sort by newest first (reverse order since factory stores in creation order)
      processedTokens.reverse()

      setTokens(processedTokens)
    } catch (err) {
      console.error("[useMemeTokens] Failed to fetch tokens from contract:", err)
      setIsError(true)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
      hasInitiallyLoaded.current = true
    }
  }, [])

  const refetch = useCallback(() => {
    fetchTokens(true)
  }, [fetchTokens])

  // Initialize token creation service and listen for new tokens
  useEffect(() => {
    tokenCreationService.initialize()

    const unsubscribe = tokenCreationService.subscribe((newTokenEvent) => {
      console.log("[useMemeTokens] New token created event received:", newTokenEvent.name)

      const newToken = convertEventToTokenData(newTokenEvent)
      optimisticTokens.current.add(newToken.id)

      setTokens((prevTokens) => {
        const exists = prevTokens.some((t) => t.id.toLowerCase() === newToken.id.toLowerCase())
        if (exists) return prevTokens
        return [newToken, ...prevTokens]
      })

      // Refetch full data from contract to get image, social links, etc.
      setTimeout(() => fetchTokens(), 2000)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    isMountedRef.current = true
    fetchTokens()

    return () => {
      isMountedRef.current = false
    }
  }, [fetchTokens])

  return {
    tokens,
    isLoading,
    isRefreshing,
    isError,
    refetch,
  }
}
