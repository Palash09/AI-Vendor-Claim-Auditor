# AI Vendor Claim Auditor

A lightweight procurement evidence assistant for reviewing claims made by AI-enabled software vendors.

## Product thesis

AI buyers do not need a universal truth detector or another large governance platform. They need a fast way to answer:

> What material claims are not adequately supported by the supplied vendor evidence, and what should we ask before approval?

The product accepts a small vendor evidence packet and produces a cited claim ledger, evidence-gap classifications, and five prioritized follow-up questions.

## Current status

The local MVP now supports autosaved mobile intake, document extraction, cited claim-gap analysis, persisted source viewing, editable human review, five vendor questions, a server-enforced approval gate, native sharing, and downloadable decision-brief export.

Start with:

1. [PRODUCT_BRIEF.md](PRODUCT_BRIEF.md)
2. [MVP_SPEC.md](MVP_SPEC.md)
3. [VALIDATION_PLAN.md](VALIDATION_PLAN.md)
4. [ROADMAP.md](ROADMAP.md)
5. [PROJECT_STATUS.md](PROJECT_STATUS.md)

Future Codex tasks should also follow [AGENTS.md](AGENTS.md).

## Proposed workflow

1. A buyer supplies one product URL and up to three supporting documents or URLs.
2. The buyer describes the intended use, data sensitivity, and decision impact.
3. The system extracts material claims with exact citations.
4. It connects each claim to relevant supplied evidence.
5. It flags missing, partial, or contradictory support.
6. It produces a reviewable decision brief and five vendor questions.

## Project principles

- Assess disclosed evidence, not the vendor's honesty.
- Say “no evidence found in the supplied materials,” not “this claim is false.”
- Preserve exact citations for every extracted claim.
- Keep a human reviewer in the loop before an audit is shared.
- Avoid legal, compliance, safety, or purchasing verdicts.
- Validate the workflow with real buyers before adding platform complexity.

## Using this folder in Codex

Add this folder as a local project in the Codex Projects view and make it the primary folder. New tasks will then discover `AGENTS.md` and the project documentation automatically.

Official reference: [Projects and chats](https://learn.chatgpt.com/docs/projects)
