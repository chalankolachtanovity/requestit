"use client";

import { useEffect, useState } from "react";

type SessionMode = "classic" | "most_requested";

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
  const [mode, setMode] = useState<SessionMode>("classic");
  const [minPriorityEuro, setMinPriorityEuro] = useState("2.00");
  const [allowFreeRequests, setAllowFreeRequests] = useState(true);
  const [allowPaidRequests, setAllowPaidRequests] = useState(true);
  const [startsAt, setStartsAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (mode === "most_requested") {
      setAllowPaidRequests(false);
      setAllowFreeRequests(true);
    }
  }, [mode]);

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

      const finalAllowFreeRequests =
        mode === "most_requested" ? true : allowFreeRequests;

      const finalAllowPaidRequests =
        mode === "most_requested" ? false : allowPaidRequests;

      const finalMinPriorityAmountCents =
        mode === "most_requested" ? 0 : Math.round(parsed * 100);

      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          mode,
          minPriorityAmountCents: finalMinPriorityAmountCents,
          allowFreeRequests: finalAllowFreeRequests,
          allowPaidRequests: finalAllowPaidRequests,
          startsAt: startsAt ? new Date(startsAt).toISOString() : null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Nepodarilo sa vytvoriť event.");
        return;
      }

      setName("");
      setMode("classic");
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
              Event type
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setMode("classic")}
                className={`rounded-2xl border p-4 text-left transition ${
                  mode === "classic"
                    ? "border-violet-400/40 bg-violet-400/10"
                    : "border-white/10 bg-black/20 hover:bg-white/[0.03]"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">Classic</p>
                  {mode === "classic" ? (
                    <span className="rounded-full border border-violet-300/20 bg-violet-300/10 px-2 py-0.5 text-[10px] font-medium text-violet-200">
                      Selected
                    </span>
                  ) : null}
                </div>

                <p className="mt-2 text-xs leading-5 text-white/45">
                  Klasický režim. Free aj paid requests, queue podľa poradia a
                  priority.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMode("most_requested")}
                className={`rounded-2xl border p-4 text-left transition ${
                  mode === "most_requested"
                    ? "border-cyan-400/40 bg-cyan-400/10"
                    : "border-white/10 bg-black/20 hover:bg-white/[0.03]"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">
                    Most Requested
                  </p>
                  {mode === "most_requested" ? (
                    <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-0.5 text-[10px] font-medium text-cyan-200">
                      Selected
                    </span>
                  ) : null}
                </div>

                <p className="mt-2 text-xs leading-5 text-white/45">
                  Iba free requests. Pesničky sa budú radiť podľa počtu
                  requestov.
                </p>
              </button>
            </div>
          </div>

          <div className={mode === "most_requested" ? "opacity-50" : ""}>
            <label className="mb-2 block text-sm font-medium text-white">
              Minimum request amount
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={minPriorityEuro}
              onChange={(e) => setMinPriorityEuro(e.target.value)}
              placeholder="2.00"
              disabled={mode === "most_requested"}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-60"
            />
            {mode === "most_requested" ? (
              <p className="mt-2 text-xs text-white/35">
                V tomto režime sú paid requests vypnuté.
              </p>
            ) : null}
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

          <div
            className={`flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-4 ${
              mode === "most_requested" ? "opacity-80" : ""
            }`}
          >
            <div>
              <p className="text-sm font-medium text-white">Free requests</p>
              <p className="mt-1 text-xs text-white/40">
                Hostia môžu posielať requesty bez platby
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (mode === "most_requested") return;
                setAllowFreeRequests((prev) => !prev);
              }}
              className={`relative h-7 w-12 rounded-full transition ${
                allowFreeRequests ? "bg-green-500" : "bg-white/15"
              } ${mode === "most_requested" ? "cursor-not-allowed" : ""}`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                  allowFreeRequests ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>

          <div
            className={`flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-4 ${
              mode === "most_requested" ? "opacity-50" : ""
            }`}
          >
            <div>
              <p className="text-sm font-medium text-white">Paid requests</p>
              <p className="mt-1 text-xs text-white/40">
                Hostia môžu platiť za vyššiu prioritu
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (mode === "most_requested") return;
                setAllowPaidRequests((prev) => !prev);
              }}
              className={`relative h-7 w-12 rounded-full transition ${
                allowPaidRequests ? "bg-green-500" : "bg-white/15"
              } ${mode === "most_requested" ? "cursor-not-allowed" : ""}`}
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