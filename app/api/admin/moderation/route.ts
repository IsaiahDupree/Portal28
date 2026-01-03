import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

async function checkAdmin(supabase: ReturnType<typeof supabaseServer>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return null;
  return user;
}

export async function POST(req: NextRequest) {
  const supabase = supabaseServer();
  const admin = await checkAdmin(supabase);

  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { action, type, id, contentType, contentId } = body;

  if (!action || !type || !id) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    switch (action) {
      case "hide":
        if (type === "thread") {
          await supabaseAdmin
            .from("forum_threads")
            .update({ is_hidden: true })
            .eq("id", id);
        } else if (type === "reply") {
          await supabaseAdmin
            .from("forum_replies")
            .update({ is_hidden: true })
            .eq("id", id);
        }
        break;

      case "show":
        if (type === "thread") {
          await supabaseAdmin
            .from("forum_threads")
            .update({ is_hidden: false })
            .eq("id", id);
        } else if (type === "reply") {
          await supabaseAdmin
            .from("forum_replies")
            .update({ is_hidden: false })
            .eq("id", id);
        }
        break;

      case "pin":
        if (type === "thread") {
          await supabaseAdmin
            .from("forum_threads")
            .update({ is_pinned: true })
            .eq("id", id);
        }
        break;

      case "unpin":
        if (type === "thread") {
          await supabaseAdmin
            .from("forum_threads")
            .update({ is_pinned: false })
            .eq("id", id);
        }
        break;

      case "lock":
        if (type === "thread") {
          await supabaseAdmin
            .from("forum_threads")
            .update({ is_locked: true })
            .eq("id", id);
        }
        break;

      case "unlock":
        if (type === "thread") {
          await supabaseAdmin
            .from("forum_threads")
            .update({ is_locked: false })
            .eq("id", id);
        }
        break;

      case "delete":
        if (type === "thread") {
          // Delete all replies first
          await supabaseAdmin
            .from("forum_replies")
            .delete()
            .eq("thread_id", id);
          // Then delete the thread
          await supabaseAdmin
            .from("forum_threads")
            .delete()
            .eq("id", id);
        } else if (type === "reply") {
          await supabaseAdmin
            .from("forum_replies")
            .delete()
            .eq("id", id);
        }
        break;

      case "dismiss_report":
        if (type === "report") {
          await supabaseAdmin
            .from("content_reports")
            .update({ status: "dismissed", resolved_at: new Date().toISOString(), resolved_by: admin.id })
            .eq("id", id);
        }
        break;

      case "hide_reported_content":
        if (type === "report" && contentType && contentId) {
          // Hide the reported content
          if (contentType === "thread") {
            await supabaseAdmin
              .from("forum_threads")
              .update({ is_hidden: true })
              .eq("id", contentId);
          } else if (contentType === "reply") {
            await supabaseAdmin
              .from("forum_replies")
              .update({ is_hidden: true })
              .eq("id", contentId);
          }
          // Mark report as resolved
          await supabaseAdmin
            .from("content_reports")
            .update({ status: "resolved", resolved_at: new Date().toISOString(), resolved_by: admin.id })
            .eq("id", id);
        }
        break;

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    // Log the moderation action
    await supabaseAdmin
      .from("admin_actions")
      .insert({
        admin_id: admin.id,
        action_type: `moderation_${action}`,
        target_type: type,
        target_id: id,
        metadata: { contentType, contentId },
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Moderation action error:", error);
    return NextResponse.json({ error: "Failed to perform action" }, { status: 500 });
  }
}
