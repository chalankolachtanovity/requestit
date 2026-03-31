import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { paymentAttemptId } = body;

    if (!paymentAttemptId) {
      return NextResponse.json(
        { error: "Chýba paymentAttemptId." },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseRouteClient();

    const { data: attempt, error: attemptError } = await supabase
      .from("payment_attempts")
      .select("session_id")
      .eq("id", paymentAttemptId)
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json(
        { error: "Payment attempt neexistuje." },
        { status: 404 }
      );
    }

    const { data: dbSession, error: dbSessionError } = await supabase
      .from("sessions")
      .select("slug")
      .eq("id", attempt.session_id)
      .single();

    if (dbSessionError || !dbSession) {
      return NextResponse.json(
        { error: "Session v databáze neexistuje." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      slug: dbSession.slug,
    });
  } catch (error) {
    console.error("PAYMENT ATTEMPT SESSION ERROR:", error);

    return NextResponse.json(
      { error: "Nepodarilo sa načítať session." },
      { status: 500 }
    );
  }
}