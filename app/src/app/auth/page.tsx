"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Mail, AlertTriangle } from "lucide-react";

type AuthView = "email-entry" | "link-sent" | "expired";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function EmailEntryView({
  onSend,
}: {
  onSend: (email: string) => void;
}) {
  const { signIn } = useSignIn();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setError("Email is required");
      return;
    }
    if (!isValidEmail(trimmed)) {
      setError("Please enter a valid email address");
      return;
    }

    if (!signIn) {
      setError("Authentication is loading. Please try again.");
      return;
    }

    setIsSending(true);
    try {
      // Step 1: Create sign-in attempt with email identifier
      const createResult = await signIn.create({ identifier: trimmed });
      if (createResult.error) {
        setError(createResult.error.message || "Unable to start sign-in. Please try again.");
        return;
      }

      // Step 2: Send the magic link email
      const verificationUrl = `${window.location.origin}/predict`;
      const sendResult = await signIn.emailLink.sendLink({
        emailAddress: trimmed,
        verificationUrl,
      });
      if (sendResult.error) {
        setError(sendResult.error.message || "Unable to send sign-in link. Please try again.");
        return;
      }

      onSend(trimmed);
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "errors" in err &&
        Array.isArray((err as { errors: unknown[] }).errors)
      ) {
        const clerkErrors = (err as { errors: Array<{ longMessage?: string; message?: string }> }).errors;
        const message = clerkErrors[0]?.longMessage || clerkErrors[0]?.message || "Something went wrong";
        setError(message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unable to send sign-in link. Please try again.");
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} aria-label="Sign in with email" className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Get Started</h1>
        <p className="mt-2 text-base text-foreground">
          Enter your email to receive a secure sign-in link.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="auth-email">Email</Label>
        <Input
          id="auth-email"
          type="email"
          placeholder="your@email.com"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError(null);
          }}
          aria-required
          aria-invalid={!!error}
          aria-describedby={error ? "auth-email-error" : undefined}
          className="h-12 text-base"
        />
        {error && (
          <p id="auth-email-error" className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
      <Button
        type="submit"
        disabled={isSending}
        className="h-12 w-full rounded-lg text-base font-semibold"
      >
        {isSending ? (
          <span className="flex items-center gap-2">
            <svg
              className="size-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Sending...
          </span>
        ) : (
          "Send me a sign-in link"
        )}
      </Button>
      <p className="text-sm text-muted-foreground">
        No account? One will be created automatically.
      </p>
    </form>
  );
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  return `${local[0]}***@${domain}`;
}

function MagicLinkSentView({
  email,
  onResend,
}: {
  email: string;
  onResend: () => void;
}) {
  const { signIn } = useSignIn();
  const router = useRouter();
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Poll for verification completion
  useEffect(() => {
    if (!signIn) return;

    let cancelled = false;

    async function waitForLink() {
      try {
        const result = await signIn.emailLink.waitForVerification();
        if (cancelled) return;

        if (result.error) {
          // Verification failed or expired — handled below
          return;
        }

        // Verification succeeded — finalize to set active session, then redirect
        await signIn.finalize();
        router.push("/predict");
      } catch {
        // Silently handle — user may have navigated away
      }
    }

    waitForLink();
    return () => {
      cancelled = true;
    };
  }, [signIn, router]);

  const handleResend = useCallback(() => {
    onResend();
    setCountdown(60);
  }, [onResend]);

  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        <Mail className="size-12 text-primary" />
      </div>
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Check your email!
        </h1>
        <p className="mt-2 text-base text-foreground">
          We sent a sign-in link to{" "}
          <span className="font-semibold">{maskEmail(email)}</span>
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          The link expires in 15 minutes.
        </p>
      </div>

      {/* Deep-link buttons */}
      <div className="space-y-3">
        <a
          href="https://mail.google.com/mail/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-border bg-white text-base font-medium text-foreground transition-colors hover:bg-[#F8F9FA]"
        >
          <svg className="size-5" viewBox="0 0 24 24" fill="none">
            <path d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6zm-2 0l-8 5-8-5h16zm0 12H4V8l8 5 8-5v10z" fill="currentColor"/>
            <text x="12" y="17" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#EA4335" fontFamily="sans-serif">G</text>
          </svg>
          Open Gmail
        </a>
        <a
          href="https://outlook.live.com/mail/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-border bg-white text-base font-medium text-foreground transition-colors hover:bg-[#F8F9FA]"
        >
          <svg className="size-5" viewBox="0 0 24 24" fill="none">
            <path d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6zm-2 0l-8 5-8-5h16zm0 12H4V8l8 5 8-5v10z" fill="currentColor"/>
            <text x="12" y="17" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#0078D4" fontFamily="sans-serif">O</text>
          </svg>
          Open Outlook
        </a>
      </div>

      {/* Resend button with countdown */}
      <div>
        <button
          onClick={handleResend}
          disabled={countdown > 0}
          aria-disabled={countdown > 0}
          aria-label={
            countdown > 0
              ? `Resend link, available in ${countdown} seconds`
              : "Resend link"
          }
          className="min-h-[44px] text-base text-muted-foreground underline transition-colors hover:text-foreground disabled:no-underline disabled:opacity-50"
        >
          Resend link
        </button>
        {countdown > 0 && (
          <p className="mt-1 text-sm text-muted-foreground">
            (available in {countdown} seconds)
          </p>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Didn&apos;t receive it? Check your spam folder.
      </p>
    </div>
  );
}

function ExpiredLinkView({ onResend }: { onResend: () => void }) {
  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        <AlertTriangle className="size-12 text-destructive" />
      </div>
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          This link has expired
        </h1>
        <p className="mt-2 text-base text-foreground">
          Sign-in links are valid for 15 minutes for your security.
        </p>
      </div>
      <Button
        onClick={onResend}
        className="h-12 w-full rounded-lg text-base font-semibold"
      >
        Send a new link
      </Button>
      <Link
        href="/"
        className="inline-flex min-h-[44px] items-center text-base text-secondary underline hover:text-secondary/80"
      >
        Back to home
      </Link>
    </div>
  );
}

function AuthContent() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");

  const [view, setView] = useState<AuthView>(
    errorParam === "expired" ? "expired" : "email-entry"
  );
  const [email, setEmail] = useState("");

  const handleSendLink = (submittedEmail: string) => {
    setEmail(submittedEmail);
    setView("link-sent");
  };

  const handleResend = () => {
    setView("email-entry");
  };

  return (
    <main id="main-content" className="flex flex-1 flex-col items-center justify-center px-4 md:px-6 lg:px-8">
      {/* Mobile: no card wrapper, full-width with padding */}
      <div className="w-full max-w-[400px] md:hidden">
        {view === "email-entry" && (
          <EmailEntryView onSend={handleSendLink} />
        )}
        {view === "link-sent" && (
          <MagicLinkSentView email={email} onResend={handleResend} />
        )}
        {view === "expired" && <ExpiredLinkView onResend={handleResend} />}
      </div>

      {/* Tablet + Desktop: card wrapper */}
      <Card className="hidden w-full max-w-[400px] border-border p-6 md:block md:shadow-none lg:shadow-md">
        {view === "email-entry" && (
          <EmailEntryView onSend={handleSendLink} />
        )}
        {view === "link-sent" && (
          <MagicLinkSentView email={email} onResend={handleResend} />
        )}
        {view === "expired" && <ExpiredLinkView onResend={handleResend} />}
      </Card>
    </main>
  );
}

export default function AuthPage() {
  return (
    <>
      <Header />
      <Suspense
        fallback={
          <main className="flex flex-1 flex-col items-center justify-center px-4">
            <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </main>
        }
      >
        <AuthContent />
      </Suspense>
    </>
  );
}
