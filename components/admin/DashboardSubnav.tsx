"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DashboardSubnav() {
  const pathname = usePathname();

  const items = [
    {
      label: "Sessions",
      href: "/dashboard",
    },
    {
      label: "Transactions",
      href: "/dashboard/transactions",
    },
  ];

  return (
    <div className="mb-8 flex flex-wrap gap-2">
      {items.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-white text-black"
                : "border border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}