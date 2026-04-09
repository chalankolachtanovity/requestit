"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Headphones, Wallet2 } from "lucide-react";
import LogoutButton from "@/components/admin/LogoutButton";
import type { DashboardOverviewData } from "@/lib/dashboard-data";

export default function DashboardTopRight({
  showBackToDashboard = false,
  showCredits = true,
  initialOverview,
}: {
  showBackToDashboard?: boolean;
  showCredits?: boolean;
  initialOverview: DashboardOverviewData;
}) {
  const [open, setOpen] = useState(false);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const shouldShowBackToDashboard =
    showBackToDashboard ?? pathname.startsWith("/dashboard/admin/session/");

  const creditsCents = initialOverview.creditsCents ?? 0;
  const displayName = initialOverview.account.displayName ?? null;
  const email = initialOverview.account.email ?? null;

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
    <div ref={wrapperRef} className="relative flex items-center gap-2">
      {showCredits ? (
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-200">
            <Wallet2 className="h-3.5 w-3.5" />
          </div>
          <div className="leading-none">
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/38">
              Credits
            </p>
            <p className="mt-1 text-sm font-semibold text-emerald-200">
              {(creditsCents / 100).toFixed(2)} EUR
            </p>
          </div>
        </div>
      ) : null}

      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/80 transition hover:bg-white/[0.08] hover:text-white"
        aria-label="Account menu"
        title="Account menu"
      >
        <Headphones className="h-5 w-5" />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-white/10 bg-[#0f0f10] p-3 shadow-2xl">
          <div className="border-b border-white/10 pb-3">
            <p className="truncate text-sm font-semibold text-white">
              {displayName || "DJ account"}
            </p>
            <p className="mt-1 truncate text-xs text-white/45">
              {email || "No email"}
            </p>
          </div>

          <div className="mt-3 space-y-2">
            {shouldShowBackToDashboard ? (
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
