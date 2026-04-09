import Image from "next/image";
import { redirect } from "next/navigation";
import {
  CalendarRange,
  CircleDollarSign,
  Radio,
  WalletCards,
} from "lucide-react";
import DashboardSubnav from "@/components/admin/DashboardSubnav";
import DashboardTopRight from "@/components/admin/DashboardTopRight";
import { getDashboardOverview } from "@/lib/dashboard/overview";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const overview = await getDashboardOverview(
    supabase,
    user.id,
    user.email ?? null
  );

  const metrics = [
    {
      label: "Live events",
      value: overview.totals.activeSessions.toString(),
      detail: `${overview.totals.totalSessions} total`,
      icon: Radio,
    },
    {
      label: "Pending requests",
      value: overview.totals.pendingRequests.toString(),
      detail: `${overview.totals.totalRequests} total requests`,
      icon: CalendarRange,
    },
    {
      label: "Today",
      value: `${(overview.totals.todayRevenueCents / 100).toFixed(2)} EUR`,
      detail: "captured revenue",
      icon: CircleDollarSign,
    },
    {
      label: "All time",
      value: `${(overview.totals.creditsCents / 100).toFixed(2)} EUR`,
      detail: `${overview.totals.capturedPayments} paid requests`,
      icon: WalletCards,
    },
  ];

  return (
    <main className="min-h-screen bg-[#08090c] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.12),transparent_32%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_28%),linear-gradient(180deg,#08090c_0%,#090b10_100%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] px-5 py-5 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:px-6">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-2">
                    <Image
                      src="/logo.png"
                      alt="SoundQ"
                      width={36}
                      height={36}
                      className="h-9 w-9"
                      priority
                    />
                  </div>

                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">
                      SoundQ control room
                    </p>
                    <p className="mt-1 text-sm text-white/55">
                      Manage live requests, paid priority, and event flow in one place.
                    </p>
                  </div>
                </div>

                <h1 className="max-w-xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {overview.account.displayName || "DJ dashboard"}
                </h1>

                <p className="mt-3 max-w-xl text-sm leading-6 text-white/58 sm:text-base">
                  {overview.spotlight.topSessionName
                    ? `Top event right now: ${overview.spotlight.topSessionName}.`
                    : "Create your first event, share the guest link, and start collecting requests."}
                </p>
              </div>

              <DashboardTopRight
                account={overview.account}
                creditsCents={overview.totals.creditsCents}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => {
                const Icon = metric.icon;

                return (
                  <div
                    key={metric.label}
                    className="rounded-[26px] border border-white/10 bg-black/20 px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-white/38">
                          {metric.label}
                        </p>
                        <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
                          {metric.value}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-2.5 text-white/70">
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>

                    <p className="mt-3 text-sm text-white/45">{metric.detail}</p>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <DashboardSubnav />

              <p className="text-sm text-white/45">
                {overview.spotlight.newestSessionName
                  ? `Latest event: ${overview.spotlight.newestSessionName}`
                  : "No events yet"}
              </p>
            </div>
          </div>
        </header>

        <div className="flex-1 py-6">{children}</div>
      </div>
    </main>
  );
}
