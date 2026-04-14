import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Service-role Supabase client — bypasses RLS.
 * Only use inside Edge Functions, never expose to the browser.
 */
export function createAdminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}
