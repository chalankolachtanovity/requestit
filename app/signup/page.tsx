"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function SignupPage() {
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSignup = async () => {
    try {
      setLoading(true);
      setMessage("");

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
        },
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      if (data.user) {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          email,
          display_name: displayName,
        });
      }

      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f7f5] px-4 py-10 text-[#121212]">
      {/* gradient */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-10 h-72 w-72 rounded-full blur-3xl opacity-80"
          style={{ background: "linear-gradient(135deg, rgba(87,232,255,0.25), rgba(168,85,247,0.2))" }}
        />
        <div className="absolute right-0 top-0 h-80 w-80 rounded-full blur-3xl opacity-70"
          style={{ background: "linear-gradient(135deg, rgba(244,114,182,0.2), rgba(253,224,71,0.2))" }}
        />
      </div>

      <div className="relative z-10 flex min-h-[80vh] flex-col items-center justify-center">

        {/* LOGO */}
        <div className="mb-6 flex items-center gap-3">
          <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
            <Image src="/logo.png" alt="RequestIt logo" fill className="object-cover" />
          </div>
          <span className="text-lg font-semibold">RequestIt</span>
        </div>

        <div className="w-full max-w-md rounded-[2rem] border border-black/10 bg-white/70 p-8 shadow-[0_30px_80px_rgba(0,0,0,0.08)] backdrop-blur-xl">
          <h1 className="text-3xl font-bold">Sign up</h1>
          <p className="mt-2 text-sm text-black/50">
            Vytvor si účet a začni svoj prvý DJ event
          </p>

          <div className="mt-6 space-y-4">
            <input
              type="text"
              placeholder="DJ name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-white/80 px-4 py-3 outline-none focus:border-black/30"
            />

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-white/80 px-4 py-3 outline-none focus:border-black/30"
            />

            <input
              type="password"
              placeholder="Heslo"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-white/80 px-4 py-3 outline-none focus:border-black/30"
            />

            <button
              onClick={handleSignup}
              disabled={loading}
              className="w-full rounded-xl bg-[#111111] px-4 py-3 font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Vytváram účet..." : "Vytvoriť účet"}
            </button>

            {message && (
              <p className="text-sm text-red-500">{message}</p>
            )}

            <p className="pt-2 text-center text-sm text-black/50">
              Už máš účet?{" "}
              <span
                onClick={() => router.push("/login")}
                className="cursor-pointer font-medium text-black hover:underline"
              >
                Prihlásiť sa
              </span>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}