export const prerender = false;

import type { APIRoute } from 'astro';
import { getVerifiedMember } from '../../../lib/wix-auth';

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const member = await getVerifiedMember(cookies);

    if (!member) {
      return new Response(JSON.stringify({ authenticated: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        authenticated: true,
        member: {
          id: member.id,
          name: member.name,
          avatarUrl: member.avatarUrl,
          isAdmin: member.isAdmin,
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ authenticated: false, error: err?.message }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
