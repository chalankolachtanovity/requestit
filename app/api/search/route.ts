import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

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

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function normalizeForDedupe(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(
      /[-–—]\s*(remaster(ed)?|version|radio edit|edit|mono|stereo|live|acoustic|deluxe).*$/i,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

function buildDedupeKey(trackName: string, artist: string) {
  return `${normalizeText(trackName)}|${normalizeText(artist)}`;
}

function buildTrackDedupeKey(trackName: string, artist: string) {
  return `${normalizeForDedupe(trackName)}|${normalizeForDedupe(artist)}`;
}

function pickBetterTrack(a: EnrichedTrackRow, b: EnrichedTrackRow) {
  const aScore =
    (a.image_url ? 3 : 0) +
    (a.spotify_url ? 2 : 0) +
    (a.popularity ?? 0);

  const bScore =
    (b.image_url ? 3 : 0) +
    (b.spotify_url ? 2 : 0) +
    (b.popularity ?? 0);

  return bScore > aScore ? b : a;
}

function dedupeEnrichedTracks(tracks: EnrichedTrackRow[]): EnrichedTrackRow[] {
  const map = new Map<string, EnrichedTrackRow>();

  for (const track of tracks) {
    const key = buildTrackDedupeKey(track.track_name, track.artist);
    const existing = map.get(key);

    if (!existing) {
      map.set(key, track);
      continue;
    }

    map.set(key, pickBetterTrack(existing, track));
  }

  return Array.from(map.values())
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
    .slice(0, 10);
}

async function enrichTrackOnServer(
  request: Request,
  trackId: string
): Promise<EnrichResponse | null> {
  try {
    const enrichUrl = new URL("/api/tracks/enrich-image", request.url);

    const response = await fetch(enrichUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: request.headers.get("cookie") ?? "",
      },
      body: JSON.stringify({ trackId }),
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const result = (await response.json()) as EnrichResponse;
    return result;
  } catch (error) {
    console.error("SERVER ENRICH ERROR:", error);
    return null;
  }
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

  const result = (await response.json()) as
    | SpotifyTokenResponse
    | { error: string };

  if (!response.ok || !("access_token" in result)) {
    throw new Error("Nepodarilo sa získať Spotify token.");
  }

  return result.access_token;
}

async function searchSpotifyTracks(query: string): Promise<EnrichedTrackRow[]> {
  try {
    const token = await getSpotifyAccessToken();

    const url = new URL("https://api.spotify.com/v1/search");
    url.searchParams.set("q", query);
    url.searchParams.set("type", "track");
    url.searchParams.set("limit", "20");
    url.searchParams.set("market", "SK");

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (response.status === 429) {
      console.warn("Spotify rate limit hit", {
        retryAfter: response.headers.get("Retry-After"),
      });
      return [];
    }

    if (!response.ok) {
      console.error("Spotify error:", response.status);
      return [];
    }

    const result: SpotifySearchResponse = await response.json();
    const items: SpotifyTrackItem[] = result.tracks?.items ?? [];

    const mappedTracks: EnrichedTrackRow[] = items.map(
      (item: SpotifyTrackItem) => ({
        id: crypto.randomUUID(),
        spotify_track_id: item.id,
        track_name: item.name,
        artist: item.artists
          .map((artist: SpotifyArtist) => artist.name)
          .join(", "),
        album_name: item.album?.name ?? null,
        popularity: item.popularity ?? null,
        duration_ms: item.duration_ms ?? null,
        image_url: item.album?.images?.[0]?.url ?? null,
        spotify_url: item.external_urls?.spotify ?? null,
      })
    );

    return dedupeEnrichedTracks(mappedTracks);
  } catch (error) {
    console.error("Spotify search failed:", error);
    return [];
  }
}

async function saveSpotifyTracksToDb(
  supabase: Awaited<ReturnType<typeof createSupabaseRouteClient>>,
  tracks: EnrichedTrackRow[]
) {
  if (tracks.length === 0) return;

  const dedupedTracks = dedupeEnrichedTracks(tracks);

  const rowsToInsert = dedupedTracks.map((track) => ({
    spotify_track_id: track.spotify_track_id,
    track_name: track.track_name,
    artist: track.artist,
    album_name: track.album_name,
    popularity: track.popularity,
    duration_ms: track.duration_ms,
    image_url: track.image_url,
    spotify_url: track.spotify_url,
    dedupe_key: buildTrackDedupeKey(track.track_name, track.artist),
    search_text: `${track.track_name} ${track.artist} ${
      track.album_name ?? ""
    }`.toLowerCase(),
  }));

  const { error } = await supabase.from("tracks").upsert(rowsToInsert, {
    onConflict: "spotify_track_id",
    ignoreDuplicates: false,
  });

  if (error) {
    console.error("SAVE SPOTIFY TRACKS ERROR:", error);
  } else {
    console.log("Spotify tracky boli ulozene do DB:", rowsToInsert.length);
  }
}

function dedupeTracks(rows: TrackRow[]): EnrichedTrackRow[] {
  const seen = new Set<string>();
  const deduped: EnrichedTrackRow[] = [];

  for (const track of rows) {
    const key =
      track.dedupe_key || buildTrackDedupeKey(track.track_name, track.artist);

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

        if (spotifyTracks.length > 0) {
          await saveSpotifyTracksToDb(supabase, spotifyTracks);

          const dbTracksAfterSave = await searchTracksInDb(
            supabase,
            q.toLowerCase()
          );

          finalTracks =
            dbTracksAfterSave.length > 0 ? dbTracksAfterSave : spotifyTracks;
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
        missingCoverTracks.map((track) =>
          enrichTrackOnServer(request, track.id)
        )
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