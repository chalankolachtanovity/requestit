import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { stripe } from "@/lib/stripe";

type OwnedRequestRow = {
  id: string;
  payment_attempt_id: string | null;
  session_id: string;
  sessions: {
    user_id: string;
  } | null;
};

type PaymentAttemptRow = {
  id: string;
  payment_intent_id: string | null;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { requestId } = body as { requestId?: string };

    if (!requestId) {
      return NextResponse.json({ error: "Missing requestId." }, { status: 400 });
    }

    const supabase = await createSupabaseRouteClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { data: ownedRequest, error: requestError } = await supabase
      .from("requests")
      .select(
        `
          id,
          payment_attempt_id,
          session_id,
          sessions!inner (
            user_id
          )
        `
      )
      .eq("id", requestId)
      .single();

    const requestRow = ownedRequest as OwnedRequestRow | null;

    if (requestError || !requestRow) {
      return NextResponse.json({ error: "Request not found." }, { status: 404 });
    }

    if (requestRow.sessions?.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    if (!requestRow.payment_attempt_id) {
      return NextResponse.json(
        { error: "This request has no payment attempt." },
        { status: 400 }
      );
    }

    const { data: attempt, error: attemptError } = await supabase
      .from("payment_attempts")
      .select("id, payment_intent_id")
      .eq("id", requestRow.payment_attempt_id)
      .single();

    const paymentAttempt = attempt as PaymentAttemptRow | null;

    if (attemptError || !paymentAttempt) {
      return NextResponse.json(
        { error: "Payment attempt not found." },
        { status: 404 }
      );
    }

    if (!paymentAttempt.payment_intent_id) {
      return NextResponse.json(
        { error: "Missing payment_intent_id." },
        { status: 400 }
      );
    }

    const paymentIntent = await stripe.paymentIntents.capture(
      paymentAttempt.payment_intent_id,
      {
        expand: ["latest_charge.balance_transaction"],
      }
    );

    await supabase
      .from("payment_attempts")
      .update({
        payment_status: "captured",
        dj_decision: "accepted",
      })
      .eq("id", paymentAttempt.id);

    await supabase
      .from("requests")
      .update({
        status: "accepted",
      })
      .eq("id", requestId);

    return NextResponse.json({
      success: true,
      paymentIntentStatus: paymentIntent.status,
    });
  } catch (error) {
    console.error("CAPTURE ERROR:", error);

    return NextResponse.json(
      { error: "Could not capture the payment." },
      { status: 500 }
    );
  }
}
