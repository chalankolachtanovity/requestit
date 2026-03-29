import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

type RequestRow = {
  id: string;
  status: string;
  type: "free" | "paid";
  created_at: string;
  amount_cents: number | null;
  custom_track_name: string | null;
  custom_artist_name: string | null;
  tracks: {
    track_name: string;
    artist: string;
    image_url?: string | null;
    spotify_url?: string | null;
  } | null;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing sessionId." },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseRouteClient();

    const { data, error } = await supabase
      .from("requests")
      .select(`
        id,
        status,
        type,
        created_at,
        payment_attempt_id,
        custom_track_name,
        custom_artist_name,
        tracks (
          track_name,
          artist,
          image_url,
          spotify_url
        )
      `)
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const requests = (data ?? []) as Array<{
      id: string;
      status: string;
      type: "free" | "paid";
      created_at: string;
      payment_attempt_id?: string | null;
      custom_track_name?: string | null;
      custom_artist_name?: string | null;
      tracks?: {
        track_name?: string;
        artist?: string;
        image_url?: string | null;
        spotify_url?: string | null;
      } | null;
    }>;

    const paymentAttemptIds = requests
      .map((req) => req.payment_attempt_id)
      .filter((id): id is string => Boolean(id));

    let amountMap = new Map<string, number>();

    if (paymentAttemptIds.length > 0) {
      const { data: paymentAttempts, error: paymentError } = await supabase
        .from("payment_attempts")
        .select("id, amount_cents")
        .in("id", paymentAttemptIds);

      if (paymentError) {
        return NextResponse.json({ error: paymentError.message }, { status: 500 });
      }

      amountMap = new Map(
        (paymentAttempts ?? []).map((item) => [item.id, item.amount_cents ?? 0])
      );
    }

    const mapped: RequestRow[] = requests.map((req) => ({
      id: req.id,
      status: req.status,
      type: req.type,
      created_at: req.created_at,
      amount_cents: req.payment_attempt_id
        ? amountMap.get(req.payment_attempt_id) ?? null
        : null,
      custom_track_name: req.custom_track_name ?? null,
      custom_artist_name: req.custom_artist_name ?? null,
      tracks: req.tracks
        ? {
            track_name: req.tracks.track_name ?? "",
            artist: req.tracks.artist ?? "",
            image_url: req.tracks.image_url ?? null,
            spotify_url: req.tracks.spotify_url ?? null,
          }
        : null,
    }));

    const incomingPaidRequests = mapped.filter(
      (req) => req.type === "paid" && req.status === "pending"
    );

    const incomingFreeRequests = mapped.filter(
      (req) => req.type === "free" && req.status === "pending"
    );

    const toBePlayedPaidRequests = mapped.filter(
      (req) => req.type === "paid" && req.status === "accepted"
    );

    const toBePlayedFreeRequests = mapped.filter(
      (req) => req.type === "free" && req.status === "accepted"
    );

    return NextResponse.json({
      incomingPaidRequests,
      incomingFreeRequests,
      toBePlayedPaidRequests,
      toBePlayedFreeRequests,
    });
  } catch (error) {
    console.error("REQUESTS GET ERROR:", error);
    return NextResponse.json(
      { error: "Nepodarilo sa načítať requesty." },
      { status: 500 }
    );
  }
}