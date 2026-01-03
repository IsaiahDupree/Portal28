import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getPortal28SpaceId } from "@/lib/community/community";

export async function POST(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", auth.user.id)
    .single();

  if (user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { title, body, tags, isPinned, sendEmail } = await req.json();

  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "Title and body are required" }, { status: 400 });
  }

  const spaceId = await getPortal28SpaceId();

  const { data: announcement, error } = await supabase
    .from("announcements")
    .insert({
      space_id: spaceId,
      title: title.trim(),
      body: body.trim(),
      tags: tags ?? [],
      is_pinned: !!isPinned,
      is_published: true,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (sendEmail) {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/emails/announcement-blast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          announcementId: announcement.id,
          title: title.trim(),
          body: body.trim(),
        }),
      });
    } catch (e) {
      console.error("Failed to send announcement email:", e);
    }
  }

  return NextResponse.json({ ok: true, id: announcement.id });
}
