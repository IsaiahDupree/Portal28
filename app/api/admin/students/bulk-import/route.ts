import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { z } from "zod";
import { parse } from "csv-parse/sync";

// CSV row schema
const studentRowSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  course_id: z.string().uuid(),
});

interface ImportResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{
    row: number;
    email: string;
    error: string;
  }>;
  created: Array<{
    email: string;
    course_title: string;
  }>;
}

/**
 * POST /api/admin/students/bulk-import
 * Bulk import students from CSV and create entitlements
 *
 * Expected CSV format:
 * email,name,course_id
 * student1@example.com,John Doe,uuid-here
 * student2@example.com,Jane Smith,uuid-here
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = supabaseServer();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin role
    const { data: metadata } = await supabase
      .from("user_metadata")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (metadata?.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Read CSV content
    const text = await file.text();
    let records: any[];

    try {
      records = parse(text, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid CSV format" },
        { status: 400 }
      );
    }

    const result: ImportResult = {
      total: records.length,
      successful: 0,
      failed: 0,
      errors: [],
      created: [],
    };

    // Process each row
    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNumber = i + 2; // +2 for header row and 0-index

      // Validate row
      const validationResult = studentRowSchema.safeParse(row);
      if (!validationResult.success) {
        result.failed++;
        result.errors.push({
          row: rowNumber,
          email: row.email || "unknown",
          error: validationResult.error.issues[0].message,
        });
        continue;
      }

      const { email, name, course_id } = validationResult.data;

      try {
        // Check if course exists
        const { data: course, error: courseError } = await supabase
          .from("courses")
          .select("id, title")
          .eq("id", course_id)
          .single();

        if (courseError || !course) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            email,
            error: `Course not found: ${course_id}`,
          });
          continue;
        }

        // Check if user exists by email
        const { data: existingUser } = await supabase
          .from("user_metadata")
          .select("user_id")
          .eq("email", email)
          .single();

        let userId: string;

        if (existingUser) {
          userId = existingUser.user_id;
        } else {
          // Create user account
          // Note: In production, you'd use Supabase Admin API to create auth users
          // For now, we'll create a pending enrollment that converts when they sign up

          // Create user_metadata entry (will link to auth.users when they sign up)
          const { data: newUser, error: createUserError } = await supabase
            .from("user_metadata")
            .insert({
              email,
              name,
              role: "student",
            })
            .select("user_id")
            .single();

          if (createUserError || !newUser) {
            result.failed++;
            result.errors.push({
              row: rowNumber,
              email,
              error: "Failed to create user record",
            });
            continue;
          }

          userId = newUser.user_id;
        }

        // Check if entitlement already exists
        const { data: existingEntitlement } = await supabase
          .from("entitlements")
          .select("id")
          .eq("user_id", userId)
          .eq("course_id", course_id)
          .single();

        if (existingEntitlement) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            email,
            error: "Entitlement already exists for this course",
          });
          continue;
        }

        // Create entitlement
        const { error: entitlementError } = await supabase
          .from("entitlements")
          .insert({
            user_id: userId,
            course_id: course_id,
            status: "active",
            granted_by: "bulk_import",
          });

        if (entitlementError) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            email,
            error: "Failed to create entitlement",
          });
          continue;
        }

        // Success!
        result.successful++;
        result.created.push({
          email,
          course_title: course.title,
        });
      } catch (error) {
        result.failed++;
        result.errors.push({
          row: rowNumber,
          email,
          error: "Unexpected error during import",
        });
      }
    }

    return NextResponse.json({
      message: `Import complete. ${result.successful} successful, ${result.failed} failed.`,
      result,
    });
  } catch (error) {
    console.error("Error in bulk import:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
