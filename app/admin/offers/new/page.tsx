import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import OfferForm from "@/components/admin/OfferForm";

export default async function NewOfferPage() {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect("/login?next=/admin/offers/new");
  }

  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", auth.user.id)
    .single();

  if (user?.role !== "admin") {
    redirect("/app");
  }

  const emptyOffer = {
    key: "",
    kind: "membership",
    title: "",
    subtitle: null,
    badge: null,
    cta_text: "Continue",
    price_label: null,
    compare_at_label: null,
    bullets: [],
    payload: {},
    is_active: true,
  };

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <OfferForm offer={emptyOffer} isNew={true} />
    </main>
  );
}
