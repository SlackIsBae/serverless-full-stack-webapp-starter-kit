import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { ORIGIN_VERIFY_HEADER, proxy } from './proxy';

const CLIENT_ID = 'testclient123';
const PROTECTED_URL = 'https://app.example.com/dashboard';

function requestWithCookie(cookie?: string) {
  return new NextRequest(new URL(PROTECTED_URL), cookie ? { headers: { cookie } } : undefined);
}

describe('proxy (optimistic auth check)', () => {
  const original = process.env.USER_POOL_CLIENT_ID;

  beforeEach(() => {
    process.env.USER_POOL_CLIENT_ID = CLIENT_ID;
  });

  afterEach(() => {
    process.env.USER_POOL_CLIENT_ID = original;
  });

  it('passes through when the Cognito LastAuthUser cookie is present', () => {
    const req = requestWithCookie(`CognitoIdentityServiceProvider.${CLIENT_ID}.LastAuthUser=user-abc`);
    const res = proxy(req);

    // A pass-through (NextResponse.next()) is observable as a non-redirect
    // response: status 200 with no Location header. Assert the behavior rather
    // than Next's internal x-middleware-next header.
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it('redirects to /sign-in when the cookie is absent', () => {
    const res = proxy(requestWithCookie());

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://app.example.com/sign-in');
  });

  it('sets Content-Type and Cache-Control on the redirect (Lambda streaming / iOS Safari)', () => {
    const res = proxy(requestWithCookie());

    expect(res.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('does not treat an empty cookie value as authenticated', () => {
    const res = proxy(requestWithCookie(`CognitoIdentityServiceProvider.${CLIENT_ID}.LastAuthUser=`));

    expect(res.status).toBe(307);
  });

  it('ignores a LastAuthUser cookie for a different client id', () => {
    const res = proxy(requestWithCookie('CognitoIdentityServiceProvider.other-client.LastAuthUser=user-abc'));

    expect(res.status).toBe(307);
  });

  it('does not block when USER_POOL_CLIENT_ID is unset (DAL performs the real check)', () => {
    delete process.env.USER_POOL_CLIENT_ID;
    const res = proxy(requestWithCookie());

    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });
});

function request(path: string, headers: Record<string, string> = {}) {
  return new NextRequest(new URL(`https://app.example.com${path}`), { headers });
}

describe('proxy (CloudFront origin check)', () => {
  const SECRET = 'stack-uuid-secret';
  const originalSecret = process.env.ORIGIN_VERIFY_SECRET;
  const originalClient = process.env.USER_POOL_CLIENT_ID;

  beforeEach(() => {
    process.env.ORIGIN_VERIFY_SECRET = SECRET;
    process.env.USER_POOL_CLIENT_ID = CLIENT_ID;
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.ORIGIN_VERIFY_SECRET;
    else process.env.ORIGIN_VERIFY_SECRET = originalSecret;
    process.env.USER_POOL_CLIENT_ID = originalClient;
  });

  it('returns 403 when the origin header is missing', () => {
    expect(proxy(request('/dashboard')).status).toBe(403);
  });

  it('returns 403 when the origin header is wrong', () => {
    expect(proxy(request('/dashboard', { [ORIGIN_VERIFY_HEADER]: 'wrong' })).status).toBe(403);
  });

  it('applies the origin check to API routes and /sign-in too', () => {
    expect(proxy(request('/api/health')).status).toBe(403);
    expect(proxy(request('/sign-in')).status).toBe(403);
  });

  it('lets API routes and /sign-in through without auth when the header is valid', () => {
    const headers = { [ORIGIN_VERIFY_HEADER]: SECRET };
    expect(proxy(request('/api/health', headers)).status).toBe(200);
    expect(proxy(request('/sign-in', headers)).status).toBe(200);
  });

  it('still redirects unauthenticated page requests to /sign-in when the header is valid', () => {
    const res = proxy(request('/dashboard', { [ORIGIN_VERIFY_HEADER]: SECRET }));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://app.example.com/sign-in');
  });

  it('skips the origin check when ORIGIN_VERIFY_SECRET is unset (local development)', () => {
    delete process.env.ORIGIN_VERIFY_SECRET;
    expect(proxy(request('/sign-in')).status).toBe(200);
  });
});
