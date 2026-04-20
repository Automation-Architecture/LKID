import { ImageResponse } from "next/og";

/**
 * LKID-73 — Dynamic Open Graph image (1200×630) for social previews.
 *
 * Uses `next/og`'s built-in fonts so we do not have to ship a font file
 * or bloat the bundle. Brand navy background + KidneyHood.org brand mark
 * + short tagline. Keeps payload well under 300KB.
 *
 * App Router picks this up automatically and emits
 *   <meta property="og:image" content="/opengraph-image?..." />
 * on every page in the segment. `metadata.twitter.images` in the root
 * layout mirrors the same URL for `<meta name="twitter:image">`.
 *
 * Satori (the engine behind `next/og`) requires every container div with
 * more than one child to set `display: flex` (or contents/none). We
 * follow that rule throughout.
 */

export const runtime = "edge";
export const alt = "KidneyHood — Understand your kidney health";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background:
            "linear-gradient(135deg, #161B5E 0%, #1F2577 55%, #2A3192 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top row: brand mark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 36,
            fontWeight: 700,
            letterSpacing: "-0.01em",
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: 999,
              background: "#6CC24A",
              marginRight: 16,
            }}
          />
          <span>KidneyHood.org</span>
        </div>

        {/* Middle: hero copy */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            maxWidth: 960,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 92,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              textTransform: "uppercase",
            }}
          >
            <div>Understand your</div>
            <div style={{ color: "#8FE078" }}>Kidney Health</div>
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 400,
              color: "rgba(255,255,255,0.82)",
              lineHeight: 1.35,
              maxWidth: 860,
            }}
          >
            See what your lab results mean and how your kidney health may change
            over time.
          </div>
        </div>

        {/* Bottom row: trust cues */}
        <div
          style={{
            display: "flex",
            gap: 24,
            fontSize: 22,
            color: "rgba(255,255,255,0.78)",
            fontWeight: 500,
          }}
        >
          <span>No account needed</span>
          <span style={{ color: "rgba(255,255,255,0.4)" }}>•</span>
          <span>Takes less than a minute</span>
          <span style={{ color: "rgba(255,255,255,0.4)" }}>•</span>
          <span>Instant results</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
