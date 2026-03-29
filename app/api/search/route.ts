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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim().toLowerCase();

    if (!q || q.length < 2) {
      return NextResponse.json({ tracks: [] });
    }

    const supabase = await createSupabaseRouteClient();

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

    return NextResponse.json({ tracks: deduped });
  } catch (error) {
    console.error("SEARCH ROUTE ERROR:", error);

    return NextResponse.json(
      { error: "Nepodarilo sa vyhľadať pesničky." },
      { status: 500 }
    );
  }
}