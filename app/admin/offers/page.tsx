import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export default async function AdminOffersPage() {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect("/login?next=/admin/offers");
  }

  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", auth.user.id)
    .single();

  if (user?.role !== "admin") {
    redirect("/app");
  }

  const { data: offers } = await supabase
    .from("offers")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin" className="text-sm text-gray-600 hover:text-black">
            ← Admin
          </Link>
          <h1 className="text-2xl font-semibold mt-1">Offers</h1>
        </div>
        <Link
          href="/admin/offers/new"
          className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
        >
          New Offer
        </Link>
      </div>

      {(!offers || offers.length === 0) ? (
        <p className="text-gray-600">No offers yet.</p>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">Key</th>
                <th className="text-left p-3">Kind</th>
                <th className="text-left p-3">Title</th>
                <th className="text-left p-3">Price</th>
                <th className="text-left p-3">Active</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((o: any) => (
                <tr key={o.key} className="border-t hover:bg-gray-50">
                  <td className="p-3">
                    <Link
                      href={`/admin/offers/${o.key}`}
                      className="font-medium hover:underline"
                    >
                      {o.key}
                    </Link>
                  </td>
                  <td className="p-3">
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                      {o.kind}
                    </span>
                  </td>
                  <td className="p-3">{o.title}</td>
                  <td className="p-3">{o.price_label || "—"}</td>
                  <td className="p-3">
                    {o.is_active ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                        Active
                      </span>
                    ) : (
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                        Inactive
                      </span>
                    )}
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
