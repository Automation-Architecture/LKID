"use client";

/**
 * LKID-63 — /labs — Lab value entry form (no auth).
 *
 * Replaces the Clerk-gated /predict page for the new tokenized funnel.
 * Submits lab values to POST /predict and routes the user to
 * /gate/[report_token] for email capture.
 *
 * Token is never persisted client-side; it lives in the URL path. No
 * sessionStorage / localStorage writes.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Manrope, Nunito_Sans } from "next/font/google";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  PREDICT_FORM_RULES,
  TIER2_FORM_RULES,
  validateField,
} from "@/lib/validation";
import { apiUrl } from "@/lib/api";

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

interface NumericFieldDef {
  id: string;
  label: string;
  unit: string;
  hint?: string;
  inputMode: "numeric" | "decimal";
  placeholder: string;
}

const REQUIRED_FIELDS: NumericFieldDef[] = [
  { id: "bun", label: "BUN", unit: "mg/dL", hint: "Normal range: 7–20", inputMode: "decimal", placeholder: "e.g. 35" },
  { id: "creatinine", label: "Creatinine", unit: "mg/dL", hint: "Normal range: 0.6–1.2", inputMode: "decimal", placeholder: "e.g. 2.1" },
  { id: "potassium", label: "Potassium", unit: "mEq/L", hint: "Normal range: 3.5–5.0", inputMode: "decimal", placeholder: "e.g. 4.5" },
  { id: "age", label: "Age", unit: "years", inputMode: "numeric", placeholder: "e.g. 58" },
];

const OPTIONAL_FIELDS: NumericFieldDef[] = [
  { id: "hemoglobin", label: "Hemoglobin", unit: "g/dL", inputMode: "decimal", placeholder: "e.g. 11.5" },
  { id: "glucose", label: "Glucose", unit: "mg/dL", inputMode: "numeric", placeholder: "e.g. 105" },
];

const LABS_CSS = `
.kh-labs {
  --navy: #1F2577;
  --navy-deep: #161B5E;
  --ink: #0E0E12;
  --ink-2: #2E2F36;
  --body: #5C5F6A;
  --muted: #8A8D96;
  --bg: #F4F5F7;
  --card: #FFFFFF;
  --border: #E4E6EB;
  --error: #C5352B;
  --shadow-md: 0 6px 20px rgba(20, 28, 70, .08);

  font-family: var(--font-nunito), 'Nunito Sans', system-ui, sans-serif;
  background: var(--bg);
  color: var(--ink);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  font-size: 16px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
.kh-labs *, .kh-labs *::before, .kh-labs *::after { box-sizing: border-box; }

.kh-labs .display {
  font-family: var(--font-manrope), 'Manrope', sans-serif;
  font-weight: 800;
  letter-spacing: -0.01em;
  line-height: 1.05;
  text-transform: uppercase;
}

/* Nav */
.kh-labs .nav {
  background: var(--navy);
  color: #fff;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.kh-labs .nav .brand {
  color: #fff;
  font-weight: 700;
  font-family: var(--font-manrope), 'Manrope', sans-serif;
  font-size: 16px;
  letter-spacing: -0.01em;
  text-decoration: none;
}

/* Page */
.kh-labs main {
  flex: 1;
  padding: 64px 24px 96px;
}
.kh-labs .wrap { max-width: 880px; margin: 0 auto; }
.kh-labs h1.title {
  text-align: center;
  font-size: clamp(34px, 5.4vw, 56px);
  color: var(--ink);
  margin: 0 0 18px;
}
.kh-labs .lede {
  text-align: center;
  color: var(--body);
  font-size: 14px;
  margin: 0 auto 36px;
  max-width: 460px;
  line-height: 1.5;
}

/* Card */
.kh-labs .card {
  background: var(--card);
  border-radius: 12px;
  box-shadow: var(--shadow-md);
  overflow: hidden;
}
.kh-labs .card-head {
  background: var(--navy);
  color: #fff;
  text-align: center;
  padding: 16px 20px;
  font-weight: 600;
  font-size: 17px;
}
.kh-labs .card-body { padding: 32px 36px 28px; }

.kh-labs .grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px 32px;
}
.kh-labs .field label {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 8px;
}
.kh-labs .input-wrap { position: relative; }
.kh-labs .input-wrap input {
  width: 100%;
  height: 48px;
  padding: 0 70px 0 18px;
  border: 1px solid var(--border);
  border-radius: 10px;
  font-size: 16px;
  color: var(--ink);
  background: #fff;
  font-family: inherit;
  transition: border-color .15s, box-shadow .15s;
  min-height: 44px;
}
.kh-labs .input-wrap input::placeholder { color: #B5B8C0; }
.kh-labs .input-wrap input:focus {
  outline: none;
  border-color: var(--navy);
  box-shadow: 0 0 0 3px rgba(31,37,119,.12);
}
.kh-labs .input-wrap .suffix {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--muted);
  font-size: 13px;
  font-weight: 500;
  pointer-events: none;
}
.kh-labs .hint {
  margin-top: 6px;
  font-size: 12px;
  color: var(--muted);
  min-height: 18px;
}
.kh-labs .field.error .input-wrap input { border-color: var(--error); }
.kh-labs .field.error .hint { color: var(--error); font-weight: 500; }
.kh-labs .field.error .input-wrap input:focus {
  box-shadow: 0 0 0 3px rgba(197,53,43,.15);
}

.kh-labs .optional-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 24px;
  gap: 16px;
  flex-wrap: wrap;
}
.kh-labs .add-link {
  color: var(--navy);
  font-weight: 600;
  font-size: 14px;
  background: transparent;
  border: 0;
  cursor: pointer;
  padding: 8px 0;
  font-family: inherit;
  min-height: 44px;
}
.kh-labs .add-link:hover { text-decoration: underline; }
.kh-labs .add-btn {
  background: var(--navy);
  color: #fff;
  border: 0;
  border-radius: 8px;
  padding: 10px 22px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: inherit;
  min-height: 44px;
  transition: background .15s;
}
.kh-labs .add-btn:hover { background: var(--navy-deep); }
.kh-labs .add-btn.expanded { background: #1F8A3A; }
.kh-labs .add-btn.expanded:hover { background: #146C2B; }
.kh-labs .optional-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px 32px;
  margin-top: 22px;
}

.kh-labs .divider { height: 1px; background: var(--border); margin: 28px 0 24px; }

.kh-labs .error-banner {
  background: #FDECEA;
  color: #86231D;
  border: 1px solid #F2B7B1;
  border-radius: 10px;
  padding: 12px 16px;
  font-size: 14px;
  margin-bottom: 24px;
  line-height: 1.45;
}

.kh-labs .submit-row { display: flex; justify-content: center; padding-bottom: 8px; }
.kh-labs .cta-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--navy);
  color: #fff;
  border: 0;
  padding: 16px 56px;
  border-radius: 999px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  min-height: 52px;
  font-family: var(--font-nunito), 'Nunito Sans', sans-serif;
  box-shadow: 0 0 0 8px rgba(255,255,255,.7), 0 0 0 9px rgba(31,37,119,.16);
  transition: transform .15s, box-shadow .15s, background .15s;
}
.kh-labs .cta-pill:hover:not(:disabled) { transform: translateY(-1px); }
.kh-labs .cta-pill:disabled { opacity: .5; cursor: not-allowed; transform: none; }
.kh-labs .spin {
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

/* Footer */
.kh-labs footer.kh-foot {
  background: var(--bg);
  padding: 28px 24px 48px;
  text-align: center;
  font-size: 13px;
  color: var(--muted);
}
.kh-labs .kh-foot .brand-foot {
  color: var(--navy);
  font-weight: 700;
  font-family: var(--font-manrope), 'Manrope', sans-serif;
  font-size: 16px;
  margin-bottom: 10px;
}
.kh-labs .kh-foot nav { display: flex; gap: 24px; justify-content: center; }
.kh-labs .kh-foot a { color: var(--muted); text-decoration: none; padding: 2px 0; }
.kh-labs .kh-foot a:hover { color: var(--ink-2); }

/* Mobile */
@media (max-width: 768px) {
  .kh-labs main { padding: 28px 16px 60px; }
  .kh-labs h1.title { font-size: 30px; margin-bottom: 12px; }
  .kh-labs .lede { font-size: 14px; margin-bottom: 20px; }
  .kh-labs .card { border-radius: 0; margin: 0 -16px; }
  .kh-labs .card-head { font-size: 15px; }
  .kh-labs .card-body { padding: 24px 20px; }
  .kh-labs .grid, .kh-labs .optional-fields { grid-template-columns: 1fr; gap: 20px; }
  .kh-labs .optional-bar { flex-direction: column; align-items: stretch; gap: 12px; margin-top: 20px; }
  .kh-labs .add-btn { width: 100%; justify-content: center; padding: 16px 22px; min-height: 52px; font-size: 16px; }
  .kh-labs .add-link { text-align: left; }
  .kh-labs .cta-pill { padding: 16px 36px; width: 100%; max-width: 320px; }
  .kh-labs .divider { margin: 24px 0 20px; }
}
`;

export default function LabsPage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [values, setValues] = useState<Record<string, string>>({
    bun: "",
    creatinine: "",
    potassium: "",
    age: "",
    hemoglobin: "",
    glucose: "",
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [optionalOpen, setOptionalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const errors = useMemo(() => {
    const out: Record<string, string | null> = {};
    for (const [field, rule] of Object.entries(PREDICT_FORM_RULES)) {
      out[field] = validateField(values[field] ?? "", rule);
    }
    for (const [field, rule] of Object.entries(TIER2_FORM_RULES)) {
      const v = values[field] ?? "";
      out[field] = v.trim() ? validateField(v, rule) : null;
    }
    return out;
  }, [values]);

  const requiredValid = useMemo(
    () => Object.keys(PREDICT_FORM_RULES).every((f) => errors[f] === null),
    [errors]
  );

  const getFieldError = useCallback(
    (field: string): string | null => {
      if (!touched[field] && !submitted) return null;
      return errors[field] ?? null;
    },
    [touched, submitted, errors]
  );

  const setValue = useCallback((field: string, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  const setFieldTouched = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const focusFirstError = useCallback(() => {
    if (!formRef.current) return;
    const firstInvalid = formRef.current.querySelector<HTMLElement>("[aria-invalid='true']");
    if (firstInvalid) {
      firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
      firstInvalid.focus();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setApiError(null);

    if (!requiredValid) {
      requestAnimationFrame(() => focusFirstError());
      return;
    }

    const tier2HasErrors = Object.keys(TIER2_FORM_RULES).some(
      (f) => values[f]?.trim() && errors[f] !== null
    );
    if (tier2HasErrors) {
      requestAnimationFrame(() => focusFirstError());
      return;
    }

    setIsSubmitting(true);

    const payload: Record<string, unknown> = {
      bun: Number(values.bun),
      creatinine: Number(values.creatinine),
      potassium: Number(values.potassium),
      age: Number(values.age),
      sex: "unknown",
    };
    const hemo = values.hemoglobin.trim();
    const gluc = values.glucose.trim();
    if (hemo) payload.hemoglobin = Number(hemo);
    if (gluc) payload.glucose = Number(gluc);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    try {
      const res = await fetch(apiUrl("/predict"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.status === 422) {
        const body = await res.json().catch(() => null);
        const messages = Array.isArray(body?.error?.details)
          ? body.error.details.map((d: { message?: string }) => d.message).filter(Boolean)
          : [];
        setApiError(
          messages.length
            ? `Please check your entries: ${messages.join(" ")}`
            : "Some of your lab values look out of range. Please check and try again."
        );
        setIsSubmitting(false);
        return;
      }
      if (res.status === 429) {
        setApiError("Too many attempts. Please wait a minute and try again.");
        setIsSubmitting(false);
        return;
      }
      if (!res.ok) {
        setApiError("Something went wrong. Please try again.");
        setIsSubmitting(false);
        return;
      }

      const data = (await res.json()) as { report_token?: string };
      if (!data?.report_token) {
        setApiError("The server returned an unexpected response. Please try again.");
        setIsSubmitting(false);
        return;
      }
      router.push(`/gate/${encodeURIComponent(data.report_token)}`);
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof DOMException && err.name === "AbortError") {
        setApiError("Request timed out. Please check your connection and try again.");
      } else {
        setApiError("Unable to reach the prediction service. Please try again later.");
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`kh-labs ${manrope.variable} ${nunito.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: LABS_CSS }} />

      <nav className="nav" aria-label="Main navigation">
        <Link href="/" className="brand">KidneyHood.org</Link>
      </nav>

      <main id="main-content">
        <div className="wrap">
          <h1 className="title display">Enter your lab results</h1>
          <p className="lede">
            You can find these numbers in your blood test results.<br />
            If you&apos;re not sure, you can still continue.
          </p>

          <form
            ref={formRef}
            className="card"
            onSubmit={handleSubmit}
            noValidate
            data-testid="labs-form"
          >
            <div className="card-head">Use values from your recent blood test</div>
            <div className="card-body">
              {apiError && (
                <div role="alert" aria-live="assertive" className="error-banner" data-testid="labs-api-error">
                  {apiError}
                </div>
              )}

              <div aria-live="polite" className="sr-only">
                {submitted && !requiredValid && "Please correct the errors below."}
              </div>

              <div className="grid">
                {REQUIRED_FIELDS.map((f) => (
                  <NumericField
                    key={f.id}
                    def={f}
                    required
                    value={values[f.id] ?? ""}
                    error={getFieldError(f.id)}
                    onChange={(v) => setValue(f.id, v)}
                    onBlur={() => setFieldTouched(f.id)}
                  />
                ))}
              </div>

              <div className="optional-bar">
                <button
                  type="button"
                  className="add-link"
                  aria-expanded={optionalOpen}
                  aria-controls="optional-fields"
                  onClick={() => setOptionalOpen((prev) => !prev)}
                  data-testid="labs-optional-toggle"
                >
                  {optionalOpen ? "Hide optional details" : "Add more details (optional)"}
                </button>
                <button
                  type="button"
                  className={`add-btn${optionalOpen ? " expanded" : ""}`}
                  aria-label={optionalOpen ? "Hide more fields" : "Add more fields"}
                  aria-expanded={optionalOpen}
                  aria-controls="optional-fields"
                  onClick={() => setOptionalOpen((prev) => !prev)}
                >
                  <span>{optionalOpen ? "Hide" : "Add"}</span>
                  <span aria-hidden="true">{optionalOpen ? "−" : "+"}</span>
                </button>
              </div>

              {optionalOpen && (
                <fieldset
                  id="optional-fields"
                  className="optional-fields"
                  data-testid="labs-optional-fields"
                >
                  <legend className="sr-only">Optional lab values for improved accuracy</legend>
                  {OPTIONAL_FIELDS.map((f) => (
                    <NumericField
                      key={f.id}
                      def={f}
                      required={false}
                      value={values[f.id] ?? ""}
                      error={getFieldError(f.id)}
                      onChange={(v) => setValue(f.id, v)}
                      onBlur={() => setFieldTouched(f.id)}
                    />
                  ))}
                </fieldset>
              )}

              <div className="divider" />

              <div className="submit-row">
                <button
                  type="submit"
                  className="cta-pill"
                  disabled={isSubmitting}
                  data-testid="labs-submit"
                >
                  {isSubmitting ? (
                    <>
                      <span className="spin" aria-hidden="true" />
                      Calculating…
                    </>
                  ) : (
                    "See my results"
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>

      <footer className="kh-foot">
        <div className="brand-foot">KidneyHood.org</div>
        <nav aria-label="Footer navigation">
          <a href="/#">Privacy</a>
          <a href="/#">Disclaimer</a>
          <a href="/#">Contact</a>
        </nav>
      </footer>
    </div>
  );
}

interface NumericFieldProps {
  def: NumericFieldDef;
  value: string;
  error: string | null;
  required: boolean;
  onChange: (v: string) => void;
  onBlur: () => void;
}

function NumericField({ def, value, error, required, onChange, onBlur }: NumericFieldProps) {
  const hasError = !!error;
  return (
    <div className={`field${hasError ? " error" : ""}`} data-testid={`labs-field-${def.id}`}>
      <label htmlFor={def.id}>
        {def.label}
        {!required && <span style={{ color: "var(--muted)", fontWeight: 400 }}> (optional)</span>}
      </label>
      <div className="input-wrap">
        <input
          id={def.id}
          name={def.id}
          type="text"
          inputMode={def.inputMode}
          autoComplete="off"
          placeholder={def.placeholder}
          aria-required={required}
          aria-invalid={hasError}
          aria-describedby={`${def.id}-hint`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          data-testid={`labs-input-${def.id}`}
        />
        <span className="suffix" aria-hidden="true">{def.unit}</span>
      </div>
      <div
        id={`${def.id}-hint`}
        className="hint"
        role={hasError ? "alert" : undefined}
        data-testid={hasError ? `labs-error-${def.id}` : undefined}
      >
        {hasError ? error : def.hint ?? "\u00a0"}
      </div>
    </div>
  );
}
