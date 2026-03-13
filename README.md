# Skillfield Landing - Next.js

This project is now a Next.js (App Router) site with markdown-driven content.

## How It Works

| Layer | File(s) | Purpose |
|---|---|---|
| Content (home) | src/index.md | Frontmatter-driven landing page content |
| Content (blog) | src/blog/posts/*.md | Blog post markdown and metadata |
| Shared data | src/_data/site.json, src/_data/icons.json | Nav/footer settings and SVG icon library |
| Rendering | app/page.jsx, app/blog/page.jsx, app/blog/[slug]/page.jsx | Next.js routes |
| Content utilities | lib/content.js | Markdown/frontmatter parsing, date formatting, sanitization |
| Styles | src/assets/css/style.css | Global site styles imported by app/layout.jsx |

## Editing Content

Landing page content and section structure are still controlled in src/index.md.

Blog posts are still authored as markdown in src/blog/posts.

## Security Notes

- Markdown HTML output is sanitized before rendering.
- Frontmatter-provided links are protocol-validated.
- Inline SVG icons are sanitized before injection.

## Development

### Prerequisites

- Node.js v18 or later

### Install dependencies

```bash
npm install
```

### Run locally

```bash
npm run dev
```

Then open http://localhost:3000.

### Production build

```bash
npm run build
```

### Production runtime

```bash
npm run start
```

## Static Export and GitHub Pages

The Next.js config uses static export mode (out directory). If deploying under a subpath, set:

```bash
NEXT_BASE_PATH=/skillfield-landing npm run build
```

## Project Structure

```
skillfield-landing/
├── app/
│   ├── layout.jsx
│   ├── page.jsx
│   └── blog/
│       ├── page.jsx
│       └── [slug]/
│           └── page.jsx
├── components/
│   ├── Footer.jsx
│   └── NavBar.jsx
├── lib/
│   └── content.js
├── src/
│   ├── index.md
│   ├── _data/
│   │   ├── icons.json
│   │   └── site.json
│   ├── assets/
│   │   └── css/
│   │       └── style.css
│   └── blog/posts/
│       └── *.md
├── next.config.mjs
└── package.json
```
