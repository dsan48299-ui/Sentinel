# CapitalFlow AI

**An AI-powered payment and cash-flow command center for small businesses.**

CapitalFlow AI is being developed for the PayPal AI Hackathon. The current milestone adds authenticated workspaces, persisted invoices, PayPal Checkout Sandbox order creation/capture, and webhook signature verification.

## Implemented in this milestone

- Email magic-link authentication with Supabase Auth.
- Invoice creation and retrieval from Supabase.
- PayPal Checkout Buttons using the PayPal JavaScript SDK.
- Server-side PayPal OAuth 2.0 and Orders v2 create/capture endpoints.
- Server loads the invoice amount from the database; the browser never supplies the payable amount.
- Capture response is checked for completed status, invoice reference, currency, and amount before marking an invoice paid.
- PayPal webhook signature verification through PayPal's verification API.
- Payment ledger tables and idempotent webhook event storage.
- Server-only Supabase service-role access; no public table policies.

## Stack

- Next.js 15 / React 19 / TypeScript
- PayPal REST Orders v2 + JavaScript SDK
- Supabase Auth + Postgres
- Vercel

## Setup

### 1. Supabase

Create a Supabase project. In its SQL Editor, run:

`supabase/migrations/202610310001_capitalflow_payments.sql`

Enable Email OTP / magic-link authentication. Add your deployed app URL and local development URL to Supabase Auth's allowed redirect URLs.

### 2. PayPal Sandbox

In the PayPal Developer Dashboard, create a REST app in Sandbox and copy its Client ID and Secret. Set the same Client ID in both `PAYPAL_CLIENT_ID` and `NEXT_PUBLIC_PAYPAL_CLIENT_ID`. Keep `PAYPAL_CLIENT_SECRET` server-side only.

Set `PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com`.

After deployment, create a PayPal webhook for:

- `PAYMENT.CAPTURE.COMPLETED`
- `PAYMENT.CAPTURE.DENIED`
- `PAYMENT.CAPTURE.REFUNDED`
- `PAYMENT.CAPTURE.REVERSED`

Use `https://YOUR_DOMAIN/api/paypal/webhook` as the webhook URL and save the webhook ID as `PAYPAL_WEBHOOK_ID`.

### 3. Environment variables

Add these to Vercel Project Settings → Environment Variables for Preview and Production as appropriate:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase server-only service role key |
| `PAYPAL_CLIENT_ID` | PayPal Sandbox REST app client ID |
| `PAYPAL_CLIENT_SECRET` | PayPal Sandbox REST app secret |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | Same Sandbox client ID for PayPal JS SDK |
| `PAYPAL_BASE_URL` | Sandbox API URL |
| `PAYPAL_WEBHOOK_ID` | PayPal webhook ID |

Never commit real credentials or expose the service role key / PayPal secret with a `NEXT_PUBLIC_` prefix.

### 4. Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Payment lifecycle

1. A signed-in user creates an invoice. Supabase stores it under that user's ID.
2. The PayPal button sends only the invoice ID to the server.
3. The server verifies ownership and retrieves the authoritative amount from Supabase.
4. The server creates a PayPal Orders v2 order with that invoice reference.
5. After buyer approval, the server captures the order and checks PayPal's completed capture, invoice reference, currency, and amount.
6. Only then does the invoice become PAID. Verified PayPal webhooks provide asynchronous reconciliation.

## Current scope and limitations

This is a **Sandbox integration**. It does not move live money. Production use still requires a security review, a production PayPal app, production webhook registration, merchant onboarding, and testing for refunds, disputes, chargebacks, and operational recovery. The AI financial analyst and richer reporting are future milestones.

## Hackathon

Built for the **PayPal AI Hackathon**. [PayPal Developer](https://developer.paypal.com/) · [Checkout integration](https://developer.paypal.com/studio/checkout/standard/integrate) · [Security guidelines](https://developer.paypal.com/security-guidelines).

## License

MIT. See [LICENSE](LICENSE).
