import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import AnnouncementForm from "@/components/admin/AnnouncementForm";

export default async function NewAnnouncementPage() {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) redirect("/login?next=/admin/community/announcements/new");

  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", auth.user.id)
    .single();

  if (user?.role !== "admin") redirect("/app");

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Post Announcement</h1>
      <AnnouncementForm />
    </main>
  );
}
