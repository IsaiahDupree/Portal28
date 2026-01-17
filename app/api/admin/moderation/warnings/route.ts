import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod";

const createWarningSchema = z.object({
  user_id: z.string().uuid(),
  warning_type: z.enum(["warning", "suspension", "ban"]),
  reason: z.string().min(1),
  details: z.string().optional(),
  duration_days: z.number().int().positive().optional(),
});

const resolveWarningSchema = z.object({
  warning_id: z.string().uuid(),
});

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

// GET - List all warnings or warnings for a specific user
export async function GET(req: NextRequest) {
  const supabase = supabaseServer();
  const admin = await checkAdmin(supabase);

  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("user_id");

  try {
    let query = supabaseAdmin
      .from("user_warnings")
      .select(`
        *,
        user:users!user_warnings_user_id_fkey(id, email, full_name),
        moderator:users!user_warnings_moderator_id_fkey(id, email, full_name)
      `)
      .order("created_at", { ascending: false });

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data: warnings, error } = await query;

    if (error) {
      console.error("Error fetching warnings:", error);
      return NextResponse.json({ error: "Failed to fetch warnings" }, { status: 500 });
    }

    return NextResponse.json({ warnings });
  } catch (error) {
    console.error("Error in GET /api/admin/moderation/warnings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create a new warning/suspension/ban
export async function POST(req: NextRequest) {
  const supabase = supabaseServer();
  const admin = await checkAdmin(supabase);

  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validatedData = createWarningSchema.parse(body);

    const { user_id, warning_type, reason, details, duration_days } = validatedData;

    // Calculate expiration for suspensions
    let expires_at: string | null = null;
    if (warning_type === "suspension" && duration_days) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + duration_days);
      expires_at = expirationDate.toISOString();
    }

    // Create the warning
    const { data: warning, error: warningError } = await supabaseAdmin
      .from("user_warnings")
      .insert({
        user_id,
        moderator_id: admin.id,
        warning_type,
        reason,
        details,
        duration_days,
        expires_at,
        is_active: true,
      })
      .select()
      .single();

    if (warningError) {
      console.error("Error creating warning:", warningError);
      return NextResponse.json({ error: "Failed to create warning" }, { status: 500 });
    }

    // Update community_members if suspension or ban
    if (warning_type === "suspension") {
      await supabaseAdmin
        .from("community_members")
        .update({
          is_suspended: true,
          suspended_until: expires_at,
        })
        .eq("user_id", user_id);
    } else if (warning_type === "ban") {
      await supabaseAdmin
        .from("community_members")
        .update({
          is_banned: true,
        })
        .eq("user_id", user_id);
    }

    // Log the action
    await supabaseAdmin
      .from("admin_actions")
      .insert({
        admin_id: admin.id,
        action_type: `moderation_${warning_type}`,
        target_type: "user",
        target_id: user_id,
        metadata: {
          warning_id: warning.id,
          reason,
          duration_days,
        },
      });

    return NextResponse.json({ warning }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request data", details: error.errors }, { status: 400 });
    }
    console.error("Error in POST /api/admin/moderation/warnings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH - Resolve a warning
export async function PATCH(req: NextRequest) {
  const supabase = supabaseServer();
  const admin = await checkAdmin(supabase);

  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { warning_id } = resolveWarningSchema.parse(body);

    // Get the warning first
    const { data: warning } = await supabaseAdmin
      .from("user_warnings")
      .select("*")
      .eq("id", warning_id)
      .single();

    if (!warning) {
      return NextResponse.json({ error: "Warning not found" }, { status: 404 });
    }

    // Mark as resolved
    const { error: updateError } = await supabaseAdmin
      .from("user_warnings")
      .update({
        is_active: false,
        resolved_at: new Date().toISOString(),
        resolved_by: admin.id,
      })
      .eq("id", warning_id);

    if (updateError) {
      console.error("Error resolving warning:", updateError);
      return NextResponse.json({ error: "Failed to resolve warning" }, { status: 500 });
    }

    // Update community_members if it was a suspension
    if (warning.warning_type === "suspension") {
      await supabaseAdmin
        .from("community_members")
        .update({
          is_suspended: false,
          suspended_until: null,
        })
        .eq("user_id", warning.user_id);
    }

    // Log the action
    await supabaseAdmin
      .from("admin_actions")
      .insert({
        admin_id: admin.id,
        action_type: "moderation_resolve_warning",
        target_type: "warning",
        target_id: warning_id,
        metadata: {
          user_id: warning.user_id,
        },
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request data", details: error.errors }, { status: 400 });
    }
    console.error("Error in PATCH /api/admin/moderation/warnings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
