import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

type RouteContext = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { paused } = body as { paused?: boolean };

    if (typeof paused !== "boolean") {
      return NextResponse.json(
        { error: "Invalid paused value." },
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

    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id, user_id, requests_paused")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    if (session.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("sessions")
      .update({
        requests_paused: paused,
      })
      .eq("id", sessionId)
      .select("id, requests_paused")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Failed to update session state." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      session: data,
    });
  } catch (error) {
    console.error("REQUESTS STATUS PATCH ERROR:", error);
    return NextResponse.json(
      { error: "Failed to update requests status." },
      { status: 500 }
    );
  }
}