# Decision Log

## 2026-08-11 — Select a claim-to-evidence gap finder

**Decision:** Build toward a procurement evidence assistant rather than a universal AI-vendor truth checker.

**Why:** Many material claims cannot be verified from public text alone. A narrow evidence review can still produce a useful, defensible output without private system access or independent testing infrastructure.

## 2026-08-11 — Optimize for a buyer-ready question list

**Decision:** The primary output is a cited claim ledger plus five prioritized follow-up questions.

**Why:** The immediate buyer decision is what to clarify before approval. A generic risk score hides uncertainty and does not directly move the review forward.

## 2026-08-11 — Limit the MVP to five domains

**Decision:** Cover customer-data use, retention/access, model dependencies, performance limitations, and oversight/incidents.

**Why:** These domains are material across many AI-enabled SaaS reviews while remaining feasible for document-based analysis.

## 2026-08-11 — Exclude definitive verdicts

**Decision:** Do not label vendors safe, compliant, trustworthy, approved, rejected, or deceptive.

**Why:** Those conclusions require jurisdictional, contractual, technical, and organizational context beyond the supplied evidence packet.

## 2026-08-11 — Validate manually before choosing a stack

**Decision:** Run a concierge pilot before building a polished application.

**Why:** The main uncertainty is whether buyers act on the generated questions, not whether document extraction can be implemented.

## 2026-08-11 — Move to an implementation-first roadmap

**Decision:** Plan and build the software application from MVP architecture through production release without making customer interviews a prerequisite. This supersedes manual validation as a prerequisite to stack selection or implementation.

**Why:** The current priority is to define and execute the engineering milestones needed to produce the application. Validation work can occur separately and does not gate the build roadmap.

## 2026-08-11 — Build a mobile-first progressive web application

**Decision:** Deliver the MVP as a hosted, installable progressive web application. Design for phone viewports and touch interaction first, then progressively enhance the same application for tablet and desktop. Do not build separate native mobile applications for the MVP.

**Why:** The complete workflow must be easy to run on mobile devices without maintaining multiple client applications. A progressive web application provides browser access, home-screen installation, mobile file selection, resumable state, and sharing while preserving one codebase.

## 2026-08-11 — Select the initial engineering baseline

**Decision:** Use Next.js and TypeScript, PostgreSQL with Drizzle ORM, private S3-compatible object storage, Zod schemas, serverless PDF.js extraction through UnPDF, bounded HTML-to-text extraction, and the OpenAI Responses API through a provider adapter. Start with GPT-5.6 Terra and Structured Outputs for schema-constrained analysis records.

**Why:** This keeps the first application in one typed codebase, supports mobile-first delivery, preserves structured and testable domain records, and keeps storage, extraction, and model providers replaceable. Official OpenAI documentation describes GPT-5.6 Terra as balancing intelligence and cost and lists Responses API and Structured Outputs support.

## 2026-08-11 — Use invite-only access and short-lived audit storage

**Decision:** Use email magic-link authentication for the hosted MVP and scope every audit to its authenticated owner. Permit immediate deletion and otherwise delete all audit content 72 hours after last activity, with a hard maximum of seven days after creation. Send extracted text rather than original files to the OpenAI Responses API, set `store: false`, and avoid provider-hosted conversation state.

**Why:** A hosted mobile workflow needs resumable server state and access control, but the pilot does not need durable evidence storage or enterprise identity administration. The short deletion window keeps the experience usable across mobile interruptions while limiting retained vendor material. OpenAI's API data-control documentation states that API data is not used to train models unless the customer opts in, while default abuse-monitoring retention may still apply.

## 2026-08-11 — Use the Sites deployment baseline

**Decision:** Implement the application with Next.js App Router conventions through Vinext, Sites-managed ChatGPT sign-in, Cloudflare D1 for structured audit state, and private R2 storage for evidence files. This replaces the earlier Postgres, generic S3, and app-owned magic-link choices while preserving Drizzle, TypeScript, Zod, and provider boundaries.

**Why:** The selected hosting environment supplies authenticated user identity, relational persistence, private object storage, and Cloudflare Worker-compatible deployment without adding separate infrastructure. Audit ownership remains enforced in every server route, and the domain layer stays isolated from platform-specific bindings.

## 2026-08-11 — Make local analysis useful without an API key

**Decision:** Use the OpenAI Responses API with Zod Structured Outputs when `OPENAI_API_KEY` is available. When it is absent or the provider result fails exact-citation validation, run a clearly labeled conservative local analyzer that extracts atomic cited claims and classifies them only as needing separate supplied evidence. Persist both modes in the same guarded result schema.

**Why:** The demo must produce a visible, reviewable result in a fresh local environment without pretending that a heuristic run is model-assisted. A single result contract keeps the mobile workflow testable while exact quote resolution, allowed status vocabulary, absence language, and the human-review boundary remain enforced in both modes.

## 2026-08-11 — Store the first analysis as validated JSON

**Decision:** Store the analysis summary, findings, questions, extraction warnings, and reviewer state in an owner-scoped `analysis_results` row. Keep bounded source fragments inside the analysis execution boundary for this slice rather than introducing a fragment table before citation editing and search require it.

**Why:** This is the smallest reversible persistence change that restores analyzed results after mobile interruption. The JSON is validated on generation and read, while a normalized fragment store can be added with the source viewer and correction workflow.

## 2026-08-11 — Persist citation fragments and invalidate approval after edits

**Decision:** Persist bounded normalized source fragments in owner-scoped D1 rows after each analysis. Let reviewers edit claim text, rationale, intended-use relevance, and the follow-up question, while keeping exact citation quotes immutable in this slice. Any content edit, removal, restoration, or reviewer-state change returns the audit to `review_required` until every retained finding is approved again.

**Why:** Mobile reviewers need to inspect the surrounding supplied text and resume after interruption. Keeping citation anchors immutable preserves exact-quote integrity, while automatic approval invalidation prevents a previously approved brief from silently changing.

## 2026-08-11 — Gate export on completed human review

**Decision:** Generate a deterministic Markdown decision brief only when the server confirms that at least one finding is retained and every retained finding is approved. Export only approved findings, include intended use, assumptions, exact claim and evidence citations, the five questions, extraction warnings, and explicit limitations. Use native mobile sharing when available and a file download fallback otherwise.

**Why:** The MVP guardrail requires a human in the loop before findings are shared. Enforcing the gate on the server prevents UI bypasses, and Markdown provides a compact, portable pilot artifact without adding PDF rendering infrastructure.

## 2026-08-12 — Move authentication outside ChatGPT

**Decision:** Deploy the application directly to Cloudflare Workers and replace Sites-managed ChatGPT identity headers with app-owned Supabase Auth. Offer email magic-link sign-in as the universal baseline and optionally add Google sign-in. Retain Cloudflare D1 and private R2 so the migration does not require replacing the application's database and evidence storage.

**Why:** Application users should not need a ChatGPT account. Supabase Auth supports standalone JWT-based authentication, email magic links, one-time passwords, and social providers, while direct Workers deployment preserves the current mobile-first edge application and its owner-scoped D1/R2 data model. This supersedes the 2026-08-11 Sites deployment baseline; that earlier entry remains as decision history.

## 2026-08-12 — Use Netlify's hard-capped free plan

**Decision:** Host the pilot on Netlify Free using native Next.js, Netlify Database for Postgres records, and private Netlify Blobs for evidence files. Keep Supabase Auth for universal email magic-link login. Do not enable paid Netlify credit recharge. This supersedes the direct Cloudflare Workers target above while retaining the earlier entries as decision history.

**Why:** The pilot budget permits custom-domain and OpenAI API costs but no additional hosting charge. Netlify Free has a fixed monthly credit limit that pauses projects instead of creating an overage bill. Consolidating the runtime, relational database, and blob storage on Netlify also avoids Cloudflare's free Worker CPU ceiling for server-side document extraction.

## 2026-08-12 — Publish the application at aiauditor.palasharma.com

**Decision:** Use `aiauditor.palasharma.com` as the canonical production hostname. Configure Supabase Auth with that origin as its site URL, allow only the production callback, the Netlify fallback callback, and the local-development callback, and keep email magic links as the universal sign-in method.

**Why:** A dedicated subdomain keeps the application independent from the main portfolio website while retaining a recognizable owner-controlled domain. Explicit callback allow-listing prevents authentication redirects to arbitrary origins and preserves a practical fallback while DNS and local development are in progress.
