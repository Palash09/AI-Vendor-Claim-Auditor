"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState } from "react";

const ACTIVE_AUDIT_KEY = "claim-auditor-active-audit";

export function ReviewerAccount({ reviewerName }: { reviewerName: string }) {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    if (!currentUrl.searchParams.has("code")) return;

    currentUrl.searchParams.delete("code");
    currentUrl.searchParams.delete("returnTo");
    window.history.replaceState(null, "", currentUrl);
  }, []);

  async function signOut() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !publishableKey) return;

    setBusy(true);
    const supabase = createBrowserClient(url, publishableKey);
    await supabase.auth.signOut();
    window.localStorage.removeItem(ACTIVE_AUDIT_KEY);
    window.location.replace("/sign-in");
  }

  return (
    <div className="reviewer-account">
      <span className="reviewer-chip" title={reviewerName}>
        <span aria-hidden="true">●</span>
        <span>{reviewerName}</span>
      </span>
      <button type="button" onClick={signOut} disabled={busy}>
        {busy ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}
