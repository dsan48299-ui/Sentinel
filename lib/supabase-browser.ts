import { createBrowserClient } from "@supabase/ssr";

export async function getSupabaseBrowser() {
  const response = await fetch("/api/client-config", { cache: "no-store" });
  const config = await response.json();
  if (!response.ok || !config.supabaseUrl || !config.supabaseAnonKey) {
    throw new Error("Supabase URL and anon key are not configured.");
  }
  return createBrowserClient(config.supabaseUrl, config.supabaseAnonKey);
}
