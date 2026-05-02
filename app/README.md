# app/ — KidneyHood Frontend

Next.js 16 app deployed to Vercel. See `AGENTS.md` — **this is NOT the Next.js your training data knows**. APIs, conventions, and file structure have breaking changes. Read the relevant guide in `node_modules/next/dist/docs/` before writing code.

## Getting Started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The page auto-updates as you edit.

Fonts load globally via `app/src/app/layout.tsx` using `next/font`: Inter, Manrope (headings/display), and Nunito Sans (body) — all three added in LKID-76. Tailwind CSS for styling.

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
- **CSP enforcing (LKID-87, 2026-04-30) + 6 security headers (LKID-74).**

## Design Parity

Visual parity for the patient surfaces is driven by design-source HTML in `project/` (Landing Page, Lab Form, Email Gate, Results, PDF Report, Email Template). Committed to `project/` — source of truth for all page designs.

## Deployment

Auto-deploys from `main` via Vercel. Live at [kidneyhood-automation-architecture.vercel.app](https://kidneyhood-automation-architecture.vercel.app).
