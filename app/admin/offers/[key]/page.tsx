import { redirect, notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import OfferForm from "@/components/admin/OfferForm";

export default async function EditOfferPage({
  params,
}: {
  params: { key: string };
}) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect(`/login?next=/admin/offers/${params.key}`);
  }

  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", auth.user.id)
    .single();

  if (user?.role !== "admin") {
    redirect("/app");
  }

  const { data: offer } = await supabase
    .from("offers")
    .select("*")
    .eq("key", params.key)
    .single();

  if (!offer) notFound();

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <OfferForm offer={offer} isNew={false} />
    </main>
  );
}
