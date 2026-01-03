"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLayout variant="public">
      {children}
    </DashboardLayout>
  );
}
