"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type RequestItem = {
  id: string;
  status: string;
  type: "free" | "paid";
  created_at: string;
  amount_cents: number | null;
  custom_track_name: string | null;
  custom_artist_name: string | null;
  tracks: {
    track_name: string;
    artist: string;
    image_url?: string | null;
    spotify_url?: string | null;
  } | null;
};

type ApiResponse = {
  incomingPaidRequests: RequestItem[];
  incomingFreeRequests: RequestItem[];
  toBePlayedPaidRequests: RequestItem[];
  toBePlayedFreeRequests: RequestItem[];
};

function TypeBadge({ type }: { type: "free" | "paid" }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.12em] ${
        type === "paid"
          ? "bg-green-400 text-black"
          : "border border-white/15 text-white/60"
      }`}
    >
      {type === "paid" ? "PAID" : "FREE"}
    </span>
  );
}

function AmountBadge({ amountCents }: { amountCents: number | null }) {
  if (!amountCents) return null;

  return (
    <span className="rounded-full border border-green-300/30 bg-green-400/15 px-2.5 py-0.5 text-[11px] font-bold text-green-200">
      {(amountCents / 100).toFixed(2)} €
    </span>
  );
}

function CoverImage({
  imageUrl,
  alt,
  size = "md",
}: {
  imageUrl?: string | null;
  alt: string;
  size?: "sm" | "md";
}) {
  const classes =
    size === "sm"
      ? "h-10 w-10 rounded-md"
      : "h-12 w-12 rounded-lg";

  return (
    <div
      className={`flex-shrink-0 overflow-hidden bg-white/5 ${classes}`}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={alt}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-white/28">
          <span className={size === "sm" ? "text-sm" : "text-base"}>♫</span>
        </div>
      )}
    </div>
  );
}

function PlaylistRow({
  req,
  index,
  updatingId,
  onPlayed,
}: {
  req: RequestItem;
  index: number;
  updatingId: string | null;
  onPlayed: (requestId: string) => void;
}) {
  const isPaid = req.type === "paid";

  return (
    <div
      className={`grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 transition ${
        isPaid
          ? "bg-green-400/[0.06] hover:bg-green-400/[0.10]"
          : "hover:bg-white/[0.05]"
      }`}
    >
      <div className="text-sm text-white/30">{index + 1}</div>

      <div className="flex min-w-0 items-center gap-3">
        <CoverImage
          imageUrl={req.tracks?.image_url}
          alt={`${req.tracks?.track_name ?? "Track"} cover`}
          size="sm"
        />

        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <p
              className={`truncate text-sm font-medium ${
                isPaid ? "text-green-50" : "text-white"
              }`}
            >
              {req.tracks?.track_name ?? req.custom_track_name ?? "Neznáma pesnička"}
            </p>

            <TypeBadge type={req.type} />
            {isPaid ? <AmountBadge amountCents={req.amount_cents} /> : null}
          </div>

          <p className="truncate text-xs text-white/50">
            {req.tracks?.artist ?? req.custom_artist_name ?? "Neznámy interpret"}
          </p>
        </div>
      </div>

      <button
        onClick={() => onPlayed(req.id)}
        disabled={updatingId === req.id}
        className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-black disabled:opacity-50"
      >
        Played
      </button>
    </div>
  );
}

function IncomingRow({
  req,
  updatingId,
  onAcceptFree,
  onPlayed,
  onCapturePaid,
  onReject,
}: {
  req: RequestItem;
  updatingId: string | null;
  onAcceptFree: (requestId: string) => void;
  onPlayed: (requestId: string) => void;
  onCapturePaid: (requestId: string) => void;
  onReject: (requestId: string) => void;
}) {
  const isAccepted = req.status === "accepted";
  const isPaid = req.type === "paid";

  return (
    <div
      className={`rounded-2xl border p-4 transition ${
        isPaid
          ? "border-green-400/20 bg-green-400/[0.07] shadow-[0_0_0_1px_rgba(74,222,128,0.05)]"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <CoverImage
            imageUrl={req.tracks?.image_url}
            alt={`${req.tracks?.track_name ?? "Track"} cover`}
            size="md"
          />

          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <TypeBadge type={req.type} />
              {isPaid ? <AmountBadge amountCents={req.amount_cents} /> : null}
            </div>

            <h3
              className={`truncate text-base font-semibold ${
                isPaid ? "text-green-50" : "text-white"
              }`}
            >
              {req.tracks?.track_name ?? req.custom_track_name ?? "Neznáma pesnička"}
            </h3>

            <p className="truncate text-sm text-white/55">
              {req.tracks?.artist ?? req.custom_artist_name ?? "Neznámy interpret"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {!isAccepted ? (
            isPaid ? (
              <>
                <button
                  onClick={() => onCapturePaid(req.id)}
                  disabled={updatingId === req.id}
                  className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
                >
                  Accept & charge
                </button>

                <button
                  onClick={() => onReject(req.id)}
                  disabled={updatingId === req.id}
                  className="rounded-full border border-red-400/30 px-4 py-2 text-sm text-red-300 disabled:opacity-50"
                >
                  Reject
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onAcceptFree(req.id)}
                  disabled={updatingId === req.id}
                  className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
                >
                  Accept
                </button>

                <button
                  onClick={() => onReject(req.id)}
                  disabled={updatingId === req.id}
                  className="rounded-full border border-red-400/30 px-4 py-2 text-sm text-red-300 disabled:opacity-50"
                >
                  Reject
                </button>
              </>
            )
          ) : (
            <button
              onClick={() => onPlayed(req.id)}
              disabled={updatingId === req.id}
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
            >
              Played
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RequestsList({ sessionId }: { sessionId: string }) {
  const supabase = getSupabaseBrowserClient();

  const [incomingPaidRequests, setIncomingPaidRequests] = useState<RequestItem[]>([]);
  const [incomingFreeRequests, setIncomingFreeRequests] = useState<RequestItem[]>([]);
  const [toBePlayedPaidRequests, setToBePlayedPaidRequests] = useState<RequestItem[]>([]);
  const [toBePlayedFreeRequests, setToBePlayedFreeRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const toBePlayed = [...toBePlayedPaidRequests, ...toBePlayedFreeRequests];
  const incoming = [...incomingPaidRequests, ...incomingFreeRequests];

  const fetchRequests = async () => {
    try {
      setError("");

      const res = await fetch(`/api/requests?sessionId=${sessionId}`);
      const data: ApiResponse | { error: string } = await res.json();

      if (!res.ok || !("incomingPaidRequests" in data)) {
        setError(
          "error" in data ? data.error : "Nepodarilo sa načítať requesty."
        );
        return;
      }

      setIncomingPaidRequests(data.incomingPaidRequests ?? []);
      setIncomingFreeRequests(data.incomingFreeRequests ?? []);
      setToBePlayedPaidRequests(data.toBePlayedPaidRequests ?? []);
      setToBePlayedFreeRequests(data.toBePlayedFreeRequests ?? []);
    } catch (err) {
      console.error("REQUESTS FETCH ERROR:", err);
      setError("Nepodarilo sa načítať requesty.");
    } finally {
      setLoading(false);
    }
  };

  const updateRequestStatus = async (
    requestId: string,
    status: "accepted" | "played" | "rejected"
  ) => {
    try {
      setUpdatingId(requestId);

      const res = await fetch("/api/request-status", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          status,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Nepodarilo sa zmeniť status.");
        return;
      }

      await fetchRequests();
    } catch (err) {
      console.error("REQUEST STATUS UPDATE ERROR:", err);
      alert("Nepodarilo sa zmeniť status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const capturePaidRequest = async (requestId: string) => {
    try {
      setUpdatingId(requestId);

      const res = await fetch("/api/request-capture", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requestId }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Nepodarilo sa strhnúť platbu.");
        return;
      }

      await fetchRequests();
    } catch (err) {
      console.error("REQUEST CAPTURE ERROR:", err);
      alert("Nepodarilo sa strhnúť platbu.");
    } finally {
      setUpdatingId(null);
    }
  };

  const rejectRequest = async (requestId: string) => {
    try {
      setUpdatingId(requestId);

      const res = await fetch("/api/request-reject", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requestId }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Nepodarilo sa zamietnuť request.");
        return;
      }

      await fetchRequests();
    } catch (err) {
      console.error("REQUEST REJECT ERROR:", err);
      alert("Nepodarilo sa zamietnuť request.");
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    fetchRequests();

    const requestsChannel = supabase
      .channel(`requests-session-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "requests",
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    const paymentAttemptsChannel = supabase
      .channel(`payment-attempts-session-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payment_attempts",
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(requestsChannel);
      supabase.removeChannel(paymentAttemptsChannel);
    };
  }, [sessionId]);

  if (loading) {
    return <p className="text-white/60">Načítavam...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-400">{error}</p>;
  }

  return (
    <div className="space-y-10">
      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-white/35">
              Queue
            </p>
            <h2 className="mt-1 text-2xl font-bold">To Be Played</h2>
          </div>

          <span className="text-sm text-white/35">{toBePlayed.length}</span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          {toBePlayed.length === 0 ? (
            <div className="px-4 py-4 text-sm text-white/45">
              Zatiaľ nič pripravené na prehratie.
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {toBePlayed.map((req, index) => (
                <PlaylistRow
                  key={req.id}
                  req={req}
                  index={index}
                  updatingId={updatingId}
                  onPlayed={(id) => updateRequestStatus(id, "played")}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-white/35">
              Requests
            </p>
            <h2 className="mt-1 text-2xl font-bold">Incoming Requests</h2>
          </div>

          <span className="text-sm text-white/35">{incoming.length}</span>
        </div>

        {incoming.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-white/45">
            Žiadne nové requesty.
          </div>
        ) : (
          <div className="space-y-3">
            {incomingPaidRequests.map((req) => (
              <IncomingRow
                key={req.id}
                req={req}
                updatingId={updatingId}
                onAcceptFree={(id) => updateRequestStatus(id, "accepted")}
                onPlayed={(id) => updateRequestStatus(id, "played")}
                onCapturePaid={capturePaidRequest}
                onReject={rejectRequest}
              />
            ))}

            {incomingFreeRequests.map((req) => (
              <IncomingRow
                key={req.id}
                req={req}
                updatingId={updatingId}
                onAcceptFree={(id) => updateRequestStatus(id, "accepted")}
                onPlayed={(id) => updateRequestStatus(id, "played")}
                onCapturePaid={capturePaidRequest}
                onReject={rejectRequest}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}