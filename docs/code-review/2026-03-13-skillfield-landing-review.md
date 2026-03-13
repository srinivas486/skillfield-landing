# Code Review: Skillfield Landing (Next.js Refactor)
**Ready for Production**: Yes (with one operational hardening follow-up)
**Critical Issues**: 0

## Scope And Review Plan
- Code type: Next.js static-export marketing site with markdown content pipeline
- Risk level: Medium (public-facing pages, markdown rendering, CI/CD deployment)
- Categories reviewed:
  - OWASP A03 Injection/XSS in markdown and SVG rendering paths
  - OWASP A05 Security Misconfiguration (headers, static hosting posture)
  - Zero Trust controls around content-derived links and HTML
  - Supply chain risk in dependency and workflow posture

## Priority 1 (Must Fix) ⛔
- None.

## Priority 2 (Should Fix) ⚠️

### 1) Missing explicit security headers in deployment layer
- Location: Hosting/deployment configuration (not currently enforced in repository config)
- Risk: Browser-side mitigations (CSP, no-sniff, framing controls) are not guaranteed, increasing blast radius if future content sanitization regresses.

Recommended fix:
1. Enforce baseline headers at CDN/host level:
   - `Content-Security-Policy: default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'`
   - `X-Content-Type-Options: nosniff`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy` with least privilege.
2. Add a deployment smoke test that validates header presence.

## Verified Security Improvements In This Refactor
1. Markdown output is sanitized before HTML injection in `lib/content.js`.
2. Inline SVG icons are sanitized through a strict allowlist in `lib/content.js`.
3. Content-managed URLs are validated with protocol allowlisting via `safeHref` in `lib/content.js` and consumed by `components/NavBar.jsx` and `app/page.jsx`.

## Recommended Changes
1. Pin GitHub Actions in workflows to full commit SHAs.
2. Consider moving remote logo assets to local static assets to reduce third-party integrity and availability dependency.
3. Add CI checks that fail on disallowed URL schemes in frontmatter.