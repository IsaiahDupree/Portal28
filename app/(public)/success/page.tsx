import { Suspense } from "react";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import SuccessClient from "./SuccessClient";

type Props = {
  searchParams: {
    session_id?: string;
  };
};

export default async function SuccessPage({ searchParams }: Props) {
  const sessionId = searchParams.session_id;

  if (!sessionId) {
    redirect("/");
  }

  // Fetch order details
  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select("id, offer_key, status, email, course_id, metadata")
    .eq("stripe_session_id", sessionId)
    .single();

  if (error || !order) {
    console.error("Order not found:", error);
    redirect("/");
  }

  // Fetch course details if single course purchase
  let courseDetails = null;
  if (order.course_id) {
    const { data: course } = await supabaseAdmin
      .from("courses")
      .select("id, title, slug")
      .eq("id", order.course_id)
      .single();

    courseDetails = course;
  }

  // Fetch upsell offers for this purchase
  const { data: upsellsData } = await supabaseAdmin
    .from("offers")
    .select("*")
    .eq("kind", "upsell")
    .eq("is_active", true)
    .or(`parent_offer_key.eq.${order.offer_key || ""},parent_offer_key.is.null`)
    .limit(1); // Show one upsell at a time

  // Check if already viewed/purchased
  const { data: existingPurchases } = await supabaseAdmin
    .from("upsell_purchases")
    .select("upsell_offer_key, status")
    .eq("original_order_id", order.id);

  const viewedKeys = new Set(existingPurchases?.map(p => p.upsell_offer_key) || []);
  const availableUpsells = (upsellsData || []).filter(u => !viewedKeys.has(u.key));

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SuccessClient
        orderId={order.id}
        orderEmail={order.email}
        course={courseDetails}
        upsellOffer={availableUpsells[0] || null}
      />
    </Suspense>
  );
}
