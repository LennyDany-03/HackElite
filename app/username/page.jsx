"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { getIdentityKeys, getOrCreateIdentityKeys } from "../../lib/crypto";

export default function UsernamePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(null);

  const defaultName = useMemo(() => {
    if (!email) return "user";
    return (email.split("@")[0] || "user").replace(/[^a-zA-Z0-9_]/g, "").slice(0, 24) || "user";
  }, [email]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user ?? null;
      if (!mounted) return;
      if (!u) {
        router.replace("/login");
        return;
      }
      setUser(u);
      setEmail(u.email || "");

      // Ensure identity keys exist locally
      getOrCreateIdentityKeys();

      // Fetch existing profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", u.id)
        .maybeSingle();
      if (profile?.username) {
        setUsername(profile.username);
        setBusy(false);
      } else {
        setUsername("");
        setBusy(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  async function save() {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      const keys = getIdentityKeys() ?? getOrCreateIdentityKeys();
      const name = username.trim() || defaultName;

      // Check uniqueness
      const { data: exists } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", name)
        .neq("id", user.id)
        .maybeSingle();
      if (exists) throw new Error("Username already taken");

      const upsert = {
        id: user.id,
        email: user.email,
        username: name,
        public_key: keys.publicKey,
      };
      await supabase.from("profiles").upsert(upsert);
      router.replace("/chat");
    } catch (e) {
      setError(e.message || String(e));
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-8">
      <div className="w-full max-w-md border rounded-lg p-6 flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Choose a username</h2>
        {error && <div className="p-2 text-sm text-red-700 bg-red-50 rounded">{error}</div>}
        <input
          className="border rounded px-3 py-2"
          placeholder={defaultName}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={busy}
        />
        <button
          onClick={save}
          disabled={busy}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Continue"}
        </button>
      </div>
    </div>
  );
}

