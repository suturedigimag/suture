export const prerender = false;

import type { APIRoute } from 'astro';
import { getVerifiedMember, getMemberTokensFromCookie } from '../../../lib/wix-auth';
import { queryAdminComments, deleteComment } from '../../../lib/wix-comments';

export const GET: APIRoute = async ({ url, cookies }) => {
  const member = await getVerifiedMember(cookies);

  if (!member || !member.isAdmin) {
    return new Response(
      JSON.stringify({ error: 'Access denied: Administrator privileges required.' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const articleId = url.searchParams.get('article') || undefined;
  const authorMemberId = url.searchParams.get('author') || undefined;
  const limitParam = url.searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : 50;

  try {
    const comments = await queryAdminComments({ articleId, authorMemberId, limit });
    return new Response(JSON.stringify({ comments }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[Admin Comments API] Error querying comments:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to retrieve comments for moderation.' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  const member = await getVerifiedMember(cookies);
  const tokens = getMemberTokensFromCookie(cookies);

  if (!member || !member.isAdmin || !tokens) {
    return new Response(
      JSON.stringify({ error: 'Access denied: Administrator privileges required.' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON request body.' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const { commentId } = body || {};

  if (!commentId) {
    return new Response(
      JSON.stringify({ error: 'Comment ID is required.' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const result = await deleteComment(tokens, member, String(commentId).trim());
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[Admin Comments API] Error deleting comment:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Failed to delete comment.' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
