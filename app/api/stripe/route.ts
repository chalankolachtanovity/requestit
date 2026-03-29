import Stripe from "stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseRouteClient();

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const paymentAttemptId = session.metadata?.paymentAttemptId;
      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : null;

      if (!paymentAttemptId) {
        return NextResponse.json({ received: true });
      }

      const { data: attempt, error: attemptError } = await supabase
        .from("payment_attempts")
        .select("*")
        .eq("id", paymentAttemptId)
        .single();

      if (attemptError || !attempt) {
        console.error("Payment attempt not found:", attemptError);
        return NextResponse.json(
          { error: "Payment attempt not found" },
          { status: 404 }
        );
      }

      await supabase
        .from("payment_attempts")
        .update({
          checkout_session_id: session.id,
          payment_intent_id: paymentIntentId,
          payment_status: "authorized",
        })
        .eq("id", paymentAttemptId);

      const { data: existingRequest } = await supabase
        .from("requests")
        .select("id")
        .eq("payment_attempt_id", paymentAttemptId)
        .maybeSingle();

      if (!existingRequest) {
        const { error: insertRequestError } = await supabase
          .from("requests")
          .insert([
            {
              session_id: attempt.session_id,
              track_id: attempt.track_id,
              type: "paid",
              status: "pending",
              payment_attempt_id: paymentAttemptId,
            },
          ]);

        if (insertRequestError) {
          console.error("Failed to create paid request:", insertRequestError);
          return NextResponse.json(
            { error: insertRequestError.message },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}