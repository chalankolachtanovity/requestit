import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

type SessionRow = {
  id: string;
  name: string | null;
  slug: string;
  is_active: boolean;
  min_priority_amount_cents: number;
  allow_free_requests: boolean;
  allow_paid_requests: boolean;
  starts_at: string | null;
  created_at: string;
  earned_cents: number;
  requests_count: number;
};

type PaymentAttemptRow = {
  session_id: string;
  amount_cents: number | null;
};

type RequestRow = {
  session_id: string;
};

function createShortSlug(length = 6) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

  for (let i = 0; i < length; i += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

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

    const { data, error } = await supabase
      .from("sessions")
      .select(
        "id, name, slug, is_active, min_priority_amount_cents, allow_free_requests, allow_paid_requests, starts_at, created_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const sessions = (data ?? []) as Omit<
      SessionRow,
      "earned_cents" | "requests_count"
    >[];
    const sessionIds = sessions.map((s) => s.id);

    let earnedMap = new Map<string, number>();
    let requestsCountMap = new Map<string, number>();

    if (sessionIds.length > 0) {
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payment_attempts")
        .select("session_id, amount_cents")
        .in("session_id", sessionIds)
        .eq("payment_status", "captured")
        .eq("dj_decision", "accepted");

      if (paymentsError) {
        return NextResponse.json(
          { error: paymentsError.message },
          { status: 500 }
        );
      }

      const payments = (paymentsData ?? []) as PaymentAttemptRow[];

      earnedMap = payments.reduce((map, payment) => {
        const current = map.get(payment.session_id) ?? 0;
        map.set(payment.session_id, current + (payment.amount_cents ?? 0));
        return map;
      }, new Map<string, number>());

      const { data: requestsData, error: requestsError } = await supabase
        .from("requests")
        .select("session_id")
        .in("session_id", sessionIds);

      if (requestsError) {
        return NextResponse.json(
          { error: requestsError.message },
          { status: 500 }
        );
      }

      const requests = (requestsData ?? []) as RequestRow[];

      requestsCountMap = requests.reduce((map, request) => {
        const current = map.get(request.session_id) ?? 0;
        map.set(request.session_id, current + 1);
        return map;
      }, new Map<string, number>());
    }

    const sessionsWithData: SessionRow[] = sessions.map((session) => ({
      ...session,
      earned_cents: earnedMap.get(session.id) ?? 0,
      requests_count: requestsCountMap.get(session.id) ?? 0,
    }));

    return NextResponse.json({
      sessions: sessionsWithData,
    });
  } catch (error) {
    console.error("SESSIONS GET ERROR:", error);
    return NextResponse.json(
      { error: "Nepodarilo sa načítať sessions." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      minPriorityAmountCents,
      allowFreeRequests,
      allowPaidRequests,
      startsAt,
    } = body as {
      name?: string;
      minPriorityAmountCents?: number;
      allowFreeRequests?: boolean;
      allowPaidRequests?: boolean;
      startsAt?: string | null;
    };

    const sessionName = name?.trim() || "New Session";

    if (
      typeof minPriorityAmountCents !== "number" ||
      !Number.isInteger(minPriorityAmountCents) ||
      minPriorityAmountCents < 0
    ) {
      return NextResponse.json(
        { error: "Neplatná minimálna suma." },
        { status: 400 }
      );
    }

    if (
      typeof allowFreeRequests !== "boolean" ||
      typeof allowPaidRequests !== "boolean"
    ) {
      return NextResponse.json(
        { error: "Neplatné nastavenia requestov." },
        { status: 400 }
      );
    }

    if (startsAt && Number.isNaN(new Date(startsAt).getTime())) {
      return NextResponse.json(
        { error: "Neplatný dátum začiatku." },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseRouteClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    let sessionSlug = "";
    let attempts = 0;
    let slugExists = true;

    while (slugExists && attempts < 10) {
      sessionSlug = createShortSlug(6);

      const { data: existingSlug, error: slugCheckError } = await supabase
        .from("sessions")
        .select("id")
        .eq("slug", sessionSlug)
        .maybeSingle();

      if (slugCheckError) {
        return NextResponse.json(
          { error: slugCheckError.message },
          { status: 500 }
        );
      }

      slugExists = Boolean(existingSlug);
      attempts += 1;
    }

    if (!sessionSlug || slugExists) {
      return NextResponse.json(
        { error: "Nepodarilo sa vytvoriť unikátny slug." },
        { status: 500 }
      );
    }

    const { data, error } = await supabase
      .from("sessions")
      .insert([
        {
          user_id: user.id,
          name: sessionName,
          slug: sessionSlug,
          is_active: true,
          min_priority_amount_cents: minPriorityAmountCents,
          allow_free_requests: allowFreeRequests,
          allow_paid_requests: allowPaidRequests,
          starts_at: startsAt || null,
        },
      ])
      .select(
        "id, name, slug, is_active, min_priority_amount_cents, allow_free_requests, allow_paid_requests, starts_at, created_at"
      )
      .single();

    const sessionData = data as Omit<
      SessionRow,
      "earned_cents" | "requests_count"
    > | null;

    if (error || !sessionData) {
      return NextResponse.json(
        { error: error?.message || "Nepodarilo sa vytvoriť session." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      session: {
        ...sessionData,
        earned_cents: 0,
        requests_count: 0,
      },
    });
  } catch (error) {
    console.error("SESSIONS POST ERROR:", error);
    return NextResponse.json(
      { error: "Nepodarilo sa vytvoriť session." },
      { status: 500 }
    );
  }
}