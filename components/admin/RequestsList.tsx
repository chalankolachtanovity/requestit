"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type {
  ClassicRequestsData,
  MostRequestedItem,
  RequestItem,
} from "@/lib/dashboard-data";

type SessionMode = "classic" | "most_requested";

type MostRequestedApiResponse = {
  mode: "most_requested";
  mostRequested: MostRequestedItem[];
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
      {(amountCents / 100).toFixed(2)} EUR
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
  const dimensions =
    size === "sm"
      ? { width: 40, height: 40, radius: "rounded-md" }
      : { width: 48, height: 48, radius: "rounded-lg" };

  return (
    <div
      className={`relative flex-shrink-0 overflow-hidden bg-white/5 ${dimensions.radius}`}
      style={{ width: dimensions.width, height: dimensions.height }}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={alt}
          fill
          sizes={size === "sm" ? "40px" : "48px"}
          className="object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-white/28">
          <span className={size === "sm" ? "text-sm" : "text-base"}>♪</span>
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
              {req.tracks?.track_name ?? req.custom_track_name ?? "Unknown track"}
            </p>

            <TypeBadge type={req.type} />
            {isPaid ? <AmountBadge amountCents={req.amount_cents} /> : null}
          </div>

          <p className="truncate text-xs text-white/50">
            {req.tracks?.artist ?? req.custom_artist_name ?? "Unknown artist"}
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
              {req.tracks?.track_name ?? req.custom_track_name ?? "Unknown track"}
            </h3>

            <p className="truncate text-sm text-white/55">
              {req.tracks?.artist ?? req.custom_artist_name ?? "Unknown artist"}
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

function MostRequestedRow({
  item,
  index,
  updatingId,
  onPlayed,
}: {
  item: MostRequestedItem;
  index: number;
  updatingId: string | null;
  onPlayed: (item: MostRequestedItem) => void;
}) {
  const rowId =
    item.track_id ||
    `${item.custom_track_name ?? item.track_name}-${item.custom_artist_name ?? item.artist}`;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:bg-white/[0.05]">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/5 text-sm font-semibold text-white/75">
        {index + 1}
      </div>

      <CoverImage imageUrl={item.image_url} alt={`${item.track_name} cover`} size="md" />

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-base font-semibold text-white">
          {item.track_name}
        </h3>
        <p className="truncate text-sm text-white/55">{item.artist}</p>
      </div>

      <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-200">
        {item.request_count}x
      </span>

      <button
        onClick={() => onPlayed(item)}
        disabled={updatingId === rowId}
        className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-black disabled:opacity-50"
      >
        Played
      </button>
    </div>
  );
}

export default function RequestsList({
  sessionId,
  mode,
  initialClassicData,
  initialMostRequested,
}: {
  sessionId: string;
  mode: SessionMode;
  initialClassicData?: ClassicRequestsData;
  initialMostRequested?: MostRequestedItem[];
}) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const isMostRequestedMode = mode === "most_requested";
  const hasInitialData = isMostRequestedMode
    ? initialMostRequested !== undefined
    : initialClassicData !== undefined;

  const [incomingPaidRequests, setIncomingPaidRequests] = useState<RequestItem[]>(
    initialClassicData?.incomingPaidRequests ?? []
  );
  const [incomingFreeRequests, setIncomingFreeRequests] = useState<RequestItem[]>(
    initialClassicData?.incomingFreeRequests ?? []
  );
  const [toBePlayedPaidRequests, setToBePlayedPaidRequests] = useState<RequestItem[]>(
    initialClassicData?.toBePlayedPaidRequests ?? []
  );
  const [toBePlayedFreeRequests, setToBePlayedFreeRequests] = useState<RequestItem[]>(
    initialClassicData?.toBePlayedFreeRequests ?? []
  );
  const [mostRequested, setMostRequested] = useState<MostRequestedItem[]>(
    initialMostRequested ?? []
  );
  const [loading, setLoading] = useState(!hasInitialData);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const refreshTimerRef = useRef<number | null>(null);
  const refreshInFlightRef = useRef(false);
  const refreshQueuedRef = useRef(false);

  const applyClassicData = useCallback((data: ClassicRequestsData) => {
    startTransition(() => {
      setIncomingPaidRequests(data.incomingPaidRequests ?? []);
      setIncomingFreeRequests(data.incomingFreeRequests ?? []);
      setToBePlayedPaidRequests(data.toBePlayedPaidRequests ?? []);
      setToBePlayedFreeRequests(data.toBePlayedFreeRequests ?? []);
      setMostRequested([]);
      setError("");
      setLoading(false);
    });
  }, []);

  const applyMostRequestedData = useCallback((items: MostRequestedItem[]) => {
    startTransition(() => {
      setMostRequested(items ?? []);
      setIncomingPaidRequests([]);
      setIncomingFreeRequests([]);
      setToBePlayedPaidRequests([]);
      setToBePlayedFreeRequests([]);
      setError("");
      setLoading(false);
    });
  }, []);

  const runRefresh = useCallback(async () => {
    if (refreshInFlightRef.current) {
      refreshQueuedRef.current = true;
      return;
    }

    refreshInFlightRef.current = true;

    try {
      if (isMostRequestedMode) {
        const response = await fetch(
          `/api/live-preview?sessionId=${encodeURIComponent(sessionId)}`,
          { cache: "no-store" }
        );
        const data: MostRequestedApiResponse | { error: string } =
          await response.json();

        if (!response.ok || !("mode" in data) || data.mode !== "most_requested") {
          startTransition(() => {
            setError(
              "error" in data ? data.error : "Could not load ranking."
            );
            setLoading(false);
          });
          return;
        }

        applyMostRequestedData(data.mostRequested ?? []);
        return;
      }

      const response = await fetch(`/api/requests?sessionId=${sessionId}`);
      const data: ClassicRequestsData | { error: string } = await response.json();

      if (!response.ok || !("incomingPaidRequests" in data)) {
        startTransition(() => {
          setError(
            "error" in data ? data.error : "Could not load requests."
          );
          setLoading(false);
        });
        return;
      }

      applyClassicData(data);
    } catch (error) {
      console.error("REQUESTS FETCH ERROR:", error);
      startTransition(() => {
        setError(
          isMostRequestedMode
            ? "Could not load ranking."
            : "Could not load requests."
        );
        setLoading(false);
      });
    } finally {
      refreshInFlightRef.current = false;

      if (refreshQueuedRef.current) {
        refreshQueuedRef.current = false;

        if (refreshTimerRef.current !== null) {
          window.clearTimeout(refreshTimerRef.current);
        }

        refreshTimerRef.current = window.setTimeout(() => {
          refreshTimerRef.current = null;
          void runRefresh();
        }, 120);
      }
    }
  }, [applyClassicData, applyMostRequestedData, isMostRequestedMode, sessionId]);

  const scheduleRefresh = useCallback((delay = 120) => {
    if (refreshTimerRef.current !== null) {
      return;
    }

    refreshTimerRef.current = window.setTimeout(() => {
      refreshTimerRef.current = null;
      void runRefresh();
    }, delay);
  }, [runRefresh]);

  const markMostRequestedPlayed = async (item: MostRequestedItem) => {
    try {
      const rowId =
        item.track_id ||
        `${item.custom_track_name ?? item.track_name}-${item.custom_artist_name ?? item.artist}`;

      setUpdatingId(rowId);

      const response = await fetch("/api/request-status", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          trackId: item.track_id,
          customTrackName: item.custom_track_name,
          customArtistName: item.custom_artist_name,
          status: "played",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || "Could not mark track as played.");
        return;
      }

      scheduleRefresh(0);
    } catch (error) {
      console.error("MOST REQUESTED PLAYED ERROR:", error);
      alert("Could not mark track as played.");
    } finally {
      setUpdatingId(null);
    }
  };

  const updateRequestStatus = async (
    requestId: string,
    status: "accepted" | "played" | "rejected"
  ) => {
    try {
      setUpdatingId(requestId);

      const response = await fetch("/api/request-status", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          status,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || "Could not update request status.");
        return;
      }

      scheduleRefresh(0);
    } catch (error) {
      console.error("REQUEST STATUS UPDATE ERROR:", error);
      alert("Could not update request status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const capturePaidRequest = async (requestId: string) => {
    try {
      setUpdatingId(requestId);

      const response = await fetch("/api/request-capture", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requestId }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || "Could not capture payment.");
        return;
      }

      scheduleRefresh(0);
    } catch (error) {
      console.error("REQUEST CAPTURE ERROR:", error);
      alert("Could not capture payment.");
    } finally {
      setUpdatingId(null);
    }
  };

  const rejectRequest = async (requestId: string) => {
    try {
      setUpdatingId(requestId);

      const response = await fetch("/api/request-reject", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requestId }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || "Could not reject request.");
        return;
      }

      scheduleRefresh(0);
    } catch (error) {
      console.error("REQUEST REJECT ERROR:", error);
      alert("Could not reject request.");
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    if (!hasInitialData) {
      void runRefresh();
    }

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
          scheduleRefresh();
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
          if (!isMostRequestedMode) {
            scheduleRefresh();
          }
        }
      )
      .subscribe();

    return () => {
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
      }

      supabase.removeChannel(requestsChannel);
      supabase.removeChannel(paymentAttemptsChannel);
    };
  }, [hasInitialData, isMostRequestedMode, runRefresh, scheduleRefresh, sessionId, supabase]);

  const toBePlayed = useMemo(
    () => [...toBePlayedPaidRequests, ...toBePlayedFreeRequests],
    [toBePlayedPaidRequests, toBePlayedFreeRequests]
  );

  const incoming = useMemo(
    () => [...incomingPaidRequests, ...incomingFreeRequests],
    [incomingPaidRequests, incomingFreeRequests]
  );

  if (loading) {
    return <p className="text-white/60">Loading...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-400">{error}</p>;
  }

  if (isMostRequestedMode) {
    return (
      <div className="space-y-10">
        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-white/35">
                Ranking
              </p>
              <h2 className="mt-1 text-2xl font-bold">Most Requested</h2>
            </div>

            <span className="text-sm text-white/35">{mostRequested.length}</span>
          </div>

          {mostRequested.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-white/45">
              No requests yet.
            </div>
          ) : (
            <div className="space-y-3">
              {mostRequested.map((item, index) => (
                <MostRequestedRow
                  key={
                    item.track_id ||
                    `${item.custom_track_name ?? item.track_name}-${item.custom_artist_name ?? item.artist}`
                  }
                  item={item}
                  index={index}
                  updatingId={updatingId}
                  onPlayed={markMostRequestedPlayed}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    );
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
              Nothing queued for playback yet.
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
            No new requests.
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
