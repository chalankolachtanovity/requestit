import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { getSpotifyTrackMetadata } from "@/lib/spotify";

type TrackRow = {
  id: string;
  spotify_track_id: string | null;
  image_url: string | null;
  spotify_url: string | null;
};

export type EnrichTrackImageResult = {
  image_url: string | null;
  spotify_url: string | null;
  cached: boolean;
};

export async function enrichTrackImageById(
  trackId: string
): Promise<EnrichTrackImageResult> {
  const supabase = await createSupabaseRouteClient();

  const { data: track, error: trackError } = await supabase
    .from("tracks")
    .select("id, spotify_track_id, image_url, spotify_url")
    .eq("id", trackId)
    .single<TrackRow>();

  if (trackError || !track) {
    throw new Error("Track not found.");
  }

  if (track.image_url) {
    return {
      image_url: track.image_url,
      spotify_url: track.spotify_url,
      cached: true,
    };
  }

  if (!track.spotify_track_id) {
    throw new Error("Track has no spotify_track_id.");
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
    throw new Error(updateError.message);
  }

  return {
    image_url: spotifyData.imageUrl,
    spotify_url: spotifyData.spotifyUrl,
    cached: false,
  };
}