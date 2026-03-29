import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

type RequestRow = {
  id: string;
  type: "free" | "paid";
  status: string;
  created_at: string;
  payment_attempt_id: string | null;
  track_id: string | null;
  custom_track_name: string | null;
  custom_artist_name: string | null;
};

type PaymentAttemptRow = {
  id: string;
  amount_cents: number | null;
};

type TrackRow = {
  id: string;
  track_name: string;
  artist: string;
  image_url: string | null;
  spotify_url: string | null;
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
      .select(
        "id, type, status, created_at, payment_attempt_id, track_id, custom_track_name, custom_artist_name"
      )
      .eq("session_id", sessionId)
      .eq("status", "accepted")
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const acceptedRequests = (data ?? []) as RequestRow[];

    const paidRequestAttemptIds = acceptedRequests
      .filter((req) => req.type === "paid" && req.payment_attempt_id)
      .map((req) => req.payment_attempt_id as string);

    let paymentAmounts = new Map<string, number>();

    if (paidRequestAttemptIds.length > 0) {
      const { data: paymentAttempts, error: paymentError } = await supabase
        .from("payment_attempts")
        .select("id, amount_cents")
        .in("id", paidRequestAttemptIds);

      if (paymentError) {
        return NextResponse.json(
          { error: paymentError.message },
          { status: 500 }
        );
      }

      paymentAmounts = new Map(
        ((paymentAttempts ?? []) as PaymentAttemptRow[]).map((item) => [
          item.id,
          item.amount_cents ?? 0,
        ])
      );
    }

    const trackIds = Array.from(
      new Set(
        acceptedRequests
          .map((req) => req.track_id)
          .filter((id): id is string => Boolean(id))
      )
    );

    let tracksMap = new Map<string, TrackRow>();

    if (trackIds.length > 0) {
      const { data: tracksData, error: tracksError } = await supabase
        .from("tracks")
        .select("id, track_name, artist, image_url, spotify_url")
        .in("id", trackIds);

      if (tracksError) {
        return NextResponse.json(
          { error: tracksError.message },
          { status: 500 }
        );
      }

      tracksMap = new Map(
        ((tracksData ?? []) as TrackRow[]).map((track) => [track.id, track])
      );
    }

    const sortedRequests = [...acceptedRequests].sort((a, b) => {
      const aAmount =
        a.type === "paid" && a.payment_attempt_id
          ? paymentAmounts.get(a.payment_attempt_id) ?? 0
          : 0;

      const bAmount =
        b.type === "paid" && b.payment_attempt_id
          ? paymentAmounts.get(b.payment_attempt_id) ?? 0
          : 0;

      if (a.type === "paid" && b.type === "paid") {
        return bAmount - aAmount;
      }

      if (a.type === "paid" && b.type === "free") return -1;
      if (a.type === "free" && b.type === "paid") return 1;

      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });

    const upNext = sortedRequests.slice(0, 3).map((req) => {
      const track = req.track_id ? tracksMap.get(req.track_id) ?? null : null;

      return {
        id: req.id,
        track_name:
          track?.track_name ??
          req.custom_track_name ??
          "Neznáma pesnička",
        artist:
          track?.artist ??
          req.custom_artist_name ??
          "Neznámy interpret",
        image_url: track?.image_url ?? null,
        spotify_url: track?.spotify_url ?? null,
        type: req.type,
        amount_cents:
          req.type === "paid" && req.payment_attempt_id
            ? paymentAmounts.get(req.payment_attempt_id) ?? null
            : null,
        status: req.status,
        created_at: req.created_at,
      };
    });

    const currentTopAmountCents =
      upNext.find((item) => item.type === "paid")?.amount_cents ?? null;

    return NextResponse.json({
      upNext,
      currentTopAmountCents,
    });
  } catch (error) {
    console.error("LIVE PREVIEW GET ERROR:", error);
    return NextResponse.json(
      { error: "Failed to load live preview." },
      { status: 500 }
    );
  }
}