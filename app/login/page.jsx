"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const user = data.session?.user ?? null;
      if (user) {
        router.replace("/username");
      } else {
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [router]);

  async function signInGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/username` },
    });
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-8">
      <div className="w-full max-w-sm border rounded-lg p-6 flex flex-col gap-4">
        <h2 className="text-xl font-semibold text-center">Sign in</h2>
        {loading ? (
          <div className="text-center text-gray-600 text-sm">Checking session…</div>
        ) : (
          <>
            <button
              onClick={signInGoogle}
              className="w-full px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              Continue with Google
            </button>
          </>
        )}
      </div>
    </div>
  );
}

