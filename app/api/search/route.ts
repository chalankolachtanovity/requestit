import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type TrackRow = {
  id: string;
  spotify_track_id: string | null;
  track_name: string;
  artist: string;
  album_name: string | null;
  popularity: number | null;
  duration_ms: number | null;
  image_url: string | null;
  spotify_url: string | null;
  dedupe_key: string | null;
};

type SessionRow = {
  allow_free_requests: boolean;
  allow_paid_requests: boolean;
  requests_paused: boolean;
};

type EnrichedTrackRow = Omit<TrackRow, "dedupe_key">;

type SpotifySearchTrack = Omit<EnrichedTrackRow, "id"> & {
  id: null;
};

type SpotifyTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

type SpotifyArtist = {
  name: string;
};

type SpotifyAlbumImage = {
  url: string;
};

type SpotifyTrackItem = {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: {
    name: string;
    images: SpotifyAlbumImage[];
  };
  popularity: number;
  duration_ms: number;
  external_urls?: {
    spotify?: string;
  };
};

type SpotifyTrackDetailsResponse = {
  album?: {
    images?: SpotifyAlbumImage[];
  };
  external_urls?: {
    spotify?: string;
  };
};

type SpotifySearchResponse = {
  tracks?: {
    items?: SpotifyTrackItem[];
  };
};

let spotifyCooldownUntil = 0;
let spotifyTokenCache: {
  accessToken: string;
  expiresAt: number;
} | null = null;

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function buildDedupeKey(trackName: string, artist: string) {
  return `${normalizeText(trackName)}|${normalizeText(artist)}`;
}

function isSpotifyCooldownActive() {
  return Date.now() < spotifyCooldownUntil;
}

function setSpotifyCooldown(retryAfterSeconds: number) {
  const safeSeconds =
    Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
      ? retryAfterSeconds
      : 10;

  spotifyCooldownUntil = Date.now() + safeSeconds * 1000;
}

async function getSpotifyAccessToken() {
  if (spotifyTokenCache && Date.now() < spotifyTokenCache.expiresAt) {
    return spotifyTokenCache.accessToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Chýbajú Spotify credentials.");
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (response.status === 429) {
    const retryAfter = Number(response.headers.get("Retry-After") ?? "10");
    setSpotifyCooldown(retryAfter);
    throw new Error("Spotify cooldown active.");
  }

  const result = (await response.json()) as
    | SpotifyTokenResponse
    | { error: string };

  if (!response.ok || !("access_token" in result)) {
    throw new Error("Nepodarilo sa získať Spotify token.");
  }

  spotifyTokenCache = {
    accessToken: result.access_token,
    expiresAt: Date.now() + Math.max((result.expires_in - 30) * 1000, 30_000),
  };

  return result.access_token;
}

function dedupeTracks(rows: Array<TrackRow | SpotifySearchTrack>): Array<EnrichedTrackRow | SpotifySearchTrack> {
  const seen = new Set<string>();
  const deduped: Array<EnrichedTrackRow | SpotifySearchTrack> = [];

  for (const track of rows) {
    const key =
      ("dedupe_key" in track && track.dedupe_key) ||
      buildDedupeKey(track.track_name, track.artist);

    if (seen.has(key)) continue;
    seen.add(key);

    if ("dedupe_key" in track) {
      deduped.push({
        id: track.id,
        spotify_track_id: track.spotify_track_id,
        track_name: track.track_name,
        artist: track.artist,
        album_name: track.album_name,
        popularity: track.popularity,
        duration_ms: track.duration_ms,
        image_url: track.image_url,
        spotify_url: track.spotify_url,
      });
    } else {
      deduped.push({
        id: null,
        spotify_track_id: track.spotify_track_id,
        track_name: track.track_name,
        artist: track.artist,
        album_name: track.album_name,
        popularity: track.popularity,
        duration_ms: track.duration_ms,
        image_url: track.image_url,
        spotify_url: track.spotify_url,
      });
    }

    if (deduped.length >= 10) break;
  }

  return deduped;
}

async function searchSpotifyTracks(
  query: string
): Promise<SpotifySearchTrack[]> {
  try {
    if (isSpotifyCooldownActive()) return [];

    const token = await getSpotifyAccessToken();

    if (isSpotifyCooldownActive()) return [];

    const url = new URL("https://api.spotify.com/v1/search");
    url.searchParams.set("q", query);
    url.searchParams.set("type", "track");
    url.searchParams.set("limit", "10");
    url.searchParams.set("market", "SK");

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("Retry-After") ?? "10");
      setSpotifyCooldown(retryAfter);
      return [];
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("Spotify search failed:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      return [];
    }

    const result: SpotifySearchResponse = await response.json();
    const items: SpotifyTrackItem[] = result.tracks?.items ?? [];

    return dedupeTracks(
      items.map((item) => ({
        id: null,
        spotify_track_id: item.id,
        track_name: item.name,
        artist: item.artists.map((artist) => artist.name).join(", "),
        album_name: item.album?.name ?? null,
        popularity: item.popularity ?? null,
        duration_ms: item.duration_ms ?? null,
        image_url: item.album?.images?.[0]?.url ?? null,
        spotify_url: item.external_urls?.spotify ?? null,
      }))
    ) as SpotifySearchTrack[];
  } catch (error) {
    console.error("Spotify search failed:", error);
    return [];
  }
}

async function searchTracksInDb(
  supabase: Awaited<ReturnType<typeof createSupabaseRouteClient>>,
  query: string
): Promise<EnrichedTrackRow[]> {
  const { data, error } = await supabase
    .from("tracks")
    .select(
      "id, spotify_track_id, track_name, artist, album_name, popularity, duration_ms, image_url, spotify_url, dedupe_key"
    )
    .ilike("search_text", `%${query}%`)
    .order("popularity", { ascending: false, nullsFirst: false })
    .limit(20);

  if (error) {
    throw new Error(error.message);
  }

  return dedupeTracks((data ?? []) as TrackRow[]) as EnrichedTrackRow[];
}

async function enrichTracksMissingImages(
  tracks: EnrichedTrackRow[]
): Promise<EnrichedTrackRow[]> {
  const tracksToEnrich = tracks
    .filter((track) => !track.image_url && track.spotify_track_id)
    .slice(0, 6);

  if (tracksToEnrich.length === 0) {
    return tracks;
  }

  if (isSpotifyCooldownActive()) {
    return tracks;
  }

  try {
    const token = await getSpotifyAccessToken();

    const results = await Promise.allSettled(
      tracksToEnrich.map(async (track) => {
        const response = await fetch(
          `https://api.spotify.com/v1/tracks/${track.spotify_track_id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );

        if (response.status === 429) {
          const retryAfter = Number(response.headers.get("Retry-After") ?? "10");
          setSpotifyCooldown(retryAfter);
          return null;
        }

        if (!response.ok) {
          return null;
        }

        const data = (await response.json()) as SpotifyTrackDetailsResponse;

        return {
          spotify_track_id: track.spotify_track_id as string,
          image_url: data.album?.images?.[0]?.url ?? null,
          spotify_url: data.external_urls?.spotify ?? null,
        };
      })
    );

    const enrichMap = new Map<
      string,
      { image_url: string | null; spotify_url: string | null }
    >();

    for (const result of results) {
      if (result.status === "fulfilled" && result.value?.spotify_track_id) {
        enrichMap.set(result.value.spotify_track_id, {
          image_url: result.value.image_url ?? null,
          spotify_url: result.value.spotify_url ?? null,
        });
      }
    }

    if (enrichMap.size === 0) {
      return tracks;
    }

    const updatedTracks = tracks.map((track) => {
      if (!track.spotify_track_id) return track;

      const enriched = enrichMap.get(track.spotify_track_id);
      if (!enriched) return track;

      return {
        ...track,
        image_url: enriched.image_url ?? track.image_url,
        spotify_url: enriched.spotify_url ?? track.spotify_url,
      };
    });

    const rowsToPersist = updatedTracks
      .filter(
        (track) =>
          track.spotify_track_id &&
          enrichMap.has(track.spotify_track_id) &&
          (track.image_url || track.spotify_url)
      )
      .map((track) => ({
        spotify_track_id: track.spotify_track_id as string,
        image_url: track.image_url,
        spotify_url: track.spotify_url,
      }));

    if (rowsToPersist.length > 0) {
      const supabaseAdmin = createSupabaseAdminClient();

      Promise.allSettled(
        rowsToPersist.map((row) =>
          supabaseAdmin
            .from("tracks")
            .update({
              image_url: row.image_url,
              spotify_url: row.spotify_url,
            })
            .eq("spotify_track_id", row.spotify_track_id)
        )
      ).catch((error) => {
        console.error("Persist enriched track images failed:", error);
      });
    }

    return updatedTracks;
  } catch (error) {
    console.error("Enrich tracks missing images failed:", error);
    return tracks;
  }
}

async function saveSpotifyTracksToDb(tracks: SpotifySearchTrack[]) {
  if (tracks.length === 0) return;

  try {
    const supabaseAdmin = createSupabaseAdminClient();

    const rowsToInsert = tracks
      .filter((track) => track.spotify_track_id)
      .map((track) => ({
        spotify_track_id: track.spotify_track_id,
        track_name: track.track_name,
        artist: track.artist,
        album_name: track.album_name,
        popularity: track.popularity,
        duration_ms: track.duration_ms,
        image_url: track.image_url,
        spotify_url: track.spotify_url,
        dedupe_key: buildDedupeKey(track.track_name, track.artist),
        search_text: `${track.track_name} ${track.artist} ${track.album_name ?? ""}`.toLowerCase(),
      }));

    if (rowsToInsert.length === 0) return;

    const { error } = await supabaseAdmin.from("tracks").upsert(rowsToInsert, {
      onConflict: "spotify_track_id",
      ignoreDuplicates: false,
    });

    if (error) {
      console.error("SAVE SPOTIFY TRACKS ERROR:", error);
    }
  } catch (error) {
    console.error("SAVE SPOTIFY TRACKS ERROR:", error);
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawQ = searchParams.get("q");
    const sessionId = searchParams.get("sessionId");

    const q = rawQ?.trim().toLowerCase() ?? "";

    if (q.length < 2) {
      return NextResponse.json({
        tracks: [],
        allowFreeRequests: true,
        allowPaidRequests: true,
        requestsPaused: false,
      });
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: "Chýba sessionId." },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseRouteClient();

    const sessionPromise = supabase
      .from("sessions")
      .select("allow_free_requests, allow_paid_requests, requests_paused")
      .eq("id", sessionId)
      .single();

    const dbTracksPromise = searchTracksInDb(supabase, q);

    const [
      { data: sessionData, error: sessionError },
      dbTracks,
    ] = await Promise.all([sessionPromise, dbTracksPromise]);

    if (sessionError || !sessionData) {
      return NextResponse.json(
        { error: sessionError?.message || "Session sa nenašla." },
        { status: 500 }
      );
    }

    const session = sessionData as SessionRow;

    let finalTracks: Array<EnrichedTrackRow | SpotifySearchTrack> = dbTracks;

    if (dbTracks.length > 0) {
      finalTracks = await enrichTracksMissingImages(dbTracks);
    } else {
      const spotifyTracks = await searchSpotifyTracks(q);
      finalTracks = spotifyTracks;

      saveSpotifyTracksToDb(spotifyTracks).catch((error) => {
        console.error("SAVE SPOTIFY TRACKS ERROR:", error);
      });
    }

    return NextResponse.json(
      {
        tracks: finalTracks,
        allowFreeRequests: session.allow_free_requests,
        allowPaidRequests: session.allow_paid_requests,
        requestsPaused: session.requests_paused,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("SEARCH ROUTE ERROR:", error);

    return NextResponse.json(
      { error: "Nepodarilo sa vyhľadať pesničky." },
      { status: 500 }
    );
  }
}