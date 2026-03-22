"use client"

import { useState, useEffect, useCallback } from "react"

// Envio HyperIndex GraphQL endpoint - configure after deployment
const ENVIO_URL = process.env.NEXT_PUBLIC_ENVIO_URL || ""

interface GraphQLResponse<T> {
  data?: T
  errors?: Array<{ message: string }>
}

// Generic fetch function for Envio queries
async function fetchEnvio<T>(query: string, variables?: Record<string, unknown>): Promise<T | null> {
  if (!ENVIO_URL) {
    console.warn("Envio URL not configured. Set NEXT_PUBLIC_ENVIO_URL in .env")
    return null
  }

  try {
    const response = await fetch(ENVIO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    })

    const result: GraphQLResponse<T> = await response.json()

    if (result.errors) {
      console.error("Envio errors:", result.errors)
      return null
    }

    return result.data || null
  } catch (error) {
    console.error("Envio fetch error:", error)
    return null
  }
}

// Types matching the Envio schema
export interface EnvioToken {
  id: string
  address: string
  name: string
  symbol: string
  creator: string
  totalSupply: string
  imageHash: string
  creatorAllocationBps: string
  createdAt: string
  createdAtBlock: string
  curveSupply?: string
  initialPrice?: string
  currentPrice?: string
  soldFromCurve?: string
  reserveBalance?: string
  isActive: boolean
  totalVolume: string
  totalTrades: string
  totalBuys: string
  totalSells: string
}

export interface EnvioTrade {
  id: string
  token: { id: string; name: string; symbol: string }
  trader: string
  isBuy: boolean
  ethAmount: string
  tokenAmount: string
  price: string
  fee: string
  timestamp: string
  blockNumber: string
  txHash: string
}

export interface EnvioPosition {
  id: string
  positionId: string
  user: string
  token: { id: string; name: string; symbol: string; currentPrice?: string }
  isLong: boolean
  size: string
  margin: string
  leverage: string
  entryPrice: string
  exitPrice?: string
  pnl?: string
  isOpen: boolean
  openedAt: string
  closedAt?: string
  liquidatedAt?: string
  liquidationPrice?: string
  txHash: string
}

export interface EnvioUser {
  id: string
  address: string
  tokensCreated: string
  totalTrades: string
  totalBuys: string
  totalSells: string
  totalVolumeTraded: string
  totalPositions: string
  openPositions: string
  totalPnl: string
  winCount: string
  lossCount: string
  liquidationCount: string
  firstTradeAt?: string
  lastTradeAt?: string
}

export interface EnvioPriceCandle {
  id: string
  timestamp: string
  openPrice: string
  high: string
  low: string
  closePrice: string
  volume: string
  trades: string
}

export interface EnvioProtocol {
  id: string
  totalTokensCreated: string
  totalTrades: string
  totalVolume: string
  totalFees: string
  totalPositions: string
  totalLiquidations: string
  uniqueUsers: string
  lastUpdated: string
}

// ============ HOOKS ============

// Hook to fetch all tokens
export function useEnvioTokens(first = 100, skip = 0, orderBy = "createdAt", orderDirection = "desc") {
  const [tokens, setTokens] = useState<EnvioToken[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTokens = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const query = `
      query GetAllTokens($first: Int!, $skip: Int!, $orderBy: Token_orderBy!, $orderDirection: OrderDirection!) {
        Token(first: $first, skip: $skip, orderBy: $orderBy, orderDirection: $orderDirection) {
          id
          address
          name
          symbol
          creator
          totalSupply
          imageHash
          creatorAllocationBps
          createdAt
          createdAtBlock
          curveSupply
          initialPrice
          currentPrice
          soldFromCurve
          reserveBalance
          isActive
          totalVolume
          totalTrades
          totalBuys
          totalSells
        }
      }
    `

    const data = await fetchEnvio<{ Token: EnvioToken[] }>(query, {
      first,
      skip,
      orderBy,
      orderDirection
    })

    if (data?.Token) {
      setTokens(data.Token)
    } else {
      setError("Failed to fetch tokens")
    }

    setIsLoading(false)
  }, [first, skip, orderBy, orderDirection])

  useEffect(() => {
    fetchTokens()
  }, [fetchTokens])

  return { tokens, isLoading, error, refetch: fetchTokens }
}

// Hook to fetch a single token
export function useEnvioToken(tokenAddress: string | undefined) {
  const [token, setToken] = useState<EnvioToken | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchToken = useCallback(async () => {
    if (!tokenAddress) {
      setToken(null)
      return
    }

    setIsLoading(true)
    setError(null)

    const query = `
      query GetToken($id: ID!) {
        Token_by_pk(id: $id) {
          id
          address
          name
          symbol
          creator
          totalSupply
          imageHash
          creatorAllocationBps
          createdAt
          createdAtBlock
          curveSupply
          initialPrice
          currentPrice
          soldFromCurve
          reserveBalance
          isActive
          totalVolume
          totalTrades
          totalBuys
          totalSells
        }
      }
    `

    const data = await fetchEnvio<{ Token_by_pk: EnvioToken }>(query, {
      id: tokenAddress.toLowerCase(),
    })

    if (data?.Token_by_pk) {
      setToken(data.Token_by_pk)
    } else {
      setError("Token not found")
    }

    setIsLoading(false)
  }, [tokenAddress])

  useEffect(() => {
    fetchToken()
  }, [fetchToken])

  return { token, isLoading, error, refetch: fetchToken }
}

// Hook to fetch user data
export function useEnvioUser(address: string | undefined) {
  const [user, setUser] = useState<EnvioUser | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUser = useCallback(async () => {
    if (!address) {
      setUser(null)
      return
    }

    setIsLoading(true)
    setError(null)

    const query = `
      query GetUser($id: ID!) {
        User_by_pk(id: $id) {
          id
          address
          tokensCreated
          totalTrades
          totalBuys
          totalSells
          totalVolumeTraded
          totalPositions
          openPositions
          totalPnl
          winCount
          lossCount
          liquidationCount
          firstTradeAt
          lastTradeAt
        }
      }
    `

    const data = await fetchEnvio<{ User_by_pk: EnvioUser }>(query, {
      id: address.toLowerCase(),
    })

    if (data?.User_by_pk) {
      setUser(data.User_by_pk)
    } else {
      setUser(null)
    }

    setIsLoading(false)
  }, [address])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  return { user, isLoading, error, refetch: fetchUser }
}

// Hook to fetch trades for a token or all trades
export function useEnvioTrades(tokenAddress?: string, first = 50) {
  const [trades, setTrades] = useState<EnvioTrade[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchTrades = useCallback(async () => {
    setIsLoading(true)

    const query = tokenAddress
      ? `
        query GetTokenTrades($tokenId: String!, $first: Int!) {
          Trade(
            where: { token_id: { _eq: $tokenId } }
            first: $first
            orderBy: timestamp
            orderDirection: desc
          ) {
            id
            token { id name symbol }
            trader
            isBuy
            ethAmount
            tokenAmount
            price
            fee
            timestamp
            blockNumber
            txHash
          }
        }
      `
      : `
        query GetRecentTrades($first: Int!) {
          Trade(first: $first, orderBy: timestamp, orderDirection: desc) {
            id
            token { id name symbol }
            trader
            isBuy
            ethAmount
            tokenAmount
            price
            fee
            timestamp
            blockNumber
            txHash
          }
        }
      `

    const variables = tokenAddress
      ? { tokenId: tokenAddress.toLowerCase(), first }
      : { first }

    const data = await fetchEnvio<{ Trade: EnvioTrade[] }>(query, variables)

    setTrades(data?.Trade || [])
    setIsLoading(false)
  }, [tokenAddress, first])

  useEffect(() => {
    fetchTrades()
  }, [fetchTrades])

  return { trades, isLoading, refetch: fetchTrades }
}

// Hook to fetch user positions
export function useEnvioPositions(address: string | undefined, tokenAddress?: string, openOnly = true) {
  const [positions, setPositions] = useState<EnvioPosition[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchPositions = useCallback(async () => {
    if (!address) {
      setPositions([])
      return
    }

    setIsLoading(true)

    let whereClause = `user: { _eq: "${address.toLowerCase()}" }`
    if (tokenAddress) {
      whereClause += `, token_id: { _eq: "${tokenAddress.toLowerCase()}" }`
    }
    if (openOnly) {
      whereClause += `, isOpen: { _eq: true }`
    }

    const query = `
      query GetUserPositions($first: Int!) {
        Position(
          where: { ${whereClause} }
          first: $first
          orderBy: openedAt
          orderDirection: desc
        ) {
          id
          positionId
          user
          token { id name symbol currentPrice }
          isLong
          size
          margin
          leverage
          entryPrice
          exitPrice
          pnl
          isOpen
          openedAt
          closedAt
          liquidatedAt
          liquidationPrice
          txHash
        }
      }
    `

    const data = await fetchEnvio<{ Position: EnvioPosition[] }>(query, { first: 100 })

    setPositions(data?.Position || [])
    setIsLoading(false)
  }, [address, tokenAddress, openOnly])

  useEffect(() => {
    fetchPositions()
  }, [fetchPositions])

  return { positions, isLoading, refetch: fetchPositions }
}

// Hook to fetch price candles for charting
export function useEnvioCandles(tokenAddress: string, fromTimestamp?: number, first = 500) {
  const [candles, setCandles] = useState<EnvioPriceCandle[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchCandles = useCallback(async () => {
    if (!tokenAddress) {
      setCandles([])
      return
    }

    setIsLoading(true)

    // Default to 7 days ago
    const from = fromTimestamp || Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60

    const query = `
      query GetPriceCandles($tokenId: String!, $from: BigInt!, $first: Int!) {
        PriceCandle(
          where: { token_id: { _eq: $tokenId }, timestamp: { _gte: $from } }
          orderBy: timestamp
          orderDirection: asc
          first: $first
        ) {
          id
          timestamp
          openPrice
          high
          low
          closePrice
          volume
          trades
        }
      }
    `

    const data = await fetchEnvio<{ PriceCandle: EnvioPriceCandle[] }>(query, {
      tokenId: tokenAddress.toLowerCase(),
      from: from.toString(),
      first,
    })

    setCandles(data?.PriceCandle || [])
    setIsLoading(false)
  }, [tokenAddress, fromTimestamp, first])

  useEffect(() => {
    fetchCandles()
  }, [fetchCandles])

  return { candles, isLoading, refetch: fetchCandles }
}

// Hook for protocol stats
export function useEnvioProtocolStats() {
  const [stats, setStats] = useState<EnvioProtocol | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchStats = useCallback(async () => {
    setIsLoading(true)

    const query = `
      query GetProtocolStats {
        Protocol_by_pk(id: "protocol") {
          id
          totalTokensCreated
          totalTrades
          totalVolume
          totalFees
          totalPositions
          totalLiquidations
          uniqueUsers
          lastUpdated
        }
      }
    `

    const data = await fetchEnvio<{ Protocol_by_pk: EnvioProtocol }>(query)

    setStats(data?.Protocol_by_pk || null)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return { stats, isLoading, refetch: fetchStats }
}

// Hook for leaderboard (sorted by PnL)
export function useEnvioLeaderboard(first = 100) {
  const [leaderboard, setLeaderboard] = useState<EnvioUser[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true)

    const query = `
      query GetLeaderboard($first: Int!) {
        User(
          orderBy: totalPnl
          orderDirection: desc
          first: $first
          where: { totalTrades: { _gt: "0" } }
        ) {
          id
          address
          totalTrades
          totalVolumeTraded
          totalPositions
          totalPnl
          winCount
          lossCount
          liquidationCount
        }
      }
    `

    const data = await fetchEnvio<{ User: EnvioUser[] }>(query, { first })

    setLeaderboard(data?.User || [])
    setIsLoading(false)
  }, [first])

  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

  return { leaderboard, isLoading, refetch: fetchLeaderboard }
}

// Hook to fetch tokens created by a user
export function useEnvioTokensByCreator(creatorAddress: string | undefined, first = 50) {
  const [tokens, setTokens] = useState<EnvioToken[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchTokens = useCallback(async () => {
    if (!creatorAddress) {
      setTokens([])
      return
    }

    setIsLoading(true)

    const query = `
      query GetTokensByCreator($creator: String!, $first: Int!) {
        Token(
          where: { creator: { _eq: $creator } }
          first: $first
          orderBy: createdAt
          orderDirection: desc
        ) {
          id
          address
          name
          symbol
          creator
          totalSupply
          imageHash
          creatorAllocationBps
          createdAt
          currentPrice
          isActive
          totalVolume
          totalTrades
        }
      }
    `

    const data = await fetchEnvio<{ Token: EnvioToken[] }>(query, {
      creator: creatorAddress.toLowerCase(),
      first,
    })

    setTokens(data?.Token || [])
    setIsLoading(false)
  }, [creatorAddress, first])

  useEffect(() => {
    fetchTokens()
  }, [fetchTokens])

  return { tokens, isLoading, refetch: fetchTokens }
}
