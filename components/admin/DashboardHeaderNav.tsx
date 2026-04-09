"use client";

import { usePathname } from "next/navigation";
import DashboardSubnav from "@/components/admin/DashboardSubnav";
import SessionSubnav from "@/components/admin/SessionSubnav";

function getSessionIdFromPathname(pathname: string) {
  const match = pathname.match(/^\/dashboard\/admin\/session\/([^/]+)/);
  return match?.[1] ?? null;
}

export default function DashboardHeaderNav() {
  const pathname = usePathname();
  const sessionId = getSessionIdFromPathname(pathname);

  return sessionId ? <SessionSubnav sessionId={sessionId} /> : <DashboardSubnav />;
}
