import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    supabaseUrl: process.env.NEXT_SUPABASE_URL || null,
    supabaseAnonKey: process.env.NEXT_SUPABASE_ANON_KEY || null,
    paypalClientId: process.env.NEXT_PAYPAL_CLIENT_ID || null,
  }, { headers: { "Cache-Control": "no-store" } });
}
