"use client";

import { useMemo, useState } from "react";

type RequestType = "free" | "paid";

type RequestButtonProps = {
  sessionId: string;
  trackId: string | null;
  minPriorityAmountCents: number;
  customMode?: boolean;
  initialCustomTrackName?: string;
  initialCustomArtistName?: string;
};

export default function RequestButton({
  sessionId,
  trackId,
  minPriorityAmountCents,
  customMode = false,
  initialCustomTrackName = "",
  initialCustomArtistName = "",
}: RequestButtonProps) {
  const [loadingType, setLoadingType] = useState<RequestType | null>(null);
  const [message, setMessage] = useState("");
  const [showPriorityBox, setShowPriorityBox] = useState(false);
  const [customAmountEuro, setCustomAmountEuro] = useState("");
  const [selectedAmountCents, setSelectedAmountCents] = useState<number | null>(
    minPriorityAmountCents
  );

  const [customTrackName, setCustomTrackName] = useState(initialCustomTrackName);
  const [customArtistName, setCustomArtistName] = useState(initialCustomArtistName);

  const presetAmounts = useMemo(() => {
    const base = [
      minPriorityAmountCents,
      Math.max(minPriorityAmountCents, 500),
      Math.max(minPriorityAmountCents, 1000),
    ];

    return Array.from(new Set(base));
  }, [minPriorityAmountCents]);

  const validateCustomSong = () => {
    if (customMode) {
      if (!customTrackName.trim() || !customArtistName.trim()) {
        throw new Error("Zadaj názov pesničky aj interpreta.");
      }
    }
  };

  const handleFreeRequest = async () => {
    validateCustomSong();

    const response = await fetch("/api/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId,
        trackId,
        type: "free",
        customTrackName: customMode ? customTrackName : undefined,
        customArtistName: customMode ? customArtistName : undefined,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Nepodarilo sa odoslať request.");
    }

    setMessage("Request bol odoslaný.");
  };

  const handlePaidRequest = async () => {
    validateCustomSong();

    let amountCents = selectedAmountCents;

    if (customAmountEuro.trim()) {
      const parsed = Number(customAmountEuro.replace(",", "."));
      if (Number.isNaN(parsed) || parsed <= 0) {
        throw new Error("Zadaj platnú sumu.");
      }

      amountCents = Math.round(parsed * 100);
    }

    if (!amountCents || amountCents < minPriorityAmountCents) {
      throw new Error(
        `Minimálna priority suma je ${(minPriorityAmountCents / 100).toFixed(2)} €`
      );
    }

    const response = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId,
        trackId,
        amountCents,
        customTrackName: customMode ? customTrackName : undefined,
        customArtistName: customMode ? customArtistName : undefined,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.url) {
      throw new Error(result.error || "Nepodarilo sa vytvoriť platbu.");
    }

    window.location.href = result.url;
  };

  const handleRequest = async (type: RequestType) => {
    try {
      setLoadingType(type);
      setMessage("");

      if (type === "free") {
        await handleFreeRequest();
      } else {
        await handlePaidRequest();
      }
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Nastala chyba pri odosielaní requestu."
      );
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <div className="flex w-full max-w-[320px] flex-col items-end gap-2">
      {customMode ? (
        <div className="mb-2 w-full space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <input
            type="text"
            value={customTrackName}
            onChange={(e) => setCustomTrackName(e.target.value)}
            placeholder="Názov pesničky"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30"
          />

          <input
            type="text"
            value={customArtistName}
            onChange={(e) => setCustomArtistName(e.target.value)}
            placeholder="Interpret"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30"
          />
        </div>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <button
          onClick={() => handleRequest("free")}
          disabled={loadingType !== null}
          className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.05] disabled:opacity-50"
        >
          {loadingType === "free" ? "Odosielam..." : "Request"}
        </button>

        <button
          onClick={() => setShowPriorityBox((prev) => !prev)}
          disabled={loadingType !== null}
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:opacity-95 disabled:opacity-50"
        >
          Priority
        </button>
      </div>

      {showPriorityBox ? (
        <div className="w-full rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <p className="mb-3 text-xs text-white/55">
            Minimum priority suma: {(minPriorityAmountCents / 100).toFixed(2)} €
          </p>

          <div className="mb-3 flex flex-wrap gap-2">
            {presetAmounts.map((amount, index) => (
              <button
                key={`${amount}-${index}`}
                onClick={() => {
                  setSelectedAmountCents(amount);
                  setCustomAmountEuro("");
                }}
                className={`rounded-full px-3 py-2 text-sm transition ${
                  selectedAmountCents === amount && !customAmountEuro
                    ? "bg-white text-black"
                    : "border border-white/15 text-white/80 hover:bg-white/[0.05]"
                }`}
              >
                {(amount / 100).toFixed(2)} €
              </button>
            ))}
          </div>

          <input
            type="text"
            inputMode="decimal"
            value={customAmountEuro}
            onChange={(e) => setCustomAmountEuro(e.target.value)}
            placeholder="Vlastná suma, napr. 7.50"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30"
          />

          <button
            onClick={() => handleRequest("paid")}
            disabled={loadingType !== null}
            className="mt-3 w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black disabled:opacity-50"
          >
            {loadingType === "paid"
              ? "Presmerovanie..."
              : "Pokračovať na platbu"}
          </button>
        </div>
      ) : null}

      {message ? (
        <p className="max-w-[260px] text-right text-xs text-white/60">
          {message}
        </p>
      ) : null}
    </div>
  );
}
