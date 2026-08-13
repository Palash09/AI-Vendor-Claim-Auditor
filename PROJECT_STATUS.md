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

## Recommended next tasks

1. Complete Google OAuth consent and connect the resulting client to Supabase Auth.
2. Complete one owner-initiated production OpenAI audit after confirming API credits are available.
3. Add OCR for scanned PDFs and clearer low-text-document recovery.
4. Add duplicate-source detection and extracted-text correction with analysis invalidation.
5. Add route-level automated fixtures for remote HTML, text-file, and PDF packets.

## First implementation milestone

A reviewer can submit one evidence packet, inspect exact source fragments, edit or remove every finding, approve every retained finding, and share or download a scoped decision brief with five follow-up questions. The first implementation milestone is complete locally.
