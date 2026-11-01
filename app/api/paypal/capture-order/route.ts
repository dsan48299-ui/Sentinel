import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getAuthenticatedUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { paypalRequest } from "@/lib/paypal";

export const runtime = "nodejs";

function toCents(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  const cents = Math.round(amount * 100);
  if (Math.abs(amount * 100 - cents) > 0.000001) return null;
  return cents;
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Sign in before capturing payment." }, { status: 401 });

  try {
    const body = await request.json().catch(() => null);
    const orderId = typeof body?.orderId === "string" ? body.orderId.trim() : "";
    if (!orderId) return NextResponse.json({ error: "PayPal order ID is required." }, { status: 400 });

    const db = getSupabaseAdmin();
    const { data: savedOrder, error: orderError } = await db.from("paypal_orders")
      .select("paypal_order_id,invoice_id,status,paypal_capture_id")
      .eq("paypal_order_id", orderId)
      .eq("owner_id", user.id)
      .single();
    if (orderError || !savedOrder) {
      return NextResponse.json({ error: "This PayPal order is not associated with your workspace." }, { status: 404 });
    }

    const { data: invoice, error: invoiceError } = await db.from("invoices")
      .select("id,invoice_number,amount,currency,status,paypal_capture_id")
      .eq("id", savedOrder.invoice_id)
      .eq("owner_id", user.id)
      .single();
    if (invoiceError || !invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });

    if (invoice.status === "PAID") {
      if (invoice.paypal_capture_id || savedOrder.paypal_capture_id) {
        const { error: reconcileError } = await db.from("paypal_orders")
          .update({ status: "COMPLETED", paypal_capture_id: invoice.paypal_capture_id || savedOrder.paypal_capture_id })
          .eq("paypal_order_id", orderId)
          .eq("owner_id", user.id);
        if (reconcileError) console.error("PayPal order reconciliation failed after an already-paid invoice.", orderId);
      }
      return NextResponse.json({ status: "COMPLETED", alreadyCaptured: true });
    }

    if (invoice.status !== "PENDING") {
      return NextResponse.json({ error: "This invoice is not payable." }, { status: 409 });
    }

    // If the payer already completed capture but the first request lost its
    // response, read the order status and reconcile instead of capturing twice.
    let captured: any;
    try {
      captured = await paypalRequest(
        \`/v2/checkout/orders/\${encodeURIComponent(orderId)}/capture\`,
        "POST",
        {},
        randomUUID(),
      );
    } catch (captureError) {
      const existing = await paypalRequest(
        \`/v2/checkout/orders/\${encodeURIComponent(orderId)}\`,
        "GET",
      ).catch(() => null);
      if (existing?.status !== "COMPLETED") throw captureError;
      captured = existing;
    }

    const unit = captured.purchase_units?.find((purchaseUnit: any) =>
      purchaseUnit?.custom_id === invoice.id || purchaseUnit?.reference_id === invoice.id
    );
    const capture = unit?.payments?.captures?.find((item: any) => item?.status === "COMPLETED");
    if (captured.status !== "COMPLETED" || !capture || typeof capture.id !== "string") {
      return NextResponse.json({
        error: "PayPal has not confirmed a completed capture.",
        status: captured.status || "UNKNOWN",
      }, { status: 409 });
    }

    const capturedCents = toCents(capture.amount?.value);
    const invoiceCents = toCents(invoice.amount);
    if (
      !unit ||
      unit.custom_id !== invoice.id ||
      capturedCents === null ||
      capturedCents !== invoiceCents ||
      capture.amount?.currency_code !== invoice.currency
    ) {
      console.error("Captured PayPal amount/reference did not match invoice", orderId);
      return NextResponse.json({ error: "Captured payment did not match the invoice. Manual review required." }, { status: 409 });
    }

    const { data: updatedInvoice, error: updateError } = await db.from("invoices")
      .update({
        status: "PAID",
        paid_at: new Date().toISOString(),
        paypal_order_id: orderId,
        paypal_capture_id: capture.id,
      })
      .eq("id", invoice.id)
      .eq("owner_id", user.id)
      .eq("status", "PENDING")
      .select("id,status,paypal_capture_id")
      .maybeSingle();
    if (updateError) throw updateError;

    if (!updatedInvoice) {
      const { data: currentInvoice, error: currentError } = await db.from("invoices")
        .select("id,status,paypal_capture_id")
        .eq("id", invoice.id)
        .eq("owner_id", user.id)
        .maybeSingle();
      if (currentError) throw currentError;
      if (currentInvoice?.status !== "PAID" || currentInvoice.paypal_capture_id !== capture.id) {
        return NextResponse.json({ error: "Payment was captured but the invoice needs manual reconciliation." }, { status: 409 });
      }
    }

    const { error: savedOrderUpdateError } = await db.from("paypal_orders")
      .update({ status: "COMPLETED", paypal_capture_id: capture.id })
      .eq("paypal_order_id", orderId)
      .eq("owner_id", user.id);
    if (savedOrderUpdateError) throw savedOrderUpdateError;

    return NextResponse.json({ status: "COMPLETED", captureId: capture.id });
  } catch (error) {
    console.error("PayPal capture failed", error);
    return NextResponse.json({ error: "PayPal could not finish this payment request. Refresh the invoice and check its current status before retrying." }, { status: 503 });
  }
}
