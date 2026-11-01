# CapitalFlow AI

**An AI-powered payment and cash-flow command center for small businesses.**

CapitalFlow AI is being developed for the PayPal AI Hackathon. The goal is to help small businesses understand incoming payments, follow up on unpaid invoices, and make better day-to-day cash-flow decisions from one clear workspace.

> **Project status:** Early development. The current repository is the project workspace; PayPal sandbox payments, persistent storage, webhook processing, and the AI analyst are planned implementation milestones and are not yet represented as completed integrations.

## Product direction

- **Cash-flow overview:** revenue received, outstanding invoices, overdue balances, and recent payment activity.
- **Invoice workflow:** create and track invoices, then request payment through PayPal.
- **Payment intelligence:** reflect payment lifecycle events and highlight items that need attention.
- **AI financial analyst:** answer questions using the business's own authorized transaction and invoice data, with transparent explanations.
- **Small-business-first UX:** a focused dashboard that makes financial operations understandable without requiring accounting expertise.

## Planned technology

- Next.js and TypeScript for the web application.
- PayPal Developer Sandbox / REST APIs for payment creation and capture.
- PayPal webhooks for asynchronous payment status updates.
- Supabase for application data and persistence (planned).
- An AI model for grounded analysis of the user's business data (planned).
- Vercel for hosting and preview deployments.

## Development status

| Capability | Status |
|---|---|
| Product scope and project workspace | In progress |
| Dashboard interface | In progress |
| PayPal Sandbox checkout | Planned |
| Invoice persistence | Planned |
| PayPal webhook verification and updates | Planned |
| AI analyst grounded in app data | Planned |
| Automated tests and end-to-end demo | Planned |

## Getting started

The application scaffold and setup commands will be documented here as the implementation is added. Do not add real PayPal credentials, AI keys, database passwords, or other secrets to source control.

When configured, secrets belong in local environment variables and Vercel Project Environment Variables. A `.env.example` file should contain variable names only, never real values.

## Security principles

- Keep PayPal and AI credentials on the server; never expose secrets in browser code.
- Verify PayPal webhook signatures before trusting event payloads.
- Treat payment status as server-verified, not as a client-side assertion.
- Use least-privilege access to customer and financial records.
- Clearly distinguish sandbox/demo activity from live money movement.

## Hackathon

Built for the **PayPal AI Hackathon**. PayPal Developer resources: [PayPal Developer](https://developer.paypal.com/) · [PayPal Checkout](https://developer.paypal.com/checkout/) · [PayPal AI docs](https://docs.paypal.ai/).

## License

This project will use the MIT License. See [LICENSE](LICENSE).
