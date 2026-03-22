"use client"

import { useRouter, usePathname } from "next/navigation"
import { ArrowLeft } from "lucide-react"

interface PageLayoutProps {
  children: React.ReactNode
  title?: string
  showBackButton?: boolean
}

export function PageLayout({ children, title, showBackButton = true }: PageLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()

  // Don't show back button on home page
  const isHomePage = pathname === "/"
  const shouldShowBack = showBackButton && !isHomePage

  const handleBack = () => {
    // Navigate to home page (main dashboard)
    router.push("/")
  }

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Back Button & Title - Inline */}
      {(shouldShowBack || title) && (
        <div className="flex items-center gap-3 mb-4">
          {shouldShowBack && (
            <button
              onClick={handleBack}
              className="flex items-center justify-center w-8 h-8 bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] border border-[#333] rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-gray-400" />
            </button>
          )}
          {title && (
            <h1 className="text-2xl font-bold text-[var(--foreground)]">{title}</h1>
          )}
        </div>
      )}
      {children}
    </div>
  )
}
