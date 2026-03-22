"use client"

import { useState } from "react"
import { useStellarWallet } from "@/contexts/StellarContext"
import { useMemeTokenFactory } from "@/hooks/useMemeTokenFactory"
import { Upload, Loader2, CheckCircle2, XCircle, ExternalLink, Globe, Send } from "lucide-react"

export function MintTokenForm() {
  const { isConnected } = useStellarWallet()
  const { data, actions, state } = useMemeTokenFactory()

  const [name, setName] = useState("")
  const [symbol, setSymbol] = useState("")
  const [totalSupply, setTotalSupply] = useState("1000000000")
  const [creatorAllocation, setCreatorAllocation] = useState(5)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [step, setStep] = useState<"form" | "uploading" | "minting" | "success">("form")

  // Social links (optional)
  const [website, setWebsite] = useState("")
  const [twitter, setTwitter] = useState("")
  const [telegram, setTelegram] = useState("")

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadToIPFS = async (file: File): Promise<string> => {
    const pinataJWT = process.env.NEXT_PUBLIC_PINATA_JWT
    if (!pinataJWT) throw new Error("IPFS not configured")

    const formData = new FormData()
    formData.append("file", file)
    formData.append("pinataMetadata", JSON.stringify({ name: `${name}-${Date.now()}` }))
    formData.append("pinataOptions", JSON.stringify({ cidVersion: 1 }))

    const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: { Authorization: `Bearer ${pinataJWT}` },
      body: formData,
    })

    if (!response.ok) throw new Error("Upload failed")
    const data = await response.json()
    return data.IpfsHash
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConnected || !name || !symbol || !imageFile) return

    try {
      setStep("uploading")
      const imageHash = await uploadToIPFS(imageFile)

      setStep("minting")
      const creatorAllocationBps = creatorAllocation * 100
      await actions.createToken(name, symbol, totalSupply, imageHash, creatorAllocationBps, {
        website,
        twitter,
        telegram,
      })

      setStep("success")
      setSuccess(`${name} (${symbol}) created!`)

      // Reset after delay
      setTimeout(() => {
        setName("")
        setSymbol("")
        setTotalSupply("1000000000")
        setCreatorAllocation(5)
        setImageFile(null)
        setImagePreview(null)
        setWebsite("")
        setTwitter("")
        setTelegram("")
        setStep("form")
        setSuccess(null)
      }, 3000)
    } catch (error: unknown) {
      setStep("form")
      const errorMessage = error instanceof Error ? error.message : "Failed to create token"
      alert(errorMessage)
    }
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-[var(--sidebar-bg)] border border-[var(--card-bg)] rounded-lg">
        <div className="w-12 h-12 rounded-full bg-[var(--card-bg)] border border-[#222] flex items-center justify-center mb-4">
          <span className="text-xl font-bold text-[var(--accent-primary)]">+</span>
        </div>
        <h3 className="text-base font-semibold text-[var(--foreground)] mb-1">Connect Wallet</h3>
        <p className="text-[#666] text-xs text-center">Connect wallet to create tokens</p>
      </div>
    )
  }

  // Success/Loading States
  if (step === "success") {
    return (
      <div className="bg-[var(--sidebar-bg)] border border-[var(--card-bg)] rounded-lg p-8">
        <div className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-[var(--accent-primary)]/20 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-7 h-7 text-[var(--accent-primary)]" />
          </div>
          <h3 className="text-[var(--foreground)] font-semibold text-lg mb-1">Token Created!</h3>
          <p className="text-[#888] text-sm">{success}</p>
          <p className="text-[var(--text-muted)] text-xs mt-2">Redirecting...</p>
        </div>
      </div>
    )
  }

  if (step === "uploading" || step === "minting") {
    return (
      <div className="bg-[var(--sidebar-bg)] border border-[var(--card-bg)] rounded-lg p-8">
        <div className="flex flex-col items-center">
          <Loader2 className="w-10 h-10 text-[var(--accent-primary)] animate-spin mb-4" />
          <p className="text-[var(--foreground)] font-medium">
            {step === "uploading" ? "Uploading to IPFS..." : "Creating token..."}
          </p>
          <p className="text-[var(--text-muted)] text-xs mt-1">Please confirm in your wallet</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[var(--sidebar-bg)] border border-[var(--card-bg)] rounded-lg p-4">
          <p className="text-xs text-[#666] mb-1">Minting Fee</p>
          <p className="text-lg font-bold text-[var(--foreground)]">{data.mintingFee} <span className="text-sm text-[#666]">XLM</span></p>
        </div>
        <div className="bg-[var(--sidebar-bg)] border border-[var(--card-bg)] rounded-lg p-4">
          <p className="text-xs text-[#666] mb-1">Total Tokens</p>
          <p className="text-lg font-bold text-[var(--foreground)]">{data.tokenCount}</p>
        </div>
        <div className="bg-[var(--sidebar-bg)] border border-[var(--card-bg)] rounded-lg p-4">
          <p className="text-xs text-[#666] mb-1">Your Tokens</p>
          <p className="text-lg font-bold text-[var(--accent-primary)]">{data.myTokens.length}</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-[var(--sidebar-bg)] border border-[var(--card-bg)] rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--card-bg)] bg-[var(--sidebar-bg)]">
          <h2 className="text-base font-semibold text-[var(--foreground)]">Token Details</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Image + Name/Symbol */}
          <div className="flex items-start gap-4">
            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="image-upload" />
            <label
              htmlFor="image-upload"
              className="w-24 h-24 rounded-lg bg-[var(--background)] border-2 border-dashed border-[#222] flex items-center justify-center cursor-pointer hover:border-[var(--accent-primary)]/50 overflow-hidden flex-shrink-0 transition-colors"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <Upload className="w-6 h-6 text-[var(--text-muted)]" />
              )}
            </label>
            <div className="flex-1 space-y-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Token Name"
                className="w-full px-4 py-2.5 bg-[var(--background)] border border-[#222] rounded-lg text-sm text-[var(--foreground)] placeholder-[#444] focus:outline-none focus:border-[var(--accent-primary)]/50"
                required
              />
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="SYMBOL"
                maxLength={10}
                className="w-full px-4 py-2.5 bg-[var(--background)] border border-[#222] rounded-lg text-sm text-[var(--foreground)] placeholder-[#444] focus:outline-none focus:border-[var(--accent-primary)]/50"
                required
              />
            </div>
          </div>

          {/* Total Supply */}
          <div>
            <label className="block text-xs text-[#666] mb-2 uppercase">Total Supply</label>
            <input
              type="text"
              value={totalSupply}
              onChange={(e) => setTotalSupply(e.target.value)}
              placeholder="1000000000"
              className="w-full px-4 py-2.5 bg-[var(--background)] border border-[#222] rounded-lg text-sm text-[var(--foreground)] placeholder-[#444] focus:outline-none focus:border-[var(--accent-primary)]/50"
              required
            />
          </div>

          {/* Social Links (Optional) */}
          <div className="space-y-3">
            <label className="block text-xs text-[#666] uppercase">Social Links (Optional)</label>

            {/* Website */}
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourtoken.com"
                className="w-full pl-10 pr-4 py-2.5 bg-[var(--background)] border border-[#222] rounded-lg text-sm text-[var(--foreground)] placeholder-[#444] focus:outline-none focus:border-[var(--accent-primary)]/50"
              />
            </div>

            {/* X (Twitter) */}
            <div className="relative">
              <svg viewBox="0 0 24 24" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <input
                type="text"
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                placeholder="@yourtoken or https://x.com/yourtoken"
                className="w-full pl-10 pr-4 py-2.5 bg-[var(--background)] border border-[#222] rounded-lg text-sm text-[var(--foreground)] placeholder-[#444] focus:outline-none focus:border-[var(--accent-primary)]/50"
              />
            </div>

            {/* Telegram */}
            <div className="relative">
              <Send className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                placeholder="@yourtoken or https://t.me/yourtoken"
                className="w-full pl-10 pr-4 py-2.5 bg-[var(--background)] border border-[#222] rounded-lg text-sm text-[var(--foreground)] placeholder-[#444] focus:outline-none focus:border-[var(--accent-primary)]/50"
              />
            </div>
          </div>

          {/* Creator Allocation Slider */}
          <div>
            <label className="text-xs text-[#666] mb-2 block uppercase">Your Allocation (Anti-Rug)</label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="10"
                value={creatorAllocation}
                onChange={(e) => setCreatorAllocation(Number(e.target.value))}
                className="flex-1 h-2 bg-[#222] rounded-lg appearance-none cursor-pointer accent-[var(--accent-primary)]"
              />
              <span className="text-[var(--accent-primary)] font-semibold text-sm w-12">{creatorAllocation}%</span>
            </div>
            <div className="flex justify-between mt-2 text-xs">
              <span className="text-[var(--text-muted)]">You: {creatorAllocation}%</span>
              <span className="text-[var(--text-muted)]">Bonding Curve: {100 - creatorAllocation}%</span>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-[var(--background)] border border-[#222] rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">Minting Fee</span>
              <span className="text-[var(--accent-primary)] font-medium">{data.mintingFee} XLM</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">You Receive</span>
              <span className="text-[var(--foreground)]">{creatorAllocation}% of supply</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">Trading</span>
              <span className="text-[var(--foreground)]">Spot + Perps</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">Bonding Curve</span>
              <span className="text-[var(--accent-primary)]">{100 - creatorAllocation}% listed</span>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!name || !symbol || !imageFile || state.isLoading}
            className="w-full py-3.5 bg-[var(--accent-primary)] hover:opacity-90 text-black font-semibold rounded-lg text-sm transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Token
          </button>

          <p className="text-center text-[var(--text-muted)] text-xs">
            Token will be tradeable immediately after creation
          </p>
        </form>
      </div>

      {/* Transaction Status */}
      {state.hash && (
        <div className="bg-[var(--sidebar-bg)] border border-[var(--card-bg)] rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-[#666] uppercase">Transaction</span>
            {state.isConfirming && <span className="text-[10px] text-[var(--accent-yellow)]">Confirming...</span>}
            {state.isConfirmed && <span className="text-[10px] text-[var(--accent-primary)]">Confirmed</span>}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-mono text-[var(--foreground)] truncate flex-1">{state.hash}</p>
            <a href={`https://stellar.expert/explorer/testnet/tx/${state.hash}`} target="_blank" rel="noopener noreferrer" className="text-[var(--accent-primary)]">
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      {state.error && (
        <div className="bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 rounded-lg p-3 flex items-center gap-2">
          <XCircle className="w-4 h-4 text-[var(--accent-red)]" />
          <p className="text-xs text-[var(--accent-red)]">{state.error.message}</p>
        </div>
      )}
    </div>
  )
}
