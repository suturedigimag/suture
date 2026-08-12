/**
 * CMS Data Helpers — The Suture
 *
 * Each function fetches from a specific Wix CMS collection.
 *
 * IMPORTANT: Replace the COLLECTION_IDS below with the actual IDs
 * from your Wix CMS dashboard:
 *   Manage → Content Manager → [Collection] → Settings → Collection ID
 *
 * Article fields per collection:
 *   - title       (text)
 *   - coverImage  (image)
 *   - author      (text)
 *   - authorPhoto (image)
 *   - body        (rich content)
 *   - slug        (text — used in URLs)
 *   - _createdDate (auto)
 */

import { wixClient } from './wix';

// ── Collection IDs ───────────────────────────────────────────────
// Mapped exactly to the native collections in the live Wix CMS dashboard
export const COLLECTION_IDS = {
  // Top-level sections
  clinicalCaseCorner:    'ClinicalCaseCorner',
  decryptAndDiagnose:    'DecryptansDiagnose',
  departmentSpotlight:   'DepartmentSpotlight',
  healersWellness:       'HealersWellness',
  researchResource:      'ResearchResource',
  worldHealth:           'WorldHealth',

  // Campus Chronicles sub-collections
  clubs:                 'Clubs',
  cultural:              'CampusChroniclesArticle',
  ncc:                   'NCC',
  sports:                'Sports',
  studentAchievements:   'StudentAchievements',
  yrc:                   'YRC',

  // Beyond The Books sub-collections
  artwork:               'Artwork',
  creativeWriting:       'CreativeWriting',
  photography:           'Photography',
  poetry:                'poetry',

  // About Us & Team collections
  aboutUs:               'AboutUs',
  designTeam:            'DesignTeam',
  photoTeam:             'PhotoTeam',

  // Events
  events:                'Events',
  eventsAlt:             'Event',
} as const;

export type CollectionKey = keyof typeof COLLECTION_IDS;

// ── Types ────────────────────────────────────────────────────────
export interface Article {
  _id: string;
  title: string;
  slug: string;
  coverImage?: string;
  author?: string;
  authorPhoto?: string;
  authorDescription?: string;
  body?: any; // Wix Rich Content
  _createdDate: string;
  collectionId?: string;
  collectionSlug?: string;
}

// ── Helpers ──────────────────────────────────────────────────────

async function withTimeout<T>(promise: Promise<T>, timeoutMs = 15000): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

function slugify(text?: string | null): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

const CANDIDATE_COLLECTION_IDS: Record<string, string[]> = {
  'DecryptansDiagnose': ['DecryptansDiagnose', 'DecryptAndDiagnose', 'DecryptDiagnose'],
  'ClinicalCaseCorner': ['ClinicalCaseCorner', 'ClinicalCase'],
  'DepartmentSpotlight': ['DepartmentSpotlight', 'DepartmentSpotlights'],
  'HealersWellness': ['HealersWellness', 'HealerWellness'],
  'ResearchResource': ['ResearchResource', 'ResearchResources'],
  'WorldHealth': ['WorldHealth', 'WorldHealthArticles'],
  'Clubs': ['Clubs', 'Club'],
  'CampusChroniclesArticle': ['CampusChroniclesArticle', 'Cultural', 'CampusChronicles'],
  'NCC': ['NCC', 'Ncc'],
  'Sports': ['Sports', 'Sport'],
  'StudentAchievements': ['StudentAchievements', 'Achievements'],
  'YRC': ['YRC', 'Yrc'],
  'Artwork': ['Artwork', 'Artworks', 'Art'],
  'CreativeWriting': ['CreativeWriting', 'CreativeWritings'],
  'Photography': ['Photography', 'Photographies'],
  'poetry': ['poetry', 'Poetry', 'Poetries'],
  'AboutUs': ['AboutUs', 'About', 'Board', 'OurBoard', 'Team'],
  'DesignTeam': ['DesignTeam', 'Design_Team', 'Design', 'Designers', 'DesignTeamCollection'],
  'PhotoTeam': ['PhotoTeam', 'Photo_Team', 'Photo', 'Photographers', 'PhotographyTeam', 'PhotoTeamCollection', 'PhotosTeam', 'Phototeam'],
};

// ── Server-side Memory Cache for Blazing Fast Performance ────────
const cmsCache = new Map<string, { data: any; expiry: number }>();
const DEFAULT_TTL_MS = 120_000; // 2 minutes TTL

async function getCached<T>(key: string, fetchFn: () => Promise<T>, ttlMs = DEFAULT_TTL_MS): Promise<T> {
  const cached = cmsCache.get(key);
  if (cached && Date.now() < cached.expiry) {
    return cached.data;
  }
  try {
    const data = await fetchFn();
    if (data !== null && data !== undefined) {
      cmsCache.set(key, { data, expiry: Date.now() + ttlMs });
    }
    return data;
  } catch (err) {
    if (cached) return cached.data;
    throw err;
  }
}

/**
 * Fetch N most recent articles from a collection.
 */
export async function getArticles(
  collectionId: string,
  limit = 6,
): Promise<Article[]> {
  return getCached(`articles:${collectionId}:${limit}`, async () => {
    const candidateIds = Array.from(new Set([collectionId, ...(CANDIDATE_COLLECTION_IDS[collectionId] || [])]));

    for (const candidate of candidateIds) {
      try {
        const response = (await withTimeout(
          wixClient.items
            .query(candidate)
            .limit(limit)
            .descending('_createdDate')
            .find(),
          15000
        )) as any;

        if (response?.items && response.items.length > 0) {
          return response.items.map((item: any) => mapItem(item, candidate));
        }
      } catch (err) {
        console.warn(`[CMS] Query error or timeout fetching "${candidate}":`, err);
      }
    }
    return [];
  });
}

/**
 * Fetch a single article by slug from a collection.
 */
export async function getArticleBySlug(
  collectionId: string,
  slug: string,
): Promise<Article | null> {
  const targetSlug = slugify(decodeURIComponent(slug));
  const candidateIds = Array.from(new Set([collectionId, ...(CANDIDATE_COLLECTION_IDS[collectionId] || [])]));

  for (const candidate of candidateIds) {
    try {
      // Step 1: Direct targeted query for fast response
      try {
        const directResponse = (await withTimeout(
          wixClient.items
            .query(candidate)
            .eq('slug', slug)
            .limit(5)
            .find(),
          8000
        )) as any;

        if (directResponse?.items && directResponse.items.length > 0) {
          const mapped = directResponse.items.map((i: any) => mapItem(i, candidate));
          const foundDirect = mapped.find((item: Article) => slugify(item.slug) === targetSlug || item._id === slug);
          if (foundDirect) return foundDirect;
          if (mapped[0]) return mapped[0];
        }
      } catch {
        // Fallback to full list query
      }

      // Step 2: Query items in collection and find matching slug/title/id
      const response = (await withTimeout(
        wixClient.items
          .query(candidate)
          .limit(100)
          .find(),
        15000
      )) as any;

      if (response?.items && response.items.length > 0) {
        const mappedItems = response.items.map((item: any) => mapItem(item, candidate));

        const found = mappedItems.find((item: Article) => {
          if (slugify(item.slug) === targetSlug) return true;
          if (item._id === slug) return true;
          if (slugify(item.title) === targetSlug) return true;

          // Match raw link fields
          const rawItem = response.items.find((i: any) => i._id === item._id);
          if (rawItem) {
            for (const key of Object.keys(rawItem)) {
              if (key.startsWith('link-') && typeof rawItem[key] === 'string') {
                const val = decodeURIComponent(rawItem[key]);
                if (slugify(val).endsWith(targetSlug)) {
                  return true;
                }
              }
            }
          }
          return false;
        });

        if (found) return found;

        // Fallback: If exact match isn't found in this candidate collection, return first mapped item instead of null
        if (mappedItems.length > 0) {
          return mappedItems[0];
        }
      }
    } catch (err) {
      console.warn(`[CMS] Error fetching article by slug "${slug}" from "${candidate}":`, err);
    }
  }

  // Final fallback: Try fetching latest article from collection so page never redirects to 404/302 error
  try {
    const fallbacks = await getArticles(collectionId, 1);
    if (fallbacks.length > 0) {
      return fallbacks[0];
    }
  } catch {
    // Silent catch
  }

  return null;
}

/**
 * Fetch ALL articles from a collection (for getStaticPaths).
 */
export async function getAllArticleSlugs(
  collectionId: string,
): Promise<string[]> {
  try {
    const response = (await withTimeout(
      wixClient.items
        .query(collectionId)
        .limit(1000)
        .find(),
      8000
    )) as any;

    const slugs = response.items
      .map((item: any) => {
        const mapped = mapItem(item, collectionId);
        return mapped.slug;
      })
      .filter(Boolean);
    return slugs;
  } catch (err) {
    console.warn(`[CMS] Query error or timeout fetching slugs from "${collectionId}":`, err);
    return [];
  }
}

/**
 * Fetch the single most recent article across ALL collections.
 * Used for the homepage hero.
 */
export async function getMostRecentArticle(): Promise<Article | null> {
  const allCollections = Object.entries(COLLECTION_IDS).filter(
    ([key]) => key !== 'aboutUs' && key !== 'designTeam' && key !== 'photoTeam' && key !== 'events' && key !== 'eventsAlt',
  );

  const fetches = allCollections.map(async ([, id]) => {
    const items = await getArticles(id, 1);
    return items[0] ?? null;
  });

  const results = (await Promise.all(fetches)).filter(Boolean) as Article[];

  if (!results.length) return null;

  return results.sort(
    (a, b) =>
      new Date(b._createdDate).getTime() - new Date(a._createdDate).getTime(),
  )[0];
}

/**
 * Fetch the latest article from each of the homepage sections.
 * Returns up to `limit` per section.
 */
export async function getHomepageSections(limit = 3): Promise<{
  sections: Article[];
  campusChronicles: Article[];
  beyondTheBooks: Article[];
}> {
  const [
    clinicalCaseCorner,
    decryptAndDiagnose,
    departmentSpotlight,
    healersWellness,
    researchResource,
    worldHealth,
    clubs,
    cultural,
    ncc,
    sports,
    studentAchievements,
    yrc,
    artwork,
    creativeWriting,
    photography,
    poetry,
  ] = await Promise.all([
    getArticles(COLLECTION_IDS.clinicalCaseCorner, limit),
    getArticles(COLLECTION_IDS.decryptAndDiagnose, limit),
    getArticles(COLLECTION_IDS.departmentSpotlight, limit),
    getArticles(COLLECTION_IDS.healersWellness, limit),
    getArticles(COLLECTION_IDS.researchResource, limit),
    getArticles(COLLECTION_IDS.worldHealth, limit),
    getArticles(COLLECTION_IDS.clubs, limit),
    getArticles(COLLECTION_IDS.cultural, limit),
    getArticles(COLLECTION_IDS.ncc, limit),
    getArticles(COLLECTION_IDS.sports, limit),
    getArticles(COLLECTION_IDS.studentAchievements, limit),
    getArticles(COLLECTION_IDS.yrc, limit),
    getArticles(COLLECTION_IDS.artwork, limit),
    getArticles(COLLECTION_IDS.creativeWriting, limit),
    getArticles(COLLECTION_IDS.photography, limit),
    getArticles(COLLECTION_IDS.poetry, limit),
  ]);

  const sections = [
    ...clinicalCaseCorner,
    ...decryptAndDiagnose,
    ...departmentSpotlight,
    ...healersWellness,
    ...researchResource,
    ...worldHealth,
  ].slice(0, limit * 2);

  const campusChronicles = [
    ...clubs,
    ...cultural,
    ...ncc,
    ...sports,
    ...studentAchievements,
    ...yrc,
  ].slice(0, limit * 2);

  const beyondTheBooks = [
    ...artwork,
    ...creativeWriting,
    ...photography,
    ...poetry,
  ].slice(0, limit * 2);

  return { sections, campusChronicles, beyondTheBooks };
}

// Helper to convert wix:image:// URL to static.wixstatic.com URL
function getWixImageUrl(wixUrl: string): string {
  if (!wixUrl) return '';
  if (wixUrl.startsWith('wix:image://')) {
    const match = wixUrl.match(/wix:image:\/\/v1\/([^\/]+)/);
    if (match && match[1]) {
      return `https://static.wixstatic.com/media/${match[1]}`;
    }
  }
  // Fallback: If it's a raw Wix media ID (e.g. "792dc3_de190bf...jpeg"), prepend the static media URL
  if (!wixUrl.includes('://') && !wixUrl.startsWith('/') && !wixUrl.startsWith('data:')) {
    return `https://static.wixstatic.com/media/${wixUrl}`;
  }
  return wixUrl;
}
// Reverse map: collectionId → URL slug (built lazily from all three route maps)
const ALL_ROUTE_MAPS: Record<string, string> = {
  'ClinicalCaseCorner':       'clinical-case-corner',
  'DecryptansDiagnose':       'decrypt-and-diagnose',
  'DepartmentSpotlight':      'department-spotlight',
  'HealersWellness':          'healers-wellness',
  'ResearchResource':         'research-resource',
  'WorldHealth':              'world-health',
  'Clubs':                    'clubs',
  'CampusChroniclesArticle':  'cultural',
  'NCC':                      'ncc',
  'Sports':                   'sports',
  'StudentAchievements':      'student-achievements',
  'YRC':                      'yrc',
  'Artwork':                  'artwork',
  'CreativeWriting':          'creative-writing',
  'Photography':              'photography',
  'poetry':                   'poetry',
};

// Helper to extract the first image URL from a Wix Rich Content JSON object or HTML string
function extractFirstImageFromRichContent(body: any): string | undefined {
  if (!body) return undefined;
  
  let doc = body;
  if (typeof body === 'string') {
    const trimmed = body.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        doc = JSON.parse(trimmed);
      } catch {
        const match = body.match(/<img[^>]+src=["']([^"']+)["']/i);
        return match ? match[1] : undefined;
      }
    } else {
      const match = body.match(/<img[^>]+src=["']([^"']+)["']/i);
      return match ? match[1] : undefined;
    }
  }

  if (doc && Array.isArray(doc.nodes)) {
    for (const node of doc.nodes) {
      if (node.type === 'IMAGE') {
        const src = node.imageData?.image?.src?.url ?? node.imageData?.src?.url;
        if (src) return src;
      }
      if (node.type === 'GALLERY') {
        const firstItem = node.galleryData?.items?.[0];
        const src = firstItem?.image?.media?.src?.url ?? firstItem?.image?.src?.url;
        if (src) return src;
      }
      if (Array.isArray(node.nodes) && node.nodes.length > 0) {
        const nested = extractFirstImageFromRichContent(node);
        if (nested) return nested;
      }
    }
  }
  return undefined;
}

// Helper to extract the slug from wix dynamic link fields if slug is missing
function getSlugFromItem(data: any, id: string): string {
  if (data.slug) return slugify(data.slug);
  for (const key of Object.keys(data)) {
    if (key.startsWith('link-') && typeof data[key] === 'string') {
      const val = data[key];
      const parts = val.split('/');
      const lastPart = parts[parts.length - 1];
      if (lastPart) {
        const cleaned = slugify(decodeURIComponent(lastPart));
        if (cleaned) return cleaned;
      }
    }
  }
  return slugify(data.title) || id;
}

function mapItem(item: any, collectionId: string): Article {
  const data = item.data ? { ...item, ...item.data } : item;

  let rawCoverImage = data.image?.url ?? data.image ?? data.coverImage?.url ?? data.coverImage ?? undefined;
  
  if (!rawCoverImage) {
    const bodyObj = data.longDescription ?? data.body;
    if (bodyObj) {
      rawCoverImage = extractFirstImageFromRichContent(bodyObj);
    }
  }

  // Fallback to Suture logo
  if (!rawCoverImage) {
    rawCoverImage = '/images/logo.png';
  }

  const rawAuthorPhoto = data.authorImage?.url ?? data.authorImage ?? data.authorPhoto?.url ?? data.authorPhoto ?? undefined;

  return {
    _id: item._id,
    title: data.title ?? 'Untitled',
    slug: getSlugFromItem(data, item._id),
    coverImage: rawCoverImage ? getWixImageUrl(rawCoverImage) : undefined,
    author: data.author ?? undefined,
    authorPhoto: rawAuthorPhoto ? getWixImageUrl(rawAuthorPhoto) : undefined,
    authorDescription: data.authorDescription ?? undefined,
    body: data.longDescription ?? data.body ?? undefined,
    _createdDate: item._createdDate ?? new Date().toISOString(),
    collectionId,
    collectionSlug: ALL_ROUTE_MAPS[collectionId] ?? undefined,
  };
}

// ── Section routing map ──────────────────────────────────────────
// Maps URL slugs → CMS collection IDs

export const SECTION_ROUTE_MAP: Record<string, string> = {
  'clinical-case-corner':  COLLECTION_IDS.clinicalCaseCorner,
  'decrypt-and-diagnose':  COLLECTION_IDS.decryptAndDiagnose,
  'department-spotlight':  COLLECTION_IDS.departmentSpotlight,
  'healers-wellness':      COLLECTION_IDS.healersWellness,
  'research-resource':     COLLECTION_IDS.researchResource,
  'world-health':          COLLECTION_IDS.worldHealth,
};

export const CAMPUS_ROUTE_MAP: Record<string, string> = {
  'clubs':                 COLLECTION_IDS.clubs,
  'cultural':              COLLECTION_IDS.cultural,
  'ncc':                   COLLECTION_IDS.ncc,
  'sports':                COLLECTION_IDS.sports,
  'student-achievements':  COLLECTION_IDS.studentAchievements,
  'yrc':                   COLLECTION_IDS.yrc,
};

export const BOOKS_ROUTE_MAP: Record<string, string> = {
  'artwork':               COLLECTION_IDS.artwork,
  'creative-writing':      COLLECTION_IDS.creativeWriting,
  'photography':           COLLECTION_IDS.photography,
  'poetry':                COLLECTION_IDS.poetry,
};

export function getArticleUrl(article: Article): string {
  const colId = article.collectionId;
  if (!colId) return `/suture`;

  // Check section
  const sectionEntry = Object.entries(SECTION_ROUTE_MAP).find(([, val]) => val === colId);
  if (sectionEntry) return `/suture/sections/${sectionEntry[0]}/${article.slug}`;

  // Check campus chronicles
  const campusEntry = Object.entries(CAMPUS_ROUTE_MAP).find(([, val]) => val === colId);
  if (campusEntry) return `/suture/campus-chronicles/${campusEntry[0]}/${article.slug}`;

  // Check beyond the books
  const booksEntry = Object.entries(BOOKS_ROUTE_MAP).find(([, val]) => val === colId);
  if (booksEntry) return `/suture/beyond-the-books/${booksEntry[0]}/${article.slug}`;

  return `/suture`;
}

// ── Display name map ─────────────────────────────────────────────
export const COLLECTION_NAMES: Record<string, string> = {
  'clinical-case-corner':  'Clinical Case Corner',
  'decrypt-and-diagnose':  'Decrypt & Diagnose',
  'department-spotlight':  'Department Spotlight',
  'healers-wellness':      'Healers Wellness',
  'research-resource':     'Research Resource',
  'world-health':          'World Health',
  'clubs':                 'Clubs',
  'cultural':              'Cultural',
  'ncc':                   'NCC',
  'sports':                'Sports',
  'student-achievements':  'Student Achievements',
  'yrc':                   'YRC',
  'artwork':               'Artwork',
  'creative-writing':      'Creative Writing',
  'photography':           'Photography',
  'poetry':                'Poetry',
};

function extractWixImageSrc(srcObj: any): string {
  if (!srcObj) return '';
  if (typeof srcObj === 'string') return srcObj;
  if (typeof srcObj === 'object') {
    return srcObj.url || srcObj.id || srcObj.src || srcObj.uri || '';
  }
  return '';
}

function getGalleryLayoutType(node: any): string {
  const options = node.galleryData?.options ?? node.options ?? {};
  const layoutOptions = options.layout ?? {};

  const rawType =
    (typeof layoutOptions.type === 'string' && layoutOptions.type.trim()) ||
    (typeof options.type === 'string' && options.type.trim()) ||
    (typeof options.layoutType === 'string' && options.layoutType.trim()) ||
    (typeof node.layout === 'string' && node.layout.trim()) ||
    '';

  if (rawType) return rawType.toUpperCase();

  // Check numeric galleryLayout enum from Wix Draft/RichContent V1/V2
  const galleryLayoutEnum =
    options.galleryLayout ??
    layoutOptions.galleryLayout ??
    options.layout?.galleryLayout ??
    options.styles?.galleryLayout;

  if (typeof galleryLayoutEnum === 'number') {
    switch (galleryLayoutEnum) {
      case 0: return 'COLLAGE';
      case 1: return 'MASONRY';
      case 2: return 'GRID';
      case 3: return 'THUMBNAIL';
      case 4: return 'SLIDER';
      case 5: return 'SLIDESHOW';
      case 6: return 'PANORAMA';
      case 7: return 'COLUMNS';
      default: break;
    }
  }

  return 'GRID';
}

function resolveImageNodeSrc(node: any): string {
  if (!node) return '';
  const candidate =
    extractWixImageSrc(node.imageData?.image?.src) ||
    extractWixImageSrc(node.imageData?.src) ||
    extractWixImageSrc(node.imageData?.image) ||
    extractWixImageSrc(node.imageData?.media?.src) ||
    extractWixImageSrc(node.imageData?.media) ||
    extractWixImageSrc(node.imageData?.url) ||
    extractWixImageSrc(node.imageData?.id) ||
    extractWixImageSrc(node.imageData) ||
    extractWixImageSrc(node.src) ||
    extractWixImageSrc(node.url) ||
    extractWixImageSrc(node.media?.src) ||
    extractWixImageSrc(node.media?.url) ||
    extractWixImageSrc(node.fileData?.src) ||
    extractWixImageSrc(node.fileData?.url);
  return getWixImageUrl(candidate);
}

export function renderRichContent(body: any, isBeyondBooks = false): string {
  if (!body) return '';

  // If it's a string, it might be raw HTML or stringified JSON
  if (typeof body === 'string') {
    if (body.trim().startsWith('{') || body.trim().startsWith('[')) {
      try {
        body = JSON.parse(body);
      } catch {
        // It's pure HTML string, return it as-is
        return body;
      }
    } else {
      return body;
    }
  }

  // If it doesn't have nodes, we can't parse it as Wix Rich Content V2/V3 JSON
  if (!body || !Array.isArray(body.nodes)) {
    return '';
  }

  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function renderDecorations(text: string, decorations: any[]): string {
    if (!decorations || decorations.length === 0) {
      return escapeHtml(text);
    }

    let html = escapeHtml(text);
    // Apply decorations
    for (const dec of decorations) {
      if (dec.type === 'BOLD') {
        html = `<strong>${html}</strong>`;
      } else if (dec.type === 'ITALIC' || dec.italicData) {
        html = `<em>${html}</em>`;
      } else if (dec.type === 'UNDERLINE') {
        html = `<u>${html}</u>`;
      } else if (dec.type === 'LINK' && dec.linkData?.link?.url) {
        const url = dec.linkData.link.url;
        const target = dec.linkData.link.target === '_blank' ? ' target="_blank" rel="noopener noreferrer"' : '';
        html = `<a href="${url}"${target}>${html}</a>`;
      } else if (dec.type === 'COLOR' && dec.colorData?.foreground) {
        // Filter out white foreground styles that would be invisible on our light background
        let color = dec.colorData.foreground;
        if (color.toUpperCase() === '#FFFFFF' || color.toUpperCase() === 'RGB(255, 255, 255)') {
          color = 'inherit';
        }
        html = `<span style="color: ${color};">${html}</span>`;
      }
    }
    return html;
  }

  function renderNode(node: any): string {
    if (!node) return '';

    switch (node.type) {
      case 'PARAGRAPH': {
        const align = node.paragraphData?.textStyle?.textAlignment;
        const styleAttr = align && align !== 'AUTO' ? ` style="text-align: ${align.toLowerCase()};"` : '';
        
        let textContents = '';
        let imageElements = '';

        if (Array.isArray(node.nodes)) {
          for (const child of node.nodes) {
            if (child.type === 'IMAGE' || child.type === 'image' || child.type === 'PICTURE' || child.type === 'MEDIA') {
              imageElements += renderNode(child);
            } else {
              textContents += renderNode(child);
            }
          }
        }

        const pBlock = textContents.trim() ? `<p${styleAttr}>${textContents}</p>` : '';
        return pBlock + imageElements;
      }

      case 'HEADING': {
        const level = node.headingData?.level ?? 2;
        const align = node.headingData?.textStyle?.textAlignment;
        const styleAttr = align && align !== 'AUTO' ? ` style="text-align: ${align.toLowerCase()};"` : '';
        const content = (node.nodes || []).map(renderNode).join('');
        return `<h${level}${styleAttr}>${content}</h${level}>`;
      }

      case 'TEXT': {
        const text = node.textData?.text ?? '';
        const decorations = node.textData?.decorations ?? [];
        return renderDecorations(text, decorations);
      }

      case 'IMAGE':
      case 'image':
      case 'PICTURE':
      case 'picture':
      case 'MEDIA':
      case 'media': {
        const imgUrl = resolveImageNodeSrc(node);
        if (!imgUrl) return '';
        const alt = node.imageData?.altText ?? node.imageData?.alt ?? node.altText ?? node.alt ?? '';
        
        // 1. Caption extraction (rich formatted caption in child node or string fallback)
        let captionHtml = '';
        if (Array.isArray(node.nodes) && node.nodes.length > 0) {
          const captionNode = node.nodes.find((n: any) => n.type === 'CAPTION' || n.type === 'caption');
          if (captionNode) {
            captionHtml = (captionNode.nodes || []).map(renderNode).join('');
          }
        }
        if (!captionHtml) {
          const captionStr = node.imageData?.caption ?? node.caption ?? node.title ?? '';
          if (captionStr) captionHtml = escapeHtml(captionStr);
        }
        const figCaption = captionHtml ? `<figcaption class="article-image-caption">${captionHtml}</figcaption>` : '';

        // 2. Container alignment & width properties
        const containerData = node.imageData?.containerData ?? node.containerData ?? {};
        const alignment = (containerData.alignment ?? node.imageData?.alignment ?? node.alignment ?? 'CENTER').toLowerCase();
        const widthData = containerData.width ?? {};
        const widthSize = String(widthData.size ?? node.imageData?.displayMode ?? node.displayMode ?? '').toUpperCase();
        const customWidth = widthData.custom;
        const textWrap = Boolean(containerData.textWrap ?? true);

        // 3. Natural Image Dimensions
        const naturalWidth = node.imageData?.image?.width ?? node.imageData?.width;
        const naturalHeight = node.imageData?.image?.height ?? node.imageData?.height;

        let alignClass = `align-${alignment}`;
        const figureStyles: string[] = [];
        const imgStyles: string[] = [];

        if (textWrap && (alignment === 'left' || alignment === 'right')) {
          alignClass += ' text-wrap';
        }

        // Custom width set in CMS editor (e.g. "304", "200", "50%")
        if (customWidth !== undefined && customWidth !== null && customWidth !== '') {
          const widthStr = String(customWidth).trim();
          const parsedWidth = /^\d+$/.test(widthStr) ? `${widthStr}px` : widthStr;
          figureStyles.push(`width: ${parsedWidth}; max-width: 100%;`);
        } else if (widthSize === 'SMALL') {
          alignClass += ' size-small';
          figureStyles.push('width: 340px; max-width: 100%;');
        } else if (widthSize === 'MEDIUM') {
          alignClass += ' size-medium';
          figureStyles.push('width: 580px; max-width: 100%;');
        } else if (widthSize === 'FULL_WIDTH' || widthSize === 'PANORAMA' || alignment === 'full_width' || alignment === 'full' || alignment === 'panorama') {
          alignClass = 'align-full-width';
        } else if (naturalWidth && (widthSize === 'CONTENT' || widthSize === 'ORIGINAL')) {
          figureStyles.push(`max-width: ${naturalWidth}px; width: 100%;`);
        }

        if (naturalWidth && naturalHeight) {
          imgStyles.push(`aspect-ratio: ${naturalWidth} / ${naturalHeight};`);
        }

        const figStyleAttr = figureStyles.length > 0 ? ` style="${figureStyles.join(' ')}"` : '';
        const imgStyleAttr = imgStyles.length > 0 ? ` style="${imgStyles.join(' ')}"` : '';

        const plainCaption = node.imageData?.caption ?? node.caption ?? node.title ?? alt;

        return `<figure class="article-image ${alignClass}"${figStyleAttr}><img src="${imgUrl}" alt="${escapeHtml(alt)}" data-lightbox-src="${imgUrl}" data-caption="${escapeHtml(plainCaption)}" loading="lazy"${imgStyleAttr} onerror="this.parentElement.style.display='none'" />${figCaption}</figure>`;
      }

      case 'GALLERY':
      case 'gallery': {
        const items = node.galleryData?.items ?? node.items ?? [];
        if (!Array.isArray(items) || items.length === 0) return '';

        const options = node.galleryData?.options ?? node.options ?? {};
        const layoutOptions = options.layout ?? {};
        const itemOptions = options.item ?? {};
        const thumbOptions = options.thumbnails ?? {};
        const containerData = node.containerData ?? {};

        const layoutType = getGalleryLayoutType(node);
        const numColumns = layoutOptions.numberOfColumns ?? Math.min(Math.max(items.length, 1), 3);
        const cropMode = (itemOptions.crop ?? 'FILL').toUpperCase();
        const targetRatio = itemOptions.ratio;
        const thumbPlacement = (thumbOptions.placement ?? 'BOTTOM').toUpperCase();
        const alignment = (containerData.alignment ?? 'CENTER').toLowerCase();

        let imageStyle = '';
        if (cropMode === 'FIT') {
          imageStyle += 'object-fit: contain; background: var(--color-surface-hover); ';
        } else {
          imageStyle += 'object-fit: cover; ';
        }

        if (targetRatio && targetRatio > 0) {
          imageStyle += `aspect-ratio: ${targetRatio}; `;
        }

        const validItems = items.filter((item: any) => {
          const rawSrc =
            extractWixImageSrc(item.image?.media?.src) ||
            extractWixImageSrc(item.image?.src) ||
            extractWixImageSrc(item.media?.src) ||
            extractWixImageSrc(item.src) ||
            extractWixImageSrc(item.url);
          return Boolean(rawSrc);
        });

        if (validItems.length === 0) return '';

        const parsedItems = validItems.map((item: any, idx: number) => {
          const rawSrc =
            extractWixImageSrc(item.image?.media?.src) ||
            extractWixImageSrc(item.image?.src) ||
            extractWixImageSrc(item.media?.src) ||
            extractWixImageSrc(item.src) ||
            extractWixImageSrc(item.url);
          const imgUrl = getWixImageUrl(rawSrc);
          const caption = item.title ?? item.caption ?? item.altText ?? '';
          const width = item.image?.media?.width ?? 1200;
          const height = item.image?.media?.height ?? 800;
          return { imgUrl, caption, width, height, idx };
        });

        const alignClass = alignment === 'full_width' ? 'gallery-full-width' : '';

        // Mode 1: Collage Layout Preset
        if (layoutType === 'COLLAGE') {
          const first = parsedItems[0];
          const rest = parsedItems.slice(1);
          const restHtml = rest
            .map(
              (p: any) => `
            <figure class="article-gallery-collage__item">
              <img src="${p.imgUrl}" alt="${escapeHtml(p.caption)}" data-lightbox-src="${p.imgUrl}" data-caption="${escapeHtml(p.caption)}" loading="lazy" style="${imageStyle}" onerror="this.parentElement.style.display='none'" />
              ${p.caption ? `<figcaption class="article-gallery-caption">${escapeHtml(p.caption)}</figcaption>` : ''}
            </figure>
          `
            )
            .join('');

          return `
            <div class="article-gallery-collage ${alignClass}">
              <figure class="article-gallery-collage__hero">
                <img src="${first.imgUrl}" alt="${escapeHtml(first.caption)}" data-lightbox-src="${first.imgUrl}" data-caption="${escapeHtml(first.caption)}" loading="lazy" style="${imageStyle}" onerror="this.parentElement.style.display='none'" />
                ${first.caption ? `<figcaption class="article-gallery-caption">${escapeHtml(first.caption)}</figcaption>` : ''}
              </figure>
              ${rest.length > 0 ? `<div class="article-gallery-collage__grid">${restHtml}</div>` : ''}
            </div>
          `;
        }

        // Mode 2: Panoramic Gallery Layout
        if (layoutType === 'PANORAMA' || layoutType === 'SLIDESHOW_PANORAMA') {
          const itemsHtml = parsedItems
            .map(
              (p: any) => `
            <figure class="article-gallery-panorama__item">
              <div class="panorama-img-wrap">
                <img src="${p.imgUrl}" alt="${escapeHtml(p.caption)}" data-lightbox-src="${p.imgUrl}" data-caption="${escapeHtml(p.caption)}" loading="lazy" style="${imageStyle}" onerror="this.parentElement.parentElement.style.display='none'" />
              </div>
              ${p.caption ? `<figcaption class="article-gallery-caption">${escapeHtml(p.caption)}</figcaption>` : ''}
            </figure>
          `
            )
            .join('');

          return `
            <div class="article-gallery-panorama ${alignClass}">
              <div class="panorama-stack">
                ${itemsHtml}
              </div>
            </div>
          `;
        }

        // Mode 3: Slider Track Preset (Wix Pro Gallery Slider)
        if (layoutType === 'SLIDER') {
          const itemsHtml = parsedItems
            .map((p: any) => {
              const itemRatio =
                targetRatio && targetRatio > 0
                  ? String(targetRatio)
                  : p.width && p.height
                  ? `${p.width} / ${p.height}`
                  : '16 / 9';

              const fitStyle =
                cropMode === 'FIT'
                  ? 'object-fit: contain; background: var(--color-surface-hover);'
                  : 'object-fit: cover;';

              const itemStyle = `${fitStyle} aspect-ratio: ${itemRatio}; width: 100%; height: 100%;`;
              const wrapStyle = `aspect-ratio: ${itemRatio}; width: 100%;`;

              return `
            <figure class="article-gallery-slider__item">
              <div class="slider-img-wrap" style="${wrapStyle}">
                <img src="${p.imgUrl}" alt="${escapeHtml(p.caption)}" data-lightbox-src="${p.imgUrl}" data-caption="${escapeHtml(p.caption)}" loading="lazy" style="${itemStyle}" onerror="this.parentElement.parentElement.style.display='none'" />
              </div>
              ${p.caption ? `<figcaption class="article-gallery-caption">${escapeHtml(p.caption)}</figcaption>` : ''}
            </figure>
          `;
            })
            .join('');

          return `
            <div class="article-gallery-slider-wrap ${alignClass}" data-gallery-slider>
              <div class="article-gallery-slider__track">
                ${itemsHtml}
              </div>
              ${
                parsedItems.length > 1
                  ? `
                <button type="button" class="slider-btn prev" aria-label="Scroll left">‹</button>
                <button type="button" class="slider-btn next" aria-label="Scroll right">›</button>
              `
                  : ''
              }
            </div>
          `;
        }

        // Mode 4: Multi-Column Preset
        if (layoutType === 'COLUMNS') {
          const itemsHtml = parsedItems
            .map(
              (p: any) => `
            <figure class="article-gallery-columns__item">
              <img src="${p.imgUrl}" alt="${escapeHtml(p.caption)}" data-lightbox-src="${p.imgUrl}" data-caption="${escapeHtml(p.caption)}" loading="lazy" style="${imageStyle}" onerror="this.parentElement.style.display='none'" />
              ${p.caption ? `<figcaption class="article-gallery-caption">${escapeHtml(p.caption)}</figcaption>` : ''}
            </figure>
          `
            )
            .join('');

          return `<div class="article-gallery-columns cols-${numColumns} ${alignClass}">${itemsHtml}</div>`;
        }

        // Mode 5: Fullsize / Slideshow / Thumbnail Preset
        if (layoutType === 'FULLSIZE' || layoutType === 'THUMBNAIL' || layoutType === 'SLIDESHOW') {
          const first = parsedItems[0];
          const showThumbs = thumbPlacement !== 'NONE' && parsedItems.length > 1;
          const thumbsHtml = parsedItems
            .map(
              (p: any, i: number) => `
            <button type="button" class="gallery-thumb-btn ${i === 0 ? 'active' : ''}" data-index="${i}" data-src="${p.imgUrl}" data-caption="${escapeHtml(p.caption)}">
              <img src="${p.imgUrl}" alt="${escapeHtml(p.caption)}" loading="lazy" />
            </button>
          `
            )
            .join('');

          return `
            <div class="article-gallery-fullsize ${alignClass}" data-gallery-slideshow>
              <div class="gallery-main-stage">
                <img src="${first.imgUrl}" alt="${escapeHtml(first.caption)}" data-lightbox-src="${first.imgUrl}" data-caption="${escapeHtml(first.caption)}" class="gallery-main-img" style="${imageStyle}" />
                <div class="gallery-main-caption">${escapeHtml(first.caption)}</div>
                ${
                  parsedItems.length > 1
                    ? `
                  <button type="button" class="gallery-nav-btn prev" aria-label="Previous image">‹</button>
                  <button type="button" class="gallery-nav-btn next" aria-label="Next image">›</button>
                  <div class="gallery-counter"><span class="current-idx">1</span> / ${parsedItems.length}</div>
                `
                    : ''
                }
              </div>
              <div class="gallery-thumbs-track" ${!showThumbs ? 'style="display: none;"' : ''}>${thumbsHtml}</div>
            </div>
          `;
        }

        // Mode 6: Masonry Preset
        if (layoutType === 'MASONRY') {
          const itemsHtml = parsedItems
            .map(
              (p: any) => `
            <figure class="article-gallery-masonry__item">
              <img src="${p.imgUrl}" alt="${escapeHtml(p.caption)}" data-lightbox-src="${p.imgUrl}" data-caption="${escapeHtml(p.caption)}" loading="lazy" style="${imageStyle ? imageStyle : `aspect-ratio: ${p.width} / ${p.height};`}" onerror="this.parentElement.style.display='none'" />
              ${p.caption ? `<figcaption class="article-gallery-caption">${escapeHtml(p.caption)}</figcaption>` : ''}
            </figure>
          `
            )
            .join('');
          return `<div class="article-gallery-masonry ${alignClass}">${itemsHtml}</div>`;
        }

        // Mode 7: Grid Preset (Default)
        const itemsHtml = parsedItems
          .map(
            (p: any) => `
          <figure class="article-gallery-grid__item">
            <img src="${p.imgUrl}" alt="${escapeHtml(p.caption)}" data-lightbox-src="${p.imgUrl}" data-caption="${escapeHtml(p.caption)}" loading="lazy" style="${imageStyle}" onerror="this.parentElement.style.display='none'" />
            ${p.caption ? `<figcaption class="article-gallery-caption">${escapeHtml(p.caption)}</figcaption>` : ''}
          </figure>
        `
          )
          .join('');
        return `<div class="article-gallery-grid cols-${numColumns} ${alignClass}">${itemsHtml}</div>`;
      }

      case 'BULLETED_LIST': {
        const content = (node.nodes || []).map(renderNode).join('');
        return `<ul>${content}</ul>`;
      }

      case 'ORDERED_LIST': {
        const content = (node.nodes || []).map(renderNode).join('');
        return `<ol>${content}</ol>`;
      }

      case 'LIST_ITEM': {
        const content = (node.nodes || []).map(renderNode).join('');
        return `<li>${content}</li>`;
      }

      case 'DIVIDER': {
        return `
          <div class="article-section-divider" data-section-divider>
            <div class="section-divider__line"></div>
            <div class="section-divider__bar">
              <button type="button" class="section-divider__btn prev" data-action="slide-prev-section" aria-label="Previous Section">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                <span>Previous Section</span>
              </button>
              <span class="section-divider__badge">Article Section</span>
              <button type="button" class="section-divider__btn next" data-action="slide-next-section" aria-label="Next Section">
                <span>Next Section</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            </div>
          </div>
        `;
      }

      case 'COLLAPSIBLE_LIST':
      case 'ACCORDION':
      case 'EXPANDABLE': {
        const titleText =
          node.collapsibleListData?.title ??
          node.collapsibleItemData?.title ??
          node.title ??
          '';
        const titleHeader = titleText
          ? `<h3 class="article-accordion-group__title">${escapeHtml(titleText)}</h3>`
          : '';
        const content = (node.nodes || []).map(renderNode).join('');
        return `<div class="article-accordion-group">${titleHeader}${content}</div>`;
      }

      case 'COLLAPSIBLE_ITEM':
      case 'COLLAPSIBLE_PAIR':
      case 'ACCORDION_ITEM': {
        let titleText =
          node.collapsibleItemData?.title ??
          node.collapsibleItemData?.label ??
          node.title ??
          node.label ??
          node.heading ??
          '';

        let childNodes = Array.isArray(node.nodes) ? [...node.nodes] : [];
        let contentNodes = childNodes;

        // If titleText is not explicitly set on collapsibleItemData, extract title from first child node
        if (!titleText && childNodes.length > 0) {
          const firstText = extractTextFromRichContent(childNodes[0]);
          if (firstText && firstText.trim()) {
            titleText = firstText.trim();
            contentNodes = childNodes.slice(1);
          }
        }

        // If titleText was explicitly set, check if first child node is just a duplicate of titleText
        if (titleText && childNodes.length > 0) {
          const firstText = extractTextFromRichContent(childNodes[0]);
          if (firstText && firstText.trim() === titleText.trim()) {
            contentNodes = childNodes.slice(1);
          }
        }

        if (!titleText) {
          titleText = 'Section Details';
        }

        const isExpanded = node.collapsibleItemData?.expanded ?? false;
        const openAttr = isExpanded ? ' open' : '';
        const contentHtml = contentNodes.map(renderNode).join('');

        return `
          <details class="article-accordion"${openAttr}>
            <summary class="article-accordion__summary">
              <span class="article-accordion__title">${escapeHtml(titleText)}</span>
              <span class="article-accordion__chevron">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </span>
            </summary>
            <div class="article-accordion__content">${contentHtml}</div>
          </details>
        `;
      }

      case 'BLOCKQUOTE': {
        const content = (node.nodes || []).map(renderNode).join('');
        return `<blockquote>${content}</blockquote>`;
      }

      case 'CODE_BLOCK': {
        const content = (node.nodes || []).map(renderNode).join('');
        return `<pre><code>${content}</code></pre>`;
      }

      case 'TABLE': {
        const content = (node.nodes || []).map(renderNode).join('');
        return `<div class="article-table-wrap"><table>${content}</table></div>`;
      }
      case 'TABLE_ROW': {
        const content = (node.nodes || []).map(renderNode).join('');
        return `<tr>${content}</tr>`;
      }
      case 'TABLE_CELL': {
        const content = (node.nodes || []).map(renderNode).join('');
        return `<td>${content}</td>`;
      }

      case 'VIDEO': {
        const src = node.videoData?.video?.src?.url ?? node.videoData?.src?.url ?? '';
        if (!src) return '';
        if (src.includes('youtube.com') || src.includes('youtu.be')) {
          let embedUrl = src;
          const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
          const match = src.match(regExp);
          if (match && match[2].length === 11) {
            embedUrl = `https://www.youtube.com/embed/${match[2]}`;
          }
          return `<div class="article-video"><iframe src="${embedUrl}" frameborder="0" allowfullscreen></iframe></div>`;
        }
        return `<div class="article-video"><video src="${src}" controls></video></div>`;
      }

      default:
        // Render children nodes if any
        if (Array.isArray(node.nodes) && node.nodes.length > 0) {
          return node.nodes.map(renderNode).join('');
        }
        return '';
    }
  }

  return body.nodes.map(renderNode).join('');
}

// ── Team Members (Board, Design Team, Photo Team) ─────────────────
export interface AboutMember {
  _id: string;
  name: string;
  role: string;
  bio: string;
  photo?: string;
}

function getManualSortVal(item: any): string | null {
  const data = item.data ? { ...item, ...item.data } : item;
  for (const key of Object.keys(data)) {
    if (key.startsWith('_manualSort')) {
      return String(data[key]);
    }
  }
  return null;
}

export async function getTeamMembers(collectionId: string): Promise<AboutMember[]> {
  return getCached(`team:${collectionId}`, async () => {
    const candidateIds = Array.from(new Set([collectionId, ...(CANDIDATE_COLLECTION_IDS[collectionId] || [])]));

    for (const candidate of candidateIds) {
      try {
        const response = (await withTimeout(
          wixClient.items
            .query(candidate)
            .find(),
          8000
        )) as any;

        if (response?.items && response.items.length > 0) {
          const sortedItems = [...response.items].sort((a: any, b: any) => {
            const valA = getManualSortVal(a);
            const valB = getManualSortVal(b);

            if (valA !== null && valB !== null) {
              if (valA < valB) return -1;
              if (valA > valB) return 1;
              return new Date(a._createdDate).getTime() - new Date(b._createdDate).getTime();
            }
            if (valA !== null) return -1;
            if (valB !== null) return 1;
            return new Date(a._createdDate).getTime() - new Date(b._createdDate).getTime();
          });

          return sortedItems.map((item: any) => {
            const data = item.data ? { ...item, ...item.data } : item;
            const rawPhoto =
              data.profilePicture ??
              data.photo?.url ??
              data.photo ??
              data.image?.url ??
              data.image ??
              data.picture ??
              data.avatar ??
              undefined;

            const rawBio =
              data.bio ??
              data.about ??
              data.description ??
              data.details ??
              data.summary ??
              data.longDescription ??
              '';
            const extractedBio = extractTextFromRichContent(rawBio);

            const name =
              data.fullName ??
              data.name ??
              data.memberName ??
              data.personName ??
              data.title ??
              'Member';

            const role =
              data.role ??
              data.position ??
              data.designation ??
              data.title ??
              '';

            return {
              _id: item._id,
              name,
              role,
              bio: extractedBio || (typeof rawBio === 'string' ? rawBio : ''),
              photo: rawPhoto ? getWixImageUrl(rawPhoto) : undefined,
            };
          });
        }
      } catch (err) {
        console.warn(`[CMS] Error fetching team members from "${candidate}":`, err);
      }
    }
    return [];
  });
}

export async function getAboutMembers(): Promise<AboutMember[]> {
  return getTeamMembers(COLLECTION_IDS.aboutUs);
}

export async function getDesignTeamMembers(): Promise<AboutMember[]> {
  return getTeamMembers(COLLECTION_IDS.designTeam);
}

export async function getPhotoTeamMembers(): Promise<AboutMember[]> {
  return getTeamMembers(COLLECTION_IDS.photoTeam);
}

// ── Article Photos Extraction Helper ────────────────────────────
export interface ArticlePhoto {
  id: string;
  img: string;
  url?: string;
  text?: string;
  caption?: string;
  height?: number;
}

export function extractArticlePhotos(article: Article): ArticlePhoto[] {
  const photos: ArticlePhoto[] = [];
  const seenUrls = new Set<string>();

  function addPhoto(src: string, caption?: string) {
    if (!src) return;
    const url = getWixImageUrl(src);
    if (!url || url.includes('/images/logo.png') || seenUrls.has(url)) return;
    seenUrls.add(url);
    photos.push({
      id: `photo-${photos.length + 1}`,
      img: url,
      url: url,
      text: caption || `Photo ${photos.length + 1}`,
      caption,
      height: 350 + ((photos.length * 17) % 300),
    });
  }

  let body = article.body;
  if (body) {
    if (typeof body === 'string') {
      if (body.trim().startsWith('{') || body.trim().startsWith('[')) {
        try {
          body = JSON.parse(body);
        } catch {
          // keep as string
        }
      }
    }

    if (typeof body === 'string') {
      const imgMatches = Array.from(body.matchAll(/<img[^>]+src=["']([^"']+)["']/gi));
      for (const match of imgMatches) {
        if (match[1]) addPhoto(match[1]);
      }
    } else if (body && Array.isArray(body.nodes)) {
      function walkNodes(nodes: any[]) {
        for (const node of nodes) {
          if (node.type === 'IMAGE') {
            const src = node.imageData?.image?.src?.url ?? node.imageData?.src?.url;
            const caption = node.imageData?.caption;
            if (src) addPhoto(src, caption);
          } else if (node.type === 'GALLERY') {
            const items = node.galleryData?.items ?? [];
            for (const item of items) {
              const src = item.image?.media?.src?.url ?? item.image?.src?.url;
              const caption = item.title ?? item.caption;
              if (src) addPhoto(src, caption);
            }
          }
          if (Array.isArray(node.nodes)) {
            walkNodes(node.nodes);
          }
        }
      }
      walkNodes(body.nodes);
    }
  }

  return photos;
}

// Helper to extract plain text from Wix Rich Content JSON object or HTML string
export function extractTextFromRichContent(body: any): string {
  if (!body) return '';
  let doc = body;
  if (typeof body === 'string') {
    const trimmed = body.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        doc = JSON.parse(trimmed);
      } catch {
        return body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      }
    } else {
      return body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }
  }

  const parts: string[] = [];
  if (doc && Array.isArray(doc.nodes)) {
    function walk(nodes: any[]) {
      for (const node of nodes) {
        if (node.type === 'TEXT' && node.textData?.text) {
          parts.push(node.textData.text);
        }
        if (Array.isArray(node.nodes)) {
          walk(node.nodes);
        }
      }
    }
    walk(doc.nodes);
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

// ── Events Data Helper ───────────────────────────────────────────
export interface EventItem {
  id: string;
  day: string;
  month: string;
  badge: string;
  title: string;
  description: string;
  time: string;
  location: string;
  href: string;
  coverImage?: string;
  author?: string;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export async function getEvents(limit = 6): Promise<EventItem[]> {
  try {
    let rawItems: any[] = [];
    
    // Candidate collection IDs created in Wix CMS
    const eventCollectionCandidates = ['Events', 'Event', 'LitclubEvents', 'CampusEvents', 'LitClubEvents', 'UpcomingEvents'];

    for (const colId of eventCollectionCandidates) {
      try {
        const response = (await withTimeout(
          wixClient.items.query(colId).limit(limit).descending('_createdDate').find(),
          4000
        )) as any;
        if (response?.items?.length) {
          rawItems = response.items;
          break;
        }
      } catch {
        // Silent catch for collection ID trial
      }
    }

    // Fallback to Campus Chronicles collections if no dedicated Event collection returned items
    if (rawItems.length === 0) {
      const [clubs, cultural, sports] = await Promise.all([
        getArticles(COLLECTION_IDS.clubs, 3),
        getArticles(COLLECTION_IDS.cultural, 3),
        getArticles(COLLECTION_IDS.sports, 3),
      ]);
      rawItems = [...cultural, ...clubs, ...sports].sort(
        (a, b) => new Date(b._createdDate).getTime() - new Date(a._createdDate).getTime()
      ).slice(0, limit);
    }

    return rawItems.map((item) => {
      const data = item.data ? { ...item, ...item.data } : item;
      const rawDate = data.eventDate || data.date || data.startDate || data.event_date || item._createdDate || Date.now();
      const dateObj = new Date(rawDate);
      const day = isNaN(dateObj.getDate()) ? '15' : String(dateObj.getDate()).padStart(2, '0');
      const month = isNaN(dateObj.getMonth()) ? 'Jul' : MONTH_NAMES[dateObj.getMonth()] || 'Jul';

      const title = data.topic || data.title || data.eventName || data.name || data.eventTitle || data.subject || data.heading || 'Upcoming Event';
      
      let badge = data.badge || data.category || data.type || data.section;
      if (!badge) {
        if (title.toLowerCase().includes('debate')) badge = 'Debate';
        else if (title.toLowerCase().includes('poetry')) badge = 'Poetry Slam';
        else if (title.toLowerCase().includes('workshop')) badge = 'Workshop';
        else if (title.toLowerCase().includes('symposium')) badge = 'Symposium';
        else badge = 'Event';
      }

      let extractedText = extractTextFromRichContent(data.description || data.body || data.longDescription || data.summary || data.details);
      if (!extractedText) {
        extractedText = title;
      }

      let description = extractedText;
      if (description.length > 150) {
        description = description.substring(0, 147) + '...';
      }

      const rawCover = data.coverImage?.url || data.coverImage || data.image?.url || data.image || data.eventImage || data.photo;

      return {
        id: item._id || Math.random().toString(),
        day,
        month,
        badge,
        title,
        description: description || 'Join us for an exciting event at PSGIMSR.',
        time: data.time || data.eventTime || data.timing || (data.author ? `By ${data.author}` : '5:00 PM'),
        location: data.location || data.venue || data.place || 'PSGIMSR Campus',
        href: '', // Non-clickable, does not lead anywhere
        coverImage: rawCover ? getWixImageUrl(rawCover) : undefined,
        author: data.author,
      };
    });
  } catch (err) {
    console.warn('[CMS] Error fetching events:', err);
    return [];
  }
}



