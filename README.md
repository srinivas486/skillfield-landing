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

## Branching Strategy

This repository follows a two-branch workflow:

| Branch | Purpose |
|--------|---------|
| `dev`  | Active development branch. All PRs must target `dev`. |
| `main` | Production branch. Only receives merges from `dev` after review. |

### Workflow

1. **Create a feature branch** from `dev`.
2. **Open a Pull Request** targeting `dev`.
3. CI runs automatically (`ci.yml`) to validate the build on every push to `dev` and every PR targeting `dev`.
4. After review and approval, **merge the PR into `dev`**.
5. Merging into `dev` triggers the dev deployment workflow (`deploy-dev.yml`) and updates the **dev GitHub Pages** site (`development` environment).
6. When the dev preview looks good, **open a PR from `dev` → `main`** to promote to production.
7. Merging into `main` triggers the production deployment workflow (`deploy.yml`) and updates the **production GitHub Pages** site.

### GitHub Actions

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `create-dev-branch.yml` | Push to `main`, manual dispatch | Create the `dev` branch from `main` if it does not exist (idempotent) |
| `ci.yml` | Push to `dev`, PRs targeting `dev` | Build validation |
| `deploy-dev.yml` | Push to `dev`, manual dispatch | Deploy to GitHub Pages (`development` environment) |
| `deploy.yml` | Push to `main`, manual dispatch | Deploy to GitHub Pages (production) |
| `copilot-project-automation.yml` | Issue assigned, PR merged to `dev` | Move project board items to **Ready** when assigned to Copilot, and to **Done** when the linked PR is merged into `dev` |

### Copilot Project Automation Setup

The `copilot-project-automation.yml` workflow automates GitHub Project (v2) board status transitions:

- **Backlog → Ready:** when an issue is assigned to the GitHub Copilot coding agent.
- **→ Done:** when a pull request that closes the issue is merged into `dev`.

**Required configuration:**

1. Create a GitHub Project (v2) that contains this repository's issues.
2. Add a **repository variable** named `PROJECT_NUMBER` with the numeric project number
   (visible in the project URL: `/users/<owner>/projects/<number>`).
3. Create a **Personal Access Token (PAT)** with `project` and `repo` scopes and add it as a
   repository secret named `GH_TOKEN`.
4. Ensure the project's **Status** field has options named exactly `Ready` and `Done`.

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
