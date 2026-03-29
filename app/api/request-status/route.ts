import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { requestId, status } = body;

    if (!requestId || !status) {
      return NextResponse.json(
        { error: "Chýbajú povinné údaje." },
        { status: 400 }
      );
    }

    const allowedStatuses = ["pending", "accepted", "played", "rejected"];

    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Neplatný status." },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseRouteClient();

    const { data, error } = await supabase
      .from("requests")
      .update({ status })
      .eq("id", requestId)
      .select()
      .single();

    if (error) {
      console.error("REQUEST STATUS UPDATE ERROR:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, request: data });
  } catch (error) {
    console.error("REQUEST STATUS ROUTE CRASH:", error);
    return NextResponse.json(
      { error: "Nepodarilo sa aktualizovať request." },
      { status: 500 }
    );
  }
}