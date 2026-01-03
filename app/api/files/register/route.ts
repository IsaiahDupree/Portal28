import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const bodySchema = z.object({
  lessonId: z.string().uuid(),
  path: z.string().min(1),
  filename: z.string().min(1),
  fileKind: z.enum(["pdf", "attachment", "document", "image"]),
  mime: z.string().optional(),
  sizeBytes: z.number().optional(),
});

export async function POST(req: Request) {
  const sb = supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Get public URL for the file
  const { data: urlData } = await sb.storage
    .from("course-assets")
    .getPublicUrl(parsed.data.path);

  const { data: file, error } = await sb.from("lesson_files").insert({
    lesson_id: parsed.data.lessonId,
    file_kind: parsed.data.fileKind,
    storage_bucket: "course-assets",
    storage_path: parsed.data.path,
    filename: parsed.data.filename,
    mime: parsed.data.mime,
    size_bytes: parsed.data.sizeBytes,
    url: urlData?.publicUrl,
  }).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ file });
}
