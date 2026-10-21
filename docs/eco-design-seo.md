# Eco-design and SEO choices

Covers issue **#80**. Figures come from `npm run build` in `frontend/` (production build).

## Eco-design

| Choice | Why |
|---|---|
| System font stack (no web font) | No font file to download; text renders immediately. |
| Photos in WebP, 16–43 KB each | About 4× lighter than the original JPEGs; the home page loads about 240 KB of photos in total, the auth pages one photo (25–30 KB). |
| Two widths only, and only for the hero photo (`srcset` 480 / 800 px) | The browser downloads the smaller one on phones. |
| `loading="lazy"` on every photo except the hero, `decoding="async"`, `fetchpriority="high"` on the hero | Photos below the fold are not fetched until needed. |
| `width` / `height` on every image | No layout shift while images load. |
| Interface icons and logo as inline SVG | No image request, no icon library. |
| No animation library, `motion-reduce` respected | Less CPU and battery, and safer for sensitive users. |
| Tailwind utilities only, purged at build time | CSS is 17 KB (4.3 KB gzipped). |
| JavaScript 124 KB (46 KB gzipped) with Vue, router and Pinia only | No heavy dependency. |

## SEO

- One `<title>` per page, set on every navigation: `<page> – Re-Tired Hearts` (`src/router/meta.js`).
- One meta description per public page (home, login, registration).
- `lang="fr"`, a single `<h1>` per page and landmarks (`header`, `nav`, `main`, `footer`).
- Private pages (`/profile`) are `noindex, nofollow` and disallowed in `public/robots.txt`.
- Open Graph tags (title, description, locale, site name) and a theme colour in `index.html`.
- Descriptive alternative text on every photo; decorative illustrations are hidden from assistive technologies.
- SVG favicon (`public/favicon.svg`).

## Known limits

- The app is a client-side single-page application: search engines must run JavaScript to read page content. Server-side rendering is out of scope for the MVP.
- No `sitemap.xml` and no Open Graph image: both need the production domain, which is not known yet.
- Only the public pages are meant to be indexed; the events and member pages require an account.
