export const prerender = false;

import type { APIRoute } from 'astro';
import {
  getOAuthStateFromCookie,
  clearOAuthStateCookie,
  exchangeCodeForTokens,
  storeMemberTokensInCookie,
} from '../../../lib/wix-auth';

export const GET: APIRoute = async ({ cookies, redirect, url }) => {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  const storedOAuthData = getOAuthStateFromCookie(cookies);
  const fallbackRedirect = storedOAuthData?.originalUri || '/suture';

  if (error) {
    console.warn('[Auth Callback] OAuth error returned from provider:', error, errorDescription);
    clearOAuthStateCookie(cookies);
    const redirectUrl = new URL(fallbackRedirect, url.origin);
    redirectUrl.searchParams.set('auth_error', encodeURIComponent(errorDescription || error));
    return redirect(redirectUrl.toString(), 302);
  }

  if (!code || !state) {
    clearOAuthStateCookie(cookies);
    return redirect(fallbackRedirect, 302);
  }

  if (!storedOAuthData) {
    console.warn('[Auth Callback] Missing stored OAuth state cookie. Possible session expiry.');
    const redirectUrl = new URL(fallbackRedirect, url.origin);
    redirectUrl.searchParams.set('auth_error', 'session_expired');
    return redirect(redirectUrl.toString(), 302);
  }

  try {
    const tokens = await exchangeCodeForTokens(code, state, storedOAuthData);

    if (tokens && tokens.accessToken?.value) {
      storeMemberTokensInCookie(cookies, tokens);
    }

    clearOAuthStateCookie(cookies);

    return redirect(fallbackRedirect, 302);
  } catch (err: any) {
    console.error('[Auth Callback] Failed to exchange code for tokens:', err);
    clearOAuthStateCookie(cookies);
    const redirectUrl = new URL(fallbackRedirect, url.origin);
    redirectUrl.searchParams.set('auth_error', 'token_exchange_failed');
    return redirect(redirectUrl.toString(), 302);
  }
};
