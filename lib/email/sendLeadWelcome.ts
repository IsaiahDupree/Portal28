import { resend, RESEND_FROM } from "./resend";
import { LeadWelcomeEmail } from "@/components/emails/LeadWelcomeEmail";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function sendLeadWelcome(args: {
  to: string;
  firstName?: string;
  nextUrl: string;
}) {
  const subject = "You're in — quick next step";

  const { data, error } = await resend.emails.send({
    from: RESEND_FROM,
    to: [args.to],
    subject,
    react: LeadWelcomeEmail({
      firstName: args.firstName,
      nextUrl: args.nextUrl
    })
  });

  // Log the send attempt
  await supabaseAdmin.from("email_sends").insert({
    email: args.to,
    template: "lead_welcome",
    resend_email_id: data?.id ?? null,
    subject,
    metadata: { nextUrl: args.nextUrl },
    status: error ? "failed" : "sent",
    error_message: error ? JSON.stringify(error) : null
  });

  if (error) throw new Error(JSON.stringify(error));
  return data;
}
