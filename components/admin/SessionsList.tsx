"use client";

import { useEffect, useMemo, useState } from "react";
import CreateSessionForm from "./CreateSessionForm";
import SessionCard from "./SessionCard";

type SessionItem = {
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
  mode: "classic" | "most_requested";
};

type SessionsResponse = {
  sessions: SessionItem[];
};

function PastSessionCard({ session }: { session: SessionItem }) {
  const eventDate = session.starts_at
    ? new Date(session.starts_at)
    : new Date(session.created_at);

  const formattedDate = eventDate.toLocaleDateString("sk-SK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            {session.name || "Unnamed Event"}
          </p>

          <p className="mt-1 text-xs text-white/35">
            {formattedDate}
          </p>
        </div>

        <span className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-medium text-white/55">
          ENDED
        </span>
      </div>

      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-white/35">
            Earned
          </p>
          <p className="mt-1 text-lg font-bold text-green-300">
            {(session.earned_cents / 100).toFixed(2)} €
          </p>
        </div>

        <div className="text-right">
          <p className="text-[11px] uppercase tracking-[0.12em] text-white/35">
            Requests
          </p>
          <p className="mt-1 text-sm font-semibold text-white/75">
            {session.requests_count}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SessionsList() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [openCreate, setOpenCreate] = useState(false);

  const fetchSessions = async () => {
    const res = await fetch("/api/sessions");
    const data: SessionsResponse = await res.json();
    setSessions(data.sessions || []);
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const activeSessions = useMemo(
    () => sessions.filter((s) => s.is_active),
    [sessions]
  );

  const endedSessions = useMemo(
    () => sessions.filter((s) => !s.is_active),
    [sessions]
  );

  return (
    <div className="space-y-8">
      <CreateSessionForm
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onCreated={fetchSessions}
      />

      <section>
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-white/35">
              Events
            </p>
          </div>

          <button
            onClick={() => setOpenCreate(true)}
            className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black"
          >
            + Create Event
          </button>
        </div>

        {activeSessions.length === 0 && endedSessions.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-white/45">
            Zatiaľ nemáš žiadne events.
          </div>
        ) : (
          <div className="space-y-8">
            <div>
              <h3 className="mb-3 text-lg font-semibold text-white">
                Active
              </h3>
              {activeSessions.length === 0 ? (
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-white/40">
                  Žiadne aktívne events.
                </div>
              ) : (
                <div className="space-y-4">
                  {activeSessions.map((session) => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      onChange={fetchSessions}
                    />
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="mb-3 text-lg font-semibold text-white/75">
                Past
              </h3>
              {endedSessions.length === 0 ? (
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-white/40">
                  Žiadne ukončené events.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {endedSessions.map((session) => (
                    <PastSessionCard key={session.id} session={session} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}