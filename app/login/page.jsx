"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabaseClient"
import { StarsBackground } from "@/components/ui/stars-background"
import { ShootingStars } from "@/components/ui/shooting-stars"
import { TextGenerateEffect } from "@/components/ui/text-generate-effect"
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient"

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      const user = data.session?.user ?? null
      if (user) {
        router.replace("/username")
      } else {
        setLoading(false)
      }
    })
    return () => {
      mounted = false
    }
  }, [router])

  async function signInGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/username` },
    })
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-8 relative bg-black overflow-hidden">
      <StarsBackground />
      <ShootingStars />

      <div className="relative z-10 w-full max-w-md">
        <div className="relative rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-8 shadow-2xl">
          {/* Animated border gradient */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-20 blur-xl" />
          <div className="absolute inset-[1px] rounded-2xl bg-black/90" />

          <div className="relative z-10 flex flex-col gap-6">
            <div className="text-center">
              <TextGenerateEffect
                words="Welcome to Encrypted Chat"
                className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
                duration={0.8}
              />
              <p className="mt-4 text-sm text-gray-400">Sign in to start secure conversations</p>
            </div>

            {loading ? (
              <div className="text-center text-gray-400 text-sm py-4">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent" />
                <p className="mt-2">Checking session…</p>
              </div>
            ) : (
              <div className="flex justify-center">
                <HoverBorderGradient
                  onClick={signInGoogle}
                  containerClassName="w-full"
                  className="w-full bg-black text-white flex items-center justify-center space-x-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </HoverBorderGradient>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
