import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { generateCertificatePDF } from "@/lib/certificates/generatePDF";

/**
 * GET /api/certificates/[id]/download
 * Generate and download certificate PDF
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Get certificate
  const { data: certificate, error } = await supabase
    .from("certificates")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !certificate) {
    return NextResponse.json(
      { error: "Certificate not found" },
      { status: 404 }
    );
  }

  try {
    // Format completion date
    const completionDate = new Date(
      certificate.completion_date
    ).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Generate verification URL
    const verificationUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/verify-certificate/${certificate.verification_token}`;

    // Generate PDF
    const pdfBuffer = await generateCertificatePDF({
      certificateNumber: certificate.certificate_number,
      studentName: certificate.student_name,
      courseTitle: certificate.course_title,
      completionDate,
      verificationUrl,
    });

    // Return PDF with proper headers
    // Convert Buffer to Uint8Array for Next.js Response
    const uint8Array = new Uint8Array(pdfBuffer);

    return new NextResponse(uint8Array, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="certificate-${certificate.certificate_number}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error generating certificate PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate certificate" },
      { status: 500 }
    );
  }
}
