import { fetchFromInstagramGraphApi } from '../lib/instagram';

export interface InstagramPost {
  id: string;
  src: string;
  image?: string;
  caption: string;
  permalink: string;
  timestamp: string;
  mediaType?: 'IMAGE' | 'CAROUSEL_ALBUM' | 'VIDEO';
  alt?: string;
  altText?: string;
}

export const OFFICIAL_IG_PROFILE = 'https://www.instagram.com/litclubpsgimsr/';
export const SOCIABLEKIT_IFRAME_URL = 'https://widgets.sociablekit.com/instagram-feed/iframe/25716077';
export const SOCIABLEKIT_FEED_URL = 'https://data.accentapi.com/feed/25716077.json';

// Authentic, verified Instagram posts from @litclubpsgimsr
export const INSTAGRAM_POSTS: InstagramPost[] = [
  {
    id: 'Ddbk-UxiQhO',
    src: 'https://data-image.sociablekit.com/sources/instagram-feed/litclubpsgimsr/Ddbk-UxiQhO-thumbnail.webp?v=1790099073479',
    alt: 'The Suture Digital Magazine Launch: Embers',
    caption: 'With great delight, we present the first edition of "The Suture", a digital magazine launched by the Literature Club of PSGIMSR. Titled "Embers", this edition brings together clinical insights, campus events, and student imagination.',
    permalink: 'https://www.instagram.com/litclubpsgimsr/p/Ddbk-UxiQhO/',
    timestamp: '2026-09-18T00:00:00Z',
    mediaType: 'CAROUSEL_ALBUM'
  },
  {
    id: 'DaXkWZfRZFF',
    src: 'https://data-image.sociablekit.com/sources/instagram-feed/litclubpsgimsr/DaXkWZfRZFF-thumbnail.webp?v=1790099073481',
    alt: 'Jojo Rabbit Movie Screening',
    caption: 'The Literature Club of PSGIMSR cordially invites you all to the screening of Jojo Rabbit.',
    permalink: 'https://www.instagram.com/litclubpsgimsr/p/DaXkWZfRZFF/',
    timestamp: '2026-07-04T00:00:00Z',
    mediaType: 'IMAGE'
  },
  {
    id: 'DVJhCcBiYX1',
    src: 'https://data-image.sociablekit.com/sources/instagram-feed/litclubpsgimsr/DVJhCcBiYX1-thumbnail.webp?v=1790099073482',
    alt: 'Fiction vs Faculty Episode 3',
    caption: '"Fiction vs Faculty" was far too much delight for our faculties! Episode 3 witnessed Dr. Sujaya Menon (Department of Medicine) evince her erudition with remarkable elegance.',
    permalink: 'https://www.instagram.com/litclubpsgimsr/p/DVJhCcBiYX1/',
    timestamp: '2026-02-24T00:00:00Z',
    mediaType: 'CAROUSEL_ALBUM'
  },
  {
    id: 'DVFYYIZkVxq',
    src: 'https://data-image.sociablekit.com/sources/instagram-feed/litclubpsgimsr/DVFYYIZkVxq-thumbnail.webp?v=1790099073482',
    alt: 'Fiction vs Faculty Announcement',
    caption: 'The Literature Club, in collaboration with Alchemy, presents Fiction vs Faculty featuring Dr. Sujaya Menon from the Department of Medicine.',
    permalink: 'https://www.instagram.com/litclubpsgimsr/p/DVFYYIZkVxq/',
    timestamp: '2026-02-22T00:00:00Z',
    mediaType: 'IMAGE'
  },
  {
    id: 'DUACgBLEds-',
    src: 'https://data-image.sociablekit.com/sources/instagram-feed/litclubpsgimsr/DUACgBLEds--thumbnail.webp?v=1790099073482',
    alt: 'Screening starts sharp 5:05 PM',
    caption: 'Screening starts sharp 5:05 PM! Join us for an evening of literature, cinema, and engaging discussions at PSGIMSR.',
    permalink: 'https://www.instagram.com/litclubpsgimsr/p/DUACgBLEds-/',
    timestamp: '2026-01-26T00:00:00Z',
    mediaType: 'IMAGE'
  },
  {
    id: 'DTvMd_3E3pm',
    src: 'https://data-image.sociablekit.com/sources/instagram-feed/litclubpsgimsr/DTvMd_3E3pm-thumbnail.webp?v=1790099073482',
    alt: 'Black Ticket Film Club Launch',
    caption: 'Launching PSGIMSR\'s very own film club - Black Ticket. Celebrating cinematic storytelling and short film analysis on campus.',
    permalink: 'https://www.instagram.com/framespersecondclub/reel/DTvMd_3E3pm/',
    timestamp: '2026-01-20T00:00:00Z',
    mediaType: 'VIDEO'
  },
  {
    id: 'DScql0oEV4l',
    src: 'https://data-image.sociablekit.com/sources/instagram-feed/litclubpsgimsr/DScql0oEV4l-thumbnail.webp?v=1790099073482',
    alt: 'Debate Roulette Event',
    caption: 'Audience: laughter and cheers. Speakers: fast thinking. Rules: optional. Debate Roulette was pure pandemonium!',
    permalink: 'https://www.instagram.com/litclubpsgimsr/p/DScql0oEV4l/',
    timestamp: '2025-12-19T00:00:00Z',
    mediaType: 'CAROUSEL_ALBUM'
  },
  {
    id: 'DP3_HaikbMj',
    src: 'https://data-image.sociablekit.com/sources/instagram-feed/litclubpsgimsr/DP3_HaikbMj-thumbnail.webp?v=1790099073482',
    alt: 'Fiction vs Faculty Episode 2',
    caption: 'Fiction vs Faculty - Episode 2 featuring Dr. Denesh Narayanan analyzing medical storytelling in cinema.',
    permalink: 'https://www.instagram.com/litclubpsgimsr/p/DP3_HaikbMj/',
    timestamp: '2025-10-16T00:00:00Z',
    mediaType: 'CAROUSEL_ALBUM'
  },
  {
    id: 'DPCIHzVk3aW',
    src: 'https://data-image.sociablekit.com/sources/instagram-feed/litclubpsgimsr/DPCIHzVk3aW-thumbnail.webp?v=1790099073483',
    alt: 'Improv Night 25',
    caption: 'Where words fail, we improvise. Improv Night \'25 was a whirlwind of laughter, creativity, and unexpected theatrical magic.',
    permalink: 'https://www.instagram.com/litclubpsgimsr/p/DPCIHzVk3aW/',
    timestamp: '2025-09-25T00:00:00Z',
    mediaType: 'CAROUSEL_ALBUM'
  },
  {
    id: 'DOFweqdEtJu',
    src: 'https://data-image.sociablekit.com/sources/instagram-feed/litclubpsgimsr/DOFweqdEtJu-thumbnail.webp?v=1790099073483',
    alt: 'Fiction vs Faculty Episode 1: House MD',
    caption: 'Fiction vs Faculty - Episode 1 featuring House MD with diagnostic clinical insights and panel dissection from our faculty.',
    permalink: 'https://www.instagram.com/litclubpsgimsr/p/DOFweqdEtJu/',
    timestamp: '2025-09-01T00:00:00Z',
    mediaType: 'CAROUSEL_ALBUM'
  },
  {
    id: 'DMdQPV4Ttgi',
    src: 'https://data-image.sociablekit.com/sources/instagram-feed/litclubpsgimsr/DMdQPV4Ttgi-thumbnail.webp?v=1790099073483',
    alt: 'PSGIMSR First Book Club Meeting',
    caption: 'Sharing pictures from the first book club meeting of the year! Thought-provoking literary discussions, book swaps, and member reviews.',
    permalink: 'https://www.instagram.com/litclubpsgimsr/p/DMdQPV4Ttgi/',
    timestamp: '2025-07-23T00:00:00Z',
    mediaType: 'CAROUSEL_ALBUM'
  },
  {
    id: 'DMdPo0_zop0',
    src: 'https://data-image.sociablekit.com/sources/instagram-feed/litclubpsgimsr/DMdPo0_zop0-thumbnail.webp?v=1790099073483',
    alt: 'Tamil Poetry Competition Winner',
    caption: 'Delighted to announce the winner of the Tamil Poetry Competition held by the Literature Club of PSGIMSR.',
    permalink: 'https://www.instagram.com/litclubpsgimsr/p/DMdPo0_zop0/',
    timestamp: '2025-07-23T00:00:00Z',
    mediaType: 'IMAGE'
  }
];

export async function fetchLiveInstagramPosts(): Promise<InstagramPost[]> {
  // 1. Try official Instagram Graph API with Instagram Login if configured
  try {
    const officialPosts = await fetchFromInstagramGraphApi();
    if (officialPosts && officialPosts.length) {
      return officialPosts;
    }
  } catch {}

  // 2. Try SociableKIT live JSON endpoint
  try {
    const res = await fetch(`${SOCIABLEKIT_FEED_URL}?nocache=${Date.now()}`);
    if (res.ok) {
      const data = await res.json();
      const posts = data.posts || data.data || [];
      if (Array.isArray(posts) && posts.length) {
        const list: InstagramPost[] = [];
        posts.forEach((p: any) => {
          const mainImg = p.image_url || p.post_link || p.pic_src || p.full_pic_src || p.thumbnail;
          if (mainImg) {
            list.push({
              id: p.code || p.id || `sk-${list.length}`,
              src: mainImg,
              alt: p.pic_text ? p.pic_text.slice(0, 100).replace(/\n/g, ' ') : 'Instagram Post',
              caption: p.pic_text || p.post_text || p.caption || '',
              permalink: p.link || (p.code ? `https://www.instagram.com/litclubpsgimsr/p/${p.code}/` : OFFICIAL_IG_PROFILE),
              timestamp: p.date_time_posted || p.created_time || p.timestamp || '',
              mediaType: p.pic_type === 'carousel' ? 'CAROUSEL_ALBUM' : (p.pic_type === 'video' ? 'VIDEO' : 'IMAGE')
            });
          }
        });

        if (list.length) {
          list.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
          return list;
        }
      }
    }
  } catch {}

  // 3. Fallback to authentic curated Instagram posts
  return INSTAGRAM_POSTS;
}
