 
import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

type SessionRow = {
  allow_free_requests: boolean;
  allow_paid_requests: boolean;
  requests_paused: boolean;
};

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

    const hasCustomSong =
      !!customTrackName?.trim() && !!customArtistName?.trim();

    if (!sessionId || !type || (!trackId && !hasCustomSong)) {
      return NextResponse.json(
        { error: "Chýbajú povinné údaje." },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseRouteClient();

    if (!trackId && customTrackName) {
      await supabase.from("custom_tracks").insert({
        artist: customArtistName || "Unknown",
        album: customTrackName,
      });
    }

    const { data: sessionRow, error: sessionError } = await supabase
      .from("sessions")
      .select("allow_free_requests, allow_paid_requests, requests_paused")
      .eq("id", sessionId)
      .single();

    const sessionData = sessionRow as SessionRow | null;

    if (sessionError || !sessionData) {
      return NextResponse.json(
        { error: "Session neexistuje." },
        { status: 404 }
      );
    }

    if (sessionData.requests_paused) {
      return NextResponse.json(
        { error: "Requesty sú momentálne pozastavené." },
        { status: 400 }
      );
    }

    if (type === "free" && !sessionData.allow_free_requests) {
      return NextResponse.json(
        { error: "Free requesty sú momentálne vypnuté." },
        { status: 400 }
      );
    }

    if (type === "paid" && !sessionData.allow_paid_requests) {
      return NextResponse.json(
        { error: "Paid requesty sú momentálne vypnuté." },
        { status: 400 }
      );
    }

    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0] : "unknown";

    const { data: lastRequest } = await supabase
      .from("requests")
      .select("created_at")
      .eq("session_id", sessionId)
      .eq("client_ip", ip)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastRequest) {
      const lastTime = new Date(lastRequest.created_at).getTime();
      const now = Date.now();
      const diffSeconds = (now - lastTime) / 1000;

      if (diffSeconds < 15) {
        return NextResponse.json(
          {
            error: `Počkaj ${Math.ceil(15 - diffSeconds)} sekúnd pred ďalším requestom.`,
          },
          { status: 429 }
        );
      }
    }

    const { data, error } = await supabase
      .from("requests")
      .insert([
        {
          session_id: sessionId,
          track_id: trackId ?? null,
          type,
          status: "pending",
          client_ip: ip,
          custom_track_name: hasCustomSong ? customTrackName!.trim() : null,
          custom_artist_name: hasCustomSong ? customArtistName!.trim() : null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("REQUEST INSERT ERROR:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, request: data });
  } catch (error) {
    console.error("REQUEST ROUTE CRASH:", error);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
