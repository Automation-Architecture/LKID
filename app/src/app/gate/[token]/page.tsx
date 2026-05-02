"use client";

/**
 * LKID-63 — /gate/[token] — Email capture gate.
 *
 * Fetches GET /results/[token] on mount:
 *   • 404/410 → "invalid/expired" state with link back to /labs.
 *   • 200 + captured=true → user has already completed the gate;
 *     redirect to /results/[token].
 *   • 200 + captured=false → show blurred preview + name/email form.
 *
 * Submit posts to /leads; on success navigate to /results/[token].
 * Token lives only in the URL path — no sessionStorage.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Manrope, Nunito_Sans } from "next/font/google";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import { apiUrl } from "@/lib/api";
import { posthog } from "@/lib/posthog-provider";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});
const nunito = Nunito_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-nunito",
  display: "swap",
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; egfrBaseline: number | null }
  | { kind: "invalid" }
  | { kind: "error"; message: string };

interface ResultsResponse {
  report_token: string;
  captured: boolean;
  created_at: string;
  result: {
    egfr_baseline?: number;
  } | null;
}

const GATE_CSS = `
.kh-gate {
  --navy: #1F2577;
  --navy-deep: #161B5E;
  --ink: #0E0E12;
  --ink-2: #2E2F36;
  --body: #5C5F6A;
  --muted: var(--kh-muted);
  --bg: #F4F5F7;
  --card: #FFFFFF;
  --border: #E4E6EB;
  --error: #C5352B;
  --shadow-md: 0 6px 20px rgba(20, 28, 70, .08);
  --shadow-lg: 0 20px 60px rgba(20, 28, 70, .18);

  font-family: var(--font-nunito), 'Nunito Sans', system-ui, sans-serif;
  background: var(--bg);
  color: var(--ink);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
.kh-gate *, .kh-gate *::before, .kh-gate *::after { box-sizing: border-box; }
.kh-gate .display {
  font-family: var(--font-manrope), 'Manrope', sans-serif;
  font-weight: 800;
  letter-spacing: -0.01em;
  line-height: 1.08;
  text-transform: uppercase;
}

/* Page */
.kh-gate main {
  flex: 1;
  position: relative;
  overflow: hidden;
}

/* Blurred preview (static, only for visual interest behind the modal) */
.kh-gate .preview-wrap {
  padding: 48px 24px 120px;
  filter: blur(8px);
  pointer-events: none;
  user-select: none;
  opacity: .85;
}
.kh-gate .preview-card {
  max-width: 880px;
  margin: 0 auto;
  background: #fff;
  border-radius: 18px;
  padding: 32px 36px;
  box-shadow: var(--shadow-md);
}
.kh-gate .preview-title {
  font-family: var(--font-manrope), 'Manrope', sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: var(--navy);
  margin: 0 0 8px;
}
.kh-gate .preview-sub {
  color: var(--ink-2);
  font-size: 14px;
  margin-bottom: 24px;
}
.kh-gate .preview-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}
.kh-gate .preview-stat {
  background: var(--bg);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
}
.kh-gate .preview-stat .value {
  font-family: var(--font-manrope), 'Manrope', sans-serif;
  font-size: 28px;
  font-weight: 700;
  color: var(--navy);
}
.kh-gate .preview-stat .label {
  font-size: 12px;
  color: var(--ink-2);
  margin-top: 4px;
}
.kh-gate .preview-chart {
  background: var(--bg);
  border-radius: 12px;
  height: 220px;
  display: flex;
  align-items: flex-end;
  padding: 20px;
  gap: 8px;
}
.kh-gate .preview-chart .bar {
  flex: 1;
  background: linear-gradient(to top, var(--navy), #8FA8E8);
  border-radius: 4px 4px 0 0;
}

/* Overlay dim — top offset tracks Header height (48px / 56px / 64px) */
.kh-gate .overlay {
  position: fixed;
  inset: 48px 0 0 0;
  background: rgba(20, 28, 70, 0.35);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 48px 20px 48px;
  overflow-y: auto;
  z-index: 100;
}

/* Modal card */
.kh-gate .modal {
  background: #fff;
  border-radius: 16px;
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-width: 480px;
  padding: 36px 36px 32px;
}
.kh-gate .modal h1 {
  font-size: clamp(24px, 3.2vw, 34px);
  color: var(--ink);
  margin: 0 0 10px;
}
.kh-gate .modal .lede {
  color: var(--body);
  font-size: 14px;
  margin: 0 0 24px;
  line-height: 1.55;
}
.kh-gate .field { margin-bottom: 18px; }
.kh-gate .field label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 8px;
}
.kh-gate .field input {
  width: 100%;
  height: 48px;
  padding: 0 16px;
  border: 1px solid var(--border);
  border-radius: 10px;
  font-size: 16px;
  color: var(--ink);
  background: #fff;
  font-family: inherit;
  min-height: 44px;
  transition: border-color .15s, box-shadow .15s;
}
.kh-gate .field input::placeholder { color: #B5B8C0; }
.kh-gate .field input:focus {
  outline: none;
  border-color: var(--navy);
  box-shadow: 0 0 0 3px rgba(31,37,119,.12);
}
.kh-gate .field.error input { border-color: var(--error); }
.kh-gate .field .hint {
  margin-top: 6px;
  font-size: 12px;
  color: var(--body);
  min-height: 18px;
}
.kh-gate .field.error .hint { color: var(--error); font-weight: 500; }

.kh-gate .submit-row { display: flex; justify-content: center; margin-top: 10px; }
.kh-gate .cta-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--navy);
  color: #fff;
  border: 0;
  padding: 14px 48px;
  border-radius: 999px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  min-height: 52px;
  width: 100%;
  font-family: inherit;
  transition: background .15s, transform .15s;
}
.kh-gate .cta-pill:hover:not(:disabled) { background: var(--navy-deep); transform: translateY(-1px); }
.kh-gate .cta-pill:disabled { opacity: .5; cursor: not-allowed; transform: none; }
.kh-gate .spin {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: kh-spin .8s linear infinite;
  margin-right: 10px;
  vertical-align: -3px;
}
@keyframes kh-spin { to { transform: rotate(360deg); } }

.kh-gate .error-banner {
  background: #FDECEA;
  color: #86231D;
  border: 1px solid #F2B7B1;
  border-radius: 10px;
  padding: 12px 14px;
  font-size: 13px;
  margin-bottom: 18px;
  line-height: 1.45;
}

.kh-gate .privacy {
  margin-top: 18px;
  text-align: center;
  font-size: 12px;
  color: var(--body);
  line-height: 1.6;
}

/* Invalid / loading states */
.kh-gate .state-card {
  max-width: 520px;
  margin: 96px auto;
  background: #fff;
  border-radius: 16px;
  padding: 36px 40px;
  box-shadow: var(--shadow-md);
  text-align: center;
}
.kh-gate .state-card h1 {
  font-size: 24px;
  color: var(--ink);
  margin: 0 0 12px;
}
.kh-gate .state-card p {
  color: var(--body);
  font-size: 14px;
  margin: 0 0 20px;
  line-height: 1.55;
}
.kh-gate .state-card a.btn {
  display: inline-block;
  background: var(--navy);
  color: #fff;
  border-radius: 999px;
  padding: 12px 32px;
  font-weight: 600;
  font-size: 15px;
  text-decoration: none;
  min-height: 44px;
  line-height: 20px;
}
.kh-gate .state-card a.btn:hover { background: var(--navy-deep); }

/* Overlay top tracks Header height at each breakpoint (matches h-12/md:h-14/lg:h-16) */
@media (min-width: 768px)  { .kh-gate .overlay { inset-top: 56px; inset: 56px 0 0 0; } }
@media (min-width: 1024px) { .kh-gate .overlay { inset-top: 64px; inset: 64px 0 0 0; } }

/* Mobile */
@media (max-width: 768px) {
  .kh-gate .overlay { padding: 20px 16px 20px; }
  .kh-gate .modal { padding: 28px 24px 24px; border-radius: 14px; }
  .kh-gate .preview-wrap { padding: 24px 16px 80px; }
  .kh-gate .preview-card { padding: 20px 18px; border-radius: 12px; }
  .kh-gate .preview-stats { grid-template-columns: 1fr 1fr; }
  .kh-gate .preview-chart { height: 140px; }
  .kh-gate .state-card { margin: 40px 16px; padding: 28px 22px; }
}
`;

export default function GatePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const router = useRouter();
  const { token } = use(params);

  const [loadState, setLoadState] = useState<LoadState>({ kind: "loading" });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState<{ name?: boolean; email?: boolean }>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Fetch result to determine capture state / invalid token
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(apiUrl(`/results/${encodeURIComponent(token)}`), {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        if (cancelled) return;

        if (res.status === 404 || res.status === 410) {
          setLoadState({ kind: "invalid" });
          return;
        }
        if (!res.ok) {
          setLoadState({
            kind: "error",
            message: "Something went wrong loading your report. Please try again.",
          });
          return;
        }

        const data = (await res.json()) as ResultsResponse;
        if (data.captured) {
          router.replace(`/results/${encodeURIComponent(token)}`);
          return;
        }
        setLoadState({
          kind: "ready",
          egfrBaseline:
            typeof data.result?.egfr_baseline === "number" ? data.result.egfr_baseline : null,
        });
      } catch {
        if (cancelled) return;
        setLoadState({
          kind: "error",
          message: "Unable to reach the prediction service. Please try again.",
        });
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  const errors = useMemo(() => {
    const out: { name: string | null; email: string | null } = { name: null, email: null };
    if (!name.trim()) out.name = "Name is required.";
    else if (name.trim().length > 100) out.name = "Name must be 100 characters or fewer.";
    if (!email.trim()) out.email = "Email is required.";
    else if (!EMAIL_RE.test(email.trim())) out.email = "Please enter a valid email address.";
    return out;
  }, [name, email]);

  const getErr = useCallback(
    (f: "name" | "email"): string | null => {
      if (!touched[f] && !submitted) return null;
      return errors[f];
    },
    [errors, touched, submitted]
  );

  const formValid = errors.name === null && errors.email === null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setApiError(null);
    if (!formValid) return;

    setSubmitting(true);
    try {
      const res = await fetch(apiUrl("/leads"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_token: token,
          name: name.trim(),
          email: email.trim(),
        }),
      });

      if (res.status === 404 || res.status === 410) {
        setLoadState({ kind: "invalid" });
        return;
      }
      if (res.status === 422) {
        const body = await res.json().catch(() => null);
        const msgs = Array.isArray(body?.error?.details)
          ? body.error.details.map((d: { message?: string }) => d.message).filter(Boolean)
          : [];
        setApiError(msgs.length ? msgs.join(" ") : "Please check your name and email and try again.");
        return;
      }
      if (res.status === 429) {
        setApiError("Too many attempts. Please wait a minute and try again.");
        return;
      }
      if (!res.ok) {
        setApiError("Something went wrong. Please try again.");
        return;
      }

      // LKID-71: funnel analytics. Prefix-only — never log the full token (MED-01).
      posthog.capture("gate_captured", {
        report_token_prefix: token.slice(0, 8),
      });
      router.push(`/results/${encodeURIComponent(token)}`);
    } catch {
      setApiError("Unable to reach the service. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`kh-gate ${manrope.variable} ${nunito.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: GATE_CSS }} />

      <main id="main-content">
        {loadState.kind === "loading" && (
          <div className="state-card" aria-busy="true" data-testid="gate-loading">
            <h1>Loading your results…</h1>
            <p>This should only take a moment.</p>
          </div>
        )}

        {loadState.kind === "invalid" && (
          <div className="state-card" role="alert" data-testid="gate-invalid">
            <h1>This link is invalid or has expired</h1>
            <p>We couldn&apos;t find your report. Please enter your lab values again to get a fresh prediction.</p>
            <Link href="/labs" className="btn">Start a new check</Link>
          </div>
        )}

        {loadState.kind === "error" && (
          <div className="state-card" role="alert" data-testid="gate-error">
            <h1>Something went wrong</h1>
            <p>{loadState.message}</p>
            <Link href="/labs" className="btn">Start a new check</Link>
          </div>
        )}

        {loadState.kind === "ready" && (
          <>
            {/* Blurred preview background — decorative only */}
            <div className="preview-wrap" aria-hidden="true" data-testid="gate-preview">
              <div className="preview-card">
                <h2 className="preview-title">Your kidney health prediction</h2>
                <p className="preview-sub">Projected eGFR trajectory over the next 10 years.</p>
                <div className="preview-stats">
                  <div className="preview-stat">
                    <div className="value">
                      {loadState.egfrBaseline != null ? Math.round(loadState.egfrBaseline) : "—"}
                    </div>
                    <div className="label">Current eGFR</div>
                  </div>
                  <div className="preview-stat">
                    <div className="value">—</div>
                    <div className="label">Best case (10yr)</div>
                  </div>
                  <div className="preview-stat">
                    <div className="value">—</div>
                    <div className="label">No treatment (10yr)</div>
                  </div>
                </div>
                <div className="preview-chart">
                  {[60, 55, 48, 52, 46, 40, 38, 34, 30, 25, 22, 18].map((h, i) => (
                    <div key={i} className="bar" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
            </div>

            {/* Gate overlay */}
            <div className="overlay" role="presentation">
              <div
                className="modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="gate-title"
                data-testid="gate-modal"
              >
                <h1 id="gate-title" className="display">See your full results</h1>
                <p className="lede">
                  Enter your name and email to view your kidney health trajectory. We&apos;ll also
                  send a copy of your report to your inbox.
                </p>

                {apiError && (
                  <div role="alert" aria-live="assertive" className="error-banner" data-testid="gate-api-error">
                    {apiError}
                  </div>
                )}

                <form onSubmit={onSubmit} noValidate data-testid="gate-form">
                  <div className={`field${getErr("name") ? " error" : ""}`}>
                    <label htmlFor="gate-name">Name</label>
                    <input
                      id="gate-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      placeholder="Your name"
                      aria-required="true"
                      aria-invalid={!!getErr("name")}
                      aria-describedby="gate-name-hint"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                      data-testid="gate-input-name"
                    />
                    <div
                      id="gate-name-hint"
                      className="hint"
                      role={getErr("name") ? "alert" : undefined}
                    >
                      {getErr("name") ?? "\u00a0"}
                    </div>
                  </div>

                  <div className={`field${getErr("email") ? " error" : ""}`}>
                    <label htmlFor="gate-email">Email</label>
                    <input
                      id="gate-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      placeholder="you@example.com"
                      aria-required="true"
                      aria-invalid={!!getErr("email")}
                      aria-describedby="gate-email-hint"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                      data-testid="gate-input-email"
                    />
                    <div
                      id="gate-email-hint"
                      className="hint"
                      role={getErr("email") ? "alert" : undefined}
                    >
                      {getErr("email") ?? "We\u2019ll send a copy to this address."}
                    </div>
                  </div>

                  <div className="submit-row">
                    <button
                      type="submit"
                      className="cta-pill"
                      disabled={submitting}
                      data-testid="gate-submit"
                    >
                      {submitting ? (
                        <>
                          <span className="spin" aria-hidden="true" />
                          Sending…
                        </>
                      ) : (
                        "View my results"
                      )}
                    </button>
                  </div>

                  <p className="privacy">
                    Your information stays private. We&apos;ll only email you about your report.
                  </p>
                </form>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
