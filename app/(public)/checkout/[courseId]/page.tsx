import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { CheckoutForm } from "./CheckoutForm";

type Props = {
  params: Promise<{ courseId: string }>;
};

export default async function CheckoutPage({ params }: Props) {
  const resolvedParams = await params;
  const supabase = supabaseServer();

  // Fetch course details
  const { data: course, error } = await supabase
    .from("courses")
    .select("id, title, slug, description, stripe_price_id, price_label")
    .eq("id", resolvedParams.courseId)
    .single();

  if (error || !course) {
    return notFound();
  }

  if (!course.stripe_price_id) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Course Not Available</h1>
          <p className="text-gray-600">This course is not currently available for purchase.</p>
        </div>
      </div>
    );
  }

  // Fetch order bump offers for this course
  const { data: bumpsData } = await supabase
    .from("offers")
    .select("*")
    .eq("kind", "order_bump")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  const bumps = bumpsData ?? [];

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Complete Your Order</h1>
        <p className="text-gray-600 mb-8">Review your order and select any add-ons below</p>

        <CheckoutForm course={course} bumps={bumps} />
      </div>
    </div>
  );
}
