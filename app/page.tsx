"use client";

import { useMemo, useState } from "react";

type Invoice = { id: string; client: string; due: string; amount: number; status: "Paid" | "Pending" | "Overdue" };

const initialInvoices: Invoice[] = [
  { id: "INV-2048", client: "Northstar Studio", due: "Oct 29, 2026", amount: 4850, status: "Paid" },
  { id: "INV-2047", client: "Meridian Works", due: "Nov 02, 2026", amount: 7200, status: "Pending" },
  { id: "INV-2046", client: "Atlas Creative", due: "Oct 24, 2026", amount: 2150, status: "Overdue" },
  { id: "INV-2045", client: "Field & Form", due: "Nov 05, 2026", amount: 3600, status: "Pending" }
];

const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    grid: "M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z",
    invoice: "M6 2h9l4 4v16H6z M14 2v5h5 M9 12h7 M9 16h7",
    chart: "M4 19V5 M4 19h17 M8 15l3-4 3 2 5-7",
    spark: "m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z",
    settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.7 2.9-.2-.1a1.7 1.7 0 0 0-1.8.2l-.2.1h-3.4l-.1-.2a1.7 1.7 0 0 0-1.6-1l-.2.1-2.9-1.7.1-.2a1.7 1.7 0 0 0-.2-1.8l-.1-.2v-3.4l.2-.1a1.7 1.7 0 0 0 1-1.6l-.1-.2 1.7-2.9.2.1a1.7 1.7 0 0 0 1.8-.2l.2-.1h3.4l.1.2a1.7 1.7 0 0 0 1.6 1l.2-.1 2.9 1.7-.1.2a1.7 1.7 0 0 0 .2 1.8l.1.2v3.4z",
    arrow: "M5 12h14 M13 6l6 6-6 6",
    plus: "M12 5v14 M5 12h14",
    bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4",
    wallet: "M3 6.5A2.5 2.5 0 0 1 5.5 4H20v16H5.5A2.5 2.5 0 0 1 3 17.5z M3 8h17 M16 13h4",
    clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v6l4 2",
    check: "m5 12 4 4L19 6"
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={paths[name] || paths.grid} /></svg>;
}

export default function Home() {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [active, setActive] = useState("Overview");
  const [showCreate, setShowCreate] = useState(false);
  const [client, setClient] = useState("");
  const [amount, setAmount] = useState("");
  const [notice, setNotice] = useState("Demo workspace · Sample data");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const outstanding = useMemo(() => invoices.filter(i => i.status !== "Paid").reduce((s, i) => s + i.amount, 0), [invoices]);
  const overdue = useMemo(() => invoices.filter(i => i.status === "Overdue").reduce((s, i) => s + i.amount, 0), [invoices]);

  function createInvoice(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!client.trim() || !Number.isFinite(value) || value <= 0) return;
    setInvoices([{ id: `INV-${2050 + invoices.length}`, client: client.trim(), due: "Nov 10, 2026", amount: value, status: "Pending" }, ...invoices]);
    setClient(""); setAmount(""); setShowCreate(false);
    setNotice("Invoice added to this demo session. PayPal checkout is not connected yet.");
  }

  function askAnalyst(e: React.FormEvent) {
    e.preventDefault();
    const q = question.toLowerCase();
    if (q.includes("overdue")) setAnswer(`You have ${money(overdue)} overdue across ${invoices.filter(i => i.status === "Overdue").length} invoice. Start by following up with the client on the oldest outstanding item.`);
    else if (q.includes("outstanding") || q.includes("unpaid")) setAnswer(`Your current unpaid invoice total is ${money(outstanding)} across ${invoices.filter(i => i.status !== "Paid").length} invoices. This figure is based on the sample data in this demo.`);
    else setAnswer(`I can summarize the demo workspace: ${money(outstanding)} is outstanding and ${money(overdue)} is overdue. Once the AI service is connected, I will answer using verified business records and show the underlying transactions.`);
  }

  return <main className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">C</div><div><strong>capitalflow<span>ai</span></strong><small>FINANCE COMMAND CENTER</small></div></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav>{[{label:"Overview",icon:"grid"},{label:"Invoices",icon:"invoice"},{label:"Cash flow",icon:"chart"},{label:"AI analyst",icon:"spark"}].map(item =>
        <button key={item.label} className={active===item.label?"nav-item selected":"nav-item"} onClick={()=>{setActive(item.label); if(item.label==="AI analyst") document.getElementById("analyst")?.scrollIntoView({behavior:"smooth"}); if(item.label==="Invoices") document.getElementById("invoices")?.scrollIntoView({behavior:"smooth"});}}>
          <Icon name={item.icon}/>{item.label}{item.label==="Invoices" && <span className="nav-count">{invoices.length}</span>}
        </button>)}</nav>
      <div className="sidebar-bottom"><button className="nav-item"><Icon name="settings"/>Settings</button><div className="profile"><div className="avatar">DC</div><div><strong>Demo Company</strong><small>Starter workspace</small></div><span className="dots">···</span></div></div>
    </aside>
    <section className="main">
      <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <b>{active}</b></div><div className="top-actions"><span className="demo-pill"><i/> SANDBOX PREVIEW</span><button className="icon-button" aria-label="Notifications"><Icon name="bell"/></button><div className="avatar small">DC</div></div></header>
      <div className="content">
        <div className="welcome-row"><div><div className="eyebrow">SATURDAY, OCTOBER 31, 2026</div><h1>Your money, in motion.</h1><p className="subhead">A clear view of what came in, what is outstanding, and what needs your attention.</p></div><button className="primary-button" onClick={()=>setShowCreate(true)}><Icon name="plus"/> Create invoice</button></div>
        <div className="notice"><span className="notice-dot"/> {notice}</div>
        <section className="metric-grid">
          <article className="metric-card"><div className="metric-top"><span>Total received</span><span className="metric-icon green"><Icon name="wallet"/></span></div><div className="metric-value">$28,450</div><div className="metric-foot"><span className="trend">↗ 12.8%</span><span>vs. previous month</span></div><div className="sparkline"><i style={{height:"25%"}}/><i style={{height:"42%"}}/><i style={{height:"35%"}}/><i style={{height:"58%"}}/><i style={{height:"48%"}}/><i style={{height:"72%"}}/><i style={{height:"63%"}}/><i style={{height:"88%"}}/><i style={{height:"76%"}}/><i style={{height:"100%"}}/></div></article>
          <article className="metric-card"><div className="metric-top"><span>Outstanding</span><span className="metric-icon blue"><Icon name="invoice"/></span></div><div className="metric-value">{money(outstanding)}</div><div className="metric-foot"><span className="muted">Across {invoices.filter(i=>i.status!=="Paid").length} unpaid invoices</span></div><div className="metric-bar"><i style={{width:"68%"}}/></div><div className="metric-caption">Expected collections</div></article>
          <article className="metric-card"><div className="metric-top"><span>Overdue</span><span className="metric-icon orange"><Icon name="clock"/></span></div><div className="metric-value">{money(overdue)}</div><div className="metric-foot"><span className="attention">Needs attention</span><span>· 1 invoice</span></div><div className="metric-caption">Follow-up recommended</div></article>
          <article className="metric-card"><div className="metric-top"><span>Paid invoices</span><span className="metric-icon purple"><Icon name="check"/></span></div><div className="metric-value">{invoices.filter(i=>i.status==="Paid").length}</div><div className="metric-foot"><span className="muted">Successful payments</span></div><div className="metric-caption">Updated in this demo session</div></article>
        </section>
        <section className="middle-grid">
          <article className="panel cash-panel"><div className="panel-heading"><div><h2>Cash flow overview</h2><p>Monthly inflow · sample figures</p></div><button className="select-button">Last 6 months⌄</button></div><div className="chart-legend"><span><i className="legend-blue"/> Inflow</span><span><i className="legend-gray"/> Outflow</span></div><div className="chart"><div className="y-labels"><span>$12k</span><span>$8k</span><span>$4k</span><span>$0</span></div><div className="chart-area"><div className="gridline one"/><div className="gridline two"/><div className="gridline three"/><div className="gridline four"/><div className="bars">{[{a:55,b:35},{a:70,b:42},{a:48,b:30},{a:82,b:46},{a:66,b:38},{a:94,b:53}].map((v,i)=><div className="bar-group" key={i}><i className="bar inflow" style={{height:v.a+"%"}}/><i className="bar outflow" style={{height:v.b+"%"}}/></div>)}</div><div className="x-labels"><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span></div></div></div></article>
          <article className="panel insight-panel"><div className="panel-heading"><div><div className="ai-label"><Icon name="spark"/> CAPITALFLOW INSIGHT</div><h2>What needs your attention?</h2></div><span className="insight-orb">✦</span></div><div className="insight-highlight"><span className="attention-dot"/> COLLECTION OPPORTUNITY</div><h3>One invoice is past due.</h3><p>Atlas Creative has an outstanding balance of <b>$2,150</b>. A friendly follow-up could help keep your cash flow on track.</p><button className="text-button" onClick={()=>{setActive("Invoices");document.getElementById("invoices")?.scrollIntoView({behavior:"smooth"});}}>Review invoice <Icon name="arrow"/></button><div className="insight-divider"/><div className="insight-bottom"><span>AI-powered insights</span><span className="coming-soon">COMING SOON</span></div></article>
        </section>
        <section className="panel invoices-panel" id="invoices"><div className="panel-heading"><div><h2>Recent invoices</h2><p>Keep track of payments and follow-ups</p></div><button className="text-button" onClick={()=>setShowCreate(true)}>New invoice <Icon name="arrow"/></button></div><div className="table-wrap"><table><thead><tr><th>INVOICE</th><th>CLIENT</th><th>DUE DATE</th><th>AMOUNT</th><th>STATUS</th><th/></tr></thead><tbody>{invoices.slice(0,5).map(inv=><tr key={inv.id}><td className="invoice-id">{inv.id}</td><td><div className="client-cell"><span className="client-avatar">{inv.client.slice(0,1)}</span>{inv.client}</div></td><td>{inv.due}</td><td className="amount">{money(inv.amount)}</td><td><span className={"status "+inv.status.toLowerCase()}><i/>{inv.status}</span></td><td><button className="more-button" aria-label={"More actions for "+inv.id}>···</button></td></tr>)}</tbody></table></div><div className="table-footer">Showing {Math.min(invoices.length,5)} of {invoices.length} invoices <span>Demo records only</span></div></section>
        <section className="panel analyst-panel" id="analyst"><div className="analyst-intro"><div className="analyst-icon"><Icon name="spark"/></div><div><div className="ai-label">YOUR AI FINANCIAL ANALYST</div><h2>Ask a better question about your business.</h2><p>Explore your demo cash-flow data with a few quick questions.</p></div></div><form className="ask-form" onSubmit={askAnalyst}><input value={question} onChange={e=>setQuestion(e.target.value)} placeholder="e.g. How much money is currently outstanding?" aria-label="Ask the financial analyst"/><button type="submit" disabled={!question.trim()}>Ask analyst <Icon name="arrow"/></button></form>{answer && <div className="answer"><b>Demo analyst</b><p>{answer}</p></div>}<div className="suggestions"><button onClick={()=>setQuestion("How much is outstanding?")}>What's outstanding?</button><button onClick={()=>setQuestion("Which invoices are overdue?")}>Show overdue invoices</button><button onClick={()=>setQuestion("Summarize my cash flow")}>Summarize cash flow</button></div></section>
        <footer>CapitalFlow AI <span>·</span> Built for the PayPal AI Hackathon <span>·</span> Demo data — no live payments processed</footer>
      </div>
    </section>
    {showCreate && <div className="modal-backdrop" onClick={()=>setShowCreate(false)}><form className="modal" onSubmit={createInvoice} onClick={e=>e.stopPropagation()}><div className="modal-head"><div><div className="eyebrow">INVOICE WORKFLOW</div><h2>Create an invoice</h2></div><button type="button" className="close-button" onClick={()=>setShowCreate(false)}>×</button></div><label>Client name<input autoFocus value={client} onChange={e=>setClient(e.target.value)} placeholder="e.g. Acme Studio" required/></label><label>Amount (USD)<input type="number" min="0.01" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="2500.00" required/></label><div className="modal-note">This creates a local demo invoice only. PayPal checkout will be connected in a later milestone.</div><button className="primary-button full" type="submit">Add demo invoice <Icon name="arrow"/></button></form></div>}
  </main>;
}
