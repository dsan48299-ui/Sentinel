import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { paypalRequest } from "@/lib/paypal";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (!webhookId) return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });

    const event = await request.json();
    if (typeof event?.id !== "string" || typeof event?.event_type !== "string") {
      return NextResponse.json({ error: "Invalid PayPal event payload." }, { status: 400 });
    }

    const header = (name: string) => request.headers.get(name) || "";
    const transmission = {
      auth_algo: header("paypal-auth-algo"),
      cert_url: header("paypal-cert-url"),
      transmission_id: header("paypal-transmission-id"),
      transmission_sig: header("paypal-transmission-sig"),
      transmission_time: header("paypal-transmission-time"),
    };
    if (Object.values(transmission).some(value => !value)) {
      return NextResponse.json({ error: "Required PayPal signature headers are missing." }, { status: 400 });
    }

    const verification = await paypalRequest("/v1/notifications/verify-webhook-signature", "POST", {
      ...transmission,
      webhook_id: webhookId,
      webhook_event: event,
    });
    if (verification.verification_status !== "SUCCESS") {
      return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
    }

    const db = getSupabaseAdmin();
    const { data: priorEvent, error: priorError } = await db
      .from("paypal_webhook_events").select("event_id").eq("event_id", event.id).maybeSingle();
    if (priorError) throw priorError;
    if (priorEvent) return NextResponse.json({ received: true, duplicate: true });

    const orderId = event.resource?.supplementary_data?.related_ids?.order_id;
    const captureId = event.resource?.id;

    if (event.event_type === "PAYMENT.CAPTURE.COMPLETED" && orderId && captureId) {
      const { data: savedOrder, error: orderError } = await db
        .from("paypal_orders").select("invoice_id").eq("paypal_order_id", orderId).maybeSingle();
      if (orderError) throw orderError;

      if (savedOrder?.invoice_id) {
        const { data: invoice, error: invoiceError } = await db
          .from("invoices").select("id,amount,currency,status").eq("id", savedOrder.invoice_id).maybeSingle();
        if (invoiceError) throw invoiceError;

        const eventAmount = Number(event.resource?.amount?.value);
        const eventCurrency = event.resource?.amount?.currency_code;
        if (!invoice || !Number.isFinite(eventAmount) || Math.round(eventAmount * 100) !== Math.round(Number(invoice.amount) * 100) || eventCurrency !== invoice.currency) {
          console.error("PayPal webhook amount or currency did not match the saved invoice.", event.id);
          return NextResponse.json({ error: "Payment requires manual reconciliation." }, { status: 409 });
        }

        const { error: invoiceUpdateError } = await db.from("invoices").update({
          status: "PAID", paid_at: new Date().toISOString(), paypal_order_id: orderId, paypal_capture_id: captureId,
        }).eq("id", invoice.id);
        if (invoiceUpdateError) throw invoiceUpdateError;

        const { error: orderUpdateError } = await db.from("paypal_orders")
          .update({ status: "COMPLETED", paypal_capture_id: captureId }).eq("paypal_order_id", orderId);
        if (orderUpdateError) throw orderUpdateError;
      }
    }

    if (["PAYMENT.CAPTURE.DENIED", "PAYMENT.CAPTURE.REFUNDED", "PAYMENT.CAPTURE.REVERSED"].includes(event.event_type) && orderId) {
      const { data: savedOrder, error: orderLookupError } = await db
        .from("paypal_orders").select("invoice_id").eq("paypal_order_id", orderId).maybeSingle();
      if (orderLookupError) throw orderLookupError;

      let orderStatus = event.event_type.split(".").at(-1) || event.event_type;
      if (savedOrder?.invoice_id && event.event_type === "PAYMENT.CAPTURE.REFUNDED") {
        const { data: invoice, error: invoiceError } = await db.from("invoices")
          .select("id,amount").eq("id", savedOrder.invoice_id).maybeSingle();
        if (invoiceError) throw invoiceError;
        const refundedAmount = Number(event.resource?.amount?.value);
        const invoiceAmount = Number(invoice?.amount);
        // A partial refund must not make the whole invoice appear fully refunded.
        orderStatus = Number.isFinite(refundedAmount) && refundedAmount >= invoiceAmount
          ? "REFUNDED"
          : "PARTIALLY_REFUNDED";
        if (orderStatus === "REFUNDED" && invoice) {
          const { error: invoiceUpdateError } = await db.from("invoices")
            .update({ status: "REFUNDED" }).eq("id", invoice.id);
          if (invoiceUpdateError) throw invoiceUpdateError;
        }
      } else if (savedOrder?.invoice_id && event.event_type === "PAYMENT.CAPTURE.REVERSED") {
        const { error: invoiceUpdateError } = await db.from("invoices")
          .update({ status: "REFUNDED" }).eq("id", savedOrder.invoice_id);
        if (invoiceUpdateError) throw invoiceUpdateError;
        orderStatus = "REVERSED";
      }

      const { error: orderUpdateError } = await db.from("paypal_orders")
        .update({ status: orderStatus }).eq("paypal_order_id", orderId);
      if (orderUpdateError) throw orderUpdateError;
    }

    const { error: saveEventError } = await db.from("paypal_webhook_events").insert({
      event_id: event.id, event_type: event.event_type, processed_at: new Date().toISOString(),
    });
    if (saveEventError && saveEventError.code !== "23505") throw saveEventError;

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("PayPal webhook processing failed", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
