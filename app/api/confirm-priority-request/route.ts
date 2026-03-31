import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { stripe } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { paymentAttemptId } = body;

    console.log("CONFIRM ROUTE paymentAttemptId:", paymentAttemptId);

    if (!paymentAttemptId) {
      return NextResponse.json(
        { error: "Chýba paymentAttemptId." },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseRouteClient();

    // 1. načítaj payment attempt
    const { data: attempt, error: attemptError } = await supabase
      .from("payment_attempts")
      .select("*")
      .eq("id", paymentAttemptId)
      .single();

    console.log("ATTEMPT:", attempt);
    console.log("ATTEMPT ERROR:", attemptError);

    if (attemptError || !attempt) {
      return NextResponse.json(
        { error: "Payment attempt neexistuje." },
        { status: 404 }
      );
    }

    // 2. načítaj session z databázy kvôli slug
    const { data: dbSession, error: dbSessionError } = await supabase
      .from("sessions")
      .select("slug")
      .eq("id", attempt.session_id)
      .single();

    console.log("DB SESSION:", dbSession);
    console.log("DB SESSION ERROR:", dbSessionError);

    if (dbSessionError || !dbSession) {
      return NextResponse.json(
        { error: "Session v databáze neexistuje." },
        { status: 404 }
      );
    }

    // 3. skontroluj či už request existuje
    const { data: existingRequest, error: existingRequestError } =
      await supabase
        .from("requests")
        .select("id")
        .eq("payment_attempt_id", paymentAttemptId)
        .maybeSingle();

    console.log("EXISTING REQUEST:", existingRequest);
    console.log("EXISTING REQUEST ERROR:", existingRequestError);

    if (existingRequestError) {
      return NextResponse.json(
        { error: existingRequestError.message },
        { status: 500 }
      );
    }

    if (existingRequest) {
      return NextResponse.json({
        success: true,
        alreadyExists: true,
        slug: dbSession.slug,
      });
    }

    // 4. MUSÍME mať checkout_session_id
    if (!attempt.checkout_session_id) {
      return NextResponse.json(
        { error: "Chýba checkout_session_id." },
        { status: 400 }
      );
    }

    // 5. získať session zo Stripe
    const stripeSession = await stripe.checkout.sessions.retrieve(
      attempt.checkout_session_id
    );

    console.log("STRIPE SESSION:", stripeSession.id);

    // 6. získať payment intent
    const paymentIntentId =
      typeof stripeSession.payment_intent === "string"
        ? stripeSession.payment_intent
        : null;

    console.log("PAYMENT INTENT ID:", paymentIntentId);

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: "Payment intent neexistuje." },
        { status: 400 }
      );
    }

    // 7. uložiť do payment_attempts
    const { error: updateAttemptError } = await supabase
      .from("payment_attempts")
      .update({
        payment_intent_id: paymentIntentId,
        payment_status: "authorized",
      })
      .eq("id", paymentAttemptId);

    console.log("UPDATE ATTEMPT ERROR:", updateAttemptError);

    if (updateAttemptError) {
      return NextResponse.json(
        { error: updateAttemptError.message },
        { status: 500 }
      );
    }

    // 8. vytvoriť paid request
    const { data: insertedRequest, error: insertRequestError } = await supabase
      .from("requests")
      .insert([
        {
          session_id: attempt.session_id,
          track_id: attempt.track_id,
          type: "paid",
          status: "pending",
          payment_attempt_id: paymentAttemptId,
          custom_track_name: attempt.custom_track_name ?? null,
          custom_artist_name: attempt.custom_artist_name ?? null,
        },
      ])
      .select()
      .single();

    if (!attempt.track_id && attempt.custom_track_name) {
      await supabase.from("custom_tracks").insert({
        artist: attempt.custom_artist_name || "Unknown",
        album: attempt.custom_track_name,
      });
    }

    console.log("INSERTED REQUEST:", insertedRequest);
    console.log("INSERT REQUEST ERROR:", insertRequestError);

    if (insertRequestError) {
      return NextResponse.json(
        { error: insertRequestError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      request: insertedRequest,
      slug: dbSession.slug,
    });
  } catch (error) {
    console.error("CONFIRM PRIORITY REQUEST ERROR:", error);

    return NextResponse.json(
      { error: "Nepodarilo sa potvrdiť priority request." },
      { status: 500 }
    );
  }
}