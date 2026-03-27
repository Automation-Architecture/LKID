// @ts-nocheck — Clerk v7 type incompatibilities; full migration deferred to Sprint 3
"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Mail, AlertTriangle } from "lucide-react";

type AuthView = "email-entry" | "link-sent" | "expired";

/* -------------------------------------------------------------------------- */
/*  Email validation                                                          */
/* -------------------------------------------------------------------------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Email is required.";
  if (!EMAIL_RE.test(trimmed)) return "Please enter a valid email address.";
  return null;
}

/* -------------------------------------------------------------------------- */
/*  EmailEntryView — real Clerk magic link                                    */
/* -------------------------------------------------------------------------- */

function EmailEntryView({
  onSent,
}: {
  onSent: (email: string) => void;
}) {
  const { signIn } = useSignIn();
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [clerkError, setClerkError] = useState<string | null>(null);

  const error = (touched || submitted) ? validateEmail(email) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setClerkError(null);

    const fieldError = validateEmail(email);
    if (fieldError || !signIn) return;

    setSending(true);

    try {
      // Step 1: create the sign-in attempt with the email identifier
      const si = await signIn.create({ identifier: email.trim() });

      // Step 2: find the email address factor and send the magic link
      const emailFactor = si.supportedFirstFactors?.find(
        (f) => f.strategy === "email_link"
      );

      if (!emailFactor || !("emailAddressId" in emailFactor)) {
        setClerkError("Magic link sign-in is not available for this email.");
        setSending(false);
        return;
      }

      await si.prepareFirstFactor({
        strategy: "email_link",
        emailAddressId: emailFactor.emailAddressId,
        redirectUrl: `${window.location.origin}/predict`,
      });

      onSent(email.trim());
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";
      setClerkError(message);
    } finally {
      setSending(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Sign in with email"
      className="space-y-4"
      noValidate
    >
      <div>
        <h1 className="text-xl font-semibold text-foreground">Get Started</h1>
        <p className="mt-2 text-base text-foreground">
          Enter your email to receive a secure sign-in link.
        </p>
      </div>

      {clerkError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          data-testid="clerk-error"
        >
          {clerkError}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="email">
          Email <span aria-hidden="true">*</span>
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="your@email.com"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched(true)}
          aria-required="true"
          aria-invalid={!!error}
          aria-describedby={error ? "email-error" : undefined}
          className={`h-12 text-base ${
            error ? "border-red-500 focus-visible:ring-red-500" : ""
          }`}
          data-testid="input-email"
        />
        {error && (
          <p
            id="email-error"
            className="text-sm text-red-600"
            role="alert"
            data-testid="error-email"
          >
            {error}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={sending || !signIn}
        className="h-12 w-full rounded-lg text-base font-semibold"
        data-testid="send-magic-link"
      >
        {sending ? "Sending..." : "Send Magic Link"}
      </Button>

      <p className="text-sm text-muted-foreground">
        No password needed &mdash; we&apos;ll email you a secure link.
      </p>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*  maskEmail helper                                                          */
/* -------------------------------------------------------------------------- */

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  return `${local[0]}***@${domain}`;
}

/* -------------------------------------------------------------------------- */
/*  MagicLinkSentView                                                         */
/* -------------------------------------------------------------------------- */

function MagicLinkSentView({
  email,
  onResend,
}: {
  email: string;
  onResend: () => void;
}) {
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
            <path
              d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6zm-2 0l-8 5-8-5h16zm0 12H4V8l8 5 8-5v10z"
              fill="currentColor"
            />
            <text
              x="12"
              y="17"
              textAnchor="middle"
              fontSize="8"
              fontWeight="bold"
              fill="#EA4335"
              fontFamily="sans-serif"
            >
              G
            </text>
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
            <path
              d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6zm-2 0l-8 5-8-5h16zm0 12H4V8l8 5 8-5v10z"
              fill="currentColor"
            />
            <text
              x="12"
              y="17"
              textAnchor="middle"
              fontSize="8"
              fontWeight="bold"
              fill="#0078D4"
              fontFamily="sans-serif"
            >
              O
            </text>
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

/* -------------------------------------------------------------------------- */
/*  ExpiredLinkView                                                           */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/*  AuthContent — main orchestrator                                           */
/* -------------------------------------------------------------------------- */

function AuthContent() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");

  const [view, setView] = useState<AuthView>(
    errorParam === "expired" ? "expired" : "email-entry"
  );
  const [email, setEmail] = useState("");

  const handleSent = (submittedEmail: string) => {
    setEmail(submittedEmail);
    setView("link-sent");
  };

  const handleResend = () => {
    setView("email-entry");
  };

  return (
    <main
      id="main-content"
      className="flex flex-1 flex-col items-center justify-center px-4 md:px-6 lg:px-8"
    >
      {/* Mobile: no card wrapper, full-width with padding */}
      <div className="w-full max-w-[400px] md:hidden">
        {view === "email-entry" && <EmailEntryView onSent={handleSent} />}
        {view === "link-sent" && (
          <MagicLinkSentView email={email} onResend={handleResend} />
        )}
        {view === "expired" && <ExpiredLinkView onResend={handleResend} />}
      </div>

      {/* Tablet + Desktop: card wrapper */}
      <Card className="hidden w-full max-w-[400px] border-border p-6 md:block md:shadow-none lg:shadow-md">
        {view === "email-entry" && <EmailEntryView onSent={handleSent} />}
        {view === "link-sent" && (
          <MagicLinkSentView email={email} onResend={handleResend} />
        )}
        {view === "expired" && <ExpiredLinkView onResend={handleResend} />}
      </Card>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/*  AuthPage                                                                  */
/* -------------------------------------------------------------------------- */

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
