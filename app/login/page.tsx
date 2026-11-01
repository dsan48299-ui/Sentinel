"use client";

import { FormEvent, useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

const PRODUCTION_APP_URL = "https://capitalflow-ai-flame.vercel.app";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("error");
    if (code === "configuration") setMessage("Sign-in is not configured yet. Please contact the workspace administrator.");
    else if (code) setMessage("That sign-in link could not be verified or has expired. Request a new link and try again.");
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setMessage("");
    try {
      const supabase = await getSupabaseBrowser();
      const isLocalDevelopment = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      const appUrl = isLocalDevelopment ? window.location.origin : PRODUCTION_APP_URL;
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: appUrl + "/auth/callback" },
      });
      if (error) throw error;
      setMessage("Check your email for a new secure sign-in link. Open the newest email; older links may have an outdated redirect.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send sign-in link.");
    } finally { setBusy(false); }
  }

  return <main className="auth-shell"><form className="auth-card" onSubmit={submit}>
    <div className="brand-mark">C</div><div className="eyebrow">CAPITALFLOW AI</div>
    <h1>Sign in to your workspace</h1><p>Your invoices and payment records are private to your account.</p>
    <label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" required autoComplete="email"/></label>
    <button className="primary-button full" disabled={busy}>{busy ? "Sending link…" : "Email me a secure sign-in link"}</button>
    {message && <p className="auth-message" role="status">{message}</p>}
    <a href="/">Back to dashboard</a>
  </form></main>;
}
