import { supabaseServer } from "@/lib/supabase/server";
import BundleCard from "@/components/offers/BundleCard";

export default async function BundlesPage() {
  const supabase = supabaseServer();

  const { data: bundles } = await supabase
    .from("offers")
    .select("*")
    .eq("kind", "bundle")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Course Bundles</h1>
        <p className="text-muted-foreground mt-2">
          Get more value with our carefully curated course bundles
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {(bundles ?? []).map((bundle: any) => {
          const payload = bundle.payload ?? {};
          const courseIds = payload.courseIds ?? [];

          return (
            <BundleCard
              key={bundle.key}
              offerKey={bundle.key}
              title={bundle.title}
              subtitle={bundle.subtitle}
              priceLabel={bundle.price_label}
              compareAtLabel={bundle.compare_at_label}
              courses={courseIds.map((id: string) => ({ id, title: id, slug: id }))}
              bullets={bundle.bullets ?? []}
              badge={bundle.badge}
              ctaText={bundle.cta_text}
            />
          );
        })}
      </div>

      {(!bundles || bundles.length === 0) && (
        <div className="text-center py-12 text-muted-foreground">
          No bundles available at the moment.
        </div>
      )}
    </div>
  );
}
