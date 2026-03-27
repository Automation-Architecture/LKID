# Test Scaffold — Prediction Form (LKID-16) & Visx Chart (LKID-19)

**Author:** Yuri (QA)
**Date:** 2026-03-27
**Purpose:** Provide Harshit with test skeletons he can build against for the prediction form and chart components.
**Framework:** Vitest 3.x + React Testing Library 16.x
**Coverage target:** 85% line coverage (per test strategy, Section 3)

---

## 2a. Prediction Form Test Scaffold (LKID-16)

**File:** `app/src/__tests__/components/PredictionForm.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';

// Component under test — adjust path when Harshit creates it
// import { PredictionForm } from '@/components/prediction-form';

expect.extend(toHaveNoViolations);

// ---------------------------------------------------------------------------
// Fixture Data
// ---------------------------------------------------------------------------

/** Valid Tier 1 payload — matches API contract PredictRequest (required fields only) */
const VALID_PAYLOAD = {
  name: 'Jane Doe',
  age: '58',
  bun: '35',
  creatinine: '2.1',
};

/** Valid payload with optional Tier 2 fields (Phase 2 — deferred but scaffold now) */
const VALID_PAYLOAD_TIER2 = {
  ...VALID_PAYLOAD,
  hemoglobin: '11.5',
  glucose: '105',
};

/** Invalid payloads — one per field, for targeted error testing */
const INVALID_PAYLOADS = {
  name_empty: { ...VALID_PAYLOAD, name: '' },
  age_below_min: { ...VALID_PAYLOAD, age: '17' },
  age_above_max: { ...VALID_PAYLOAD, age: '121' },
  age_decimal: { ...VALID_PAYLOAD, age: '58.5' },
  age_non_numeric: { ...VALID_PAYLOAD, age: 'abc' },
  bun_below_min: { ...VALID_PAYLOAD, bun: '4' },
  bun_above_max: { ...VALID_PAYLOAD, bun: '151' },
  bun_non_numeric: { ...VALID_PAYLOAD, bun: 'high' },
  creatinine_below_min: { ...VALID_PAYLOAD, creatinine: '0.05' },
  creatinine_above_max: { ...VALID_PAYLOAD, creatinine: '26' },
  creatinine_non_numeric: { ...VALID_PAYLOAD, creatinine: 'n/a' },
};

/**
 * Boundary values — edges of validation.ts ranges
 * Reference: PREDICT_FORM_RULES in app/src/lib/validation.ts
 *   age:        min=18, max=100, integer=true
 *   bun:        min=5,  max=150, integer=true
 *   creatinine: min=0.1, max=25
 *
 * NOTE: validation.ts says age max=100 but db_schema.sql says 120.
 * QA Report #1 (BE-09) flagged this mismatch. Test both boundaries.
 */
const BOUNDARY_VALUES = {
  age_at_min: { ...VALID_PAYLOAD, age: '18' },
  age_at_max: { ...VALID_PAYLOAD, age: '100' },
  age_one_below_min: { ...VALID_PAYLOAD, age: '17' },
  age_one_above_max: { ...VALID_PAYLOAD, age: '101' },
  bun_at_min: { ...VALID_PAYLOAD, bun: '5' },
  bun_at_max: { ...VALID_PAYLOAD, bun: '150' },
  bun_one_below_min: { ...VALID_PAYLOAD, bun: '4' },
  bun_one_above_max: { ...VALID_PAYLOAD, bun: '151' },
  creatinine_at_min: { ...VALID_PAYLOAD, creatinine: '0.1' },
  creatinine_at_max: { ...VALID_PAYLOAD, creatinine: '25' },
  creatinine_one_below_min: { ...VALID_PAYLOAD, creatinine: '0.09' },
  creatinine_one_above_max: { ...VALID_PAYLOAD, creatinine: '25.1' },
};

// ---------------------------------------------------------------------------
// Mock API handler
// ---------------------------------------------------------------------------

const mockOnSubmit = vi.fn();

// Helper to fill the form with a given payload
async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  payload: Record<string, string>
) {
  // TODO: Adjust selectors to match Harshit's actual form field labels/names
  for (const [field, value] of Object.entries(payload)) {
    if (field === 'name') {
      await user.type(screen.getByLabelText(/name/i), value);
    } else if (field === 'age') {
      await user.type(screen.getByLabelText(/age/i), value);
    } else if (field === 'bun') {
      await user.type(screen.getByLabelText(/bun/i), value);
    } else if (field === 'creatinine') {
      await user.type(screen.getByLabelText(/creatinine/i), value);
    } else if (field === 'hemoglobin') {
      await user.type(screen.getByLabelText(/hemoglobin/i), value);
    } else if (field === 'glucose') {
      await user.type(screen.getByLabelText(/glucose/i), value);
    }
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PredictionForm', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    mockOnSubmit.mockClear();
  });

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  describe('rendering', () => {
    it('renders all required field labels', () => {
      // render(<PredictionForm onSubmit={mockOnSubmit} email="jane@example.com" />);
      // expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      // expect(screen.getByLabelText(/age/i)).toBeInTheDocument();
      // expect(screen.getByLabelText(/bun/i)).toBeInTheDocument();
      // expect(screen.getByLabelText(/creatinine/i)).toBeInTheDocument();
    });

    it('renders email field as read-only with pre-filled Clerk email', () => {
      // render(<PredictionForm onSubmit={mockOnSubmit} email="jane@example.com" />);
      // const emailField = screen.getByLabelText(/email/i);
      // expect(emailField).toHaveValue('jane@example.com');
      // expect(emailField).toHaveAttribute('readOnly');
    });

    it('renders submit button with correct label', () => {
      // render(<PredictionForm onSubmit={mockOnSubmit} email="jane@example.com" />);
      // expect(screen.getByRole('button', { name: /see my prediction/i })).toBeInTheDocument();
    });

    it('renders unit labels (mg/dL, years) next to numeric fields', () => {
      // render(<PredictionForm onSubmit={mockOnSubmit} email="jane@example.com" />);
      // expect(screen.getByText(/mg\/dL/i)).toBeInTheDocument(); // BUN and creatinine
      // expect(screen.getByText(/years/i)).toBeInTheDocument(); // Age
    });
  });

  // -------------------------------------------------------------------------
  // Required Field Validation
  // -------------------------------------------------------------------------

  describe('required field validation', () => {
    it('shows error when name is empty on submit', async () => {
      // render(<PredictionForm onSubmit={mockOnSubmit} email="jane@example.com" />);
      // await user.click(screen.getByRole('button', { name: /see my prediction/i }));
      // expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      // expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('shows error when age is empty on submit', async () => {
      // render(<PredictionForm onSubmit={mockOnSubmit} email="jane@example.com" />);
      // await fillForm(user, { name: 'Jane Doe' }); // fill only name
      // await user.click(screen.getByRole('button', { name: /see my prediction/i }));
      // expect(screen.getByText(/age must be between/i)).toBeInTheDocument();
    });

    it('shows error when BUN is empty on submit', async () => {
      // Similar pattern: fill name + age, leave BUN empty, submit, check error
    });

    it('shows error when creatinine is empty on submit', async () => {
      // Similar pattern: fill name + age + BUN, leave creatinine empty, submit, check error
    });

    it('shows all errors simultaneously when all fields empty', async () => {
      // render(<PredictionForm onSubmit={mockOnSubmit} email="jane@example.com" />);
      // await user.click(screen.getByRole('button', { name: /see my prediction/i }));
      // expect(screen.getAllByRole('alert')).toHaveLength(4); // name, age, bun, creatinine
      // expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Optional Field Behavior (Tier 2 — Phase 2, scaffold now)
  // -------------------------------------------------------------------------

  describe('optional field behavior', () => {
    it('submits successfully without hemoglobin and glucose', async () => {
      // render(<PredictionForm onSubmit={mockOnSubmit} email="jane@example.com" />);
      // await fillForm(user, VALID_PAYLOAD);
      // await user.click(screen.getByRole('button', { name: /see my prediction/i }));
      // expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
      //   name: 'Jane Doe',
      //   age: 58,
      //   bun: 35,
      //   creatinine: 2.1,
      // }));
    });

    it('includes hemoglobin and glucose when provided', async () => {
      // NOTE: This test is for Phase 2 tier upgrade. Skip until LKID tier feature is built.
      // render(<PredictionForm onSubmit={mockOnSubmit} email="jane@example.com" showTier2Fields />);
      // await fillForm(user, VALID_PAYLOAD_TIER2);
      // await user.click(screen.getByRole('button', { name: /see my prediction/i }));
      // expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
      //   hemoglobin: 11.5,
      //   glucose: 105,
      // }));
    });
  });

  // -------------------------------------------------------------------------
  // Boundary Value Testing
  // -------------------------------------------------------------------------

  describe('boundary values', () => {
    // Age boundaries (validation.ts: min=18, max=100, integer)
    it.each([
      ['age_at_min', BOUNDARY_VALUES.age_at_min, true],
      ['age_at_max', BOUNDARY_VALUES.age_at_max, true],
      ['age_one_below_min', BOUNDARY_VALUES.age_one_below_min, false],
      ['age_one_above_max', BOUNDARY_VALUES.age_one_above_max, false],
    ])('age boundary: %s should %s', async (label, payload, shouldPass) => {
      // render(<PredictionForm onSubmit={mockOnSubmit} email="jane@example.com" />);
      // await fillForm(user, payload);
      // await user.click(screen.getByRole('button', { name: /see my prediction/i }));
      // if (shouldPass) {
      //   expect(mockOnSubmit).toHaveBeenCalled();
      // } else {
      //   expect(mockOnSubmit).not.toHaveBeenCalled();
      //   expect(screen.getByText(/age must be between/i)).toBeInTheDocument();
      // }
    });

    // BUN boundaries (validation.ts: min=5, max=150, integer)
    it.each([
      ['bun_at_min', BOUNDARY_VALUES.bun_at_min, true],
      ['bun_at_max', BOUNDARY_VALUES.bun_at_max, true],
      ['bun_one_below_min', BOUNDARY_VALUES.bun_one_below_min, false],
      ['bun_one_above_max', BOUNDARY_VALUES.bun_one_above_max, false],
    ])('BUN boundary: %s should %s', async (label, payload, shouldPass) => {
      // render(<PredictionForm onSubmit={mockOnSubmit} email="jane@example.com" />);
      // await fillForm(user, payload);
      // await user.click(screen.getByRole('button', { name: /see my prediction/i }));
      // if (shouldPass) {
      //   expect(mockOnSubmit).toHaveBeenCalled();
      // } else {
      //   expect(mockOnSubmit).not.toHaveBeenCalled();
      //   expect(screen.getByText(/bun must be between/i)).toBeInTheDocument();
      // }
    });

    // Creatinine boundaries (validation.ts: min=0.1, max=25, NOT integer)
    it.each([
      ['creatinine_at_min', BOUNDARY_VALUES.creatinine_at_min, true],
      ['creatinine_at_max', BOUNDARY_VALUES.creatinine_at_max, true],
      ['creatinine_one_below_min', BOUNDARY_VALUES.creatinine_one_below_min, false],
      ['creatinine_one_above_max', BOUNDARY_VALUES.creatinine_one_above_max, false],
    ])('creatinine boundary: %s should %s', async (label, payload, shouldPass) => {
      // render(<PredictionForm onSubmit={mockOnSubmit} email="jane@example.com" />);
      // await fillForm(user, payload);
      // await user.click(screen.getByRole('button', { name: /see my prediction/i }));
      // if (shouldPass) {
      //   expect(mockOnSubmit).toHaveBeenCalled();
      // } else {
      //   expect(mockOnSubmit).not.toHaveBeenCalled();
      //   expect(screen.getByText(/creatinine must be between/i)).toBeInTheDocument();
      // }
    });

    // Integer enforcement
    it('rejects decimal age value', async () => {
      // render(<PredictionForm onSubmit={mockOnSubmit} email="jane@example.com" />);
      // await fillForm(user, INVALID_PAYLOADS.age_decimal);
      // await user.click(screen.getByRole('button', { name: /see my prediction/i }));
      // expect(screen.getByText(/must be a whole number/i)).toBeInTheDocument();
    });

    it('accepts decimal creatinine value (not integer-enforced)', async () => {
      // render(<PredictionForm onSubmit={mockOnSubmit} email="jane@example.com" />);
      // await fillForm(user, { ...VALID_PAYLOAD, creatinine: '2.35' });
      // await user.click(screen.getByRole('button', { name: /see my prediction/i }));
      // expect(mockOnSubmit).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Form Submission
  // -------------------------------------------------------------------------

  describe('form submission', () => {
    it('calls onSubmit with correct payload when all fields valid', async () => {
      // render(<PredictionForm onSubmit={mockOnSubmit} email="jane@example.com" />);
      // await fillForm(user, VALID_PAYLOAD);
      // await user.click(screen.getByRole('button', { name: /see my prediction/i }));
      // await waitFor(() => {
      //   expect(mockOnSubmit).toHaveBeenCalledOnce();
      //   expect(mockOnSubmit).toHaveBeenCalledWith({
      //     name: 'Jane Doe',
      //     email: 'jane@example.com',
      //     age: 58,
      //     bun: 35,
      //     creatinine: 2.1,
      //   });
      // });
    });

    it('disables submit button while submitting (prevents double-submit)', async () => {
      // mockOnSubmit.mockImplementation(() => new Promise(() => {})); // never resolves
      // render(<PredictionForm onSubmit={mockOnSubmit} email="jane@example.com" />);
      // await fillForm(user, VALID_PAYLOAD);
      // await user.click(screen.getByRole('button', { name: /see my prediction/i }));
      // expect(screen.getByRole('button', { name: /see my prediction/i })).toBeDisabled();
    });

    it('shows loading indicator on submit button while submitting', async () => {
      // mockOnSubmit.mockImplementation(() => new Promise(() => {}));
      // render(<PredictionForm onSubmit={mockOnSubmit} email="jane@example.com" />);
      // await fillForm(user, VALID_PAYLOAD);
      // await user.click(screen.getByRole('button', { name: /see my prediction/i }));
      // expect(screen.getByRole('button')).toHaveTextContent(/calculating/i);
    });

    it('does not submit when validation fails', async () => {
      // render(<PredictionForm onSubmit={mockOnSubmit} email="jane@example.com" />);
      // await user.click(screen.getByRole('button', { name: /see my prediction/i }));
      // expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Error Message Display
  // -------------------------------------------------------------------------

  describe('error message display', () => {
    it('shows error summary banner when multiple fields invalid', async () => {
      // Per Inga's user-flows.md (Flow 2d):
      //   "Please fix N fields below to continue" (shown if >1 error)
      //   role="alert", aria-live="assertive"
      // render(<PredictionForm onSubmit={mockOnSubmit} email="jane@example.com" />);
      // await user.click(screen.getByRole('button', { name: /see my prediction/i }));
      // const alert = screen.getByRole('alert');
      // expect(alert).toHaveTextContent(/please fix/i);
    });

    it('shows inline error below each invalid field', async () => {
      // render(<PredictionForm onSubmit={mockOnSubmit} email="jane@example.com" />);
      // await user.click(screen.getByRole('button', { name: /see my prediction/i }));
      // Per Inga's spec: red border + inline error text below field
      // Verify error messages match validation.ts messages exactly
    });

    it('clears field error when user corrects the value', async () => {
      // render(<PredictionForm onSubmit={mockOnSubmit} email="jane@example.com" />);
      // await fillForm(user, INVALID_PAYLOADS.age_below_min);
      // await user.click(screen.getByRole('button', { name: /see my prediction/i }));
      // expect(screen.getByText(/age must be between/i)).toBeInTheDocument();
      // await user.clear(screen.getByLabelText(/age/i));
      // await user.type(screen.getByLabelText(/age/i), '58');
      // expect(screen.queryByText(/age must be between/i)).not.toBeInTheDocument();
    });

    it('auto-scrolls and focuses first error field on submit', async () => {
      // Per Inga's Flow 2d: "Auto-scroll to first error field (smooth) + focus"
      // render(<PredictionForm onSubmit={mockOnSubmit} email="jane@example.com" />);
      // await user.click(screen.getByRole('button', { name: /see my prediction/i }));
      // const firstErrorField = screen.getByLabelText(/name/i);
      // expect(document.activeElement).toBe(firstErrorField);
    });
  });

  // -------------------------------------------------------------------------
  // Accessibility
  // -------------------------------------------------------------------------

  describe('accessibility', () => {
    it('passes axe-core audit with no violations', async () => {
      // const { container } = render(
      //   <PredictionForm onSubmit={mockOnSubmit} email="jane@example.com" />
      // );
      // const results = await axe(container);
      // expect(results).toHaveNoViolations();
    });

    it('all form fields have associated labels', () => {
      // render(<PredictionForm onSubmit={mockOnSubmit} email="jane@example.com" />);
      // const inputs = screen.getAllByRole('textbox');
      // inputs.forEach(input => {
      //   expect(input).toHaveAccessibleName();
      // });
      // const spinbuttons = screen.getAllByRole('spinbutton');
      // spinbuttons.forEach(input => {
      //   expect(input).toHaveAccessibleName();
      // });
    });

    it('error messages are announced via aria-live', async () => {
      // render(<PredictionForm onSubmit={mockOnSubmit} email="jane@example.com" />);
      // await user.click(screen.getByRole('button', { name: /see my prediction/i }));
      // const errorRegion = screen.getByRole('alert');
      // expect(errorRegion).toHaveAttribute('aria-live', 'assertive');
    });

    it('error fields have aria-invalid="true" and aria-describedby linking to error', async () => {
      // render(<PredictionForm onSubmit={mockOnSubmit} email="jane@example.com" />);
      // await user.click(screen.getByRole('button', { name: /see my prediction/i }));
      // const nameInput = screen.getByLabelText(/name/i);
      // expect(nameInput).toHaveAttribute('aria-invalid', 'true');
      // const describedBy = nameInput.getAttribute('aria-describedby');
      // expect(describedBy).toBeTruthy();
      // expect(document.getElementById(describedBy!)).toHaveTextContent(/name is required/i);
    });

    it('submit button has accessible name', () => {
      // render(<PredictionForm onSubmit={mockOnSubmit} email="jane@example.com" />);
      // expect(screen.getByRole('button', { name: /see my prediction/i })).toHaveAccessibleName();
    });

    it('focus moves to first error field on invalid submit', async () => {
      // (Same as auto-scroll test above, but specifically testing focus management)
    });
  });
});
```

---

## 2b. Visx Chart Test Scaffold (LKID-19)

**File:** `app/src/__tests__/components/PredictionChart.test.tsx`

### Mock Data Shapes

The chart consumes the `PredictResponse` from the API contract (`api_contract.json`). Define mock data matching that schema:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';

// Component under test — adjust path when Harshit creates it
// import { PredictionChart } from '@/components/prediction-chart';

expect.extend(toHaveNoViolations);

// ---------------------------------------------------------------------------
// Mock Data — matches PredictResponse schema in api_contract.json
// ---------------------------------------------------------------------------

/**
 * Full 4-trajectory response — the happy path.
 * 15 time points, 4 trajectories, dial_ages, bun_suppression_estimate.
 * Values from api_contract.json example response.
 */
const MOCK_FULL_RESPONSE = {
  egfr_baseline: 33.0,
  time_points_months: [0, 1, 3, 6, 12, 18, 24, 36, 48, 60, 72, 84, 96, 108, 120],
  trajectories: {
    no_treatment: [33.0, 32.8, 32.3, 31.7, 30.6, 29.5, 28.4, 26.3, 24.1, 22.0, 19.8, 17.7, 15.5, 13.4, 11.2],
    bun_18_24: [33.0, 34.0, 35.7, 36.0, 37.0, 37.6, 37.9, 36.4, 34.9, 33.4, 31.9, 30.4, 28.9, 27.4, 25.9],
    bun_13_17: [33.0, 34.6, 36.9, 37.4, 39.4, 40.7, 41.4, 40.4, 39.4, 38.4, 37.4, 36.4, 35.4, 34.4, 33.4],
    bun_12: [33.0, 35.4, 38.7, 39.6, 42.6, 44.5, 45.7, 45.2, 44.7, 44.2, 43.7, 43.2, 42.7, 42.2, 41.7],
  },
  dial_ages: {
    no_treatment: 68.2,
    bun_18_24: null,
    bun_13_17: null,
    bun_12: null,
  },
  bun_suppression_estimate: 7.8,
};

/**
 * Stage 5 patient — no_treatment crosses dialysis quickly, some treatments also cross.
 * Tests the "dial_ages with values" display and threshold line visibility.
 */
const MOCK_STAGE5_RESPONSE = {
  egfr_baseline: 10.0,
  time_points_months: [0, 1, 3, 6, 12, 18, 24, 36, 48, 60, 72, 84, 96, 108, 120],
  trajectories: {
    no_treatment: [10.0, 9.6, 8.8, 7.6, 5.4, 3.2, 1.0, 0, 0, 0, 0, 0, 0, 0, 0],
    bun_18_24: [10.0, 11.2, 13.1, 13.5, 14.0, 13.8, 13.4, 12.0, 10.5, 9.0, 7.5, 6.0, 4.5, 3.0, 1.5],
    bun_13_17: [10.0, 11.8, 14.3, 15.0, 16.2, 16.5, 16.3, 15.3, 14.3, 13.3, 12.3, 11.3, 10.3, 9.3, 8.3],
    bun_12: [10.0, 12.5, 15.8, 17.0, 19.5, 20.8, 21.4, 20.9, 20.4, 19.9, 19.4, 18.9, 18.4, 17.9, 17.4],
  },
  dial_ages: {
    no_treatment: 67.0,
    bun_18_24: 73.5,
    bun_13_17: null,
    bun_12: null,
  },
  bun_suppression_estimate: 13.3,
};

/** Dialysis threshold — eGFR value below which dialysis is needed (from spec) */
const DIALYSIS_THRESHOLD = 12;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PredictionChart', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  // -------------------------------------------------------------------------
  // Core Rendering
  // -------------------------------------------------------------------------

  describe('core rendering', () => {
    it('renders SVG chart with 4 trajectory lines', () => {
      // render(<PredictionChart data={MOCK_FULL_RESPONSE} />);
      // const svg = screen.getByRole('img'); // or container.querySelector('svg')
      // Verify 4 path/line elements exist (one per trajectory)
      // const paths = svg.querySelectorAll('path.trajectory-line');
      // expect(paths).toHaveLength(4);
    });

    it('renders with partial data (Stage 5 — extreme values)', () => {
      // render(<PredictionChart data={MOCK_STAGE5_RESPONSE} />);
      // Should still render all 4 lines even when values hit 0
      // Verify no crash or rendering artifacts
    });

    it('renders dialysis threshold line at eGFR = 12', () => {
      // render(<PredictionChart data={MOCK_FULL_RESPONSE} />);
      // Look for a horizontal line/rect at the y-position corresponding to eGFR=12
      // The threshold should be visually distinct (dashed, colored, labeled)
      // expect(screen.getByText(/dialysis/i)).toBeInTheDocument();
    });

    it('uses linear time x-axis (not categorical)', () => {
      // Per Decision #5 in test strategy: x-axis must be linear time, not categorical.
      // Time points are [0, 1, 3, 6, 12, ...] — spacing should be proportional to months.
      // render(<PredictionChart data={MOCK_FULL_RESPONSE} />);
      //
      // Verify: the pixel distance between month 0 and month 3 should be roughly 3x
      // the distance between month 0 and month 1.
      //
      // Implementation: query x-axis tick positions or SVG path data points
      // and verify proportional spacing. This is a key spec requirement.
    });

    it('renders end-of-line labels for each trajectory', () => {
      // Per Inga's user-flows.md: "End-of-line labels" on the chart
      // render(<PredictionChart data={MOCK_FULL_RESPONSE} />);
      // expect(screen.getByText(/no treatment/i)).toBeInTheDocument();
      // expect(screen.getByText(/bun 18-24/i)).toBeInTheDocument();
      // expect(screen.getByText(/bun 13-17/i)).toBeInTheDocument();
      // expect(screen.getByText(/bun.*12/i)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Stat Cards
  // -------------------------------------------------------------------------

  describe('stat cards', () => {
    it('renders baseline eGFR stat card', () => {
      // render(<PredictionChart data={MOCK_FULL_RESPONSE} />);
      // expect(screen.getByText(/baseline.*egfr/i)).toBeInTheDocument();
      // expect(screen.getByText('33')).toBeInTheDocument(); // or '33.0'
    });

    it('renders BUN suppression estimate', () => {
      // render(<PredictionChart data={MOCK_FULL_RESPONSE} />);
      // expect(screen.getByText(/bun.*suppression/i)).toBeInTheDocument();
      // expect(screen.getByText('7.8')).toBeInTheDocument();
    });

    it('renders dial age for no-treatment trajectory', () => {
      // render(<PredictionChart data={MOCK_FULL_RESPONSE} />);
      // The no_treatment dial_age is 68.2 — displayed as "Age 68" or similar
      // expect(screen.getByText(/68/)).toBeInTheDocument();
    });

    it('shows "N/A" or equivalent when dial_age is null', () => {
      // render(<PredictionChart data={MOCK_FULL_RESPONSE} />);
      // bun_12 dial_age is null — no dialysis crossing within 10 years
      // Verify appropriate display (e.g., "Not reached", "N/A", or no dial age shown)
    });
  });

  // -------------------------------------------------------------------------
  // Responsive Behavior
  // -------------------------------------------------------------------------

  describe('responsive behavior', () => {
    it('renders at 375px mobile viewport width without horizontal scroll', () => {
      // Per Inga's user-flows.md: chart is 200px mobile, 340px desktop
      // Use container width constraint to simulate mobile
      // render(
      //   <div style={{ width: '375px' }}>
      //     <PredictionChart data={MOCK_FULL_RESPONSE} />
      //   </div>
      // );
      // const svg = container.querySelector('svg');
      // expect(svg).toBeTruthy();
      // Verify SVG viewBox or width fits within 375px
      // expect(parseInt(svg!.getAttribute('width') || '0')).toBeLessThanOrEqual(375);
    });

    it('renders at desktop width (1024px) with full detail', () => {
      // render(
      //   <div style={{ width: '1024px' }}>
      //     <PredictionChart data={MOCK_FULL_RESPONSE} />
      //   </div>
      // );
      // Verify chart renders at expected desktop size
      // Check that crosshair interaction elements are present (desktop only)
    });
  });

  // -------------------------------------------------------------------------
  // SVG Accessibility
  // -------------------------------------------------------------------------

  describe('SVG accessibility', () => {
    it('passes axe-core audit with no violations', async () => {
      // const { container } = render(<PredictionChart data={MOCK_FULL_RESPONSE} />);
      // const results = await axe(container);
      // expect(results).toHaveNoViolations();
    });

    it('SVG has role="img" and aria-label describing the chart', () => {
      // render(<PredictionChart data={MOCK_FULL_RESPONSE} />);
      // const svg = screen.getByRole('img');
      // expect(svg).toHaveAttribute('aria-label');
      // expect(svg.getAttribute('aria-label')).toMatch(/kidney.*prediction|egfr.*trajectory/i);
    });

    it('chart has a visually hidden text summary for screen readers', () => {
      // Per test strategy principle: target demographic is 60+ CKD patients
      // Provide a text alternative that summarizes the chart data
      // render(<PredictionChart data={MOCK_FULL_RESPONSE} />);
      // const summary = screen.getByText(/your baseline egfr is 33/i);
      // expect(summary).toBeInTheDocument();
      // Verify it is visually hidden (sr-only class) but accessible
    });

    it('trajectory lines have aria-labels or are described in a legend', () => {
      // render(<PredictionChart data={MOCK_FULL_RESPONSE} />);
      // Each trajectory should be identifiable by screen readers
      // Either via aria-label on the SVG path or via a visible legend
    });

    it('dialysis threshold line has accessible description', () => {
      // render(<PredictionChart data={MOCK_FULL_RESPONSE} />);
      // The threshold line should be described for screen readers
      // e.g., "Dialysis threshold at eGFR 12"
    });
  });

  // -------------------------------------------------------------------------
  // Visual Regression Baseline Notes
  // -------------------------------------------------------------------------

  /**
   * VISUAL REGRESSION TESTING NOTES
   *
   * These tests should be implemented as Playwright screenshot comparisons,
   * NOT as Vitest/RTL tests. Documenting here for completeness.
   *
   * Baselines to capture:
   * 1. Full 4-trajectory chart at desktop (1024px) — MOCK_FULL_RESPONSE
   * 2. Full 4-trajectory chart at mobile (375px) — MOCK_FULL_RESPONSE
   * 3. Stage 5 patient chart (extreme values near threshold) — MOCK_STAGE5_RESPONSE
   * 4. Chart with tooltip visible (hover state on no-treatment line at month 60)
   * 5. Chart with download button in default state
   * 6. Chart with download button in loading state
   *
   * Threshold settings:
   * - maxDiffPixelRatio: 0.01 (1% pixel difference allowed — accounts for anti-aliasing)
   * - For text-heavy stat cards: 0.005 (tighter — text rendering should be stable)
   * - Update baselines ONLY with explicit Yuri approval (per test strategy, Section 2)
   *
   * Storage: /tests/visual-baselines/prediction-chart/
   *
   * Key invariants to verify visually:
   * - Linear time spacing on x-axis (month 12 should be 12x further from 0 than month 1)
   * - Dialysis threshold line is visually prominent (dashed red or similar)
   * - Brand colors (#004D43 teal, #E6FF2B lime for accents)
   * - End-of-line labels are readable and don't overlap
   * - No SVG overflow or clipping artifacts
   */
});
```

---

## 2c. Integration Test Scaffold

**File:** `app/src/__tests__/integration/predict-flow.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// Components under test — adjust paths when Harshit creates them
// import { PredictionForm } from '@/components/prediction-form';
// import { PredictionChart } from '@/components/prediction-chart';
// import { PredictPage } from '@/app/predict/page';  // or the parent container

// ---------------------------------------------------------------------------
// MSW Server Setup — mock the FastAPI backend
// ---------------------------------------------------------------------------

/** Successful prediction response — matches api_contract.json PredictResponse */
const MOCK_SUCCESS_RESPONSE = {
  egfr_baseline: 33.0,
  time_points_months: [0, 1, 3, 6, 12, 18, 24, 36, 48, 60, 72, 84, 96, 108, 120],
  trajectories: {
    no_treatment: [33.0, 32.8, 32.3, 31.7, 30.6, 29.5, 28.4, 26.3, 24.1, 22.0, 19.8, 17.7, 15.5, 13.4, 11.2],
    bun_18_24: [33.0, 34.0, 35.7, 36.0, 37.0, 37.6, 37.9, 36.4, 34.9, 33.4, 31.9, 30.4, 28.9, 27.4, 25.9],
    bun_13_17: [33.0, 34.6, 36.9, 37.4, 39.4, 40.7, 41.4, 40.4, 39.4, 38.4, 37.4, 36.4, 35.4, 34.4, 33.4],
    bun_12: [33.0, 35.4, 38.7, 39.6, 42.6, 44.5, 45.7, 45.2, 44.7, 44.2, 43.7, 43.2, 42.7, 42.2, 41.7],
  },
  dial_ages: {
    no_treatment: 68.2,
    bun_18_24: null,
    bun_13_17: null,
    bun_12: null,
  },
  bun_suppression_estimate: 7.8,
};

/** Validation error response — matches api_contract.json ErrorResponse */
const MOCK_VALIDATION_ERROR = {
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Invalid request data',
    details: [
      { field: 'bun', message: 'BUN must be between 5 and 150 mg/dL' },
    ],
  },
};

const server = setupServer(
  // Default handler: successful prediction
  http.post('*/predict', () => {
    return HttpResponse.json(MOCK_SUCCESS_RESPONSE);
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function fillAndSubmitForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/name/i), 'Jane Doe');
  await user.type(screen.getByLabelText(/age/i), '58');
  await user.type(screen.getByLabelText(/bun/i), '35');
  await user.type(screen.getByLabelText(/creatinine/i), '2.1');
  await user.click(screen.getByRole('button', { name: /see my prediction/i }));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Prediction Flow: Form -> API -> Chart', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  // -------------------------------------------------------------------------
  // Happy Path
  // -------------------------------------------------------------------------

  describe('happy path', () => {
    it('submits form, receives prediction, renders chart with response data', async () => {
      // This is the core integration test: the full happy path.
      //
      // render(<PredictPage />); // or wrapper that contains both form and chart
      // await fillAndSubmitForm(user);
      //
      // // Wait for chart to appear
      // await waitFor(() => {
      //   expect(screen.getByRole('img')).toBeInTheDocument(); // SVG chart
      // });
      //
      // // Verify chart contains data from the mock response
      // expect(screen.getByText(/33/)).toBeInTheDocument(); // baseline eGFR
      // expect(screen.getByText(/no treatment/i)).toBeInTheDocument();
    });

    it('shows loading skeleton while API request is in flight', async () => {
      // Delay the MSW response to observe loading state
      // server.use(
      //   http.post('*/predict', async () => {
      //     await new Promise(r => setTimeout(r, 500));
      //     return HttpResponse.json(MOCK_SUCCESS_RESPONSE);
      //   })
      // );
      //
      // render(<PredictPage />);
      // await fillAndSubmitForm(user);
      //
      // // Loading state should be visible
      // expect(screen.getByText(/calculating/i)).toBeInTheDocument();
      // expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
      //
      // // Wait for chart to replace loading
      // await waitFor(() => {
      //   expect(screen.queryByText(/calculating/i)).not.toBeInTheDocument();
      //   expect(screen.getByRole('img')).toBeInTheDocument();
      // });
    });
  });

  // -------------------------------------------------------------------------
  // Error Handling
  // -------------------------------------------------------------------------

  describe('error handling', () => {
    it('displays error state when API returns 500', async () => {
      // server.use(
      //   http.post('*/predict', () => {
      //     return new HttpResponse(null, { status: 500 });
      //   })
      // );
      //
      // render(<PredictPage />);
      // await fillAndSubmitForm(user);
      //
      // // Per Inga's Flow 2e: toast banner with "Something went wrong. Please try again."
      // await waitFor(() => {
      //   expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      // });
      //
      // // "Try Again" button should be present
      // expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('displays error state when API returns 400 validation error', async () => {
      // server.use(
      //   http.post('*/predict', () => {
      //     return HttpResponse.json(MOCK_VALIDATION_ERROR, { status: 400 });
      //   })
      // );
      //
      // render(<PredictPage />);
      // await fillAndSubmitForm(user);
      //
      // // Server-side validation errors should map to form field errors
      // // Per Inga's Flow 2d: "Server-side 422 errors map details[].field to form fields"
      // await waitFor(() => {
      //   expect(screen.getByText(/bun must be between/i)).toBeInTheDocument();
      // });
    });

    it('displays error state when network request fails', async () => {
      // server.use(
      //   http.post('*/predict', () => {
      //     return HttpResponse.error();
      //   })
      // );
      //
      // render(<PredictPage />);
      // await fillAndSubmitForm(user);
      //
      // await waitFor(() => {
      //   expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      // });
    });

    it('preserves form values after API error for retry', async () => {
      // server.use(
      //   http.post('*/predict', () => {
      //     return new HttpResponse(null, { status: 500 });
      //   })
      // );
      //
      // render(<PredictPage />);
      // await fillAndSubmitForm(user);
      //
      // await waitFor(() => {
      //   expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      // });
      //
      // // Form values should still be there
      // expect(screen.getByLabelText(/name/i)).toHaveValue('Jane Doe');
      // expect(screen.getByLabelText(/age/i)).toHaveValue(58);
      // expect(screen.getByLabelText(/bun/i)).toHaveValue(35);
      // expect(screen.getByLabelText(/creatinine/i)).toHaveValue(2.1);
    });

    it('"Try Again" button re-submits the same payload', async () => {
      // let callCount = 0;
      // server.use(
      //   http.post('*/predict', () => {
      //     callCount++;
      //     if (callCount === 1) {
      //       return new HttpResponse(null, { status: 500 });
      //     }
      //     return HttpResponse.json(MOCK_SUCCESS_RESPONSE);
      //   })
      // );
      //
      // render(<PredictPage />);
      // await fillAndSubmitForm(user);
      //
      // await waitFor(() => {
      //   expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      // });
      //
      // // Click "Try Again"
      // await user.click(screen.getByRole('button', { name: /try again/i }));
      //
      // // Second attempt succeeds — chart renders
      // await waitFor(() => {
      //   expect(screen.getByRole('img')).toBeInTheDocument();
      // });
    });
  });

  // -------------------------------------------------------------------------
  // Tier Transition (Phase 2 prep)
  // -------------------------------------------------------------------------

  describe('tier transition', () => {
    it('submits Tier 1 fields, then adds hemoglobin+glucose and resubmits for Tier 2', async () => {
      // NOTE: This test is scaffolded for Phase 2 tier upgrade feature.
      // Skip until the tier feature is implemented.
      //
      // Scenario:
      // 1. User fills required fields (Tier 1) and submits
      // 2. Chart renders with Tier 1 results
      // 3. User adds hemoglobin and glucose (optional Tier 2 fields)
      // 4. User resubmits
      // 5. Chart updates with Tier 2 results (possibly more/different trajectories)
      //
      // render(<PredictPage />);
      //
      // // Step 1: Tier 1 submission
      // await fillAndSubmitForm(user);
      // await waitFor(() => {
      //   expect(screen.getByRole('img')).toBeInTheDocument();
      // });
      //
      // // Step 2: Add Tier 2 fields
      // await user.type(screen.getByLabelText(/hemoglobin/i), '11.5');
      // await user.type(screen.getByLabelText(/glucose/i), '105');
      //
      // // Step 3: Resubmit
      // await user.click(screen.getByRole('button', { name: /see my prediction/i }));
      //
      // // Step 4: Chart updates
      // await waitFor(() => {
      //   // Verify chart updated — e.g., different trajectory values or additional lines
      //   // Exact assertion depends on how Tier 2 modifies the response
      // });
    });
  });
});
```

---

## Coverage Expectations

Per the test strategy (Section 3):

| Component | Unit Tests | Integration Tests | Target |
|-----------|-----------|-------------------|--------|
| PredictionForm | 25+ test cases | 3 integration flows | 85% line coverage |
| PredictionChart | 15+ test cases | Covered by integration flows | 85% line coverage |
| validation.ts | Already covered via form tests | N/A | 90%+ (pure logic) |
| predict-flow integration | N/A | 8 test cases | All critical paths |

### Test Dependencies to Install

```bash
npm install -D @testing-library/react @testing-library/user-event @testing-library/jest-dom jest-axe msw vitest
```

### Vitest Config Notes

- Ensure `vitest.config.ts` has `environment: 'jsdom'` for React component tests.
- Add `setupFiles` entry for `jest-axe` and `@testing-library/jest-dom` matchers.
- MSW requires `setupServer` from `msw/node` for Vitest (not the browser worker).

---

*Test scaffold complete. 48+ test cases scaffolded across 3 files. All tests are commented out with implementation hints — Harshit uncomments and fills in as he builds each component.*
