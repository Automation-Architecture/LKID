# Frontend Component Architecture

**Author:** Harshit (Frontend Developer)
**Date:** 2026-03-25
**Phase:** Discovery — Step 5: Parallel Artifact Drafting
**Status:** DRAFT — pending cross-review

---

## Table of Contents

1. [Tech Stack (Confirmed)](#1-tech-stack-confirmed)
2. [App Router File Structure](#2-app-router-file-structure)
3. [Component Architecture](#3-component-architecture)
4. [Data Flow](#4-data-flow)
5. [Chart Architecture (Visx)](#5-chart-architecture-visx)
6. [State Management](#6-state-management)
7. [API Service Layer](#7-api-service-layer)
8. [Responsive Strategy](#8-responsive-strategy)
9. [Accessibility Plan](#9-accessibility-plan)
10. [Testing Strategy (Frontend)](#10-testing-strategy-frontend)
11. [Sprint Sequence](#11-sprint-sequence)
12. [Appendix: Design Token Reference](#appendix-design-token-reference-from-inga)

---

## 1. Tech Stack (Confirmed)

All choices below are binding per Meeting 1 decisions.

| Layer | Technology | Decision |
|-------|-----------|----------|
| Framework | Next.js 15 App Router | Decision #7 |
| Charting | Visx (D3 + React) | Decision #6 |
| UI Components | shadcn/ui (Radix UI primitives) | Decision #7 |
| Styling | Tailwind CSS | Decision #7 |
| Client State | Zustand | Decision #7 |
| Server State | TanStack Query v5 | Decision #7 |
| API Communication | Direct to FastAPI (no BFF, no Next.js API routes) | Decision #7 |
| Mock API | MSW (Mock Service Worker) v2 | Planned |
| Testing | Vitest + React Testing Library | Per Yuri's test strategy |
| Accessibility | axe-core (automated) + manual VoiceOver | WCAG 2.1 AA target |

**No BFF pattern.** The Next.js app calls the FastAPI backend directly from client components. CORS is configured on the FastAPI side to allow the frontend origin.

---

## 2. App Router File Structure

```
app/
  layout.tsx                    # [SERVER] Root layout: global styles, Inter font, metadata, DisclaimerFooter (mobile)
  page.tsx                      # [SERVER] Landing page: renders PredictionForm client component
  loading.tsx                   # [SERVER] Root loading skeleton
  not-found.tsx                 # [SERVER] Custom 404
  error.tsx                     # [CLIENT] Root error boundary
  globals.css                   # Tailwind base + design tokens as CSS variables

  results/
    page.tsx                    # [CLIENT] Chart + stat cards + disclaimers + save prompt
    loading.tsx                 # [SERVER] Skeleton chart + skeleton cards

  auth/
    login/
      page.tsx                  # [CLIENT] Magic link email entry
    verify/
      page.tsx                  # [CLIENT] Magic link token verification (reads ?token= from URL)

  account/
    layout.tsx                  # [CLIENT] Authenticated layout — redirects to /auth/login if no session
    page.tsx                    # [CLIENT] Account dashboard
    history/
      page.tsx                  # [CLIENT] Historical lab entries and multi-visit trend

middleware.ts                   # Auth redirect logic: protect /account/* routes

lib/
  api/
    client.ts                   # Fetch wrapper with auth header injection, error parsing
    types.ts                    # TypeScript types (generated from OpenAPI spec)
    endpoints.ts                # Endpoint URL constants
    errors.ts                   # Error envelope parser
  hooks/
    use-predict.ts              # TanStack Query mutation for POST /predict
    use-lab-entries.ts           # TanStack Query mutations/queries for /lab-entries
    use-auth.ts                 # Magic link auth hooks (request-link, verify, refresh, logout)
    use-user.ts                 # TanStack Query for GET /me
  stores/
    form-store.ts               # Zustand: lab value form state
    ui-store.ts                 # Zustand: modals, loading overlays, disclaimer expanded state
    auth-store.ts               # Zustand: session token, user object, isAuthenticated flag
  utils/
    validation.ts               # Client-side validation rules (ranges, required checks)
    chart-scales.ts             # Visx scale factory functions
    format.ts                   # Number formatting, date formatting, eGFR display

components/
  ui/                           # shadcn/ui primitives (Button, Input, RadioGroup, Card, etc.)
  form/
    PredictionForm.tsx
    RequiredFieldsSection.tsx
    OptionalFieldsSection.tsx
    SilentFieldsSection.tsx
    NumberInput.tsx
    SexRadioGroup.tsx
    VisitDatePicker.tsx
    SubmitButton.tsx
    FieldError.tsx
  chart/
    PredictionChart.tsx
    TrajectoryLines.tsx
    PhaseBands.tsx
    DialysisThresholdLine.tsx
    XAxis.tsx
    YAxis.tsx
    StartPointLabel.tsx
    EndPointLabels.tsx
    ConfidenceTierBadge.tsx
    ChartTitle.tsx
    ChartFootnote.tsx
    AccessibleDataTable.tsx
  results/
    StatCardGrid.tsx
    StatCard.tsx
    UnlockPrompt.tsx
    SlopeTag.tsx
    SavePrompt.tsx
  layout/
    Header.tsx
    DisclaimerBlock.tsx
    DisclaimerFooter.tsx
    LoadingSkeleton.tsx
  auth/
    MagicLinkForm.tsx
    MagicLinkSent.tsx
    AuthBanner.tsx

mocks/
  handlers.ts                   # MSW request handlers
  fixtures/
    prediction-tier1.json
    prediction-tier2.json
    prediction-tier3.json
    error-validation.json
    user-profile.json
```

### Server vs. Client Component Decisions

| Component | Rendering | Rationale |
|-----------|-----------|-----------|
| `app/layout.tsx` | Server | Static shell: fonts, metadata, global CSS |
| `app/page.tsx` | Server | Renders client `PredictionForm` within static layout |
| `app/results/page.tsx` | Client (`"use client"`) | Reads prediction data from Zustand/TanStack Query, renders Visx chart |
| `app/auth/login/page.tsx` | Client | Form interaction (email entry, submit) |
| `app/auth/verify/page.tsx` | Client | Reads URL search params, calls verify API |
| `app/account/layout.tsx` | Client | Checks auth state, redirects if unauthenticated |
| `app/account/page.tsx` | Client | Fetches user data via TanStack Query |
| `app/account/history/page.tsx` | Client | Fetches lab entries via TanStack Query |

### Middleware

```typescript
// middleware.ts
import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /account/* routes — check for session cookie
  if (pathname.startsWith("/account")) {
    const sessionToken = request.cookies.get("session_token");
    if (!sessionToken) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*"],
};
```

---

## 3. Component Architecture

### 3.1 Full Component Tree

```
<RootLayout>                                         # Server component
  <Header />                                         # Logo, nav links, auth status indicator
  <main>
    {/* Route: / */}
    <PredictionForm>                                  # Client — "use client"
      <RequiredFieldsSection>
        <NumberInput name="bun" />                   # BUN (5-150 mg/dL)
        <NumberInput name="creatinine" />            # Creatinine (0.3-15.0 mg/dL)
        <NumberInput name="potassium" />             # Potassium (2.0-8.0 mEq/L)
        <NumberInput name="age" />                   # Age (18-99)
        <SexRadioGroup />                            # Male / Female / Prefer not to say
      </RequiredFieldsSection>
      <OptionalFieldsSection>                        # Collapsible — "Sharpen your prediction"
        <NumberInput name="hemoglobin" />            # Hemoglobin (4.0-20.0 g/dL)
        <NumberInput name="glucose" />               # Glucose (40-500 mg/dL)
        <NumberInput name="egfr_override" />         # eGFR override (optional)
      </OptionalFieldsSection>
      <SilentFieldsSection>                          # Collapsible — "Additional health info"
        <NumberInput name="bp_systolic" />           # Systolic BP
        <Toggle name="sglt2_use" />                  # SGLT2 inhibitor
        <NumberInput name="upcr" />                  # Proteinuria (UPCR/UACR)
        <Select name="upcr_unit" />                  # mg/g or mg/mmol
        <Select name="diagnosis_stage" />            # CKD diagnosis type
      </SilentFieldsSection>
      <VisitDatePicker />                            # Date for multi-visit entries
      <SubmitButton />                               # Disabled until required fields valid
    </PredictionForm>

    {/* Route: /results */}
    <PredictionResults>                              # Client — "use client"
      <PredictionChart>                              # Visx SVG container
        <ChartTitle />                               # "Your Kidney Health Trajectory"
        <PhaseBands />                               # Phase 1 (gray) + Phase 2 (green)
        <TrajectoryLines />                          # 4 lines: none, bun24, bun17, bun12
        <DialysisThresholdLine />                    # Dashed red at eGFR 12
        <XAxis />                                    # True linear time scale (months), labeled with ages
        <YAxis />                                    # eGFR (mL/min/1.73m2)
        <StartPointLabel />                          # Filled dot at index 0
        <EndPointLabels />                           # 4 end-of-line labels with collision avoidance
        <ConfidenceTierBadge />                      # Top-right: Tier 1/2/3
        <ChartFootnote />                            # "Data points are plotted at actual time intervals..."
      </PredictionChart>
      <AccessibleDataTable />                        # Visually hidden, screen reader alternative
      <StatCardGrid>
        <StatCard variant="none" />                  # No Treatment (#AAAAAA border)
        <StatCard variant="bun24" />                 # BUN 18-24 (#85B7EB border)
        <StatCard variant="bun17" />                 # BUN 13-17 (#378ADD border)
        <StatCard variant="bun12" />                 # BUN <=12 (#1D9E75 border)
      </StatCardGrid>
      <UnlockPrompt />                               # Conditional on confidence tier
      <SlopeTag />                                   # Conditional on visit count (>=2)
      <DisclaimerBlock />                            # Desktop: inline below cards
      <SavePrompt />                                 # Guest: "Save your results" with email entry
    </PredictionResults>
  </main>
  <DisclaimerFooter />                               # Mobile: sticky footer, collapsed, expand on tap
</RootLayout>
```

### 3.2 Component Responsibility Matrix

| Component | Responsibility | Data Source | State Management |
|-----------|---------------|-------------|-----------------|
| `PredictionForm` | Orchestrates form submission, calls API, navigates to /results | formStore (Zustand) | Zustand formStore for field values; local state for UI (section expanded/collapsed) |
| `RequiredFieldsSection` | Groups the 5 required inputs | formStore | Zustand formStore |
| `NumberInput` | Renders labeled numeric input with unit, helper text, inline error | Props + formStore | Zustand formStore for value; props for config (min, max, unit, label) |
| `SexRadioGroup` | Radio: Male / Female / Prefer not to say | formStore | Zustand formStore |
| `OptionalFieldsSection` | Collapsible section with hemoglobin, glucose, eGFR override | formStore | Zustand formStore; local state for expanded/collapsed |
| `SilentFieldsSection` | Collapsible section for BP, SGLT2, proteinuria, CKD type | formStore | Zustand formStore; local state for expanded/collapsed |
| `VisitDatePicker` | Date picker for multi-visit lab entries | formStore | Zustand formStore |
| `SubmitButton` | Disabled until validation passes; shows loading spinner during API call | formStore + uiStore | Zustand uiStore for loading state |
| `FieldError` | Inline error message for a single field | Props (from API error or client validation) | Stateless — receives error via props |
| `PredictionChart` | Visx SVG container; manages dimensions, scales, responsive resize | TanStack Query (prediction data) | TanStack Query cache |
| `TrajectoryLines` | Renders 4 Visx `LinePath` components with distinct styles | Props (trajectories from prediction response) | Stateless |
| `PhaseBands` | Renders Phase 1 and Phase 2 background rectangles | Props (scale functions) | Stateless |
| `DialysisThresholdLine` | Horizontal dashed red line at eGFR = 12 | Props (yScale) | Stateless |
| `XAxis` | True linear time scale axis with age labels | Props (xScale, patient age) | Stateless |
| `YAxis` | eGFR axis | Props (yScale) | Stateless |
| `StartPointLabel` | Filled dot at time = 0 | Props (data point, scales) | Stateless |
| `EndPointLabels` | 4 labels at line ends with collision avoidance | Props (trajectory endpoints, yScale) | Local state for adjusted positions |
| `ConfidenceTierBadge` | Tier 1/2/3 badge in top-right of chart | Props (confidence_tier from API) | Stateless |
| `ChartTitle` | Chart heading text | Static | Stateless |
| `ChartFootnote` | "Data points are plotted at actual time intervals..." | Static | Stateless |
| `AccessibleDataTable` | Visually hidden HTML table with all trajectory values | Props (trajectories) | Stateless |
| `StatCardGrid` | Responsive grid: 4-col desktop, 2x2 tablet, stacked mobile | Children | Stateless layout |
| `StatCard` | Single result card: colored top border, eGFR value, delta, sub-text | Props (variant, trajectory data, dial_age) | Stateless |
| `UnlockPrompt` | "Add both hemoglobin and glucose..." (Tier 1 only) | Props (confidence_tier, has_hemoglobin, has_glucose) | Stateless |
| `SlopeTag` | Trend indicator: improving/stable/declining + numeric slope (3+ visits) | Props (slope, slope_description, visit_count) | Stateless |
| `SavePrompt` | Email input + "Send me a sign-in link" CTA with 24hr TTL messaging | authStore | Zustand authStore (isAuthenticated check); local state for email input |
| `DisclaimerBlock` | Inline disclaimers below results (desktop) | Static content | Stateless |
| `DisclaimerFooter` | Sticky footer with expand-on-tap (mobile) | uiStore | Zustand uiStore for expanded state |
| `Header` | Logo, nav, auth indicator | authStore | Zustand authStore |
| `MagicLinkForm` | Email entry for magic link request | Local state | Local — email value, loading, submitted |
| `MagicLinkSent` | "Check your email" confirmation with resend | Props (email) + local state | Local — resend cooldown timer |
| `AuthBanner` | Context banners: "Welcome back", "Check your email", "Link expired" | Props (variant) | Stateless |

### 3.3 Key Props Interfaces (TypeScript)

```typescript
// ==========================================
// API Response Types (from John's contract)
// ==========================================

/** Sex enum — Decision #3 */
type Sex = "male" | "female" | "unknown";

/** Lab entry for a single visit */
interface LabEntry {
  id?: string;                    // UUID — present for stored entries
  bun: number;                    // Required: 5-150 mg/dL
  creatinine: number;             // Required: 0.3-15.0 mg/dL
  potassium: number;              // Required: 2.0-8.0 mEq/L
  age: number;                    // Required: 18-99
  sex: Sex;                       // Required
  hemoglobin?: number | null;     // Optional: 4.0-20.0 g/dL
  glucose?: number | null;        // Optional: 40-500 mg/dL
  egfr_override?: number | null;  // Optional
  bp_systolic?: number | null;
  sglt2_use?: boolean | null;
  upcr?: number | null;
  upcr_unit?: "mg_per_g" | "mg_per_mmol" | null;
  diagnosis_stage?: string | null;
  visit_date: string;             // ISO 8601 date
}

/** Prediction response — Decision #8, #10 */
interface PredictionResponse {
  egfr_calculated: number;
  confidence_tier: 1 | 2 | 3;
  unlock_prompt: string | null;
  trajectories: {
    none: number[];               // 15 values at non-uniform intervals
    bun24: number[];
    bun17: number[];
    bun12: number[];
  };
  dial_ages: {
    none: number | null;
    bun24: number | null;
    bun17: number | null;
    bun12: number | null;
  };
  slope: number | null;           // Only present with 2+ visits
  slope_description: string | null; // "improving" | "stable" | "declining"
  created_at: string;             // ISO 8601
}

/** API error envelope — Decision #9 */
interface ApiError {
  error: {
    code: string;                 // Machine-readable: "VALIDATION_ERROR", "UNAUTHORIZED", etc.
    message: string;              // Human-readable
    details: FieldError[];        // Per-field errors (may be empty)
  };
}

interface FieldError {
  field: string;                  // Maps to form field name
  message: string;                // "BUN must be between 5 and 150 mg/dL"
}

/** Auth types */
interface User {
  id: string;
  email: string;
  created_at: string;
}

interface AuthVerifyResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}

// ==========================================
// Component Props
// ==========================================

/** Time points for trajectory x-axis (months) */
const TIME_POINTS = [0, 3, 6, 9, 12, 18, 24, 36, 48, 60, 72, 84, 96, 108, 120] as const;

/** Trajectory variant identifiers */
type TrajectoryVariant = "none" | "bun24" | "bun17" | "bun12";

/** Line style configuration per variant — from spec Section 4.4 */
interface LineStyle {
  color: string;
  strokeWidth: number;
  dashArray: string;              // SVG stroke-dasharray
}

const LINE_STYLES: Record<TrajectoryVariant, LineStyle> = {
  none:  { color: "#AAAAAA", strokeWidth: 1.5, dashArray: "7,4" },
  bun24: { color: "#85B7EB", strokeWidth: 2,   dashArray: "3,2" },
  bun17: { color: "#378ADD", strokeWidth: 2.5, dashArray: "" },     // solid
  bun12: { color: "#1D9E75", strokeWidth: 3,   dashArray: "" },     // solid, heaviest
};

/** NumberInput component */
interface NumberInputProps {
  name: string;                   // Field key in formStore
  label: string;                  // Visible label text
  unit: string;                   // "mg/dL", "mEq/L", etc.
  helperText?: string;            // "Normal range: 7-20 mg/dL"
  min: number;
  max: number;
  step?: number;                  // Default: 0.1
  required?: boolean;
  error?: string | null;          // Inline error message
  "data-testid"?: string;         // For Yuri's E2E tests
}

/** SexRadioGroup — Decision #3 */
interface SexRadioGroupProps {
  value: Sex | null;
  onChange: (value: Sex) => void;
  error?: string | null;
  "data-testid"?: string;
}

/** PredictionChart — main Visx container */
interface PredictionChartProps {
  prediction: PredictionResponse;
  patientAge: number;             // For x-axis age labels
  width: number;                  // From responsive container
  height: number;
}

/** StatCard */
interface StatCardProps {
  variant: TrajectoryVariant;
  label: string;                  // "No Treatment", "BUN 18-24", etc.
  eGFR: number;                   // Endpoint eGFR value
  eGFRStart: number;              // Starting eGFR for delta calculation
  dialAge: number | null;         // Age at dialysis threshold (null = never)
  "data-testid"?: string;
}

/** UnlockPrompt — Decision #12 */
interface UnlockPromptProps {
  confidenceTier: 1 | 2 | 3;
  hasHemoglobin: boolean;
  hasGlucose: boolean;
}

/** SlopeTag */
interface SlopeTagProps {
  slope: number | null;
  slopeDescription: string | null;
  visitCount: number;
}

/** SavePrompt — Decision #4 */
interface SavePromptProps {
  onEmailSubmit: (email: string) => void;
  isLoading: boolean;
  isAuthenticated: boolean;       // Hide if already logged in
}

/** DisclaimerFooter — Decision #11 */
interface DisclaimerFooterProps {
  isExpanded: boolean;
  onToggle: () => void;
}

/** ConfidenceTierBadge */
interface ConfidenceTierBadgeProps {
  tier: 1 | 2 | 3;
  x: number;                      // SVG position
  y: number;
}
```

---

## 4. Data Flow

### 4.1 Guest Prediction Flow

```
User fills form → Client validation passes → SubmitButton enabled
  │
  ▼
PredictionForm.onSubmit()
  │
  ├─ Collect values from formStore (Zustand)
  ├─ Build inline lab_entries[] payload
  │
  ▼
POST /api/v1/predict  (inline data, no auth required)
  │  ─── httpOnly cookie with guest session_token set by server ───
  │
  ├─ Success (200) ──▶ TanStack Query cache stores PredictionResponse
  │                     ──▶ router.push("/results")
  │                     ──▶ PredictionChart renders from cache
  │                     ──▶ StatCardGrid renders from cache
  │                     ──▶ SavePrompt appears (guest only)
  │
  └─ Error (400/422) ──▶ Parse ApiError envelope
                         ──▶ Map details[].field to form fields
                         ──▶ Display inline FieldError components
                         ──▶ Toast for non-field errors
```

### 4.2 Authenticated Prediction Flow

```
Authenticated user fills form → Client validation passes
  │
  ▼
Step 1: POST /api/v1/lab-entries  (stores lab values with visit_date)
  │  ─── Authorization: Bearer <access_token> ───
  │
  ├─ Success (201) ──▶ Invalidate lab-entries query cache
  │
  ▼
Step 2: POST /api/v1/predict  (server reads stored entries)
  │  ─── Authorization: Bearer <access_token> ───
  │  ─── Body: { lab_entry_ids: ["uuid1", ...] } ───
  │
  ├─ Success (200) ──▶ TanStack Query cache stores PredictionResponse
  │                     ──▶ router.push("/results")
  │                     ──▶ Chart + cards + slope tag (if 2+ visits)
  │                     ──▶ SavePrompt hidden (already authenticated)
  │
  └─ Error ──▶ Same error flow as guest
```

### 4.3 Magic Link Auth Flow

```
Guest sees SavePrompt after prediction
  │
  ▼
User enters email ──▶ POST /api/v1/auth/request-link { email }
  │
  ├─ Success (200) ──▶ Show MagicLinkSent component ("Check your email")
  │                     ──▶ Start 60s resend cooldown timer
  │
  └─ Error (429) ──▶ "Too many requests. Please wait."

User clicks magic link in email ──▶ /auth/verify?token=<token>
  │
  ▼
app/auth/verify/page.tsx reads token from URL
  │
  ▼
POST /api/v1/auth/verify { token }
  │
  ├─ Success (200) ──▶ Receive { user, access_token, refresh_token }
  │                     ──▶ Store access_token in memory (authStore)
  │                     ──▶ refresh_token in httpOnly cookie (set by server)
  │                     ──▶ Guest session data auto-migrated by server
  │                     ──▶ Redirect to /account or original redirect path
  │
  ├─ Error (401) ──▶ "This link has expired" ──▶ Show resend option
  │
  └─ Error (410) ──▶ "This link has already been used" ──▶ Show resend option
```

### 4.4 Multi-Visit Flow

```
Authenticated user on /account
  │
  ▼
"Add another lab test" button ──▶ Navigate to / with ?mode=add-visit
  │
  ▼
PredictionForm loads with visit_date picker visible
  │
  ▼
User enters new lab values + visit_date
  │
  ▼
POST /api/v1/lab-entries (stores new entry)
  │
  ▼
POST /api/v1/predict (server reads ALL stored entries for user)
  │
  ▼
Response includes:
  - trajectories (computed from all visits)
  - confidence_tier: 2 (if hgb+glu present) or 3 (if 3+ visits with hgb+glu)
  - slope: numeric value (if 3+ visits)
  - slope_description: "improving" | "stable" | "declining" (if 2+ visits)
  │
  ▼
Results page renders:
  - Updated chart with latest prediction
  - SlopeTag with trend indicator
  - ConfidenceTierBadge updated
```

### 4.5 Error Handling Flow

```
API returns 4xx/5xx
  │
  ▼
api/client.ts parseErrorResponse()
  │
  ├─ Matches ApiError envelope? ──▶ Parse structured error
  │   │
  │   ├─ Has details[]? ──▶ Map field errors to form fields via details[].field
  │   │                      ──▶ formStore.setFieldError(field, message)
  │   │                      ──▶ NumberInput renders inline <FieldError>
  │   │
  │   └─ No details[]? ──▶ Show toast notification with error.message
  │
  └─ Network error / non-JSON ──▶ Show generic toast: "Something went wrong. Please try again."

Token refresh flow (401):
  │
  ▼
TanStack Query global onError handler detects 401
  │
  ▼
POST /api/v1/auth/refresh (refresh_token in httpOnly cookie)
  │
  ├─ Success ──▶ Update access_token in authStore ──▶ Retry original request
  │
  └─ Failure ──▶ Clear authStore ──▶ Redirect to /auth/login
```

---

## 5. Chart Architecture (Visx)

### 5.1 PredictionChart Component Design

The chart is built entirely with Visx primitives wrapping D3 functions. No higher-level charting abstraction.

```typescript
// components/chart/PredictionChart.tsx
"use client";

import { Group } from "@visx/group";
import { scaleLinear } from "@visx/scale";
import { LinePath } from "@visx/shape";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { GridRows } from "@visx/grid";
import { useParentSize } from "@visx/responsive";
import { type PredictionResponse, TIME_POINTS, LINE_STYLES } from "@/lib/api/types";

const MARGIN = { top: 40, right: 80, bottom: 60, left: 60 };
const MIN_HEIGHT = 300;
const MAX_WIDTH = 960;

interface PredictionChartProps {
  prediction: PredictionResponse;
  patientAge: number;
}

export function PredictionChart({ prediction, patientAge }: PredictionChartProps) {
  const { parentRef, width: containerWidth } = useParentSize({ debounceTime: 150 });
  const width = Math.min(containerWidth, MAX_WIDTH);
  const height = Math.max(width * 0.55, MIN_HEIGHT);

  const innerWidth = width - MARGIN.left - MARGIN.right;
  const innerHeight = height - MARGIN.top - MARGIN.bottom;

  // True linear time scale — months 0-120 mapped linearly (Decision #5)
  const xScale = scaleLinear<number>({
    domain: [0, 120],
    range: [0, innerWidth],
  });

  // Y-axis: eGFR from 0 to max(bun12 trajectory) + 12 buffer
  const maxEGFR = Math.max(...prediction.trajectories.bun12) + 12;
  const yScale = scaleLinear<number>({
    domain: [0, maxEGFR],
    range: [innerHeight, 0],
    nice: true,
  });

  return (
    <div ref={parentRef} className="w-full" data-testid="prediction-chart-container">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={`eGFR trajectory chart showing 4 treatment scenarios over 10 years, starting at eGFR ${prediction.egfr_calculated}`}
      >
        <Group left={MARGIN.left} top={MARGIN.top}>
          {/* Background phase bands */}
          <PhaseBands xScale={xScale} innerHeight={innerHeight} />

          {/* Horizontal grid lines */}
          <GridRows
            scale={yScale}
            width={innerWidth}
            stroke="#E0E0E0"
            strokeOpacity={0.5}
          />

          {/* Dialysis threshold at eGFR = 12 */}
          <DialysisThresholdLine yScale={yScale} innerWidth={innerWidth} />

          {/* 4 trajectory lines */}
          {(["none", "bun24", "bun17", "bun12"] as const).map((variant) => (
            <TrajectoryLine
              key={variant}
              variant={variant}
              data={prediction.trajectories[variant]}
              xScale={xScale}
              yScale={yScale}
              style={LINE_STYLES[variant]}
            />
          ))}

          {/* Start point */}
          <StartPointLabel
            x={xScale(0)}
            y={yScale(prediction.egfr_calculated)}
            value={prediction.egfr_calculated}
          />

          {/* End-of-line labels with collision avoidance */}
          <EndPointLabels
            trajectories={prediction.trajectories}
            xScale={xScale}
            yScale={yScale}
          />

          {/* Axes */}
          <XAxis
            scale={xScale}
            top={innerHeight}
            patientAge={patientAge}
          />
          <YAxis scale={yScale} />

          {/* Confidence badge */}
          <ConfidenceTierBadge
            tier={prediction.confidence_tier}
            x={innerWidth - 10}
            y={-20}
          />
        </Group>
      </svg>

      {/* Chart footnote below SVG */}
      <ChartFootnote />

      {/* Hidden accessible data table */}
      <AccessibleDataTable
        trajectories={prediction.trajectories}
        patientAge={patientAge}
      />
    </div>
  );
}
```

### 5.2 Scale Functions

```typescript
// lib/utils/chart-scales.ts
import { scaleLinear } from "@visx/scale";

/**
 * Time points in months — non-uniform intervals.
 * With true linear scale (Decision #5), the first year (5 points in 0-12 months)
 * occupies only 10% of the axis width. This is intentional.
 */
export const TIME_POINTS_MONTHS = [0, 3, 6, 9, 12, 18, 24, 36, 48, 60, 72, 84, 96, 108, 120];

export function createXScale(innerWidth: number) {
  return scaleLinear<number>({
    domain: [0, 120],   // 0 to 120 months (10 years)
    range: [0, innerWidth],
  });
}

export function createYScale(innerHeight: number, maxEGFR: number) {
  return scaleLinear<number>({
    domain: [0, maxEGFR],
    range: [innerHeight, 0],
    nice: true,
  });
}

/**
 * Convert month offset to patient age for x-axis labels.
 * Labels show age at year boundaries: every 12 months.
 */
export function monthToAge(month: number, startAge: number): number {
  return startAge + month / 12;
}

/**
 * Generate tick values for x-axis — yearly intervals (every 12 months).
 */
export function getXTickValues(): number[] {
  return [0, 12, 24, 36, 48, 60, 72, 84, 96, 108, 120];
}
```

### 5.3 Trajectory Line Rendering

```typescript
// components/chart/TrajectoryLines.tsx
import { LinePath } from "@visx/shape";
import { curveMonotoneX } from "@visx/curve";
import { TIME_POINTS_MONTHS } from "@/lib/utils/chart-scales";
import type { ScaleLinear } from "d3-scale";

interface TrajectoryLineProps {
  variant: TrajectoryVariant;
  data: number[];                 // 15 eGFR values
  xScale: ScaleLinear<number, number>;
  yScale: ScaleLinear<number, number>;
  style: LineStyle;
}

export function TrajectoryLine({ variant, data, xScale, yScale, style }: TrajectoryLineProps) {
  const points = data.map((eGFR, i) => ({
    x: TIME_POINTS_MONTHS[i],
    y: eGFR,
  }));

  return (
    <LinePath
      data={points}
      x={(d) => xScale(d.x)}
      y={(d) => yScale(d.y)}
      stroke={style.color}
      strokeWidth={style.strokeWidth}
      strokeDasharray={style.dashArray || undefined}
      curve={curveMonotoneX}
      data-testid={`trajectory-line-${variant}`}
    />
  );
}
```

### 5.4 Phase Band Implementation

```typescript
// components/chart/PhaseBands.tsx
import { Bar } from "@visx/shape";
import type { ScaleLinear } from "d3-scale";

interface PhaseBandsProps {
  xScale: ScaleLinear<number, number>;
  innerHeight: number;
}

export function PhaseBands({ xScale, innerHeight }: PhaseBandsProps) {
  return (
    <>
      {/* Phase 1: months 0-3 — gray background */}
      <Bar
        x={xScale(0)}
        y={0}
        width={xScale(3) - xScale(0)}
        height={innerHeight}
        fill="#F5F5F5"
        data-testid="phase-band-1"
      />
      {/* Phase 2: months 3-24 — light green background */}
      <Bar
        x={xScale(3)}
        y={0}
        width={xScale(24) - xScale(3)}
        height={innerHeight}
        fill="#E8F5F0"
        data-testid="phase-band-2"
      />
    </>
  );
}
```

### 5.5 Label Collision Avoidance Algorithm

End-of-line labels display the final eGFR value for each trajectory. When lines converge, labels overlap. The algorithm enforces a minimum 15px vertical separation.

```typescript
// components/chart/EndPointLabels.tsx
import { Text } from "@visx/text";
import type { ScaleLinear } from "d3-scale";

const MIN_SEPARATION = 15; // pixels
const LABEL_OFFSET_X = 8; // pixels right of line end

interface EndPointLabelsProps {
  trajectories: PredictionResponse["trajectories"];
  xScale: ScaleLinear<number, number>;
  yScale: ScaleLinear<number, number>;
}

interface LabelPosition {
  variant: TrajectoryVariant;
  value: number;
  rawY: number;
  adjustedY: number;
}

/**
 * Collision avoidance: sort labels by raw Y position (top to bottom),
 * then push overlapping labels apart by MIN_SEPARATION.
 */
function resolveCollisions(labels: LabelPosition[]): LabelPosition[] {
  // Sort by rawY ascending (top of SVG = 0, smaller Y = higher on chart)
  const sorted = [...labels].sort((a, b) => a.rawY - b.rawY);

  // Push down any label that overlaps with the one above it
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const gap = curr.adjustedY - prev.adjustedY;
    if (gap < MIN_SEPARATION) {
      curr.adjustedY = prev.adjustedY + MIN_SEPARATION;
    }
  }

  return sorted;
}

export function EndPointLabels({ trajectories, xScale, yScale }: EndPointLabelsProps) {
  const variants: TrajectoryVariant[] = ["none", "bun24", "bun17", "bun12"];
  const lastIndex = 14; // index of month 120
  const xPos = xScale(120) + LABEL_OFFSET_X;

  const labels: LabelPosition[] = variants.map((variant) => {
    const value = trajectories[variant][lastIndex];
    const rawY = yScale(value);
    return { variant, value, rawY, adjustedY: rawY };
  });

  const resolved = resolveCollisions(labels);

  return (
    <>
      {resolved.map((label) => (
        <Text
          key={label.variant}
          x={xPos}
          y={label.adjustedY}
          fill={LINE_STYLES[label.variant].color}
          fontSize={12}
          fontWeight={600}
          verticalAnchor="middle"
          data-testid={`end-label-${label.variant}`}
        >
          {label.value}
        </Text>
      ))}
    </>
  );
}
```

### 5.6 Responsive Behavior

| Breakpoint | Chart Behavior |
|------------|---------------|
| Desktop (>1024px) | Full chart at max-width 960px, centered. Mouse hover for future tooltips (Variant A). |
| Tablet (768-1024px) | Full-width chart. Same rendering. |
| Mobile (<768px) | Full-width chart with `overflow-x: auto` on container for horizontal scroll if needed. Simplified tick labels (every 2 years instead of every year). |

Responsive width is tracked via `useParentSize` from `@visx/responsive`. The chart re-renders on container resize with a 150ms debounce.

```typescript
// Responsive container wrapper
<div className="w-full max-w-[960px] mx-auto overflow-x-auto" data-testid="chart-wrapper">
  <PredictionChart prediction={data} patientAge={age} />
</div>
```

### 5.7 Accessibility

- `<svg role="img" aria-label="...">` with a descriptive summary
- `<AccessibleDataTable>` provides a visually hidden `<table>` with all 4 trajectories and 15 time points, readable by screen readers
- Line patterns (solid, dashed, short-dash) differentiate trajectories beyond color alone (WCAG 1.4.1)
- All chart colors verified against white and phase band backgrounds for 3:1 minimum contrast

```typescript
// components/chart/AccessibleDataTable.tsx
export function AccessibleDataTable({
  trajectories,
  patientAge,
}: {
  trajectories: PredictionResponse["trajectories"];
  patientAge: number;
}) {
  return (
    <table className="sr-only" data-testid="chart-data-table">
      <caption>eGFR trajectory data for 4 treatment scenarios over 10 years</caption>
      <thead>
        <tr>
          <th scope="col">Time (months)</th>
          <th scope="col">Age</th>
          <th scope="col">No Treatment</th>
          <th scope="col">BUN 18-24</th>
          <th scope="col">BUN 13-17</th>
          <th scope="col">BUN &le;12</th>
        </tr>
      </thead>
      <tbody>
        {TIME_POINTS_MONTHS.map((month, i) => (
          <tr key={month}>
            <td>{month}</td>
            <td>{patientAge + month / 12}</td>
            <td>{trajectories.none[i]}</td>
            <td>{trajectories.bun24[i]}</td>
            <td>{trajectories.bun17[i]}</td>
            <td>{trajectories.bun12[i]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### 5.8 Sprint 0 POC Validation Plan

The Visx POC must validate these capabilities before Sprint 1 begins:

| # | Capability | Validation Criteria | Risk if Fails |
|---|-----------|-------------------|---------------|
| 1 | True linear time scale | 15 data points at non-uniform intervals render correctly; first year compressed to ~10% width | HIGH — fundamental to chart |
| 2 | Custom dash patterns | `strokeDasharray="7,4"` for no-treatment, `"3,2"` for bun24 render correctly | MEDIUM — fallback to solid/dashed only |
| 3 | Phase background bands | Filled rectangles behind trajectory lines with correct z-order | LOW — simple SVG layering |
| 4 | End-of-line label collision avoidance | 4 labels with 15px minimum separation; no overlap when lines converge | MEDIUM — custom algorithm |
| 5 | Dialysis threshold line | Horizontal dashed red line at eGFR = 12 renders across full width | LOW — simple |
| 6 | Responsive re-render | Chart re-renders cleanly on container resize without flicker | MEDIUM — debounce timing |
| 7 | SVG accessibility | `role="img"`, `aria-label`, and hidden data table work with VoiceOver | LOW — standard SVG ARIA |

**POC deliverable:** A standalone Next.js page at `/poc/chart` that renders the full chart with mock data exercising all 7 capabilities. Include a screenshot and a written pass/fail report per capability.

---

## 6. State Management

### 6.1 Zustand Stores

```typescript
// lib/stores/form-store.ts
import { create } from "zustand";

interface FormState {
  // Required fields
  bun: string;
  creatinine: string;
  potassium: string;
  age: string;
  sex: Sex | null;

  // Optional fields
  hemoglobin: string;
  glucose: string;
  egfr_override: string;

  // Silent fields
  bp_systolic: string;
  sglt2_use: boolean | null;
  upcr: string;
  upcr_unit: "mg_per_g" | "mg_per_mmol" | null;
  diagnosis_stage: string;

  // Visit
  visit_date: string;

  // Field errors (from client validation or API error details)
  fieldErrors: Record<string, string | null>;

  // Actions
  setField: (name: string, value: string | boolean | null) => void;
  setFieldError: (field: string, message: string | null) => void;
  clearFieldErrors: () => void;
  resetForm: () => void;
  getLabEntry: () => Partial<LabEntry>;
}

export const useFormStore = create<FormState>((set, get) => ({
  bun: "",
  creatinine: "",
  potassium: "",
  age: "",
  sex: null,
  hemoglobin: "",
  glucose: "",
  egfr_override: "",
  bp_systolic: "",
  sglt2_use: null,
  upcr: "",
  upcr_unit: null,
  diagnosis_stage: "",
  visit_date: new Date().toISOString().split("T")[0],
  fieldErrors: {},

  setField: (name, value) => set({ [name]: value }),
  setFieldError: (field, message) =>
    set((state) => ({
      fieldErrors: { ...state.fieldErrors, [field]: message },
    })),
  clearFieldErrors: () => set({ fieldErrors: {} }),
  resetForm: () =>
    set({
      bun: "", creatinine: "", potassium: "", age: "", sex: null,
      hemoglobin: "", glucose: "", egfr_override: "",
      bp_systolic: "", sglt2_use: null, upcr: "", upcr_unit: null,
      diagnosis_stage: "", visit_date: new Date().toISOString().split("T")[0],
      fieldErrors: {},
    }),
  getLabEntry: () => {
    const s = get();
    return {
      bun: parseFloat(s.bun) || undefined,
      creatinine: parseFloat(s.creatinine) || undefined,
      potassium: parseFloat(s.potassium) || undefined,
      age: parseInt(s.age) || undefined,
      sex: s.sex || undefined,
      hemoglobin: s.hemoglobin ? parseFloat(s.hemoglobin) : undefined,
      glucose: s.glucose ? parseFloat(s.glucose) : undefined,
      egfr_override: s.egfr_override ? parseFloat(s.egfr_override) : undefined,
      bp_systolic: s.bp_systolic ? parseFloat(s.bp_systolic) : undefined,
      sglt2_use: s.sglt2_use,
      upcr: s.upcr ? parseFloat(s.upcr) : undefined,
      upcr_unit: s.upcr_unit,
      diagnosis_stage: s.diagnosis_stage || undefined,
      visit_date: s.visit_date,
    };
  },
}));
```

```typescript
// lib/stores/ui-store.ts
import { create } from "zustand";

interface UIState {
  isSubmitting: boolean;
  disclaimerExpanded: boolean;       // Mobile sticky footer state
  optionalFieldsExpanded: boolean;
  silentFieldsExpanded: boolean;

  setSubmitting: (v: boolean) => void;
  toggleDisclaimer: () => void;
  toggleOptionalFields: () => void;
  toggleSilentFields: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSubmitting: false,
  disclaimerExpanded: false,
  optionalFieldsExpanded: false,
  silentFieldsExpanded: false,

  setSubmitting: (v) => set({ isSubmitting: v }),
  toggleDisclaimer: () => set((s) => ({ disclaimerExpanded: !s.disclaimerExpanded })),
  toggleOptionalFields: () => set((s) => ({ optionalFieldsExpanded: !s.optionalFieldsExpanded })),
  toggleSilentFields: () => set((s) => ({ silentFieldsExpanded: !s.silentFieldsExpanded })),
}));
```

```typescript
// lib/stores/auth-store.ts
import { create } from "zustand";

interface AuthState {
  accessToken: string | null;
  user: User | null;
  isAuthenticated: boolean;

  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isAuthenticated: false,

  setAuth: (token, user) => set({ accessToken: token, user, isAuthenticated: true }),
  clearAuth: () => set({ accessToken: null, user: null, isAuthenticated: false }),
}));
```

### 6.2 TanStack Query Configuration

```typescript
// lib/hooks/use-predict.ts
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

/** Guest prediction — inline data */
export function useGuestPredict() {
  return useMutation({
    mutationFn: (labEntries: LabEntry[]) =>
      apiClient.post<PredictionResponse>("/api/v1/predict", {
        lab_entries: labEntries,
      }),
  });
}

/** Authenticated prediction — reference stored entries */
export function useAuthPredict() {
  return useMutation({
    mutationFn: (labEntryIds: string[]) =>
      apiClient.post<PredictionResponse>("/api/v1/predict", {
        lab_entry_ids: labEntryIds,
      }),
  });
}
```

```typescript
// lib/hooks/use-lab-entries.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export function useLabEntries() {
  return useQuery({
    queryKey: ["lab-entries"],
    queryFn: () => apiClient.get<LabEntry[]>("/api/v1/lab-entries"),
    enabled: useAuthStore.getState().isAuthenticated,
  });
}

export function useCreateLabEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entry: Omit<LabEntry, "id">) =>
      apiClient.post<LabEntry>("/api/v1/lab-entries", entry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab-entries"] });
    },
  });
}
```

### 6.3 Guest Session

- **No localStorage** for guest data (Decision #4). All guest data is server-side.
- The server sets an httpOnly cookie (`session_token`) on the guest's first `POST /predict` call.
- The client does not read or write this cookie directly; the browser includes it automatically.
- Form field values are held in Zustand `formStore` during the session (in-memory, lost on page refresh).
- On account creation (magic link verification), the server migrates guest session data to the new account.

---

## 7. API Service Layer

### 7.1 API Client

```typescript
// lib/api/client.ts
import { useAuthStore } from "@/lib/stores/auth-store";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers: extraHeaders, ...rest } = options;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...extraHeaders,
  };

  // Inject auth token if available
  const token = useAuthStore.getState().accessToken;
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include", // Include httpOnly cookies for guest sessions
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw parseApiError(response.status, errorBody);
  }

  return response.json();
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
```

### 7.2 Error Response Parsing

```typescript
// lib/api/errors.ts

/** Parsed API error — maps to Decision #9 envelope */
export class ApiRequestError extends Error {
  code: string;
  details: FieldError[];
  statusCode: number;

  constructor(statusCode: number, code: string, message: string, details: FieldError[] = []) {
    super(message);
    this.name = "ApiRequestError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  /** Check if this error has field-level details */
  hasFieldErrors(): boolean {
    return this.details.length > 0;
  }

  /** Get error message for a specific field */
  getFieldError(field: string): string | null {
    const detail = this.details.find((d) => d.field === field);
    return detail?.message ?? null;
  }
}

export function parseApiError(statusCode: number, body: unknown): ApiRequestError {
  if (body && typeof body === "object" && "error" in body) {
    const err = (body as ApiError).error;
    return new ApiRequestError(
      statusCode,
      err.code,
      err.message,
      err.details || [],
    );
  }

  return new ApiRequestError(
    statusCode,
    "UNKNOWN_ERROR",
    "An unexpected error occurred. Please try again.",
    [],
  );
}
```

### 7.3 MSW Handler Structure

```typescript
// mocks/handlers.ts
import { http, HttpResponse } from "msw";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const handlers = [
  // POST /predict — guest (inline data)
  http.post(`${API_BASE}/api/v1/predict`, async ({ request }) => {
    const body = await request.json();
    // Return tier based on presence of hemoglobin + glucose
    const hasHgb = body.lab_entries?.[0]?.hemoglobin != null;
    const hasGlu = body.lab_entries?.[0]?.glucose != null;
    const tier = hasHgb && hasGlu ? 2 : 1;

    return HttpResponse.json({
      egfr_calculated: 33,
      confidence_tier: tier,
      unlock_prompt: tier === 1
        ? "Add both your hemoglobin and glucose results to sharpen your prediction"
        : null,
      trajectories: {
        none:  [33, 31, 29, 27, 25, 22, 20, 18, 16, 14, 13, 12, 11, 10, 9],
        bun24: [33, 32, 31, 31, 30, 30, 29, 29, 28, 28, 27, 27, 26, 26, 25],
        bun17: [33, 33, 34, 35, 36, 37, 38, 39, 39, 40, 40, 41, 41, 42, 42],
        bun12: [33, 34, 36, 38, 40, 42, 44, 46, 47, 48, 49, 50, 51, 52, 53],
      },
      dial_ages: { none: 68, bun24: null, bun17: null, bun12: null },
      slope: null,
      slope_description: null,
      created_at: new Date().toISOString(),
    });
  }),

  // POST /lab-entries — store lab values
  http.post(`${API_BASE}/api/v1/lab-entries`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: crypto.randomUUID(), ...body }, { status: 201 });
  }),

  // GET /lab-entries — list stored entries
  http.get(`${API_BASE}/api/v1/lab-entries`, () => {
    return HttpResponse.json([]);
  }),

  // POST /auth/request-link
  http.post(`${API_BASE}/api/v1/auth/request-link`, () => {
    return HttpResponse.json({ message: "Magic link sent" });
  }),

  // POST /auth/verify
  http.post(`${API_BASE}/api/v1/auth/verify`, () => {
    return HttpResponse.json({
      user: { id: "mock-user-id", email: "patient@example.com", created_at: new Date().toISOString() },
      access_token: "mock-access-token",
      refresh_token: "mock-refresh-token",
    });
  }),

  // GET /me
  http.get(`${API_BASE}/api/v1/me`, () => {
    return HttpResponse.json({
      id: "mock-user-id",
      email: "patient@example.com",
      created_at: new Date().toISOString(),
    });
  }),

  // Validation error example
  // (activated by sending BUN < 5 in mock mode)
];
```

### 7.4 TypeScript Type Generation

Once John publishes the OpenAPI 3.1 spec to `/artifacts/api_contract.json`, types will be generated using `openapi-typescript`:

```bash
npx openapi-typescript ../artifacts/api_contract.json -o lib/api/generated-types.ts
```

Until the contract is published, the types in `lib/api/types.ts` (Section 3.3 above) serve as the working contract based on John's draft schemas.

---

## 8. Responsive Strategy

Implementation of Inga's responsive spec (UX Spec Section 6) using Tailwind's mobile-first approach.

### 8.1 Breakpoint Mapping

| Design Breakpoint | Range | Tailwind Prefix |
|-------------------|-------|----------------|
| Mobile | 0 - 767px | Default (no prefix) |
| Tablet | 768px - 1024px | `md:` |
| Desktop | 1025px+ | `lg:` |

### 8.2 Page Container

```tsx
<main className="px-4 md:px-6 lg:max-w-4xl lg:mx-auto lg:px-8">
  {children}
</main>
```

- Mobile: 16px horizontal padding, full width
- Tablet: 24px horizontal padding, full width
- Desktop: max 896px content + 64px padding = 960px total, centered

### 8.3 Form Field Grid

```tsx
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
  <NumberInput name="bun" ... />
  <NumberInput name="creatinine" ... />
  <NumberInput name="potassium" ... />
  <NumberInput name="age" ... />
  <SexRadioGroup className="md:col-span-2" />  {/* Always full width */}
</div>
```

- Mobile: single column, 16px gap
- Tablet/Desktop: 2-column grid, 24px gap
- Sex radio group spans full width at all breakpoints

### 8.4 Stat Card Grid

```tsx
<div
  className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-4"
  data-testid="stat-card-grid"
>
  <StatCard variant="none" ... />
  <StatCard variant="bun24" ... />
  <StatCard variant="bun17" ... />
  <StatCard variant="bun12" ... />
</div>
```

- Mobile: single column, 12px gap
- Tablet: 2x2 grid, 16px gap
- Desktop: 4-column row, 16px gap

### 8.5 Chart Container

```tsx
{/* Desktop/Tablet: inline, full container width */}
{/* Mobile: horizontal scroll with gradient affordance */}
<div className="relative w-full lg:max-w-[960px] lg:mx-auto">
  <div className="overflow-x-auto md:overflow-visible" data-testid="chart-wrapper">
    <div className="min-w-[600px] md:min-w-0">
      <PredictionChart prediction={data} patientAge={age} />
    </div>
  </div>
  {/* Scroll affordance: right-edge gradient fade, mobile only */}
  <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-5 bg-gradient-to-l from-white to-transparent md:hidden" />
</div>
```

- Desktop/Tablet: full container width, aspect-ratio preserved, no scroll
- Mobile: inner chart min-width 600px, outer container scrollable, right-edge gradient fade (20px) signals scrollability

### 8.6 Disclaimer Display

```tsx
{/* Desktop/Tablet: inline block below stat cards */}
<DisclaimerBlock className="hidden md:block" data-testid="disclaimer-block" />

{/* Mobile: sticky footer, collapsed by default, expand on tap */}
<DisclaimerFooter className="md:hidden" data-testid="disclaimer-footer" />
```

Per Decision #11:
- Desktop/Tablet: `DisclaimerBlock` renders inline beneath stat cards, always visible
- Mobile: `DisclaimerFooter` is a sticky bottom bar (44px collapsed height). Tap expands to reveal full disclaimer text. Uses `uiStore.disclaimerExpanded` state.

### 8.7 Save Prompt & Auth Card

| Element | Desktop | Tablet | Mobile |
|---------|---------|--------|--------|
| Save prompt | Inline card below disclaimers, max-width matches stat card grid | Inline card, full content width | Full-width card with 16px padding |
| Auth card (`/auth/login`, `/auth/verify`) | Centered, max-width 440px | Centered, max-width 440px | Full width with 16px side padding |

### 8.8 Touch Targets (WCAG 2.5.5)

All interactive elements meet 44x44px minimum:

| Element | Size | Tailwind |
|---------|------|----------|
| Form inputs | 48px height | `h-12` |
| Radio button rows | 44px min height | `min-h-[44px]` with padding |
| Submit button | 52px height | `h-[52px]` |
| Disclaimer expand trigger | 44px height | Sticky footer bar |
| Navigation links | 44px height | `py-3` padding |
| Close/dismiss buttons | 44x44px | `min-w-[44px] min-h-[44px]` |

### 8.9 Font Size Rules

No text smaller than 12px anywhere. Mobile body text minimum 16px (prevents iOS auto-zoom on input focus).

| Context | Desktop | Mobile |
|---------|---------|--------|
| Page title | 28px (`text-2xl`) | 24px (`text-xl`) |
| Section heading | 20px (`text-xl`) | 18px (`text-lg`) |
| Body text / labels | 16px (`text-base`) | 16px (`text-base`) |
| Helper text | 14px (`text-sm`) | 14px (`text-sm`) |
| Chart axis labels | 12px | 12px |
| Chart footnote | 12px | 12px |
| Confidence badge | 12px | 12px |

---

## 9. Accessibility Plan

### 9.1 Target Standard

WCAG 2.1 AA compliance across all pages and components.

### 9.2 Form Accessibility

- Every input has a `<label htmlFor={id}>` association
- `aria-describedby` links to helper text or error messages
- `aria-invalid="true"` on fields in error state
- `aria-required="true"` on required fields
- `inputMode="decimal"` for float fields, `inputMode="numeric"` for integers (no `type="number"` to avoid mobile spinner issues for 60+ users)
- Validate on blur, not on keystroke (avoids premature error announcements)
- Radix primitives (`RadioGroup`, `Select`, `Switch`) provide built-in ARIA roles, keyboard navigation, and focus management

### 9.3 Chart Accessibility

- `<svg role="img" aria-label="eGFR trajectory chart showing 4 treatment scenarios over 10 years, starting at eGFR {value}">` provides a descriptive summary
- `<AccessibleDataTable>` renders a visually hidden (`sr-only`) HTML `<table>` with all 4 trajectories across 15 time points, readable by screen readers
- Line differentiation beyond color alone (WCAG 1.4.1): solid lines for BUN 13-17 and BUN <=12, short-dash for BUN 18-24, long-dash for No Treatment
- All chart colors meet 3:1 minimum contrast ratio against white and phase band backgrounds

### 9.4 Keyboard Navigation

- Tab order follows logical reading order through form fields
- Arrow keys navigate within radio groups (Radix handles this)
- Enter/Space activates buttons and toggles
- Escape closes open dropdowns and modals
- Focus returns to the triggering element on modal/accordion close
- Focus ring: `ring-2 ring-offset-2 ring-blue-500` (visible on all interactive elements)

### 9.5 Screen Reader Support

- Collapsible sections use `<button aria-expanded="true|false">` with `aria-controls` linking to the content region
- Loading states: `aria-busy="true"` on submit button during API calls; `aria-live="polite"` region for status updates
- Error announcements: `aria-live="assertive"` region for form-level errors; inline errors announced via `aria-describedby` change
- Stat cards use semantic heading hierarchy and `aria-label` for context

### 9.6 Testing Approach

| Method | Tool | Scope | CI/CD |
|--------|------|-------|-------|
| Automated | `@axe-core/react` in Vitest | All component tests | Yes — zero critical/serious violations gate |
| Automated | ESLint `eslint-plugin-jsx-a11y` | All JSX | Yes — lint gate |
| Manual | VoiceOver | Full prediction flow | Pre-release checklist |
| Manual | Keyboard-only navigation | All interactive paths | Pre-release checklist |

---

## 10. Testing Strategy (Frontend)

### 10.1 `data-testid` Conventions

All interactive and verifiable elements receive `data-testid` attributes for Yuri's Playwright E2E tests.

**Naming convention:** `{component}-{element}[-{variant}]`

| Element | `data-testid` |
|---------|--------------|
| BUN input | `input-bun` |
| Creatinine input | `input-creatinine` |
| Potassium input | `input-potassium` |
| Age input | `input-age` |
| Sex radio group | `radio-sex` |
| Sex option (male) | `radio-sex-male` |
| Sex option (female) | `radio-sex-female` |
| Sex option (unknown) | `radio-sex-unknown` |
| Hemoglobin input | `input-hemoglobin` |
| Glucose input | `input-glucose` |
| eGFR override input | `input-egfr-override` |
| Optional fields toggle | `toggle-optional-fields` |
| Silent fields toggle | `toggle-silent-fields` |
| Visit date picker | `input-visit-date` |
| Submit button | `button-submit` |
| Field error message | `error-{field}` (e.g., `error-bun`) |
| Chart container | `prediction-chart-container` |
| Trajectory line | `trajectory-line-{variant}` |
| Phase band 1 | `phase-band-1` |
| Phase band 2 | `phase-band-2` |
| End label | `end-label-{variant}` |
| Confidence badge | `confidence-badge` |
| Stat card | `stat-card-{variant}` |
| Stat card grid | `stat-card-grid` |
| Unlock prompt | `unlock-prompt` |
| Slope tag | `slope-tag` |
| Save prompt | `save-prompt` |
| Save prompt email input | `save-prompt-email` |
| Save prompt submit | `save-prompt-submit` |
| Disclaimer block (desktop) | `disclaimer-block` |
| Disclaimer footer (mobile) | `disclaimer-footer` |
| Disclaimer footer toggle | `disclaimer-footer-toggle` |
| Chart data table (hidden) | `chart-data-table` |
| Auth email input | `auth-email-input` |
| Auth submit button | `auth-submit-button` |
| Magic link sent message | `magic-link-sent` |
| Auth banner | `auth-banner` |

### 10.2 Component Test Approach (Vitest + RTL)

```
Test Pyramid (Frontend):
  Unit tests:         ~60% — individual components, hooks, utils, stores
  Integration tests:  ~30% — form submission flow, chart rendering from mock data, auth flow
  E2E tests:          ~10% — Yuri owns these via Playwright
```

**Unit test examples:**
- `NumberInput` renders label, unit, helper text; shows error when `error` prop set
- `SexRadioGroup` calls `onChange` with correct value
- `formStore` setField/getLabEntry correctly transforms string values to typed LabEntry
- `resolveCollisions()` correctly separates overlapping labels
- `parseApiError()` correctly parses error envelope and extracts field errors
- `validation.ts` rules: BUN < 5 returns error, BUN = 5 passes, BUN = 150 passes, BUN > 150 returns error

**Integration test examples:**
- `PredictionForm` submits correctly formed payload when all required fields filled
- `PredictionChart` renders 4 SVG path elements from mock prediction data
- `StatCardGrid` renders 4 cards with correct values derived from trajectory endpoints
- `SavePrompt` calls auth/request-link API when email submitted

### 10.3 Storybook Setup

Each component gets a Storybook story documenting its variants and states:

- `NumberInput`: default, with error, with helper text, disabled, focus state
- `SexRadioGroup`: no selection, male selected, female selected, unknown selected, with error
- `StatCard`: all 4 variants, with dialAge null, with dialAge value
- `ConfidenceTierBadge`: Tier 1, Tier 2, Tier 3
- `UnlockPrompt`: Tier 1 (show prompt), Tier 2 (hidden), missing only hemoglobin, missing only glucose
- `PredictionChart`: Tier 1 mock data, Tier 2 mock data, converging trajectories (tests collision avoidance)
- `DisclaimerFooter`: collapsed, expanded
- `SavePrompt`: visible (guest), hidden (authenticated), loading state
- `MagicLinkForm`: default, loading, error
- `MagicLinkSent`: default, resend available, resend cooldown

### 10.4 Accessibility Testing

- **Automated (CI):** `@axe-core/react` integrated into Vitest component tests. Zero critical/serious violations required per Yuri's coverage requirements.
- **Manual:** VoiceOver walkthrough of complete prediction flow. Verify chart data table is read correctly. Verify form field labels and error messages are announced.
- **Keyboard navigation:** Tab through form fields in correct order. Enter submits form. Arrow keys navigate radio group. Focus returns to form on error.

---

## 11. Sprint Sequence

### 11.1 Sprint 0 — Foundation & Visx POC

**Duration:** 1 week
**Goal:** Validate Visx, scaffold the project, establish mock API layer.

**Deliverables:**

1. **Visx POC** — Standalone page (`/poc/chart`) rendering the full eGFR trajectory chart with mock data. Validates all 7 capabilities from Section 5.8. Written pass/fail report with screenshot per capability. If any HIGH-risk capability fails, escalate to Luca immediately.

2. **MSW Mock Setup**
   - All handlers from Section 7.3 implemented and working
   - `mocks/browser.ts` configured for client-side interception
   - Mock data fixtures for: Tier 1, Tier 2, Tier 3 predictions; validation error; auth flow
   - MSW activated in development via `NEXT_PUBLIC_MSW=true` environment variable

3. **TypeScript Type Definitions**
   - All types from Section 3.3 implemented in `lib/api/types.ts`
   - Updated once John publishes the OpenAPI contract (auto-generated types replace manual ones)

4. **Project Scaffolding**
   - Next.js 15 app initialized with App Router
   - Tailwind CSS configured with Inga's design tokens
   - shadcn/ui initialized with necessary primitives (Button, Input, RadioGroup, Card, Select, Toggle)
   - Zustand stores scaffolded (formStore, uiStore, authStore)
   - TanStack Query provider configured at root layout
   - ESLint + Prettier configured
   - Vitest + RTL configured
   - File structure matching Section 2

**Exit criteria:** POC passes all 7 validations. MSW handlers return correct fixtures. Stores compile. CI green.

### 11.2 Sprint 1 — Core Form + Chart

**Duration:** 2 weeks
**Goal:** Guest user can enter required lab values and see the prediction chart.

**Deliverables:**

1. **PredictionForm** — `RequiredFieldsSection` with all 5 required fields (`NumberInput` x4, `SexRadioGroup`)
2. **Client-side validation** — `validation.ts` with range checks, blur-triggered errors, required-field enforcement
3. **Form submission flow** — Zustand `formStore` collects values, `useGuestPredict` mutation calls `POST /predict` via MSW, navigates to `/results` on success
4. **PredictionChart** — Full Visx chart (production quality) with all sub-components: `TrajectoryLines`, `PhaseBands`, `DialysisThresholdLine`, `XAxis`, `YAxis`, `StartPointLabel`, `EndPointLabels`, `ConfidenceTierBadge`, `ChartFootnote`
5. **AccessibleDataTable** — Hidden `<table>` for screen readers
6. **Error handling** — `ApiRequestError` class, error envelope parsing, field-error mapping to form, toast for non-field errors
7. **Loading states** — `loading.tsx` skeletons for root and `/results`

**Unit tests:** NumberInput states, SexRadioGroup selection, formStore transformations, validation rules, resolveCollisions algorithm, parseApiError parsing.

**Exit criteria:** Guest prediction flow works end-to-end (form -> chart) against MSW mocks. All validations fire correctly. Chart renders 4 lines with correct styles. axe-core zero critical violations.

### 11.3 Sprint 2 — Stat Cards + Disclaimers + Optional Fields

**Duration:** 2 weeks
**Goal:** Results page is complete. Optional/silent fields sharpen predictions.

**Deliverables:**

1. **StatCardGrid + StatCard** — 4 treatment scenario cards with colored borders, eGFR values, delta from start, dialysis age. Responsive grid (4-col / 2x2 / stacked).
2. **UnlockPrompt** — "Add hemoglobin and glucose to sharpen your prediction" (Tier 1 only, Decision #12)
3. **OptionalFieldsSection** — Collapsible accordion with hemoglobin + glucose inputs. "Sharpen your prediction" label. Green dot indicator when values entered.
4. **SilentFieldsSection** — Collapsible accordion with BP, SGLT2 toggle, proteinuria, CKD diagnosis. "Additional health info" label.
5. **Confidence tier integration** — Tier badge reflects API response; UnlockPrompt conditional rendering
6. **DisclaimerBlock** (desktop inline) + **DisclaimerFooter** (mobile sticky) — Decision #11
7. **Responsive polish** — Full responsive layout per Section 8: form grid, stat card grid, chart scroll affordance, disclaimer display switching

**Unit tests:** StatCard rendering per variant, UnlockPrompt visibility logic, FormSection expand/collapse, disclaimer toggle.

**Exit criteria:** Results page renders all elements. Optional fields affect confidence tier in MSW response. Disclaimer displays correctly per breakpoint. Responsive layout matches Inga's spec at all 3 breakpoints.

### 11.4 Sprint 3 — Auth + Accounts

**Duration:** 2 weeks
**Goal:** Magic link authentication, account creation, authenticated prediction flow.

**Deliverables:**

1. **MagicLinkForm** — Email entry on `/auth/login` with `POST /auth/request-link`
2. **MagicLinkSent** — "Check your email" confirmation with masked email, 60s resend cooldown timer
3. **Auth verify page** — `/auth/verify?token=` reads token, calls `POST /auth/verify`, stores access_token in `authStore`, redirects appropriately
4. **SavePrompt** — Appears on results page for guests (2s delay, slide-in animation). Email entry triggers magic link flow. Hidden for authenticated users.
5. **AuthBanner** — Context banners: "Welcome back", "Check your email", "Link expired"
6. **Account layout** — `/account/layout.tsx` with auth guard (redirect to login if unauthenticated)
7. **Account dashboard** — `/account/page.tsx` showing user info, past predictions, "Enter new lab values" CTA
8. **Middleware** — `middleware.ts` protecting `/account/*` routes via session cookie check
9. **API client auth** — Bearer token injection, 401 detection, refresh token flow, auth state clearing on refresh failure
10. **Header** — Logo, nav links, auth status indicator (Sign in / user email)

**Unit tests:** MagicLinkForm submission, resend cooldown timer, authStore setAuth/clearAuth, API client token injection, middleware redirect logic.

**Exit criteria:** Full magic link flow works against MSW mocks (request -> verify -> authenticated state). Account pages render for authenticated users, redirect for guests. SavePrompt appears for guests only. Token refresh flow handles 401.

### 11.5 Sprint 4 — Multi-Visit + Slope + Polish

**Duration:** 2 weeks
**Goal:** Returning users can add visits, see trend analysis. Production polish.

**Deliverables:**

1. **Multi-visit form** — `VisitDatePicker` visible when `?mode=add-visit`. Pre-populate age/sex from profile.
2. **Lab entry storage** — `useCreateLabEntry` mutation for `POST /lab-entries`, cache invalidation
3. **History page** — `/account/history/page.tsx` listing past lab entries with dates, "Add another lab test" CTA
4. **SlopeTag** — Trend indicator (improving/stable/declining + numeric slope) shown when 2+ visits. Visual: green up-arrow / gray dash / red down-arrow + value.
5. **Confidence tier progression** — Chart and badge update to reflect multi-visit tier upgrades (Tier 2 -> Tier 3)
6. **Storybook** — All component stories from Section 10.3
7. **Accessibility audit** — Full VoiceOver walkthrough, keyboard-only navigation test, axe-core coverage report
8. **Performance** — Lighthouse audit targeting 90+ on mobile. Lazy-load chart via `dynamic()` import. Optimize SVG rendering.
9. **Edge cases** — Empty states (no past entries), error recovery, session expiry messaging, network offline handling

**Unit tests:** VisitDatePicker validation, SlopeTag rendering per slope_description, history page data fetching.

**Exit criteria:** Multi-visit flow works end-to-end. Slope tag renders correctly for 2+ and 3+ visits. All Storybook stories render. VoiceOver audit passes. Lighthouse mobile score 90+. Yuri's E2E test suite passes.

---

## Appendix: Design Token Reference (from Inga)

These tokens are implemented as Tailwind CSS custom properties in `globals.css`:

| Token | Value | Usage |
|-------|-------|-------|
| `--primary` | #1D9E75 | CTA buttons, BUN<=12 line |
| `--primary-light` | #E8F5F0 | Phase 2 band, success bg |
| `--secondary` | #378ADD | BUN 13-17 line |
| `--secondary-light` | #85B7EB | BUN 18-24 line |
| `--neutral` | #AAAAAA | No-treatment line, disabled |
| `--destructive` | #D32F2F | Dialysis threshold, errors |
| `--foreground` | #1A1A1A | Body text |
| `--muted-foreground` | #666666 | Helper text, labels |
| `--background` | #FFFFFF | Page background |
| `--card` | #F8F9FA | Card backgrounds |
| `--border` | #E0E0E0 | Input borders |

---

*Drafted by Harshit — 2026-03-25*
*Pending cross-review from Inga (design alignment), John (API contract alignment), and Yuri (testid completeness).*
