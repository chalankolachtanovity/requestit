import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

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

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (!forwarded) return "unknown";

  const firstIp = forwarded.split(",")[0]?.trim();
  return firstIp || "unknown";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      sessionId,
      trackId,
      type,
      customTrackName,
      customArtistName,
    } = body as {
      sessionId?: string;
      trackId?: string | null;
      type?: "free" | "paid";
      customTrackName?: string;
      customArtistName?: string;
    };

    const trimmedCustomTrackName = customTrackName?.trim() || "";
    const trimmedCustomArtistName = customArtistName?.trim() || "";

    const hasCustomSong =
      trimmedCustomTrackName.length > 0 && trimmedCustomArtistName.length > 0;

    if (!sessionId || !type || (!trackId && !hasCustomSong)) {
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

      if (diffSeconds < 15) {
        return NextResponse.json(
          {
            error: `Počkaj ${Math.ceil(
              15 - diffSeconds
            )} sekúnd pred ďalším requestom.`,
          },
          { status: 429 }
        );
      }
    }

    const { data: insertedRequest, error: insertError } = await supabase
      .from("requests")
      .insert({
        session_id: sessionId,
        track_id: trackId ?? null,
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

    if (!trackId && hasCustomSong) {
      // vedľajší zápis, nech nespomalí úspešný request flow
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