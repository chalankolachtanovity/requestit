import { NextResponse } from "next/server";
import { enrichTrackImageById } from "@/lib/tracks/enrich-track-image";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { trackId } = body as { trackId?: string };

    if (!trackId) {
      return NextResponse.json(
        { error: "Missing trackId." },
        { status: 400 }
      );
    }

    const result = await enrichTrackImageById(trackId);

    return NextResponse.json({
      success: true,
      image_url: result.image_url,
      spotify_url: result.spotify_url,
      cached: result.cached,
    });
  } catch (error) {
    console.error("ENRICH IMAGE ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to enrich track image.",
      },
      { status: 500 }
    );
  }
}