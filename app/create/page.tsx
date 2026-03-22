"use client"

import dynamic from "next/dynamic"
import { PageLayout } from "@/components/PageLayout"

// Dynamic import for the heavy form component (includes wagmi hooks, IPFS upload logic)
const MintTokenForm = dynamic(
  () => import("@/components/MintTokenForm").then((mod) => mod.MintTokenForm),
  {
    ssr: false,
    loading: () => (
      <div className="bg-[var(--sidebar-bg)] border border-[var(--card-bg)] rounded-xl p-6 animate-pulse">
        <div className="h-8 bg-[var(--card-bg)] rounded w-1/3 mb-4" />
        <div className="space-y-4">
          <div className="h-10 bg-[var(--card-bg)] rounded" />
          <div className="h-10 bg-[var(--card-bg)] rounded" />
          <div className="h-32 bg-[var(--card-bg)] rounded" />
        </div>
      </div>
    ),
  }
)

export default function CreateTokenPage() {
  return (
    <PageLayout title="Create Token">
      <div className="max-w-2xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <p className="text-[var(--text-muted)] text-sm">
            Launch your token on Stellar Network in seconds
          </p>
        </div>

        {/* Mint Token Form */}
        <MintTokenForm />
      </div>
    </PageLayout>
  )
}
