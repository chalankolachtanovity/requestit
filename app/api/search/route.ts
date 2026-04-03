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
  search_text: string | null;
  dedupe_key: string | null;
};

type SessionRow = {
  allow_free_requests: boolean;
  allow_paid_requests: boolean;
  requests_paused: boolean;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim().toLowerCase();
    const sessionId = searchParams.get("sessionId");

    if (!q || q.length < 2) {
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

    const { data: sessionData, error: sessionError } = await supabase
      .from("sessions")
      .select("allow_free_requests, allow_paid_requests, requests_paused")
      .eq("id", sessionId)
      .single();

    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 500 });
    }

    const session = sessionData as SessionRow;

    const { data, error } = await supabase
      .from("tracks")
      .select(
        "id, spotify_track_id, track_name, artist, album_name, popularity, duration_ms, image_url, spotify_url, search_text, dedupe_key"
      )
      .ilike("search_text", `%${q}%`)
      .order("popularity", { ascending: false })
      .limit(25);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data ?? []) as TrackRow[];

    const seen = new Set<string>();
    const deduped: TrackRow[] = [];

    for (const track of rows) {
      const key =
        track.dedupe_key ||
        `${track.track_name.toLowerCase()}|${track.artist.toLowerCase()}`;

      if (seen.has(key)) continue;

      seen.add(key);
      deduped.push(track);

      if (deduped.length >= 10) break;
    }

    return NextResponse.json({
      tracks: deduped,
      allowFreeRequests: session.allow_free_requests,
      allowPaidRequests: session.allow_paid_requests,
      requestsPaused: session.requests_paused,
    });
  } catch (error) {
    console.error("SEARCH ROUTE ERROR:", error);

    return NextResponse.json(
      { error: "Nepodarilo sa vyhľadať pesničky." },
      { status: 500 }
    );
  }
}