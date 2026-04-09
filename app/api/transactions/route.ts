import { NextResponse } from "next/server";
import { getTransactionsData } from "@/lib/dashboard-data";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

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

    const transactions = await getTransactionsData(supabase);

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error("TRANSACTIONS GET ERROR:", error);
    return NextResponse.json(
      { error: "Nepodarilo sa nacitat transakcie." },
      { status: 500 }
    );
  }
}
