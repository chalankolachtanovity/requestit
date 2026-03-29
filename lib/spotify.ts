type SpotifyTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

type SpotifyTrackResponse = {
  id: string;
  name: string;
  external_urls?: {
    spotify?: string;
  };
  album?: {
    images?: Array<{
      url: string;
      height: number | null;
      width: number | null;
    }>;
  };
};

type SpotifyTrackMetadata = {
  spotifyTrackId: string;
  spotifyUrl: string | null;
  imageUrl: string | null;
  name: string;
};

let cachedToken: string | null = null;
let cachedTokenExpiresAt = 0;

export async function getSpotifyAccessToken(): Promise<string> {
  const now = Date.now();

  if (cachedToken && now < cachedTokenExpiresAt) {
    return cachedToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing Spotify credentials.");
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Spotify token error: ${text}`);
  }

  const data = (await response.json()) as SpotifyTokenResponse;

  cachedToken = data.access_token;
  cachedTokenExpiresAt = now + (data.expires_in - 60) * 1000;

  return cachedToken;
}

export async function getSpotifyTrackMetadata(
  spotifyTrackId: string
): Promise<SpotifyTrackMetadata> {
  const accessToken = await getSpotifyAccessToken();

  const response = await fetch(
    `https://api.spotify.com/v1/tracks/${spotifyTrackId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Spotify track fetch error: ${text}`);
  }

  const data = (await response.json()) as SpotifyTrackResponse;

  return {
    spotifyTrackId: data.id,
    spotifyUrl: data.external_urls?.spotify ?? null,
    imageUrl: data.album?.images?.[0]?.url ?? null,
    name: data.name,
  };
}