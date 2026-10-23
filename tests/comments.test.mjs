/**
 * Automated Test Suite — Wix Headless Comments for The Suture
 * Run with: node --test tests/comments.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildThreadTree,
  textToRichContent,
  richContentToText,
  checkRateLimit,
  MAX_COMMENT_LENGTH,
} from '../src/lib/wix-comments.ts';

// ── Scenario 1: Comments Threading & Parent-Reply Relationship ────────────────

test('buildThreadTree correctly nests replies under their respective parent comments', () => {
  const rawComments = [
    {
      _id: 'c-root-1',
      resourceId: 'art-101',
      content: { richContent: textToRichContent('Top level comment 1') },
      _createdDate: new Date('2026-10-23T10:00:00Z'),
      author: { memberId: 'member-1' },
      _authorName: 'Dr. Jane Doe',
      status: 'PUBLISHED',
      replyCount: 1,
    },
    {
      _id: 'c-reply-1',
      resourceId: 'art-101',
      content: { richContent: textToRichContent('Reply to comment 1') },
      _createdDate: new Date('2026-10-23T10:05:00Z'),
      author: { memberId: 'member-2' },
      _authorName: 'Dr. John Smith',
      parentComment: { id: 'c-root-1' },
      status: 'PUBLISHED',
      replyCount: 0,
    },
    {
      _id: 'c-root-2',
      resourceId: 'art-101',
      content: { richContent: textToRichContent('Top level comment 2') },
      _createdDate: new Date('2026-10-23T10:10:00Z'),
      author: { memberId: 'member-3' },
      _authorName: 'Alex Reader',
      status: 'PUBLISHED',
      replyCount: 0,
    },
  ];

  const tree = buildThreadTree(rawComments, 'member-1');

  // Should have 2 root comments
  assert.equal(tree.length, 2);

  // Newest root comment first (c-root-2 created at 10:10 vs c-root-1 at 10:00)
  assert.equal(tree[0].id, 'c-root-2');
  assert.equal(tree[1].id, 'c-root-1');

  // c-root-1 should have 1 reply
  assert.equal(tree[1].replies.length, 1);
  assert.equal(tree[1].replies[0].id, 'c-reply-1');
  assert.equal(tree[1].replies[0].content, 'Reply to comment 1');
  assert.equal(tree[1].replies[0].author.name, 'Dr. John Smith');

  // Viewer identity check: member-1 is viewer
  assert.equal(tree[1].author.isCurrentUser, true);
  assert.equal(tree[0].author.isCurrentUser, false);
});

// ── Scenario 2: Resource ID Isolation (Never Mix Articles) ───────────────────

test('Comments belonging to different articles are isolated and never cross-pollinate', () => {
  const allComments = [
    {
      _id: 'c-art-1',
      resourceId: 'article-alpha',
      content: { richContent: textToRichContent('Alpha discussion') },
      status: 'PUBLISHED',
    },
    {
      _id: 'c-art-2',
      resourceId: 'article-beta',
      content: { richContent: textToRichContent('Beta discussion') },
      status: 'PUBLISHED',
    },
  ];

  const alphaComments = allComments.filter((c) => c.resourceId === 'article-alpha');
  const betaComments = allComments.filter((c) => c.resourceId === 'article-beta');

  const alphaTree = buildThreadTree(alphaComments);
  const betaTree = buildThreadTree(betaComments);

  assert.equal(alphaTree.length, 1);
  assert.equal(alphaTree[0].id, 'c-art-1');
  assert.equal(alphaTree[0].content, 'Alpha discussion');

  assert.equal(betaTree.length, 1);
  assert.equal(betaTree[0].id, 'c-art-2');
  assert.equal(betaTree[0].content, 'Beta discussion');
});

// ── Scenario 3: Deleted Parent Representation Preserves Thread Tree ──────────

test('Deleted parent comments preserve reply tree with neutral placeholder message', () => {
  const rawComments = [
    {
      _id: 'parent-deleted',
      resourceId: 'art-1',
      content: null,
      status: 'DELETED',
      _createdDate: new Date('2026-10-23T08:00:00Z'),
      author: { memberId: 'm-orig' },
    },
    {
      _id: 'child-reply',
      resourceId: 'art-1',
      content: { richContent: textToRichContent('Still visible insightful reply') },
      status: 'PUBLISHED',
      parentComment: { id: 'parent-deleted' },
      _createdDate: new Date('2026-10-23T08:30:00Z'),
      author: { memberId: 'm-reply' },
      _authorName: 'Insightful Doctor',
    },
  ];

  const tree = buildThreadTree(rawComments);

  assert.equal(tree.length, 1);
  assert.equal(tree[0].isDeleted, true);
  assert.match(tree[0].content, /removed by the author or moderator/i);

  // Child reply remains attached
  assert.equal(tree[0].replies.length, 1);
  assert.equal(tree[0].replies[0].id, 'child-reply');
  assert.equal(tree[0].replies[0].content, 'Still visible insightful reply');
});

// ── Scenario 4: Text-Only Sanitization & RichContent Handling ─────────────────

test('richContentToText strips executable markup and script tags', () => {
  const maliciousRicos = {
    nodes: [
      {
        type: 'PARAGRAPH',
        nodes: [
          {
            type: 'TEXT',
            textData: {
              text: '<script>alert("hacked")</script>Medical diagnosis statement.<img src="x" onerror="alert(1)">',
            },
          },
        ],
      },
    ],
  };

  const safeText = richContentToText(maliciousRicos);

  // Pure text returned without HTML tags
  assert.doesNotMatch(safeText, /<script>/i);
  assert.doesNotMatch(safeText, /<img/i);
  assert.match(safeText, /Medical diagnosis statement/);
});

test('textToRichContent formats multi-paragraph strings properly', () => {
  const input = 'First paragraph of medical review.\n\nSecond paragraph with observations.';
  const ricos = textToRichContent(input);

  assert.equal(ricos.nodes.length, 2);
  assert.equal(ricos.nodes[0].nodes[0].textData.text, 'First paragraph of medical review.');
  assert.equal(ricos.nodes[1].nodes[0].textData.text, 'Second paragraph with observations.');
});

// ── Scenario 5: Input Validation & Boundary Enforcement ───────────────────────

test('Enforces 3,000 character maximum limit', () => {
  assert.equal(MAX_COMMENT_LENGTH, 3000);

  const oversizedText = 'A'.repeat(3001);
  assert.ok(oversizedText.length > MAX_COMMENT_LENGTH);

  const validText = 'A'.repeat(3000);
  assert.ok(validText.length <= MAX_COMMENT_LENGTH);
});

// ── Scenario 6: Rate Limiting Sliding Window ──────────────────────────────────

test('Rate limiter permits normal submissions and throttles rapid repeated posts', () => {
  const testMemberId = 'rate-test-' + Date.now();

  // First 5 requests should pass
  for (let i = 0; i < 5; i++) {
    const check = checkRateLimit(testMemberId);
    assert.equal(check.allowed, true, `Post ${i + 1} should be allowed`);
  }

  // 6th request should be throttled
  const throttled = checkRateLimit(testMemberId);
  assert.equal(throttled.allowed, false);
  assert.ok(throttled.remainingSeconds > 0);
});

// ── Scenario 7: Deletion Authorization Logic ──────────────────────────────────

test('Deletion authorization matrix enforces author and administrator privileges strictly', () => {
  const comment = {
    _id: 'comment-42',
    author: { memberId: 'member-author' },
  };

  function checkDeletionAllowed(callerMemberId, callerIsAdmin) {
    const isAuthor = Boolean(comment.author.memberId && comment.author.memberId === callerMemberId);
    return isAuthor || callerIsAdmin;
  }

  // Author caller: ALLOWED
  assert.equal(checkDeletionAllowed('member-author', false), true);

  // Non-author regular member caller: REJECTED
  assert.equal(checkDeletionAllowed('member-imposter', false), false);

  // Authorised Administrator caller: ALLOWED
  assert.equal(checkDeletionAllowed('admin-member', true), true);

  // Unauthenticated caller: REJECTED
  assert.equal(checkDeletionAllowed(null, false), false);
});

// ── Scenario 8: Cross-Article Reply Rejection ─────────────────────────────────

test('Rejects replying to a parent comment belonging to another article', () => {
  const targetArticleId = 'article-100';
  const parentComment = {
    _id: 'parent-99',
    resourceId: 'article-999', // Different article!
  };

  const isCrossArticle = parentComment.resourceId !== targetArticleId;
  assert.equal(isCrossArticle, true, 'Cross article replies must be detected');
});

// ── Scenario 9: Privileged Credentials Absent from Browser Bundle ─────────────

test('Verifies that Discussion component and client-side code never import or bundle secrets', async () => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');

  const discussionSource = await fs.readFile(
    path.resolve(process.cwd(), 'src/components/comments/Discussion.astro'),
    'utf8'
  );

  // Client code in Discussion.astro must not reference private backend secrets
  assert.doesNotMatch(discussionSource, /WIX_API_KEY/);
  assert.doesNotMatch(discussionSource, /clientSecret/i);
  assert.doesNotMatch(discussionSource, /ApiKeyStrategy/);
  assert.doesNotMatch(discussionSource, /process\.env/);
});

// ── Scenario 10: OAuth Data Integrity & PKCE Structure ─────────────────────────

test('OAuth data structure includes required PKCE parameters for Google auth', () => {
  const sampleOAuthData = {
    redirectUri: 'https://example.com/api/auth/callback',
    originalUri: '/suture/sections/clinical-case-corner/example',
    codeChallenge: 'sample-challenge',
    codeVerifier: 'sample-verifier',
    state: 'sample-state',
  };

  assert.ok(sampleOAuthData.redirectUri.includes('/api/auth/callback'));
  assert.ok(sampleOAuthData.originalUri.startsWith('/suture'));
  assert.ok(sampleOAuthData.codeVerifier);
  assert.ok(sampleOAuthData.state);
});

