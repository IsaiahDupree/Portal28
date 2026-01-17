import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendCertificateEmail } from "@/lib/email/sendCertificateEmail";

/**
 * Cron job to send certificate emails
 * Runs periodically to send emails for newly generated certificates
 *
 * This endpoint should be called by a cron service (Vercel Cron or similar)
 * Authorization: Cron secret header
 */
export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use service role key to bypass RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  try {
    // Get certificates that haven't had emails sent
    const { data: certificates, error } = await supabase
      .from("certificates")
      .select(
        `
        *,
        profiles!inner(email, full_name)
      `
      )
      .eq("email_sent", false)
      .limit(50); // Process in batches

    if (error) {
      console.error("Error fetching certificates:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!certificates || certificates.length === 0) {
      return NextResponse.json({
        message: "No pending certificate emails",
        processed: 0,
      });
    }

    const results = [];

    for (const cert of certificates) {
      const profile = cert.profiles as any;

      if (!profile?.email) {
        console.error(`No email found for certificate ${cert.id}`);
        continue;
      }

      try {
        // Format completion date
        const completionDate = new Date(cert.completion_date).toLocaleDateString(
          "en-US",
          {
            year: "numeric",
            month: "long",
            day: "numeric",
          }
        );

        // Send email
        const result = await sendCertificateEmail({
          recipientEmail: profile.email,
          recipientName: profile.full_name || "Student",
          courseTitle: cert.course_title,
          certificateNumber: cert.certificate_number,
          certificateDownloadUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/api/certificates/${cert.id}/download`,
          verificationUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/verify-certificate/${cert.verification_token}`,
          completionDate,
        });

        if (result.success) {
          // Mark email as sent
          await supabase
            .from("certificates")
            .update({
              email_sent: true,
              email_sent_at: new Date().toISOString(),
            })
            .eq("id", cert.id);

          results.push({
            certificateId: cert.id,
            success: true,
          });
        } else {
          results.push({
            certificateId: cert.id,
            success: false,
            error: result.error,
          });
        }
      } catch (error) {
        console.error(`Error processing certificate ${cert.id}:`, error);
        results.push({
          certificateId: cert.id,
          success: false,
          error: String(error),
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      message: `Processed ${certificates.length} certificates`,
      processed: certificates.length,
      successful: successCount,
      failed: certificates.length - successCount,
      results,
    });
  } catch (error) {
    console.error("Error in certificate email cron:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
