# Example Audit — Fictional Vendor

This example demonstrates the intended output shape. The vendor and claims are fictional.

## Scope

- Vendor: ExampleAssist
- Intended use: Internal customer-support drafting
- Data sensitivity: Confidential
- Decision impact: Medium
- Supplied materials: Product page, privacy page, enterprise FAQ

## Executive summary

The supplied materials state that enterprise customer content is not used to train shared models, but they do not identify the selected plan or all underlying model providers. The highest-value next step is to confirm contractual applicability and subprocessors before approval.

## Priority finding

### Claim

“Your business data is never used to train our shared AI models.”

### Source

Enterprise privacy page, section “Training,” paragraph 2.

### Evidence status

**Partially supported**

### Rationale

The enterprise FAQ repeats the commitment, but the supplied order form does not identify whether the proposed plan is covered by the enterprise policy. The privacy page also does not name underlying model providers.

### Why it matters

The proposed use may include confidential customer information. The buyer needs to know which contractual commitment governs that information and whether subprocessors receive it.

### Follow-up question

Does the no-training commitment apply to the exact plan and configuration in our proposed order, and which model providers or subprocessors can process our prompts and outputs?

## Evidence limitations

This review describes only the supplied materials. It does not verify system behavior, contract enforceability, regulatory compliance, security, or overall vendor trustworthiness.

