import Link from "next/link";

export function Header() {
  return (
    <header className="flex h-12 items-center border-b border-border px-4 md:h-14 lg:h-16" role="banner">
      <nav aria-label="Main navigation">
        <Link
          href="/"
          aria-label="KidneyHood home"
          className="text-base font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
        >
          KidneyHood
        </Link>
      </nav>
    </header>
  );
}
