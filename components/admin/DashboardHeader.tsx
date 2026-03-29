"use client";

import { useEffect, useState } from "react";
import LogoutButton from "@/components/admin/LogoutButton";

type OverviewResponse = {
  account: {
    email: string | null;
    displayName: string | null;
  };
  creditsCents: number;
};

export default function DashboardHeader() {
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [creditsCents, setCreditsCents] = useState(0);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const response = await fetch("/api/dashboard-overview");
        const result: OverviewResponse | { error: string } = await response.json();

        if (!response.ok || !("account" in result)) {
          return;
        }

        setDisplayName(result.account.displayName);
        setEmail(result.account.email);
        setCreditsCents(result.creditsCents ?? 0);
      } catch (error) {
        console.error("DASHBOARD HEADER FETCH ERROR:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, []);

  return (
    <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <p className="text-sm uppercase tracking-[0.2em] text-white/40">
          DJ Account
        </p>

        <h1 className="mt-2 truncate text-2xl font-bold text-white">
          {loading
            ? "Načítavam..."
            : displayName || email || "DJ účet"}
        </h1>

        <p className="mt-1 truncate text-sm text-white/50">
          {email || "Bez emailu"}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="rounded-2xl border border-green-400/20 bg-green-400/[0.08] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.12em] text-green-300/80">
            Credits
          </p>
          <p className="mt-1 text-xl font-bold text-green-300">
            {(creditsCents / 100).toFixed(2)} €
          </p>
        </div>

        <LogoutButton />
      </div>
    </div>
  );
}