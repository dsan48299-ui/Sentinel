"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import PayPalInvoiceButton from "@/components/paypal-invoice-button";

type Invoice = {
  id: string; invoice_number: string; client_name: string; amount: number | string;
  currency: string; due_date: string; status: "PENDING" | "PAID" | "VOID" | "REFUNDED";
  created_at: string;
};

type DiagnosticCheck = {
  id: string;
  label: string;
  status: "ok" | "warning" | "error";
  detail: string;
};

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
const dateLabel = (value: string) => new Date(value + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

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
  const [analystQuestion, setAnalystQuestion] = useState("");
  const [analystAnswer, setAnalystAnswer] = useState("");
  const [analystError, setAnalystError] = useState("");
  const [analystLoading, setAnalystLoading] = useState(false);
  const [systemChecks, setSystemChecks] = useState<DiagnosticCheck[]>([]);
  const [systemCheckLoading, setSystemCheckLoading] = useState(false);
  const [systemCheckError, setSystemCheckError] = useState("");

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

  async function askAnalyst(questionOverride?: string) {
    const question = (questionOverride ?? analystQuestion).trim();
    if (question.length < 3 || analystLoading) return;
    setAnalystQuestion(question); setAnalystLoading(true); setAnalystError(""); setAnalystAnswer("");
    try {
      const response = await fetch("/api/analyst", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await response.json();
      if (response.status === 401) setSignedOut(true);
      if (!response.ok) throw new Error(data.error || "The analyst could not answer right now.");
      setAnalystAnswer(data.answer);
    } catch (err) {
      setAnalystError(err instanceof Error ? err.message : "The analyst could not answer right now.");
    } finally { setAnalystLoading(false); }
  }

  async function runSystemCheck() {
    if (systemCheckLoading || signedOut) return;
    setSystemCheckLoading(true);
    setSystemCheckError("");
    setSystemChecks([]);
    try {
      const response = await fetch("/api/diagnostics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (response.status === 401) setSignedOut(true);
      if (!response.ok) throw new Error(data.error || "Could not run the system check.");

      const checks: DiagnosticCheck[] = Array.isArray(data.checks) ? data.checks : [];
      const analystResponse = await fetch("/api/analyst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: "Confirm that you can read this signed-in invoice workspace. If there are no invoices, say no invoice data is available yet.",
        }),
      });
      const analystData = await analystResponse.json();
      if (analystResponse.status === 401) setSignedOut(true);
      if (analystResponse.ok && typeof analystData.answer === "string" && analystData.answer.trim()) {
        checks.push({
          id: "analyst",
          label: "Authenticated AI analyst",
          status: "ok",
          detail: "The analyst returned a response from this account's invoice ledger using " + (analystData.model || "the configured AI model") + ".",
        });
      } else {
        checks.push({
          id: "analyst",
          label: "Authenticated AI analyst",
          status: "error",
          detail: analystData.error || "The analyst did not return a usable response.",
        });
      }
      setSystemChecks(checks);
    } catch (err) {
      setSystemCheckError(err instanceof Error ? err.message : "The system check could not finish.");
    } finally {
      setSystemCheckLoading(false);
    }
  }

  const prompts = ["What invoices are overdue?", "How much cash is outstanding?", "What should I follow up on first?"];
  const today = new Date().toISOString().slice(0, 10);

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
        <div className="welcome-row"><div><div className="eyebrow">PAYMENTS &amp; RECEIVABLES</div><h1>Your money, in motion.</h1><p className="subhead">Create invoices, collect through PayPal, and understand your receivables with an AI financial analyst.</p></div><div className="welcome-actions">
            <button className="system-check-button" onClick={() => void runSystemCheck()} disabled={signedOut || systemCheckLoading}>{systemCheckLoading ? "Checking…" : "Run system check"}</button>
            <button className="primary-button" onClick={() => setShowCreate(true)} disabled={signedOut}>＋ Create invoice</button>
          </div></div>
        <div className="notice"><span className="notice-dot"/> PayPal Sandbox checkout is available for test transactions when configured. Invoice data is stored in your private workspace.</div>
        {error && <div className="error-banner">{error}</div>}
        {systemCheckError && <div className="error-banner">{systemCheckError}</div>}
        {systemChecks.length > 0 && <section className="panel diagnostics-panel" aria-live="polite">
          <div className="panel-heading">
            <div><h2>System check</h2><p>Live integration checks for your signed-in workspace.</p></div>
            <span className={"diagnostic-summary " + (systemChecks.some(check => check.status === "error") ? "error" : systemChecks.some(check => check.status === "warning") ? "warning" : "ok")}>
              {systemChecks.some(check => check.status === "error") ? "Action needed" : systemChecks.some(check => check.status === "warning") ? "Review warning" : "All checks passed"}
            </span>
          </div>
          <div className="diagnostic-grid">
            {systemChecks.map(check => <article className="diagnostic-item" key={check.id}>
              <div><span className={"diagnostic-dot " + check.status}/><b>{check.label}</b></div>
              <p>{check.detail}</p>
            </article>)}
          </div>
        </section>}
        {signedOut && <div className="setup-card"><h2>Sign in to your private workspace</h2><p>Your invoices and payment history are protected by account authentication.</p><a className="primary-button" href="/login">Sign in with email</a></div>}
        <section className="metric-grid">
          <article className="metric-card"><div className="metric-top"><span>Total received</span><span className="metric-icon green">↗</span></div><div className="metric-value">{money(totals.received)}</div><div className="metric-foot">Confirmed PayPal captures</div></article>
          <article className="metric-card"><div className="metric-top"><span>Outstanding</span><span className="metric-icon blue">▤</span></div><div className="metric-value">{money(totals.outstanding)}</div><div className="metric-foot">Across {invoices.filter(i => i.status === "PENDING").length} unpaid invoices</div></article>
          <article className="metric-card"><div className="metric-top"><span>Overdue</span><span className="metric-icon orange">◷</span></div><div className="metric-value">{money(totals.overdue)}</div><div className="metric-foot">{totals.overdueCount} invoice(s) need follow-up</div></article>
          <article className="metric-card"><div className="metric-top"><span>Invoices paid</span><span className="metric-icon purple">✓</span></div><div className="metric-value">{invoices.filter(i => i.status === "PAID").length}</div><div className="metric-foot">Verified payment records</div></article>
        </section>
        <section className="panel invoices-panel" id="invoices"><div className="panel-heading"><div><h2>Invoices</h2><p>Amounts are retrieved server-side before checkout.</p></div><button className="text-button" onClick={() => setShowCreate(true)} disabled={signedOut}>＋ New invoice</button></div>
          {loading ? <div className="empty-state">Loading your invoices…</div> : invoices.length === 0 ? <div className="empty-state">No invoices yet. Create your first invoice to begin collecting payments.</div> :
          <div className="table-wrap"><table><thead><tr><th>INVOICE</th><th>CLIENT</th><th>DUE DATE</th><th>AMOUNT</th><th>STATUS</th><th>PAYMENT</th></tr></thead><tbody>{invoices.map(inv => <tr key={inv.id}><td className="invoice-id">{inv.invoice_number}</td><td>{inv.client_name}</td><td>{dateLabel(inv.due_date)}</td><td className="amount">{money(Number(inv.amount))}</td><td><span className={"status " + (inv.status === "PENDING" && inv.due_date < today ? "overdue" : inv.status.toLowerCase())}><i/>{inv.status === "PENDING" && inv.due_date < today ? "OVERDUE" : inv.status}</span></td><td>{inv.status === "PENDING" ? <span id="payments"><PayPalInvoiceButton invoiceId={inv.id} onPaid={loadInvoices}/></span> : inv.status === "PAID" ? <span className="confirmed-payment">✓ Captured</span> : inv.status === "REFUNDED" ? <span className="status refunded">REFUNDED</span> : "—"}</td></tr>)}</tbody></table></div>}
        </section>
        <section className="panel analyst-panel" id="analyst">
          <div className="analyst-intro"><div className="analyst-icon">✦</div><div><div className="ai-label">CAPITALFLOW AI ANALYST</div><h2>Ask your financial operations analyst.</h2><p>Get answers grounded in your latest 100 invoices, verified payment statuses, and receivables.</p></div></div>
          <form className="ask-form" onSubmit={event => { event.preventDefault(); void askAnalyst(); }}>
            <input aria-label="Ask CapitalFlow AI" value={analystQuestion} onChange={event => setAnalystQuestion(event.target.value)} placeholder="Ask about overdue invoices, cash flow, or collection priorities…" maxLength={700} disabled={signedOut || analystLoading}/>
            <button type="submit" disabled={signedOut || analystLoading || analystQuestion.trim().length < 3}>{analystLoading ? "Analyzing…" : "Ask analyst"} <span>↗</span></button>
          </form>
          <div className="suggestions">{prompts.map(prompt => <button type="button" key={prompt} onClick={() => void askAnalyst(prompt)} disabled={signedOut || analystLoading}>{prompt}</button>)}</div>
          {analystError && <div className="error-banner">{analystError}</div>}
          {analystLoading && <div className="answer"><b>Reviewing your invoice ledger…</b><p>CapitalFlow AI is checking your latest records before answering.</p></div>}
          {analystAnswer && <div className="answer" aria-live="polite"><b>CapitalFlow AI analysis</b><p>{analystAnswer}</p></div>}
          <div className="insight-bottom"><span>Private, account-scoped invoice context</span><span>AI-generated · Verify before acting</span></div>
        </section>
        <footer>CapitalFlow AI <span>·</span> PayPal Developer Sandbox <span>·</span> Test transactions only</footer>
      </div>
    </section>
    {showCreate && <div className="modal-backdrop" onClick={() => setShowCreate(false)}><form className="modal" onSubmit={createInvoice} onClick={e => e.stopPropagation()}><div className="modal-head"><div><div className="eyebrow">INVOICE WORKFLOW</div><h2>Create an invoice</h2></div><button type="button" className="close-button" onClick={() => setShowCreate(false)}>×</button></div><label>Client name<input autoFocus value={client} onChange={e => setClient(e.target.value)} placeholder="e.g. Acme Studio" required maxLength={120}/></label><label>Amount (USD)<input type="number" min="0.01" max="1000000" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="2500.00" required/></label><label>Due date<input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required/></label><div className="modal-note">Invoices are saved to your private workspace. PayPal checkout uses the saved invoice amount.</div><button className="primary-button full" type="submit" disabled={saving}>{saving ? "Saving…" : "Create invoice"}</button></form></div>}
    <style jsx global>{`.paypal-button-wrap{min-width:145px;max-width:190px}.paypal-button-wrap iframe{z-index:1}.payment-error{display:block;color:#b54747;font-size:10px}.payment-setup{font-size:10px;color:#a17a3d}.confirmed-payment{font-size:10px;color:#25815f;font-weight:700}.error-banner{padding:12px 14px;background:#fff0ef;color:#a33b35;border:1px solid #f2d3d0;border-radius:7px;margin-bottom:14px}.empty-state{padding:28px 12px;color:#8996a0;text-align:center;font-size:12px}.setup-card{padding:22px;background:#fff;border:1px solid var(--line);border-radius:9px;margin-bottom:16px}.setup-card h2{margin:0 0 6px;font:700 16px Manrope}.setup-card p{color:#85929d;font-size:12px}.setup-card a{display:inline-flex;text-decoration:none}.signout-link{font-size:11px;color:#527da5;text-decoration:none}.ask-form button:disabled,.suggestions button:disabled{opacity:.55;cursor:not-allowed}.answer{white-space:normal}.answer p{white-space:pre-wrap}.status.refunded{background:#fff1f0;color:#b65d56}
.welcome-actions{display:flex;align-items:center;gap:12px;flex-shrink:0}.system-check-button{border:1px solid #dbe6ef;background:#fff;color:#426c8b;border-radius:6px;padding:10px 12px;font:600 10px 'DM Sans';cursor:pointer;white-space:nowrap}.system-check-button:disabled{opacity:.55;cursor:wait}.diagnostics-panel{margin:14px 0 16px}.diagnostic-summary{display:inline-flex;align-items:center;border-radius:20px;padding:6px 9px;font-size:9px;font-weight:700;white-space:nowrap}.diagnostic-summary.ok{background:#eaf7f1;color:#28815f}.diagnostic-summary.warning{background:#fff7e9;color:#a97831}.diagnostic-summary.error{background:#fff0ef;color:#aa4942}.diagnostic-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:13px}.diagnostic-item{border:1px solid #e8edf1;border-radius:7px;padding:11px 12px;background:#fff}.diagnostic-item>div{display:flex;align-items:center;gap:7px}.diagnostic-item b{font-size:10px;color:#425a6b}.diagnostic-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}.diagnostic-dot.ok{background:#32956f}.diagnostic-dot.warning{background:#d59a46}.diagnostic-dot.error{background:#c65c55}.diagnostic-item p{font-size:10px;line-height:1.5;color:#87949e;margin:7px 0 0}@media(max-width:760px){.welcome-actions{flex-direction:column;align-items:flex-end;gap:6px}.system-check-button{font-size:9px;padding:8px 9px}.diagnostic-grid{grid-template-columns:1fr}}`}</style>
  </main>;
}
