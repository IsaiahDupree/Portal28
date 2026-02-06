import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { CheckCircle, XCircle, Award } from "lucide-react";

interface VerifyPageProps {
  params: {
    token: string;
  };
}

async function getCertificateByToken(token: string) {
  const supabase = supabaseServer();

  const { data: certificate, error } = await supabase
    .from("certificates")
    .select("*")
    .eq("verification_token", token)
    .single();

  if (error || !certificate) {
    return null;
  }

  return certificate;
}

export default async function VerifyPage({ params }: VerifyPageProps) {
  const certificate = await getCertificateByToken(params.token);

  if (!certificate) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Invalid Certificate
          </h1>
          <p className="text-gray-600 mb-6">
            This verification link is invalid or the certificate could not be found.
          </p>
          <Link
            href="/"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-8">
        {/* Verification Badge */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Verified Certificate
          </h1>
          <p className="text-gray-600">
            This certificate has been verified as authentic
          </p>
        </div>

        {/* Certificate Details */}
        <div className="border-t border-b border-gray-200 py-6 space-y-4">
          <div className="flex items-start">
            <Award className="w-5 h-5 text-blue-600 mt-1 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h2 className="text-sm font-medium text-gray-500 mb-1">
                Student Name
              </h2>
              <p className="text-lg font-semibold text-gray-900">
                {certificate.student_name}
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <Award className="w-5 h-5 text-blue-600 mt-1 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h2 className="text-sm font-medium text-gray-500 mb-1">
                Course Title
              </h2>
              <p className="text-lg font-semibold text-gray-900">
                {certificate.course_title}
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <Award className="w-5 h-5 text-blue-600 mt-1 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h2 className="text-sm font-medium text-gray-500 mb-1">
                Completion Date
              </h2>
              <p className="text-lg font-semibold text-gray-900">
                {new Date(certificate.completion_date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <Award className="w-5 h-5 text-blue-600 mt-1 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h2 className="text-sm font-medium text-gray-500 mb-1">
                Certificate Number
              </h2>
              <p className="text-lg font-mono text-gray-900">
                {certificate.certificate_number}
              </p>
            </div>
          </div>

          {certificate.issued_at && (
            <div className="flex items-start">
              <Award className="w-5 h-5 text-blue-600 mt-1 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h2 className="text-sm font-medium text-gray-500 mb-1">
                  Issued On
                </h2>
                <p className="text-lg text-gray-900">
                  {new Date(certificate.issued_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center space-y-4">
          <p className="text-sm text-gray-600">
            This certificate was issued by Portal28 Academy
          </p>
          <Link
            href="/"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Visit Portal28 Academy
          </Link>
        </div>
      </div>
    </div>
  );
}

// Generate metadata for the page
export async function generateMetadata({ params }: VerifyPageProps) {
  const certificate = await getCertificateByToken(params.token);

  if (!certificate) {
    return {
      title: "Certificate Not Found | Portal28 Academy",
      description: "The requested certificate could not be verified.",
    };
  }

  return {
    title: `Certificate for ${certificate.student_name} | Portal28 Academy`,
    description: `Verify the certificate of completion for ${certificate.course_title}`,
  };
}
