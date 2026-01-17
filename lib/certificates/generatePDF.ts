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
 * TODO: Re-implement with a serverless-compatible PDF library
 * Returns a Promise that resolves to the PDF buffer
 */
export async function generateCertificatePDF(
  data: CertificateData
): Promise<Buffer> {
  // PDF generation temporarily disabled - returns placeholder
  // Will be implemented with a serverless-compatible solution
  throw new Error("PDF generation is temporarily unavailable. Please try again later.");
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
