"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useState } from "react";

export function SignInForm({
  returnTo,
  enableGuestDemo = false,
  initialMessage = null,
}: {
  returnTo: string;
  enableGuestDemo?: boolean;
  initialMessage?: string | null;
}) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(initialMessage);
  const [busy, setBusy] = useState(false);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  async function sendMagicLink(event: React.FormEvent) {
    event.preventDefault();
    if (!url || !publishableKey) {
      setMessage("Sign-in is not configured for this deployment yet.");
      return;
    }
    setBusy(true);
    setMessage(null);
    const supabase = createBrowserClient(url, publishableKey);
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("returnTo", returnTo);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callback.toString() },
    });
    setBusy(false);
    setMessage(
      error ? error.message : "Check your email for a secure sign-in link.",
    );
  }

  async function continueAsGuest() {
    if (!url || !publishableKey) {
      setMessage("Demo access is not configured for this deployment yet.");
      return;
    }
    setBusy(true);
    setMessage(null);
    const supabase = createBrowserClient(url, publishableKey);
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      setBusy(false);
      setMessage(error.message);
      return;
    }
    window.location.assign(returnTo);
  }

  async function signInWithGoogle() {
    if (!url || !publishableKey) {
      setMessage("Sign-in is not configured for this deployment yet.");
      return;
    }
    const supabase = createBrowserClient(url, publishableKey);
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("returnTo", returnTo);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback.toString() },
    });
    if (error) setMessage(error.message);
  }

  return (
    <div className="signin-card">
      <p className="eyebrow">Private evidence workspace</p>
      <h1>Sign in to review a vendor.</h1>
      <p className="intro-copy">
        {enableGuestDemo
          ? "No account is required. Continue with a temporary private demo session."
          : "Use any email address. We will send a one-time secure link—no ChatGPT account is required."}
      </p>
      {enableGuestDemo ? (
        <>
          <button
            className="guest-signin"
            type="button"
            disabled={busy}
            onClick={continueAsGuest}
          >
            {busy ? "Opening demo…" : "Continue to the demo"}
          </button>
          <p className="demo-access-note">
            No email required. Demo analysis runs locally and cannot create
            OpenAI usage charges.
          </p>
        </>
      ) : null}
      {!enableGuestDemo ? (
        <form onSubmit={sendMagicLink} className="signin-form">
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
          <button type="submit" disabled={busy}>
            {busy ? "Sending…" : "Email me a sign-in link"}
          </button>
        </form>
      ) : null}
      {process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === "true" ? (
        <button className="secondary-signin" type="button" onClick={signInWithGoogle}>
          Continue with Google
        </button>
      ) : null}
      {message ? <p className="signin-message" role="status">{message}</p> : null}
    </div>
  );
}
