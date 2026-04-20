# app/ — KidneyHood Frontend

Next.js 16 app deployed to Vercel. See `AGENTS.md` — **this is NOT the Next.js your training data knows**. APIs, conventions, and file structure have breaking changes. Read the relevant guide in `node_modules/next/dist/docs/` before writing code.

## Getting Started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The page auto-updates as you edit.

Fonts load via `next/font` (Inter, per Inga's design tokens). Tailwind CSS for styling.

## Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page with CTA into the patient flow |
| `/labs` | Lab value entry form (tokenized flow entry point; `sex="unknown"` hardcoded per Lee) |
| `/gate/[token]` | Email verification gate; resends the report link |
| `/results/[token]` | eGFR trajectory chart + PDF download; `report_token` is the only credential |
| `/internal/chart/[token]` | Playwright PDF render target (internal, no patient-facing nav) |
| `/client/[slug]` | Clerk-scoped dashboard for the client (Lee) — the **only** Clerk-gated surface |

No patient accounts, no sessionStorage. The tokenized flow replaced the legacy `/auth` → `/predict` → `/results` Clerk-gated flow in Sprint 4.

## Observability & Security

- **PostHog** analytics (env-gated by `NEXT_PUBLIC_POSTHOG_KEY` + host) — silent no-op until env vars set on Vercel
- **Sentry** error monitoring, frontend + backend (env-gated) — silent no-op until DSN set
- **CSP + 6 security headers** shipped in Report-Only mode (LKID-74). See `agents/yuri/drafts/sprint5-pr63-qa-verdict.md` for the enforcing-mode flip checklist.

## Design Parity

Visual parity for the patient surfaces is driven by design-source HTML in `project/` (Landing Page, Lab Form, Email Gate, Results, PDF Report, Email Template). These files are maintained locally by Inga and are not committed — ask the designer or check the main repo clone for the current source of truth.

## Deployment

Auto-deploys from `main` via Vercel. Live at [kidneyhood-automation-architecture.vercel.app](https://kidneyhood-automation-architecture.vercel.app).
