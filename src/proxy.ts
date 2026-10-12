import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEstablecimientoForUser } from "@/lib/estab/hasEstablecimiento";

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((c) => {
    to.cookies.set(c.name, c.value);
  });
  return to;
}

function redirectWithCookies(
  request: NextRequest,
  pathname: string,
  supabaseResponse: NextResponse
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return copyCookies(supabaseResponse, NextResponse.redirect(url));
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isAuthEntry =
    pathname === "/login" || pathname === "/register";
  const isCallback =
    pathname === "/auth/callback" || pathname.startsWith("/auth/");
  const isPublicApi = pathname === "/api/ping-db";
  const isApiPath = pathname.startsWith("/api/");

  if (!user && !isAuthEntry && !isCallback && !isPublicApi) {
    return redirectWithCookies(request, "/login", supabaseResponse);
  }

  if (user && isAuthEntry) {
    return redirectWithCookies(request, "/", supabaseResponse);
  }

  if (isCallback) {
    return supabaseResponse;
  }

  if (user && !isApiPath) {
    const hasEstab = await hasEstablecimientoForUser(supabase, user.id);

    if (pathname === "/setup" && hasEstab) {
      return redirectWithCookies(request, "/", supabaseResponse);
    }

    if (pathname !== "/setup" && !hasEstab) {
      return redirectWithCookies(request, "/setup", supabaseResponse);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
