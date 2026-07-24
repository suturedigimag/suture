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

  // About Us
  aboutUs:               'AboutUs',
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

async function withTimeout<T>(promise: Promise<T>, timeoutMs = 8000): Promise<T> {
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

function slugify(text: string): string {
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

/**
 * Fetch N most recent articles from a collection.
 */
export async function getArticles(
  collectionId: string,
  limit = 6,
): Promise<Article[]> {
  try {
    const response = (await withTimeout(
      wixClient.items
        .query(collectionId)
        .limit(limit)
        .descending('_createdDate')
        .find(),
      8000
    )) as any;

    const items = response.items.map((item: any) => mapItem(item, collectionId));
    return items;
  } catch (err) {
    console.warn(`[CMS] Query error or timeout fetching "${collectionId}":`, err);
    return [];
  }
}

/**
 * Fetch a single article by slug from a collection.
 */
export async function getArticleBySlug(
  collectionId: string,
  slug: string,
): Promise<Article | null> {
  try {
    const response = (await withTimeout(
      wixClient.items
        .query(collectionId)
        .limit(100)
        .find(),
      8000
    )) as any;

    const mappedItems = response.items.map((item: any) => mapItem(item, collectionId));
    const targetSlug = slugify(decodeURIComponent(slug));

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

    return found ?? null;
  } catch (err) {
    console.warn(`[CMS] Error fetching article by slug "${slug}" from "${collectionId}":`, err);
    return null;
  }
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
    ([key]) => key !== 'aboutUs',
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

// ── Fallback Mock Data Generator ─────────────────────────────────

const FALLBACK_ARTICLES: Record<string, Article[]> = {};

function getFallbackArticles(collectionId: string, limit: number): Article[] {
  return [];
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
        const content = (node.nodes || []).map(renderNode).join('');
        return `<p${styleAttr}>${content}</p>`;
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

      case 'IMAGE': {
        const src = node.imageData?.image?.src?.url ?? node.imageData?.src?.url ?? '';
        if (!src) return '';
        const imgUrl = getWixImageUrl(src);
        const alt = node.imageData?.altText ?? '';
        const caption = node.imageData?.caption ?? '';
        const figCaption = caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : '';
        return `<figure class="article-image"><img src="${imgUrl}" alt="${escapeHtml(alt)}" data-lightbox-src="${imgUrl}" data-caption="${escapeHtml(caption)}" loading="lazy" onerror="this.parentElement.style.display='none'" />${figCaption}</figure>`;
      }

      case 'GALLERY': {
        // Handled cleanly by ArticleGallery component in ArticleLayout
        return '';
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
        return `<hr class="article-divider" />`;
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

// ── About Us (Board Members) ──────────────────────────────────────
export interface AboutMember {
  _id: string;
  name: string;
  role: string;
  bio: string;
  photo?: string;
}

export async function getAboutMembers(): Promise<AboutMember[]> {
  try {
    const response = (await withTimeout(
      wixClient.items
        .query(COLLECTION_IDS.aboutUs)
        .find(),
      8000
    )) as any;

    if (response.items && response.items.length > 0) {
      return response.items.map((item: any) => {
        const data = item.data ? { ...item, ...item.data } : item;
        const rawPhoto = data.profilePicture ?? data.photo?.url ?? data.photo ?? data.image?.url ?? data.image ?? undefined;
        return {
          _id: item._id,
          name: data.fullName ?? data.name ?? 'Untitled',
          role: data.role ?? '',
          bio: data.bio ?? '',
          photo: rawPhoto ? getWixImageUrl(rawPhoto) : undefined,
        };
      });
    }
    return [];
  } catch (err) {
    console.warn(`[CMS] Error fetching About Us members:`, err);
    return [];
  }
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

