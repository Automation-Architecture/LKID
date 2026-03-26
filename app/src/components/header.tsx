import Link from "next/link";

export function Header() {
  return (
    <header className="flex h-12 items-center border-b border-border px-4 md:h-14 lg:h-16">
      <Link href="/" aria-label="KidneyHood home" className="text-base font-bold text-foreground">
        KidneyHood
      </Link>
    </header>
  );
}
