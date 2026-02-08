import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { TrackingProvider } from "@/components/tracking/TrackingProvider";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <TrackingProvider>
      <DashboardLayout
        variant="app"
        user={{
          email: user.email,
          name: user.user_metadata?.full_name || user.email?.split("@")[0],
        }}
      >
        {children}
      </DashboardLayout>
    </TrackingProvider>
  );
}
