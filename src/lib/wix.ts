/**
 * Wix SDK Client
 *
 * The Suture — Headless Wix + Astro 5
 *
 * Set the following environment variables in .env:
 *   WIX_CLIENT_ID   — OAuth client ID from Wix Dev Center (headless app)
 *
 * To get your Client ID:
 *   1. Go to manage.wix.com → Your Site → Settings → Headless
 *   2. Create or copy your OAuth Client ID
 *   3. Add it to .env as WIX_CLIENT_ID=your-id-here
 */

// @ts-ignore
import dns from 'node:dns';
import { createClient, OAuthStrategy } from '@wix/sdk';
import { items } from '@wix/data';

if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

const clientId = import.meta.env.WIX_CLIENT_ID;

if (!clientId) {
  console.warn(
    '[The Suture] WIX_CLIENT_ID is not set. ' +
    'CMS data fetching will fail. ' +
    'Add it to your .env file.'
  );
}

export const wixClient = createClient({
  modules: { items },
  auth: OAuthStrategy({
    clientId: clientId ?? 'MISSING_CLIENT_ID',
  }),
});
