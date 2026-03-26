export function PrototypePreview() {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold" style={{ color: "#004D43" }}>
        Live Prototype
      </h2>
      <p className="text-sm" style={{ color: "#636363" }}>
        Click through all 7 screens — real layout, real components, chart placeholder.
        This is a working Next.js application, not a static mockup.
      </p>
      <a
        href="https://kidneyhood.vercel.app"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-14 items-center justify-center rounded-lg px-8 text-base font-bold transition-opacity hover:opacity-90"
        style={{ backgroundColor: "#E6FF2B", color: "#004D43" }}
      >
        View Prototype &rarr;
      </a>
    </section>
  );
}
