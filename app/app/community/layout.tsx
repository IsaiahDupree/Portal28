import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getCommunityWidgets } from "@/lib/community/community";
import OffersSidebarWidget from "@/components/offers/OffersSidebarWidget";

export default async function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect("/login?next=/app/community");
  }

  const widgets = await getCommunityWidgets();

  return (
    <div className="min-h-screen grid grid-cols-[260px_1fr]">
      <aside className="border-r bg-gray-50 p-4 space-y-4">
        <Link href="/app/community" className="block font-semibold text-lg">
          Portal28 Community
        </Link>

        <nav className="space-y-1">
          {widgets.map((w) => (
            <Link
              key={w.key}
              href={`/app/community/w/${w.key}`}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white transition-colors"
            >
              <span>{w.nav_icon ?? "📄"}</span>
              <span>{w.nav_label ?? w.name}</span>
            </Link>
          ))}
        </nav>

        <div className="pt-4 border-t">
          <OffersSidebarWidget
            placementKey="widget:community"
            title="Upgrade Your Access"
          />
        </div>

        <div className="pt-4 border-t">
          <Link
            href="/app"
            className="text-sm text-gray-600 hover:text-black"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </aside>

      <main className="p-6 overflow-auto">{children}</main>
    </div>
  );
}
