"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabaseClient"
import { getIdentityKeys, getOrCreateIdentityKeys } from "../../lib/crypto"
import { StarsBackground } from "@/components/ui/stars-background"
import { ShootingStars } from "@/components/ui/shooting-stars"
import { TextGenerateEffect } from "@/components/ui/text-generate-effect"
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient"

export default function UsernamePage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState(null)

  const defaultName = useMemo(() => {
    if (!email) return "user"
    return (email.split("@")[0] || "user").replace(/[^a-zA-Z0-9_]/g, "").slice(0, 24) || "user"
  }, [email])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      const u = data.user ?? null
      if (!mounted) return
      if (!u) {
        router.replace("/login")
        return
      }
      setUser(u)
      setEmail(u.email || "")

      // Ensure identity keys exist locally
      getOrCreateIdentityKeys()

      // Fetch existing profile
      const { data: profile } = await supabase.from("profiles").select("username").eq("id", u.id).maybeSingle()
      if (profile?.username) {
        setUsername(profile.username)
        setBusy(false)
      } else {
        setUsername("")
        setBusy(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [router])

  async function save() {
    if (!user) return
    setBusy(true)
    setError(null)
    try {
      const keys = getIdentityKeys() ?? getOrCreateIdentityKeys()
      const name = username.trim() || defaultName

      // Check uniqueness
      const { data: exists } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", name)
        .neq("id", user.id)
        .maybeSingle()
      if (exists) throw new Error("Username already taken")

      const upsert = {
        id: user.id,
        email: user.email,
        username: name,
        public_key: keys.publicKey,
      }
      await supabase.from("profiles").upsert(upsert)
      router.replace("/chat")
    } catch (e) {
      setError(e.message || String(e))
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-8 relative overflow-hidden bg-black">
      <StarsBackground />
      <ShootingStars />

      <div className="w-full max-w-md relative z-10">
        <div className="relative rounded-2xl p-[2px] bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-gradient-xy">
          <div className="bg-black/90 backdrop-blur-xl rounded-2xl p-8 flex flex-col gap-6">
            <div className="text-center">
              <TextGenerateEffect words="Choose Your Username" className="text-3xl font-bold text-white mb-2" />
              <p className="text-gray-400 text-sm">This will be your identity in encrypted conversations</p>
            </div>

            {error && (
              <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg backdrop-blur-sm">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-300">Username</label>
              <input
                className="border border-gray-700 rounded-lg px-4 py-3 bg-gray-900/50 backdrop-blur-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50"
                placeholder={defaultName}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={busy}
              />
              <p className="text-xs text-gray-500">Leave blank to use: {defaultName}</p>
            </div>

            <HoverBorderGradient
              onClick={save}
              disabled={busy}
              containerClassName="w-full"
              className="w-full bg-black text-white flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{busy ? "Saving..." : "Continue to Chat"}</span>
            </HoverBorderGradient>
          </div>
        </div>
      </div>
    </div>
  )
}
