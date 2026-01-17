import { resend } from "./resend";

interface CertificateEmailParams {
  recipientEmail: string;
  recipientName: string;
  courseTitle: string;
  certificateNumber: string;
  certificateDownloadUrl: string;
  verificationUrl: string;
  completionDate: string;
}

export async function sendCertificateEmail({
  recipientEmail,
  recipientName,
  courseTitle,
  certificateNumber,
  certificateDownloadUrl,
  verificationUrl,
  completionDate,
}: CertificateEmailParams) {
  const subject = `Congratulations! Your ${courseTitle} Certificate is Ready`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; background-color: #1a4d2e; color: white; padding: 16px 24px; border-radius: 8px;">
            <h1 style="margin: 0; font-size: 24px;">🎓 Certificate of Completion</h1>
          </div>
        </div>

        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
          <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #1a1a1a;">
            Congratulations, ${recipientName}!
          </h2>
          <p style="margin: 0 0 12px 0; color: #666; font-size: 16px;">
            You've successfully completed <strong>${courseTitle}</strong> on ${completionDate}.
          </p>
          <p style="margin: 0; color: #666; font-size: 16px;">
            Your official certificate is now available for download.
          </p>
        </div>

        <div style="background-color: #fff; border: 2px solid #1a4d2e; padding: 20px; margin-bottom: 24px; border-radius: 8px;">
          <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">Certificate Number:</p>
          <p style="margin: 0 0 16px 0; color: #1a4d2e; font-size: 18px; font-weight: bold;">${certificateNumber}</p>

          <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">Course:</p>
          <p style="margin: 0; color: #333; font-size: 16px; font-weight: 500;">${courseTitle}</p>
        </div>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${certificateDownloadUrl}" style="display: inline-block; background-color: #1a4d2e; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
            Download Your Certificate
          </a>
        </div>

        <div style="background-color: #f8f9fa; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
          <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">
            <strong>Share Your Achievement</strong>
          </p>
          <p style="margin: 0 0 12px 0; color: #666; font-size: 14px;">
            Your certificate includes a unique verification URL that anyone can use to verify its authenticity:
          </p>
          <p style="margin: 0; font-size: 12px; word-break: break-all;">
            <a href="${verificationUrl}" style="color: #3b82f6;">${verificationUrl}</a>
          </p>
        </div>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 32px; text-align: center;">
          <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">
            Keep learning! Check out our other courses:
          </p>
          <a href="${process.env.NEXT_PUBLIC_SITE_URL}/courses" style="color: #3b82f6; text-decoration: none; font-weight: 500;">
            Browse Courses →
          </a>
        </div>

        <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="margin: 0; color: #999; font-size: 12px;">
            Portal28 Academy
          </p>
          <p style="margin: 4px 0 0 0; color: #999; font-size: 12px;">
            This email was sent because you completed a course. No action is required.
          </p>
        </div>
      </body>
    </html>
  `;

  const text = `
Congratulations, ${recipientName}!

You've successfully completed ${courseTitle} on ${completionDate}.

Certificate Number: ${certificateNumber}

Download your certificate at:
${certificateDownloadUrl}

Verify your certificate at:
${verificationUrl}

Keep learning! Browse more courses at: ${process.env.NEXT_PUBLIC_SITE_URL}/courses

---
Portal28 Academy
  `;

  try {
    await resend.emails.send({
      from: "Portal28 Academy <noreply@portal28.academy>",
      to: recipientEmail,
      subject,
      html,
      text,
    });

    return { success: true };
  } catch (error) {
    console.error("Error sending certificate email:", error);
    return { success: false, error };
  }
}
