import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { z } from "zod";

const schema = z.object({ fileId: z.string().uuid() });

export async function GET(req: Request) {
  const sb = supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const parsed = schema.safeParse({ fileId: url.searchParams.get("fileId") });
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  // RLS: selecting lesson_files should be allowed only if can_access_course
  const { data: file, error } = await sb
    .from("lesson_files")
    .select("storage_bucket, storage_path, url")
    .eq("id", parsed.data.fileId)
    .single();

  if (error || !file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // If we have a direct URL, return it
  if (file.url) {
    return NextResponse.json({ url: file.url });
  }

  // Otherwise create a signed URL
  const { data: signed, error: signErr } = await sb.storage
    .from(file.storage_bucket)
    .createSignedUrl(file.storage_path, 60 * 15); // 15 minutes

  if (signErr) {
    return NextResponse.json({ error: signErr.message }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl });
}
