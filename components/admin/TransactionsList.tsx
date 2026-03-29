"use client";

import { useEffect, useMemo, useState } from "react";

type TransactionItem = {
  id: string;
  amount_cents: number;
  created_at: string;
  session: {
    id: string;
    name: string | null;
    slug: string;
  } | null;
  track: {
    id: string;
    track_name: string;
    artist: string;
    image_url: string | null;
  } | null;
};

type TransactionsResponse = {
  transactions: TransactionItem[];
};

function TransactionRow({ item }: { item: TransactionItem }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-white/5">
          {item.track?.image_url ? (
            <img
              src={item.track.image_url}
              alt={item.track.track_name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-white/30">
              No image
            </div>
          )}
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            {item.track?.track_name ?? "Neznáma pesnička"}
          </p>
          <p className="truncate text-xs text-white/50">
            {item.track?.artist ?? "Neznámy interpret"}
          </p>
          <p className="mt-1 truncate text-xs text-white/35">
            {item.session?.name || "Unnamed Session"} ·{" "}
            {new Date(item.created_at).toLocaleString("sk-SK")}
          </p>
        </div>
      </div>

      <div className="text-right">
        <p className="text-lg font-bold text-green-300">
          {(item.amount_cents / 100).toFixed(2)} €
        </p>
        <p className="text-xs text-white/40">captured</p>
      </div>
    </div>
  );
}

export default function TransactionsList() {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const totalCents = useMemo(() => {
    return transactions.reduce((sum, item) => sum + item.amount_cents, 0);
  }, [transactions]);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setError("");

        const response = await fetch("/api/transactions");
        const result: TransactionsResponse | { error: string } =
          await response.json();

        if (!response.ok || !("transactions" in result)) {
          setError(
            "error" in result ? result.error : "Nepodarilo sa načítať transakcie."
          );
          return;
        }

        setTransactions(result.transactions ?? []);
      } catch (error) {
        console.error("TRANSACTIONS FETCH ERROR:", error);
        setError("Nepodarilo sa načítať transakcie.");
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

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
            {(totalCents / 100).toFixed(2)} €
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-white/60">Načítavam transakcie...</p>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : transactions.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-white/45">
          Zatiaľ nemáš žiadne uskutočnené platby.
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((item) => (
            <TransactionRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}