import { supabaseServer } from "@/lib/supabase/server";
import { CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";

export default async function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = supabaseServer();

  // Look up certificate by verification token
  const { data: certificate, error } = await supabase
    .from("certificates")
    .select("*")
    .eq("verification_token", token)
    .single();

  const isValid = !error && certificate;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg p-8">
          {isValid ? (
            <>
              <div className="flex items-center justify-center mb-6">
                <CheckCircle2 className="w-16 h-16 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
                Valid Certificate
              </h1>
              <p className="text-center text-gray-600 mb-8">
                This certificate is authentic and has been verified
              </p>

              <div className="border-t border-b border-gray-200 py-6 space-y-4">
                <div>
                  <div className="text-sm font-medium text-gray-500">
                    Certificate Number
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {certificate.certificate_number}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-500">
                    Student Name
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {certificate.student_name}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-500">
                    Course Completed
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {certificate.course_title}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-500">
                    Completion Date
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {new Date(certificate.completion_date).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-500">
                    Issued By
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    Portal28 Academy
                  </div>
                </div>
              </div>

              <div className="mt-8 text-center">
                <Link
                  href="/"
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                  Back to Home
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center mb-6">
                <XCircle className="w-16 h-16 text-red-600" />
              </div>
              <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
                Invalid Certificate
              </h1>
              <p className="text-center text-gray-600 mb-8">
                This certificate could not be verified. It may have been revoked
                or the verification code is incorrect.
              </p>

              <div className="mt-8 text-center">
                <Link
                  href="/"
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700"
                >
                  Back to Home
                </Link>
              </div>
            </>
          )}
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            Certificate verification is provided as a service to validate the
            authenticity of Portal28 Academy certificates.
          </p>
        </div>
      </div>
    </div>
  );
}
