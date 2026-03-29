"use client";

import { useState } from "react";

export default function CreateSessionForm({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [minPriorityEuro, setMinPriorityEuro] = useState("2.00");
  const [allowFreeRequests, setAllowFreeRequests] = useState(true);
  const [allowPaidRequests, setAllowPaidRequests] = useState(true);
  const [startsAt, setStartsAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  if (!open) return null;

  const handleCreate = async () => {
    try {
      setLoading(true);
      setMessage("");

      const parsed = Number(minPriorityEuro.replace(",", "."));

      if (Number.isNaN(parsed) || parsed < 0) {
        setMessage("Zadaj platnú minimálnu sumu.");
        return;
      }

      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          minPriorityAmountCents: Math.round(parsed * 100),
          allowFreeRequests,
          allowPaidRequests,
          startsAt: startsAt ? new Date(startsAt).toISOString() : null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Nepodarilo sa vytvoriť event.");
        return;
      }

      setName("");
      setMinPriorityEuro("2.00");
      setAllowFreeRequests(true);
      setAllowPaidRequests(true);
      setStartsAt("");
      setMessage("");
      onCreated();
      onClose();
    } catch (error) {
      console.error("CREATE SESSION ERROR:", error);
      setMessage("Nepodarilo sa vytvoriť event.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#0f0f10] p-5 md:p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-white/35">
              New
            </p>
            <h2 className="mt-1 text-2xl font-bold text-white">
              Create Event
            </h2>
          </div>

          <button
            onClick={onClose}
            className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-white/70 hover:bg-white/[0.05]"
          >
            Close
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-white">
              Event name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Friday Party"
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-white">
              Minimum request amount
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={minPriorityEuro}
              onChange={(e) => setMinPriorityEuro(e.target.value)}
              placeholder="2.00"
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-white">
              Start date and time
            </label>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
            />
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
            <div>
              <p className="text-sm font-medium text-white">Free requests</p>
              <p className="mt-1 text-xs text-white/40">
                Hostia môžu posielať requesty bez platby
              </p>
            </div>

            <button
              type="button"
              onClick={() => setAllowFreeRequests((prev) => !prev)}
              className={`relative h-7 w-12 rounded-full transition ${
                allowFreeRequests ? "bg-green-500" : "bg-white/15"
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                  allowFreeRequests ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
            <div>
              <p className="text-sm font-medium text-white">Paid requests</p>
              <p className="mt-1 text-xs text-white/40">
                Hostia môžu platiť za vyššiu prioritu
              </p>
            </div>

            <button
              type="button"
              onClick={() => setAllowPaidRequests((prev) => !prev)}
              className={`relative h-7 w-12 rounded-full transition ${
                allowPaidRequests ? "bg-green-500" : "bg-white/15"
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                  allowPaidRequests ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleCreate}
              disabled={loading}
              className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create event"}
            </button>

            {message ? (
              <p className="text-sm text-white/60">{message}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
