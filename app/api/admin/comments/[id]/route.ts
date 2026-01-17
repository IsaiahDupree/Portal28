import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// Admin delete comment
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const commentId = params.id;

  // Check if user is admin
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userError || userData?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
  }

  // Delete the comment (RLS policy allows admin to delete any comment)
  const { error } = await supabase
    .from("lesson_comments")
    .delete()
    .eq("id", commentId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
