"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { usePathname } from "next/navigation";

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
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/[0.08] hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      {items.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-white text-black"
                : "border border-white/10 bg-white/[0.04] text-white/82 hover:bg-white/[0.08] hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
