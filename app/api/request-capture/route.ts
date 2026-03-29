import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { stripe } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { requestId } = body;

    console.log("CAPTURE ROUTE requestId:", requestId);

    if (!requestId) {
      return NextResponse.json(
        { error: "Chýba requestId." },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseRouteClient();

    const { data: req, error: reqError } = await supabase
      .from("requests")
      .select("*")
      .eq("id", requestId)
      .single();

    console.log("REQUEST ROW:", req);
    console.log("REQUEST ERROR:", reqError);

    if (reqError || !req) {
      return NextResponse.json(
        { error: "Request neexistuje." },
        { status: 404 }
      );
    }

    const { data: attempt, error: attemptError } = await supabase
      .from("payment_attempts")
      .select("*")
      .eq("id", req.payment_attempt_id)
      .single();

    console.log("PAYMENT ATTEMPT:", attempt);
    console.log("PAYMENT ATTEMPT ERROR:", attemptError);

    if (attemptError || !attempt) {
      return NextResponse.json(
        { error: "Payment attempt neexistuje." },
        { status: 404 }
      );
    }

    if (!attempt.payment_intent_id) {
      return NextResponse.json(
        { error: "Chýba payment_intent_id." },
        { status: 400 }
      );
    }

    const paymentIntent = await stripe.paymentIntents.capture(
      attempt.payment_intent_id,
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
      .eq("id", attempt.id);

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
      { error: "Nepodarilo sa capture payment." },
      { status: 500 }
    );
  }
}