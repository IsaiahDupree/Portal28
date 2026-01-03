import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

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

  const { folderId, kind, title, url, body, storagePath, description } = await req.json();

  if (!folderId || !kind || !title?.trim()) {
    return NextResponse.json({ error: "Folder ID, kind, and title are required" }, { status: 400 });
  }

  if (!["link", "file", "note"].includes(kind)) {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  const { error } = await supabase.from("resource_items").insert({
    folder_id: folderId,
    kind,
    title: title.trim(),
    description: description ?? null,
    url: url ?? null,
    body: body ?? null,
    storage_path: storagePath ?? null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
