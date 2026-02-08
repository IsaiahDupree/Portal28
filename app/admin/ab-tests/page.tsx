import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export default async function AdminABTestsPage() {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect("/login?next=/admin/ab-tests");
  }

  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", auth.user.id)
    .single();

  if (user?.role !== "admin") {
    redirect("/app");
  }

  const { data: tests } = await supabase
    .from("ab_tests")
    .select(`
      *,
      variants:ab_test_variants(count)
    `)
    .order("created_at", { ascending: false });

  return (
    <main className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin" className="text-sm text-gray-600 hover:text-black">
            ← Admin
          </Link>
          <h1 className="text-2xl font-semibold mt-1">A/B Tests</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage and monitor conversion experiments
          </p>
        </div>
        <Link
          href="/admin/ab-tests/new"
          className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
        >
          New Test
        </Link>
      </div>

      {(!tests || tests.length === 0) ? (
        <div className="rounded-xl border p-12 text-center">
          <p className="text-gray-600 mb-4">No A/B tests yet.</p>
          <Link
            href="/admin/ab-tests/new"
            className="inline-block px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
          >
            Create Your First Test
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Type</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Variants</th>
                <th className="text-left p-3">Traffic</th>
                <th className="text-left p-3">Created</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((test: any) => (
                <tr key={test.id} className="border-t hover:bg-gray-50">
                  <td className="p-3">
                    <Link
                      href={`/admin/ab-tests/${test.id}`}
                      className="font-medium hover:underline"
                    >
                      {test.name}
                    </Link>
                    {test.description && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {test.description}
                      </p>
                    )}
                  </td>
                  <td className="p-3">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      {test.test_type}
                    </span>
                  </td>
                  <td className="p-3">
                    {test.status === 'active' && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                        Active
                      </span>
                    )}
                    {test.status === 'draft' && (
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                        Draft
                      </span>
                    )}
                    {test.status === 'paused' && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                        Paused
                      </span>
                    )}
                    {test.status === 'completed' && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                        Completed
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    {test.variants?.[0]?.count || 0}
                  </td>
                  <td className="p-3">
                    {test.traffic_allocation}%
                  </td>
                  <td className="p-3 text-gray-600">
                    {new Date(test.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-right">
                    <Link
                      href={`/admin/ab-tests/${test.id}`}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
