import { Readable } from "stream";
import React from "react";
import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";

export interface CertificateData {
  certificateNumber: string;
  studentName: string;
  courseTitle: string;
  completionDate: string; // Format: "January 15, 2026"
  verificationUrl: string;
}

// Define styles for the PDF certificate
const styles = StyleSheet.create({
  page: {
    padding: 60,
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    border: "10px double #2c5aa0",
    padding: 40,
  },
  header: {
    marginBottom: 30,
    textAlign: "center",
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#2c5aa0",
    marginBottom: 10,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 40,
  },
  mainText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 15,
    color: "#333",
  },
  studentName: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#000",
    marginVertical: 20,
    textTransform: "uppercase",
  },
  courseTitle: {
    fontSize: 20,
    color: "#2c5aa0",
    marginVertical: 15,
    fontStyle: "italic",
  },
  completionDate: {
    fontSize: 14,
    color: "#666",
    marginTop: 30,
  },
  footer: {
    marginTop: 50,
    paddingTop: 20,
    borderTop: "2px solid #2c5aa0",
  },
  certificateNumber: {
    fontSize: 10,
    color: "#999",
    marginTop: 20,
  },
  verificationUrl: {
    fontSize: 9,
    color: "#666",
    marginTop: 5,
  },
});

// Certificate PDF Document Component
const CertificateDocument: React.FC<{ data: CertificateData }> = ({ data }) => (
  <Document>
    <Page size="A4" orientation="landscape" style={styles.page}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>CERTIFICATE OF COMPLETION</Text>
          <Text style={styles.subtitle}>Portal28 Academy</Text>
        </View>

        <Text style={styles.mainText}>This certifies that</Text>

        <Text style={styles.studentName}>{data.studentName}</Text>

        <Text style={styles.mainText}>has successfully completed the course</Text>

        <Text style={styles.courseTitle}>{data.courseTitle}</Text>

        <Text style={styles.completionDate}>
          Completed on {data.completionDate}
        </Text>

        <View style={styles.footer}>
          <Text style={styles.certificateNumber}>
            Certificate Number: {data.certificateNumber}
          </Text>
          <Text style={styles.verificationUrl}>
            Verify at: {data.verificationUrl}
          </Text>
        </View>
      </View>
    </Page>
  </Document>
);

/**
 * Generate a certificate PDF as a Buffer
 * Uses @react-pdf/renderer for serverless-compatible PDF generation
 */
export async function generateCertificatePDF(
  data: CertificateData
): Promise<Buffer> {
  try {
    // Generate PDF blob using react-pdf
    const blob = await pdf(<CertificateDocument data={data} />).toBlob();

    // Convert blob to buffer
    const arrayBuffer = await blob.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("Error generating certificate PDF:", error);
    throw new Error("Failed to generate certificate PDF. Please try again later.");
  }
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
