import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";


type SessionSettingsRow = {
  id: string;
  min_priority_amount_cents: number;
  allow_free_requests: boolean;
  allow_paid_requests: boolean;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing sessionId." },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseRouteClient();

    const { data, error } = await supabase
      .from("sessions")
      .select(
        "id, min_priority_amount_cents, allow_free_requests, allow_paid_requests"
      )
      .eq("id", sessionId)
      .single<SessionSettingsRow>();

    if (error || !data) {
      return NextResponse.json(
        { error: "Session not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
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
      return NextResponse.json(
        { error: "Missing sessionId." },
        { status: 400 }
      );
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

    const { data, error } = await supabase
      .from("sessions")
      .update({
        min_priority_amount_cents: minPriorityAmountCents,
        allow_free_requests: allowFreeRequests,
        allow_paid_requests: allowPaidRequests,
      })
      .eq("id", sessionId)
      .select(
        "id, min_priority_amount_cents, allow_free_requests, allow_paid_requests"
      )
      .single<SessionSettingsRow>();

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