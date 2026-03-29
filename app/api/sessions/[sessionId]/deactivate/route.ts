import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

type RouteContext = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function PATCH(_request: Request, { params }: RouteContext) {
  try {
    const { sessionId } = await params;
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
      .select("id, user_id")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    if (session.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { error } = await supabase
      .from("sessions")
      .update({ is_active: false })
      .eq("id", sessionId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DEACTIVATE SESSION ERROR:", error);
    return NextResponse.json(
      { error: "Failed to deactivate session." },
      { status: 500 }
    );
  }
}