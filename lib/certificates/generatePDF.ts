import PDFDocument from "pdfkit";
import { Readable } from "stream";

export interface CertificateData {
  certificateNumber: string;
  studentName: string;
  courseTitle: string;
  completionDate: string; // Format: "January 15, 2026"
  verificationUrl: string;
}

/**
 * Generate a certificate PDF as a Buffer
 * Returns a Promise that resolves to the PDF buffer
 */
export async function generateCertificatePDF(
  data: CertificateData
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      // Create a new PDF document (Letter size: 612 x 792 points)
      const doc = new PDFDocument({
        size: "LETTER",
        layout: "landscape", // Certificates are typically landscape
        margins: { top: 50, bottom: 50, left: 72, right: 72 },
      });

      // Collect the PDF chunks
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => {
        chunks.push(chunk);
      });

      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });

      doc.on("error", (error) => {
        reject(error);
      });

      // CERTIFICATE DESIGN
      const pageWidth = 792; // Landscape letter width
      const pageHeight = 612; // Landscape letter height

      // Draw decorative border
      doc
        .rect(30, 30, pageWidth - 60, pageHeight - 60)
        .lineWidth(3)
        .strokeColor("#1a4d2e")
        .stroke();

      doc
        .rect(40, 40, pageWidth - 80, pageHeight - 80)
        .lineWidth(1)
        .strokeColor("#4a7c59")
        .stroke();

      // Title: "Certificate of Completion"
      doc
        .font("Helvetica-Bold")
        .fontSize(40)
        .fillColor("#1a4d2e")
        .text("CERTIFICATE OF COMPLETION", 0, 100, {
          width: pageWidth,
          align: "center",
        });

      // Subtitle line
      doc
        .moveTo(pageWidth / 2 - 150, 160)
        .lineTo(pageWidth / 2 + 150, 160)
        .strokeColor("#4a7c59")
        .lineWidth(1)
        .stroke();

      // "This certifies that"
      doc
        .font("Helvetica")
        .fontSize(14)
        .fillColor("#333333")
        .text("This certifies that", 0, 190, {
          width: pageWidth,
          align: "center",
        });

      // Student Name (prominent)
      doc
        .font("Helvetica-Bold")
        .fontSize(32)
        .fillColor("#1a4d2e")
        .text(data.studentName, 0, 220, {
          width: pageWidth,
          align: "center",
        });

      // Line under name
      doc
        .moveTo(pageWidth / 2 - 200, 265)
        .lineTo(pageWidth / 2 + 200, 265)
        .strokeColor("#4a7c59")
        .lineWidth(1)
        .stroke();

      // "has successfully completed"
      doc
        .font("Helvetica")
        .fontSize(14)
        .fillColor("#333333")
        .text("has successfully completed", 0, 285, {
          width: pageWidth,
          align: "center",
        });

      // Course Title
      doc
        .font("Helvetica-Bold")
        .fontSize(24)
        .fillColor("#1a4d2e")
        .text(data.courseTitle, 0, 315, {
          width: pageWidth,
          align: "center",
        });

      // Completion Date
      doc
        .font("Helvetica")
        .fontSize(14)
        .fillColor("#333333")
        .text(`Completed on ${data.completionDate}`, 0, 360, {
          width: pageWidth,
          align: "center",
        });

      // Academy Logo/Name
      doc
        .font("Helvetica-Bold")
        .fontSize(18)
        .fillColor("#1a4d2e")
        .text("Portal28 Academy", 0, 420, {
          width: pageWidth,
          align: "center",
        });

      // Signature Line (placeholder)
      doc
        .moveTo(pageWidth / 2 - 100, 480)
        .lineTo(pageWidth / 2 + 100, 480)
        .strokeColor("#333333")
        .lineWidth(1)
        .stroke();

      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#333333")
        .text("Instructor", 0, 490, {
          width: pageWidth,
          align: "center",
        });

      // Footer: Certificate Number and Verification
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#666666")
        .text(`Certificate No: ${data.certificateNumber}`, 0, 550, {
          width: pageWidth,
          align: "center",
        });

      doc
        .fontSize(8)
        .fillColor("#666666")
        .text(`Verify at: ${data.verificationUrl}`, 0, 565, {
          width: pageWidth,
          align: "center",
          link: data.verificationUrl,
        });

      // Finalize the PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Convert PDF buffer to a stream (useful for uploading to storage)
 */
export function bufferToStream(buffer: Buffer): Readable {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}
