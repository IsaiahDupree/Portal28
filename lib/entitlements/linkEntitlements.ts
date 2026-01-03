import { supabaseAdmin } from "@/lib/supabase/admin";

export async function linkEntitlementsToUser(email: string, userId: string) {
  const { error } = await supabaseAdmin
    .from("entitlements")
    .update({ user_id: userId })
    .eq("email", email)
    .is("user_id", null);

  if (error) throw new Error(error.message);
}
