export function PrototypePreview() {
  return (
    <section className="rounded-xl" aria-labelledby="live-prototype-heading" style={{ backgroundColor: "var(--brand-teal)", padding: "40px" }}>
      <h2 id="live-prototype-heading" className="text-2xl font-bold text-white">
        Live Prototype
      </h2>
      <p className="mt-2 text-base" style={{ color: "rgba(255,255,255,0.8)" }}>
        Click through all 7 screens — real layout, real components, chart placeholder.
        This is a working Next.js application, not a static mockup.
      </p>
      <a
        href="https://kidneyhood.vercel.app"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-flex items-center justify-center rounded-lg px-8 text-base font-bold hover:bg-[#D4ED26] focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2"
        style={{ height: "52px", backgroundColor: "var(--brand-lime)", color: "var(--brand-teal)" }}
      >
        View Prototype &rarr;
      </a>

      {/* Screenshot placeholders */}
      <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-3">
        {["Landing Page", "Prediction Form", "Results Chart"].map((label) => (
          <div
            key={label}
            className="flex aspect-video items-center justify-center rounded-lg"
            style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
          >
            <span className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
