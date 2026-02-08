import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resend, RESEND_AUDIENCE_ID } from "@/lib/email/resend";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const { email } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  // Update local DB to mark as unsubscribed
  const { error: dbError } = await supabaseAdmin
    .from("email_contacts")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("email", normalizedEmail);

  if (dbError) {
    console.error("DB update error:", dbError);
  }

  // Remove from Resend audience
  if (RESEND_AUDIENCE_ID) {
    try {
      // Get the contact ID
      const { data: contact } = await supabaseAdmin
        .from("email_contacts")
        .select("resend_contact_id")
        .eq("email", normalizedEmail)
        .single();

      if (contact?.resend_contact_id) {
        // Remove from Resend
        await resend.contacts.remove({
          audienceId: RESEND_AUDIENCE_ID,
          id: contact.resend_contact_id,
        });
      }
    } catch (err) {
      console.error("Resend unsubscribe error:", err);
      // Don't fail the request if Resend fails
    }
  }

  return NextResponse.json({ ok: true, message: "Successfully unsubscribed" });
}
