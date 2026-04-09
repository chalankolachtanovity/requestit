"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, Music4, Radio } from "lucide-react";

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
    return "border border-cyan-300/20 bg-cyan-400/10 text-cyan-200";
  }

  return "border border-violet-300/20 bg-violet-400/10 text-violet-200";
}

function formatSessionDate(value: string | null) {
  if (!value) return null;

  return new Date(value).toLocaleString("sk-SK", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SessionCard({
  session,
  onChange,
}: {
  session: SessionItem;
  onChange: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [origin, setOrigin] = useState(process.env.NEXT_PUBLIC_APP_URL || "");

  useEffect(() => {
    if (!origin && typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, [origin]);

  const guestUrl = origin ? `${origin}/${session.slug}` : `/${session.slug}`;

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
        alert(result.error || "Nepodarilo sa ukoncit event.");
        return;
      }

      onChange();
    } catch (error) {
      console.error("END SESSION ERROR:", error);
      alert("Nepodarilo sa ukoncit event.");
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
      alert("Nepodarilo sa stiahnut QR kod.");
    }
  };

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#141414] shadow-[0_10px_28px_rgba(0,0,0,0.2)] transition hover:bg-[#171717]">
      <div className="p-4 md:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/[0.04] text-white/72">
                {session.is_active ? (
                  <Radio className="h-5 w-5" />
                ) : (
                  <Music4 className="h-5 w-5" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-[28px] font-semibold leading-none tracking-tight text-white">
                    {session.name || "Unnamed Event"}
                  </h3>

                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      session.is_active
                        ? "bg-green-400 text-black"
                        : "bg-white/8 text-white/55"
                    }`}
                  >
                    {session.is_active ? "LIVE" : "ENDED"}
                  </span>

                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${getModeBadgeClasses(
                      session.mode
                    )}`}
                  >
                    {getModeLabel(session.mode)}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/38">
                  {session.starts_at ? <span>{formatSessionDate(session.starts_at)}</span> : null}
                </div>
              </div>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {session.mode !== "most_requested" ? (
                <span className="rounded-full bg-white/[0.05] px-3 py-1 text-xs text-white/72">
                  Min {(session.min_priority_amount_cents / 100).toFixed(2)} EUR
                </span>
              ) : null}

              <span
                className={`rounded-full px-3 py-1 text-xs ${
                  session.allow_free_requests
                    ? "bg-emerald-400/10 text-emerald-200"
                    : "bg-white/[0.05] text-white/42"
                }`}
              >
                Free {session.allow_free_requests ? "enabled" : "disabled"}
              </span>

              <span
                className={`rounded-full px-3 py-1 text-xs ${
                  session.allow_paid_requests
                    ? "bg-amber-400/10 text-amber-200"
                    : "bg-white/[0.05] text-white/42"
                }`}
              >
                Paid {session.allow_paid_requests ? "enabled" : "disabled"}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={`/dashboard/admin/session/${session.id}`}
                className="inline-flex items-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:scale-[1.02] hover:opacity-95"
              >
                Open Queue
              </Link>

              <Link
                href={`/${session.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/75 transition hover:bg-white/[0.06] hover:text-white"
              >
                <ExternalLink className="h-4 w-4" />
                Guest page
              </Link>

              {session.is_active ? (
                <button
                  onClick={handleEnd}
                  disabled={loading}
                  className="inline-flex items-center rounded-full text-sm font-medium text-red-300/85 transition hover:text-red-200 disabled:opacity-50"
                >
                  {loading ? "Ending..." : "End Session"}
                </button>
              ) : null}
            </div>
          </div>

          <div className="w-full xl:w-[172px]">
            <div className="p-1">
              <div className="rounded-[18px] bg-white p-2.5">
                <img
                  src={qrUrl}
                  alt="Session QR code"
                  className="h-full w-full rounded-xl"
                />
              </div>

              <div className="mt-2 flex items-center gap-2">
                <a
                  href={`/${session.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-full bg-white/[0.03] px-3 py-2 text-xs text-white/40 transition hover:bg-white/[0.06] hover:text-white/75"
                >
                  <span className="truncate">{guestUrl}</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>

                <button
                  onClick={handleDownloadQr}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.03] text-white/60 transition hover:bg-white/[0.06] hover:text-white"
                  aria-label="Download QR"
                  title="Download QR"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
