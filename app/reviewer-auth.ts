import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type Reviewer = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

export async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return null;

  const cookieStore = await cookies();
  return createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (updates) => {
        try {
          updates.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components cannot always write cookies. `proxy.ts` refreshes
          // sessions before rendering and route handlers can write normally.
        }
      },
    },
  });
}

export async function getReviewer(): Promise<Reviewer | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    if (process.env.NODE_ENV !== "production") {
      return {
        userId: "local-development-reviewer",
        displayName: "Local reviewer",
        email: "reviewer@local.test",
        fullName: "Local reviewer",
      };
    }
    return null;
  }

  const { data, error } = await supabase.auth.getUser();
  const user = data.user;
  if (error || !user?.email) return null;

  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : null;
  return {
    userId: user.id,
    displayName: fullName ?? user.email,
    email: user.email,
    fullName,
  };
}

export async function requireReviewer(returnTo: string): Promise<Reviewer> {
  const reviewer = await getReviewer();
  if (reviewer) return reviewer;
  redirect(`/sign-in?returnTo=${encodeURIComponent(safeReturnPath(returnTo))}`);
}

export function safeReturnPath(value: string | null | undefined): string {
  if (!value?.startsWith("/") || value.startsWith("//")) return "/";
  try {
    const url = new URL(value, "https://app.local");
    if (url.origin !== "https://app.local") return "/";
    if (url.pathname === "/sign-in" || url.pathname === "/auth/callback") {
      return "/";
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
