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
 * Prediction form rules — per Lee's v2.0 spec + LKID-16 dispatch corrections.
 * Required: BUN, Creatinine, Potassium, Age, Sex
 * Optional Tier 2: Hemoglobin, Glucose (both required together for tier upgrade)
 *
 * Age max fixed to 120 (was 100) to match backend/DB — per LKID-16 dispatch.
 * BUN max 100 is a frontend soft cap (UX); API/Pydantic accepts up to 150.
 */
export const PREDICT_FORM_RULES: FieldRules = {
  bun: { required: true, min: 5, max: 100, integer: true, message: "BUN must be between 5 and 100 mg/dL" },
  creatinine: { required: true, min: 0.3, max: 20.0, message: "Creatinine must be between 0.3 and 20.0 mg/dL" },
  potassium: { required: true, min: 2.0, max: 8.0, message: "Potassium must be between 2.0 and 8.0 mEq/L" },
  age: { required: true, min: 18, max: 120, integer: true, message: "Age must be between 18 and 120" },
  // Sex field removed from form — engine uses "unknown" (averages male+female)
};

/** Optional Tier 2 fields — both must be provided together for prediction upgrade */
export const TIER2_FORM_RULES: FieldRules = {
  hemoglobin: { min: 4.0, max: 20.0, message: "Hemoglobin must be between 4.0 and 20.0 g/dL" },
  glucose: { min: 40, max: 500, message: "Glucose must be between 40 and 500 mg/dL" },
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
