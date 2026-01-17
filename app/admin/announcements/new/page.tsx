import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getPortal28SpaceId } from "@/lib/community/community";
import { AnnouncementForm } from "../AnnouncementForm";
import { Button } from "@/components/ui/button";

export default async function NewAnnouncementPage() {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) redirect("/login?next=/admin/announcements/new");

  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", auth.user.id)
    .single();

  if (user?.role !== "admin") redirect("/app");

  const spaceId = await getPortal28SpaceId();

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">New Announcement</h1>
          <p className="text-muted-foreground mt-1">
            Create a new announcement for your community
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/announcements">Cancel</Link>
        </Button>
      </div>

      <AnnouncementForm spaceId={spaceId} />
    </main>
  );
}
