export const prerender = false;

import type { APIRoute } from 'astro';

/**
 * Fallback proxy/redirect for Wix Headless OAuth requests.
 *
 * If Wix or a browser hits /_api/oauth2/authorize on this Astro/Vercel domain,
 * this route forwards the query parameters directly to Wix's official OAuth server (auth.wix.com)
 * instead of returning a 404 Not Found.
 */
export const GET: APIRoute = async ({ url, redirect }) => {
  const targetUrl = new URL(url.pathname + url.search, 'https://auth.wix.com');
  return redirect(targetUrl.toString(), 302);
};
