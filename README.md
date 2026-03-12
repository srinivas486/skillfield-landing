# Skillfield Landing — Markdown-Driven Static Site

The Skillfield landing page is fully controlled by Markdown files. All website content
lives in `src/index.md` — edit that file to update the site.

## How It Works

| Layer | File(s) | Purpose |
|---|---|---|
| **Content** | `src/index.md` | All text, headings, links, and structured data (YAML frontmatter) |
| **Template** | `src/_includes/layouts/home.njk` | HTML structure and rendering logic |
| **Styles** | `src/assets/css/style.css` | All CSS |
| **Icons** | `src/_data/icons.json` | Inline SVG icon library (referenced by name in content) |

## Editing Content

Open `src/index.md` and edit the YAML frontmatter to update:

- **Navigation** — logo, links
- **Hero** — eyebrow text, heading, tagline, CTA buttons
- **Data & AI Services** — section heading, description, service cards
- **Cyber Security Services** — section heading, description, service cards
- **Why Skillfield** — differentiator items (icon + title + text)
- **Credentials** — trust badge tiles
- **Testimonials** — client quotes
- **Contact** — heading, description, email address
- **Footer** — logo, tagline, copyright, location, email

### Adding a new service card

In `src/index.md`, under `ai_services.cards` (or `security_services.cards`), add:

```yaml
    - icon: "chart"
      title: "My New Service"
      text: "Description of the new service."
```

Available icon keys: `database`, `neural`, `chart`, `shield`, `eye`, `lightning`

### Adding a new "Why" item

Under `why.items`, add:

```yaml
    - icon: "🌐"
      title: "My New Point"
      text: "Why this matters."
```

### Adding a testimonial

Under `testimonials.items`, add:

```yaml
    - quote: "Great service — highly recommend!"
      name: "Jane D."
```

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later

### Install dependencies

```bash
npm install
```

### Run locally (with live reload)

```bash
npm start
```

Then open http://localhost:8080 in your browser.

### Build for production

```bash
npm run build
```

Output is written to the `dist/` directory.

## Deployment

The site deploys automatically to **GitHub Pages** when you publish a GitHub Release.

You can also trigger a manual deployment from the Actions tab using "Run workflow".

### One-time GitHub Pages setup

1. Go to **Settings → Pages** in the repository
2. Set **Source** to **GitHub Actions**

## Project Structure

```
skillfield-landing/
├── src/
│   ├── index.md                    # ← Edit this to update site content
│   ├── _data/
│   │   └── icons.json              # SVG icon library
│   ├── _includes/
│   │   └── layouts/
│   │       └── home.njk            # HTML template
│   └── assets/
│       └── css/
│           └── style.css           # All styles
├── dist/                           # Generated output (git-ignored)
├── .eleventy.js                    # Eleventy config
├── package.json
└── .github/
    └── workflows/
        └── deploy.yml              # CI/CD — build & deploy on release
```
