export const prerender = false;

import type { APIRoute } from 'astro';
import { getVerifiedMember, getMemberTokensFromCookie } from '../../../lib/wix-auth';
import { getCommentsForArticle, createComment, MAX_COMMENT_LENGTH } from '../../../lib/wix-comments';

/**
 * GET /api/comments?article=<articleId>
 * Public comments reading. Anyone can read without signing in.
 */
export const GET: APIRoute = async ({ url, cookies }) => {
  const articleId = url.searchParams.get('article');

  if (!articleId || articleId.trim() === '') {
    return new Response(
      JSON.stringify({ error: 'Missing required query parameter "article".' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const member = await getVerifiedMember(cookies);
    const result = await getCommentsForArticle(articleId, member?.id);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
      },
    });
  } catch (err: any) {
    console.error('[API GET /api/comments] Error:', err);
    return new Response(
      JSON.stringify({
        error: 'Unable to retrieve comments. Please try again later.',
        comments: [],
        totalCount: 0,
        articleId,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

/**
 * POST /api/comments
 * Requires verified member authentication.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const member = await getVerifiedMember(cookies);
  const tokens = getMemberTokensFromCookie(cookies);

  if (!member || !tokens) {
    return new Response(
      JSON.stringify({ error: 'Authentication required. Please sign in with Google to post a comment.' }),
      {
        status: 401,
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

  const { articleId, text, parentCommentId } = body || {};

  if (!articleId || typeof articleId !== 'string' || articleId.trim() === '') {
    return new Response(
      JSON.stringify({ error: 'Valid article ID is required.' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  if (!text || typeof text !== 'string' || text.trim() === '') {
    return new Response(
      JSON.stringify({ error: 'Comment text cannot be empty.' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  if (text.length > MAX_COMMENT_LENGTH) {
    return new Response(
      JSON.stringify({
        error: `Comment exceeds the maximum allowed length of ${MAX_COMMENT_LENGTH} characters.`,
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const created = await createComment(tokens, member, {
      articleId: articleId.trim(),
      text,
      parentCommentId: parentCommentId ? String(parentCommentId).trim() : undefined,
    });

    return new Response(
      JSON.stringify({ success: true, comment: created }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('[API POST /api/comments] Error:', err);

    const isClientError =
      err.message?.includes('Rate limit') ||
      err.message?.includes('different article') ||
      err.message?.includes('exceeds maximum');

    const status = isClientError ? 400 : 500;
    const errorMessage = isClientError
      ? err.message
      : 'Failed to submit comment. Please ensure Wix Comments permissions are configured.';

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
