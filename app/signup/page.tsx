"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";

export default function SignupPage() {
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

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
    <main className="relative min-h-screen overflow-hidden bg-[#f7f7f5] px-4 py-8 text-[#121212] sm:py-10">
      {/* ambient background */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute -left-20 top-6 h-72 w-72 rounded-full blur-3xl opacity-80"
          style={{
            background:
              "linear-gradient(135deg, rgba(87,232,255,0.25), rgba(168,85,247,0.20))",
          }}
        />
        <div
          className="absolute -right-8 top-0 h-80 w-80 rounded-full blur-3xl opacity-70"
          style={{
            background:
              "linear-gradient(135deg, rgba(244,114,182,0.18), rgba(253,224,71,0.20))",
          }}
        />
      </div>

      <div className="relative z-10 flex min-h-[85vh] flex-col items-center justify-center">
        {/* brand */}
        <div className="mb-6 flex items-center gap-3 sm:mb-8">


          <Link href="/">
            <Image
              src="/logo_text.png"
              alt="SoundQ"
              width={220}
              height={64}
              className="h-8 w-auto sm:h-18 cursor-pointer"
              priority
            />
          </Link>
        </div>

        {/* card */}
        <div className="w-full max-w-md rounded-[1.75rem] border border-black/10 bg-white/75 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.08)] backdrop-blur-xl sm:p-8">
          <div className="inline-flex items-center rounded-full border border-black/10 bg-white/80 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-black/45">
            Create account
          </div>

          <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
            Sign up
          </h1>

          <p className="mt-2 text-sm text-black/55">
            Vytvor si účet a spusti svoj prvý DJ event.
          </p>

          <form
            className="mt-6 space-y-3.5"
            onSubmit={async (e) => {
              e.preventDefault();
              await handleSignup();
            }}
          >
            <input
              type="text"
              placeholder="DJ name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-white/90 px-4 py-3 text-sm outline-none transition placeholder:text-black/35 focus:border-black/25 focus:ring-2 focus:ring-black/5"
            />

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-white/90 px-4 py-3 text-sm outline-none transition placeholder:text-black/35 focus:border-black/25 focus:ring-2 focus:ring-black/5"
            />

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Heslo"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-white/90 px-4 py-3 pr-12 text-sm outline-none transition placeholder:text-black/35 focus:border-black/25 focus:ring-2 focus:ring-black/5"
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-black/50 hover:text-black"
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 inline-flex w-full items-center justify-center rounded-xl bg-[#111111] px-4 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Vytváram účet..." : "Vytvoriť účet"}
            </button>

            {message && <p className="text-sm text-red-500">{message}</p>}

            <p className="pt-1 text-center text-sm text-black/55">
              Už máš účet?{" "}
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="font-medium text-black underline-offset-2 hover:underline"
              >
                Prihlásiť sa
              </button>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}