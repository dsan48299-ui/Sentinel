import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { paypalRequest } from "@/lib/paypal";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { invoiceId } = await request.json();
    if (typeof invoiceId !== "string" || !invoiceId) return NextResponse.json({ error: "Invoice is required." }, { status: 400 });
    const db = getSupabaseAdmin();
    const { data: invoice, error } = await db.from("invoices").select("id,invoice_number,client_name,amount,currency,status").eq("id", invoiceId).single();
    if (error || !invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    if (invoice.status === "PAID") return NextResponse.json({ error: "This invoice has already been paid." }, { status: 409 });
    const requestId = randomUUID();
    const order = await paypalRequest("/v2/checkout/orders", "POST", {
      intent: "CAPTURE",
      purchase_units: [{
        reference_id: invoice.id,
        custom_id: invoice.id,
        invoice_id: invoice.invoice_number,
        description: `Invoice ${invoice.invoice_number} — ${invoice.client_name}`,
        amount: { currency_code: invoice.currency, value: Number(invoice.amount).toFixed(2) },
      }],
      payment_source: { paypal: { experience_context: { user_action: "PAY_NOW", shipping_preference: "NO_SHIPPING" } } },
    }, requestId);
    const { error: saveError } = await db.from("paypal_orders").upsert({
      paypal_order_id: order.id, invoice_id: invoice.id, status: order.status || "CREATED",
    }, { onConflict: "paypal_order_id" });
    if (saveError) throw saveError;
    return NextResponse.json({ id: order.id });
  } catch (error) {
    console.error("PayPal order creation failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not start PayPal checkout." }, { status: 503 });
  }
}
