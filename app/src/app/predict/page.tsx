// @ts-nocheck — Clerk v7 type incompatibilities; full migration deferred to Sprint 3
"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser, useAuth } from "@clerk/nextjs";
import { Header } from "@/components/header";
import { DisclaimerBlock } from "@/components/disclaimer-block";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown } from "lucide-react";
import {
  PREDICT_FORM_RULES,
  TIER2_FORM_RULES,
  validateField,
  type ValidationRule,
} from "@/lib/validation";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

type SexValue = "male" | "female" | "unknown";

interface NumericFieldDef {
  kind: "numeric";
  id: string;
  label: string;
  unit: string;
  helperExtra?: string;
  inputMode: "numeric" | "decimal";
  step: number;
  placeholder: string;
  rules: ValidationRule;
}

interface SexFieldDef {
  kind: "sex";
  id: "sex";
}

type FieldDef = NumericFieldDef | SexFieldDef;

/* -------------------------------------------------------------------------- */
/*  Field definitions                                                         */
/* -------------------------------------------------------------------------- */

const REQUIRED_FIELDS: FieldDef[] = [
  {
    kind: "numeric",
    id: "bun",
    label: "BUN",
    unit: "mg/dL",
    helperExtra: "Normal range: 7\u201320",
    inputMode: "numeric",
    step: 1,
    placeholder: "e.g. 35",
    rules: PREDICT_FORM_RULES.bun,
  },
  {
    kind: "numeric",
    id: "creatinine",
    label: "Creatinine",
    unit: "mg/dL",
    helperExtra: "Normal range: 0.6\u20131.2",
    inputMode: "decimal",
    step: 0.1,
    placeholder: "e.g. 2.1",
    rules: PREDICT_FORM_RULES.creatinine,
  },
  {
    kind: "numeric",
    id: "potassium",
    label: "Potassium",
    unit: "mEq/L",
    helperExtra: "Normal range: 3.5\u20135.0",
    inputMode: "decimal",
    step: 0.1,
    placeholder: "e.g. 4.5",
    rules: PREDICT_FORM_RULES.potassium,
  },
  {
    kind: "numeric",
    id: "age",
    label: "Age",
    unit: "years",
    inputMode: "numeric",
    step: 1,
    placeholder: "e.g. 58",
    rules: PREDICT_FORM_RULES.age,
  },
  { kind: "sex", id: "sex" },
];

const TIER2_FIELDS: NumericFieldDef[] = [
  {
    kind: "numeric",
    id: "hemoglobin",
    label: "Hemoglobin",
    unit: "g/dL",
    inputMode: "decimal",
    step: 0.1,
    placeholder: "e.g. 11.5",
    rules: TIER2_FORM_RULES.hemoglobin,
  },
  {
    kind: "numeric",
    id: "glucose",
    label: "Glucose",
    unit: "mg/dL",
    inputMode: "numeric",
    step: 1,
    placeholder: "e.g. 105",
    rules: TIER2_FORM_RULES.glucose,
  },
];

const SEX_OPTIONS: { value: SexValue; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "unknown", label: "Prefer not to say" },
];

/* -------------------------------------------------------------------------- */
/*  API base URL                                                              */
/* -------------------------------------------------------------------------- */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/* -------------------------------------------------------------------------- */
/*  Page component                                                            */
/* -------------------------------------------------------------------------- */

export default function PredictPage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  /* --- Clerk auth --- */
  const { user, isSignedIn } = useUser();
  const { getToken } = useAuth();

  /* --- form state --- */
  const [values, setValues] = useState<Record<string, string>>({
    name: "",
    email: "",
    bun: "",
    creatinine: "",
    potassium: "",
    age: "",
    sex: "",
    hemoglobin: "",
    glucose: "",
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  /* --- LKID-17: pre-fill email from Clerk session --- */
  const clerkEmail = user?.primaryEmailAddress?.emailAddress;
  useEffect(() => {
    if (isSignedIn && clerkEmail) {
      setValues((prev) => ({ ...prev, email: clerkEmail }));
    }
  }, [isSignedIn, clerkEmail]);

  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [tier2Open, setTier2Open] = useState(false);

  /* --- validation --- */
  const errors = useMemo(() => {
    const result: Record<string, string | null> = {};
    // Name and email
    result.name = values.name.trim() ? null : "Name is required";
    result.email = values.email.trim()
      ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)
        ? null
        : "Please enter a valid email"
      : "Email is required";
    // Required fields always validated
    for (const [field, rule] of Object.entries(PREDICT_FORM_RULES)) {
      result[field] = validateField(values[field] ?? "", rule);
    }
    // Tier 2 only validated when they have values
    for (const [field, rule] of Object.entries(TIER2_FORM_RULES)) {
      const val = values[field] ?? "";
      result[field] = val.trim() ? validateField(val, rule) : null;
    }
    return result;
  }, [values]);

  const requiredValid = useMemo(
    () =>
      errors.name === null &&
      errors.email === null &&
      Object.keys(PREDICT_FORM_RULES).every(
        (field) => errors[field] === null
      ),
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

  /* --- focus first error field --- */
  const focusFirstError = useCallback(() => {
    if (!formRef.current) return;
    const firstInvalid = formRef.current.querySelector<HTMLElement>(
      "[aria-invalid='true']"
    );
    if (firstInvalid) {
      firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
      firstInvalid.focus();
    }
  }, []);

  /* --- submission --- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setApiError(null);

    if (!requiredValid) {
      requestAnimationFrame(() => focusFirstError());
      return;
    }

    // Check tier2 errors if values provided
    const tier2HasErrors = Object.keys(TIER2_FORM_RULES).some(
      (f) => errors[f] !== null
    );
    if (tier2HasErrors) {
      requestAnimationFrame(() => focusFirstError());
      return;
    }

    setIsSubmitting(true);

    // Build payload matching John's PredictRequest schema
    const payload: Record<string, unknown> = {
      name: values.name,
      email: values.email,
      bun: Number(values.bun),
      creatinine: Number(values.creatinine),
      potassium: Number(values.potassium),
      age: Number(values.age),
      sex: values.sex,
    };

    // Include tier 2 if both provided
    const hemo = values.hemoglobin.trim();
    const gluc = values.glucose.trim();
    if (hemo && gluc) {
      payload.hemoglobin = Number(hemo);
      payload.glucose = Number(gluc);
    }

    // LKID-18: 30-second timeout via AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    try {
      // LKID-18: Get JWT token for authenticated requests
      const token = await getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE}/predict`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        // Decision #9: parse body.error.details[].message for field-level errors
        if (body?.error?.details && Array.isArray(body.error.details)) {
          const messages = body.error.details
            .map((d: { message?: string }) => d.message)
            .filter(Boolean);
          if (messages.length > 0) {
            setApiError(messages.join(" "));
          } else {
            setApiError(
              body.error.message ?? "Prediction failed. Please try again."
            );
          }
        } else {
          setApiError("Prediction failed. Please try again.");
        }
        setIsSubmitting(false);
        return;
      }

      const result = await res.json();
      sessionStorage.setItem("prediction_result", JSON.stringify(result));
      // Store full inputs for PDF generation + display-only callouts.
      sessionStorage.setItem(
        "prediction_inputs",
        JSON.stringify(payload)
      );
      router.push("/results");
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof DOMException && err.name === "AbortError") {
        setApiError(
          "Request timed out. Please check your connection and try again."
        );
      } else {
        setApiError(
          "Unable to connect to the prediction service. Please try again later."
        );
      }
      setIsSubmitting(false);
    }
  };

  /* --- error count for summary --- */
  const errorCount = submitted
    ? Object.keys(PREDICT_FORM_RULES).filter((f) => errors[f] !== null)
        .length +
      Object.keys(TIER2_FORM_RULES).filter(
        (f) => values[f]?.trim() && errors[f] !== null
      ).length
    : 0;

  return (
    <>
      <Header />
      <main
        id="main-content"
        className="flex flex-1 flex-col items-center px-4 pb-16 md:px-6 lg:px-8"
      >
        <div className="w-full max-w-[640px]">
          <h1
            className="mt-6 text-xl font-semibold text-foreground md:mt-8"
            data-testid="predict-heading"
          >
            Enter Your Lab Values
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Fields marked with * are required.
          </p>

          <form
            ref={formRef}
            onSubmit={handleSubmit}
            noValidate
            className="mt-6"
            data-testid="prediction-form"
          >
            {/* --- Error summary banner --- */}
            {submitted && errorCount > 0 && (
              <div
                role="alert"
                aria-live="assertive"
                className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                data-testid="error-summary"
              >
                Please fix {errorCount} field{errorCount > 1 ? "s" : ""}{" "}
                below to continue.
              </div>
            )}

            {/* --- API error --- */}
            {apiError && (
              <div
                role="alert"
                className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                data-testid="api-error"
              >
                {apiError}
              </div>
            )}

            {/* --- Screen reader announcement --- */}
            <div aria-live="polite" className="sr-only">
              {submitted && !requiredValid &&
                "Please correct the errors below."}
            </div>

            {/* -------------------------------------------------------------- */}
            {/*  Name field                                                    */}
            {/* -------------------------------------------------------------- */}
            <div className="mb-6 space-y-1.5" data-testid="field-name">
              <Label htmlFor="name">
                Name <span aria-hidden="true">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Your full name"
                autoComplete="name"
                aria-required="true"
                aria-invalid={!!getFieldError("name")}
                value={values.name}
                onChange={(e) => setValue("name", e.target.value)}
                onBlur={() => setFieldTouched("name")}
                className="h-12 text-base"
                data-testid="input-name"
              />
              {getFieldError("name") && (
                <p className="text-sm text-destructive" data-testid="error-name">
                  {getFieldError("name")}
                </p>
              )}
            </div>

            {/* -------------------------------------------------------------- */}
            {/*  Email field (LKID-17: pre-filled + read-only when signed in)  */}
            {/* -------------------------------------------------------------- */}
            <div className="mb-6 space-y-1.5" data-testid="field-email">
              <Label htmlFor="email">
                Email <span aria-hidden="true">*</span>
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="your@email.com"
                autoComplete="email"
                inputMode="email"
                aria-required="true"
                value={values.email}
                onChange={(e) => setValue("email", e.target.value)}
                onBlur={() => setFieldTouched("email")}
                readOnly={!!isSignedIn}
                className={`h-12 text-base ${
                  isSignedIn ? "bg-muted/50 text-muted-foreground cursor-not-allowed" : ""
                }`}
                aria-invalid={!!getFieldError("email")}
                data-testid="input-email"
              />
              {isSignedIn && (
                <p className="text-sm text-muted-foreground">
                  Pre-filled from your account.
                </p>
              )}
              {getFieldError("email") && (
                <p className="text-sm text-destructive" data-testid="error-email">
                  {getFieldError("email")}
                </p>
              )}
            </div>

            {/* -------------------------------------------------------------- */}
            {/*  Required fields                                                */}
            {/* -------------------------------------------------------------- */}
            <fieldset>
              <legend className="mb-3 text-base font-semibold text-foreground">
                Lab Values &amp; Demographics
              </legend>

              {/* Mobile: single column */}
              <div className="space-y-4 md:hidden">
                {REQUIRED_FIELDS.map((field) =>
                  field.kind === "sex" ? (
                    <SexField
                      key="sex"
                      value={values.sex as SexValue | ""}
                      error={getFieldError("sex")}
                      onChange={(v) => setValue("sex", v)}
                      onBlur={() => setFieldTouched("sex")}
                    />
                  ) : (
                    <NumericField
                      key={field.id}
                      field={field}
                      value={values[field.id]}
                      error={getFieldError(field.id)}
                      onChange={(v) => setValue(field.id, v)}
                      onBlur={() => setFieldTouched(field.id)}
                      required
                    />
                  )
                )}
              </div>

              {/* Tablet + Desktop: 2-column grid */}
              <div className="hidden md:grid md:grid-cols-2 md:gap-x-4 md:gap-y-4">
                {REQUIRED_FIELDS.map((field) =>
                  field.kind === "sex" ? (
                    <SexField
                      key="sex"
                      value={values.sex as SexValue | ""}
                      error={getFieldError("sex")}
                      onChange={(v) => setValue("sex", v)}
                      onBlur={() => setFieldTouched("sex")}
                    />
                  ) : (
                    <NumericField
                      key={field.id}
                      field={field}
                      value={values[field.id]}
                      error={getFieldError(field.id)}
                      onChange={(v) => setValue(field.id, v)}
                      onBlur={() => setFieldTouched(field.id)}
                      required
                    />
                  )
                )}
              </div>
            </fieldset>

            {/* -------------------------------------------------------------- */}
            {/*  Tier 2 optional fields -- collapsible                          */}
            {/* -------------------------------------------------------------- */}
            <div className="mt-6" data-testid="tier2-section">
              <button
                type="button"
                onClick={() => setTier2Open((prev) => !prev)}
                aria-expanded={tier2Open}
                aria-controls="tier2-fields"
                className="flex min-h-[44px] w-full items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                data-testid="tier2-toggle"
              >
                <span>
                  Add more labs to improve accuracy
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    Optional
                  </span>
                </span>
                <ChevronDown
                  className={`size-4 text-muted-foreground transition-transform ${
                    tier2Open ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                />
              </button>

              {tier2Open && (
                <fieldset
                  id="tier2-fields"
                  className="mt-3"
                  data-testid="tier2-fields"
                >
                  <legend className="sr-only">
                    Optional lab values for improved prediction
                  </legend>
                  <p className="mb-3 text-sm text-muted-foreground">
                    Add hemoglobin <strong>and</strong> glucose to improve
                    prediction accuracy.
                  </p>
                  <div className="space-y-4 md:grid md:grid-cols-2 md:gap-x-4 md:gap-y-4 md:space-y-0">
                    {TIER2_FIELDS.map((field) => (
                      <NumericField
                        key={field.id}
                        field={field}
                        value={values[field.id]}
                        error={getFieldError(field.id)}
                        onChange={(v) => setValue(field.id, v)}
                        onBlur={() => setFieldTouched(field.id)}
                        required={false}
                      />
                    ))}
                  </div>
                </fieldset>
              )}
            </div>

            {/* -------------------------------------------------------------- */}
            {/*  Submit                                                         */}
            {/* -------------------------------------------------------------- */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="mt-6 h-14 w-full rounded-lg text-base font-bold"
              data-testid="submit-button"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="size-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Calculating...
                </span>
              ) : (
                "See My Prediction"
              )}
            </Button>
          </form>
        </div>
      </main>
      <DisclaimerBlock />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  NumericField component                                                    */
/* -------------------------------------------------------------------------- */

interface NumericFieldProps {
  field: NumericFieldDef;
  value: string;
  error: string | null;
  onChange: (v: string) => void;
  onBlur: () => void;
  required: boolean;
}

function NumericField({
  field,
  value,
  error,
  onChange,
  onBlur,
  required,
}: NumericFieldProps) {
  const hasError = !!error;

  return (
    <div className="space-y-1.5" data-testid={`field-${field.id}`}>
      <Label htmlFor={field.id}>
        {field.label}
        {required && <span aria-hidden="true"> *</span>}
        {!required && (
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            (optional)
          </span>
        )}
      </Label>
      <div className="relative">
        <Input
          id={field.id}
          name={field.id}
          type="text"
          inputMode={field.inputMode}
          autoComplete="off"
          placeholder={field.placeholder}
          aria-required={required}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? `${field.id}-error` : `${field.id}-helper`
          }
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={`h-12 min-h-[44px] pr-16 text-base ${
            hasError
              ? "border-red-500 focus-visible:ring-red-500"
              : ""
          }`}
          data-testid={`input-${field.id}`}
        />
        <span
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
          aria-hidden="true"
        >
          {field.unit}
        </span>
      </div>
      {hasError && (
        <p
          id={`${field.id}-error`}
          className="text-sm text-red-600"
          role="alert"
          data-testid={`error-${field.id}`}
        >
          {error}
        </p>
      )}
      {!hasError && (
        <p
          id={`${field.id}-helper`}
          className="text-sm text-muted-foreground"
        >
          {field.unit}
          {field.helperExtra && ` \u2014 ${field.helperExtra}`}
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  SexField component                                                        */
/* -------------------------------------------------------------------------- */

interface SexFieldProps {
  value: SexValue | "";
  error: string | null;
  onChange: (v: SexValue) => void;
  onBlur: () => void;
}

function SexField({ value, error, onChange, onBlur }: SexFieldProps) {
  const hasError = !!error;

  return (
    <div className="space-y-1.5" data-testid="field-sex">
      <span id="sex-label" className="text-base font-semibold text-foreground select-none">
        Sex <span aria-hidden="true">*</span>
      </span>
      <div
        role="radiogroup"
        aria-labelledby="sex-label"
        aria-required="true"
        aria-invalid={hasError}
        aria-describedby={hasError ? "sex-error" : "sex-helper"}
        className="flex gap-2"
        data-testid="input-sex"
      >
        {SEX_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={`flex min-h-[44px] flex-1 cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition-colors select-none
              ${
                value === opt.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-foreground hover:bg-muted/50"
              }
              ${hasError ? "border-red-500" : ""}
              focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2`}
          >
            <input
              type="radio"
              name="sex"
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              onBlur={onBlur}
              className="sr-only"
              aria-label={opt.label}
              data-testid={`radio-sex-${opt.value}`}
            />
            {opt.label}
          </label>
        ))}
      </div>
      {hasError && (
        <p
          id="sex-error"
          className="text-sm text-red-600"
          role="alert"
          data-testid="error-sex"
        >
          {error}
        </p>
      )}
      {!hasError && (
        <p id="sex-helper" className="text-sm text-muted-foreground">
          Used in eGFR calculation
        </p>
      )}
    </div>
  );
}
