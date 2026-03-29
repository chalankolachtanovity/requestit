import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

type SessionRow = {
  id: string;
  name: string | null;
  slug: string;
};

type PaymentAttemptRow = {
  id: string;
  session_id: string;
  track_id: string | null;
  amount_cents: number | null;
  payment_status: string;
  dj_decision: string;
  created_at: string;
  custom_track_name: string | null;
  custom_artist_name: string | null;
};

type TrackRow = {
  id: string;
  track_name: string;
  artist: string;
  image_url: string | null;
};

export async function GET() {
  try {
    const supabase = await createSupabaseRouteClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { data: sessionsData, error: sessionsError } = await supabase
      .from("sessions")
      .select("id, name, slug")
      .eq("user_id", user.id);

    if (sessionsError) {
      return NextResponse.json({ error: sessionsError.message }, { status: 500 });
    }

    const sessions = (sessionsData ?? []) as SessionRow[];
    const sessionIds = sessions.map((s) => s.id);

    if (sessionIds.length === 0) {
      return NextResponse.json({ transactions: [] });
    }

    const { data: paymentsData, error: paymentsError } = await supabase
      .from("payment_attempts")
      .select(
        "id, session_id, track_id, amount_cents, payment_status, dj_decision, created_at, custom_track_name, custom_artist_name"
      )
      .in("session_id", sessionIds)
      .eq("payment_status", "captured")
      .eq("dj_decision", "accepted")
      .order("created_at", { ascending: false });

    if (paymentsError) {
      return NextResponse.json({ error: paymentsError.message }, { status: 500 });
    }

    const payments = (paymentsData ?? []) as PaymentAttemptRow[];

    const trackIds = Array.from(
      new Set(
        payments
          .map((payment) => payment.track_id)
          .filter((id): id is string => Boolean(id))
      )
    );

    let tracksMap = new Map<string, TrackRow>();

    if (trackIds.length > 0) {
      const { data: tracksData, error: tracksError } = await supabase
        .from("tracks")
        .select("id, track_name, artist, image_url")
        .in("id", trackIds);

      if (tracksError) {
        return NextResponse.json({ error: tracksError.message }, { status: 500 });
      }

      tracksMap = new Map(
        ((tracksData ?? []) as TrackRow[]).map((track) => [track.id, track])
      );
    }

    const sessionsMap = new Map(sessions.map((session) => [session.id, session]));

    const transactions = payments.map((payment) => {
      const session = sessionsMap.get(payment.session_id) ?? null;
      const track = payment.track_id ? tracksMap.get(payment.track_id) ?? null : null;

      return {
        id: payment.id,
        amount_cents: payment.amount_cents ?? 0,
        created_at: payment.created_at,
        session: session
          ? {
              id: session.id,
              name: session.name,
              slug: session.slug,
            }
          : null,
        track: {
          id: track?.id ?? null,
          track_name:
            track?.track_name ??
            payment.custom_track_name ??
            "Neznáma pesnička",
          artist:
            track?.artist ??
            payment.custom_artist_name ??
            "Neznámy interpret",
          image_url: track?.image_url ?? null,
        },
      };
    });

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error("TRANSACTIONS GET ERROR:", error);
    return NextResponse.json(
      { error: "Nepodarilo sa načítať transakcie." },
      { status: 500 }
    );
  }
}