import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { getDashboardOverview } from "@/lib/dashboard-data";

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

    return NextResponse.json(
      await getDashboardOverview(supabase, user.id, user.email ?? null)
    );
  } catch (error) {
    console.error("DASHBOARD OVERVIEW ERROR:", error);
    return NextResponse.json(
      { error: "Nepodarilo sa načítať dashboard overview." },
      { status: 500 }
    );
  }
}
