import { createSupabaseServerClient, safeReturnPath } from "@/app/reviewer-auth";
import type { EmailOtpType } from "@supabase/supabase-js";

const EMAIL_OTP_TYPES = new Set<EmailOtpType>([
  "email",
  "invite",
  "magiclink",
  "recovery",
  "signup",
  "email_change",
]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const returnTo = safeReturnPath(url.searchParams.get("returnTo"));
  const supabase = await createSupabaseServerClient();

  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return Response.redirect(new URL(returnTo, url.origin), 303);
  }

  if (tokenHash && type && EMAIL_OTP_TYPES.has(type) && supabase) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (!error) return Response.redirect(new URL(returnTo, url.origin), 303);
  }

  const signIn = new URL("/sign-in", url.origin);
  signIn.searchParams.set("returnTo", returnTo);
  signIn.searchParams.set("error", "Sign-in link could not be verified.");
  return Response.redirect(signIn, 303);
}
