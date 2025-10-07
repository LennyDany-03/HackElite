"use client"
import { useEffect, useMemo, useState } from "react"
import { LoaderThree } from "@/components/ui/loader"

type LoadingState = { text: string }

type MultiStepLoaderProps = {
  loading: boolean
  loadingStates: LoadingState[]
  // duration per step in ms (default 1200ms)
  duration?: number
  onComplete?: () => void
  className?: string
}

export function MultiStepLoader({
  loading,
  loadingStates,
  duration = 1200,
  onComplete,
  className = "",
}: MultiStepLoaderProps) {
  const steps = useMemo(() => loadingStates?.length ?? 0, [loadingStates])
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!loading || steps === 0) return
    setIndex(0)

    let i = 0
    const timer = setInterval(
      () => {
        i += 1
        if (i >= steps) {
          clearInterval(timer)
          // slight delay to let final UI render
          const done = setTimeout(() => {
            onComplete?.()
          }, 250)
          return () => clearTimeout(done)
        } else {
          setIndex(i)
        }
      },
      Math.max(300, duration),
    )

    return () => clearInterval(timer)
  }, [loading, steps, duration, onComplete])

  if (!loading) return null

  const progress = steps > 0 ? Math.min(100, Math.round(((index + 1) / steps) * 100)) : 0

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Loading"
      className={`fixed inset-0 z-[120] flex items-center justify-center bg-background/70 backdrop-blur ${className}`}
    >
      <div className="w-[90%] max-w-lg rounded-xl border border-border bg-background shadow-xl">
        <div className="px-6 py-5 flex items-center gap-4">
          <LoaderThree size="lg" className="shrink-0" />
          <div className="min-w-0">
            <p className="text-base md:text-lg text-foreground truncate">{loadingStates[index]?.text ?? "Loading…"}</p>
            <p className="text-xs text-muted-foreground mt-1">Please wait, preparing your experience.</p>
          </div>
        </div>
        <div className="px-6 pb-6">
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
              aria-hidden="true"
            />
          </div>
          <div className="mt-2 text-right text-xs text-muted-foreground" aria-live="polite">
            {progress}% complete
          </div>
        </div>
      </div>
    </div>
  )
}
