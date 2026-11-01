import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { paypalRequest } from "@/lib/paypal";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (!webhookId) return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
    const event = await request.json();
    const header = (name: string) => request.headers.get(name) || "";
    const verification = await paypalRequest("/v1/notifications/verify-webhook-signature", "POST", {
      auth_algo: header("paypal-auth-algo"),
      cert_url: header("paypal-cert-url"),
      transmission_id: header("paypal-transmission-id"),
      transmission_sig: header("paypal-transmission-sig"),
      transmission_time: header("paypal-transmission-time"),
      webhook_id: webhookId,
      webhook_event: event,
    });
    if (verification.verification_status !== "SUCCESS") return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
    const db = getSupabaseAdmin();
    const eventId = event.id;
    if (typeof eventId === "string") {
      const { error: eventError } = await db.from("paypal_webhook_events").upsert({ event_id: eventId, event_type: event.event_type, processed_at: new Date().toISOString() }, { onConflict: "event_id" });
      if (eventError) throw eventError;
    }
    if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      const orderId = event.resource?.supplementary_data?.related_ids?.order_id;
      const captureId = event.resource?.id;
      if (orderId) {
        const { data: savedOrder } = await db.from("paypal_orders").select("invoice_id").eq("paypal_order_id", orderId).maybeSingle();
        if (savedOrder?.invoice_id) {
          await db.from("invoices").update({ status: "PAID", paid_at: new Date().toISOString(), paypal_order_id: orderId, paypal_capture_id: captureId }).eq("id", savedOrder.invoice_id);
          await db.from("paypal_orders").update({ status: "COMPLETED", paypal_capture_id: captureId }).eq("paypal_order_id", orderId);
        }
      }
    }
    if (event.event_type === "PAYMENT.CAPTURE.DENIED" || event.event_type === "PAYMENT.CAPTURE.REFUNDED" || event.event_type === "PAYMENT.CAPTURE.REVERSED") {
      const orderId = event.resource?.supplementary_data?.related_ids?.order_id;
      if (orderId) await db.from("paypal_orders").update({ status: event.event_type }).eq("paypal_order_id", orderId);
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("PayPal webhook processing failed", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
