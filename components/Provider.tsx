"use client"

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StellarProvider } from '@/contexts/StellarContext'
import { ThemeProvider } from '@/components/ThemeProvider'
import { ReactNode } from 'react'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: 1,
        retryDelay: 1000,
        networkMode: 'offlineFirst',
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined = undefined

function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient()
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient()
    return browserQueryClient
  }
}

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  const queryClient = getQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      <StellarProvider>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </StellarProvider>
    </QueryClientProvider>
  )
}
