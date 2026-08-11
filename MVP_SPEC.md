# MVP Specification

## Objective

Demonstrate that a small evidence assistant can surface useful vendor questions faster than a buyer's current manual review.

The MVP does not need to automate an entire procurement or governance process.

## Inputs

### Required

- One vendor product URL or pasted product description
- Intended use
- Data sensitivity: public, internal, confidential, or regulated
- Decision impact: low, medium, or high

### Optional

Up to three supporting documents or URLs, such as:

- Trust center or security page
- Data-processing agreement
- Privacy policy
- Model card or system card
- Technical paper
- Evaluation report
- Written sales response

## Claim domains

Review only these five domains in version one:

1. **Customer-data use and training**
   - Whether customer inputs or outputs are used for training
   - Opt-out conditions
   - Differences by product tier or configuration
2. **Retention, deletion, and access**
   - Retention periods
   - Deletion commitments
   - Human or subcontractor access
3. **Model and provider dependencies**
   - Underlying model providers
   - Material subprocessors
   - Replacement or routing between models
4. **Performance and limitations**
   - Accuracy, quality, reliability, or productivity claims
   - Evaluation dataset and operating conditions
   - Known limitations and excluded use cases
5. **Oversight and incident handling**
   - Human review
   - Incident notification
   - Product or model change notification
   - Escalation and remediation

## Processing stages

1. Normalize supplied text and preserve source locations.
2. Extract atomic, material claims.
3. Classify each claim into a supported domain.
4. Retrieve relevant evidence from the supplied packet.
5. Compare the claim with that evidence.
6. Assign an allowed evidence status with a concise rationale.
7. Rank gaps by relevance to the buyer's intended use.
8. Generate five follow-up questions.
9. Require human review before export or sharing.

## Claim record

Each claim should contain:

```json
{
  "claim": "Customer content is never used to train shared models.",
  "claim_type": "customer_data_training",
  "source_title": "Enterprise privacy page",
  "source_location": "Section 3, paragraph 2",
  "source_quote": "...",
  "evidence_status": "partially_supported",
  "evidence_sources": [],
  "rationale": "The statement applies only to the enterprise tier; the selected tier is unknown.",
  "buyer_relevance": "high",
  "follow_up_question": "Does this commitment apply to the plan covered by our proposed contract?"
}
```

## Output structure

1. Scope and intended use
2. Executive summary
3. Highest-priority evidence gaps
4. Full cited claim ledger
5. Five follow-up questions
6. Limitations and unreviewed areas

## Non-goals

- Determining whether a vendor is truthful
- Producing a universal trust or risk score
- Providing legal advice or a compliance decision
- Recommending purchase or rejection
- Independent model testing or red teaming
- Web-wide autonomous investigation
- Continuous monitoring
- Vendor portals and reusable questionnaires
- Jira, GRC, procurement, or CRM integrations
- Multi-tenant enterprise administration

## MVP quality requirements

- Every extracted claim has an exact, inspectable citation.
- No claim is classified when the source text is unavailable.
- The interface distinguishes vendor statements from third-party evidence.
- Evidence statuses use only the defined vocabulary.
- The output states the review packet and intended-use assumptions.
- A reviewer can edit or remove every finding before export.
- Uploaded materials and derived audit content follow the documented immediate-deletion option, 72-hour inactivity expiry, and seven-day hard maximum.

## Suggested technical shape

Keep the first implementation simple:

- An autosaved mobile-first intake flow for context and uploads
- Text/PDF extraction
- Structured model output validated against a schema
- Retrieval limited to the supplied packet
- A deterministic report template
- Sites-managed sign-in and private per-reviewer audits
- Short-lived hosted storage with immediate deletion, 72-hour inactivity expiry, and a seven-day hard maximum
- No background jobs unless document size makes them necessary

The selected baseline is a TypeScript application using Next.js App Router conventions through Vinext, Cloudflare D1 and R2 with Drizzle ORM, Zod schemas, PDF.js and Readability-based extraction, and the OpenAI Responses API behind a provider adapter. See [ROADMAP.md](ROADMAP.md) for the complete engineering and mobile requirements.

## Mobile-first requirement

- Deliver the MVP as a hosted, installable progressive web application.
- Design the phone layout first and progressively enhance it for tablet and desktop.
- Support mobile file selection, resumable audits, inspectable citations, finding review, and report sharing.
- Do not rely on drag-and-drop, hover, desktop-width tables, or side-by-side panels for core actions.
- Treat 320 px viewport support, 44 px touch targets, responsive text, and WCAG 2.2 AA accessibility as release requirements.
- Keep processing state on the server so app switching, screen locking, refreshes, and connection loss do not discard work.
- A separate native iOS or Android application is not required for the MVP.
