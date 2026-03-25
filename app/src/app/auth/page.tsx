import Link from "next/link";

export default function AuthPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="w-full max-w-[400px] space-y-6">
        <h1 className="text-[28px] font-bold leading-[1.2] tracking-[-0.02em]">
          Sign In
        </h1>
        <p className="text-base text-muted-foreground">
          Enter your email for a magic link
        </p>
        <div className="space-y-3">
          <input
            type="email"
            placeholder="you@example.com"
            className="h-12 w-full rounded-md border border-input px-3 text-base"
            disabled
          />
          <button
            className="h-14 w-full rounded-lg bg-primary text-base font-semibold text-primary-foreground opacity-50"
            disabled
          >
            Send Magic Link
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          Stub page &mdash;{" "}
          <Link href="/predict" className="text-secondary underline">
            skip to predict
          </Link>
        </p>
      </div>
    </main>
  );
}
