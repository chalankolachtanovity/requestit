import { createSupabaseServerClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
};

type SessionMode = "classic" | "most_requested";

export type DashboardOverviewData = {
  account: {
    email: string | null;
    displayName: string | null;
  };
  creditsCents: number;
};

export type SessionItem = {
  id: string;
  name: string | null;
  slug: string;
  is_active: boolean;
  min_priority_amount_cents: number;
  allow_free_requests: boolean;
  allow_paid_requests: boolean;
  starts_at: string | null;
  created_at: string;
  earned_cents: number;
  requests_count: number;
  mode: SessionMode;
};

type DashboardTransactionsRpcRow = {
  id: string;
  amount_cents: number | string | null;
  created_at: string;
  session_id: string | null;
  session_name: string | null;
  session_slug: string | null;
  track_id: string | null;
  track_name: string | null;
  artist: string | null;
  image_url: string | null;
};

type TrackRow = {
  id: string;
  track_name: string;
  artist: string;
  image_url: string | null;
  spotify_url?: string | null;
};

export type TransactionItem = {
  id: string;
  amount_cents: number;
  created_at: string;
  session: {
    id: string;
    name: string | null;
    slug: string;
  } | null;
  track: {
    id: string | null;
    track_name: string;
    artist: string;
    image_url: string | null;
  } | null;
};

type RequestRow = {
  id: string;
  status: string;
  type: "free" | "paid";
  created_at: string;
  payment_attempt_id?: string | null;
  track_id?: string | null;
  custom_track_name?: string | null;
  custom_artist_name?: string | null;
  tracks?: {
    track_name?: string;
    artist?: string;
    image_url?: string | null;
    spotify_url?: string | null;
  } | null;
};

export type RequestItem = {
  id: string;
  status: string;
  type: "free" | "paid";
  created_at: string;
  amount_cents: number | null;
  custom_track_name: string | null;
  custom_artist_name: string | null;
  tracks: {
    track_name: string;
    artist: string;
    image_url?: string | null;
    spotify_url?: string | null;
  } | null;
};

export type ClassicRequestsData = {
  incomingPaidRequests: RequestItem[];
  incomingFreeRequests: RequestItem[];
  toBePlayedPaidRequests: RequestItem[];
  toBePlayedFreeRequests: RequestItem[];
};

export type MostRequestedItem = {
  track_id: string | null;
  custom_track_name: string | null;
  custom_artist_name: string | null;
  track_name: string;
  artist: string;
  image_url: string | null;
  spotify_url: string | null;
  request_count: number;
  last_requested_at: string;
};

type MostRequestedGroupedItem = MostRequestedItem & {
  custom_key: string | null;
};

export type SessionSettingsData = {
  id: string;
  min_priority_amount_cents: number;
  allow_free_requests: boolean;
  allow_paid_requests: boolean;
};

type DashboardSessionsRpcRow = {
  id: string;
  name: string | null;
  slug: string;
  is_active: boolean;
  mode: string | null;
  min_priority_amount_cents: number;
  allow_free_requests: boolean;
  allow_paid_requests: boolean;
  starts_at: string | null;
  created_at: string;
  earned_cents: number | string | null;
  requests_count: number | string | null;
};

function getCustomGroupKey(trackName: string, artist: string) {
  return `${trackName.trim().toLowerCase()}::${artist.trim().toLowerCase()}`;
}

export async function getDashboardOverview(
  supabase: SupabaseClient,
  userId: string,
  fallbackEmail: string | null
): Promise<DashboardOverviewData> {
  const [profileResult, creditsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, display_name")
      .eq("id", userId)
      .maybeSingle(),
    supabase.rpc("get_dashboard_credits_total"),
  ]);

  if (creditsResult.error) {
    throw creditsResult.error;
  }

  const profile = (profileResult.data ?? null) as ProfileRow | null;
  const creditsCents = Number(creditsResult.data ?? 0);

  return {
    account: {
      email: profile?.email ?? fallbackEmail,
      displayName: profile?.display_name ?? null,
    },
    creditsCents,
  };
}

export async function getSessionsData(
  supabase: SupabaseClient
): Promise<SessionItem[]> {
  const { data, error } = await supabase.rpc("get_dashboard_sessions");

  if (error) {
    throw error;
  }

  const sessions = (data ?? []) as DashboardSessionsRpcRow[];

  return sessions.map((session) => ({
    id: session.id,
    name: session.name,
    slug: session.slug,
    is_active: session.is_active,
    mode: session.mode === "most_requested" ? "most_requested" : "classic",
    min_priority_amount_cents: session.min_priority_amount_cents,
    allow_free_requests: session.allow_free_requests,
    allow_paid_requests: session.allow_paid_requests,
    starts_at: session.starts_at,
    created_at: session.created_at,
    earned_cents: Number(session.earned_cents ?? 0),
    requests_count: Number(session.requests_count ?? 0),
  }));
}

export async function getTransactionsData(
  supabase: SupabaseClient
): Promise<TransactionItem[]> {
  const { data, error } = await supabase.rpc("get_dashboard_transactions");

  if (error) {
    throw error;
  }

  const transactions = (data ?? []) as DashboardTransactionsRpcRow[];

  return transactions.map((item) => ({
    id: item.id,
    amount_cents: Number(item.amount_cents ?? 0),
    created_at: item.created_at,
    session: item.session_id
      ? {
          id: item.session_id,
          name: item.session_name,
          slug: item.session_slug ?? "",
        }
      : null,
    track: {
      id: item.track_id,
      track_name: item.track_name ?? "Neznama pesnicka",
      artist: item.artist ?? "Neznamy interpret",
      image_url: item.image_url ?? null,
    },
  }));
}

export async function getClassicRequestsData(
  supabase: SupabaseClient,
  sessionId: string
): Promise<ClassicRequestsData> {
  const { data, error } = await supabase
    .from("requests")
    .select(
      `
        id,
        status,
        type,
        created_at,
        payment_attempt_id,
        custom_track_name,
        custom_artist_name,
        tracks (
          track_name,
          artist,
          image_url,
          spotify_url
        )
      `
    )
    .eq("session_id", sessionId)
    .in("status", ["pending", "accepted"])
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const requests = (data ?? []) as RequestRow[];
  const paymentAttemptIds = requests
    .map((request) => request.payment_attempt_id)
    .filter((id): id is string => Boolean(id));

  let amountMap = new Map<string, number>();

  if (paymentAttemptIds.length > 0) {
    const { data: paymentAttempts, error: paymentError } = await supabase
      .from("payment_attempts")
      .select("id, amount_cents")
      .in("id", paymentAttemptIds);

    if (paymentError) {
      throw paymentError;
    }

    amountMap = new Map(
      (paymentAttempts ?? []).map((item) => [item.id, item.amount_cents ?? 0])
    );
  }

  const mapped: RequestItem[] = requests.map((request) => ({
    id: request.id,
    status: request.status,
    type: request.type,
    created_at: request.created_at,
    amount_cents: request.payment_attempt_id
      ? amountMap.get(request.payment_attempt_id) ?? null
      : null,
    custom_track_name: request.custom_track_name ?? null,
    custom_artist_name: request.custom_artist_name ?? null,
    tracks: request.tracks
      ? {
          track_name: request.tracks.track_name ?? "",
          artist: request.tracks.artist ?? "",
          image_url: request.tracks.image_url ?? null,
          spotify_url: request.tracks.spotify_url ?? null,
        }
      : null,
  }));

  const incomingPaidRequests: RequestItem[] = [];
  const incomingFreeRequests: RequestItem[] = [];
  const toBePlayedPaidRequests: RequestItem[] = [];
  const toBePlayedFreeRequests: RequestItem[] = [];

  for (const request of mapped) {
    if (request.status === "pending") {
      if (request.type === "paid") {
        incomingPaidRequests.push(request);
      } else {
        incomingFreeRequests.push(request);
      }
      continue;
    }

    if (request.type === "paid") {
      toBePlayedPaidRequests.push(request);
    } else {
      toBePlayedFreeRequests.push(request);
    }
  }

  return {
    incomingPaidRequests,
    incomingFreeRequests,
    toBePlayedPaidRequests,
    toBePlayedFreeRequests,
  };
}

export async function getMostRequestedData(
  supabase: SupabaseClient,
  sessionId: string
): Promise<MostRequestedItem[]> {
  const { data: requestsData, error: requestsError } = await supabase
    .from("requests")
    .select("id, created_at, track_id, custom_track_name, custom_artist_name")
    .eq("session_id", sessionId)
    .eq("status", "accepted")
    .order("created_at", { ascending: false });

  if (requestsError) {
    throw requestsError;
  }

  const acceptedRequests = (requestsData ?? []) as Array<
    Pick<
      RequestRow,
      "id" | "created_at" | "track_id" | "custom_track_name" | "custom_artist_name"
    >
  >;

  const trackIds = Array.from(
    new Set(
      acceptedRequests.map((request) => request.track_id).filter((id): id is string => Boolean(id))
    )
  );

  let tracksMap = new Map<string, TrackRow>();

  if (trackIds.length > 0) {
    const { data: tracksData, error: tracksError } = await supabase
      .from("tracks")
      .select("id, track_name, artist, image_url, spotify_url")
      .in("id", trackIds);

    if (tracksError) {
      throw tracksError;
    }

    tracksMap = new Map(
      ((tracksData ?? []) as TrackRow[]).map((track) => [track.id, track])
    );
  }

  const groupedMap = new Map<string, MostRequestedGroupedItem>();

  for (const request of acceptedRequests) {
    const track = request.track_id ? tracksMap.get(request.track_id) ?? null : null;
    const trackName = track?.track_name ?? request.custom_track_name ?? "Neznama pesnicka";
    const artist = track?.artist ?? request.custom_artist_name ?? "Neznamy interpret";
    const imageUrl = track?.image_url ?? null;
    const spotifyUrl = track?.spotify_url ?? null;
    const normalizedCustomTrackName = request.custom_track_name?.trim() || null;
    const normalizedCustomArtistName = request.custom_artist_name?.trim() || null;
    const customKey = request.track_id ? null : getCustomGroupKey(trackName, artist);
    const groupKey = request.track_id ? `track:${request.track_id}` : `custom:${customKey}`;
    const existing = groupedMap.get(groupKey);

    if (!existing) {
      groupedMap.set(groupKey, {
        track_id: request.track_id ?? null,
        custom_key: customKey,
        custom_track_name: normalizedCustomTrackName,
        custom_artist_name: normalizedCustomArtistName,
        track_name: trackName,
        artist,
        image_url: imageUrl,
        spotify_url: spotifyUrl,
        request_count: 1,
        last_requested_at: request.created_at,
      });
      continue;
    }

    existing.request_count += 1;
  }

  return Array.from(groupedMap.values())
    .sort((a, b) => {
      if (b.request_count !== a.request_count) {
        return b.request_count - a.request_count;
      }

      return (
        new Date(b.last_requested_at).getTime() -
        new Date(a.last_requested_at).getTime()
      );
    })
    .slice(0, 10)
    .map((item) => ({
      track_id: item.track_id,
      custom_track_name: item.custom_track_name,
      custom_artist_name: item.custom_artist_name,
      track_name: item.track_name,
      artist: item.artist,
      image_url: item.image_url,
      spotify_url: item.spotify_url,
      request_count: item.request_count,
      last_requested_at: item.last_requested_at,
    }));
}
