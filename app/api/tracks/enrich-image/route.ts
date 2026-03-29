import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { getSpotifyTrackMetadata } from "@/lib/spotify";

type TrackRow = {
  id: string;
  spotify_track_id: string | null;
  image_url: string | null;
  spotify_url: string | null;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { trackId } = body as { trackId?: string };

    if (!trackId) {
      return NextResponse.json(
        { error: "Missing trackId." },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseRouteClient();

    const { data: track, error: trackError } = await supabase
      .from("tracks")
      .select("id, spotify_track_id, image_url, spotify_url")
      .eq("id", trackId)
      .single<TrackRow>();

    if (trackError || !track) {
      return NextResponse.json(
        { error: "Track not found." },
        { status: 404 }
      );
    }

    if (track.image_url) {
      return NextResponse.json({
        success: true,
        image_url: track.image_url,
        spotify_url: track.spotify_url,
        cached: true,
      });
    }

    if (!track.spotify_track_id) {
      return NextResponse.json(
        { error: "Track has no spotify_track_id." },
        { status: 400 }
      );
    }

    const spotifyData = await getSpotifyTrackMetadata(track.spotify_track_id);

    const { error: updateError } = await supabase
      .from("tracks")
      .update({
        image_url: spotifyData.imageUrl,
        spotify_url: spotifyData.spotifyUrl,
        image_fetched_at: new Date().toISOString(),
      })
      .eq("id", track.id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      image_url: spotifyData.imageUrl,
      spotify_url: spotifyData.spotifyUrl,
      cached: false,
    });
  } catch (error) {
    console.error("ENRICH IMAGE ERROR:", error);
    return NextResponse.json(
      { error: "Failed to enrich track image." },
      { status: 500 }
    );
  }
}