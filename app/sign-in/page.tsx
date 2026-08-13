import { safeReturnPath } from "@/app/reviewer-auth";
import Link from "next/link";
import { SignInForm } from "./SignInForm";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; error?: string }>;
}) {
  const { returnTo, error } = await searchParams;
  return (
    <main className="signin-shell">
      <Link className="brand" href="/">
        <span className="brand-mark">CA</span>
        <span><strong>Claim Auditor</strong><small>Evidence before confidence</small></span>
      </Link>
      <SignInForm
        returnTo={safeReturnPath(returnTo)}
        enableGuestDemo={process.env.NEXT_PUBLIC_ENABLE_GUEST_DEMO === "true"}
        enableGoogleAuth={process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === "true"}
        initialMessage={error ? "That sign-in could not be verified. Please try again." : null}
      />
    </main>
  );
}
