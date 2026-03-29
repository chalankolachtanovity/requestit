"use client";

import { useEffect, useState } from "react";

export default function DashboardCredits() {
  const [credits, setCredits] = useState(0);

  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const res = await fetch("/api/dashboard-overview");
        const data = await res.json();
        setCredits(data.creditsCents ?? 0);
      } catch (e) {
        console.error(e);
      }
    };

    fetchCredits();
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-green-400/15 bg-gradient-to-br from-green-500/[0.10] via-white/[0.03] to-white/[0.02] px-4 py-3 shadow-[0_0_0_1px_rgba(74,222,128,0.04),0_8px_30px_rgba(0,0,0,0.28)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(74,222,128,0.16),transparent_35%)] pointer-events-none" />

      <div className="relative flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-green-400/15 bg-green-400/[0.10]">
          <div className="h-2.5 w-2.5 rounded-full bg-green-400 shadow-[0_0_12px_rgba(74,222,128,0.75)]" />
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">
            Credits
          </p>
          

        <p className="mt-0.5 text-lg font-bold text-green-300">

            {(credits / 100).toFixed(2)} €
          </p>
        </div>
      </div>
    </div>
  );
}