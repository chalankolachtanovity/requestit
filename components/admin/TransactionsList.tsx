"use client";

import Image from "next/image";
import { useMemo } from "react";
import type { TransactionItem } from "@/lib/dashboard-data";

function TransactionRow({ item }: { item: TransactionItem }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-white/5">
          {item.track?.image_url ? (
            <Image
              src={item.track.image_url}
              alt={item.track.track_name}
              fill
              sizes="48px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-white/30">
              No image
            </div>
          )}
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            {item.track?.track_name ?? "NeznĂˇma pesniÄŤka"}
          </p>
          <p className="truncate text-xs text-white/50">
            {item.track?.artist ?? "NeznĂˇmy interpret"}
          </p>
          <p className="mt-1 truncate text-xs text-white/35">
            {item.session?.name || "Unnamed Session"} Â·{" "}
            {new Date(item.created_at).toLocaleString("sk-SK")}
          </p>
        </div>
      </div>

      <div className="text-right">
        <p className="text-lg font-bold text-green-300">
          {(item.amount_cents / 100).toFixed(2)} â‚¬
        </p>
        <p className="text-xs text-white/40">captured</p>
      </div>
    </div>
  );
}

export default function TransactionsList({
  initialTransactions,
}: {
  initialTransactions: TransactionItem[];
}) {
  const totalCents = useMemo(() => {
    return initialTransactions.reduce((sum, item) => sum + item.amount_cents, 0);
  }, [initialTransactions]);

  return (
    <section>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-white/35">
            Payments
          </p>
          <h2 className="mt-1 text-xl font-bold text-white">
            History of Transactions
          </h2>
        </div>

        <div className="text-right">
          <p className="text-[11px] uppercase tracking-[0.12em] text-white/35">
            Total
          </p>
          <p className="text-xl font-bold text-green-300">
            {(totalCents / 100).toFixed(2)} â‚¬
          </p>
        </div>
      </div>

      {initialTransactions.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-white/45">
          ZatiaÄľ nemĂˇĹˇ Ĺľiadne uskutoÄŤnenĂ© platby.
        </div>
      ) : (
        <div className="space-y-3">
          {initialTransactions.map((item) => (
            <TransactionRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
