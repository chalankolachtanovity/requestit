import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

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

    if (requestRow.payment_attempt_id) {
      const { data: attempt } = await supabase
        .from("payment_attempts")
        .select("id, payment_intent_id")
        .eq("id", requestRow.payment_attempt_id)
        .single();

      const paymentAttempt = attempt as PaymentAttemptRow | null;

      if (paymentAttempt?.payment_intent_id) {
        try {
          await stripe.paymentIntents.cancel(paymentAttempt.payment_intent_id);
        } catch (cancelError) {
          console.error("Cancel payment intent failed:", cancelError);
        }
      }

      await supabase
        .from("payment_attempts")
        .update({
          payment_status: "canceled",
          dj_decision: "rejected",
        })
        .eq("id", requestRow.payment_attempt_id);
    }

    await supabase
      .from("requests")
      .update({
        status: "rejected",
      })
      .eq("id", requestId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("REJECT ERROR:", error);
    return NextResponse.json(
      { error: "Could not reject the request." },
      { status: 500 }
    );
  }
}
