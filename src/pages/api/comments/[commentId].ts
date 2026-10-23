export const prerender = false;

import type { APIRoute } from 'astro';
import { getVerifiedMember, getMemberTokensFromCookie } from '../../../lib/wix-auth';
import { deleteComment } from '../../../lib/wix-comments';

export const DELETE: APIRoute = async ({ params, cookies }) => {
  const commentId = params.commentId;

  if (!commentId || commentId.trim() === '') {
    return new Response(
      JSON.stringify({ error: 'Valid comment ID is required.' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const member = await getVerifiedMember(cookies);
  const tokens = getMemberTokensFromCookie(cookies);

  if (!member || !tokens) {
    return new Response(
      JSON.stringify({ error: 'Authentication required. Please sign in to delete a comment.' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const result = await deleteComment(tokens, member, commentId.trim());

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error(`[API DELETE /api/comments/${commentId}] Error:`, err);

    if (err.message?.includes('Forbidden')) {
      return new Response(
        JSON.stringify({ error: err.message }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (err.message?.includes('not found')) {
      return new Response(
        JSON.stringify({ error: 'Comment not found or already deleted.' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Failed to delete comment. Please try again later.' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
