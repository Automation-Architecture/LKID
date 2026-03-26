import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KidneyHood — Project Dashboard",
  description: "Client progress dashboard for KidneyHood",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F9F7F2" }}>
      <header className="border-b" style={{ borderColor: "#D8D8D8", backgroundColor: "#004D43" }}>
        <div className="mx-auto flex h-14 max-w-[1024px] items-center px-6">
          <span className="text-base font-bold text-white">KidneyHood</span>
          <span className="ml-3 text-sm" style={{ color: "#E6FF2B" }}>
            Project Dashboard
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-[1024px] px-6 py-10 md:px-8 lg:px-0">
        {children}
      </main>
      <footer className="border-t py-6 text-center text-sm" style={{ borderColor: "#D8D8D8", color: "#636363" }}>
        Powered by Automation Architecture
      </footer>
    </div>
  );
}
