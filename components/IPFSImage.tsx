"use client"

import { useState, useCallback, memo, useMemo } from "react"
import Image from "next/image"
import { getIpfsUrlsWithFallbacks } from "@/lib/utils"

interface IPFSImageProps {
  src: string | undefined | null
  alt: string
  width: number
  height: number
  className?: string
  fallback?: React.ReactNode
  priority?: boolean
}

export const IPFSImage = memo(function IPFSImage({
  src,
  alt,
  width,
  height,
  className,
  fallback,
  priority = false
}: IPFSImageProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [hasError, setHasError] = useState(false)

  // Memoize URLs to prevent recalculation
  const urls = useMemo(() => src ? getIpfsUrlsWithFallbacks(src) : [], [src])
  const currentUrl = urls[currentIndex]

  const handleError = useCallback(() => {
    if (currentIndex < urls.length - 1) {
      // Try next gateway
      setCurrentIndex(prev => prev + 1)
    } else {
      // All gateways failed
      setHasError(true)
    }
  }, [currentIndex, urls.length])

  // No source or all gateways failed
  if (!src || !currentUrl || hasError) {
    return fallback ? <>{fallback}</> : <span className="text-2xl">🪙</span>
  }

  return (
    <Image
      src={currentUrl}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={handleError}
      loading={priority ? "eager" : "lazy"}
      unoptimized
    />
  )
})
