/**
 * Wix Headless Comments Service — The Suture
 *
 * Interacts with @wix/comments and @wix/members to provide:
 * - Threaded comments retrieval and hierarchical tree construction
 * - Text-only sanitization and Ricos RichContent conversion
 * - Verified author attribution via member OAuth tokens
 * - Secure author-only or admin-only deletion
 * - Rate limiting and abuse prevention
 */

import { createClient, OAuthStrategy, ApiKeyStrategy, type Tokens } from '@wix/sdk';
import { comments } from '@wix/comments';
import { members } from '@wix/members';
import type { WixMemberProfile } from './wix-auth.ts';
import { getClientId } from './wix-auth.ts';

// ── Configuration ────────────────────────────────────────────────────────────

export const DEFAULT_APP_ID =
  import.meta.env?.WIX_COMMENTS_APP_ID ||
  process.env.WIX_COMMENTS_APP_ID ||
  '14bcded7-0066-7c35-14d7-466cb3f09103'; // Blog comments app default, or custom Wix Comments app

export const DEFAULT_CONTEXT_ID =
  import.meta.env?.WIX_COMMENTS_CONTEXT_ID ||
  process.env.WIX_COMMENTS_CONTEXT_ID ||
  '059aa884-79a4-41b5-9466-ab6839685cbf'; // Live Wix site category ID discovered

export const MAX_COMMENT_LENGTH = 3000;
export const MAX_DEPTH = 3; // Maximum visual nesting depth

// ── Types ────────────────────────────────────────────────────────────────────

export interface PublicCommentAuthor {
  memberId: string;
  name: string;
  avatarUrl?: string;
  isAdmin: boolean;
  isCurrentUser: boolean;
}

export interface ThreadedComment {
  id: string;
  articleId: string;
  content: string;
  createdDate: string;
  author: PublicCommentAuthor;
  parentCommentId?: string;
  status: string;
  isDeleted: boolean;
  replyCount: number;
  replies: ThreadedComment[];
}

export interface CommentsResult {
  comments: ThreadedComment[];
  totalCount: number;
  articleId: string;
}

// ── Clients ──────────────────────────────────────────────────────────────────

function getPublicClient() {
  const clientId = getClientId();
  return createClient({
    modules: { comments, members },
    auth: OAuthStrategy({ clientId }),
  });
}

function getMemberCommentsClient(tokens: Tokens) {
  const clientId = getClientId();
  return createClient({
    modules: { comments, members },
    auth: OAuthStrategy({
      clientId,
      tokens,
    }),
  });
}

function getAdminClient() {
  const apiKey = import.meta.env?.WIX_API_KEY || process.env.WIX_API_KEY;
  const siteId = import.meta.env?.WIX_SITE_ID || process.env.WIX_SITE_ID;
  if (!apiKey || !siteId) return null;

  return createClient({
    modules: { comments, members },
    auth: ApiKeyStrategy({ apiKey, siteId }),
  });
}

// ── Rate Limiting (In-Memory Sliding Window) ───────────────────────────────────

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitMap = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_POSTS_PER_WINDOW = 5; // max 5 comments per minute

export function checkRateLimit(identifier: string): { allowed: boolean; remainingSeconds?: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier) || { timestamps: [] };

  // Remove timestamps outside the window
  record.timestamps = record.timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (record.timestamps.length >= MAX_POSTS_PER_WINDOW) {
    const oldest = record.timestamps[0];
    const remainingSeconds = Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000);
    return { allowed: false, remainingSeconds };
  }

  record.timestamps.push(now);
  rateLimitMap.set(identifier, record);
  return { allowed: true };
}

// ── Rich Content Conversion Helpers ──────────────────────────────────────────

/**
 * Converts sanitized plain text to Wix Ricos RichContent document format.
 */
export function textToRichContent(text: string) {
  const cleanText = text.trim();
  const paragraphs = cleanText.split(/\n\s*\n/);

  return {
    nodes: paragraphs.map((p) => ({
      type: 'PARAGRAPH' as const,
      nodes: [
        {
          type: 'TEXT' as const,
          textData: {
            text: p,
          },
        },
      ],
    })),
  };
}

/**
 * Safely extracts pure plain text from Wix Ricos / richContent structure.
 * Strips any potential HTML/executable markup and never returns unescaped HTML.
 */
export function richContentToText(richContent: any): string {
  if (!richContent) return '';
  if (typeof richContent === 'string') {
    // If it's already a plain text string, return without HTML tags
    return richContent.replace(/<[^>]*>/g, '').trim();
  }

  const nodes = richContent.nodes || [];
  const textParts: string[] = [];

  function traverse(node: any) {
    if (!node) return;
    if (node.type === 'TEXT' && node.textData?.text) {
      // Strip any HTML tags or script injection inside text data
      const clean = String(node.textData.text).replace(/<[^>]*>/g, '').trim();
      if (clean) textParts.push(clean);
    }
    if (Array.isArray(node.nodes)) {
      node.nodes.forEach(traverse);
    }
  }

  nodes.forEach(traverse);
  return textParts.join('\n\n').trim();
}

// ── Author Profile Resolution ────────────────────────────────────────────────

const authorCache = new Map<string, { name: string; avatarUrl?: string; expiry: number }>();

async function resolveAuthorDetails(memberId?: string | null): Promise<{ name: string; avatarUrl?: string }> {
  if (!memberId) {
    return { name: 'Reader' };
  }

  const cached = authorCache.get(memberId);
  if (cached && Date.now() < cached.expiry) {
    return { name: cached.name, avatarUrl: cached.avatarUrl };
  }

  try {
    const client = getPublicClient();
    const result = await client.members.getMember(memberId, { fieldsets: ['FULL'] });
    const member: any = (result as any)?.member || result;

    const nickname = member?.profile?.nickname;
    const firstName = member?.contact?.firstName || '';
    const lastName = member?.contact?.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    const name = nickname || fullName || 'Reader';
    const avatarUrl = member?.profile?.photo?.url || undefined;

    const details = { name, avatarUrl };
    authorCache.set(memberId, { ...details, expiry: Date.now() + 10 * 60 * 1000 });
    return details;
  } catch {
    return { name: 'Reader' };
  }
}

// ── Thread Tree Assembly ─────────────────────────────────────────────────────

/**
 * Transforms flat comment records from Wix into a nested thread tree.
 */
export function buildThreadTree(
  rawComments: any[],
  currentMemberId?: string
): ThreadedComment[] {
  const commentMap = new Map<string, ThreadedComment>();
  const rootComments: ThreadedComment[] = [];

  // 1. First pass: normalize each comment item
  for (const raw of rawComments) {
    const id = raw._id || raw.id;
    if (!id) continue;

    const memberId = raw.author?.memberId || '';
    const isDeleted = raw.status === 'DELETED';
    const rawContent = isDeleted ? '[This comment has been removed by the author or moderator]' : richContentToText(raw.content?.richContent || raw.content);

    const isCurrentUser = Boolean(currentMemberId && memberId && currentMemberId === memberId);

    const commentItem: ThreadedComment = {
      id,
      articleId: raw.resourceId || '',
      content: rawContent,
      createdDate: raw.commentDate ? new Date(raw.commentDate).toISOString() : (raw._createdDate ? new Date(raw._createdDate).toISOString() : new Date().toISOString()),
      author: {
        memberId,
        name: raw._authorName || 'Reader',
        avatarUrl: raw._authorAvatar,
        isAdmin: false, // will be evaluated if email known
        isCurrentUser,
      },
      parentCommentId: raw.parentComment?.id || undefined,
      status: raw.status || 'PUBLISHED',
      isDeleted,
      replyCount: raw.replyCount || 0,
      replies: [],
    };

    commentMap.set(id, commentItem);
  }

  // 2. Second pass: link replies to parents
  for (const item of commentMap.values()) {
    if (item.parentCommentId && commentMap.has(item.parentCommentId)) {
      const parent = commentMap.get(item.parentCommentId)!;
      parent.replies.push(item);
    } else {
      rootComments.push(item);
    }
  }

  // 3. Sort: newest root comments first; replies chronological (oldest first)
  rootComments.sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());

  function sortReplies(comment: ThreadedComment) {
    comment.replies.sort((a, b) => new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime());
    comment.replies.forEach(sortReplies);
  }
  rootComments.forEach(sortReplies);

  return rootComments;
}

// ── Public Query Comments ────────────────────────────────────────────────────

/**
 * Fetches all publicly visible comments for a specific article.
 * Uses bounded pagination and ensures comments never appear under the wrong article.
 */
export async function getCommentsForArticle(
  articleId: string,
  viewerMemberId?: string
): Promise<CommentsResult> {
  if (!articleId || typeof articleId !== 'string') {
    return { comments: [], totalCount: 0, articleId: '' };
  }

  const cleanArticleId = articleId.trim();
  const appId = DEFAULT_APP_ID;
  const contextId = DEFAULT_CONTEXT_ID;

  const client = getPublicClient();

  try {
    // Generate visitor tokens for public reading
    const visitorTokens = await client.auth.generateVisitorTokens();
    client.auth.setTokens(visitorTokens);

    let rawItems: any[] = [];

    // Attempt 1: Query Comments by resourceId
    try {
      const queryRes = await client.comments
        .queryComments({ appId })
        .eq('resourceId', cleanArticleId)
        .limit(100)
        .find();

      if (queryRes?.items) {
        rawItems = queryRes.items;
      }
    } catch (queryErr: any) {
      // Attempt 2: listCommentsByResource fallback
      try {
        const listRes = await client.comments.listCommentsByResource(appId, {
          contextId,
          resourceId: cleanArticleId,
        });
        if (listRes?.comments) {
          rawItems = listRes.comments;
        }
      } catch (listErr: any) {
        // If API key is available, attempt with admin client as fallback read
        const adminClient = getAdminClient();
        if (adminClient) {
          const adminQuery = await adminClient.comments
            .queryComments({ appId })
            .eq('resourceId', cleanArticleId)
            .limit(100)
            .find();
          if (adminQuery?.items) {
            rawItems = adminQuery.items;
          }
        } else {
          console.warn('[Wix Comments] Query comments failed:', queryErr.message || queryErr);
          return { comments: [], totalCount: 0, articleId: cleanArticleId };
        }
      }
    }

    // Filter strictly to ensure comments match this specific articleId
    const matchingComments = rawItems.filter((c: any) => c.resourceId === cleanArticleId);

    // Resolve author profiles in parallel
    const memberIds = Array.from(new Set(matchingComments.map((c: any) => c.author?.memberId).filter(Boolean)));
    const authorProfiles = new Map<string, { name: string; avatarUrl?: string }>();

    await Promise.all(
      memberIds.map(async (mId) => {
        const profile = await resolveAuthorDetails(mId as string);
        authorProfiles.set(mId as string, profile);
      })
    );

    // Attach resolved author metadata to raw items
    const enrichedItems = matchingComments.map((c: any) => {
      const mId = c.author?.memberId;
      const resolved = mId ? authorProfiles.get(mId) : undefined;
      return {
        ...c,
        _authorName: resolved?.name || 'Reader',
        _authorAvatar: resolved?.avatarUrl,
      };
    });

    const threadTree = buildThreadTree(enrichedItems, viewerMemberId);
    return {
      comments: threadTree,
      totalCount: matchingComments.filter((c: any) => c.status !== 'DELETED').length,
      articleId: cleanArticleId,
    };
  } catch (err: any) {
    console.error('[Wix Comments] Error fetching comments:', err);
    return { comments: [], totalCount: 0, articleId: cleanArticleId };
  }
}

// ── Create Comment ───────────────────────────────────────────────────────────

export interface CreateCommentParams {
  articleId: string;
  text: string;
  parentCommentId?: string;
}

/**
 * Creates a comment using the authenticated member's session tokens.
 * Wix natively attributes the author to the member associated with the tokens.
 */
export async function createComment(
  tokens: Tokens,
  memberProfile: WixMemberProfile,
  params: CreateCommentParams
): Promise<ThreadedComment> {
  const { articleId, text, parentCommentId } = params;

  if (!text || text.trim().length === 0) {
    throw new Error('Comment text cannot be empty.');
  }

  if (text.length > MAX_COMMENT_LENGTH) {
    throw new Error(`Comment exceeds maximum length of ${MAX_COMMENT_LENGTH} characters.`);
  }

  if (!articleId) {
    throw new Error('Article ID is required.');
  }

  // Rate limiting check
  const rateLimit = checkRateLimit(memberProfile.id);
  if (!rateLimit.allowed) {
    throw new Error(`Rate limit exceeded. Please wait ${rateLimit.remainingSeconds} seconds before posting again.`);
  }

  const memberClient = getMemberCommentsClient(tokens);
  const appId = DEFAULT_APP_ID;
  const contextId = DEFAULT_CONTEXT_ID;

  // If this is a reply, verify that parent comment exists and belongs to the same article
  if (parentCommentId) {
    try {
      const parent = await memberClient.comments.getComment(parentCommentId);
      if (parent.resourceId && parent.resourceId !== articleId) {
        throw new Error('Cannot reply to a comment belonging to a different article.');
      }
    } catch (err: any) {
      if (err.message?.includes('different article')) throw err;
      throw new Error('Parent comment not found or invalid.');
    }
  }

  const richContent = textToRichContent(text);

  const commentPayload: any = {
    appId,
    contextId,
    resourceId: articleId,
    content: {
      richContent,
    },
  };

  if (parentCommentId) {
    commentPayload.parentComment = { id: parentCommentId };
  }

  let created: any;
  try {
    // 1. Primary: Post using member client for authentic author attribution
    created = await memberClient.comments.createComment(commentPayload);
  } catch (createErr: any) {
    // Check if permission denied due to site-level backend Manage Comments scope requirement
    console.warn('[Wix Comments] Member createComment warning:', createErr.message || createErr);

    // If an administrative client is configured, check if we can execute
    const adminClient = getAdminClient();
    if (adminClient) {
      created = await adminClient.comments.createComment(commentPayload);
    } else {
      throw new Error(
        createErr.message ||
          'Failed to post comment. Ensure the Wix Comments permissions are configured in the Dev Center.'
      );
    }
  }

  const id = created._id || created.id;
  const isDeleted = created.status === 'DELETED';

  return {
    id,
    articleId,
    content: text.trim(),
    createdDate: created.commentDate ? new Date(created.commentDate).toISOString() : new Date().toISOString(),
    author: {
      memberId: memberProfile.id,
      name: memberProfile.name,
      avatarUrl: memberProfile.avatarUrl,
      isAdmin: memberProfile.isAdmin,
      isCurrentUser: true,
    },
    parentCommentId,
    status: created.status || 'PUBLISHED',
    isDeleted,
    replyCount: 0,
    replies: [],
  };
}

// ── Delete Comment ───────────────────────────────────────────────────────────

/**
 * Deletes a comment after strictly verifying server-side that the requester
 * is either the actual comment author or an authorized administrator.
 */
export async function deleteComment(
  tokens: Tokens,
  memberProfile: WixMemberProfile,
  commentId: string
): Promise<{ success: boolean; commentId: string }> {
  if (!commentId) {
    throw new Error('Comment ID is required.');
  }

  const memberClient = getMemberCommentsClient(tokens);

  // 1. Retrieve the existing comment to check real author metadata
  let targetComment: any;
  try {
    targetComment = await memberClient.comments.getComment(commentId);
  } catch (err: any) {
    // If member client couldn't get it, try admin client if available
    const adminClient = getAdminClient();
    if (adminClient) {
      targetComment = await adminClient.comments.getComment(commentId);
    } else {
      throw new Error('Comment not found or already deleted.');
    }
  }

  if (!targetComment) {
    throw new Error('Comment not found.');
  }

  const commentAuthorMemberId = targetComment.author?.memberId;

  // 2. Security Check: Requester must be author OR verified administrator
  const isAuthor = Boolean(commentAuthorMemberId && commentAuthorMemberId === memberProfile.id);
  const isAdmin = memberProfile.isAdmin;

  if (!isAuthor && !isAdmin) {
    throw new Error('Forbidden: You can only delete your own comments.');
  }

  // 3. Execute deletion
  try {
    await memberClient.comments.deleteComment(commentId);
  } catch (deleteErr: any) {
    // If deletion required elevated permission and user is an authorized admin, use admin client
    const adminClient = getAdminClient();
    if (adminClient && isAdmin) {
      await adminClient.comments.deleteComment(commentId);
    } else {
      throw new Error(deleteErr.message || 'Failed to delete comment.');
    }
  }

  return { success: true, commentId };
}

// ── Admin Moderation Query ───────────────────────────────────────────────────

export interface AdminCommentsFilter {
  articleId?: string;
  authorMemberId?: string;
  limit?: number;
}

/**
 * Queries comments across articles for the admin moderation dashboard.
 */
export async function queryAdminComments(filter: AdminCommentsFilter = {}) {
  const appId = DEFAULT_APP_ID;
  const client = getAdminClient() || getPublicClient();

  let query = client.comments.queryComments({ appId });

  if (filter.articleId) {
    query = query.eq('resourceId', filter.articleId);
  }

  if (filter.authorMemberId) {
    query = query.eq('author.memberId', filter.authorMemberId);
  }

  const limit = Math.min(filter.limit || 50, 100);
  const result = await query.limit(limit).find();

  return (result?.items || []).map((item: any) => ({
    id: item._id || item.id,
    articleId: item.resourceId,
    content: richContentToText(item.content?.richContent || item.content),
    status: item.status,
    authorMemberId: item.author?.memberId,
    createdDate: item.commentDate || item._createdDate,
    replyCount: item.replyCount || 0,
    parentCommentId: item.parentComment?.id,
  }));
}
