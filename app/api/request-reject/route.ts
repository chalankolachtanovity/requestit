import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { requestId } = body;

    if (!requestId) {
      return NextResponse.json(
        { error: "Chýba requestId." },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseRouteClient();

    const { data: requestRow, error: requestError } = await supabase
      .from("requests")
      .select("id, payment_attempt_id")
      .eq("id", requestId)
      .single();

    if (requestError || !requestRow) {
      return NextResponse.json(
        { error: "Request neexistuje." },
        { status: 404 }
      );
    }

    if (requestRow.payment_attempt_id) {
      const { data: attempt } = await supabase
        .from("payment_attempts")
        .select("*")
        .eq("id", requestRow.payment_attempt_id)
        .single();

      if (attempt?.payment_intent_id) {
        try {
          await stripe.paymentIntents.cancel(attempt.payment_intent_id);
        } catch (err) {
          console.error("Cancel payment intent failed:", err);
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
      { error: "Nepodarilo sa zamietnuť request." },
      { status: 500 }
    );
  }
}