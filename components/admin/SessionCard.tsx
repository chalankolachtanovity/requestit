"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type SessionMode = "classic" | "most_requested";

type SessionItem = {
  id: string;
  name: string | null;
  slug: string;
  is_active: boolean;
  mode: SessionMode;
  min_priority_amount_cents: number;
  allow_free_requests: boolean;
  allow_paid_requests: boolean;
  starts_at: string | null;
  created_at: string;
};

function getModeLabel(mode: SessionMode) {
  return mode === "most_requested" ? "Most Requested" : "Classic";
}

function getModeBadgeClasses(mode: SessionMode) {
  if (mode === "most_requested") {
    return "bg-cyan-400/15 text-cyan-200 border border-cyan-300/20";
  }

  return "bg-violet-400/15 text-violet-200 border border-violet-300/20";
}

export default function SessionCard({
  session,
  onChange,
}: {
  session: SessionItem;
  onChange: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const guestUrl = `${appUrl}/${session.slug}`;

  const qrUrl = useMemo(() => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(
      guestUrl
    )}`;
  }, [guestUrl]);

  const handleEnd = async () => {
    try {
      setLoading(true);

      const response = await fetch(`/api/sessions/${session.id}/deactivate`, {
        method: "PATCH",
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || "Nepodarilo sa ukončiť event.");
        return;
      }

      onChange();
    } catch (error) {
      console.error("END SESSION ERROR:", error);
      alert("Nepodarilo sa ukončiť event.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadQr = async () => {
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${session.slug}-qr.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("QR DOWNLOAD ERROR:", error);
      alert("Nepodarilo sa stiahnuť QR kód.");
    }
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#181818] shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition hover:bg-[#1d1d1d]">
      <div className="bg-gradient-to-br from-white/[0.08] via-transparent to-transparent p-5 md:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#232323] text-2xl shadow-inner">
                🎧
              </div>

              <div className="min-w-0">
                <h3 className="truncate text-2xl font-bold text-white">
                  {session.name || "Unnamed Event"}
                </h3>

                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      session.is_active
                        ? "bg-green-400 text-black"
                        : "bg-white/10 text-white/60"
                    }`}
                  >
                    {session.is_active ? "LIVE" : "ENDED"}
                  </span>

                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getModeBadgeClasses(
                      session.mode
                    )}`}
                  >
                    {getModeLabel(session.mode)}
                  </span>

                  {session.starts_at ? (
                    <span className="text-xs text-white/45">
                      {new Date(session.starts_at).toLocaleString("sk-SK")}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
              {session.mode === "most_requested" ? (
                <span className="rounded-full bg-[#232323] px-3 py-1 text-xs text-cyan-200">
                  Most requested mode
                </span>
              ) : (
                <span className="rounded-full bg-[#232323] px-3 py-1 text-xs text-white/70">
                  Minimum {(session.min_priority_amount_cents / 100).toFixed(2)} €
                </span>
              )}

              <span className="rounded-full bg-[#232323] px-3 py-1 text-xs text-white/70">
                Free {session.allow_free_requests ? "on" : "off"}
              </span>

              <span
                className={`rounded-full bg-[#232323] px-3 py-1 text-xs ${
                  session.allow_paid_requests
                    ? "text-white/70"
                    : session.mode === "most_requested"
                    ? "text-cyan-200"
                    : "text-white/50"
                }`}
              >
                Paid {session.allow_paid_requests ? "on" : "off"}
              </span>
            </div>

            <div className="mb-3">
              <Link
                href={`/dashboard/admin/session/${session.id}`}
                className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:scale-[1.02]"
              >
                {session.mode === "most_requested"
                  ? "Open Most Requested"
                  : "Open Queue"}
              </Link>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/dashboard/admin/session/${session.id}/settings`}
                className="rounded-full bg-[#232323] px-4 py-2 text-sm text-white/80 transition hover:bg-[#2b2b2b]"
              >
                Settings
              </Link>

              <a
                href={`/${session.slug}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-[#232323] px-4 py-2 text-sm text-white/80 transition hover:bg-[#2b2b2b]"
              >
                Open Guest Page
              </a>

              <button
                onClick={() => setShowQr((prev) => !prev)}
                className="rounded-full bg-[#232323] px-4 py-2 text-sm text-white/80 transition hover:bg-[#2b2b2b]"
              >
                {showQr ? "Hide QR" : "Show QR"}
              </button>

              <button
                onClick={handleDownloadQr}
                className="rounded-full bg-[#232323] px-4 py-2 text-sm text-white/80 transition hover:bg-[#2b2b2b]"
              >
                Download QR
              </button>

              {session.is_active ? (
                <button
                  onClick={handleEnd}
                  disabled={loading}
                  className="rounded-full bg-[#232323] px-4 py-2 text-sm text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
                >
                  {loading ? "Ending..." : "End"}
                </button>
              ) : null}
            </div>
          </div>

          <div className="w-full xl:w-[240px]">
            <div className="rounded-3xl bg-[#121212] p-4">
              {!showQr ? (
                <div className="flex h-[190px] flex-col items-center justify-center rounded-2xl bg-[#1f1f1f] text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#2a2a2a] text-xl">
                    ♪
                  </div>
                  <p className="text-sm font-medium text-white/85">
                    Guest access ready
                  </p>
                  <p className="mt-1 text-xs text-white/40">
                    Show or download QR code
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl bg-white p-3">
                  <img
                    src={qrUrl}
                    alt="Session QR code"
                    className="h-full w-full rounded-xl"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}