import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
};

type PaymentAttemptRow = {
  amount_cents: number | null;
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

    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, email, display_name")
      .eq("id", user.id)
      .maybeSingle();

    const profile = profileData as ProfileRow | null;

    const { data: sessionsData, error: sessionsError } = await supabase
      .from("sessions")
      .select("id")
      .eq("user_id", user.id);

    if (sessionsError) {
      return NextResponse.json({ error: sessionsError.message }, { status: 500 });
    }

    const sessionIds = (sessionsData ?? []).map((s) => s.id);

    let totalCreditsCents = 0;

    if (sessionIds.length > 0) {
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payment_attempts")
        .select("amount_cents")
        .in("session_id", sessionIds)
        .eq("payment_status", "captured")
        .eq("dj_decision", "accepted");

      if (paymentsError) {
        return NextResponse.json({ error: paymentsError.message }, { status: 500 });
      }

      const payments = (paymentsData ?? []) as PaymentAttemptRow[];

      totalCreditsCents = payments.reduce((sum, item) => {
        return sum + (item.amount_cents ?? 0);
      }, 0);
    }

    return NextResponse.json({
      account: {
        email: profile?.email ?? user.email ?? null,
        displayName: profile?.display_name ?? null,
      },
      creditsCents: totalCreditsCents,
    });
  } catch (error) {
    console.error("DASHBOARD OVERVIEW ERROR:", error);
    return NextResponse.json(
      { error: "Nepodarilo sa načítať dashboard overview." },
      { status: 500 }
    );
  }
}
