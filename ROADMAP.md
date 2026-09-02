# Application Build Roadmap

## Goal

Build a small, mobile-first web application that turns one AI-vendor evidence packet into an editable, cited claim ledger and five prioritized follow-up questions.

The application solves one major pain point: buyers should not have to manually reconcile claims scattered across product pages, privacy policies, trust centers, technical documents, and sales responses before they know what to ask the vendor.

The application assesses only the supplied materials. It does not determine whether a vendor is truthful, certify compliance or safety, assign a universal risk score, or make a purchase recommendation.

## MVP user journey

1. The reviewer creates an audit.
2. The reviewer enters the vendor product, intended use, data sensitivity, and decision impact.
3. The reviewer supplies one product URL or description and up to three supporting files or URLs.
4. The application extracts text and preserves exact source locations.
5. The application extracts atomic claims in the five supported domains.
6. The application connects each claim to relevant supplied evidence and assigns an allowed evidence status.
7. The application ranks the material gaps and generates five follow-up questions.
8. The reviewer inspects, edits, approves, or removes every finding.
9. The application exports a deterministic decision brief.
10. The application deletes uploaded material according to the configured short-lived retention policy.

## Engineering decisions

The implementation will use these defaults unless testing reveals a concrete blocker:

- **Delivery:** Hosted, installable progressive web application; no separate native iOS or Android application for the MVP
- **Application:** Native Next.js App Router with TypeScript, server-rendered routes, and server-side APIs on Vercel
- **Interface:** Mobile-first React components, Tailwind CSS design tokens, accessible semantic controls, and progressive enhancement for tablet and desktop
- **Access:** App-owned Supabase Auth using email magic links and optional Google sign-in, with every audit scoped to the authenticated reviewer; organization and multi-role administration remain post-MVP
- **Database:** Supabase Postgres through a pooled server-only connection, with Drizzle ORM and versioned SQL migrations
- **File storage:** Private Vercel Blob storage addressed only from authenticated server routes
- **Model:** OpenAI Responses API with GPT-5.6 Terra as the initial balanced model and Structured Outputs for schema-constrained records
- **Model data handling:** Send extracted text rather than uploading source files to the model provider, set Responses API requests to `store: false`, and do not use provider-hosted conversation state
- **Model boundary:** A provider adapter so model or provider changes do not affect the audit domain layer
- **Extraction:** Mozilla PDF.js for text-based PDFs and Readability plus JSDOM for permitted public HTML pages
- **Validation:** Zod schemas shared across database boundaries, API payloads, and model responses
- **Processing:** Server-persisted, idempotent pipeline steps with resumable status; introduce a dedicated queue only when deployment limits require it
- **Reports:** Deterministic printable HTML, PDF export, and the mobile Web Share API where supported
- **Testing:** Vitest for unit and integration tests, Playwright for end-to-end and responsive-browser tests, plus fixture-based pipeline evaluations
- **Deployment:** Vercel Hobby for the personal, non-commercial pilot; no paid trial, plan, or automatic overage may be enabled by an automated workflow
- **MVP retention:** Allow immediate user deletion; otherwise delete the audit, uploads, extracted text, findings, and generated reports 72 hours after last activity, with a hard maximum of seven days after audit creation

This is a web application first. A reviewer should be able to open it from a phone browser, install it to the home screen, upload from the device file picker, leave during processing, return to the same audit, review findings, and share or download the approved brief.

## Mobile-first product requirements

- Design and implement the 320–430 px phone layout before tablet and desktop layouts.
- Use a single-column workflow on phones; tables become stacked finding cards rather than horizontal-scroll grids.
- Use touch targets of at least 44 by 44 CSS pixels and keep primary actions reachable near the bottom of the viewport.
- Make intake a short, autosaved sequence rather than one dense desktop form.
- Support PDF and text-file selection through mobile browsers without drag-and-drop being required.
- Preserve audit state on the server so app switching, screen locking, refreshes, or a dropped connection do not lose work.
- Show processing progress and allow the user to leave and resume safely.
- Open citations in a full-screen mobile source viewer with a clear return path to the finding.
- Use bottom sheets or full-screen panels for filters and editing on phones; use split panes only at larger breakpoints.
- Keep finding status, rationale, evidence, and reviewer controls readable without pinch zoom.
- Support mobile download and the Web Share API with a normal download fallback.
- Meet WCAG 2.2 AA expectations for keyboard access, contrast, focus, labels, error messages, and zoom.
- Do not require offline analysis. The installed PWA may cache its shell, but source processing and model analysis require a network connection.

## Core data model

Define these records before building the interface:

- **Audit:** vendor, product, intended use, data sensitivity, decision impact, scope, assumptions, state, and retention deadline
- **Source:** title, source type, URL or file metadata, vendor or third-party origin, extraction state, checksum, and retrieval date
- **Source fragment:** exact text, page or section, paragraph or fragment index, and stable source reference
- **Claim:** atomic claim text, one of the five domains, materiality, exact source quote, and source reference
- **Evidence link:** claim, evidence fragment, relationship, and relevance
- **Finding:** allowed evidence status, rationale, intended-use relevance, reviewer state, and edit history
- **Question:** question text, priority, linked findings, and reviewer state
- **Report version:** approved scope, findings, questions, limitations, generation time, and immutable export snapshot

The source fragment is the citation anchor. Generated page numbers or quotations must never be accepted unless they resolve to stored extracted text from the supplied packet.

---

## MVP milestones

The estimates below are relative planning ranges for one experienced full-stack engineer. They are not calendar commitments.

### Milestone 0 — Project foundation and mobile design system

**Estimated effort:** 3–5 engineering days

**Build**

- Scaffold the selected Next.js and TypeScript application, environment configuration, database migrations, test runner, and CI checks.
- Configure Supabase Auth and Postgres, Vercel deployment, Drizzle ORM, private Vercel Blob storage, and the OpenAI provider adapter.
- Create provider interfaces for document extraction, model generation, storage, and report rendering.
- Define the audit state machine: draft, extracting, analyzing, review required, approved, export ready, failed, and deleted.
- Define versioned schemas for the core records and model responses.
- Add structured application errors and safe user-facing failure messages.
- Define mobile-first spacing, type, color, touch-target, form, card, sheet, progress, and navigation primitives.
- Add the web app manifest, install metadata, responsive viewport configuration, and application icons.
- Record the architecture and data-retention decisions in the decision log.

**Complete when**

- The application runs locally from a documented command.
- CI can run formatting, type checks, unit tests, and build validation.
- A database migration creates the core records.
- A synthetic audit can be created and moved through the state machine without calling a model.
- An authenticated reviewer can access their own synthetic audit but cannot access another reviewer's audit.
- The application shell works at 320, 375, 390, and 430 px widths without horizontal page scrolling.
- The PWA is installable in supported mobile browsers and remains a normal responsive website elsewhere.

### Milestone 1 — Audit intake and source management

**Estimated effort:** 4–6 engineering days

**Build**

- Create an autosaved, step-based mobile intake flow that expands into a single-page form on larger screens.
- Require product URL or description, intended use, data sensitivity, and decision impact.
- Accept up to three supporting files or URLs.
- Validate file type, file count, file size, URL scheme, and required fields.
- Store uploads in private temporary storage with a generated identifier rather than the original filename as the storage key.
- Scope every audit, source, processing action, and download to the authenticated reviewer.
- Display the exact evidence packet in scope and allow a source to be removed before analysis.
- Add explicit consent and retention notices before submission.
- Add audit deletion that removes both records and stored files.
- Persist each completed intake step so an interrupted mobile session can resume.

**Complete when**

- A reviewer can create, reopen, edit, and delete a draft audit.
- Unsupported or oversized inputs fail clearly without creating a partial analysis.
- Source files are not publicly addressable.
- An authenticated reviewer cannot access another reviewer's source or audit by changing a URL or identifier.
- Every audit records its scope, assumptions, retention deadline, and source inventory.
- The flow can be completed using touch and a mobile file picker without drag-and-drop.
- Refreshing, backgrounding, or reopening the app restores the draft at the last completed step.

### Milestone 2 — Document extraction and inspectable citations

**Estimated effort:** 6–10 engineering days

**Build**

- Fetch permitted public URLs with timeouts, content limits, and redirect controls.
- Extract visible text from HTML while retaining headings and paragraph order.
- Extract text from text-based PDFs while retaining page numbers and block order.
- Normalize pasted text and product descriptions.
- Split extracted text into stable source fragments without losing location metadata.
- Save the exact text, checksum, extraction method, warnings, and retrieval time.
- Create a full-screen mobile source viewer and a larger-screen split view that highlight a fragment from a citation.
- Detect empty, unreadable, duplicate, and likely scanned documents.
- Mark failed or incomplete sources as not assessable; never silently omit them.

**Complete when**

- Clicking a citation opens the stored source fragment in context.
- The application cannot create a claim citation that does not resolve to a source fragment.
- Reprocessing the same unchanged source produces stable fragment references.
- Fixture tests cover HTML, pasted text, multi-page PDF, duplicate input, empty input, and scanned PDF failure.
- A citation can be opened, read, and closed on a 320 px viewport without losing the review position.

### Milestone 3 — Atomic claim extraction

**Estimated effort:** 5–8 engineering days

**Build**

- Send only the current audit context and supplied fragments to the model.
- Extract atomic, material claims within the five MVP domains:
  1. Customer-data use and training
  2. Retention, deletion, and access
  3. Model and provider dependencies
  4. Performance claims and limitations
  5. Human oversight, incidents, and change notification
- Require each claim to include a verbatim source quote and source fragment identifier.
- Validate output against the claim schema.
- Reject claims with missing, mismatched, or fabricated quotations.
- Deduplicate substantially identical claims while preserving all source references.
- Expose extraction warnings and omitted domains to the reviewer.

**Complete when**

- Every retained generated claim resolves to exact supplied text.
- Claims outside the five domains are excluded from the MVP ledger.
- Unavailable source text cannot produce a classified claim.
- Synthetic tests cover all five domains, tier-qualified claims, ambiguous language, and citation mismatch.

### Milestone 4 — Evidence matching and status assignment

**Estimated effort:** 6–10 engineering days

**Build**

- Retrieve potentially relevant fragments from the current audit only.
- Link supporting, qualifying, conflicting, or insufficient evidence to each claim.
- Assign exactly one allowed evidence status:
  - Supported by supplied evidence
  - Partially supported
  - No evidence found in supplied materials
  - Conflicting disclosure
  - Not assessable from supplied materials
- Generate a concise rationale that refers to the linked evidence and declared intended use.
- Keep vendor statements visually and structurally separate from third-party evidence.
- Add deterministic validators for allowed vocabulary, citation presence, and prohibited verdict language.
- Preserve model and prompt version metadata for reproducibility.

**Complete when**

- Every finding has an atomic claim, claim citation, linked evidence or explicit absence statement, allowed status, rationale, and intended-use relevance.
- “No evidence found in supplied materials” is never rewritten as evidence that the claim is false.
- No finding contains a legal, compliance, safety, truthfulness, approval, or rejection verdict.
- Fixture tests exercise all five statuses, including contradictory and unassessable packets.

### Milestone 5 — Gap ranking and five follow-up questions

**Estimated effort:** 3–5 engineering days

**Build**

- Define a transparent ranking rule using intended-use relevance, data sensitivity, decision impact, evidence status, and claim materiality.
- Rank findings without calculating a universal vendor risk or trust score.
- Generate a targeted follow-up question for every material gap requiring action.
- Select exactly five questions for the decision brief.
- Merge redundant questions while retaining links to all affected findings.
- Explain why each selected question matters for the intended use.
- Allow fewer than five only when there are not five defensible questions, and state that limitation rather than inventing questions.

**Complete when**

- Each question traces to at least one cited finding.
- The ordering can be explained from stored ranking inputs.
- Duplicate questions are not exported.
- The system does not manufacture gaps merely to fill five slots.

### Milestone 6 — Reviewer workspace and human approval

**Estimated effort:** 6–9 engineering days

**Build**

- Create an audit summary with processing state, scope, source warnings, and domain coverage.
- Create an editable card-based claim ledger with filters for domain, evidence status, relevance, and reviewer state; enhance it to a denser table or split view on larger screens.
- Show claim text, exact source citation, linked evidence, status, rationale, relevance, and follow-up question together.
- Let the reviewer edit, approve, or remove each finding and question.
- Preserve the generated value and reviewer-edited value for traceability.
- Require all exported findings to be explicitly approved.
- Prevent export while extraction failures or unresolved citation errors remain.
- Add a final review checklist covering intended use, scope, assumptions, citations, questions, and limitations.
- Keep approve, edit, remove, and next-finding actions thumb-reachable on phones.
- Preserve scroll and filter position when opening citations or editing a finding.

**Complete when**

- A reviewer can complete the entire audit without editing raw JSON.
- Every citation is inspectable from the ledger.
- Removed or unapproved findings cannot appear in an export.
- The application records who or what changed a finding and when, even though the MVP uses a single reviewer-owner role.
- The full review workflow passes at 320, 375, 390, and 430 px without clipped content, hidden actions, or required horizontal scrolling.

### Milestone 7 — Decision brief and export

**Estimated effort:** 4–6 engineering days

**Build**

- Generate the report from approved structured records rather than free-form model output.
- Include scope and intended use, executive summary, highest-priority gaps, full cited claim ledger, selected questions, limitations, and unreviewed areas.
- Create an immutable report version at approval time.
- Support printable HTML and one portable export format, preferably PDF or Markdown for the MVP.
- Support the Web Share API on compatible mobile browsers with download and copy-link fallbacks.
- Ensure source titles, locations, and exact quotes remain visible in the export.
- Add a permanent evidence-scope disclaimer.
- Add export filenames that contain no confidential source text.

**Complete when**

- The exported brief matches the approved ledger exactly.
- Regenerating an existing report version produces equivalent content.
- A report cannot be generated from an unreviewed audit.
- Layout tests cover long claims, long URLs, missing optional evidence, and multi-page tables.
- A reviewer can download or share an approved report from a phone without switching to desktop mode.

### Milestone 8 — Privacy, security, and reliability hardening

**Estimated effort:** 6–10 engineering days

**Build**

- Finalize and implement the retention policy for uploads, extracted text, model inputs, logs, and exports.
- Apply the 72-hour inactivity deletion window and seven-day hard maximum to all MVP audit content.
- Send only extracted text through the Responses API with `store: false`; do not upload original evidence files or create provider-hosted conversation objects.
- Disclose that API data is not used for provider model training by default but may remain in provider abuse-monitoring logs under the account's applicable retention controls.
- Encrypt hosted data in transit and at rest.
- Prevent source content, prompts, and model responses from entering analytics or ordinary application logs.
- Add URL-fetch protections against private-network access and unsafe redirects.
- Add upload malware scanning if the application is hosted and accepts private documents.
- Add rate limits, request limits, timeouts, retries, and idempotent processing.
- Add automated cleanup and a verifiable deletion path.
- Add failure recovery that does not duplicate findings or lose reviewer edits.
- Run a prohibited-language and citation-integrity check immediately before export.
- Test interruption recovery for refresh, connection loss, app backgrounding, and expired sessions.

**Complete when**

- A deletion test proves that stored source files and derived content are removed.
- An expiry test proves that inactive audits are deleted after 72 hours and every audit is deleted within seven days.
- Security tests cover malicious URLs, malformed files, oversized payloads, and unauthorized file access.
- Model or extraction failure results in a visible failed state, never a plausible-looking partial report.
- No confidential document content appears in logs or telemetry.
- Core flows meet the documented mobile accessibility and touch-target requirements.

### Milestone 9 — Deployment and MVP release

**Estimated effort:** 3–5 engineering days

**Build**

- Create separate development and production configuration.
- Run database migrations and storage setup through repeatable deployment steps.
- Add health checks, error reporting, latency metrics, token and extraction cost metrics, and cleanup monitoring.
- Add a synthetic end-to-end production check with non-confidential fixtures.
- Run the release device matrix on current iOS Safari and Android Chrome, plus responsive desktop browsers.
- Document operations, backup boundaries, data deletion, model-provider settings, and incident response.
- Create a small release checklist and rollback procedure.

**Complete when**

- A reviewer can complete the full production journey from intake through approved export.
- Automated checks cover intake, extraction, claim validation, status vocabulary, citation resolution, review approval, export, and deletion.
- Production alerts detect failed analyses and failed cleanup jobs.
- The MVP can be operated and rolled back without inspecting or retaining customer document content.
- The production app can be installed to a supported phone home screen and the complete workflow remains usable when launched there.

## MVP release definition

The MVP is released when a reviewer can submit one evidence packet and export a reviewed decision brief. Every retained finding must have:

- An atomic claim
- An exact, inspectable source citation
- Relevant supplied evidence or an explicit absence statement
- One allowed evidence status
- A concise rationale
- Intended-use relevance
- A useful follow-up question when action is required

Document upload plus a generated summary is not a complete MVP. The citation chain, evidence-scoped language, reviewer approval, deterministic export, and deletion path are required product functionality.

## Suggested delivery sequence

For one experienced full-stack engineer, a reasonable planning range is 9–13 weeks:

- **Weeks 1–2:** Milestones 0–1 — foundation and intake
- **Weeks 3–4:** Milestone 2 — extraction and citation anchors
- **Weeks 5–6:** Milestones 3–4 — claims, evidence, and statuses
- **Week 7:** Milestone 5 — ranking and questions
- **Weeks 8–9:** Milestones 6–7 — review workspace and report
- **Weeks 10–12:** Milestone 8 — security and reliability hardening
- **Week 13:** Milestone 9 — deployment and release buffer

Parallel work by a second engineer can shorten the schedule by separating the reviewer interface and report rendering from the extraction and analysis pipeline. Citation contracts and schemas should still be completed first because both tracks depend on them.

---

## Expanded application roadmap

Build these milestones after the single-review MVP is stable. Their order reflects technical dependency, not a requirement to implement every item.

### Expanded Milestone 1 — Accounts, organizations, and audit history

- Authentication and organization workspaces
- Multiple saved audits and reusable intended-use profiles
- Role-based access and secure sharing
- Versioned reports, reviewer activity, and retention administration
- Portfolio view based on evidence status and open questions, not a universal score

### Expanded Milestone 2 — Larger and richer evidence packets

- OCR for scanned PDFs
- DOCX, spreadsheet, presentation, email, and image inputs
- Larger packet limits and resumable uploads
- Background processing with job status and retry controls
- Duplicate, stale, and superseded-document detection
- Source comparison and document-version lineage

### Expanded Milestone 3 — Vendor response lifecycle

- Track open, answered, accepted, and reopened questions
- Import vendor responses and supporting attachments
- Link responses to the original finding and question
- Reassess only affected findings
- Produce an updated, versioned decision brief

### Expanded Milestone 4 — Team review workflow

- Comments, assignments, mentions, and reviewer sign-off
- Configurable approval steps
- Review deadlines and reminders
- Audit-level decision log
- Export handoff into the most frequently used procurement or governance system

### Expanded Milestone 5 — Configurable assessment programs

- Custom claim domains and organization-specific criteria
- Reusable industry or use-case question packs
- Traceable mapping to customer controls or selected regulatory requirements
- Policy-versus-evidence comparison with explicit jurisdictional assumptions

These mappings support human review. They do not certify compliance or replace legal advice.

### Expanded Milestone 6 — Change monitoring

- Approved source watchlists
- Scheduled snapshots of explicitly scoped public sources
- Material-change detection with before-and-after citations
- Reopen affected findings and generate reassessment questions
- Notification preferences and alert deduplication

### Expanded Milestone 7 — Integration platform

- Narrow API for audits, sources, findings, questions, and report status
- Webhooks for approved reports and reopened findings
- SSO and enterprise provisioning
- Connectors for validated procurement, GRC, ticketing, or document systems
- Administrative audit logs and retention controls

## Features intentionally deferred

- Universal vendor risk or trust scoring
- Purchase approval or rejection recommendations
- Legal, compliance, or safety certification
- Independent model testing and red teaming
- Autonomous web-wide investigation
- Broad regulation mapping without customer context
- A vendor portal before the vendor-response workflow is proven necessary
- Enterprise integrations before the core single-audit workflow is reliable

## Build priorities when tradeoffs arise

1. Citation correctness
2. Evidence-scoped language
3. Mobile usability and accessibility
4. Reviewer control
5. Data deletion and confidentiality
6. Reliable end-to-end completion
7. Analysis speed
8. Desktop density and interface polish
9. Expanded features
