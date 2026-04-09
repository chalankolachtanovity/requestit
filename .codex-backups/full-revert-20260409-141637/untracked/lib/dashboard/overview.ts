import type { SupabaseClient } from "@supabase/supabase-js";

type ProfileRow = {
  email: string | null;
  display_name: string | null;
};

type SessionRow = {
  id: string;
  name: string | null;
  is_active: boolean;
  created_at: string;
};

type PaymentAttemptRow = {
  session_id: string;
  amount_cents: number | null;
  created_at: string;
};

type RequestRow = {
  session_id: string;
  status: string;
};

export type DashboardOverview = {
  account: {
    email: string | null;
    displayName: string | null;
  };
  totals: {
    creditsCents: number;
    todayRevenueCents: number;
    activeSessions: number;
    totalSessions: number;
    totalRequests: number;
    pendingRequests: number;
    capturedPayments: number;
  };
  spotlight: {
    topSessionId: string | null;
    topSessionName: string | null;
    topSessionRevenueCents: number;
    newestSessionId: string | null;
    newestSessionName: string | null;
  };
};

export async function getDashboardOverview(
  supabase: SupabaseClient,
  userId: string,
  fallbackEmail: string | null
): Promise<DashboardOverview> {
  const [{ data: profileData }, { data: sessionsData, error: sessionsError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("email, display_name")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("sessions")
        .select("id, name, is_active, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);

  if (sessionsError) {
    throw new Error(sessionsError.message);
  }

  const profile = (profileData as ProfileRow | null) ?? null;
  const sessions = ((sessionsData ?? []) as SessionRow[]) ?? [];
  const sessionIds = sessions.map((session) => session.id);

  if (sessionIds.length === 0) {
    return {
      account: {
        email: profile?.email ?? fallbackEmail,
        displayName: profile?.display_name ?? null,
      },
      totals: {
        creditsCents: 0,
        todayRevenueCents: 0,
        activeSessions: 0,
        totalSessions: 0,
        totalRequests: 0,
        pendingRequests: 0,
        capturedPayments: 0,
      },
      spotlight: {
        topSessionId: null,
        topSessionName: null,
        topSessionRevenueCents: 0,
        newestSessionId: null,
        newestSessionName: null,
      },
    };
  }

  const [paymentsResult, requestsResult] = await Promise.all([
    supabase
      .from("payment_attempts")
      .select("session_id, amount_cents, created_at")
      .in("session_id", sessionIds)
      .eq("payment_status", "captured")
      .eq("dj_decision", "accepted"),
    supabase
      .from("requests")
      .select("session_id, status")
      .in("session_id", sessionIds),
  ]);

  if (paymentsResult.error) {
    throw new Error(paymentsResult.error.message);
  }

  if (requestsResult.error) {
    throw new Error(requestsResult.error.message);
  }

  const payments = (paymentsResult.data ?? []) as PaymentAttemptRow[];
  const requests = (requestsResult.data ?? []) as RequestRow[];

  const revenueBySession = new Map<string, number>();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  let creditsCents = 0;
  let todayRevenueCents = 0;

  for (const payment of payments) {
    const amount = payment.amount_cents ?? 0;
    creditsCents += amount;
    revenueBySession.set(
      payment.session_id,
      (revenueBySession.get(payment.session_id) ?? 0) + amount
    );

    if (new Date(payment.created_at) >= startOfToday) {
      todayRevenueCents += amount;
    }
  }

  const pendingRequests = requests.filter(
    (request) => request.status === "pending"
  ).length;

  const topSession =
    sessions
      .map((session) => ({
        id: session.id,
        name: session.name,
        revenueCents: revenueBySession.get(session.id) ?? 0,
      }))
      .sort((a, b) => b.revenueCents - a.revenueCents)[0] ?? null;

  const newestSession = sessions[0] ?? null;

  return {
    account: {
      email: profile?.email ?? fallbackEmail,
      displayName: profile?.display_name ?? null,
    },
    totals: {
      creditsCents,
      todayRevenueCents,
      activeSessions: sessions.filter((session) => session.is_active).length,
      totalSessions: sessions.length,
      totalRequests: requests.length,
      pendingRequests,
      capturedPayments: payments.length,
    },
    spotlight: {
      topSessionId: topSession?.id ?? null,
      topSessionName: topSession?.name ?? null,
      topSessionRevenueCents: topSession?.revenueCents ?? 0,
      newestSessionId: newestSession?.id ?? null,
      newestSessionName: newestSession?.name ?? null,
    },
  };
}
