export const prerender = false;

import type { APIRoute } from 'astro';
import { clearMemberTokensCookie } from '../../../lib/wix-auth';

export const POST: APIRoute = async ({ cookies, redirect, url, request }) => {
  clearMemberTokensCookie(cookies);

  // If redirect query or header is present
  const returnUrl = url.searchParams.get('redirect') || request.headers.get('referer') || '/suture';

  if (request.headers.get('accept')?.includes('application/json')) {
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return redirect(returnUrl, 302);
};

export const GET: APIRoute = async ({ cookies, redirect, url, request }) => {
  clearMemberTokensCookie(cookies);
  const returnUrl = url.searchParams.get('redirect') || request.headers.get('referer') || '/suture';
  return redirect(returnUrl, 302);
};
