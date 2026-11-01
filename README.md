# CapitalFlow AI

**An AI-powered receivables and payment operations workspace for small businesses.**

CapitalFlow AI helps small businesses issue invoices, collect payments through PayPal Checkout Sandbox, reconcile confirmed payment events, and ask an AI analyst questions grounded in their actual invoice ledger.

## Product capabilities

- Private email magic-link authentication with Supabase Auth.
- Account-scoped invoice creation and retrieval.
- PayPal Checkout Buttons using the PayPal JavaScript SDK in Sandbox.
- Server-side PayPal OAuth 2.0 and Orders v2 create/capture endpoints.
- The browser sends only an invoice ID; the server retrieves the authoritative amount and verifies invoice ownership.
- Captures are checked for completed status, invoice reference, currency, and amount before an invoice is marked paid.
- PayPal webhook signature verification and duplicate-event protection.
- Payment ledger tables for PayPal orders and webhook events.
- AI financial operations analyst powered by Vercel AI Gateway. The analyst reads only the signed-in user's latest 100 invoices and distinguishes confirmed receipts from pending and overdue receivables.
- Server-only Supabase service-role access. No public table policies are created.

## Stack

- Next.js 15 / React 19 / TypeScript
- PayPal REST Orders v2 + JavaScript SDK
- Supabase Auth + Postgres
- Vercel AI Gateway (OpenAI-compatible Chat Completions API)
- Vercel

## Setup

### 1. Supabase

Create a Supabase project. In its SQL Editor, run:

\`supabase/migrations/202610310001_capitalflow_payments.sql\`

Enable Email OTP / magic-link authentication. In Supabase Authentication → URL Configuration, set the deployed app URL as the Site URL and add these allowed redirect URLs:

- \`https://YOUR_DOMAIN/auth/callback\`
- \`http://localhost:3000/auth/callback\`

Use the exact production domain configured in Vercel.

### 2. PayPal Sandbox

In the PayPal Developer Dashboard, create a REST app in Sandbox and copy its Client ID and Secret. Set the Sandbox Client ID as \`NEXT_PAYPAL_CLIENT_ID\`. Keep \`PAYPAL_CLIENT_SECRET\` server-side only.

Set \`PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com\`.

After deployment, create a PayPal webhook for:

- \`PAYMENT.CAPTURE.COMPLETED\`
- \`PAYMENT.CAPTURE.DENIED\`
- \`PAYMENT.CAPTURE.REFUNDED\`
- \`PAYMENT.CAPTURE.REVERSED\`

Use \`https://YOUR_DOMAIN/api/paypal/webhook\` as the webhook URL and save the webhook ID as \`PAYPAL_WEBHOOK_ID\`.

### 3. AI analyst

The hosted application calls Vercel AI Gateway from a server-side route. On Vercel deployments, the route uses the request-scoped Vercel OIDC token; no provider API key is exposed to the browser.

The default model is \`openai/gpt-5.5\`. Override it with \`CAPITALFLOW_AI_MODEL\` if needed. AI Gateway inference is usage-billed; configure an appropriate budget in Vercel before enabling real user traffic.

For local development, create an AI Gateway API key in the Vercel dashboard and set \`AI_GATEWAY_API_KEY\` in \`.env.local\`. Never expose it with a \`NEXT_PUBLIC_\` prefix.

The analyst is grounded in invoice records only. It does not have access to bank accounts, expenses, payroll, or external accounting systems, and it must not be presented as a complete cash-flow forecast.

### 4. Environment variables

Add these to Vercel Project Settings → Environment Variables for Preview and Production as appropriate:

| Variable | Purpose |
|---|---|
| \`NEXT_SUPABASE_URL\` | Supabase project URL |
| \`NEXT_SUPABASE_ANON_KEY\` | Supabase public anon key |
| \`SUPABASE_SERVICE_ROLE_KEY\` | Supabase server-only service role key |
| \`NEXT_PAYPAL_CLIENT_ID\` | PayPal Sandbox app client ID |
| \`PAYPAL_CLIENT_SECRET\` | PayPal Sandbox app secret |
| \`PAYPAL_BASE_URL\` | Optional Sandbox API URL (defaults to Sandbox) |
| \`PAYPAL_WEBHOOK_ID\` | PayPal webhook ID |
| \`CAPITALFLOW_AI_MODEL\` | Optional Vercel AI Gateway model ID |
| \`AI_GATEWAY_API_KEY\` | Optional local-development AI Gateway key |

Never commit real credentials or expose the service-role key, PayPal secret, or AI Gateway key to the browser.

### 5. Run locally

\`\`\`bash
npm install
cp .env.example .env.local
npm run dev
\`\`\`

## Payment lifecycle

1. A signed-in user creates an invoice. Supabase stores it under that user's ID.
2. The PayPal button sends only the invoice ID to the server.
3. The server verifies ownership and retrieves the authoritative amount from Supabase.
4. The server creates a PayPal Orders v2 order with the invoice reference.
5. After buyer approval, the server captures the order and checks PayPal's completed capture, invoice reference, currency, and amount.
6. Only then does the invoice become PAID. Verified PayPal webhooks provide asynchronous reconciliation and record duplicate events safely.

## Security notes

- All invoice API operations require a valid Supabase user session and scope records to that user.
- Supabase service-role and PayPal credentials are server-only.
- The browser receives only the Supabase anon key and PayPal client ID from the same-origin client configuration endpoint.
- PayPal payment amounts are read from the database, never trusted from the browser.
- Webhook events are signature-verified with PayPal before processing.
- The AI analyst receives only the authenticated user's invoice records, not another user's workspace.

## Scope and limitations

This is a **Sandbox integration**. It does not move live money. Production use requires a security review, a production PayPal app, production webhook registration, merchant onboarding, and testing for refunds, disputes, chargebacks, and operational recovery. The AI analyst is an invoice-based operations assistant, not a bank-connected accounting system or financial adviser.

## Hackathon

Built for the **PayPal AI Hackathon**. [PayPal Developer](https://developer.paypal.com/) · [Checkout integration](https://developer.paypal.com/studio/checkout/standard/integrate) · [Security guidelines](https://developer.paypal.com/security-guidelines).

## License

MIT. See [LICENSE](LICENSE).
