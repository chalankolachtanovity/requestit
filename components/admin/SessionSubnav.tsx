"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import DashboardTopRight from "@/components/admin/DashboardTopRight";

export default function SessionSubnav({
  sessionId,
}: {
  sessionId: string;
}) {
  const pathname = usePathname();

  const items = [
    {
      label: "Queue",
      href: `/dashboard/admin/session/${sessionId}`,
    },
    {
      label: "Settings",
      href: `/dashboard/admin/session/${sessionId}/settings`,
    },
  ];

  return (
    <div className="sticky top-0 z-50 mb-6 border-b border-white/10 bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-start justify-between gap-4 px-4 py-3">
        <div className="flex gap-2">
          {items.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-white text-black"
                    : "text-white/70 hover:bg-white/10"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <DashboardTopRight showBackToDashboard showCredits={false} />
      </div>
    </div>
  );
}