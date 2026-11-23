import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * CloudFront adds this header (value = ORIGIN_VERIFY_SECRET) to every origin request.
 * The Lambda Function URL is public, so this check rejects requests that bypass CloudFront.
 * Must match ORIGIN_VERIFY_HEADER in apps/cdk/lib/constructs/cf-lambda-furl-service/service.ts.
 */
export const ORIGIN_VERIFY_HEADER = 'x-origin-verify';

/** Paths that skip the optimistic auth check (API routes and the sign-in page itself). */
const PUBLIC_PATH_PREFIXES = ['/api', '/sign-in'];

/**
 * 1. Origin check: when ORIGIN_VERIFY_SECRET is set (deployed), reject requests without the
 *    CloudFront secret header. Unset in local development, so the check is skipped there.
 * 2. Optimistic auth check: verifies only the presence of the Cognito cookie.
 *
 * Why not fetchAuthSession here:
 * - On a Lambda cold start, the JWKS fetch inside fetchAuthSession can block
 *   long enough to time out and return 401 even for a valid session.
 * - Next.js official guidance: the proxy should perform optimistic checks only;
 *   the secure check belongs in the Data Access Layer (Server Components / API routes).
 * - This app performs the secure check via getAuthSession() / getSessionWithUser().
 * @see https://nextjs.org/docs/app/guides/authentication#optimistic-checks-with-proxy-optional
 */
export function proxy(request: NextRequest) {
  const originSecret = process.env.ORIGIN_VERIFY_SECRET;
  if (originSecret && request.headers.get(ORIGIN_VERIFY_HEADER) !== originSecret) {
    return new NextResponse('Forbidden', { status: 403, headers: { 'Content-Type': 'text/plain' } });
  }

  if (PUBLIC_PATH_PREFIXES.some((prefix) => request.nextUrl.pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const clientId = process.env.USER_POOL_CLIENT_ID;
  if (!clientId) {
    // Misconfiguration, not a bypass: without the client id we cannot name the
    // cookie. Let the request through so the Data Access Layer surfaces the real
    // error (getAuthSession / getSessionWithUser throw) instead of silently
    // redirecting every request to /sign-in.
    return NextResponse.next();
  }

  // Amplify stores the signed-in username under this cookie, readable server-side.
  // The `CognitoIdentityServiceProvider` prefix is Amplify's AUTH_KEY_PREFIX
  // constant, which is not part of the public API, so it is inlined here rather
  // than imported. Verified against @aws-amplify/adapter-nextjs (createTokenCookies).
  const lastAuthUser = request.cookies.get(`CognitoIdentityServiceProvider.${clientId}.LastAuthUser`);
  if (lastAuthUser?.value) {
    return NextResponse.next();
  }

  // Lambda Function URL RESPONSE_STREAM mode adds application/octet-stream when
  // Next.js returns a 307 without a Content-Type, which triggers a download
  // prompt on iOS Safari. Set text/html explicitly, and prevent CloudFront or
  // intermediary proxies from caching this auth-dependent redirect.
  const response = NextResponse.redirect(new URL('/sign-in', request.url));
  response.headers.set('Content-Type', 'text/html; charset=utf-8');
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * API routes and /sign-in are matched so the origin check covers them; they skip the
     * auth check inside proxy() (PUBLIC_PATH_PREFIXES).
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
