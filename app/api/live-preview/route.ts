import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

type SessionMode = "classic" | "most_requested";

type SessionRow = {
  id: string;
  mode: SessionMode | null;
};

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

type MostRequestedGroupedItem = {
  track_id: string | null;
  custom_key: string | null;
  custom_track_name: string | null;
  custom_artist_name: string | null;
  track_name: string;
  artist: string;
  image_url: string | null;
  spotify_url: string | null;
  request_count: number;
  last_requested_at: string;
};

function getCustomGroupKey(trackName: string, artist: string) {
  return `${trackName.trim().toLowerCase()}::${artist.trim().toLowerCase()}`;
}

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

    const { data: sessionData, error: sessionError } = await supabase
      .from("sessions")
      .select("id, mode")
      .eq("id", sessionId)
      .single();

    if (sessionError || !sessionData) {
      return NextResponse.json(
        { error: sessionError?.message || "Session not found." },
        { status: 404 }
      );
    }

    const session = sessionData as SessionRow;
    const sessionMode: SessionMode =
      session.mode === "most_requested" ? "most_requested" : "classic";

    // ------------------------------------------------------------
    // MOST REQUESTED
    // ------------------------------------------------------------
    if (sessionMode === "most_requested") {
      const { data: requestsData, error: requestsError } = await supabase
        .from("requests")
        .select(
          "id, created_at, track_id, custom_track_name, custom_artist_name"
        )
        .eq("session_id", sessionId)
        .eq("status", "accepted")
        .order("created_at", { ascending: false });

      if (requestsError) {
        return NextResponse.json(
          { error: requestsError.message },
          { status: 500 }
        );
      }

      const acceptedRequests = (requestsData ?? []) as Array<
        Pick<
          RequestRow,
          "id" | "created_at" | "track_id" | "custom_track_name" | "custom_artist_name"
        >
      >;

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

      const groupedMap = new Map<string, MostRequestedGroupedItem>();

      for (const req of acceptedRequests) {
        const track = req.track_id ? tracksMap.get(req.track_id) ?? null : null;

        const trackName =
          track?.track_name ?? req.custom_track_name ?? "Neznáma pesnička";

        const artist =
          track?.artist ?? req.custom_artist_name ?? "Neznámy interpret";

        const imageUrl = track?.image_url ?? null;
        const spotifyUrl = track?.spotify_url ?? null;

        const normalizedCustomTrackName = req.custom_track_name?.trim() || null;
        const normalizedCustomArtistName = req.custom_artist_name?.trim() || null;

        const customKey = req.track_id
          ? null
          : getCustomGroupKey(trackName, artist);

        const groupKey = req.track_id
          ? `track:${req.track_id}`
          : `custom:${customKey}`;

        const existing = groupedMap.get(groupKey);

        if (!existing) {
          groupedMap.set(groupKey, {
            track_id: req.track_id,
            custom_key: customKey,
            custom_track_name: normalizedCustomTrackName,
            custom_artist_name: normalizedCustomArtistName,
            track_name: trackName,
            artist,
            image_url: imageUrl,
            spotify_url: spotifyUrl,
            request_count: 1,
            last_requested_at: req.created_at,
          });
          continue;
        }

        existing.request_count += 1;
      }

      const mostRequested = Array.from(groupedMap.values())
        .sort((a, b) => {
          if (b.request_count !== a.request_count) {
            return b.request_count - a.request_count;
          }

          return (
            new Date(b.last_requested_at).getTime() -
            new Date(a.last_requested_at).getTime()
          );
        })
        .slice(0, 10)
        .map((item) => ({
          track_id: item.track_id,
          custom_track_name: item.custom_track_name,
          custom_artist_name: item.custom_artist_name,
          track_name: item.track_name,
          artist: item.artist,
          image_url: item.image_url,
          spotify_url: item.spotify_url,
          request_count: item.request_count,
          last_requested_at: item.last_requested_at,
        }));

      return NextResponse.json(
        {
          mode: "most_requested",
          mostRequested,
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    // ------------------------------------------------------------
    // CLASSIC
    // ------------------------------------------------------------
    const { data: requestsData, error: requestsError } = await supabase
      .from("requests")
      .select(
        "id, type, status, created_at, payment_attempt_id, track_id, custom_track_name, custom_artist_name"
      )
      .eq("session_id", sessionId)
      .eq("status", "accepted")
      .limit(100);

    if (requestsError) {
      return NextResponse.json(
        { error: requestsError.message },
        { status: 500 }
      );
    }

    const acceptedRequests = (requestsData ?? []) as RequestRow[];

    const paidRequestAttemptIds = acceptedRequests
      .filter((req) => req.type === "paid" && req.payment_attempt_id)
      .map((req) => req.payment_attempt_id as string);

    const trackIds = Array.from(
      new Set(
        acceptedRequests
          .map((req) => req.track_id)
          .filter((id): id is string => Boolean(id))
      )
    );

    const [paymentAttemptsResult, tracksResult] = await Promise.all([
      paidRequestAttemptIds.length > 0
        ? supabase
            .from("payment_attempts")
            .select("id, amount_cents")
            .in("id", paidRequestAttemptIds)
        : Promise.resolve({ data: [], error: null }),
      trackIds.length > 0
        ? supabase
            .from("tracks")
            .select("id, track_name, artist, image_url, spotify_url")
            .in("id", trackIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (paymentAttemptsResult.error) {
      return NextResponse.json(
        { error: paymentAttemptsResult.error.message },
        { status: 500 }
      );
    }

    if (tracksResult.error) {
      return NextResponse.json(
        { error: tracksResult.error.message },
        { status: 500 }
      );
    }

    const paymentAmounts = new Map(
      ((paymentAttemptsResult.data ?? []) as PaymentAttemptRow[]).map((item) => [
        item.id,
        item.amount_cents ?? 0,
      ])
    );

    const tracksMap = new Map(
      ((tracksResult.data ?? []) as TrackRow[]).map((track) => [track.id, track])
    );

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
          track?.track_name ?? req.custom_track_name ?? "Neznáma pesnička",
        artist: track?.artist ?? req.custom_artist_name ?? "Neznámy interpret",
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

    return NextResponse.json(
      {
        mode: "classic",
        upNext,
        currentTopAmountCents,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("LIVE PREVIEW GET ERROR:", error);
    return NextResponse.json(
      { error: "Failed to load live preview." },
      { status: 500 }
    );
  }
}