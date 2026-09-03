# Project Status

## Current phase

Production hardening. The end-to-end workflow runs from mobile intake through cited analysis, editable human review, approval, sharing, and decision-brief export.

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

The application has been migrated from Netlify to native Next.js on Vercel. It
uses app-owned Supabase Auth, a Supabase Postgres database, and private Vercel
Blob storage. The production build no longer requires Vinext, D1, R2, Wrangler,
Netlify Database, Netlify Blobs, or ChatGPT identity headers.

The GitHub repository is connected to a Vercel Hobby project and the configured
production deployment succeeds. A dedicated free Supabase project provides
Google and email magic-link authentication. Its callback allow list contains
the canonical hostname, the Vercel fallback hostname, and localhost.

The database schema migrations are applied. Production uses a dedicated
`aivca_app` login with only connect, schema-usage, and required table DML
permissions; the Supabase owner credential is not stored in Vercel. Uploaded
evidence is stored in a private Vercel Blob store.

The canonical hostname is `aiauditor.palasharma.com`. Porkbun DNS points the
hostname to the Vercel-provided CNAME target. The server-side `OPENAI_API_KEY`
is stored as a protected Vercel secret in a dedicated OpenAI project. No
automated workflow may purchase credits, change payment settings, enable a paid
plan, or initiate a billable model request; the owner must initiate any paid API
usage personally.

The temporary anonymous-access path is being retired in favor of Google OAuth.
Anonymous identities are rejected when production guest access is disabled,
and authenticated users can sign out from the application header. The callback
continues to accept both OAuth PKCE exchanges and browser-independent token-hash
email verification.

Production OpenAI analysis is explicitly gated by `OPENAI_ANALYSIS_ENABLED` and
uses GPT-5.6 Terra through the Responses API with Structured Outputs and
`store: false`. Provider failures are returned to the user instead of silently
substituting local results. Each authenticated reviewer is limited to three
analysis requests per UTC day and the application to 25 per UTC day. A saved
local result exposes a user-operated rerun action after AI analysis is enabled.

The 320 px results layout now contains long extracted fragments without
horizontal page movement. Mobile headings are smaller, the scope warning is
placed after the workspace, and the production header includes a sign-out
control.

Extracted fragment identifiers are scoped to their audit so repeated product
page locations cannot collide across reviews. The completed three-source
packet indicator renders as a fully filled circle. Analysis failures log only
the error class and provider/database code, never extracted evidence text.

## Recommended next tasks

1. Complete one owner-initiated production OpenAI audit after confirming API credits are available.
2. Add OCR for scanned PDFs and clearer low-text-document recovery.
3. Add duplicate-source detection and extracted-text correction with analysis invalidation.
4. Add route-level automated fixtures for remote HTML, text-file, and PDF packets.

## First implementation milestone

A reviewer can submit one evidence packet, inspect exact source fragments, edit or remove every finding, approve every retained finding, and share or download a scoped decision brief with five follow-up questions. The first implementation milestone is deployed to production.
