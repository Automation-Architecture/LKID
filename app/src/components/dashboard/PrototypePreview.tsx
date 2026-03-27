export function PrototypePreview() {
  return (
    <section className="rounded-xl" style={{ backgroundColor: "#004D43", padding: "40px" }}>
      <h2 className="text-2xl font-bold text-white">
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
        style={{ height: "52px", backgroundColor: "#E6FF2B", color: "#004D43" }}
      >
        View Prototype &rarr;
      </a>
    </section>
  );
}
