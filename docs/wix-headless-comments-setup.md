# Wix Headless Comments Setup & Integration Guide

This guide documents the implementation of the secure, production-ready commenting system for **The Suture**, using Wix Headless Comments API, Wix Member OAuth authentication with Google sign-in, and Astro 5 SSR on Vercel.

---

## 1. Overview & Architecture

- **Frontend**: Astro 5 SSR with `@astrojs/vercel` adapter
- **Content Management**: Wix CMS (Collections)
- **Comments Backend**: Wix Headless Comments (`@wix/comments`)
- **Authentication**: Wix Headless Member OAuth with Google Sign-in (`@wix/members`, `@wix/sdk`)
- **Storage**: Wix-managed storage only (zero external databases like Firebase/Supabase)
- **Thread Model**: Hierarchical thread tree (top-level reflections + nested replies)
- **Real-Time Model**: 20-second visibility-aware polling (no hosted websockets, pauses on background tabs)
- **Access Control**: Server-side verified author deletion + admin moderation allowlist

---

## 2. Reusing the Existing Headless Client ID

The existing public application identifier (`WIX_CLIENT_ID`) configured in `.env` is reused for all member authentication and comments queries. **Do not create a second Headless client.**

The client ID is a public identifier, safe to use for OAuth flows:
- Local `.env`: `WIX_CLIENT_ID=<your-existing-id>`
- Vercel Environment Variables: `WIX_CLIENT_ID=<your-existing-id>`

---

## 3. Allowed OAuth Login & Callback URLs Configuration

In the Wix Developers Center / Wix Studio Dashboard:
1. Navigate to **manage.wix.com** &rarr; Your Site &rarr; **Settings** &rarr; **Headless Settings** (or your Headless App in the Developer Center).
2. Under **OAuth Settings** / **Redirect URLs**, add the following URLs to the allowlist:
   - **Local Development**:
     - `http://localhost:4321/api/auth/callback`
   - **Vercel Preview Deployments**:
     - `https://*.vercel.app/api/auth/callback`
   - **Custom Production Domain**:
     - `https://literatureclub.in/api/auth/callback`
     - `https://www.literatureclub.in/api/auth/callback`
3. Under **Allowed Domains**, ensure your deployment domains are added (`literatureclub.in`, `localhost`).

---

## 4. Google Sign-In in Wix Headless

In **Wix Headless**, you **do not** need to toggle Google Sign-In on or create Google Cloud Console credentials:
1. Wix Headless includes Google as an identity provider (`idp: 'google'`) natively.
2. When the user clicks "Continue with Google", our backend calls `client.auth.getAuthUrl(oAuthData, { idp: 'google' })`.
3. Wix manages the Google identity exchange through `auth.wix.com` automatically.
4. As long as your **Allowed Authorization Redirect URIs** are registered in Step 3, Wix will process the Google authentication and return authorization tokens to `/api/auth/callback`.

---

## 5. Wix Comments Category & Resource Mapping

### Category Configuration
In Wix Dashboard &rarr; **Community / Comments**:
- Wix Comments uses Categories to manage permissions, guest commenting, and moderation settings.
- The live category discovered on this site:
  - **Category Name**: `Blog comments` (or custom category)
  - **Category ID (`contextId`)**: `059aa884-79a4-41b5-9466-ab6839685cbf`
  - **App ID (`appId`)**: `14bcded7-0066-7c35-14d7-466cb3f09103` (or `91c9d6a7-6667-41fb-b0b4-7d3b3ff0b02e` for standalone Comments App)

If you create a dedicated category for The Suture (e.g. named "The Suture Articles"), update:
```bash
WIX_COMMENTS_APP_ID=14bcded7-0066-7c35-14d7-466cb3f09103
WIX_COMMENTS_CONTEXT_ID=your-new-category-id
```

### Stable Article Resource Mapping
- Every article in The Suture has an immutable Wix CMS item ID: `article._id` (e.g., `c03df032-1f48-4364-884b-...`).
- Comments are mapped as:
  - `resourceId`: `article._id` (never article titles or slugs, which may change).
  - `contextId`: Category ID (`WIX_COMMENTS_CONTEXT_ID`).
  - `appId`: Comments App ID (`WIX_COMMENTS_APP_ID`).
- **Isolation Guarantee**: The backend API filters strictly on `resourceId === article._id`, ensuring comments from one article can never be rendered under a different article.

---

## 6. Required API Permissions & Developer Scopes

For the Headless Client ID in **Wix Developers Center** &rarr; **Permissions**:
1. Search for and enable the following permission scopes:
   - **`Read Comments`**: Permits querying and listing comments.
   - **`Manage Comments`**: Required for creating comments and deleting/moderating comments via backend services.
   - **`Read Members`**: Permits resolving member display names and avatars.
2. Click **Save** and publish your app version.

> [!IMPORTANT]
> If `Manage Comments` or `Read Comments` is not enabled in your Wix Dev Center dashboard for your client ID, the Wix API will return `PERMISSION_DENIED: UNKNOWN`. Enabling these scopes in the Wix Dev Center resolves the permission check.

---

## 7. Environment Variables Reference

Add these variables to your `.env` locally and in **Vercel Project Settings &rarr; Environment Variables**:

| Variable | Required | Description |
|---|---|---|
| `WIX_CLIENT_ID` | **Yes** | Existing Wix Headless Client ID (reused from Astro frontend) |
| `WIX_COMMENTS_APP_ID` | Optional | App ID for Comments (default: `14bcded7-0066-7c35-14d7-466cb3f09103`) |
| `WIX_COMMENTS_CONTEXT_ID` | Optional | Context / Category ID (default: `059aa884-79a4-41b5-9466-ab6839685cbf`) |
| `ADMIN_EMAILS` | Recommended | Comma-separated member emails authorized to moderate comments |
| `WIX_API_KEY` | Optional | Elevated Wix API key for server-to-server moderation |
| `WIX_SITE_ID` | Optional | Wix Site ID (required only if `WIX_API_KEY` is provided) |

---

## 8. Author Attribution & Deletion Security Model

### True Author Attribution
- When a user logs in with Google, Wix Headless OAuth issues member session tokens.
- When `POST /api/comments` is called:
  1. The server extracts the `wix_member_tokens` httpOnly cookie.
  2. The server verifies the token against Wix by calling `memberClient.members.getCurrentMember()`.
  3. The request is submitted to Wix Comments using `memberClient.comments.createComment()`.
  4. Wix natively attributes the comment's `author.memberId` to the authenticated caller.
  5. The client can never forge or spoof the `author.memberId`.

### Deletion Authorization Matrix
When `DELETE /api/comments/[commentId]` is called:
1. The server identifies the caller via their session cookie.
2. The server retrieves the comment from Wix to inspect `comment.author.memberId`.
3. If `caller.id === comment.author.memberId`, deletion is **ALLOWED**.
4. If `caller.isAdmin === true` (email matches `ADMIN_EMAILS`), deletion is **ALLOWED**.
5. All other requests are rejected with `403 Forbidden`.

---

## 9. Admin Moderation Dashboard

An editorial moderation page is available at:
```
/suture/admin/comments
```
### Features:
- Restricts access strictly to members whose verified email is listed in `ADMIN_EMAILS`.
- Displays all comments across all articles with search and filter capabilities (by article ID, author, or keyword).
- Allows deleting any offending or spam comment with one click.
- Displays live feedback and comment thread context.

---

## 10. Polling, Rate Limiting & Abuse Prevention

1. **Lightweight Polling**:
   - The comments component polls `/api/comments?article=<id>` every 20 seconds.
   - Polling automatically pauses when the browser tab is hidden (`document.visibilityState === 'hidden'`) to conserve bandwidth and API quotas.
   - Polling resumes immediately when the tab is restored.
   - Timers are stopped when navigating away or unmounting.
2. **Abuse Control & Rate Limiting**:
   - The backend enforces an in-memory sliding window rate limiter: maximum 5 comment submissions per minute per authenticated member / IP.
   - Maximum text length is 3,000 characters.
   - Submitted text is converted to text-only Wix Ricos nodes; all HTML and script injection is stripped.
3. **Session Cookie Security**:
   - Member tokens are saved with `httpOnly: true`, `secure: true`, and `sameSite: 'lax'`.
   - Refresh tokens and API keys are never bundled into client-side JavaScript.

---

## 11. Automated Testing

Run the test suite:
```bash
npm test
```
The test suite validates:
- Thread tree assembly (hierarchical nesting of root comments and replies).
- Deleted parent comment preservation.
- Resource ID isolation across articles.
- Text-only sanitization and stripping of malicious script tags.
- Rate limiting sliding window.
- Deletion authorization matrix (author vs imposter vs admin).
- Rejection of cross-article replies.
- Absence of privileged secrets from the browser bundle.

---

## 12. Rollback Procedure

If you ever need to roll back the comments feature:
1. Since all changes live on the dedicated Git branch `feat/wix-headless-comments`, production (`main`) remains unaffected until merged.
2. To discard the branch locally:
   ```bash
   git checkout main
   git branch -D feat/wix-headless-comments
   ```
3. To disable comments on a deployed branch without code changes, remove `<Discussion />` from `src/layouts/ArticleLayout.astro` or set category permissions in Wix Dashboard.
