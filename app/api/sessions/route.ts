import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { getSessionsData } from "@/lib/dashboard-data";

type SessionMode = "classic" | "most_requested";

type SessionRow = {
  id: string;
  name: string | null;
  slug: string;
  is_active: boolean;
  mode: SessionMode;
  min_priority_amount_cents: number;
  allow_free_requests: boolean;
  allow_paid_requests: boolean;
  starts_at: string | null;
  created_at: string;
  earned_cents: number;
  requests_count: number;
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

    return NextResponse.json({
      sessions: await getSessionsData(supabase),
    });
  } catch (error) {
    console.error("SESSIONS GET ERROR:", error);
    return NextResponse.json(
      { error: "Could not load sessions." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      mode,
      minPriorityAmountCents,
      allowFreeRequests,
      allowPaidRequests,
      startsAt,
    } = body as {
      name?: string;
      mode?: SessionMode;
      minPriorityAmountCents?: number;
      allowFreeRequests?: boolean;
      allowPaidRequests?: boolean;
      startsAt?: string | null;
    };

    const sessionName = name?.trim() || "New Session";
    const sessionMode: SessionMode =
      mode === "most_requested" ? "most_requested" : "classic";

    if (
      typeof minPriorityAmountCents !== "number" ||
      !Number.isInteger(minPriorityAmountCents) ||
      minPriorityAmountCents < 0
    ) {
      return NextResponse.json(
        { error: "Invalid minimum amount." },
        { status: 400 }
      );
    }

    if (
      typeof allowFreeRequests !== "boolean" ||
      typeof allowPaidRequests !== "boolean"
    ) {
      return NextResponse.json(
        { error: "Invalid request settings." },
        { status: 400 }
      );
    }

    if (startsAt && Number.isNaN(new Date(startsAt).getTime())) {
      return NextResponse.json(
        { error: "Invalid event start date." },
        { status: 400 }
      );
    }

    const finalAllowFreeRequests =
      sessionMode === "most_requested" ? true : allowFreeRequests;

    const finalAllowPaidRequests =
      sessionMode === "most_requested" ? false : allowPaidRequests;

    const finalMinPriorityAmountCents =
      sessionMode === "most_requested" ? 0 : minPriorityAmountCents;

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
        { error: "Could not generate a unique slug." },
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
          mode: sessionMode,
          min_priority_amount_cents: finalMinPriorityAmountCents,
          allow_free_requests: finalAllowFreeRequests,
          allow_paid_requests: finalAllowPaidRequests,
          starts_at: startsAt || null,
        },
      ])
      .select(
        "id, name, slug, is_active, mode, min_priority_amount_cents, allow_free_requests, allow_paid_requests, starts_at, created_at"
      )
      .single();

    const sessionData = data as Omit<
      SessionRow,
      "earned_cents" | "requests_count"
    > | null;

    if (error || !sessionData) {
      return NextResponse.json(
        { error: error?.message || "Could not create the session." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      session: {
        ...sessionData,
        mode: sessionData.mode ?? "classic",
        earned_cents: 0,
        requests_count: 0,
      },
    });
  } catch (error) {
    console.error("SESSIONS POST ERROR:", error);
    return NextResponse.json(
      { error: "Could not create the session." },
      { status: 500 }
    );
  }
}
