import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Decode token
    let tokenData;
    try {
      tokenData = JSON.parse(Buffer.from(token, "base64url").toString());
    } catch (err) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    const { email, userId, spaceId, type, timestamp } = tokenData;

    // Check token age (valid for 30 days)
    const tokenAge = Date.now() - timestamp;
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    if (tokenAge > thirtyDays) {
      return NextResponse.json({ error: "Token has expired" }, { status: 400 });
    }

    // Insert unsubscribe record
    const { error } = await supabaseAdmin.from("email_unsubscribes").insert({
      user_id: userId || null,
      email: email,
      unsubscribe_type: type,
      space_id: spaceId || null,
    });

    if (error) {
      // Check if already unsubscribed
      if (error.code === "23505") {
        return NextResponse.json({
          message: "You are already unsubscribed from this type of email",
        });
      }
      console.error("Error unsubscribing:", error);
      return NextResponse.json({ error: "Failed to unsubscribe" }, { status: 500 });
    }

    return NextResponse.json({
      message: "Successfully unsubscribed",
      type,
    });
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
