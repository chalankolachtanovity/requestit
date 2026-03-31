import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { stripe } from "@/lib/stripe";

type SessionRow = {
  id: string;
  slug: string;
  min_priority_amount_cents: number;
  allow_paid_requests: boolean;
  requests_paused: boolean;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      sessionId,
      trackId,
      amountCents,
      customTrackName,
      customArtistName,
    } = body as {
      sessionId?: string;
      trackId?: string | null;
      amountCents?: number;
      customTrackName?: string;
      customArtistName?: string;
    };

    const hasCustomSong =
      !!customTrackName?.trim() && !!customArtistName?.trim();

    if (!sessionId || !amountCents || (!trackId && !hasCustomSong)) {
      return NextResponse.json(
        { error: "Chýbajú povinné údaje." },
        { status: 400 }
      );
    }

    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      return NextResponse.json(
        { error: "Neplatná suma." },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseRouteClient();

    const { data, error: sessionError } = await supabase
      .from("sessions")
      .select("id, slug,min_priority_amount_cents, allow_paid_requests, requests_paused")
      .eq("id", sessionId)
      .single();

    const sessionRow = data as SessionRow | null;

    if (sessionError || !sessionRow) {
      return NextResponse.json(
        { error: "Session neexistuje." },
        { status: 404 }
      );
    }

    if (sessionRow.requests_paused) {
      return NextResponse.json(
        { error: "Requesty sú momentálne pozastavené." },
        { status: 400 }
      );
    }

    if (!sessionRow.allow_paid_requests) {
      return NextResponse.json(
        { error: "Paid requesty sú momentálne vypnuté." },
        { status: 400 }
      );
    }

    if (amountCents < sessionRow.min_priority_amount_cents) {
      return NextResponse.json(
        {
          error: `Minimálna priority suma je ${(sessionRow.min_priority_amount_cents / 100).toFixed(2)} €`,
        },
        { status: 400 }
      );
    }

    const { data: paymentAttempt, error: paymentAttemptError } = await supabase
      .from("payment_attempts")
      .insert([
        {
          session_id: sessionId,
          track_id: trackId ?? null,
          amount_cents: amountCents,
          payment_status: "pending",
          dj_decision: "pending",
          custom_track_name: hasCustomSong ? customTrackName!.trim() : null,
          custom_artist_name: hasCustomSong ? customArtistName!.trim() : null,
        },
      ])
      .select()
      .single();

    if (paymentAttemptError || !paymentAttempt) {
      return NextResponse.json(
        {
          error:
            paymentAttemptError?.message ||
            "Nepodarilo sa vytvoriť payment attempt.",
        },
        { status: 500 }
      );
    }

    const appUrl = "https://soundq.me";

    const songLabel = hasCustomSong
      ? `${customTrackName!.trim()} — ${customArtistName!.trim()}`
      : "Priority song request";

    console.log("STRIPE KEY PREFIX:", process.env.STRIPE_SECRET_KEY?.slice(0, 7));
    console.log("HARDCODED APP URL:", appUrl);

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      success_url: `${appUrl}/payment/success?paymentAttemptId=${paymentAttempt.id}&session_id={CHECKOUT_SESSION_ID}&returnTo=/${sessionRow.slug}`,
      cancel_url: `${appUrl}/payment/cancel?paymentAttemptId=${paymentAttempt.id}`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: amountCents,
            product_data: {
              name: songLabel,
              description: hasCustomSong
                ? "Vlastný request pesničky"
                : "Prednostný request pesničky",
            },
          },
        },
      ],
      payment_intent_data: {
        capture_method: "manual",
      },
      metadata: {
        paymentAttemptId: paymentAttempt.id,
        sessionId,
        trackId: trackId ?? "",
        amountCents: String(amountCents),
        customTrackName: customTrackName ?? "",
        customArtistName: customArtistName ?? "",
      },
    });

    const paymentIntentId =
      typeof checkoutSession.payment_intent === "string"
        ? checkoutSession.payment_intent
        : null;

    const { error: updateError } = await supabase
      .from("payment_attempts")
      .update({
        checkout_session_id: checkoutSession.id,
        payment_intent_id: paymentIntentId,
      })
      .eq("id", paymentAttempt.id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: checkoutSession.url,
      checkoutSessionId: checkoutSession.id,
    });
  } catch (error) {
    console.error("CREATE CHECKOUT SESSION ERROR:", error);

    return NextResponse.json(
      { error: "Nepodarilo sa vytvoriť platbu." },
      { status: 500 }
    );
  }
}