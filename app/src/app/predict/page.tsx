"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser, useAuth } from "@clerk/nextjs";
import { Header } from "@/components/header";
import { DisclaimerBlock } from "@/components/disclaimer-block";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";
import { useFormValidation } from "@/lib/hooks/use-form-validation";
import { PREDICT_FORM_RULES } from "@/lib/validation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const REQUEST_TIMEOUT_MS = 30_000;

interface FormFieldDef {
  id: string;
  label: string;
  type: string;
  inputMode: "text" | "email" | "numeric" | "decimal";
  autoComplete: string;
  placeholder: string;
  helper: string;
  readOnly?: boolean;
  defaultValue?: string;
  min?: number;
  max?: number;
  step?: number;
}

/* Potassium removed per Lee's v2.0 spec correction (Section 2.3) */
const fields: FormFieldDef[] = [
  {
    id: "email",
    label: "Email",
    type: "email",
    inputMode: "email",
    autoComplete: "email",
    placeholder: "your@email.com",
    helper: "Pre-filled from sign-in",
    readOnly: false, // dynamically set based on auth state
  },
  {
    id: "name",
    label: "Name",
    type: "text",
    inputMode: "text",
    autoComplete: "name",
    placeholder: "",
    helper: "",
  },
  {
    id: "age",
    label: "Age",
    type: "number",
    inputMode: "numeric",
    autoComplete: "off",
    placeholder: "",
    helper: "years",
    min: 18,
    max: 120,
    step: 1,
  },
  {
    id: "bun",
    label: "BUN",
    type: "number",
    inputMode: "numeric",
    autoComplete: "off",
    placeholder: "",
    helper: "mg/dL \u2014 Normal range: 7\u201320",
    min: 5,
    max: 150,
    step: 1,
  },
  {
    id: "creatinine",
    label: "Creatinine",
    type: "number",
    inputMode: "decimal",
    autoComplete: "off",
    placeholder: "",
    helper: "mg/dL \u2014 Normal range: 0.6\u20131.2",
    min: 0.1,
    max: 25.0,
    step: 0.1,
  },
];

function getField(id: string): FormFieldDef {
  const field = fields.find((f) => f.id === id);
  if (!field) throw new Error(`Unknown field: ${id}`);
  return field;
}

const fieldRows: string[][] = [
  ["email", "name"],
  ["age", "bun"],
  ["creatinine"],
];

/** Error envelope from Decision #9: { error: { message, code, details[] } } */
interface ApiErrorDetail {
  field?: string;
  message: string;
}

interface ApiErrorEnvelope {
  error: {
    message: string;
    code?: string;
    details?: ApiErrorDetail[];
  };
}

export default function PredictPage() {
  const router = useRouter();
  const { user, isLoaded: isUserLoaded } = useUser();
  const { getToken } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const form = useFormValidation(PREDICT_FORM_RULES);

  // LKID-17: Pre-fill email from Clerk session
  const clerkEmail = isUserLoaded ? (user?.primaryEmailAddress?.emailAddress ?? "") : "";
  const isAuthenticated = isUserLoaded && !!user;
  const [emailValue, setEmailValue] = useState("");

  useEffect(() => {
    if (clerkEmail) {
      setEmailValue(clerkEmail);
    }
  }, [clerkEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    form.markSubmitted();
    setSubmitError(null);
    setFieldErrors({});

    if (!form.valid) return;

    setIsSubmitting(true);

    try {
      // LKID-18: Build request payload
      const payload = {
        email: isAuthenticated ? clerkEmail : emailValue,
        name: form.values.name,
        age: Number(form.values.age),
        bun: Number(form.values.bun),
        creatinine: Number(form.values.creatinine),
      };

      // Get Clerk JWT for Authorization header
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      const token = await getToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // POST to backend with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const response = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Parse Decision #9 error envelope
        let errorBody: ApiErrorEnvelope | null = null;
        try {
          errorBody = await response.json() as ApiErrorEnvelope;
        } catch {
          // Response body is not JSON
        }

        if (errorBody?.error) {
          // Map field-level errors from details[]
          if (errorBody.error.details && errorBody.error.details.length > 0) {
            const fErrors: Record<string, string> = {};
            for (const detail of errorBody.error.details) {
              if (detail.field) {
                fErrors[detail.field] = detail.message;
              }
            }
            if (Object.keys(fErrors).length > 0) {
              setFieldErrors(fErrors);
            }
          }
          setSubmitError(errorBody.error.message);
        } else {
          setSubmitError(`Server error (${response.status}). Please try again.`);
        }
        return;
      }

      // Success: store result and redirect
      const result = await response.json();
      sessionStorage.setItem("prediction_result", JSON.stringify(result));
      router.push("/results");
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setSubmitError("Request timed out. Please check your connection and try again.");
      } else if (err instanceof TypeError && err.message.includes("fetch")) {
        setSubmitError("Network error. Please check your connection and try again.");
      } else {
        setSubmitError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <main id="main-content" className="flex flex-1 flex-col items-center px-4 pb-16 md:px-6 lg:px-8">
        <div className="w-full max-w-[640px]">
          <h1 className="mt-6 text-xl font-semibold text-foreground md:mt-8">
            Enter Your Lab Values
          </h1>

          <form onSubmit={handleSubmit} noValidate className="mt-6">
            <div aria-live="polite" className="sr-only">
              {form.submitted && !form.valid && "Please correct the errors below."}
            </div>

            {/* API-level error banner */}
            {submitError && (
              <div
                role="alert"
                className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {submitError}
              </div>
            )}

            {/* Mobile: single column */}
            <div className="space-y-3 md:hidden">
              {fields.map((field) => (
                <FieldBlock
                  key={field.id}
                  field={field}
                  form={form}
                  isAuthenticated={isAuthenticated}
                  emailValue={emailValue}
                  onEmailChange={setEmailValue}
                  apiFieldError={fieldErrors[field.id]}
                />
              ))}
            </div>

            {/* Tablet + Desktop: 2-column grid */}
            <div className="hidden md:grid md:grid-cols-2 md:gap-4">
              {fieldRows.map((row) =>
                row.map((id) => (
                  <FieldBlock
                    key={id}
                    field={getField(id)}
                    form={form}
                    isAuthenticated={isAuthenticated}
                    emailValue={emailValue}
                    onEmailChange={setEmailValue}
                    apiFieldError={fieldErrors[id]}
                  />
                ))
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="mt-6 h-14 w-full rounded-lg text-base font-bold"
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

interface FieldBlockProps {
  field: FormFieldDef;
  form: ReturnType<typeof useFormValidation>;
  isAuthenticated: boolean;
  emailValue: string;
  onEmailChange: (value: string) => void;
  apiFieldError?: string;
}

function FieldBlock({ field, form, isAuthenticated, emailValue, onEmailChange, apiFieldError }: FieldBlockProps) {
  const isEmail = field.id === "email";
  const isReadOnly = isEmail && isAuthenticated;
  const isValidated = field.id in PREDICT_FORM_RULES;
  const formError = isReadOnly ? null : form.getFieldError(field.id);
  const error = apiFieldError || formError;
  const hasError = !!error;

  // For the email field, use emailValue prop; for others, use form state
  const inputValue = isEmail
    ? emailValue
    : form.values[field.id];

  const handleChange = isEmail
    ? (e: React.ChangeEvent<HTMLInputElement>) => onEmailChange(e.target.value)
    : (e: React.ChangeEvent<HTMLInputElement>) => form.setValue(field.id, e.target.value);

  const handleBlur = isReadOnly
    ? undefined
    : () => form.setFieldTouched(field.id);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.id}>
        {field.label}
        {isValidated && " *"}
      </Label>
      <div className="relative">
        <Input
          id={field.id}
          type={field.type}
          inputMode={field.inputMode}
          autoComplete={field.autoComplete}
          placeholder={isEmail && isAuthenticated ? "" : field.placeholder}
          readOnly={isReadOnly}
          min={field.min}
          max={field.max}
          step={field.step}
          aria-required={isValidated}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? `${field.id}-error` : field.helper ? `${field.id}-helper` : undefined
          }
          value={inputValue ?? ""}
          onChange={isReadOnly ? undefined : handleChange}
          onBlur={handleBlur}
          className={`h-12 text-base ${
            isReadOnly
              ? "cursor-default bg-[#F8F9FA] pr-10"
              : hasError
                ? "border-red-500 focus-visible:ring-red-500"
                : ""
          }`}
        />
        {isReadOnly && (
          <Lock
            className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
        )}
      </div>
      {hasError && (
        <p id={`${field.id}-error`} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {!hasError && field.helper && (
        <p id={`${field.id}-helper`} className="text-sm text-muted-foreground">
          {isEmail && isAuthenticated ? "Pre-filled from sign-in" : field.helper}
        </p>
      )}
    </div>
  );
}
