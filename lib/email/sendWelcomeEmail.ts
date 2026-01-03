import { resend, RESEND_FROM } from "./resend";
import { WelcomeEmail } from "@/components/emails/WelcomeEmail";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function sendWelcomeEmail(args: {
  to: string;
  firstName?: string;
}) {
  const subject = "Welcome to Portal28 Academy";

  const { data, error } = await resend.emails.send({
    from: RESEND_FROM,
    to: [args.to],
    subject,
    react: WelcomeEmail({
      firstName: args.firstName
    })
  });

  // Log the send attempt
  await supabaseAdmin.from("email_sends").insert({
    email: args.to,
    template: "welcome",
    resend_email_id: data?.id ?? null,
    subject,
    status: error ? "failed" : "sent",
    error_message: error ? JSON.stringify(error) : null
  });

  if (error) throw new Error(JSON.stringify(error));
  return data;
}
