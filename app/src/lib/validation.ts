export interface ValidationRule {
  required?: boolean;
  min?: number;
  max?: number;
  integer?: boolean;
  message?: string;
}

export interface FieldRules {
  [fieldId: string]: ValidationRule;
}

/**
 * Prediction form rules — per Lee's v2.0 spec.
 * Potassium removed. Inputs: BUN, Creatinine, Age (+ optional hemoglobin, CO2, albumin for Tier 2).
 */
export const PREDICT_FORM_RULES: FieldRules = {
  name: { required: true, message: "Name is required" },
  age: { required: true, min: 18, max: 100, integer: true, message: "Age must be between 18 and 100" },
  bun: { required: true, min: 5, max: 150, integer: true, message: "BUN must be between 5 and 150 mg/dL" },
  creatinine: { required: true, min: 0.1, max: 25, message: "Creatinine must be between 0.1 and 25 mg/dL" },
};

export function validateField(value: string, rules: ValidationRule): string | null {
  const trimmed = value.trim();

  if (rules.required && !trimmed) {
    return rules.message ?? "This field is required";
  }

  if (!trimmed) return null;

  const num = Number(trimmed);

  if (rules.min !== undefined || rules.max !== undefined) {
    if (isNaN(num)) return "Must be a number";
    if (rules.integer && !Number.isInteger(num)) return "Must be a whole number";
    if (rules.min !== undefined && num < rules.min) return rules.message ?? `Minimum is ${rules.min}`;
    if (rules.max !== undefined && num > rules.max) return rules.message ?? `Maximum is ${rules.max}`;
  }

  return null;
}

export function validateForm(
  values: Record<string, string>,
  rules: FieldRules
): Record<string, string | null> {
  const errors: Record<string, string | null> = {};
  for (const [field, rule] of Object.entries(rules)) {
    errors[field] = validateField(values[field] ?? "", rule);
  }
  return errors;
}

export function isFormValid(errors: Record<string, string | null>): boolean {
  return Object.values(errors).every((e) => e === null);
}
