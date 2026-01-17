import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Add Content Security Policy (CSP) headers for XSS protection
  res.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://connect.facebook.net https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://*.supabase.co http://127.0.0.1:* https://api.stripe.com https://stream.mux.com https://*.mux.com https://www.facebook.com",
      "frame-src 'self' https://js.stripe.com https://stream.mux.com",
      "media-src 'self' https://stream.mux.com blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests"
    ].join("; ")
  );

  // Add other security headers
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-XSS-Protection", "1; mode=block");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => req.cookies.get(name)?.value,
        set: (name: string, value: string, options: Record<string, unknown>) => {
          res.cookies.set({ name, value, ...options });
        },
        remove: (name: string, options: Record<string, unknown>) => {
          res.cookies.set({ name, value: "", ...options });
        }
      }
    }
  );

  const { data } = await supabase.auth.getUser();
  const user = data.user;

  const pathname = req.nextUrl.pathname;

  if (pathname.startsWith("/app")) {
    if (!user) return NextResponse.redirect(new URL("/login", req.url));
  }

  if (pathname.startsWith("/admin")) {
    if (!user) return NextResponse.redirect(new URL("/login", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/app/:path*", "/admin/:path*"]
};
