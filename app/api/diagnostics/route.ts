import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { paypalAccessToken, paypalConfigured, paypalRequest } from "@/lib/paypal";

export const runtime = "nodejs";
export const maxDuration = 30;

type Check = {
  id: string;
  label: string;
  status: "ok" | "warning" | "error";
  detail: string;
};

export async function POST() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Sign in to run workspace checks." }, { status: 401 });

  const checks: Check[] = [];

  try {
    const db = getSupabaseAdmin();
    const { count, error } = await db.from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id);
    if (error) throw error;
    checks.push({
      id: "database",
      label: "Supabase database",
      status: "ok",
      detail: "Connected. " + (count ?? 0) + " invoice record(s) are available in this private workspace.",
    });
  } catch (error) {
    console.error("System check: Supabase failed", error);
    checks.push({
      id: "database",
      label: "Supabase database",
      status: "error",
      detail: "The private invoice database could not be queried. Check the server-side Supabase configuration.",
    });
  }

  try {
    if (!paypalConfigured()) throw new Error("PayPal credentials are missing.");
    const baseUrl = (process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com").replace(/\/$/, "");
    if (!baseUrl.includes("sandbox")) {
      throw new Error("The PayPal API base URL is not set to Sandbox.");
    }
    await paypalAccessToken();
    checks.push({
      id: "paypal",
      label: "PayPal Sandbox API",
      status: "ok",
      detail: "Sandbox accepted the configured PayPal application credentials.",
    });
  } catch (error) {
    console.error("System check: PayPal API failed", error);
    checks.push({
      id: "paypal",
      label: "PayPal Sandbox API",
      status: "error",
      detail: error instanceof Error ? error.message : "PayPal Sandbox authentication failed.",
    });
  }

  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    checks.push({
      id: "webhook",
      label: "PayPal webhook",
      status: "warning",
      detail: "No webhook ID is configured. Checkout can still capture payments, but asynchronous reconciliation is not configured.",
    });
  } else {
    try {
      const webhook = await paypalRequest(
        "/v1/notifications/webhooks/" + encodeURIComponent(webhookId),
        "GET",
      );
      const requiredEvents = [
        "PAYMENT.CAPTURE.COMPLETED",
        "PAYMENT.CAPTURE.DENIED",
        "PAYMENT.CAPTURE.REFUNDED",
        "PAYMENT.CAPTURE.REVERSED",
      ];
      const configuredEvents = Array.isArray(webhook?.event_types)
        ? webhook.event_types.map((event: { name?: string }) => event?.name).filter(Boolean)
        : [];
      const missingEvents = requiredEvents.filter(eventName => !configuredEvents.includes(eventName));
      checks.push({
        id: "webhook",
        label: "PayPal webhook",
        status: missingEvents.length === 0 ? "ok" : "warning",
        detail: missingEvents.length === 0
          ? "Webhook exists and includes all four payment lifecycle events."
          : "Webhook exists but is missing: " + missingEvents.join(", ") + ".",
      });
    } catch (error) {
      console.error("System check: PayPal webhook failed", error);
      checks.push({
        id: "webhook",
        label: "PayPal webhook",
        status: "error",
        detail: "The configured webhook could not be retrieved from PayPal Sandbox. Verify the webhook ID belongs to this Sandbox app.",
      });
    }
  }

  return NextResponse.json(
    { checks, checkedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
