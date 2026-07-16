# The Suture

**The Suture** is the independent digital editorial publication of the **Literature Club**. It is designed to showcase student voices at the intersection of medicine, campus chronicles, and creative expression.

The project is built as a headless frontend consuming Wix CMS collections in real-time, utilizing modern static prerendering and high-performance server-side capabilities.

---

## 🚀 Technology Stack

1. **Framework**: [Astro 5](https://astro.build/) (Static prerendering with server/hybrid routing).
2. **CMS Integration**: Wix Headless SDK (`@wix/sdk` and `@wix/data`) fetching live database collections dynamically.
3. **Styling**: Pure CSS with a custom variable-based utility and layout system for maximum performance, responsiveness, and clean aesthetics.
4. **Typography**: Editorial typography (Serif headings via *Libre Baskerville* + Modern sans-serif body copy via *Outfit*).

---

## 📂 Project Structure

```text
/
├── public/                  # Static assets (Suture brand logos, etc.)
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── EditorialCard.astro  # Card rendering articles (conditionally hides images for Beyond The Books)
│   │   ├── Footer.astro         # Suture footer (with mobile-optimized logo and contact links)
│   │   ├── Nav.astro            # Sticky header navigation with Mega Menu
│   │   ├── AuthorBlock.astro    # Metadata bar for authors & publish dates
│   │   └── SubmissionCTA.astro  # Sticky submission invitation panel
│   ├── layouts/
│   │   ├── Base.astro           # Global document shell, SEO metadata, and fonts
│   │   ├── PageLayout.astro     # Standard page wrapper
│   │   └── ArticleLayout.astro  # Dynamic article layout with reading progress indicator
│   ├── lib/
│   │   ├── cms.ts               # Core CMS mapping, Wix Client configuration, and custom Ricos renderer
│   │   └── wix.ts               # Wix Client SDK initializer
│   └── pages/
│       ├── suture/              # Suture namespace routes
│       │   ├── about.astro      # About & Board members page (connected directly to Wix CMS)
│       │   ├── write-for-us.astro # Guidelines and client-side mailto draft intake form
│       │   ├── index.astro      # Publication homepage (dynamic Hero & Featured order by date)
│       │   ├── sections/        # Section-specific categories
│       │   ├── campus-chronicles/ # Club activities, sports, cultural events
│       │   └── beyond-the-books/  # Art, photography, and creative writing lists
│       └── index.astro          # Literature Club parent landing page
├── package.json
└── tsconfig.json
```

---

## ⚙️ Wix CMS Integration Details

### Database Mapping & Routing
Wix CMS collection IDs are registered inside `src/lib/cms.ts`. Data is fetched directly using the Wix Client and mapped to local TypeScript `Article` types:
- **Team/Board**: Connected directly to the `AboutUs` collection, dynamically mapping the board members' `fullName`, `role`, `profilePicture`, and `bio`.
- **Dynamic Slug Resolution**: Items in Wix collections lack a standard `slug` field. The router dynamically extracts the slug by parsing Wix's auto-generated title-link attributes (e.g. `link-cultural-title`).
- **In-Memory Slug Matching**: For maximum routing stability against special characters (colons, spaces, dashes), `getArticleBySlug()` fetches the collection items and filters in-memory using matching checks against the exact slug, item ID, or slugified title variations.

### Ricos Rich Content Renderer
Wix CMS rich text fields are stored in the Ricos JSON tree format. A custom renderer (`renderRichContent` in `src/lib/cms.ts`) transforms these trees into clean, semantic HTML:
- **Media Support**: Embedded Wix images, multi-image galleries, bulleted/ordered lists, blockquotes, horizontal dividers, preformatted code blocks, and scrollable tables.
- **Embedded Videos**: Automatically parses YouTube video watch links, converts them to embed links, and displays them inside responsive video frames (alongside direct MP4 player fallbacks).

---

## 🎨 Branding & Design DNA

- **Aesthetics**: Premium editorial layout utilizing curated off-white background (#FAFAF8) for a warm, comfortable reading experience.
- **Color Accents**: Medical crimson red (`#C1121F`) used selectively for category eyebrows, CTA highlights, and hover transitions.
- **Motion Guidelines**: Animations are meaningful and improve storytelling. Scroll-activated fade/translate reveals are powered by clean CSS transitions and Intersection Observers.

---


