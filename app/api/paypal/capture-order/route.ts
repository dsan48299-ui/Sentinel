import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getAuthenticatedUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { paypalRequest } from "@/lib/paypal";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Sign in before capturing payment." }, { status: 401 });
  try {
    const { orderId } = await request.json();
    if (typeof orderId !== "string" || !orderId) return NextResponse.json({ error: "PayPal order ID is required." }, { status: 400 });
    const db = getSupabaseAdmin();
    const { data: savedOrder, error: orderError } = await db.from("paypal_orders").select("paypal_order_id,invoice_id,status").eq("paypal_order_id", orderId).eq("owner_id", user.id).single();
    if (orderError || !savedOrder) return NextResponse.json({ error: "This PayPal order is not associated with your workspace." }, { status: 404 });
    const { data: invoice, error: invoiceError } = await db.from("invoices").select("id,amount,currency,status").eq("id", savedOrder.invoice_id).eq("owner_id", user.id).single();
    if (invoiceError || !invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    if (invoice.status === "PAID") return NextResponse.json({ status: "COMPLETED", alreadyCaptured: true });
    const captured = await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, "POST", {}, randomUUID());
    const unit = captured.purchase_units?.[0];
    const capture = unit?.payments?.captures?.[0];
    if (captured.status !== "COMPLETED" || capture?.status !== "COMPLETED") {
      return NextResponse.json({ error: "PayPal has not confirmed a completed capture.", status: captured.status }, { status: 409 });
    }
    if (unit?.custom_id !== invoice.id || unit?.amount?.currency_code !== invoice.currency || Number(unit?.amount?.value) !== Number(invoice.amount)) {
      console.error("Captured PayPal amount/reference did not match invoice", orderId);
      return NextResponse.json({ error: "Captured payment did not match the invoice. Manual review required." }, { status: 409 });
    }
    const { error: updateError } = await db.from("invoices").update({
      status: "PAID", paid_at: new Date().toISOString(), paypal_order_id: orderId,
      paypal_capture_id: capture.id,
    }).eq("id", invoice.id).eq("owner_id", user.id);
    if (updateError) throw updateError;
    await db.from("paypal_orders").update({ status: "COMPLETED", paypal_capture_id: capture.id }).eq("paypal_order_id", orderId);
    return NextResponse.json({ status: "COMPLETED", captureId: capture.id });
  } catch (error) {
    console.error("PayPal capture failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not capture PayPal payment." }, { status: 503 });
  }
}
