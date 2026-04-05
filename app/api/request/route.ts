import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type SessionMode = "classic" | "most_requested";

type SessionRow = {
  mode: SessionMode | null;
  allow_free_requests: boolean;
  allow_paid_requests: boolean;
  requests_paused: boolean;
};

type LastRequestRow = {
  created_at: string;
};

type TrackLookupRow = {
  id: string;
};

type TrackInsertRow = {
  id: string;
};

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (!forwarded) return "unknown";

  const firstIp = forwarded.split(",")[0]?.trim();
  return firstIp || "unknown";
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function buildDedupeKey(trackName: string, artist: string) {
  return `${normalizeText(trackName)}|${normalizeText(artist)}`;
}

function isRealDbTrackId(trackId?: string | null) {
  if (!trackId) return false;
  return !trackId.startsWith("spotify:");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      sessionId,
      trackId,
      spotifyTrackId,
      trackName,
      artist,
      albumName,
      imageUrl,
      spotifyUrl,
      type,
      customTrackName,
      customArtistName,
    } = body as {
      sessionId?: string;
      trackId?: string | null;
      spotifyTrackId?: string | null;
      trackName?: string | null;
      artist?: string | null;
      albumName?: string | null;
      imageUrl?: string | null;
      spotifyUrl?: string | null;
      type?: "free" | "paid";
      customTrackName?: string;
      customArtistName?: string;
    };

    const trimmedCustomTrackName = customTrackName?.trim() || "";
    const trimmedCustomArtistName = customArtistName?.trim() || "";

    const trimmedTrackName = trackName?.trim() || "";
    const trimmedArtist = artist?.trim() || "";
    const trimmedAlbumName = albumName?.trim() || "";

    const hasCustomSong =
      trimmedCustomTrackName.length > 0 && trimmedCustomArtistName.length > 0;

    const hasSpotifyTrack =
      !!spotifyTrackId && trimmedTrackName.length > 0 && trimmedArtist.length > 0;

    const hasAnyTrackReference =
      isRealDbTrackId(trackId) || !!spotifyTrackId || hasCustomSong;

    if (!sessionId || !type || !hasAnyTrackReference) {
      return NextResponse.json(
        { error: "Chýbajú povinné údaje." },
        { status: 400 }
      );
    }

    if (type !== "free" && type !== "paid") {
      return NextResponse.json(
        { error: "Neplatný typ requestu." },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseRouteClient();
    const supabaseAdmin = createSupabaseAdminClient();
    const ip = getClientIp(request);

    const sessionPromise = supabase
      .from("sessions")
      .select("mode, allow_free_requests, allow_paid_requests, requests_paused")
      .eq("id", sessionId)
      .single();

    const lastRequestPromise = supabase
      .from("requests")
      .select("created_at")
      .eq("session_id", sessionId)
      .eq("client_ip", ip)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const [
      { data: sessionRow, error: sessionError },
      { data: lastRequest },
    ] = await Promise.all([sessionPromise, lastRequestPromise]);

    const sessionData = sessionRow as SessionRow | null;
    const lastRequestData = lastRequest as LastRequestRow | null;

    if (sessionError || !sessionData) {
      return NextResponse.json(
        { error: "Session neexistuje." },
        { status: 404 }
      );
    }

    const sessionMode: SessionMode =
      sessionData.mode === "most_requested" ? "most_requested" : "classic";

    if (sessionData.requests_paused) {
      return NextResponse.json(
        { error: "Requesty sú momentálne pozastavené." },
        { status: 400 }
      );
    }

    const finalType: "free" | "paid" =
      sessionMode === "most_requested" ? "free" : type;

    const finalStatus: "pending" | "accepted" =
      sessionMode === "most_requested" ? "accepted" : "pending";

    if (finalType === "free" && !sessionData.allow_free_requests) {
      return NextResponse.json(
        { error: "Free requesty sú momentálne vypnuté." },
        { status: 400 }
      );
    }

    if (finalType === "paid" && !sessionData.allow_paid_requests) {
      return NextResponse.json(
        { error: "Paid requesty sú momentálne vypnuté." },
        { status: 400 }
      );
    }

    if (lastRequestData) {
      const lastTime = new Date(lastRequestData.created_at).getTime();
      const now = Date.now();
      const diffSeconds = (now - lastTime) / 1000;

      if (diffSeconds < 10) {
        return NextResponse.json(
          {
            error: `Počkaj ${Math.ceil(
              10 - diffSeconds
            )} sekúnd pred ďalším requestom.`,
          },
          { status: 429 }
        );
      }
    }

    let resolvedTrackId: string | null = null;

    // 1. Ak prišiel normálny DB track id
    if (isRealDbTrackId(trackId)) {
      const { data: trackById, error: trackByIdError } = await supabaseAdmin
        .from("tracks")
        .select("id")
        .eq("id", trackId)
        .maybeSingle();

      if (trackByIdError) {
        console.error("TRACK LOOKUP BY ID ERROR:", trackByIdError);
        return NextResponse.json(
          { error: "Nepodarilo sa overiť track." },
          { status: 500 }
        );
      }

      if (!trackById) {
        return NextResponse.json(
          { error: "Track sa nenašiel v databáze." },
          { status: 400 }
        );
      }

      resolvedTrackId = (trackById as TrackLookupRow).id;
    }

    // 2. Ak nemáme DB id, ale máme spotify track
    if (!resolvedTrackId && spotifyTrackId) {
      const { data: trackBySpotifyId, error: trackBySpotifyIdError } =
        await supabaseAdmin
          .from("tracks")
          .select("id")
          .eq("spotify_track_id", spotifyTrackId)
          .maybeSingle();

      if (trackBySpotifyIdError) {
        console.error(
          "TRACK LOOKUP BY SPOTIFY ID ERROR:",
          trackBySpotifyIdError
        );
        return NextResponse.json(
          { error: "Nepodarilo sa overiť Spotify track." },
          { status: 500 }
        );
      }

      if (trackBySpotifyId) {
        resolvedTrackId = (trackBySpotifyId as TrackLookupRow).id;
      } else {
        if (!hasSpotifyTrack) {
          return NextResponse.json(
            { error: "Chýbajú údaje o Spotify tracku." },
            { status: 400 }
          );
        }

        const dedupeKey = buildDedupeKey(trimmedTrackName, trimmedArtist);
        const searchText = `${trimmedTrackName} ${trimmedArtist} ${trimmedAlbumName}`.toLowerCase();

        const { data: insertedTrack, error: insertTrackError } =
          await supabaseAdmin
            .from("tracks")
            .insert({
              spotify_track_id: spotifyTrackId,
              track_name: trimmedTrackName,
              artist: trimmedArtist,
              album_name: trimmedAlbumName || null,
              image_url: imageUrl || null,
              spotify_url: spotifyUrl || null,
              dedupe_key: dedupeKey,
              search_text: searchText,
            })
            .select("id")
            .single();

        if (insertTrackError || !insertedTrack) {
          console.error("TRACK INSERT ERROR:", insertTrackError);

          // fallback ak sa insert nepodarí napr. kvôli race condition / unique constraint
          const { data: retryTrack, error: retryTrackError } = await supabaseAdmin
            .from("tracks")
            .select("id")
            .eq("spotify_track_id", spotifyTrackId)
            .maybeSingle();

          if (retryTrackError || !retryTrack) {
            return NextResponse.json(
              {
                error:
                  insertTrackError?.message ||
                  retryTrackError?.message ||
                  "Nepodarilo sa uložiť track.",
              },
              { status: 500 }
            );
          }

          resolvedTrackId = (retryTrack as TrackLookupRow).id;
        } else {
          resolvedTrackId = (insertedTrack as TrackInsertRow).id;
        }
      }
    }

    console.log("REQUEST RESOLVED TRACK ID:", resolvedTrackId);

    const { data: insertedRequest, error: insertError } = await supabase
      .from("requests")
      .insert({
        session_id: sessionId,
        track_id: resolvedTrackId,
        type: finalType,
        status: finalStatus,
        client_ip: ip,
        custom_track_name: hasCustomSong ? trimmedCustomTrackName : null,
        custom_artist_name: hasCustomSong ? trimmedCustomArtistName : null,
      })
      .select("id, session_id, track_id, type, status, created_at")
      .single();

    if (insertError || !insertedRequest) {
      console.error("REQUEST INSERT ERROR:", insertError);
      return NextResponse.json(
        { error: insertError?.message || "Nepodarilo sa vytvoriť request." },
        { status: 500 }
      );
    }

    if (!resolvedTrackId && hasCustomSong) {
      supabase
        .from("custom_tracks")
        .insert({
          artist: trimmedCustomArtistName,
          album: trimmedCustomTrackName,
        })
        .then(({ error }) => {
          if (error) {
            console.error("CUSTOM TRACK INSERT ERROR:", error);
          }
        });
    }

    return NextResponse.json({
      success: true,
      request: insertedRequest,
    });
  } catch (error) {
    console.error("REQUEST ROUTE CRASH:", error);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}