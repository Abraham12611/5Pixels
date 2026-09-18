import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const authRoutes = [
  "/login",
  "/signup",
  "/forgot-password",
  "/update-password",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { supabaseResponse, user, supabase } = await updateSession(request);

  if (user) {
    const isAuthRoute = authRoutes.some((route) => pathname === route);
    if (isAuthRoute) {
      const next = request.nextUrl.searchParams.get("next");
      const target =
        next && next.startsWith("/") && !next.startsWith("//")
          ? next
          : "/app";
      return NextResponse.redirect(new URL(target, request.url));
    }
  }

  if (pathname.startsWith("/admin")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin, is_owner")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin && !profile?.is_owner) {
      return NextResponse.redirect(new URL("/app", request.url));
    }
  }

  // Anonymous users may enter the Create studio — browsing, uploading, and
  // preparing a look are free; auth is deferred to the Generate action.
  const anonAllowed = pathname.startsWith("/app/create/");

  if (pathname.startsWith("/app") && !user && !anonAllowed) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "next",
      pathname + request.nextUrl.search
    );
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
