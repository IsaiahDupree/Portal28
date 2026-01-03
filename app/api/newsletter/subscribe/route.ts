import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resend, RESEND_AUDIENCE_ID } from "@/lib/email/resend";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendLeadWelcome } from "@/lib/email/sendLeadWelcome";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  source: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_content: z.string().optional(),
  utm_term: z.string().optional(),
  fbclid: z.string().optional()
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const {
    email,
    firstName,
    lastName,
    source = "site_form",
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
    fbclid
  } = parsed.data;

  const normalizedEmail = email.trim().toLowerCase();

  // Upsert into local DB
  const { error: dbError } = await supabaseAdmin.from("email_contacts").upsert(
    {
      email: normalizedEmail,
      first_name: firstName,
      last_name: lastName,
      source,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      fbclid
    },
    { onConflict: "email" }
  );

  if (dbError) {
    console.error("DB upsert error:", dbError);
  }

  // Create contact in Resend (for Broadcasts/Audiences)
  if (RESEND_AUDIENCE_ID) {
    try {
      const { data, error } = await resend.contacts.create({
        audienceId: RESEND_AUDIENCE_ID,
        email: normalizedEmail,
        firstName,
        lastName,
        unsubscribed: false
      });

      if (data?.id) {
        await supabaseAdmin
          .from("email_contacts")
          .update({ resend_contact_id: data.id })
          .eq("email", normalizedEmail);
      }

      if (error) {
        console.error("Resend contact create error:", error);
      }
    } catch (err) {
      console.error("Resend contact error:", err);
    }
  }

  // Send lead welcome email
  try {
    await sendLeadWelcome({
      to: normalizedEmail,
      firstName,
      nextUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/courses`
    });
  } catch (err) {
    console.error("Lead welcome email error:", err);
  }

  return NextResponse.json({ ok: true });
}
