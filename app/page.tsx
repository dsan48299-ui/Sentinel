"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import PayPalInvoiceButton from "@/components/paypal-invoice-button";

type Invoice = {
  id: string; invoice_number: string; client_name: string; amount: number | string;
  currency: string; due_date: string; status: "PENDING" | "PAID" | "VOID" | "REFUNDED";
  created_at: string;
};

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
const dateLabel = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default function Home() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signedOut, setSignedOut] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [client, setClient] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState("Overview");

  const loadInvoices = useCallback(async () => {
    setLoading(true); setError(""); setSignedOut(false);
    try {
      const response = await fetch("/api/invoices", { cache: "no-store" });
      const data = await response.json();
      if (response.status === 401) { setSignedOut(true); return; }
      if (!response.ok) throw new Error(data.error || "Could not load invoices.");
      setInvoices(data.invoices || []);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not load workspace."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadInvoices(); }, [loadInvoices]);

  const totals = useMemo(() => {
    const received = invoices.filter(i => i.status === "PAID").reduce((s, i) => s + Number(i.amount), 0);
    const outstanding = invoices.filter(i => i.status === "PENDING").reduce((s, i) => s + Number(i.amount), 0);
    const overdueItems = invoices.filter(i => i.status === "PENDING" && i.due_date < new Date().toISOString().slice(0, 10));
    return { received, outstanding, overdue: overdueItems.reduce((s, i) => s + Number(i.amount), 0), overdueCount: overdueItems.length };
  }, [invoices]);

  async function createInvoice(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch("/api/invoices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientName: client, amount, dueDate }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create invoice.");
      setInvoices(current => [data.invoice, ...current]); setClient(""); setAmount(""); setShowCreate(false);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not create invoice."); }
    finally { setSaving(false); }
  }

  return <main className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">C</div><div><strong>capitalflow<span>ai</span></strong><small>FINANCE COMMAND CENTER</small></div></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav>{["Overview", "Invoices", "Payments"].map(item => <button key={item} className={active === item ? "nav-item selected" : "nav-item"} onClick={() => { setActive(item); document.getElementById(item === "Invoices" ? "invoices" : item === "Payments" ? "payments" : "overview")?.scrollIntoView({ behavior: "smooth" }); }}>{item}</button>)}</nav>
      <div className="sidebar-bottom"><div className="profile"><div className="avatar">CF</div><div><strong>Private workspace</strong><small>Authenticated account</small></div></div></div>
    </aside>
    <section className="main">
      <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <b>{active}</b></div><div className="top-actions"><span className="demo-pill"><i/> PAYPAL SANDBOX</span><a className="signout-link" href="/login">Account</a></div></header>
      <div className="content" id="overview">
        <div className="welcome-row"><div><div className="eyebrow">PAYMENTS &amp; RECEIVABLES</div><h1>Your money, in motion.</h1><p className="subhead">Create invoices, collect through PayPal, and track confirmed payments in one workspace.</p></div><button className="primary-button" onClick={() => setShowCreate(true)}>＋ Create invoice</button></div>
        <div className="notice"><span className="notice-dot"/> "PayPal Sandbox checkout is available for test transactions when configured." Invoice data is stored in your private workspace.</div>
        {error && <div className="error-banner">{error}</div>}
        {signedOut && <div className="setup-card"><h2>Sign in to your private workspace</h2><p>Your invoices and payment history are protected by account authentication.</p><a className="primary-button" href="/login">Sign in with email</a></div>}
        <section className="metric-grid">
          <article className="metric-card"><div className="metric-top"><span>Total received</span><span className="metric-icon green">↗</span></div><div className="metric-value">{money(totals.received)}</div><div className="metric-foot">Confirmed PayPal captures</div></article>
          <article className="metric-card"><div className="metric-top"><span>Outstanding</span><span className="metric-icon blue">▤</span></div><div className="metric-value">{money(totals.outstanding)}</div><div className="metric-foot">Across {invoices.filter(i => i.status === "PENDING").length} unpaid invoices</div></article>
          <article className="metric-card"><div className="metric-top"><span>Overdue</span><span className="metric-icon orange">◷</span></div><div className="metric-value">{money(totals.overdue)}</div><div className="metric-foot">{totals.overdueCount} invoice(s) need follow-up</div></article>
          <article className="metric-card"><div className="metric-top"><span>Invoices paid</span><span className="metric-icon purple">✓</span></div><div className="metric-value">{invoices.filter(i => i.status === "PAID").length}</div><div className="metric-foot">Verified payment records</div></article>
        </section>
        <section className="panel invoices-panel" id="invoices"><div className="panel-heading"><div><h2>Invoices</h2><p>Amounts are retrieved server-side before checkout.</p></div><button className="text-button" onClick={() => setShowCreate(true)}>＋ New invoice</button></div>
          {loading ? <div className="empty-state">Loading your invoices…</div> : invoices.length === 0 ? <div className="empty-state">No invoices yet. Create your first invoice to begin collecting payments.</div> :
          <div className="table-wrap"><table><thead><tr><th>INVOICE</th><th>CLIENT</th><th>DUE DATE</th><th>AMOUNT</th><th>STATUS</th><th>PAYMENT</th></tr></thead><tbody>{invoices.map(inv => <tr key={inv.id}><td className="invoice-id">{inv.invoice_number}</td><td>{inv.client_name}</td><td>{dateLabel(inv.due_date)}</td><td className="amount">{money(Number(inv.amount))}</td><td><span className={"status " + inv.status.toLowerCase()}><i/>{inv.status}</span></td><td>{inv.status === "PENDING" ? <span id="payments"><PayPalInvoiceButton invoiceId={inv.id} onPaid={loadInvoices}/></span> : inv.status === "PAID" ? <span className="confirmed-payment">✓ Captured</span> : "—"}</td></tr>)}</tbody></table></div>}
        </section>
        <section className="panel analyst-panel"><div className="analyst-intro"><div className="analyst-icon">✦</div><div><div className="ai-label">PAYMENT OPERATIONS</div><h2>Payment status comes from PayPal, not the browser.</h2><p>Order creation and capture run on the server. Confirmed captures update the invoice ledger.</p></div></div></section>
        <footer>CapitalFlow AI <span>·</span> PayPal Developer Sandbox <span>·</span> Test transactions only</footer>
      </div>
    </section>
    {showCreate && <div className="modal-backdrop" onClick={() => setShowCreate(false)}><form className="modal" onSubmit={createInvoice} onClick={e => e.stopPropagation()}><div className="modal-head"><div><div className="eyebrow">INVOICE WORKFLOW</div><h2>Create an invoice</h2></div><button type="button" className="close-button" onClick={() => setShowCreate(false)}>×</button></div><label>Client name<input autoFocus value={client} onChange={e => setClient(e.target.value)} placeholder="e.g. Acme Studio" required maxLength={120}/></label><label>Amount (USD)<input type="number" min="0.01" max="1000000" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="2500.00" required/></label><label>Due date<input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required/></label><div className="modal-note">Invoices are saved to your private workspace. PayPal checkout uses the saved invoice amount.</div><button className="primary-button full" type="submit" disabled={saving}>{saving ? "Saving…" : "Create invoice"}</button></form></div>}
    <style jsx global>{`.paypal-button-wrap{min-width:145px;max-width:190px}.paypal-button-wrap iframe{z-index:1}.payment-error{display:block;color:#b54747;font-size:10px}.payment-setup{font-size:10px;color:#a17a3d}.confirmed-payment{font-size:10px;color:#25815f;font-weight:700}.error-banner{padding:12px 14px;background:#fff0ef;color:#a33b35;border:1px solid #f2d3d0;border-radius:7px;margin-bottom:14px}.empty-state{padding:28px 12px;color:#8996a0;text-align:center;font-size:12px}.setup-card{padding:22px;background:#fff;border:1px solid var(--line);border-radius:9px;margin-bottom:16px}.setup-card h2{margin:0 0 6px;font:700 16px Manrope}.setup-card p{color:#85929d;font-size:12px}.setup-card a{display:inline-flex;text-decoration:none}.signout-link{font-size:11px;color:#527da5;text-decoration:none}`}</style>
  </main>;
}
