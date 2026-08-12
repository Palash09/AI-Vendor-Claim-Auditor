import { safeReturnPath } from "@/app/reviewer-auth";
import Link from "next/link";
import { SignInForm } from "./SignInForm";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  return (
    <main className="signin-shell">
      <Link className="brand" href="/">
        <span className="brand-mark">CA</span>
        <span><strong>Claim Auditor</strong><small>Evidence before confidence</small></span>
      </Link>
      <SignInForm returnTo={safeReturnPath(returnTo)} />
    </main>
  );
}
