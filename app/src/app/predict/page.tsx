"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { DisclaimerBlock } from "@/components/disclaimer-block";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";

interface FormField {
  id: string;
  label: string;
  required: boolean;
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

const fields: FormField[] = [
  {
    id: "email",
    label: "Email",
    required: false,
    type: "email",
    inputMode: "email",
    autoComplete: "email",
    placeholder: "j***@email.com",
    helper: "Pre-filled from sign-in",
    readOnly: true,
    defaultValue: "j***@email.com",
  },
  {
    id: "name",
    label: "Name",
    required: true,
    type: "text",
    inputMode: "text",
    autoComplete: "name",
    placeholder: "",
    helper: "",
  },
  {
    id: "age",
    label: "Age",
    required: true,
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
    required: true,
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
    required: true,
    type: "number",
    inputMode: "decimal",
    autoComplete: "off",
    placeholder: "",
    helper: "mg/dL \u2014 Normal range: 0.6\u20131.2",
    min: 0.3,
    max: 15.0,
    step: 0.1,
  },
  {
    id: "potassium",
    label: "Potassium",
    required: true,
    type: "number",
    inputMode: "decimal",
    autoComplete: "off",
    placeholder: "",
    helper: "mEq/L \u2014 Normal range: 3.5\u20135.0",
    min: 2.0,
    max: 8.0,
    step: 0.1,
  },
];

function getField(id: string): FormField {
  const field = fields.find((f) => f.id === id);
  if (!field) throw new Error(`Unknown field: ${id}`);
  return field;
}

const fieldRows: string[][] = [
  ["email", "name"],
  ["age", "bun"],
  ["creatinine", "potassium"],
];

export default function PredictPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call, then navigate to results
    setTimeout(() => {
      router.push("/results");
    }, 1500);
  };

  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col items-center px-4 pb-16 md:px-6 lg:px-8">
        <div className="w-full max-w-[640px]">
          <h1 className="mt-6 text-xl font-semibold text-foreground md:mt-8">
            Enter Your Lab Values
          </h1>

          <form onSubmit={handleSubmit} className="mt-6">
            {/* Mobile: single column */}
            <div className="space-y-3 md:hidden">
              {fields.map((field) => (
                <FieldBlock key={field.id} field={field} />
              ))}
            </div>

            {/* Tablet + Desktop: 2-column grid */}
            <div className="hidden md:grid md:grid-cols-2 md:gap-4">
              {fieldRows.map((row) =>
                row.map((id) => (
                  <FieldBlock key={id} field={getField(id)} />
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

function FieldBlock({ field }: { field: FormField }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.id}>
        {field.label}
        {field.required && " *"}
      </Label>
      <div className="relative">
        <Input
          id={field.id}
          type={field.type}
          inputMode={field.inputMode}
          autoComplete={field.autoComplete}
          placeholder={field.placeholder}
          readOnly={field.readOnly}
          defaultValue={field.defaultValue}
          min={field.min}
          max={field.max}
          step={field.step}
          aria-required={field.required}
          className={`h-12 text-base ${
            field.readOnly
              ? "cursor-default bg-[#F8F9FA] pr-10"
              : ""
          }`}
        />
        {field.readOnly && (
          <Lock className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        )}
      </div>
      {field.helper && (
        <p className="text-sm text-muted-foreground">{field.helper}</p>
      )}
    </div>
  );
}
