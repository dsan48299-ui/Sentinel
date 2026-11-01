import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const authError = searchParams.get("error");

  if (authError || !code) {
    return NextResponse.redirect(new URL("/login?error=sign_in_failed", origin));
  }

  const supabaseUrl = process.env.NEXT_SUPABASE_URL;
  const anonKey = process.env.NEXT_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    console.error("Supabase callback configuration is missing.");
    return NextResponse.redirect(new URL("/login?error=configuration", origin));
  }

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, anonKey, {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(values) {
          for (const { name, value, options } of values) cookieStore.set(name, value, options);
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("Supabase sign-in code exchange failed:", error.message);
      return NextResponse.redirect(new URL("/login?error=sign_in_failed", origin));
    }
    return NextResponse.redirect(new URL("/", origin));
  } catch (error) {
    console.error("Supabase auth callback failed:", error);
    return NextResponse.redirect(new URL("/login?error=sign_in_failed", origin));
  }
}
