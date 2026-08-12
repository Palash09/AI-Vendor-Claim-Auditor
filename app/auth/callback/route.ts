import { createSupabaseServerClient, safeReturnPath } from "@/app/reviewer-auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const returnTo = safeReturnPath(url.searchParams.get("returnTo"));
  const supabase = await createSupabaseServerClient();

  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return Response.redirect(new URL(returnTo, url.origin), 303);
  }

  const signIn = new URL("/sign-in", url.origin);
  signIn.searchParams.set("returnTo", returnTo);
  signIn.searchParams.set("error", "Sign-in link could not be verified.");
  return Response.redirect(signIn, 303);
}
