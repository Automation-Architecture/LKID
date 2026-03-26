"use client";

import { useState, useCallback, useMemo } from "react";
import { type FieldRules, validateForm, isFormValid } from "@/lib/validation";

export function useFormValidation(rules: FieldRules) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const key of Object.keys(rules)) init[key] = "";
    return init;
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);

  const errors = useMemo(() => validateForm(values, rules), [values, rules]);
  const valid = useMemo(() => isFormValid(errors), [errors]);

  const setValue = useCallback((field: string, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  const setFieldTouched = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const markSubmitted = useCallback(() => setSubmitted(true), []);

  const getFieldError = useCallback(
    (field: string): string | null => {
      if (!touched[field] && !submitted) return null;
      return errors[field] ?? null;
    },
    [touched, submitted, errors]
  );

  return { values, errors, valid, submitted, setValue, setFieldTouched, markSubmitted, getFieldError };
}
