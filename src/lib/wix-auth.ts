/**
 * Wix Member Authentication & Session Helpers — The Suture
 *
 * Implements Wix Headless OAuth for member authentication with Google sign-in.
 * Tokens are stored in secure httpOnly cookies.
 */

import { createClient, OAuthStrategy, type Tokens } from '@wix/sdk';
import { members } from '@wix/members';
import type { AstroCookies } from 'astro';

const OAUTH_COOKIE_NAME = 'wix_oauth_data';
const SESSION_COOKIE_NAME = 'wix_member_tokens';

export interface WixMemberProfile {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  isAdmin: boolean;
}

export interface StoredOAuthData {
  redirectUri: string;
  originalUri: string;
  codeChallenge: string;
  codeVerifier: string;
  state: string;
}

export function getClientId(): string {
  const id = import.meta.env?.WIX_CLIENT_ID || process.env.WIX_CLIENT_ID;
  if (!id) {
    console.warn('[Wix Auth] WIX_CLIENT_ID is not set in environment.');
  }
  return id || '';
}

export function getAdminEmails(): string[] {
  const raw = import.meta.env?.ADMIN_EMAILS || process.env.ADMIN_EMAILS || '';
  return raw
    .split(',')
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Creates a public Wix Client (for anonymous actions or OAuth initiation).
 */
export function getPublicWixClient() {
  const clientId = getClientId();
  return createClient({
    modules: { members },
    auth: OAuthStrategy({ clientId }),
  });
}

/**
 * Creates an authenticated Wix Client for a specific logged-in member.
 */
export function getMemberWixClient(tokens: Tokens) {
  const clientId = getClientId();
  return createClient({
    modules: { members },
    auth: OAuthStrategy({
      clientId,
      tokens,
    }),
  });
}

/**
 * Initiates Google sign-in. Returns the OAuth data to save and the Google authUrl.
 */
export async function createGoogleAuthUrl(redirectUri: string, originalUri: string) {
  const client = getPublicWixClient();
  const oAuthData = client.auth.generateOAuthData(redirectUri, originalUri) as StoredOAuthData;
  const { authUrl } = await client.auth.getAuthUrl(oAuthData, { idp: 'google' });

  // When a custom domain is connected to a headless frontend on Vercel,
  // Wix SDK returns the site's primary domain (e.g. https://www.psglitclub.com/_api/oauth2/authorize).
  // Visiting that domain hits Vercel instead of Wix, returning a 404 Not Found.
  // Directing the browser to Wix's official OAuth authorization host (auth.wix.com) ensures
  // the request is handled by Wix's identity provider.
  let targetAuthUrl = authUrl;
  try {
    const parsed = new URL(authUrl);
    parsed.protocol = 'https:';
    parsed.host = 'auth.wix.com';
    targetAuthUrl = parsed.toString();
  } catch {
    // Keep original if parsing fails
  }

  return { oAuthData, authUrl: targetAuthUrl };
}

/**
 * Saves temporary OAuth verification state in a short-lived secure cookie.
 */
export function storeOAuthStateInCookie(cookies: AstroCookies, oAuthData: StoredOAuthData) {
  cookies.set(OAUTH_COOKIE_NAME, JSON.stringify(oAuthData), {
    path: '/',
    httpOnly: true,
    secure: Boolean(import.meta.env?.PROD || process.env.NODE_ENV === 'production'),
    sameSite: 'lax',
    maxAge: 60 * 15, // 15 minutes
  });
}

/**
 * Retrieves the stored OAuth state from cookies.
 */
export function getOAuthStateFromCookie(cookies: AstroCookies): StoredOAuthData | null {
  const raw = cookies.get(OAUTH_COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredOAuthData;
  } catch {
    return null;
  }
}

/**
 * Clears the temporary OAuth state cookie.
 */
export function clearOAuthStateCookie(cookies: AstroCookies) {
  cookies.delete(OAUTH_COOKIE_NAME, { path: '/' });
}

/**
 * Exchanges the callback authorization code for member tokens.
 */
export async function exchangeCodeForTokens(
  code: string,
  state: string,
  storedOAuthData: StoredOAuthData
): Promise<Tokens> {
  const client = getPublicWixClient();
  const tokens = await client.auth.getMemberTokens(code, state, storedOAuthData);
  return tokens;
}

/**
 * Stores authenticated member tokens in an httpOnly cookie.
 */
export function storeMemberTokensInCookie(cookies: AstroCookies, tokens: Tokens) {
  cookies.set(SESSION_COOKIE_NAME, JSON.stringify(tokens), {
    path: '/',
    httpOnly: true,
    secure: Boolean(import.meta.env?.PROD || process.env.NODE_ENV === 'production'),
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days session
  });
}

/**
 * Retrieves member tokens from cookies.
 */
export function getMemberTokensFromCookie(cookies: AstroCookies): Tokens | null {
  const raw = cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Tokens;
  } catch {
    return null;
  }
}

/**
 * Clears the member tokens cookie (logout).
 */
export function clearMemberTokensCookie(cookies: AstroCookies) {
  cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
}

// In-memory member profile cache (keyed by access token, 60s TTL)
const memberCache = new Map<string, { profile: WixMemberProfile; expiry: number }>();

/**
 * Verifies the member session on the server and retrieves the Wix Member profile.
 * Never trusts client-supplied user data.
 */
export async function getVerifiedMember(cookies: AstroCookies): Promise<WixMemberProfile | null> {
  const tokens = getMemberTokensFromCookie(cookies);
  if (!tokens || !tokens.accessToken?.value) {
    return null;
  }

  const tokenKey = tokens.accessToken.value;
  const cached = memberCache.get(tokenKey);
  if (cached && Date.now() < cached.expiry) {
    return cached.profile;
  }

  try {
    const memberClient = getMemberWixClient(tokens);
    const result = await memberClient.members.getCurrentMember({
      fieldsets: ['FULL'],
    });

    const member = result?.member;
    if (!member || !member._id) {
      return null;
    }

    const email = member.loginEmail || member.contact?.emails?.[0];
    const adminEmails = getAdminEmails();
    const isAdmin = Boolean(email && adminEmails.includes(email.toLowerCase()));

    // Author name resolution: nickname -> fullName -> firstName lastName -> "Community Member"
    const nickname = member.profile?.nickname;
    const firstName = member.contact?.firstName || '';
    const lastName = member.contact?.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    const name = nickname || fullName || 'Reader';

    const avatarUrl = member.profile?.photo?.url || undefined;

    const profile: WixMemberProfile = {
      id: member._id,
      name,
      email,
      avatarUrl,
      isAdmin,
    };

    memberCache.set(tokenKey, { profile, expiry: Date.now() + 60_000 });
    return profile;
  } catch (err: any) {
    // If token expired, clear invalid cookie
    if (err?.message?.includes('EXPIRED') || err?.status === 401) {
      clearMemberTokensCookie(cookies);
    }
    return null;
  }
}
