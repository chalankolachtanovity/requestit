"use client";

import { useEffect, useState } from "react";
import RequestButton from "@/components/guest/RequestButton";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

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

type LivePreviewResponse = {
  upNext: LivePreviewItem[];
  currentTopAmountCents: number | null;
};

type SearchBarProps = {
  sessionId: string;
  minPriorityAmountCents: number;
};

function formatDuration(ms: number | null) {
  if (!ms) return null;
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function NotesPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center text-white/28">
      <span className="text-base">♫</span>
    </div>
  );
}

function CustomSongPrompt({
  sessionId,
  minPriorityAmountCents,
  trimmedQuery,
  showCustomSongForm,
  setShowCustomSongForm,
  compact = false,
}: {
  sessionId: string;
  minPriorityAmountCents: number;
  trimmedQuery: string;
  showCustomSongForm: boolean;
  setShowCustomSongForm: (value: boolean) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-black/20 ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <p className={`font-medium text-white ${compact ? "text-sm" : "text-sm"}`}>
        Nenašiel si svoju pesničku?
      </p>

      <p className="mt-1 text-sm text-white/45">
        Môžeš ju pridať manuálne ako vlastný request.
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
            initialCustomTrackName={trimmedQuery}
            initialCustomArtistName=""
            customMode
          />
        </div>
      )}
    </div>
  );
}


export default function SearchBar({
  sessionId,
  minPriorityAmountCents,
}: SearchBarProps) {
  const [supabase] = useState(() => getSupabaseBrowserClient());
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);

  const [liveLoading, setLiveLoading] = useState(true);
  const [liveRefreshing, setLiveRefreshing] = useState(false);
  const [upNext, setUpNext] = useState<LivePreviewItem[]>([]);
  const [currentTopAmountCents, setCurrentTopAmountCents] = useState<number | null>(null);

  const[hasSearched, setHasSearched] = useState(false);
  const trimmedQuery = query.trim();
  const [showCustomSongForm, setShowCustomSongForm] = useState(false);

  const enrichTrackImage = async (trackId: string) => {
    try {
      const response = await fetch("/api/tracks/enrich-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ trackId }),
      });

      const result = await response.json();

      if (!response.ok) return;

      setTracks((prev) =>
        prev.map((track) =>
          track.id === trackId
            ? {
                ...track,
                image_url: result.image_url ?? track.image_url,
                spotify_url: result.spotify_url ?? track.spotify_url,
              }
            : track
        )
      );
    } catch (error) {
      console.error("Image enrich failed:", error);
    }
  };

  const fetchLivePreview = async (silent = false) => {
    try {
      if (silent) {
        setLiveRefreshing(true);
      } else {
        setLiveLoading(true);
      }

      const response = await fetch(
        `/api/live-preview?sessionId=${encodeURIComponent(sessionId)}`,
        {
          cache: "no-store",
        }
      );

      const result: LivePreviewResponse | { error: string } =
        await response.json();

      if (!response.ok || !("upNext" in result)) {
        return;
      }

      setUpNext(result.upNext ?? []);
      setCurrentTopAmountCents(result.currentTopAmountCents ?? null);
    } catch (error) {
      console.error("Live preview fetch failed:", error);
    } finally {
      setLiveLoading(false);
      setLiveRefreshing(false);
    }
  };

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
          fetchLivePreview(true);
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
          fetchLivePreview(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(requestsChannel);
      supabase.removeChannel(paymentAttemptsChannel);
    };
  }, [sessionId, supabase]);

  useEffect(() => {
    const trimmedQuery = query.trim();

    setShowCustomSongForm(false);
    setHasSearched(false);
    if (!trimmedQuery) {
      setTracks([]);
      return;
    }

    if (!trimmedQuery || trimmedQuery.length < 2) {
      setTracks([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setLoading(true);

        const response = await fetch(
          `/api/search?q=${encodeURIComponent(trimmedQuery)}`
        );
        const result = await response.json();

        if (!response.ok) {
          setTracks([]);
          return;
        }

        const nextTracks: Track[] = result.tracks ?? [];
        setTracks(nextTracks);

        nextTracks.forEach((track) => {
          if (!track.image_url && track.spotify_track_id) {
            enrichTrackImage(track.id);
          }
        });
      } catch (error) {
        console.error("Search failed:", error);
        setTracks([]);
      } finally {
        setLoading(false);
        setHasSearched(true);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
        <div className="border-b border-white/10 px-4 py-4 md:px-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
              <p className="text-sm font-semibold text-white">Up next</p>
            </div>

            {currentTopAmountCents ? (
              <p className="text-xs font-medium text-green-400">
                Top request {(currentTopAmountCents / 100).toFixed(2)} €
              </p>
            ) : null}
          </div>
        </div>

        <div className="px-4 py-4 md:px-5">
          {liveLoading && upNext.length === 0 ? (
            <p className="text-sm text-white/40">Načítavam queue...</p>
          ) : upNext.length === 0 ? (
            <p className="text-sm text-white/45">
              Queue je zatiaľ voľná. Tvoja pesnička môže byť medzi prvými.
            </p>
          ) : (
            <div className="space-y-2">
              {upNext.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-2xl px-2 py-2.5 transition hover:bg-white/[0.04]"
                >
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
                    <p className="truncate text-xs text-white/50">
                      {item.artist}
                    </p>
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
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-white/40">
              Vyššia suma zaručí vyššie poradie pesničky.
            </p>

            {liveRefreshing ? (
              <p className="text-[11px] text-white/30">Obnovujem...</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
        <div className="mb-4">
          <p className="text-sm font-semibold text-white">Search</p>
        </div>

        <div className="relative">
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
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Hľadaj song alebo interpreta"
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-11 py-4 text-base text-white outline-none placeholder:text-white/35"
          />
        </div>

        <div className="mt-4">
          {!trimmedQuery ? (
            <p className="text-sm text-white/40">
              Začni písať názov pesničky alebo interpreta.
            </p>
          ) : loading ? (
            <p className="text-sm text-white/40">Vyhľadávam...</p>
          ) : hasSearched && tracks.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-sm text-white/45">Nenašli sa žiadne výsledky.</p>

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
                    initialCustomTrackName={trimmedQuery}
                    initialCustomArtistName=""
                    customMode
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3">
                {tracks.map((track) => (
                  <div
                    key={track.id}
                    className="rounded-2xl border border-white/10 bg-black/20 p-3 md:p-4"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-white/5">
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

                        <div className="min-w-0">
                          <h2 className="truncate text-base font-semibold text-white md:text-lg">
                            {track.track_name}
                          </h2>

                          <p className="truncate text-sm text-white/60">
                            {track.artist}
                          </p>

                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/35">
                            {track.album_name ? (
                              <span className="truncate">{track.album_name}</span>
                            ) : null}

                            {track.duration_ms ? (
                              <span>{formatDuration(track.duration_ms)}</span>
                            ) : null}
                          </div>

                          {track.spotify_url ? (
                            <a
                              href={track.spotify_url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-block text-xs text-green-300 hover:underline"
                            >
                              Open on Spotify
                            </a>
                          ) : null}
                        </div>
                      </div>

                      <div className="sm:flex-shrink-0">
                        <RequestButton
                          sessionId={sessionId}
                          trackId={track.id}
                          minPriorityAmountCents={minPriorityAmountCents}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {hasSearched ? (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <p className="text-sm font-medium text-white">
                    Nenašiel si svoju pesničku?
                  </p>
                  <p className="mt-1 text-sm text-white/45">
                    Môžeš ju pridať manuálne ako vlastný request.
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
                        initialCustomTrackName={trimmedQuery}
                        initialCustomArtistName=""
                        customMode
                      />
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
