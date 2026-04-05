"use client";

import { useMemo, useState } from "react";

type RequestType = "free" | "paid";
type SessionMode = "classic" | "most_requested";

type RequestButtonProps = {
  sessionId: string;
  trackId: string | null;
  spotifyTrackId?: string | null;
  trackName?: string | null;
  artist?: string | null;
  albumName?: string | null;
  imageUrl?: string | null;
  spotifyUrl?: string | null;
  minPriorityAmountCents: number;
  mode?: SessionMode;
  customMode?: boolean;
  initialCustomTrackName?: string;
  initialCustomArtistName?: string;
  allowFreeRequests: boolean;
  allowPaidRequests: boolean;
  requestsPaused: boolean;
};

export default function RequestButton({
  sessionId,
  trackId,
  spotifyTrackId = null,
  trackName = null,
  artist = null,
  albumName = null,
  imageUrl = null,
  spotifyUrl = null,
  minPriorityAmountCents,
  mode = "classic",
  customMode = false,
  initialCustomTrackName = "",
  initialCustomArtistName = "",
  allowFreeRequests,
  allowPaidRequests,
  requestsPaused,
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

  const isMostRequestedMode = mode === "most_requested";

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

  const getSafeTrackId = () => {
    if (!trackId) return null;
    if (String(trackId).startsWith("spotify:")) return null;
    return trackId;
  };

  const buildTrackPayload = () => {
    const safeTrackId = getSafeTrackId();

    return {
      sessionId,
      trackId: safeTrackId,
      spotifyTrackId,
      trackName: customMode ? undefined : trackName,
      artist: customMode ? undefined : artist,
      albumName: customMode ? undefined : albumName,
      imageUrl: customMode ? undefined : imageUrl,
      spotifyUrl: customMode ? undefined : spotifyUrl,
      customTrackName: customMode ? customTrackName.trim() : undefined,
      customArtistName: customMode ? customArtistName.trim() : undefined,
    };
  };

  const handleFreeRequest = async () => {
    if (!allowFreeRequests) {
      throw new Error("Bezplatné requesty sú momentálne vypnuté.");
    }

    validateCustomSong();

    const payload = {
      ...buildTrackPayload(),
      type: "free",
    };

    console.log("REQUESTBUTTON payload:", payload);

    const response = await fetch("/api/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Nepodarilo sa odoslať request.");
    }

    setMessage(
      isMostRequestedMode
        ? "Hlas bol pridaný."
        : "Request bol odoslaný."
    );

    if (customMode && isMostRequestedMode) {
      setCustomTrackName("");
      setCustomArtistName("");
    }
  };

  const handlePaidRequest = async () => {
    if (!allowPaidRequests) {
      throw new Error("Priority requesty sú momentálne vypnuté.");
    }

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

    const payload = {
      ...buildTrackPayload(),
      amountCents,
    };

    console.log("REQUESTBUTTON paid payload:", payload);

    const response = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
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

  const effectiveAllowPaidRequests = isMostRequestedMode
    ? false
    : allowPaidRequests;

  const noRequestsEnabled =
    requestsPaused || (!allowFreeRequests && !effectiveAllowPaidRequests);

  return (
    <div className="flex flex-col items-end gap-2">
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

      {noRequestsEnabled ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/50">
          Requesty sú momentálne vypnuté.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap justify-end gap-2">
            {allowFreeRequests ? (
              <button
                onClick={() => handleRequest("free")}
                disabled={loadingType !== null}
                className={`rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition disabled:opacity-50 ${
                  isMostRequestedMode
                    ? "border border-cyan-300/20 bg-cyan-400/12 text-cyan-200 hover:bg-cyan-400/18"
                    : "border border-white/15 text-white hover:bg-white/[0.05]"
                }`}
              >
                {loadingType === "free"
                  ? isMostRequestedMode
                    ? "Pridávam hlas..."
                    : "Odosielam..."
                  : isMostRequestedMode
                  ? "Pridať hlas"
                  : "Request"}
              </button>
            ) : null}

            {effectiveAllowPaidRequests ? (
              <button
                onClick={() => setShowPriorityBox((prev) => !prev)}
                disabled={loadingType !== null}
                className="rounded-full border border-amber-300/20 bg-amber-200/10 px-4 py-2 text-sm font-semibold text-amber-200 backdrop-blur-md transition hover:bg-amber-200/20 disabled:opacity-50"
              >
                Priority
              </button>
            ) : null}
          </div>

          {showPriorityBox && effectiveAllowPaidRequests ? (
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
        </>
      )}

      {message ? (
        <p className="max-w-[260px] text-right text-xs text-white/60">
          {message}
        </p>
      ) : null}
    </div>
  );
}