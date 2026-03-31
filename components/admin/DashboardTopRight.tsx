"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import LogoutButton from "@/components/admin/LogoutButton";

type OverviewResponse = {
  account: {
    email: string | null;
    displayName: string | null;
  };
  creditsCents: number;
};

export default function DashboardTopRight({
  showBackToDashboard = false,
  showCredits = true,
}: {
  showBackToDashboard?: boolean;
  showCredits?: boolean;
}) {
  const [creditsCents, setCreditsCents] = useState(0);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const response = await fetch("/api/dashboard-overview");
        const result: OverviewResponse | { error: string } = await response.json();

        if (!response.ok || !("account" in result)) return;

        setDisplayName(result.account.displayName);
        setEmail(result.account.email);
        setCreditsCents(result.creditsCents ?? 0);
      } catch (error) {
        console.error("DASHBOARD TOP RIGHT FETCH ERROR:", error);
      }
    };

    fetchOverview();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div ref={wrapperRef} className="relative flex flex-col items-end gap-2">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex flex-col items-center gap-2"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-lg transition hover:bg-white/[0.08]">
          🎧
        </div>

        <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">
          ACCOUNT
        </p>

        {showCredits ? (
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-[0.12em] text-white/35">
              Credits
            </p>
            <p className="text-sm font-bold text-green-300">
              {(creditsCents / 100).toFixed(2)} €
            </p>
          </div>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-white/10 bg-[#0f0f10] p-3 shadow-2xl">
          <div className="border-b border-white/10 pb-3">
            <p className="truncate text-sm font-semibold text-white">
              {displayName || "DJ účet"}
            </p>
            <p className="mt-1 truncate text-xs text-white/45">
              {email || "Bez emailu"}
            </p>
          </div>

          <div className="mt-3 space-y-2">
            {showBackToDashboard ? (
              <Link
                href="/dashboard"
                className="block rounded-xl px-3 py-2 text-sm text-white/80 transition hover:bg-white/[0.06]"
                onClick={() => setOpen(false)}
              >
                Back to Dashboard
              </Link>
            ) : null}

            <Link
              href="/dashboard/profile"
              className="block rounded-xl px-3 py-2 text-sm text-white/80 transition hover:bg-white/[0.06]"
              onClick={() => setOpen(false)}
            >
              Edit profile
            </Link>

            <div className="px-1 pt-1">
              <LogoutButton />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}