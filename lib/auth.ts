import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_SUPABASE_URL;
  const anonKey = process.env.NEXT_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(values) {
        for (const { name, value, options } of values) cookieStore.set(name, value, options);
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
