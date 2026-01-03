import { resend, RESEND_FROM } from "./resend";
import { CourseAccessEmail } from "@/components/emails/CourseAccessEmail";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function sendCourseAccessEmail(args: {
  to: string;
  firstName?: string;
  courseName: string;
  courseSlug: string;
}) {
  const accessUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/app/courses/${args.courseSlug}`;
  const subject = `Your access: ${args.courseName}`;

  const { data, error } = await resend.emails.send({
    from: RESEND_FROM,
    to: [args.to],
    subject,
    react: CourseAccessEmail({
      firstName: args.firstName,
      courseName: args.courseName,
      accessUrl
    })
  });

  // Log the send attempt
  await supabaseAdmin.from("email_sends").insert({
    email: args.to,
    template: "course_access",
    resend_email_id: data?.id ?? null,
    subject,
    metadata: { courseName: args.courseName, courseSlug: args.courseSlug },
    status: error ? "failed" : "sent",
    error_message: error ? JSON.stringify(error) : null
  });

  if (error) throw new Error(JSON.stringify(error));
  return data;
}
