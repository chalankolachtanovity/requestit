"use client";

import { useEffect, useState } from "react";

type SessionMode = "classic" | "most_requested";

type SessionSettings = {
  id: string;
  min_priority_amount_cents: number;
  allow_free_requests: boolean;
  allow_paid_requests: boolean;
};

export default function SessionSettingsPanel({
  sessionId,
  mode,
}: {
  sessionId: string;
  mode: SessionMode;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [minPriorityEuro, setMinPriorityEuro] = useState("2.00");
  const [allowFreeRequests, setAllowFreeRequests] = useState(true);
  const [allowPaidRequests, setAllowPaidRequests] = useState(true);

  const isMostRequestedMode = mode === "most_requested";

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(
        `/api/session-settings?sessionId=${encodeURIComponent(sessionId)}`
      );
      const result: SessionSettings | { error: string } =
        await response.json();

      if (!response.ok || !("id" in result)) {
        setMessage("Nepodarilo sa načítať nastavenia.");
        return;
      }

      setMinPriorityEuro(
        (result.min_priority_amount_cents / 100).toFixed(2)
      );
      setAllowFreeRequests(result.allow_free_requests);
      setAllowPaidRequests(result.allow_paid_requests);
    } catch (error) {
      console.error("SETTINGS FETCH ERROR:", error);
      setMessage("Nepodarilo sa načítať nastavenia.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [sessionId]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage("");

      const parsed = Number(minPriorityEuro.replace(",", "."));

      if (Number.isNaN(parsed) || parsed < 0) {
        setMessage("Zadaj platnú minimálnu sumu.");
        return;
      }

      const minPriorityAmountCents = isMostRequestedMode
        ? 0
        : Math.round(parsed * 100);

      const finalAllowPaidRequests = isMostRequestedMode
        ? false
        : allowPaidRequests;

      const response = await fetch("/api/session-settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          minPriorityAmountCents,
          allowFreeRequests,
          allowPaidRequests: finalAllowPaidRequests,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Nepodarilo sa uložiť nastavenia.");
        return;
      }

      if (isMostRequestedMode) {
        setMinPriorityEuro("0.00");
        setAllowPaidRequests(false);
      }

      setMessage("Nastavenia uložené.");
    } catch (error) {
      console.error("SETTINGS SAVE ERROR:", error);
      setMessage("Nepodarilo sa uložiť nastavenia.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-white/60">
        Načítavam nastavenia...
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-5">
        <p className="text-sm uppercase tracking-[0.2em] text-white/35">
          Settings
        </p>
        <h2 className="mt-1 text-xl font-bold text-white">DJ Settings</h2>
      </div>

      <div className="space-y-5">
        <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-4">
          <p className="text-sm font-medium text-white">Typ eventu</p>
          <div className="mt-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                isMostRequestedMode
                  ? "border border-cyan-300/20 bg-cyan-400/10 text-cyan-200"
                  : "border border-violet-300/20 bg-violet-400/10 text-violet-200"
              }`}
            >
              {isMostRequestedMode ? "Most Requested" : "Classic"}
            </span>
          </div>
          <p className="mt-2 text-xs text-white/40">
            Typ eventu sa po vytvorení nedá meniť.
          </p>
        </div>

        <div className={isMostRequestedMode ? "opacity-55" : ""}>
          <label className="mb-2 block text-sm font-medium text-white">
            Minimum priority suma
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={isMostRequestedMode ? "0.00" : minPriorityEuro}
            onChange={(e) => setMinPriorityEuro(e.target.value)}
            placeholder="2.00"
            disabled={isMostRequestedMode}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none placeholder:text-white/30 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <p className="mt-2 text-xs text-white/40">
            {isMostRequestedMode
              ? "V Most Requested režime sú priority requesty vypnuté."
              : "Toto je minimálna suma, ktorú musí user zaplatiť za priority request."}
          </p>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-white">Povoliť free requesty</p>
            <p className="text-xs text-white/40">
              {isMostRequestedMode
                ? "Hostia budú posielať hlasy zadarmo."
                : "Ak vypneš, hostia budú môcť posielať len platené requesty."}
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

        <div
          className={`flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3 ${
            isMostRequestedMode ? "opacity-55" : ""
          }`}
        >
          <div>
            <p className="text-sm font-medium text-white">Povoliť paid requesty</p>
            <p className="text-xs text-white/40">
              {isMostRequestedMode
                ? "V Most Requested režime sú paid requesty pevne vypnuté."
                : "Ak vypneš, hostia nebudú môcť platiť za prioritu."}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (isMostRequestedMode) return;
              setAllowPaidRequests((prev) => !prev);
            }}
            className={`relative h-7 w-12 rounded-full transition ${
              isMostRequestedMode
                ? "cursor-not-allowed bg-white/10"
                : allowPaidRequests
                ? "bg-green-500"
                : "bg-white/15"
            }`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                isMostRequestedMode
                  ? "left-1"
                  : allowPaidRequests
                  ? "left-6"
                  : "left-1"
              }`}
            />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
          >
            {saving ? "Ukladám..." : "Uložiť"}
          </button>

          {message ? (
            <p className="text-sm text-white/60">{message}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}