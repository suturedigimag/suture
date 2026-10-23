export const prerender = false;

import type { APIRoute } from 'astro';
import { createGoogleAuthUrl, storeOAuthStateInCookie } from '../../../lib/wix-auth';

export const GET: APIRoute = async ({ cookies, redirect, url }) => {
  try {
    const returnUrl = url.searchParams.get('redirect') || '/suture';

    // Construct the full callback URL based on current request host
    const origin = url.origin;
    const redirectUri = `${origin}/api/auth/callback`;

    const { oAuthData, authUrl } = await createGoogleAuthUrl(redirectUri, returnUrl);

    // Save temporary PKCE and state parameters in cookie
    storeOAuthStateInCookie(cookies, oAuthData);

    return redirect(authUrl, 302);
  } catch (err: any) {
    console.error('[Auth Login] Failed to initiate Google OAuth:', err);
    return new Response(
      JSON.stringify({
        error: 'Failed to initiate Google sign in. Please verify Wix Dev Center configuration.',
        details: err?.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
