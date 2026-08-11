# Project Instructions

## Purpose

Build and validate a lightweight AI vendor claim-to-evidence gap finder for pre-purchase review.

Before starting substantive work, read:

- `PRODUCT_BRIEF.md`
- `MVP_SPEC.md`
- `VALIDATION_PLAN.md`
- `PROJECT_STATUS.md`
- `docs/DECISIONS.md`

## Product guardrails

- Assess only the evidence supplied or explicitly placed in scope.
- Never label a vendor claim false solely because supporting evidence is absent.
- Use “no evidence found in the supplied materials” for absence.
- Do not provide legal advice, compliance certification, safety certification, or purchasing verdicts.
- Do not create a universal vendor risk or trust score for the MVP.
- Keep a human reviewer in the loop before findings are shared.
- Preserve exact citations and distinguish vendor claims from external evidence.
- State intended use, document scope, and assumptions in every audit.

## Scope discipline

The MVP covers only:

1. Customer-data use and training
2. Retention, deletion, and access
3. Model and provider dependencies
4. Performance claims and limitations
5. Human oversight, incidents, and change notification

Treat integrations, continuous monitoring, independent benchmarks, broad regulation mapping, vendor portals, and enterprise administration as future work unless the user explicitly changes the scope.

## Implementation preferences

- Build the MVP as a hosted, installable, mobile-first progressive web application.
- Design and test phone layouts before adding tablet and desktop density.
- Do not require drag-and-drop, hover, or desktop-width tables for core workflows.
- Preserve audit state across refreshes, app switching, and interrupted mobile connections.
- Scope every audit to its authenticated reviewer and enforce the documented short-lived deletion policy.
- Prefer the smallest reversible implementation that tests the current hypothesis.
- Do not add infrastructure before a validated need exists.
- Use structured schemas for extraction and report generation.
- Make citations inspectable and editable.
- Add tests for evidence-status vocabulary, citation presence, and unsupported verdict language.
- Do not commit confidential customer or vendor documents.
- Default to short-lived or local storage during pilots.
- Record material product or architecture decisions in `docs/DECISIONS.md`.

## Evidence language

Allowed statuses:

- Supported by supplied evidence
- Partially supported
- No evidence found in supplied materials
- Conflicting disclosure
- Not assessable from supplied materials

## Definition of done for findings

A finding is not complete until it has:

- An atomic claim
- An exact source citation
- Relevant evidence or an explicit absence statement
- An allowed evidence status
- A concise rationale
- Intended-use relevance
- A useful follow-up question when action is required
