# Lean Launch UX Review

**Author:** Inga (Senior UX/UI Designer)
**Date:** 2026-03-25
**Status:** Decision made

---

## Decision: Simplified Form + Results Flow

The lean launch flow is **three screens plus auth**:

1. **Landing page** -- headline, single CTA ("Get Started")
2. **Magic link gate** -- email input, "Send me a sign-in link" button, confirmation screen
3. **Form page** -- name, email (pre-filled from auth), age, BUN, creatinine, potassium
4. **Results page** -- interactive chart (Variant A), PDF download button, disclaimer

### Flow detail

User lands on homepage. Taps "Get Started." Enters email address, receives magic link. Clicks link in email, lands on the form page with email pre-filled. Enters name + 4 lab values. Submits. Sees chart + PDF download button + disclaimer. Done.

No save prompt. No account creation upsell. No tiers. No stat cards. No unlock prompts. No returning-user dashboard. Session is disposable -- the magic link is purely a bot gate and email capture mechanism.

### UX concerns flagged

1. **Magic link friction for 60+ users.** Switching to email mid-flow is a significant drop-off risk. Many older patients use shared devices, may not know how to switch apps, or may lose context. **Mitigation:** crystal-clear copy on the "check your email" screen. Include "Open Gmail" / "Open Outlook" deep-link buttons. Keep the magic link landing page dead simple -- auto-redirect to the form, no extra clicks.

2. **Name + email on the form page feels redundant** if they already entered email for the magic link. Pre-fill email from the auth session. Only ask for name on the form. This removes one field and avoids confusion.

3. **Four lab fields with no guidance is sparse but fine.** The 60+ audience will have lab results in hand (that is the use case). Show unit labels and normal ranges as helper text. Keep the large 48px inputs and 44px touch targets from the original specs.

4. **No stat cards means the chart must be self-explanatory.** The four trajectory lines with end-of-line labels carry all the meaning. Add a one-sentence plain-English summary above the chart: "Here is how your kidney function may change over the next 10 years under four scenarios." This replaces the stat cards for comprehension.

5. **PDF download button must be prominent.** Place it directly below the chart, full-width on mobile, styled as primary CTA. Label: "Download Your Results (PDF)". Do not bury it.

6. **Disclaimer stays inline** on desktop and as a sticky collapsed bar on mobile. No change from original spec.

---

## Impact on Existing Drafts

### user-flows.md -- MAJOR REVISION NEEDED
Flows 2-5 and 8 are dead (accounts, returning users, multi-visit, tier upgrade, guest data expiry). Flow 1 needs rewriting to match the new auth-first sequence. Flow 6 (error recovery) and Flow 7 (magic link expiry) survive with minor edits. The session state diagram collapses to two states: anonymous and verified (15-min session). Route map shrinks to: `/`, `/auth`, `/predict`, `/results`.

### wireframes.md -- MODERATE REVISION NEEDED
Remove: save prompt overlay, sign-in screen, guest data expired screen. Revise: prediction form (drop sex, tiers, collapsible sections -- just 5 fields in a single column). Revise: results screen (remove stat cards, confidence badge, unlock prompt; add PDF download button and summary sentence). Landing, loading, magic link sent, expired link, and error states survive mostly as-is.

### component-specs.md -- MODERATE REVISION NEEDED
Remove: SexRadioGroup, FormSection (collapsible), StatCardGrid, StatCard, ConfidenceBadge, UnlockPrompt, SavePromptDialog, SignInForm. Add: PDFDownloadButton, NameInput. NumberInput, PredictionForm, chart components, MagicLinkForm, MagicLinkSent, VerifyHandler, Header, Footer, DisclaimerBar all survive.

### design-tokens.md -- NO REVISION NEEDED
Colors, typography, spacing, breakpoints, chart tokens all apply unchanged.

### chart-specs.md -- MINOR REVISION NEEDED
Remove stat card interaction (stat card highlight on click). Remove `confidenceTier` from data model. Variant A/B decision and all chart rendering specs are unchanged. The chart is the product.

### accessibility-plan.md -- MINOR REVISION NEEDED
Remove references to save prompt dialog, tier upgrade, multi-visit, guest data expiry. The core accessibility standards (44px targets, 16px body text, color+pattern+label, screen reader data table, keyboard nav, axe-core testing) all apply exactly as written. This is non-negotiable for a 60+ audience.

---

## Summary

The lean launch simplifies the UX without degrading it. The biggest risk is magic link friction for older users -- mitigate with deep-link buttons and clear copy. Everything else gets simpler and more focused. I will revise the affected drafts once the team confirms this profile.
