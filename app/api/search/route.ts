import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { enrichTrackImageById } from "@/lib/tracks/enrich-track-image";

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

type EnrichResponse = {
  image_url?: string | null;
  spotify_url?: string | null;
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

type SpotifySearchResponse = {
  tracks?: {
    items?: SpotifyTrackItem[];
  };
};

let spotifyCooldownUntil = 0;

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

    console.warn("Spotify token rate limit hit", { retryAfter });
    setSpotifyCooldown(retryAfter);
    throw new Error("Spotify cooldown active.");
  }

  const result = (await response.json()) as
    | SpotifyTokenResponse
    | { error: string };

  if (!response.ok || !("access_token" in result)) {
    throw new Error("Nepodarilo sa získať Spotify token.");
  }

  return result.access_token;
}

async function searchSpotifyTracks(
  query: string
): Promise<SpotifySearchTrack[]> {
  try {
    if (isSpotifyCooldownActive()) {
      return [];
    }

    const token = await getSpotifyAccessToken();

    if (isSpotifyCooldownActive()) {
      return [];
    }

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

      console.warn("Spotify search rate limit hit", { retryAfter });
      setSpotifyCooldown(retryAfter);
      return [];
    }

    if (!response.ok) {
      const errorText = await response.text();

      console.error("Spotify error:", {
        status: response.status,
        statusText: response.statusText,
        url: url.toString(),
        body: errorText,
      });

      return [];
    }

    const result: SpotifySearchResponse = await response.json();
    const items: SpotifyTrackItem[] = result.tracks?.items ?? [];

    return items.map((item) => ({
      id: null,
      spotify_track_id: item.id,
      track_name: item.name,
      artist: item.artists.map((artist) => artist.name).join(", "),
      album_name: item.album?.name ?? null,
      popularity: item.popularity ?? null,
      duration_ms: item.duration_ms ?? null,
      image_url: item.album?.images?.[0]?.url ?? null,
      spotify_url: item.external_urls?.spotify ?? null,
    }));
  } catch (error) {
    console.error("Spotify search failed:", error);
    return [];
  }
}

function dedupeTracks(rows: TrackRow[]): EnrichedTrackRow[] {
  const seen = new Set<string>();
  const deduped: EnrichedTrackRow[] = [];

  for (const track of rows) {
    const key =
      track.dedupe_key || buildDedupeKey(track.track_name, track.artist);

    if (seen.has(key)) continue;
    seen.add(key);

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

    if (deduped.length >= 10) break;
  }

  return deduped;
}

async function searchTracksInDb(
  supabase: Awaited<ReturnType<typeof createSupabaseRouteClient>>,
  query: string
) {
  const { data, error } = await supabase
    .from("tracks")
    .select(
      "id, spotify_track_id, track_name, artist, album_name, popularity, duration_ms, image_url, spotify_url, dedupe_key"
    )
    .ilike("search_text", `%${query}%`)
    .order("popularity", { ascending: false, nullsFirst: false })
    .limit(40);

  if (error) {
    throw new Error(error.message);
  }

  return dedupeTracks((data ?? []) as TrackRow[]);
}

async function saveSpotifyTracksToDb(
  tracks: SpotifySearchTrack[]
): Promise<EnrichedTrackRow[]> {
  if (tracks.length === 0) return [];

  const supabaseAdmin = createSupabaseAdminClient();

  const rowsToInsert = tracks.map((track) => ({
    spotify_track_id: track.spotify_track_id,
    track_name: track.track_name,
    artist: track.artist,
    album_name: track.album_name,
    popularity: track.popularity,
    duration_ms: track.duration_ms,
    image_url: track.image_url,
    spotify_url: track.spotify_url,
    dedupe_key: buildDedupeKey(track.track_name, track.artist),
    search_text: `${track.track_name} ${track.artist} ${
      track.album_name ?? ""
    }`.toLowerCase(),
  }));

  const { error: upsertError } = await supabaseAdmin.from("tracks").upsert(
    rowsToInsert,
    {
      onConflict: "spotify_track_id",
      ignoreDuplicates: false,
    }
  );
  console.log("ROWS TO INSERT:", rowsToInsert.length);
  if (upsertError) {
    console.error("SAVE SPOTIFY TRACKS ERROR:", upsertError);
    return [];
  }

  const spotifyIds = tracks
    .map((track) => track.spotify_track_id)
    .filter((id): id is string => Boolean(id));

  if (spotifyIds.length === 0) return [];

  const { data, error: fetchError } = await supabaseAdmin
    .from("tracks")
    .select(
      "id, spotify_track_id, track_name, artist, album_name, popularity, duration_ms, image_url, spotify_url, dedupe_key"
    )
    .in("spotify_track_id", spotifyIds)
    .order("popularity", { ascending: false, nullsFirst: false });

  if (fetchError) {
    console.error("FETCH SAVED SPOTIFY TRACKS ERROR:", fetchError);
    return [];
  }

  return dedupeTracks((data ?? []) as TrackRow[]);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawQ = searchParams.get("q");
    const sessionId = searchParams.get("sessionId");

    const q = rawQ?.trim() ?? "";

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

    const dbTracksPromise = searchTracksInDb(supabase, q.toLowerCase());

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
    let finalTracks = dbTracks;

    if (finalTracks.length === 0) {
      try {
        const spotifyTracks = await searchSpotifyTracks(q);
        console.log("SPOTIFY TRACKS FOUND:", spotifyTracks.length);

        if (spotifyTracks.length > 0) {
          const savedTracks = await saveSpotifyTracksToDb(spotifyTracks);
          console.log("SPOTIFY TRACKS SAVED:", savedTracks.length);
          finalTracks = savedTracks;
        }
      } catch (spotifyError) {
        console.error("SPOTIFY FALLBACK ERROR:", spotifyError);
      }
    }

    const missingCoverTracks = finalTracks.filter(
      (track) => !track.image_url && track.spotify_track_id
    );

    if (missingCoverTracks.length > 0) {
      const enrichResults = await Promise.allSettled(
        missingCoverTracks.map((track) => enrichTrackImageById(track.id))
      );

      const enrichMap = new Map<string, EnrichResponse>();

      missingCoverTracks.forEach((track, index) => {
        const result = enrichResults[index];

        if (result.status === "fulfilled" && result.value) {
          enrichMap.set(track.id, result.value);
        }
      });

      for (const track of finalTracks) {
        const enriched = enrichMap.get(track.id);

        if (enriched) {
          track.image_url = enriched.image_url ?? track.image_url;
          track.spotify_url = enriched.spotify_url ?? track.spotify_url;
        }
      }
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