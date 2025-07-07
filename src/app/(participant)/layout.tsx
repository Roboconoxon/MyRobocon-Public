
"use client";

import type { ReactNode } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export default function ParticipantLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={["participant"]}>
      <div className="relative flex min-h-screen w-full flex-col overflow-hidden">
        <SiteHeader />
        <main className="flex-1 overflow-y-auto">{children}</main>
        <SiteFooter />
      </div>
    </ProtectedRoute>
  );
}
