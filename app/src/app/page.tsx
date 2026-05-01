"use client";

import Link from "next/link";
import { Manrope, Nunito_Sans } from "next/font/google";
import { DisclaimerBlock } from "@/components/disclaimer-block";

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

const LANDING_CSS = `
.kh-landing {
  --navy: #1F2577;
  --navy-deep: #161B5E;
  --navy-700: #2A3192;
  --ink: #0E0E12;
  --ink-2: #2E2F36;
  --body: #5C5F6A;
  --muted: var(--kh-muted);
  --bg: #F4F5F7;
  --bg-2: #EEF0F3;
  --border: #E4E6EB;
  --border-2: #DADDE3;
  --mint-bg: #E3F5E8;
  --mint-dot: #2FB872;
  --mint-text: #1B7A41;
  --green-1: #1F7A3A;
  --green-2: #3FA35B;
  --green-3: #6CC24A;
  --shadow-sm: 0 1px 2px rgba(16, 24, 40, .04), 0 1px 1px rgba(16, 24, 40, .03);
  --shadow-md: 0 6px 20px rgba(20, 28, 70, .08);
  --shadow-lg: 0 20px 50px rgba(20, 28, 70, .12);

  font-family: var(--font-nunito), 'Nunito Sans', system-ui, sans-serif;
  background: #fff;
  color: var(--ink);
  font-size: 16px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
.kh-landing *, .kh-landing *::before, .kh-landing *::after { box-sizing: border-box; }

.kh-landing .display {
  font-family: var(--font-manrope), 'Manrope', sans-serif;
  font-weight: 800;
  letter-spacing: -0.01em;
  line-height: 1.05;
  text-transform: uppercase;
}

.kh-landing .accent { color: var(--navy); }

/* ---------- Layout ---------- */
.kh-landing .wrap { max-width: 1200px; margin: 0 auto; }

/* ---------- Hero ---------- */
.kh-landing .hero {
  background: var(--bg);
  padding: 72px 24px 100px;
  position: relative;
  overflow: hidden;
}
.kh-landing .hero-inner { position: relative; text-align: center; max-width: 1100px; margin: 0 auto; }
.kh-landing .hero h1 {
  font-size: clamp(36px, 5.6vw, 74px);
  margin: 0 0 20px;
  color: var(--ink);
}
.kh-landing .hero .lede {
  color: var(--body);
  max-width: 460px;
  margin: 0 auto 28px;
  font-size: 16px;
}

.kh-landing .cta-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--navy);
  color: #fff;
  border: 0;
  padding: 18px 44px;
  border-radius: 999px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  position: relative;
  font-family: var(--font-nunito), 'Nunito Sans', sans-serif;
  box-shadow: 0 0 0 8px rgba(255,255,255,.7), 0 0 0 9px rgba(31,37,119,.12);
  transition: transform .15s, box-shadow .15s;
  text-decoration: none;
}
.kh-landing .cta-pill:hover { transform: translateY(-1px); }
.kh-landing .cta-pill:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 4px;
}
.kh-landing .cta-pill.on-tint {
  box-shadow: 0 0 0 8px rgba(244,245,247,.9), 0 0 0 9px rgba(31,37,119,.18);
}
.kh-landing .cta-pill.light {
  box-shadow: 0 0 0 8px rgba(255,255,255,.18), 0 0 0 9px rgba(255,255,255,.08);
}

.kh-landing .kidney-watermark {
  position: absolute;
  inset: 20px 0 0 0;
  display: flex;
  justify-content: center;
  pointer-events: none;
  opacity: .55;
}
.kh-landing .kidney-watermark svg { width: 820px; max-width: 95%; height: auto; }

.kh-landing .hero-stage {
  position: relative;
  margin-top: 40px;
  display: flex;
  justify-content: center;
  min-height: 380px;
}
.kh-landing .hero-photo {
  width: 420px;
  max-width: 60%;
  aspect-ratio: 4/3.2;
  border-radius: 12px;
  background: linear-gradient(135deg, #c9d5e8, #a6b7cf);
  position: relative;
  overflow: hidden;
  z-index: 2;
}
.kh-landing .hero-photo .photo-label {
  position: absolute;
  inset: auto 0 12px 0;
  text-align: center;
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-size: 11px;
  color: rgba(255,255,255,.9);
  letter-spacing: .04em;
  text-transform: uppercase;
}
.kh-landing .hero-photo .ph-couple {
  position: absolute; inset: 0;
  background:
    radial-gradient(ellipse at 35% 42%, #f3dbc6 0 8%, transparent 9%),
    radial-gradient(ellipse at 62% 44%, #e9c8a8 0 8%, transparent 9%),
    radial-gradient(ellipse at 35% 68%, #f6f1ea 0 14%, transparent 15%),
    radial-gradient(ellipse at 62% 68%, #d8e3cd 0 14%, transparent 15%),
    linear-gradient(180deg, #d9e0ea 0%, #b8c6dc 100%);
}

.kh-landing .stat-card {
  position: absolute;
  background: #fff;
  border-radius: 12px;
  padding: 16px 20px;
  box-shadow: var(--shadow-md);
  min-width: 220px;
  z-index: 3;
}
.kh-landing .stat-card .label {
  font-size: 13px;
  color: var(--ink-2);
  font-weight: 600;
  margin-bottom: 8px;
  white-space: nowrap;
}
.kh-landing .stat-card .value {
  font-family: var(--font-manrope), 'Manrope', sans-serif;
  font-size: 34px;
  font-weight: 700;
  color: var(--navy);
  line-height: 1;
}
.kh-landing .stat-card .unit {
  font-size: 12px;
  color: var(--body);
  margin-left: 4px;
  font-weight: 500;
}

.kh-landing .stat-left { top: 30px; left: 4%; }
.kh-landing .stat-right { top: 30px; right: 4%; }

.kh-landing .hero-sub {
  position: absolute;
  font-size: 13px;
  color: var(--body);
  line-height: 1.5;
}
.kh-landing .hero-sub.left { bottom: -20px; left: 10%; }
.kh-landing .hero-sub.right { bottom: -20px; right: 10%; text-align: right; }
.kh-landing .hero-sub.right .impact {
  font-family: var(--font-manrope), 'Manrope', sans-serif;
  font-size: 28px;
  font-weight: 700;
  color: var(--kh-muted);
  display: block;
  margin-top: 4px;
  line-height: 1;
}

/* trajectory chart */
.kh-landing .trajectory-card {
  margin: 80px auto 0;
  max-width: 900px;
  background: #fff;
  border-radius: 20px;
  padding: 28px 32px 36px;
  box-shadow: var(--shadow-md);
  position: relative;
  z-index: 2;
}
.kh-landing .trajectory-title {
  position: absolute;
  top: 28px;
  right: 36px;
  font-size: 14px;
  color: var(--ink-2);
  font-weight: 500;
  max-width: 180px;
  text-align: right;
  line-height: 1.3;
}
.kh-landing .trajectory-chart { width: 100%; height: 240px; display: block; }
.kh-landing .trajectory-axis {
  display: flex;
  justify-content: space-between;
  padding: 10px 4px 0;
  font-size: 12px;
  color: var(--body);
  font-weight: 500;
}

.kh-landing .chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--mint-bg);
  color: var(--mint-text);
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
}
.kh-landing .chip .dot {
  width: 8px; height: 8px;
  background: var(--mint-dot);
  border-radius: 999px;
}

.kh-landing .dl-box {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px 18px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 1px 2px rgba(16,24,40,.03);
}
.kh-landing .dl-ico {
  width: 32px; height: 32px;
  border-radius: 999px;
  background: var(--bg-2);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.kh-landing .dl-label { font-weight: 600; font-size: 14px; color: var(--ink); }

/* ---------- Navy band ---------- */
.kh-landing .band {
  background: linear-gradient(90deg, var(--navy-deep) 0%, var(--navy) 55%, #3A4AB8 100%);
  color: #fff;
  padding: 80px 24px;
  position: relative;
  overflow: hidden;
}
.kh-landing .band::before {
  content: "";
  position: absolute;
  inset: 0;
  background: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 400'><defs><radialGradient id='g' cx='50%25' cy='50%25'><stop offset='0%25' stop-color='%238FA8E8' stop-opacity='.5'/><stop offset='100%25' stop-color='%231F2577' stop-opacity='0'/></radialGradient></defs><ellipse cx='500' cy='200' rx='260' ry='180' fill='url(%23g)'/><ellipse cx='680' cy='260' rx='180' ry='110' fill='url(%23g)' opacity='.6'/></svg>") right center / auto 100% no-repeat;
  opacity: .85;
}
.kh-landing .band-inner {
  position: relative;
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  gap: 48px;
  max-width: 1200px;
  margin: 0 auto;
  align-items: center;
}
.kh-landing .band h2 {
  font-size: clamp(28px, 3.4vw, 44px);
  margin: 0 0 28px;
  color: #fff;
  line-height: 1.1;
}
.kh-landing .band p {
  color: rgba(255,255,255,.9);
  margin: 0 0 12px;
  font-size: 15px;
  line-height: 1.55;
  max-width: 460px;
}

/* ---------- See your future ---------- */
.kh-landing .future { background: var(--bg); padding: 100px 24px; }
.kh-landing .future-inner {
  display: grid;
  grid-template-columns: 1fr 1.1fr;
  gap: 48px;
  max-width: 1200px;
  margin: 0 auto;
  align-items: center;
}
.kh-landing .future h2 { font-size: clamp(32px, 4.2vw, 54px); margin: 14px 0 18px; }
.kh-landing .future p { color: var(--body); max-width: 440px; margin: 0; font-size: 15px; }

.kh-landing .future-chart {
  background: #fff;
  border-radius: 18px;
  padding: 26px 28px 22px;
  box-shadow: var(--shadow-md);
}
.kh-landing .future-chart .cap {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--navy);
  font-weight: 700;
  font-family: var(--font-manrope), 'Manrope', sans-serif;
  font-size: 15px;
  margin-bottom: 8px;
}
.kh-landing .future-chart .cap::before {
  content: ""; width: 9px; height: 9px; background: var(--navy); border-radius: 999px;
}

.kh-landing .calm-quote {
  max-width: 640px;
  margin: 80px auto 0;
  text-align: center;
  color: var(--body);
  font-size: clamp(18px, 2.2vw, 24px);
  line-height: 1.45;
  font-weight: 400;
}

/* ---------- Final CTA ---------- */
.kh-landing .final { background: var(--bg); padding: 40px 24px 90px; }
.kh-landing .final-card {
  max-width: 1100px;
  margin: 0 auto;
  background: #fff;
  border-radius: 22px;
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  align-items: center;
  padding: 48px 52px;
  gap: 32px;
  box-shadow: var(--shadow-md);
  overflow: hidden;
  position: relative;
}
.kh-landing .final-card h2 { font-size: clamp(28px, 3vw, 44px); margin: 0 0 10px; }
.kh-landing .final-card .sub { color: var(--body); font-size: 14px; margin: 0 0 26px; }

.kh-landing .kidney-art {
  width: 100%;
  aspect-ratio: 1/1;
  max-width: 340px;
  margin-left: auto;
  position: relative;
  border-radius: 999px;
  background: radial-gradient(circle at 50% 50%, #fff 0%, #fff 55%, rgba(0,0,0,.02) 56%, rgba(0,0,0,0) 70%);
}
.kh-landing .kidney-art::before {
  content: "";
  position: absolute; inset: 8%;
  border-radius: 999px;
  border: 1px solid rgba(31,37,119,.07);
}
.kh-landing .kidney-art::after {
  content: "";
  position: absolute; inset: 16%;
  border-radius: 999px;
  border: 1px solid rgba(31,37,119,.05);
}
.kh-landing .kidney-art .kidney { position: absolute; inset: 0; display: grid; place-items: center; }
.kh-landing .kidney-art svg { width: 78%; height: auto; filter: drop-shadow(0 14px 30px rgba(31, 122, 58, .35)); }

/* ---------- Footer ---------- */
.kh-landing footer.kh-foot {
  background: var(--bg);
  padding: 28px 24px 48px;
  text-align: center;
  font-size: 13px;
  color: var(--body);
}
.kh-landing .kh-foot .brand-foot {
  color: var(--navy);
  font-weight: 700;
  font-family: var(--font-manrope), 'Manrope', sans-serif;
  font-size: 16px;
  margin-bottom: 10px;
}
.kh-landing .kh-foot nav { display: flex; gap: 24px; justify-content: center; }
.kh-landing .kh-foot a { color: var(--body); text-decoration: none; padding: 2px 0; }
.kh-landing .kh-foot a:hover { color: var(--ink-2); }

/* ---------- Mobile ---------- */
@media (max-width: 900px) {
  .kh-landing .hero { padding: 40px 20px 60px; }
  .kh-landing .hero .lede { font-size: 14px; }
  .kh-landing .cta-pill { padding: 14px 28px; font-size: 14px; }

  .kh-landing .hero-stage { min-height: 240px; margin-top: 24px; }
  .kh-landing .hero-photo { width: 88%; max-width: 100%; aspect-ratio: 4/3; }
  .kh-landing .stat-card { display: none; }
  .kh-landing .hero-sub { display: none; }
  .kh-landing .kidney-watermark { opacity: .25; }
  .kh-landing .kidney-watermark svg { width: 300px; }

  .kh-landing .trajectory-card { margin-top: 40px; padding: 18px 16px 22px; border-radius: 14px; }
  .kh-landing .trajectory-title { position: static; text-align: left; max-width: none; margin-bottom: 10px; font-size: 13px; }

  .kh-landing .band, .kh-landing .future, .kh-landing .final { padding: 60px 20px; }

  .kh-landing .band-inner, .kh-landing .future-inner, .kh-landing .final-card {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  .kh-landing .final-card { padding: 32px 24px; }
  .kh-landing .kidney-art { max-width: 220px; margin: 0 auto; }

  .kh-landing .calm-quote { margin-top: 48px; font-size: 18px; padding: 0 8px; }
}
`;

/**
 * LKID-73 — MedicalWebPage JSON-LD structured data.
 *
 * Emitted as an inline <script type="application/ld+json"> on the landing
 * page so search engines can surface KidneyHood as a patient-facing health
 * tool. We intentionally keep the schema small and avoid claiming medical
 * advice — the landing copy already carries the "educational, not medical
 * advice" framing, and the disclaimer block reinforces it.
 */
const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://kidneyhood-automation-architecture.vercel.app";

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "MedicalWebPage",
  name: "KidneyHood — Understand your kidney health",
  description:
    "See what your lab results mean and how your kidney health may change over time. Plain-language kidney health check — no account needed, takes less than a minute.",
  url: SITE_URL,
  inLanguage: "en",
  isAccessibleForFree: true,
  audience: {
    "@type": "PeopleAudience",
    audienceType: "Adults with kidney-function concerns",
  },
  publisher: {
    "@type": "Organization",
    name: "KidneyHood",
    url: SITE_URL,
  },
  about: {
    "@type": "MedicalCondition",
    name: "Chronic kidney disease",
  },
};

export default function LandingPage() {
  return (
    <div className={`kh-landing ${manrope.variable} ${nunito.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: LANDING_CSS }} />
      {/* LKID-73 — MedicalWebPage JSON-LD for search engines. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      <div style={{ height: 64, backgroundColor: 'var(--navy)' }} aria-hidden="true" />

      <main id="main-content">
        <section className="hero">
          <div className="kidney-watermark" aria-hidden="true">
            <svg viewBox="0 0 820 420" xmlns="http://www.w3.org/2000/svg">
              <g fill="none" stroke="#1F2577" strokeWidth="1" opacity=".12">
                <path d="M220 80c-80 0-140 70-140 150s60 140 130 140c50 0 70-20 70-60s-30-40-30-80 40-40 40-90-30-60-70-60z" />
                <path d="M600 80c80 0 140 70 140 150s-60 140-130 140c-50 0-70-20-70-60s30-40 30-80-40-40-40-90 30-60 70-60z" />
              </g>
              <g fill="none" stroke="#1F2577" strokeWidth="0.6" opacity=".08">
                <ellipse cx="410" cy="210" rx="400" ry="180" />
                <ellipse cx="410" cy="210" rx="340" ry="150" />
                <ellipse cx="410" cy="210" rx="280" ry="120" />
              </g>
            </svg>
          </div>

          <div className="hero-inner">
            <h1 className="display">
              Understand your<br />
              <span className="accent">Kidney Health</span> in a simple way
            </h1>
            <p className="lede">
              See what your lab results mean and how your kidney health may change over time.
            </p>
            <Link href="/labs" className="cta-pill on-tint">
              Start your check
            </Link>

            <div className="hero-stage">
              <div className="stat-card stat-left">
                <div className="label">Your current kidney function</div>
                <div className="value">33<span className="unit">eGFR points</span></div>
              </div>
              <div className="stat-card stat-right">
                <div className="label">Possible future level (5 years)</div>
                <div className="value">25.9<span className="unit">eGFR points</span></div>
              </div>

              <div className="hero-photo" aria-label="Older couple placeholder">
                <div className="ph-couple" />
                <div className="photo-label">{"// couple photo"}</div>
              </div>

              <div className="hero-sub left">
                No account needed<br />Takes less than a minute
              </div>
              <div className="hero-sub right">
                Impact from your BUN level
                <span className="impact">-7.8 impact</span>
              </div>
            </div>

            <div className="trajectory-card">
              <div className="trajectory-title">
                How your kidney function may<br />change over time
              </div>
              <svg className="trajectory-chart" viewBox="0 0 860 240" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id="trajLine" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#2A3192" />
                    <stop offset="100%" stopColor="#8FA8E8" />
                  </linearGradient>
                </defs>
                <g stroke="#E4E6EB" strokeDasharray="2 4" strokeWidth="1">
                  <line x1="80" y1="30" x2="80" y2="200" />
                  <line x1="210" y1="30" x2="210" y2="200" />
                  <line x1="340" y1="30" x2="340" y2="200" />
                  <line x1="470" y1="30" x2="470" y2="200" />
                  <line x1="600" y1="30" x2="600" y2="200" />
                  <line x1="730" y1="30" x2="730" y2="200" />
                </g>
                <polyline
                  fill="none"
                  stroke="url(#trajLine)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points="80,60 210,80 340,110 470,135 600,160 730,185"
                />
                <g>
                  <circle cx="80" cy="60" r="8" fill="#2A3192" />
                  <circle cx="210" cy="80" r="8" fill="#3F4AA4" />
                  <circle cx="340" cy="110" r="8" fill="#5563B6" />
                  <circle cx="470" cy="135" r="8" fill="#6B7BC4" />
                  <circle cx="600" cy="160" r="8" fill="#8293D0" />
                  <circle cx="730" cy="185" r="8" fill="#9AA9DA" />
                </g>
              </svg>
              <div className="trajectory-axis">
                <span>Today</span>
                <span>3 mo</span>
                <span>1 yr</span>
                <span>2 yrs</span>
                <span>4 yrs</span>
                <span>5 yrs</span>
              </div>
            </div>
          </div>
        </section>

        <section className="band">
          <div className="band-inner">
            <div>
              <h2 className="display">
                More than numbers —<br />real understanding
              </h2>
              <Link href="/labs" className="cta-pill light">
                Get your prediction
              </Link>
            </div>
            <div>
              <p>
                <strong>KidneyHood</strong> helps you understand your kidney health in a simple and clear way.
              </p>
              <p>
                Instead of just numbers, you see where you stand today and what may happen over time. It shows the bigger picture, so you can see your current condition and possible future trends.
              </p>
            </div>
          </div>
        </section>

        <section className="future" id="preview">
          <div className="future-inner">
            <div>
              <span className="chip"><span className="dot" />Prediction</span>
              <h2 className="display">
                See your future,<br />not just your results
              </h2>
              <p>
                Each result is presented with a clear trajectory, helping you understand direction over time — not just isolated data.
              </p>
            </div>

            <div className="future-chart">
              <div className="cap">Your Future Kidney Function</div>
              <svg viewBox="0 0 480 260" preserveAspectRatio="none" style={{ width: "100%", height: "auto", display: "block" }} aria-hidden="true">
                <defs>
                  <linearGradient id="fill1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6CC24A" stopOpacity=".22" />
                    <stop offset="100%" stopColor="#6CC24A" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <g fontFamily="inherit" fontSize="11" fill="#5C5F6A">
                  <text x="20" y="50">30</text>
                  <text x="20" y="120">20</text>
                  <text x="20" y="190">10</text>
                  <text x="5" y="130" transform="rotate(-90 10 130)">eGFR</text>
                </g>
                <path
                  d="M60 45 C 140 48, 200 60, 260 110 S 360 190, 440 205 L 440 220 L 60 220 Z"
                  fill="url(#fill1)"
                />
                <path
                  d="M60 55 C 140 60, 200 75, 260 125 S 360 200, 440 210"
                  fill="none"
                  stroke="#1F7A3A"
                  strokeWidth="2.5"
                />
                <path
                  d="M60 48 C 140 52, 200 65, 260 110 S 360 180, 440 195"
                  fill="none"
                  stroke="#3FA35B"
                  strokeWidth="2.5"
                />
                <path
                  d="M60 42 C 140 46, 200 58, 260 95 S 360 160, 440 175"
                  fill="none"
                  stroke="#6CC24A"
                  strokeWidth="2.5"
                />
                <g fill="#1F7A3A">
                  <circle cx="60" cy="220" r="6" />
                  <circle cx="180" cy="220" r="6" />
                  <circle cx="300" cy="220" r="6" />
                  <circle cx="440" cy="220" r="6" />
                </g>
                <g fontFamily="inherit" fontSize="11" fill="#5C5F6A">
                  <text x="56" y="245">0</text>
                  <text x="176" y="245">2</text>
                  <text x="296" y="245">4</text>
                  <text x="436" y="245">6</text>
                  <text x="445" y="258" fontWeight="600">Years</text>
                </g>
              </svg>
            </div>
          </div>

          <div className="calm-quote">
            Designed to be clear, calm, and easy to understand, without unnecessary complexity or overwhelming medical language.
          </div>
        </section>

        <section className="final">
          <div className="final-card">
            <div>
              <h2 className="display">
                Get your<br />
                <span className="accent">Personalized</span> Kidney<br />
                Health Report
              </h2>
              <p className="sub">Based on your lab results</p>
              <Link href="/labs" className="cta-pill">
                Get your prediction
              </Link>
            </div>
            <div className="kidney-art" aria-hidden="true">
              <div className="kidney">
                <svg viewBox="0 0 260 260" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <radialGradient id="kg" cx="50%" cy="40%" r="70%">
                      <stop offset="0%" stopColor="#8FE078" />
                      <stop offset="55%" stopColor="#3FA35B" />
                      <stop offset="100%" stopColor="#1F7A3A" />
                    </radialGradient>
                  </defs>
                  <g fill="url(#kg)">
                    <path d="M92 40c-36 0-64 32-64 72s20 76 52 96c18 11 44 6 54-14 8-14 0-28-6-42-8-18 4-30 16-42 14-14 18-30 10-46-8-16-28-24-62-24z" />
                    <path d="M168 40c36 0 64 32 64 72s-20 76-52 96c-18 11-44 6-54-14-8-14 0-28 6-42 8-18-4-30-16-42-14-14-18-30-10-46 8-16 28-24 62-24z" />
                  </g>
                  <g fill="#fff" opacity=".35">
                    <ellipse cx="70" cy="80" rx="14" ry="24" transform="rotate(-18 70 80)" />
                    <ellipse cx="190" cy="80" rx="14" ry="24" transform="rotate(18 190 80)" />
                  </g>
                </svg>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="kh-foot">
        <div className="brand-foot">KidneyHood.org</div>
        <nav aria-label="Footer navigation">
          <a href="#">Privacy</a>
          <a href="#">Disclaimer</a>
          <a href="#">Contact</a>
        </nav>
      </footer>

      <DisclaimerBlock />
    </div>
  );
}
