import { createClient } from "@supabase/supabase-js";

// Fallback values allow the module to load in test environments where env vars are absent.
// In production, real values must be provided via .env.
const url = (import.meta.env.VITE_SUPABASE_URL as string) || "https://placeholder.supabase.co";
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || "placeholder-anon-key";

export const supabase = createClient(url, key);
