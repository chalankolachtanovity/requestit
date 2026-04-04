import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

type AllowedStatus = "pending" | "accepted" | "played" | "rejected";

type RequestRow = {
  id: string;
  session_id: string;
};

type SessionRow = {
  id: string;
  user_id: string;
};

const ALLOWED_STATUSES: AllowedStatus[] = [
  "pending",
  "accepted",
  "played",
  "rejected",
];

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    const {
      requestId,
      sessionId,
      trackId,
      customTrackName,
      customArtistName,
      status,
    } = body as {
      requestId?: string;
      sessionId?: string;
      trackId?: string | null;
      customTrackName?: string | null;
      customArtistName?: string | null;
      status?: AllowedStatus;
    };

    const trimmedCustomTrackName = customTrackName?.trim() || "";
    const trimmedCustomArtistName = customArtistName?.trim() || "";

    if (!status) {
      return NextResponse.json({ error: "Chýba status." }, { status: 400 });
    }

    if (!ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: "Neplatný status." },
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

    // ------------------------------------------------------------
    // CLASSIC FLOW: update one request by requestId
    // ------------------------------------------------------------
    if (requestId) {
      const { data: existingRequest, error: existingRequestError } =
        await supabase
          .from("requests")
          .select("id, session_id")
          .eq("id", requestId)
          .single();

      const requestData = existingRequest as RequestRow | null;

      if (existingRequestError || !requestData) {
        return NextResponse.json(
          { error: "Request neexistuje." },
          { status: 404 }
        );
      }

      const { data: sessionData, error: sessionError } = await supabase
        .from("sessions")
        .select("id, user_id")
        .eq("id", requestData.session_id)
        .single();

      const ownedSession = sessionData as SessionRow | null;

      if (sessionError || !ownedSession) {
        return NextResponse.json(
          { error: "Session neexistuje." },
          { status: 404 }
        );
      }

      if (ownedSession.user_id !== user.id) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
      }

      const { data: updatedRequest, error: updateError } = await supabase
        .from("requests")
        .update({ status })
        .eq("id", requestId)
        .select("id, session_id, status, track_id, created_at")
        .single();

      if (updateError || !updatedRequest) {
        console.error("REQUEST STATUS UPDATE ERROR:", updateError);
        return NextResponse.json(
          { error: updateError?.message || "Nepodarilo sa zmeniť status." },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        request: updatedRequest,
      });
    }

    // ------------------------------------------------------------
    // MOST REQUESTED FLOW: mark all accepted requests for a song
    // ------------------------------------------------------------
    const hasTrackMatch = !!trackId;
    const hasCustomMatch =
      trimmedCustomTrackName.length > 0 && trimmedCustomArtistName.length > 0;

    if (!sessionId || (!hasTrackMatch && !hasCustomMatch)) {
      return NextResponse.json(
        { error: "Chýbajú údaje pre aktualizáciu skladby." },
        { status: 400 }
      );
    }

    if (status !== "played") {
      return NextResponse.json(
        {
          error:
            "Hromadná aktualizácia pre most requested momentálne podporuje iba status played.",
        },
        { status: 400 }
      );
    }

    const { data: sessionData, error: sessionError } = await supabase
      .from("sessions")
      .select("id, user_id")
      .eq("id", sessionId)
      .single();

    const ownedSession = sessionData as SessionRow | null;

    if (sessionError || !ownedSession) {
      return NextResponse.json(
        { error: "Session neexistuje." },
        { status: 404 }
      );
    }

    if (ownedSession.user_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    let updateQuery = supabase
      .from("requests")
      .update({ status: "played" })
      .eq("session_id", sessionId)
      .eq("status", "accepted");

    if (trackId) {
      updateQuery = updateQuery.eq("track_id", trackId);
    } else {
      updateQuery = updateQuery
        .is("track_id", null)
        .eq("custom_track_name", trimmedCustomTrackName)
        .eq("custom_artist_name", trimmedCustomArtistName);
    }

    const { data: updatedRows, error: updateError } = await updateQuery.select(
      "id"
    );

    if (updateError) {
      console.error("MOST REQUESTED STATUS UPDATE ERROR:", updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    const updatedCount = updatedRows?.length ?? 0;

    if (updatedCount === 0) {
      return NextResponse.json(
        { error: "Pre túto skladbu sa nenašli žiadne accepted requesty." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      updatedCount,
    });
  } catch (error) {
    console.error("REQUEST STATUS ROUTE CRASH:", error);
    return NextResponse.json(
      { error: "Nepodarilo sa aktualizovať request." },
      { status: 500 }
    );
  }
}