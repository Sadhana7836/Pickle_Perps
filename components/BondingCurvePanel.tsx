"use client"

import { useState, useEffect } from "react"
import { useStellarWallet } from "@/contexts/StellarContext"
import { useBondingCurve, useBuyQuote, useSellQuote } from "@/hooks/useBondingCurve"
import { Loader2, AlertTriangle } from "lucide-react"
import { callContract, formatAmount, toScVal } from "@/lib/soroban"

interface BondingCurvePanelProps {
  tokenAddress: string
  tokenSymbol: string
}

export function BondingCurvePanel({ tokenAddress, tokenSymbol }: BondingCurvePanelProps) {
  const { address, isConnected, balance: walletBalance } = useStellarWallet()
  const [mode, setMode] = useState<"buy" | "sell">("buy")
  const [amount, setAmount] = useState("")
  const [slippage, setSlippage] = useState(1) // 1%
  const [tokenBalance, setTokenBalance] = useState<string>("0")

  const { data: curveData, actions, state } = useBondingCurve(tokenAddress)

  // Get token balance for sell mode
  useEffect(() => {
    const fetchTokenBalance = async () => {
      if (!address || !tokenAddress) return
      try {
        const result = await callContract(tokenAddress, "balance", [toScVal(address, "address")], address)
        if (result) {
          setTokenBalance(formatAmount(BigInt(result.toString())))
        }
      } catch {
        setTokenBalance("0")
      }
    }
    fetchTokenBalance()
  }, [address, tokenAddress])

  const formattedTokenBalance = tokenBalance

  // Get quotes based on mode
  const { quote: buyQuote, isLoading: buyQuoteLoading } = useBuyQuote(
    mode === "buy" ? tokenAddress : undefined,
    mode === "buy" ? amount : ""
  )
  const { quote: sellQuote, isLoading: sellQuoteLoading } = useSellQuote(
    mode === "sell" ? tokenAddress : undefined,
    mode === "sell" ? amount : ""
  )

  const currentQuote = mode === "buy" ? buyQuote : sellQuote
  const quoteLoading = mode === "buy" ? buyQuoteLoading : sellQuoteLoading

  const handleTrade = async () => {
    if (!amount || !currentQuote) return

    try {
      if (mode === "buy" && buyQuote) {
        // Calculate min tokens with slippage
        const minTokens = parseFloat(buyQuote.tokensOut) * (1 - slippage / 100)
        await actions.buy(amount, minTokens.toString())
      } else if (mode === "sell" && sellQuote) {
        // Calculate min ETH with slippage
        const minEth = parseFloat(sellQuote.ethOut) * (1 - slippage / 100)
        await actions.sell(amount, minEth.toString())
      }
      setAmount("")
    } catch (error) {
      console.error("Trade failed:", error)
    }
  }

  const getPriceImpactColor = (impact: number) => {
    if (impact < 2) return "text-[var(--accent-green)]"
    if (impact < 5) return "text-yellow-500"
    return "text-red-500"
  }

  if (!curveData.isListed) {
    return (
      <div className="bg-[var(--card-bg)] rounded-xl p-4 border border-[var(--card-border)]">
        <p className="text-[#555] text-sm text-center">
          Token not listed on bonding curve
        </p>
      </div>
    )
  }

  return (
    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--card-border)]">
        <h3 className="text-white font-semibold">Spot Trading</h3>
        <p className="text-[#555] text-xs mt-0.5">
          Buy/Sell {tokenSymbol} on bonding curve
        </p>
      </div>

      {/* Buy/Sell Toggle */}
      <div className="flex p-2 bg-[var(--background)]">
        <button
          onClick={() => setMode("buy")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "buy"
              ? "bg-[var(--accent-green)] text-black"
              : "text-[#555] hover:text-white"
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setMode("sell")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "sell"
              ? "bg-[var(--accent-red)] text-white"
              : "text-[#555] hover:text-white"
          }`}
        >
          Sell
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Current Price */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-[#555]">Current Price</span>
          <span className="text-white font-medium">
            ${curveData.currentPrice}
          </span>
        </div>

        {/* Amount Input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[#888] text-xs">
              {mode === "buy" ? "Amount (XLM)" : `Amount (${tokenSymbol})`}
            </label>
            <span className="text-[#555] text-xs">
              Balance: {mode === "buy"
                ? (walletBalance ? parseFloat(walletBalance).toFixed(4) : "0")
                : parseFloat(formattedTokenBalance).toFixed(4)
              } {mode === "buy" ? "XLM" : tokenSymbol}
            </span>
          </div>
          <div className="relative">
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2.5 pr-16 bg-[var(--background)] border border-[var(--card-border)] rounded-lg text-white text-sm placeholder-[#555] focus:outline-none focus:border-[var(--accent-green)]"
            />
            <button
              onClick={() => {
                if (mode === "buy" && walletBalance) {
                  // Leave some for gas fees
                  const maxAmount = Math.max(0, parseFloat(walletBalance) - 0.01)
                  setAmount(maxAmount.toFixed(6))
                } else if (mode === "sell") {
                  setAmount(parseFloat(formattedTokenBalance).toFixed(6))
                }
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-[var(--accent-green)]/20 hover:bg-[var(--accent-green)]/30 text-[var(--accent-green)] text-xs font-medium rounded transition-colors"
            >
              MAX
            </button>
          </div>

          {/* Quick Percentage Buttons */}
          <div className="flex gap-2 mt-2">
            {[25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                onClick={() => {
                  if (mode === "buy" && walletBalance) {
                    const maxAmount = Math.max(0, parseFloat(walletBalance) - 0.01)
                    setAmount((maxAmount * pct / 100).toFixed(6))
                  } else if (mode === "sell") {
                    const maxAmount = parseFloat(formattedTokenBalance)
                    setAmount((maxAmount * pct / 100).toFixed(6))
                  }
                }}
                className="flex-1 py-1 bg-[var(--background)] border border-[var(--card-border)] rounded text-[#555] text-xs hover:border-[var(--accent-green)] hover:text-white transition-colors"
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>

        {/* Quote Preview */}
        {amount && parseFloat(amount) > 0 && (
          <div className="bg-[var(--background)] rounded-lg p-3 space-y-2">
            {quoteLoading ? (
              <div className="flex justify-center py-2">
                <Loader2 className="w-5 h-5 animate-spin text-[#555]" />
              </div>
            ) : currentQuote ? (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-[#555]">You receive</span>
                  <span className="text-white font-medium">
                    {mode === "buy" && buyQuote
                      ? `${parseFloat(buyQuote.tokensOut).toFixed(4)} ${tokenSymbol}`
                      : sellQuote
                        ? `${parseFloat(sellQuote.ethOut).toFixed(6)} XLM`
                        : "0"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#555]">Avg Price</span>
                  <span className="text-white">${currentQuote.avgPrice}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#555]">Fee (0.5%)</span>
                  <span className="text-white">{currentQuote.fee} XLM</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#555]">Price Impact</span>
                  <span className={getPriceImpactColor(currentQuote.priceImpact)}>
                    {currentQuote.priceImpact.toFixed(2)}%
                  </span>
                </div>

                {currentQuote.priceImpact > 5 && (
                  <div className="flex items-center gap-2 mt-2 p-2 bg-red-500/10 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span className="text-red-500 text-xs">
                      High price impact! Consider smaller amount.
                    </span>
                  </div>
                )}
              </>
            ) : (
              <p className="text-[#555] text-sm text-center">
                Unable to get quote
              </p>
            )}
          </div>
        )}

        {/* Slippage Setting */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#555]">Slippage Tolerance</span>
          <div className="flex gap-1">
            {[0.5, 1, 2, 5].map((s) => (
              <button
                key={s}
                onClick={() => setSlippage(s)}
                className={`px-2 py-1 rounded text-xs ${
                  slippage === s
                    ? "bg-[var(--accent-green)] text-black"
                    : "bg-[var(--background)] text-[#555] hover:text-white"
                }`}
              >
                {s}%
              </button>
            ))}
          </div>
        </div>

        {/* Execute Button */}
        <button
          onClick={handleTrade}
          disabled={
            !isConnected ||
            !amount ||
            parseFloat(amount) <= 0 ||
            state.isLoading ||
            !currentQuote
          }
          className={`w-full py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            mode === "buy"
              ? "bg-gradient-to-r from-[var(--accent-green)] to-[var(--accent-green)] hover:from-[var(--accent-green)] hover:to-[var(--accent-green)] text-black"
              : "bg-gradient-to-r from-[var(--accent-red)] to-[#ff3838] hover:from-[#ff5252] hover:to-[var(--accent-red)] text-white"
          }`}
        >
          {state.isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </span>
          ) : !isConnected ? (
            "Connect Wallet"
          ) : (
            `${mode === "buy" ? "Buy" : "Sell"} ${tokenSymbol}`
          )}
        </button>

        {/* Curve Stats */}
        <div className="pt-3 border-t border-[var(--card-border)] space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-[#555]">Curve Progress</span>
            <span className="text-white">
              {curveData.curveProgress.toFixed(1)}% sold
            </span>
          </div>
          <div className="w-full h-1.5 bg-[var(--background)] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[var(--accent-green)] to-[var(--accent-green)] rounded-full transition-all"
              style={{ width: `${Math.min(curveData.curveProgress, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[#555]">Reserve</span>
            <span className="text-white">
              {parseFloat(curveData.reserve).toFixed(4)} XLM
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
