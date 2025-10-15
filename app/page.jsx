"use client"
import { ShootingStars } from "@/components/ui/shooting-stars"
import { StarsBackground } from "@/components/ui/stars-background"
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient"
import { LayoutTextFlip } from "@/components/ui/layout-text-flip"
import { useRouter } from "next/navigation"
import { useCallback, useState } from "react"

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleGetStarted = useCallback(() => {
    if (loading) return
    setLoading(true)
    setTimeout(() => {
      router.push("/login")
    }, 1000)
  }, [loading, router])

  return (
    <div className="relative isolate min-h-screen bg-black overflow-hidden">
      <StarsBackground className="pointer-events-none z-0" />
      <ShootingStars className="pointer-events-none z-0" starColor="#9E00FF" trailColor="#2EB9DF" />

      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6">
        <section className="mx-auto max-w-3xl text-center space-y-6">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <LayoutTextFlip
              text="Welcome to"
              words={["Private Chat", "Secure Messaging", "E2EE Chat", "Encrypted Talk"]}
            />
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-balance text-white">
            Private, End‑to‑End Encrypted Chat
          </h1>

          <p className="text-lg md:text-xl text-gray-400 leading-relaxed">
            Chat and share securely with E2EE. Your private keys never leave your device. We use modern cryptography
            with a simple, friendly interface.
          </p>

          <div className="flex items-center justify-center gap-4 pt-2">
            <HoverBorderGradient
              as="button"
              containerClassName="rounded-full"
              className="bg-black text-white flex items-center space-x-2 px-6 py-3"
              onClick={handleGetStarted}
              disabled={loading}
            >
              <span className="text-base font-medium">{loading ? "Starting..." : "Get Started"}</span>
            </HoverBorderGradient>
          </div>
        </section>
      </main>

      {loading && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 backdrop-blur-sm">
          <div className="text-white text-xl">Loading...</div>
        </div>
      )}
    </div>
  )
}
