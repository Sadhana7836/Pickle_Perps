"use client"

import { useState } from "react"
import { useStellarWallet } from "@/contexts/StellarContext"
import { useMemeTokenFactory } from "@/hooks/useMemeTokenFactory"
import { X, Upload, Loader2, CheckCircle2, Sparkles, Globe, Send } from "lucide-react"

interface MintTokenModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function MintTokenModal({ isOpen, onClose, onSuccess }: MintTokenModalProps) {
  const { isConnected } = useStellarWallet()
  const { data, actions, state } = useMemeTokenFactory()

  const [name, setName] = useState("")
  const [symbol, setSymbol] = useState("")
  const [totalSupply, setTotalSupply] = useState("1000000000")
  const [creatorAllocation, setCreatorAllocation] = useState(5) // 5% default
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
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

    if (!pinataJWT) {
      throw new Error("IPFS not configured")
    }

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
      // Convert percentage to basis points (5% = 500)
      const creatorAllocationBps = creatorAllocation * 100
      await actions.createToken(name, symbol, totalSupply, imageHash, creatorAllocationBps, {
        website,
        twitter,
        telegram,
      })

      setStep("success")
      setTimeout(() => {
        resetForm()
        onSuccess?.()
        onClose()
      }, 2000)
    } catch (error: unknown) {
      console.error("[MintTokenModal] Error at step:", step, error)
      setStep("form")
      let errorMessage = "Failed to create token"
      if (error instanceof Error) {
        errorMessage = error.message
        // Make common errors more user-friendly
        if (errorMessage.includes('Account not found')) {
          errorMessage = 'Your Stellar testnet account is not funded. Visit friendbot.stellar.org to get free testnet XLM.'
        } else if (errorMessage.includes('rejected') || errorMessage.includes('denied') || errorMessage.includes('cancel')) {
          errorMessage = 'Transaction was cancelled in wallet.'
        } else if (errorMessage.includes('IPFS not configured')) {
          errorMessage = 'Image upload service is not configured. Please set NEXT_PUBLIC_PINATA_JWT.'
        } else if (errorMessage.includes('Upload failed')) {
          errorMessage = 'Failed to upload image. Please try again.'
        }
      }
      alert(errorMessage)
    }
  }

  const resetForm = () => {
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
  }

  const handleClose = () => {
    if (step !== "uploading" && step !== "minting") {
      resetForm()
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-[var(--background)] border border-[var(--card-bg)] rounded-xl w-full max-w-md mx-4 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--card-bg)]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[var(--accent-primary)]" />
            <span className="text-white font-semibold">Create Token</span>
          </div>
          <button
            onClick={handleClose}
            disabled={step === "uploading" || step === "minting"}
            className="text-[#555] hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {step === "success" ? (
            <div className="flex flex-col items-center py-8">
              <div className="w-16 h-16 rounded-full bg-[var(--accent-primary)]/20 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-[var(--accent-primary)]" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-1">Token Created!</h3>
              <p className="text-[#888] text-sm">{name} ({symbol}) is now live</p>
            </div>
          ) : step === "uploading" || step === "minting" ? (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="w-12 h-12 text-[var(--accent-primary)] animate-spin mb-4" />
              <p className="text-white font-medium">
                {step === "uploading" ? "Uploading image..." : "Creating token..."}
              </p>
              <p className="text-[#555] text-sm mt-1">Please confirm in your wallet</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Image Upload */}
              <div className="flex items-start gap-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="modal-image-upload"
                />
                <label
                  htmlFor="modal-image-upload"
                  className="w-24 h-24 rounded-lg bg-[var(--background)] border-2 border-dashed border-[#222] flex items-center justify-center cursor-pointer hover:border-[var(--accent-primary)]/50 transition-colors overflow-hidden flex-shrink-0"
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Upload className="w-6 h-6 text-[#555]" />
                  )}
                </label>
                <div className="flex-1 space-y-3">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Token Name"
                    className="w-full px-3 py-2 bg-[var(--background)] border border-[#222] rounded-lg text-white text-sm placeholder-[#444] focus:outline-none focus:border-[var(--accent-primary)]/50"
                    required
                  />
                  <input
                    type="text"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    placeholder="SYMBOL"
                    maxLength={10}
                    className="w-full px-3 py-2 bg-[var(--background)] border border-[#222] rounded-lg text-white text-sm placeholder-[#444] focus:outline-none focus:border-[var(--accent-primary)]/50"
                    required
                  />
                </div>
              </div>

              {/* Supply */}
              <div>
                <label className="text-xs text-[#666] mb-2 block uppercase">Total Supply</label>
                <input
                  type="text"
                  value={totalSupply}
                  onChange={(e) => setTotalSupply(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--background)] border border-[#222] rounded-lg text-white text-sm placeholder-[#444] focus:outline-none focus:border-[var(--accent-primary)]/50"
                  required
                />
              </div>

              {/* Social Links (Optional) */}
              <div className="space-y-2">
                <label className="text-xs text-[#666] block uppercase">Social Links (Optional)</label>

                {/* Website */}
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://yourtoken.com"
                    className="w-full pl-9 pr-3 py-2 bg-[var(--background)] border border-[#222] rounded-lg text-white text-sm placeholder-[#444] focus:outline-none focus:border-[var(--accent-primary)]/50"
                  />

                </div>

                {/* X (Twitter) */}
                <div className="relative">
                  <svg
                    viewBox="0 0 24 24"
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]"
                    fill="currentColor"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  <input
                    type="text"
                    value={twitter}
                    onChange={(e) => setTwitter(e.target.value)}
                    placeholder="@yourtoken or https://x.com/yourtoken"
                    className="w-full pl-9 pr-3 py-2 bg-[var(--background)] border border-[#222] rounded-lg text-white text-sm placeholder-[#444] focus:outline-none focus:border-[var(--accent-primary)]/50"
                  />

                </div>

                {/* Telegram */}
                <div className="relative">
                  <Send className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
                  <input
                    type="text"
                    value={telegram}
                    onChange={(e) => setTelegram(e.target.value)}
                    placeholder="@yourtoken or https://t.me/yourtoken"
                    className="w-full pl-9 pr-3 py-2 bg-[var(--background)] border border-[#222] rounded-lg text-white text-sm placeholder-[#444] focus:outline-none focus:border-[var(--accent-primary)]/50"
                  />

                </div>
              </div>

              {/* Creator Allocation Slider */}
              <div>
                <label className="text-xs text-[#666] mb-2 block uppercase">
                  Your Allocation (Anti-Rug)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={creatorAllocation}
                    onChange={(e) => setCreatorAllocation(Number(e.target.value))}
                    className="flex-1 h-2 bg-[#222] rounded-lg appearance-none cursor-pointer accent-[var(--accent-primary)]"
                  />
                  <span className="text-[var(--accent-primary)] font-medium text-sm w-12">
                    {creatorAllocation}%
                  </span>
                </div>
                <div className="flex justify-between mt-2 text-[10px]">
                  <span className="text-[#555]">You: {creatorAllocation}%</span>
                  <span className="text-[#555]">Bonding Curve: {100 - creatorAllocation}%</span>
                </div>
              </div>

              {/* Info */}
              <div className="bg-[var(--sidebar-bg)] rounded-lg p-3 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-[#555]">Minting Fee</span>
                  <span className="text-[var(--accent-primary)] font-medium">{data.mintingFee} XLM</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#555]">You Receive</span>
                  <span className="text-white">{creatorAllocation}% of supply</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#555]">Trading</span>
                  <span className="text-white">Spot + Perps enabled</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#555]">Bonding Curve</span>
                  <span className="text-[var(--accent-primary)]">{100 - creatorAllocation}% listed</span>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!name || !symbol || !imageFile || state.isLoading}
                className="w-full py-3 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-primary)] hover:from-[var(--accent-primary)] hover:to-[var(--accent-primary)] text-black font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Token
              </button>

              <p className="text-center text-[#555] text-[10px]">
                Token will be tradeable via perpetual contracts immediately after creation
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
