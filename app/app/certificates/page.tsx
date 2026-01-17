import { supabaseServer } from "@/lib/supabase/server";
import { Award, Download, ExternalLink } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function CertificatesPage() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user's certificates
  const { data: certificates } = await supabase
    .from("certificates")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          My Certificates
        </h1>
        <p className="text-gray-600">
          View and download your course completion certificates
        </p>
      </div>

      {!certificates || certificates.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No certificates yet
          </h3>
          <p className="text-gray-600 mb-6">
            Complete a course to earn your first certificate!
          </p>
          <Link
            href="/app/courses"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
          >
            Browse Courses
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {certificates.map((certificate) => (
            <div
              key={certificate.id}
              className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Award className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {certificate.course_title}
                    </h3>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>
                        Certificate No:{" "}
                        <span className="font-medium">
                          {certificate.certificate_number}
                        </span>
                      </p>
                      <p>
                        Completed on{" "}
                        {new Date(
                          certificate.completion_date
                        ).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col space-y-2">
                  <Link
                    href={`/api/certificates/${certificate.id}/download`}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Link>

                  <Link
                    href={`/verify-certificate/${certificate.verification_token}`}
                    target="_blank"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Verify
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
