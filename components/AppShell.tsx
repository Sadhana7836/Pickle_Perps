"use client"

import { Suspense, lazy, useEffect } from "react"
import { Navbar } from "./Navbar"
import { LeftSidebar } from "./LeftSidebar"
import { BottomBar } from "./BottomBar"
import { useShowMintModal, useSidebarOpen, useAppActions } from "@/lib/store"

// Lazy load the modal
const MintTokenModal = lazy(() => import("./MintTokenModal").then(m => ({ default: m.MintTokenModal })))

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const showMintModal = useShowMintModal()
  const sidebarOpen = useSidebarOpen()
  const { setShowMintModal, setSidebarOpen } = useAppActions()

  // Handle responsive sidebar - close on smaller screens by default
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1280) {
        setSidebarOpen(false)
      } else {
        setSidebarOpen(true)
      }
    }

    // Set initial state
    handleResize()

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [setSidebarOpen])

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[var(--background)]">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar />
        <div className={`flex-1 overflow-y-auto transition-all duration-300 ${sidebarOpen ? 'xl:ml-0' : ''}`}>
          {children}
        </div>
      </div>
      {/* <BottomBar /> */}

      {/* Mint Token Modal - available on all pages */}
      {showMintModal && (
        <Suspense fallback={null}>
          <MintTokenModal
            isOpen={showMintModal}
            onClose={() => setShowMintModal(false)}
            onSuccess={() => {
              // Modal handles success internally
            }}
          />
        </Suspense>
      )}
    </div>
  )
}
