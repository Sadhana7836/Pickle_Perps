"use client"

import { useState, useEffect, useCallback } from "react"
import { useStellarWallet } from "@/contexts/StellarContext"
import { callContract, toScVal, formatAmount, parseAmount } from "@/lib/soroban"
import { CONTRACT_IDS } from "@/lib/stellar"
import { addTokenToWalletAfterTx } from "@/lib/walletUtils"
import { getOptimizedIpfsUrl } from "@/lib/utils"


export interface TokenInfo {
  tokenAddress: string
  creator: string
  name: string
  symbol: string
  totalSupply: string
  imageHash: string
  creatorAllocationBps?: number
  createdAt: bigint
  website?: string
  twitter?: string
  telegram?: string
}

export interface FactoryData {
  mintingFee: string
  tokenCount: number
  allTokens: string[]
  myTokens: string[]
}

export interface FactoryState {
  isLoading: boolean
  isPending: boolean
  isConfirming: boolean
  isConfirmed: boolean
  hash: string | undefined
  error: Error | null
}

export interface SocialLinks {
  website?: string
  twitter?: string
  telegram?: string
}

export interface FactoryActions {
  createToken: (
    name: string,
    symbol: string,
    totalSupply: string,
    imageHash: string,
    creatorAllocationBps?: number,
    socialLinks?: SocialLinks
  ) => Promise<void>
}

export const useMemeTokenFactory = () => {
  const { address } = useStellarWallet()
  const [isLoading, setIsLoading] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [hash, setHash] = useState<string | undefined>(undefined)
  const [error, setError] = useState<Error | null>(null)
  const [lastCreatedToken, setLastCreatedToken] = useState<{ address: string; symbol: string } | null>(null)

  const [mintingFee, setMintingFee] = useState<string>("0")
  const [tokenCount, setTokenCount] = useState<number>(0)
  const [allTokens, setAllTokens] = useState<string[]>([])
  const [myTokens, setMyTokens] = useState<string[]>([])

  const contractId = CONTRACT_IDS.tokenFactory

  const fetchData = useCallback(async () => {
    if (!contractId || !address) return

    try {
      const fee = await callContract(contractId, "get_minting_fee", [], address)
      setMintingFee(formatAmount(fee))
    } catch {
      // Contract not deployed yet
    }

    try {
      const count = await callContract(contractId, "get_token_count", [], address)
      setTokenCount(Number(count))
    } catch {
      // Contract not deployed yet
    }

    try {
      const tokens = await callContract(contractId, "get_all_tokens", [], address)
      setAllTokens(tokens || [])
    } catch {
      // Contract not deployed yet
    }

    try {
      const tokens = await callContract(
        contractId,
        "get_tokens_by_creator",
        [toScVal(address, 'address')],
        address
      )
      setMyTokens(tokens || [])
    } catch {
      // Contract not deployed yet
    }
  }, [contractId, address])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const createToken = async (
    name: string,
    symbol: string,
    totalSupply: string,
    imageHash: string,
    creatorAllocationBps: number = 500,
    socialLinks: SocialLinks = {}
  ) => {
    if (!name || !symbol || !totalSupply || !imageHash) {
      throw new Error("All fields are required")
    }

    if (!contractId) {
      throw new Error("Contract not deployed")
    }

    if (!address) {
      throw new Error("Wallet not connected")
    }

    if (creatorAllocationBps < 100 || creatorAllocationBps > 1000) {
      throw new Error("Creator allocation must be between 1% and 10%")
    }

    try {
      setIsLoading(true)
      setIsPending(true)
      setError(null)
      setIsConfirmed(false)

      const { website = "", twitter = "", telegram = "" } = socialLinks
      const totalSupplyScaled = parseAmount(totalSupply)

      const result = await callContract(
        contractId,
        "create_token",
        [
          toScVal(address, 'address'),
          toScVal(name, 'string'),
          toScVal(symbol, 'string'),
          toScVal(totalSupplyScaled.toString(), 'i128'),
          toScVal(imageHash, 'string'),
          toScVal(creatorAllocationBps, 'u32'),
          toScVal(website, 'string'),
          toScVal(twitter, 'string'),
          toScVal(telegram, 'string'),
        ],
        address,
        true
      )

      setIsPending(false)
      setIsConfirming(true)

      if (result) {
        setLastCreatedToken({ address: result, symbol })
        const imageUrl = imageHash ? getOptimizedIpfsUrl(imageHash) : undefined
        addTokenToWalletAfterTx(result, symbol, 7, imageUrl)
      }

      setIsConfirming(false)
      setIsConfirmed(true)
      await fetchData()
    } catch (err) {
      console.error("Error creating token:", err)
      setError(err as Error)
      throw err
    } finally {
      setIsLoading(false)
      setIsPending(false)
      setIsConfirming(false)
    }
  }

  const data: FactoryData = {
    mintingFee,
    tokenCount,
    allTokens,
    myTokens,
  }

  const actions: FactoryActions = {
    createToken,
  }

  const state: FactoryState = {
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
  }
}
