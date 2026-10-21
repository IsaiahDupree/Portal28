import { createClient } from "@supabase/supabase-js";

type AdminClient = ReturnType<typeof createClient<any, "public">>;

let adminClient: AdminClient | undefined;

function getAdminClient(): AdminClient {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase admin client is not configured: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required"
    );
  }

  adminClient = createClient(url, key, { auth: { persistSession: false } });
  return adminClient;
}

// API modules can be imported during a build without runtime database secrets.
// Create the privileged client only when a request actually uses it.
export const supabaseAdmin = new Proxy({} as AdminClient, {
  get(_target, property) {
    const client = getAdminClient();
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
  set(_target, property, value) {
    const client = getAdminClient();
    return Reflect.set(client, property, value, client);
  },
});
