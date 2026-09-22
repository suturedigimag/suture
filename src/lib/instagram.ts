/**
 * Instagram API with Instagram Login Client
 * 
 * Supports Meta's Instagram Platform API:
 * Scope required: instagram_business_basic
 * Endpoint: https://graph.instagram.com/v21.0/me/media
 * 
 * To use with your Instagram Creator/Business account:
 * 1. Create a Meta App at developers.facebook.com
 * 2. Add "Instagram" product (Instagram API with Instagram Login)
 * 3. Generate a User Token (or Long-Lived User Access Token)
 * 4. Add INSTAGRAM_ACCESS_TOKEN=your_token_here to .env
 */

import type { InstagramPost } from '../data/instagramPosts';

const GRAPH_API_BASE = 'https://graph.instagram.com/v21.0';

export interface MetaInstagramMediaItem {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  permalink: string;
  thumbnail_url?: string;
  timestamp: string;
  children?: {
    data: Array<{
      id: string;
      media_url: string;
      media_type: string;
    }>;
  };
}

export async function fetchFromInstagramGraphApi(): Promise<InstagramPost[] | null> {
  const token = import.meta.env.INSTAGRAM_ACCESS_TOKEN ||
    (typeof globalThis !== 'undefined' && (globalThis as any).process?.env?.INSTAGRAM_ACCESS_TOKEN);

  if (!token) {
    return null;
  }

  try {
    const fields = 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,children{id,media_url,media_type}';
    const url = `${GRAPH_API_BASE}/me/media?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(token)}&limit=50`;

    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[Instagram API] Graph API returned ${res.status}: ${await res.text()}`);
      return null;
    }

    const json = await res.json();
    const items: MetaInstagramMediaItem[] = json.data || [];
    if (!items.length) return null;

    const posts: InstagramPost[] = [];

    items.forEach((item) => {
      const src = item.media_url || item.thumbnail_url;
      if (!src) return;

      posts.push({
        id: item.id,
        src,
        alt: item.caption ? item.caption.slice(0, 100) : 'Instagram Post',
        caption: item.caption || '',
        permalink: item.permalink || 'https://www.instagram.com/litclubpsgimsr/',
        timestamp: item.timestamp || '',
        mediaType: item.media_type
      });

      // Expand carousel items for rich dome tile variety
      if (item.children?.data?.length) {
        item.children.data.forEach((child, idx) => {
          if (child.media_url && child.media_url !== src) {
            posts.push({
              id: `${item.id}-slide-${idx + 1}`,
              src: child.media_url,
              alt: item.caption ? `${item.caption.slice(0, 80)} (Slide ${idx + 1})` : `Instagram Slide ${idx + 1}`,
              caption: item.caption || '',
              permalink: item.permalink || 'https://www.instagram.com/litclubpsgimsr/',
              timestamp: item.timestamp || '',
              mediaType: child.media_type === 'VIDEO' ? 'VIDEO' : 'IMAGE'
            });
          }
        });
      }
    });

    return posts.length ? posts : null;
  } catch (err: any) {
    console.warn(`[Instagram API] Error fetching Graph API: ${err?.message || err}`);
    return null;
  }
}
