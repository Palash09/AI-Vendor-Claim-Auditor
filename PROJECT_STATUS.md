# Project Status

## Current phase

MVP feature-complete locally. The end-to-end workflow runs from mobile intake through cited analysis, editable human review, approval, sharing, and decision-brief export.

## Completed

- Initial premise evaluated
- Narrow product wedge selected
- Target job to be done defined
- Five initial claim domains selected
- MVP boundaries documented
- Concierge validation plan defined
- Milestone-based MVP and expanded-application build roadmap defined
- Mobile-first progressive web application requirement defined
- Initial application stack and provider boundaries selected
- MVP authentication and short-lived data-retention approach selected
- Application scaffold, mobile-first shell, manifest, and service worker added
- Authenticated audit ownership, relational schema, private upload path, and deletion routes implemented
- Autosaved four-step mobile intake and evidence-packet flow implemented
- HTML, pasted text, TXT/Markdown, and text-based PDF extraction implemented
- Extracted content normalized into bounded, inspectable source fragments
- Server-side analysis endpoint implemented with OpenAI Structured Outputs support and a conservative no-key demo fallback
- Exact citation resolution enforced before AI-generated findings are retained
- Mobile cited-results ledger, five vendor questions, extraction warnings, and persisted reviewer decisions implemented
- Normalized source fragments persisted with a mobile citation viewer and vendor-statement/supporting-evidence labels
- Inline finding editing, automatic re-review after edits, removal, and restoration implemented
- Server-enforced all-findings-reviewed gate and approved-audit state implemented
- Mobile native sharing and downloadable Markdown decision brief implemented
- Drizzle migration generated and inspected for analysis results and source fragments
- CI workflow, strict type checking, linting, build, and guardrail tests added
- Durable Codex project instructions added

## Not yet decided

- Primary buyer role
- Pricing beyond pilot hypotheses

## Hosting transition

The application has been migrated locally from the ChatGPT/Sites and Cloudflare
runtime to native Next.js for Netlify. It now uses app-owned Supabase Auth
(email magic link first, Google optional), Netlify Database, and private Netlify
Blobs. The production build no longer requires Vinext, D1, R2, Wrangler, or
ChatGPT identity headers.

File uploads are capped at 4 MB because Netlify's buffered function payload is
6 MB and binary requests gain base64 overhead. Model calls time out at 45
seconds so the route can finish within Netlify's 60-second synchronous limit.

The GitHub repository is connected to the Netlify Free project and its first
production deployment succeeded. Netlify Database is provisioned and the
production migration is applied. A dedicated free Supabase project provides
universal email magic-link authentication; its public client configuration and
explicit callback allow list are configured in Netlify and Supabase.

The canonical hostname is `aiauditor.palasharma.com`. Porkbun DNS points the
hostname to Netlify, the included Let's Encrypt certificate is active, and HTTP
redirects to HTTPS. The server-side `OPENAI_API_KEY` is stored as a protected
Netlify secret in a dedicated OpenAI project and the completed environment has
been deployed. No automated workflow may purchase credits, change payment
settings, enable a paid plan, or initiate a billable model request; the owner
must initiate any paid API usage personally.

The email magic-link flow was found to loop when a mobile email client opened
the PKCE link outside the browser that initiated sign-in. The production demo
now uses a one-tap temporary Supabase identity instead: no email or external
account is required, while every audit remains scoped to a unique authenticated
user ID. The callback also accepts token-hash verification for a future
browser-independent email flow.

The public demo is forced to use the conservative local analyzer even though
the OpenAI key is configured. This prevents guest traffic from generating API
charges. The first model-assisted audit remains intentionally owner-operated.

## Recommended next tasks

1. Complete one guest-session production smoke audit, then have the owner decide when to enable the first model-assisted audit.
2. Add free-credit usage monitoring and keep production deploys intentional because each consumes Netlify credits.
3. Add OCR for scanned PDFs and clearer low-text-document recovery.
4. Add duplicate-source detection and extracted-text correction with analysis invalidation.
5. Add route-level automated fixtures for remote HTML, text-file, and PDF packets.

## First implementation milestone

A reviewer can submit one evidence packet, inspect exact source fragments, edit or remove every finding, approve every retained finding, and share or download a scoped decision brief with five follow-up questions. The first implementation milestone is complete locally.
