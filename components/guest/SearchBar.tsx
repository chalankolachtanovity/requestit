"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import RequestButton from "@/components/guest/RequestButton";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { ArrowUp } from "lucide-react";

type Track = {
  id: string;
  spotify_track_id: string | null;
  track_name: string;
  artist: string;
  album_name: string | null;
  popularity: number | null;
  duration_ms: number | null;
  image_url: string | null;
  spotify_url: string | null;
};

type LivePreviewItem = {
  id: string;
  track_name: string;
  artist: string;
  image_url: string | null;
  spotify_url: string | null;
  type: "free" | "paid";
  amount_cents: number | null;
  status: string;
  created_at: string;
};

type MostRequestedItem = {
  track_id: string | null;
  custom_track_name: string | null;
  custom_artist_name: string | null;
  track_name: string;
  artist: string;
  image_url: string | null;
  spotify_url: string | null;
  request_count: number;
  last_requested_at: string;
};

type ClassicLivePreviewResponse = {
  mode: "classic";
  upNext: LivePreviewItem[];
  currentTopAmountCents: number | null;
};

type MostRequestedLivePreviewResponse = {
  mode: "most_requested";
  mostRequested: MostRequestedItem[];
};

type LivePreviewResponse =
  | ClassicLivePreviewResponse
  | MostRequestedLivePreviewResponse;

type SearchResponse = {
  tracks: Track[];
  allowFreeRequests: boolean;
  allowPaidRequests: boolean;
  requestsPaused: boolean;
};

type SearchBarProps = {
  sessionId: string;
  minPriorityAmountCents: number;
  mode: "classic" | "most_requested";
};

const NotesPlaceholder = memo(function NotesPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center text-white/28">
      <span className="text-base">♫</span>
    </div>
  );
});

const CustomSongPrompt = memo(function CustomSongPrompt({
  sessionId,
  minPriorityAmountCents,
  trimmedQuery,
  showCustomSongForm,
  setShowCustomSongForm,
  allowFreeRequests,
  allowPaidRequests,
  requestsPaused,
  compact = false,
  mode,
}: {
  sessionId: string;
  minPriorityAmountCents: number;
  trimmedQuery: string;
  showCustomSongForm: boolean;
  setShowCustomSongForm: (value: boolean) => void;
  allowFreeRequests: boolean;
  allowPaidRequests: boolean;
  requestsPaused: boolean;
  compact?: boolean;
  mode: "classic" | "most_requested";
}) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-black/20 ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <p className="text-sm font-medium text-white">
        Nenašiel si svoju pesničku?
      </p>

      <p className="mt-1 text-sm text-white/45">
        Skús napísať aj názov interpreta.<br></br>
        Ak nenájdeš, môžeš ju pridať manuálne.
      </p>

      {!showCustomSongForm ? (
        <button
          onClick={() => setShowCustomSongForm(true)}
          className="mt-3 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 hover:bg-white/[0.05]"
        >
          Pridať vlastnú pesničku
        </button>
      ) : (
        <div className="mt-4">
          <RequestButton
            sessionId={sessionId}
            trackId={null}
            minPriorityAmountCents={minPriorityAmountCents}
            mode={mode}
            initialCustomTrackName={trimmedQuery}
            initialCustomArtistName=""
            customMode
            allowFreeRequests={allowFreeRequests}
            allowPaidRequests={allowPaidRequests}
            requestsPaused={requestsPaused}
          />
        </div>
      )}
    </div>
  );
});

const UpNextRow = memo(function UpNextRow({
  item,
  index,
}: {
  item: LivePreviewItem;
  index: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl px-2 py-2.5 transition hover:bg-white/[0.04]">
      <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-lg bg-white/5">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.track_name}
            className="h-full w-full object-cover"
          />
        ) : (
          <NotesPlaceholder />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">
          {item.track_name}
        </p>
        <p className="truncate text-xs text-white/50">{item.artist}</p>
      </div>

      <div className="flex items-center gap-2">
        {index === 0 ? (
          <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-black">
            Playing soon
          </span>
        ) : null}

        {item.type === "paid" && item.amount_cents ? (
          <span className="rounded-full border border-green-400/20 bg-green-400/10 px-2.5 py-1 text-[11px] font-semibold text-green-300">
            {(item.amount_cents / 100).toFixed(2)} €
          </span>
        ) : null}
      </div>
    </div>
  );
});

const SearchResultRow = memo(function SearchResultRow({
  track,
  sessionId,
  minPriorityAmountCents,
  mode,
  allowFreeRequests,
  allowPaidRequests,
  requestsPaused,
}: {
  track: Track;
  sessionId: string;
  minPriorityAmountCents: number;
  mode: "classic" | "most_requested";
  allowFreeRequests: boolean;
  allowPaidRequests: boolean;
  requestsPaused: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3 transition hover:bg-white/[0.04]">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-white/5">
          {track.image_url ? (
            <img
              src={track.image_url}
              alt={`${track.track_name} cover`}
              className="h-full w-full object-cover"
            />
          ) : (
            <NotesPlaceholder />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-white">
            {track.track_name}
          </h2>

          <p className="truncate text-[12px] text-white/50">{track.artist}</p>
        </div>

        <div className="flex-shrink-0">
          <RequestButton
            sessionId={sessionId}
            trackId={track.id}
            minPriorityAmountCents={minPriorityAmountCents}
            mode={mode}
            allowFreeRequests={allowFreeRequests}
            allowPaidRequests={allowPaidRequests}
            requestsPaused={requestsPaused}
          />
        </div>
      </div>
    </div>
  );
});

const MostRequestedRow = memo(function MostRequestedRow({
  item,
  index,
  isAnimated,
  isVoting,
  canVote,
  onVote,
  getRequestCountStyle,
}: {
  item: MostRequestedItem;
  index: number;
  isAnimated: boolean;
  isVoting: boolean;
  canVote: boolean;
  onVote: (item: MostRequestedItem) => void;
  getRequestCountStyle: (count: number, index: number) => string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-1.5 py-2.5 transition hover:bg-white/[0.04]">
      <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-xl bg-white/5">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.track_name}
            className="h-full w-full object-cover"
          />
        ) : (
          <NotesPlaceholder />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">
          {item.track_name}
        </p>
        <p className="truncate text-[12px] text-white/45">{item.artist}</p>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold transition duration-300 ${getRequestCountStyle(
            item.request_count,
            index
          )} ${isAnimated ? "scale-110 animate-pulse" : ""}`}
        >
          {index === 0 ? (
            <span className="text-[12px] leading-none">👑</span>
          ) : null}
          <span>{item.request_count}x</span>
        </span>

        <button
          onClick={() => onVote(item)}
          disabled={!canVote || isVoting}
          className={`group flex h-11 w-11 items-center justify-center rounded-full border-2 border-cyan-300/35 bg-black/30 transition hover:scale-105 hover:bg-cyan-400/10 active:scale-95 disabled:opacity-50 ${
            isVoting ? "scale-110 bg-cyan-400/15" : ""
          }`}
          aria-label={`Pridať hlas pre ${item.track_name}`}
          title="Pridať hlas"
        >
          {isVoting ? (
            <span className="animate-pulse text-[11px] font-bold text-cyan-200">
              +1
            </span>
          ) : (
            <ArrowUp
              className="h-5 w-5 text-cyan-200 transition group-hover:text-white"
              strokeWidth={3}
            />
          )}
        </button>
      </div>
    </div>
  );
});

export default function SearchBar({
  sessionId,
  minPriorityAmountCents,
  mode,
}: SearchBarProps) {
  const supabaseRef = useRef(getSupabaseBrowserClient());
  const supabase = supabaseRef.current;
  const inputRef = useRef<HTMLInputElement | null>(null);

  const previousCountsRef = useRef<Record<string, number>>({});
  const livePreviewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);

  const [liveLoading, setLiveLoading] = useState(true);
  const [liveRefreshing, setLiveRefreshing] = useState(false);

  const [animatedBadgeKeys, setAnimatedBadgeKeys] = useState<Set<string>>(
    new Set()
  );
  const [upNext, setUpNext] = useState<LivePreviewItem[]>([]);
  const [mostRequested, setMostRequested] = useState<MostRequestedItem[]>([]);
  const [currentTopAmountCents, setCurrentTopAmountCents] = useState<
    number | null
  >(null);

  const [showAllMostRequested, setShowAllMostRequested] = useState(false);
  const [votingKey, setVotingKey] = useState<string | null>(null);

  const [requestsPaused, setRequestsPaused] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showCustomSongForm, setShowCustomSongForm] = useState(false);

  const [allowFreeRequests, setAllowFreeRequests] = useState(true);
  const [allowPaidRequests, setAllowPaidRequests] = useState(
    mode === "classic"
  );

  const trimmedQuery = query.trim();
  const trimmedSubmittedQuery = submittedQuery.trim();
  const isMostRequestedMode = mode === "most_requested";

  const visibleMostRequested = useMemo(
    () => (showAllMostRequested ? mostRequested : mostRequested.slice(0, 5)),
    [mostRequested, showAllMostRequested]
  );

  const getMostRequestedKey = useCallback((item: MostRequestedItem) => {
    return (
      item.track_id ||
      `${item.custom_track_name ?? item.track_name}::${
        item.custom_artist_name ?? item.artist
      }`
    );
  }, []);

  const getRequestCountStyle = useCallback((count: number, index: number) => {
    if (index === 0) {
      return "border-yellow-400/60 bg-gradient-to-r from-yellow-400/30 via-amber-300/20 to-yellow-400/30 text-yellow-100 shadow-[0_0_25px_rgba(250,204,21,0.35)]";
    }

    if (count >= 10) {
      return "border-pink-400/40 bg-pink-400/20 text-pink-100 shadow-[0_0_15px_rgba(244,114,182,0.22)]";
    }

    if (count >= 6) {
      return "border-purple-400/40 bg-purple-400/20 text-purple-100";
    }

    if (count >= 3) {
      return "border-cyan-400/30 bg-cyan-400/20 text-cyan-200";
    }

    if (count >= 2) {
      return "border-blue-400/30 bg-blue-400/15 text-blue-200";
    }

    return "border-white/10 bg-white/[0.04] text-white/60";
  }, []);

  const fetchLivePreview = useCallback(
    async (silent = false) => {
      try {
        if (silent) {
          setLiveRefreshing(true);
        } else {
          setLiveLoading(true);
        }

        const response = await fetch(
          `/api/live-preview?sessionId=${encodeURIComponent(sessionId)}`,
          { cache: "no-store" }
        );

        const result = (await response.json()) as
          | LivePreviewResponse
          | { error: string };

        if (!response.ok) {
          return;
        }

        if (
          "mode" in result &&
          result.mode === "most_requested" &&
          "mostRequested" in result &&
          Array.isArray(result.mostRequested)
        ) {
          setMostRequested(result.mostRequested);
          setUpNext([]);
          setCurrentTopAmountCents(null);
          return;
        }

        if (
          "mode" in result &&
          result.mode === "classic" &&
          "upNext" in result &&
          Array.isArray(result.upNext)
        ) {
          setUpNext(result.upNext);
          setCurrentTopAmountCents(
            typeof result.currentTopAmountCents === "number"
              ? result.currentTopAmountCents
              : null
          );
          setMostRequested([]);
        }
      } catch (error) {
        console.error("Live preview fetch failed:", error);
      } finally {
        setLiveLoading(false);
        setLiveRefreshing(false);
      }
    },
    [sessionId]
  );

  const scheduleLivePreviewRefresh = useCallback(() => {
    if (livePreviewTimeoutRef.current) {
      clearTimeout(livePreviewTimeoutRef.current);
    }

    livePreviewTimeoutRef.current = setTimeout(() => {
      fetchLivePreview(true);
    }, 150);
  }, [fetchLivePreview]);

  const handleSearchSubmit = useCallback(() => {
    const nextQuery = query.trim();

    setShowCustomSongForm(false);

    if (nextQuery.length < 2) {
      setSubmittedQuery("");
      setTracks([]);
      setHasSearched(false);
      return;
    }

    setSubmittedQuery(nextQuery);
    setHasSearched(false);
    inputRef.current?.blur();
  }, [query]);

  const handleVote = useCallback(
    async (item: MostRequestedItem) => {
      const itemKey = getMostRequestedKey(item);

      setVotingKey(itemKey);

      setMostRequested((prev) =>
        prev.map((entry) =>
          getMostRequestedKey(entry) === itemKey
            ? { ...entry, request_count: entry.request_count + 1 }
            : entry
        )
      );

      try {
        const response = await fetch("/api/request", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId,
            trackId: item.track_id,
            type: "free",
            customTrackName: item.custom_track_name ?? undefined,
            customArtistName: item.custom_artist_name ?? undefined,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          await fetchLivePreview(true);
          alert(result.error || "Nepodarilo sa pridať hlas.");
          return;
        }

        scheduleLivePreviewRefresh();
      } catch (error) {
        console.error("VOTE ERROR:", error);
        await fetchLivePreview(true);
        alert("Nepodarilo sa pridať hlas.");
      } finally {
        setVotingKey(null);
      }
    },
    [
      fetchLivePreview,
      getMostRequestedKey,
      scheduleLivePreviewRefresh,
      sessionId,
    ]
  );

  useEffect(() => {
    fetchLivePreview(false);

    const requestsChannel = supabase
      .channel(`guest-requests-session-${sessionId}`)
      .on(
        "postgres_changes" as never,
        {
          event: "*",
          schema: "public",
          table: "requests",
          filter: `session_id=eq.${sessionId}`,
        } as never,
        () => {
          scheduleLivePreviewRefresh();
        }
      )
      .subscribe();

    const paymentAttemptsChannel = supabase
      .channel(`guest-payment-attempts-session-${sessionId}`)
      .on(
        "postgres_changes" as never,
        {
          event: "*",
          schema: "public",
          table: "payment_attempts",
          filter: `session_id=eq.${sessionId}`,
        } as never,
        () => {
          scheduleLivePreviewRefresh();
        }
      )
      .subscribe();

    return () => {
      if (livePreviewTimeoutRef.current) {
        clearTimeout(livePreviewTimeoutRef.current);
      }
      supabase.removeChannel(requestsChannel);
      supabase.removeChannel(paymentAttemptsChannel);
    };
  }, [fetchLivePreview, scheduleLivePreviewRefresh, sessionId, supabase]);

  useEffect(() => {
    if (!trimmedSubmittedQuery) {
      setTracks([]);
      return;
    }

    const controller = new AbortController();

    const runSearch = async () => {
      try {
        setLoading(true);

        const response = await fetch(
          `/api/search?q=${encodeURIComponent(
            trimmedSubmittedQuery
          )}&sessionId=${encodeURIComponent(sessionId)}`,
          { signal: controller.signal }
        );

        const result: SearchResponse | { error: string } =
          await response.json();

        if (!response.ok || !("tracks" in result)) {
          setTracks([]);
          return;
        }

        const nextTracks = result.tracks ?? [];
        setTracks(nextTracks);
        setAllowFreeRequests(result.allowFreeRequests);
        setAllowPaidRequests(
          isMostRequestedMode ? false : result.allowPaidRequests
        );
        setRequestsPaused(result.requestsPaused);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        console.error("Search failed:", error);
        setTracks([]);
      } finally {
        setLoading(false);
        setHasSearched(true);
      }
    };

    runSearch();

    return () => {
      controller.abort();
    };
  }, [trimmedSubmittedQuery, sessionId, isMostRequestedMode]);

  useEffect(() => {
    if (!isMostRequestedMode || mostRequested.length === 0) return;

    const changedKeys: string[] = [];
    const nextCounts: Record<string, number> = {};

    mostRequested.forEach((item) => {
      const key = getMostRequestedKey(item);
      nextCounts[key] = item.request_count;

      if (
        previousCountsRef.current[key] !== undefined &&
        previousCountsRef.current[key] !== item.request_count
      ) {
        changedKeys.push(key);
      }
    });

    if (changedKeys.length > 0) {
      setAnimatedBadgeKeys(new Set(changedKeys));

      const timeout = setTimeout(() => {
        setAnimatedBadgeKeys(new Set());
      }, 700);

      previousCountsRef.current = nextCounts;
      return () => clearTimeout(timeout);
    }

    previousCountsRef.current = nextCounts;
  }, [getMostRequestedKey, isMostRequestedMode, mostRequested]);

  return (
    <div className="space-y-6">
      <section className="-mx-3 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
        <div className="border-b border-white/10 px-4 py-3.5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div
                  className={`h-2.5 w-2.5 rounded-full animate-pulse ${
                    isMostRequestedMode ? "bg-cyan-400" : "bg-red-500"
                  }`}
                />
                <p className="text-sm font-semibold text-white">
                  {isMostRequestedMode ? "Top requests" : "Up next"}
                </p>
              </div>

              {isMostRequestedMode ? (
                <p className="mt-1 text-xs text-white/40">
                  Klikni na šípku a pridaj hlas.
                </p>
              ) : null}
            </div>

            {!isMostRequestedMode && currentTopAmountCents ? (
              <p className="text-xs font-medium text-green-400">
                Top request {(currentTopAmountCents / 100).toFixed(2)} €
              </p>
            ) : null}
          </div>
        </div>

        <div className="px-4 py-3.5">
          {isMostRequestedMode ? (
            liveLoading && mostRequested.length === 0 ? (
              <p className="text-sm text-white/40">Načítavam rebríček...</p>
            ) : mostRequested.length === 0 ? (
              <p className="text-sm text-white/45">
                Zatiaľ tu nie sú žiadne requesty. Prvá pesnička môže byť práve
                tvoja.
              </p>
            ) : (
              <div className="space-y-3">
                {visibleMostRequested.map((item, index) => {
                  const itemKey = getMostRequestedKey(item);

                  return (
                    <MostRequestedRow
                      key={itemKey}
                      item={item}
                      index={index}
                      isAnimated={animatedBadgeKeys.has(itemKey)}
                      isVoting={votingKey === itemKey}
                      canVote={!requestsPaused && allowFreeRequests}
                      onVote={handleVote}
                      getRequestCountStyle={getRequestCountStyle}
                    />
                  );
                })}

                {mostRequested.length > 5 ? (
                  <div className="pt-1">
                    <button
                      onClick={() => setShowAllMostRequested((prev) => !prev)}
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-1 text-sm font-medium text-white/55 transition hover:bg-white/[0.05]"
                    >
                      {showAllMostRequested
                        ? "Zobraziť menej"
                        : `Zobraziť všetky (${mostRequested.length})`}
                    </button>
                  </div>
                ) : null}
              </div>
            )
          ) : liveLoading && upNext.length === 0 ? (
            <p className="text-sm text-white/40">Načítavam queue...</p>
          ) : upNext.length === 0 ? (
            <p className="text-sm text-white/45">
              Queue je zatiaľ voľná. Tvoja pesnička môže byť medzi prvými.
            </p>
          ) : (
            <div className="space-y-2">
              {upNext.map((item, index) => (
                <UpNextRow key={item.id} item={item} index={index} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
        <div className="mb-4">
          <p className="text-sm font-semibold text-white">Search</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearchSubmit();
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/30">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </div>

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Hľadaj song alebo interpreta"
              enterKeyHint="search"
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-11 py-2 text-base text-white outline-none placeholder:text-white/35"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-2xl border border-white/10 bg-white px-4 py-2 text-sm font-semibold text-black transition hover:opacity-95 disabled:opacity-50"
          >
            Search
          </button>
        </form>

        <div className="mt-4">
          {!trimmedSubmittedQuery ? (
            <p className="text-sm text-white/40">
              Zadaj názov pesničky/interpreta a hľadaj.
            </p>
          ) : loading ? (
            <p className="text-sm text-white/40">Vyhľadávam...</p>
          ) : hasSearched && tracks.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-sm text-white/45">
                Nenašli sa žiadne výsledky.
              </p>

              {!showCustomSongForm ? (
                <button
                  onClick={() => setShowCustomSongForm(true)}
                  className="mt-3 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 hover:bg-white/[0.05]"
                >
                  Pridať vlastnú pesničku
                </button>
              ) : (
                <div className="mt-4">
                  <RequestButton
                    sessionId={sessionId}
                    trackId={null}
                    minPriorityAmountCents={minPriorityAmountCents}
                    mode={mode}
                    initialCustomTrackName={trimmedSubmittedQuery}
                    initialCustomArtistName=""
                    customMode
                    allowFreeRequests={allowFreeRequests}
                    allowPaidRequests={
                      isMostRequestedMode ? false : allowPaidRequests
                    }
                    requestsPaused={requestsPaused}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3">
                {tracks.map((track) => (
                  <SearchResultRow
                    key={track.id}
                    track={track}
                    sessionId={sessionId}
                    minPriorityAmountCents={minPriorityAmountCents}
                    mode={mode}
                    allowFreeRequests={allowFreeRequests}
                    allowPaidRequests={
                      isMostRequestedMode ? false : allowPaidRequests
                    }
                    requestsPaused={requestsPaused}
                  />
                ))}
              </div>

              {hasSearched ? (
                <CustomSongPrompt
                  sessionId={sessionId}
                  minPriorityAmountCents={minPriorityAmountCents}
                  mode={mode}
                  trimmedQuery={trimmedSubmittedQuery}
                  showCustomSongForm={showCustomSongForm}
                  setShowCustomSongForm={setShowCustomSongForm}
                  allowFreeRequests={allowFreeRequests}
                  allowPaidRequests={
                    isMostRequestedMode ? false : allowPaidRequests
                  }
                  requestsPaused={requestsPaused}
                />
              ) : null}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}