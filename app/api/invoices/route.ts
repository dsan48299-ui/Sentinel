import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getAuthenticatedUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Sign in to view your workspace." }, { status: 401 });
  try {
    const db = getSupabaseAdmin();
    const { data, error } = await db.from("invoices")
      .select("id,invoice_number,client_name,amount,currency,due_date,status,paypal_order_id,created_at")
      .eq("owner_id", user.id).order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    return NextResponse.json({ invoices: data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Invoice list failed", error);
    return NextResponse.json({ error: "Invoice storage is unavailable. Check database setup." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Sign in before creating invoices." }, { status: 401 });
  try {
    const body = await request.json().catch(() => null);
    const clientName = typeof body?.clientName === "string" ? body.clientName.trim().slice(0, 120) : "";
    const amount = Number(body?.amount);
    const amountCents = Math.round(amount * 100);
    const dueDate = typeof body?.dueDate === "string" && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(body.dueDate) ? body.dueDate : null;
    const validDueDate = dueDate && !Number.isNaN(Date.parse(dueDate + "T00:00:00Z"))
      && new Date(dueDate + "T00:00:00Z").toISOString().slice(0, 10) === dueDate;
    if (!clientName || !Number.isFinite(amount) || Math.abs(amount * 100 - amountCents) > 0.000001 || amountCents < 1 || amountCents > 100000000 || !validDueDate) {
      return NextResponse.json({ error: "Enter a client, a valid amount with up to two decimal places, and a valid due date." }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    const invoiceNumber = "CF-" + randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
    const { data, error } = await db.from("invoices").insert({
      owner_id: user.id,
      invoice_number: invoiceNumber,
      client_name: clientName,
      amount: (amountCents / 100).toFixed(2),
      currency: "USD",
      due_date: dueDate,
      status: "PENDING",
    }).select("id,invoice_number,client_name,amount,currency,due_date,status,paypal_order_id,created_at").single();
    if (error) throw error;
    return NextResponse.json({ invoice: data }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Invoice creation failed", error);
    return NextResponse.json({ error: "Could not save the invoice. Check database setup." }, { status: 503 });
  }
}
