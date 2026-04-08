/**
 * Minimal layout for internal pages (PDF rendering, etc.).
 * No header, no nav, no disclaimer footer — just the content.
 */
export default function InternalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: "#fff" }}>
        {children}
      </body>
    </html>
  );
}
