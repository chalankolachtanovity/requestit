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

    const tracksPromise = supabase
      .from("tracks")
      .select(
        "id, spotify_track_id, track_name, artist, album_name, popularity, duration_ms, image_url, spotify_url, dedupe_key"
      )
      .ilike("search_text", `%${q}%`)
      .order("popularity", { ascending: false, nullsFirst: false })
      .limit(40);

    const [
      { data: sessionData, error: sessionError },
      { data: tracksData, error: tracksError },
    ] = await Promise.all([sessionPromise, tracksPromise]);

    if (sessionError || !sessionData) {
      return NextResponse.json(
        { error: sessionError?.message || "Session sa nenašla." },
        { status: 500 }
      );
    }

    if (tracksError) {
      return NextResponse.json(
        { error: tracksError.message },
        { status: 500 }
      );
    }

    const session = sessionData as SessionRow;
    const rows = (tracksData ?? []) as TrackRow[];

    const seen = new Set<string>();
    const deduped: EnrichedTrackRow[] = [];

    for (const track of rows) {
      const key =
        track.dedupe_key ||
        `${track.track_name.trim().toLowerCase()}|${track.artist.trim().toLowerCase()}`;

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

    const missingCoverTracks = deduped.filter(
      (track) => !track.image_url && track.spotify_track_id
    );

    if (missingCoverTracks.length > 0) {
      const enrichResults = await Promise.allSettled(
        missingCoverTracks.map((track) => enrichTrackOnServer(request, track.id))
      );

      const enrichMap = new Map<string, EnrichResponse>();

      missingCoverTracks.forEach((track, index) => {
        const result = enrichResults[index];

        if (result.status === "fulfilled" && result.value) {
          enrichMap.set(track.id, result.value);
        }
      });

      for (const track of deduped) {
        const enriched = enrichMap.get(track.id);

        if (enriched) {
          track.image_url = enriched.image_url ?? track.image_url;
          track.spotify_url = enriched.spotify_url ?? track.spotify_url;
        }
      }
    }

    return NextResponse.json(
      {
        tracks: deduped,
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