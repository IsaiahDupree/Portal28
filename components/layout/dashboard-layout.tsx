"use client";

import * as React from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
  variant: "admin" | "app" | "public";
  user?: {
    email?: string;
    name?: string;
    avatarUrl?: string;
  };
}

export function DashboardLayout({ children, variant, user }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar variant={variant} />
      </div>

      {/* Main content area */}
      <div className="md:pl-64 transition-all duration-300">
        <Header variant={variant} user={user} />
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
