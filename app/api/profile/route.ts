import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
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

    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, display_name")
      .eq("id", user.id)
      .maybeSingle();

    const profile = data as ProfileRow | null;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      profile: {
        id: user.id,
        email: profile?.email ?? user.email ?? null,
        displayName: profile?.display_name ?? null,
      },
    });
  } catch (error) {
    console.error("PROFILE GET ERROR:", error);
    return NextResponse.json(
      { error: "Nepodarilo sa načítať profil." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createSupabaseRouteClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const { displayName } = body as { displayName?: string };

    const cleanedName = displayName?.trim() ?? "";

    if (!cleanedName) {
      return NextResponse.json(
        { error: "Meno nemôže byť prázdne." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        email: user.email ?? null,
        display_name: cleanedName,
      })
      .select("id, email, display_name")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Nepodarilo sa uložiť profil." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: data.id,
        email: data.email,
        displayName: data.display_name,
      },
    });
  } catch (error) {
    console.error("PROFILE PATCH ERROR:", error);
    return NextResponse.json(
      { error: "Nepodarilo sa uložiť profil." },
      { status: 500 }
    );
  }
}