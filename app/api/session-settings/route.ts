import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

type SessionSettingsRow = {
  id: string;
  user_id: string;
  min_priority_amount_cents: number;
  allow_free_requests: boolean;
  allow_paid_requests: boolean;
};

async function getOwnedSession(
  sessionId: string,
  userId: string
): Promise<SessionSettingsRow | null> {
  const supabase = await createSupabaseRouteClient();

  const { data, error } = await supabase
    .from("sessions")
    .select(
      "id, user_id, min_priority_amount_cents, allow_free_requests, allow_paid_requests"
    )
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle<SessionSettingsRow>();

  if (error) {
    throw error;
  }

  return data ?? null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId." }, { status: 400 });
    }

    const supabase = await createSupabaseRouteClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const session = await getOwnedSession(sessionId, user.id);

    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    return NextResponse.json({
      id: session.id,
      min_priority_amount_cents: session.min_priority_amount_cents,
      allow_free_requests: session.allow_free_requests,
      allow_paid_requests: session.allow_paid_requests,
    });
  } catch (error) {
    console.error("SESSION SETTINGS GET ERROR:", error);
    return NextResponse.json(
      { error: "Failed to load session settings." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    const {
      sessionId,
      minPriorityAmountCents,
      allowFreeRequests,
      allowPaidRequests,
    } = body as {
      sessionId?: string;
      minPriorityAmountCents?: number;
      allowFreeRequests?: boolean;
      allowPaidRequests?: boolean;
    };

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId." }, { status: 400 });
    }

    if (
      typeof minPriorityAmountCents !== "number" ||
      !Number.isInteger(minPriorityAmountCents) ||
      minPriorityAmountCents < 0
    ) {
      return NextResponse.json(
        { error: "Invalid minPriorityAmountCents." },
        { status: 400 }
      );
    }

    if (
      typeof allowFreeRequests !== "boolean" ||
      typeof allowPaidRequests !== "boolean"
    ) {
      return NextResponse.json(
        { error: "Invalid request toggles." },
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

    const session = await getOwnedSession(sessionId, user.id);

    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("sessions")
      .update({
        min_priority_amount_cents: minPriorityAmountCents,
        allow_free_requests: allowFreeRequests,
        allow_paid_requests: allowPaidRequests,
      })
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .select(
        "id, min_priority_amount_cents, allow_free_requests, allow_paid_requests"
      )
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Update failed." },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("SESSION SETTINGS PATCH ERROR:", error);
    return NextResponse.json(
      { error: "Failed to update session settings." },
      { status: 500 }
    );
  }
}
