import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

type SessionRow = {
  id: string;
  min_priority_amount_cents: number;
};

type RequestRow = {
  id: string;
  status: string;
  type: "free" | "paid";
  payment_attempt_id: string | null;
  created_at: string;
};

type PaymentAttemptRow = {
  id: string;
  amount_cents: number | null;
};

function getBeatAmount(currentTop: number, minimum: number) {
  return Math.max(minimum, currentTop + 100);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing sessionId" },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseRouteClient();

    const { data: sessionRow, error: sessionError } = await supabase
      .from("sessions")
      .select("id, min_priority_amount_cents")
      .eq("id", sessionId)
      .single<SessionRow>();

    if (sessionError || !sessionRow) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const { data: requestsData, error: requestsError } = await supabase
      .from("requests")
      .select("id, status, type, payment_attempt_id, created_at")
      .eq("session_id", sessionId)
      .eq("type", "paid")
      .in("status", ["pending", "accepted"])
      .order("created_at", { ascending: false });

    if (requestsError) {
      return NextResponse.json(
        { error: requestsError.message },
        { status: 500 }
      );
    }

    const paidRequests = (requestsData ?? []) as RequestRow[];

    const paymentAttemptIds = Array.from(
      new Set(
        paidRequests
          .map((req) => req.payment_attempt_id)
          .filter((id): id is string => Boolean(id))
      )
    );

    let paymentAttemptsMap = new Map<string, PaymentAttemptRow>();

    if (paymentAttemptIds.length > 0) {
      const { data: paymentAttemptsData, error: paymentAttemptsError } =
        await supabase
          .from("payment_attempts")
          .select("id, amount_cents")
          .in("id", paymentAttemptIds);

      if (paymentAttemptsError) {
        return NextResponse.json(
          { error: paymentAttemptsError.message },
          { status: 500 }
        );
      }

      paymentAttemptsMap = new Map(
        ((paymentAttemptsData ?? []) as PaymentAttemptRow[]).map((attempt) => [
          attempt.id,
          attempt,
        ])
      );
    }

    const enrichedPaid = paidRequests.map((req) => {
      const attempt = req.payment_attempt_id
        ? paymentAttemptsMap.get(req.payment_attempt_id)
        : null;

      return {
        id: req.id,
        status: req.status,
        created_at: req.created_at,
        amount_cents: attempt?.amount_cents ?? 0,
      };
    });

    const sortedByAmount = [...enrichedPaid].sort(
      (a, b) => (b.amount_cents ?? 0) - (a.amount_cents ?? 0)
    );

    const currentTopAmountCents =
      sortedByAmount[0]?.amount_cents ?? sessionRow.min_priority_amount_cents;

    const beatCurrentAmountCents = getBeatAmount(
      currentTopAmountCents,
      sessionRow.min_priority_amount_cents
    );

    const recentPaidRequests = enrichedPaid
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 5)
      .map((item) => ({
        amount_cents: item.amount_cents,
        status: item.status,
      }));

    return NextResponse.json({
      minimumAmountCents: sessionRow.min_priority_amount_cents,
      currentTopAmountCents,
      beatCurrentAmountCents,
      recentPaidRequests,
    });
  } catch (error) {
    console.error("PRICING API ERROR:", error);
    return NextResponse.json(
      { error: "Failed to load pricing data." },
      { status: 500 }
    );
  }
}