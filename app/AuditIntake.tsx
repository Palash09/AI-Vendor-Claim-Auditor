"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Sensitivity = "public" | "internal" | "confidential" | "regulated";
type Impact = "low" | "medium" | "high";

type AuditRecord = {
  id: string;
  vendorName: string;
  productUrl: string | null;
  productDescription: string | null;
  intendedUse: string | null;
  dataSensitivity: Sensitivity | null;
  decisionImpact: Impact | null;
  assumptions: string;
  currentStep: number;
  status:
    | "draft"
    | "extracting"
    | "analyzing"
    | "review_required"
    | "approved"
    | "export_ready"
    | "failed"
    | "deleted";
  expiresAt: string;
};

type SourceRecord = {
  id: string;
  kind: "url" | "file";
  title: string;
  url: string | null;
  contentType: string | null;
  sizeBytes: number | null;
  status: "uploaded" | "pending" | "failed";
};

type Citation = {
  sourceId: string;
  fragmentId: string;
  sourceTitle: string;
  sourceLocation: string;
  sourceQuote: string;
};

type FindingRecord = {
  id: string;
  reviewerState: "pending" | "approved" | "removed";
  claim: string;
  claimType:
    | "customer_data_training"
    | "retention_deletion_access"
    | "model_provider_dependencies"
    | "performance_limitations"
    | "oversight_incidents_change_notification";
  claimCitation: Citation;
  evidenceStatus:
    | "Supported by supplied evidence"
    | "Partially supported"
    | "No evidence found in supplied materials"
    | "Conflicting disclosure"
    | "Not assessable from supplied materials";
  evidenceCitations: Citation[];
  rationale: string;
  buyerRelevance: "low" | "medium" | "high";
  followUpQuestion?: string;
};

type AnalysisRecord = {
  mode: "openai" | "demo";
  summary: string;
  findings: FindingRecord[];
  questions: string[];
  extractionWarnings: string[];
  createdAt: string;
  updatedAt: string;
};

type FragmentRecord = {
  id: string;
  sourceId: string;
  sourceTitle: string;
  sourceLocation: string;
  text: string;
};

type FindingEdits = Pick<
  FindingRecord,
  "claim" | "rationale" | "buyerRelevance" | "followUpQuestion"
>;

const AUDIT_POINTER_KEY = "claim-auditor-active-audit";

const STEPS = [
  { number: 1, short: "Vendor", title: "Which product are you reviewing?" },
  { number: 2, short: "Use", title: "How will your team use it?" },
  { number: 3, short: "Evidence", title: "Add the evidence packet" },
  { number: 4, short: "Review", title: "Confirm the review scope" },
] as const;

const SENSITIVITY_OPTIONS: Array<{
  value: Sensitivity;
  label: string;
  detail: string;
}> = [
  { value: "public", label: "Public", detail: "Already public information" },
  { value: "internal", label: "Internal", detail: "Routine company information" },
  {
    value: "confidential",
    label: "Confidential",
    detail: "Sensitive business or customer data",
  },
  {
    value: "regulated",
    label: "Regulated",
    detail: "Data with sector or legal restrictions",
  },
];

const IMPACT_OPTIONS: Array<{
  value: Impact;
  label: string;
  detail: string;
}> = [
  { value: "low", label: "Low", detail: "Limited operational effect" },
  { value: "medium", label: "Medium", detail: "Meaningful workflow impact" },
  { value: "high", label: "High", detail: "Material customer or business impact" },
];

export function AuditIntake({ reviewerName }: { reviewerName: string }) {
  const [step, setStep] = useState(1);
  const [audit, setAudit] = useState<AuditRecord | null>(null);
  const [sources, setSources] = useState<SourceRecord[]>([]);
  const [vendorName, setVendorName] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [intendedUse, setIntendedUse] = useState("");
  const [sensitivity, setSensitivity] = useState<Sensitivity | "">("");
  const [impact, setImpact] = useState<Impact | "">("");
  const [assumptions, setAssumptions] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [complete, setComplete] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisRecord | null>(null);
  const [fragments, setFragments] = useState<FragmentRecord[]>([]);

  useEffect(() => {
    const auditId = window.localStorage.getItem(AUDIT_POINTER_KEY);
    if (!auditId) return;

    void fetch(`/api/audits/${auditId}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Your previous draft has expired.");
        return response.json() as Promise<{
          audit: AuditRecord;
          sources: SourceRecord[];
          analysis: AnalysisRecord | null;
          fragments: FragmentRecord[];
        }>;
      })
      .then((payload) => {
        const record = payload.audit;
        setAudit(record);
        setSources(payload.sources);
        setVendorName(record.vendorName);
        setProductUrl(record.productUrl ?? "");
        setProductDescription(record.productDescription ?? "");
        setIntendedUse(record.intendedUse ?? "");
        setSensitivity(record.dataSensitivity ?? "");
        setImpact(record.decisionImpact ?? "");
        setAssumptions(record.assumptions);
        setStep(Math.min(Math.max(record.currentStep, 1), 4));
        setAnalysis(payload.analysis);
        setFragments(payload.fragments ?? []);
        setComplete(Boolean(payload.analysis));
        setNotice(payload.analysis ? "Your saved analysis was restored." : "Your saved draft was restored.");
      })
      .catch(() => {
        window.localStorage.removeItem(AUDIT_POINTER_KEY);
      });
  }, []);

  const activeStep = STEPS[step - 1];
  const sourceSlots = 3 - sources.length;
  const expiryLabel = useMemo(() => {
    if (!audit) return "Drafts are deleted within 7 days";
    return `Auto-deletes ${new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(audit.expiresAt))}`;
  }, [audit]);

  async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
    const response = await fetch(url, init);
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(payload?.error ?? "Something went wrong. Try again.");
    }
    return response.json() as Promise<T>;
  }

  async function saveVendor(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const body = { vendorName, productUrl, productDescription };
      const payload = audit
        ? await requestJson<{ audit: AuditRecord }>(`/api/audits/${audit.id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ section: "vendor", ...body }),
          })
        : await requestJson<{ audit: AuditRecord }>("/api/audits", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          });

      setAudit(payload.audit);
      window.localStorage.setItem(AUDIT_POINTER_KEY, payload.audit.id);
      setStep(2);
      setNotice("Vendor details saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }

  async function saveContext(event: FormEvent) {
    event.preventDefault();
    if (!audit || !sensitivity || !impact) return;
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const payload = await requestJson<{ audit: AuditRecord }>(
        `/api/audits/${audit.id}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            section: "context",
            intendedUse,
            dataSensitivity: sensitivity,
            decisionImpact: impact,
            assumptions,
          }),
        },
      );
      setAudit(payload.audit);
      setStep(3);
      setNotice("Use context saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }

  async function addUrlSource(event: FormEvent) {
    event.preventDefault();
    if (!audit || !sourceUrl) return;
    setBusy(true);
    setError("");

    try {
      const payload = await requestJson<{ source: SourceRecord }>(
        `/api/audits/${audit.id}/sources`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: sourceUrl }),
        },
      );
      setSources((current) => [...current, payload.source]);
      setSourceUrl("");
      setNotice("Evidence URL added.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to add URL.");
    } finally {
      setBusy(false);
    }
  }

  async function addFileSource(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !audit) return;
    setBusy(true);
    setError("");

    try {
      const formData = new FormData();
      formData.set("file", file);
      const payload = await requestJson<{ source: SourceRecord }>(
        `/api/audits/${audit.id}/sources`,
        { method: "POST", body: formData },
      );
      setSources((current) => [...current, payload.source]);
      setNotice(`${file.name} uploaded privately.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to upload.");
    } finally {
      event.target.value = "";
      setBusy(false);
    }
  }

  async function removeSource(sourceId: string) {
    if (!audit) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/audits/${audit.id}/sources/${sourceId}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error("Unable to remove this source.");
      setSources((current) => current.filter((source) => source.id !== sourceId));
      setNotice("Source removed.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to remove.");
    } finally {
      setBusy(false);
    }
  }

  async function continueToReview() {
    if (!audit) return;
    setBusy(true);
    setError("");
    try {
      const payload = await requestJson<{ audit: AuditRecord }>(
        `/api/audits/${audit.id}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ section: "progress", currentStep: 4 }),
        },
      );
      setAudit(payload.audit);
      setStep(4);
      setNotice("Evidence packet saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to continue.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteDraft() {
    if (!audit) {
      resetDraft();
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/audits/${audit.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Unable to delete this draft.");
      resetDraft();
      setNotice("Draft and uploaded evidence deleted.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete.");
    } finally {
      setBusy(false);
    }
  }

  async function startAnalysis() {
    if (!audit) return;
    setBusy(true);
    setError("");
    setNotice("Extracting the supplied materials and checking citations…");
    try {
      const payload = await requestJson<{
        audit: AuditRecord;
        analysis: AnalysisRecord;
        fragments: FragmentRecord[];
      }>(`/api/audits/${audit.id}/analyze`, { method: "POST" });
      setAudit(payload.audit);
      setAnalysis(payload.analysis);
      setFragments(payload.fragments);
      setNotice("Analysis complete. Review each finding before sharing it.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to analyze this packet.");
      setNotice("");
    } finally {
      setBusy(false);
    }
  }

  async function reviewFinding(
    findingId: string,
    reviewerState: FindingRecord["reviewerState"],
  ) {
    if (!audit || !analysis) return;
    const previous = analysis;
    setAnalysis({
      ...analysis,
      findings: analysis.findings.map((finding) =>
        finding.id === findingId ? { ...finding, reviewerState } : finding,
      ),
    });
    setError("");
    try {
      await requestJson<{ finding: FindingRecord }>(
        `/api/audits/${audit.id}/findings/${findingId}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reviewerState }),
        },
      );
      setAudit((current) =>
        current ? { ...current, status: "review_required" } : current,
      );
    } catch (caught) {
      setAnalysis(previous);
      setError(caught instanceof Error ? caught.message : "Unable to save this review decision.");
    }
  }

  async function editFinding(findingId: string, edits: FindingEdits) {
    if (!audit || !analysis) return false;
    setBusy(true);
    setError("");
    try {
      const payload = await requestJson<{ finding: FindingRecord }>(
        `/api/audits/${audit.id}/findings/${findingId}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(edits),
        },
      );
      setAnalysis({
        ...analysis,
        findings: analysis.findings.map((finding) =>
          finding.id === findingId ? payload.finding : finding,
        ),
      });
      setAudit({ ...audit, status: "review_required" });
      setNotice("Finding updated. Review and approve it again.");
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update this finding.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function completeReview() {
    if (!audit) return;
    setBusy(true);
    setError("");
    try {
      const payload = await requestJson<{ audit: AuditRecord }>(
        `/api/audits/${audit.id}/approve`,
        { method: "POST" },
      );
      setAudit(payload.audit);
      setNotice("Review complete. The decision brief is ready to share.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to complete review.");
    } finally {
      setBusy(false);
    }
  }

  async function fetchDecisionBrief() {
    if (!audit) throw new Error("No audit is available.");
    const response = await fetch(`/api/audits/${audit.id}/export`, {
      cache: "no-store",
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? "Unable to prepare the decision brief.");
    }
    return response.text();
  }

  async function shareBrief() {
    if (!audit) return;
    setBusy(true);
    setError("");
    try {
      const text = await fetchDecisionBrief();
      if (navigator.share) {
        await navigator.share({ title: `${audit.vendorName} evidence-gap brief`, text });
        setNotice("Decision brief shared.");
      } else {
        downloadTextBrief(text, audit.vendorName);
        setNotice("Sharing is unavailable here, so the brief was downloaded.");
      }
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setError(caught instanceof Error ? caught.message : "Unable to share the brief.");
    } finally {
      setBusy(false);
    }
  }

  async function downloadBrief() {
    if (!audit) return;
    setBusy(true);
    setError("");
    try {
      downloadTextBrief(await fetchDecisionBrief(), audit.vendorName);
      setNotice("Decision brief downloaded.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to download the brief.");
    } finally {
      setBusy(false);
    }
  }

  function resetDraft() {
    window.localStorage.removeItem(AUDIT_POINTER_KEY);
    setAudit(null);
    setSources([]);
    setVendorName("");
    setProductUrl("");
    setProductDescription("");
    setIntendedUse("");
    setSensitivity("");
    setImpact("");
    setAssumptions("");
    setStep(1);
    setComplete(false);
    setAnalysis(null);
    setFragments([]);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="AI Vendor Claim Auditor home">
          <span className="brand-mark" aria-hidden="true">
            CA
          </span>
          <span>
            <strong>Claim Auditor</strong>
            <small>AI vendor evidence review</small>
          </span>
        </Link>
        <div className="reviewer-chip" title={reviewerName}>
          <span aria-hidden="true">●</span>
          <span>{reviewerName}</span>
        </div>
      </header>

      <div className="page-frame">
        <section className="intro-panel" aria-labelledby="page-title">
          <p className="eyebrow">New evidence review</p>
          <h1 id="page-title">Find the questions hidden in vendor documents.</h1>
          <p className="intro-copy">
            Add one product and a small evidence packet. You’ll get a cited,
            reviewable ledger of what the supplied materials do—and do not—support.
          </p>
          <div className="scope-note">
            <span className="scope-icon" aria-hidden="true">i</span>
            <p>
              This tool assesses supplied evidence. It does not certify compliance,
              safety, or whether a vendor is truthful.
            </p>
          </div>
        </section>

        <section className="workspace" aria-label="Audit intake">
          <nav className="stepper" aria-label="Audit progress">
            {STEPS.map((item) => (
              <div
                className={`step ${item.number === step ? "is-active" : ""} ${
                  item.number < step ? "is-complete" : ""
                }`}
                key={item.number}
                aria-current={item.number === step ? "step" : undefined}
              >
                <span className="step-number">
                  {item.number < step ? "✓" : item.number}
                </span>
                <span className="step-label">{item.short}</span>
              </div>
            ))}
          </nav>

          <div className="workspace-grid">
            <div className="form-card">
              <div className="form-heading">
                <div>
                  <p className="step-kicker">{complete ? "Analysis" : `Step ${step} of 4`}</p>
                  <h2>
                    {complete
                      ? analysis
                        ? "Review the cited findings"
                        : "Run the evidence analysis"
                      : activeStep.title}
                  </h2>
                </div>
                <span className="save-state">{busy ? "Working…" : "Autosaved"}</span>
              </div>

              {error ? <div className="message error-message" role="alert">{error}</div> : null}
              {notice ? <div className="message notice-message" role="status">{notice}</div> : null}

              {complete && analysis ? (
                <AnalysisPanel
                  analysis={analysis}
                  audit={audit}
                  fragments={fragments}
                  busy={busy}
                  onReview={(findingId, state) => void reviewFinding(findingId, state)}
                  onEdit={editFinding}
                  onComplete={() => void completeReview()}
                  onShare={() => void shareBrief()}
                  onDownload={() => void downloadBrief()}
                  onStartOver={deleteDraft}
                />
              ) : complete ? (
                <CompletionPanel
                  audit={audit}
                  sources={sources}
                  busy={busy}
                  onAnalyze={() => void startAnalysis()}
                  onStartOver={deleteDraft}
                />
              ) : null}

              {!complete && step === 1 ? (
                <form onSubmit={saveVendor} className="form-stack">
                  <Field label="Vendor or product name" required>
                    <input
                      value={vendorName}
                      onChange={(event) => setVendorName(event.target.value)}
                      placeholder="ExampleAssist"
                      autoComplete="organization"
                      required
                      minLength={2}
                      maxLength={160}
                    />
                  </Field>
                  <Field
                    label="Product page URL"
                    hint="Add a complete URL, or paste a description below."
                  >
                    <input
                      type="url"
                      inputMode="url"
                      value={productUrl}
                      onChange={(event) => setProductUrl(event.target.value)}
                      placeholder="https://vendor.example/product"
                      maxLength={2_000}
                    />
                  </Field>
                  <div className="or-divider"><span>or</span></div>
                  <Field label="Product description">
                    <textarea
                      value={productDescription}
                      onChange={(event) => setProductDescription(event.target.value)}
                      placeholder="Paste the vendor’s product description or core claims."
                      rows={5}
                      maxLength={8_000}
                    />
                  </Field>
                  <FormActions
                    primaryLabel="Continue to intended use"
                    primaryDisabled={
                      busy || !vendorName.trim() || (!productUrl.trim() && !productDescription.trim())
                    }
                  />
                </form>
              ) : null}

              {!complete && step === 2 ? (
                <form onSubmit={saveContext} className="form-stack">
                  <Field
                    label="Intended use"
                    hint="Be specific. The same product may have different gaps for different uses."
                    required
                  >
                    <textarea
                      value={intendedUse}
                      onChange={(event) => setIntendedUse(event.target.value)}
                      placeholder="Drafting internal customer-support replies reviewed by an employee before sending"
                      rows={5}
                      minLength={10}
                      maxLength={4_000}
                      required
                    />
                  </Field>
                  <ChoiceGroup
                    legend="Data sensitivity"
                    name="sensitivity"
                    value={sensitivity}
                    onChange={(value) => setSensitivity(value as Sensitivity)}
                    options={SENSITIVITY_OPTIONS}
                  />
                  <ChoiceGroup
                    legend="Decision impact"
                    name="impact"
                    value={impact}
                    onChange={(value) => setImpact(value as Impact)}
                    options={IMPACT_OPTIONS}
                  />
                  <Field label="Assumptions or constraints" hint="Optional">
                    <textarea
                      value={assumptions}
                      onChange={(event) => setAssumptions(event.target.value)}
                      placeholder="Enterprise plan; US-only users; no autonomous decisions"
                      rows={3}
                      maxLength={2_000}
                    />
                  </Field>
                  <FormActions
                    backLabel="Vendor"
                    onBack={() => setStep(1)}
                    primaryLabel="Continue to evidence"
                    primaryDisabled={busy || intendedUse.trim().length < 10 || !sensitivity || !impact}
                  />
                </form>
              ) : null}

              {!complete && step === 3 ? (
                <div className="form-stack">
                  <div className="packet-counter">
                    <div>
                      <strong>{sources.length} of 3 sources</strong>
                      <span>{sourceSlots > 0 ? `${sourceSlots} slots available` : "Packet limit reached"}</span>
                    </div>
                    <span className="counter-ring" aria-hidden="true">{sources.length}/3</span>
                  </div>

                  {sources.length > 0 ? (
                    <div className="source-list" aria-label="Evidence sources">
                      {sources.map((source) => (
                        <article className="source-card" key={source.id}>
                          <span className="source-type" aria-hidden="true">
                            {source.kind === "file" ? "DOC" : "URL"}
                          </span>
                          <div>
                            <strong>{source.title}</strong>
                            <span>
                              {source.kind === "file"
                                ? formatFileSize(source.sizeBytes ?? 0)
                                : source.url}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="icon-button"
                            onClick={() => void removeSource(source.id)}
                            aria-label={`Remove ${source.title}`}
                            disabled={busy}
                          >
                            ×
                          </button>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-packet">
                      <span aria-hidden="true">01</span>
                      <strong>Your packet is empty</strong>
                      <p>Add a trust page, privacy policy, DPA, model card, or sales response.</p>
                    </div>
                  )}

                  {sourceSlots > 0 ? (
                    <>
                      <form onSubmit={addUrlSource} className="inline-source-form">
                        <label htmlFor="source-url">Supporting URL</label>
                        <div>
                          <input
                            id="source-url"
                            type="url"
                            inputMode="url"
                            value={sourceUrl}
                            onChange={(event) => setSourceUrl(event.target.value)}
                            placeholder="https://vendor.example/privacy"
                          />
                          <button type="submit" className="secondary-button" disabled={busy || !sourceUrl}>
                            Add URL
                          </button>
                        </div>
                      </form>

                      <label className={`upload-button ${busy ? "is-disabled" : ""}`}>
                        <input
                          type="file"
                          accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
                          onChange={(event) => void addFileSource(event)}
                          disabled={busy}
                        />
                        <span className="upload-plus" aria-hidden="true">+</span>
                        <span>
                          <strong>Choose a document</strong>
                          <small>PDF, TXT, or Markdown · 10 MB max</small>
                        </span>
                      </label>
                    </>
                  ) : null}

                  <FormActions
                    backLabel="Intended use"
                    onBack={() => setStep(2)}
                    primaryLabel="Review scope"
                    onPrimary={() => void continueToReview()}
                    primaryDisabled={busy}
                    primaryType="button"
                  />
                </div>
              ) : null}

              {!complete && step === 4 ? (
                <div className="form-stack">
                  <ReviewSummary
                    audit={audit}
                    sources={sources}
                    sensitivity={sensitivity}
                    impact={impact}
                    intendedUse={intendedUse}
                  />
                  <div className="review-boundary">
                    <strong>What this review will cover</strong>
                    <ul>
                      <li>Customer-data use and training</li>
                      <li>Retention, deletion, and access</li>
                      <li>Model and provider dependencies</li>
                      <li>Performance claims and limitations</li>
                      <li>Oversight, incidents, and change notification</li>
                    </ul>
                  </div>
                  <label className="consent-row">
                    <input type="checkbox" required id="scope-confirmation" />
                    <span>
                      I understand this review is limited to the supplied materials and requires human review before sharing.
                    </span>
                  </label>
                  <FormActions
                    backLabel="Evidence"
                    onBack={() => setStep(3)}
                    primaryLabel="Analyze supplied evidence"
                    onPrimary={() => {
                      const checkbox = document.getElementById("scope-confirmation") as HTMLInputElement | null;
                      if (!checkbox?.checked) {
                        setError("Confirm the evidence scope before continuing.");
                        return;
                      }
                      setError("");
                      setComplete(true);
                      void startAnalysis();
                    }}
                    primaryDisabled={busy}
                    primaryType="button"
                  />
                </div>
              ) : null}
            </div>

            <aside className="privacy-card" aria-label="Privacy and scope">
              <div className="privacy-heading">
                <span className="lock-mark" aria-hidden="true">⌁</span>
                <div>
                  <strong>Private by default</strong>
                  <span>{expiryLabel}</span>
                </div>
              </div>
              <ul>
                <li>Only your supplied packet is analyzed</li>
                <li>Files are stored privately</li>
                <li>You can delete the draft immediately</li>
              </ul>
              {audit ? (
                <button className="text-button danger-text" type="button" onClick={() => void deleteDraft()} disabled={busy}>
                  Delete draft and evidence
                </button>
              ) : null}
            </aside>
          </div>
        </section>
      </div>

      <footer>
        <span>Evidence status is not a legal, compliance, safety, or purchasing verdict.</span>
        <span>Claim Auditor · MVP</span>
      </footer>
    </main>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-label">
        <strong>{label}</strong>
        {required ? <span>Required</span> : hint ? <span>{hint}</span> : null}
      </span>
      {children}
      {required && hint ? <small>{hint}</small> : null}
    </label>
  );
}

function ChoiceGroup({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: string;
  options: Array<{ value: string; label: string; detail: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="choice-group">
      <legend>{legend}</legend>
      <div className="choice-grid">
        {options.map((option) => (
          <label className={`choice-card ${value === option.value ? "is-selected" : ""}`} key={option.value}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              aria-label={`${option.label}: ${option.detail}`}
            />
            <span className="radio-dot" aria-hidden="true" />
            <span>
              <strong>{option.label}</strong>
              <small>{option.detail}</small>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function FormActions({
  backLabel,
  onBack,
  primaryLabel,
  onPrimary,
  primaryDisabled,
  primaryType = "submit",
}: {
  backLabel?: string;
  onBack?: () => void;
  primaryLabel: string;
  onPrimary?: () => void;
  primaryDisabled?: boolean;
  primaryType?: "submit" | "button";
}) {
  return (
    <div className="form-actions">
      {onBack ? (
        <button className="back-button" type="button" onClick={onBack}>
          <span aria-hidden="true">←</span> {backLabel}
        </button>
      ) : <span />}
      <button
        className="primary-button"
        type={primaryType}
        onClick={onPrimary}
        disabled={primaryDisabled}
      >
        {primaryLabel} <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}

function ReviewSummary({
  audit,
  sources,
  sensitivity,
  impact,
  intendedUse,
}: {
  audit: AuditRecord | null;
  sources: SourceRecord[];
  sensitivity: string;
  impact: string;
  intendedUse: string;
}) {
  return (
    <dl className="review-summary">
      <div>
        <dt>Vendor</dt>
        <dd>{audit?.vendorName}</dd>
      </div>
      <div>
        <dt>Intended use</dt>
        <dd>{intendedUse}</dd>
      </div>
      <div className="summary-pair">
        <span><dt>Data</dt><dd>{capitalize(sensitivity)}</dd></span>
        <span><dt>Impact</dt><dd>{capitalize(impact)}</dd></span>
      </div>
      <div>
        <dt>Supplied evidence</dt>
        <dd>{sources.length === 0 ? "Product page or description only" : `${sources.length} supporting source${sources.length === 1 ? "" : "s"}`}</dd>
      </div>
    </dl>
  );
}

function CompletionPanel({
  audit,
  sources,
  busy,
  onAnalyze,
  onStartOver,
}: {
  audit: AuditRecord | null;
  sources: SourceRecord[];
  busy: boolean;
  onAnalyze: () => void;
  onStartOver: () => void;
}) {
  return (
    <div className="completion-panel">
      <span className="completion-mark" aria-hidden="true">✓</span>
      <p className="eyebrow">Packet ready</p>
      <h2>{audit?.vendorName} is ready for evidence analysis.</h2>
      <p>
        Your intended use and {sources.length} supporting source{sources.length === 1 ? "" : "s"} are saved privately. Start the cited claim-to-evidence review now.
      </p>
      <div className="completion-actions">
        <button className="primary-button" type="button" onClick={onAnalyze} disabled={busy}>
          {busy ? "Analyzing supplied evidence…" : "Analyze supplied evidence"}
        </button>
        <button className="text-button" type="button" onClick={onStartOver}>
          Delete and start another review
        </button>
      </div>
    </div>
  );
}

function AnalysisPanel({
  analysis,
  audit,
  fragments,
  busy,
  onReview,
  onEdit,
  onComplete,
  onShare,
  onDownload,
  onStartOver,
}: {
  analysis: AnalysisRecord;
  audit: AuditRecord | null;
  fragments: FragmentRecord[];
  busy: boolean;
  onReview: (findingId: string, state: FindingRecord["reviewerState"]) => void;
  onEdit: (findingId: string, edits: FindingEdits) => Promise<boolean>;
  onComplete: () => void;
  onShare: () => void;
  onDownload: () => void;
  onStartOver: () => void;
}) {
  const [activeFragmentId, setActiveFragmentId] = useState<string | null>(null);
  const visibleFindings = analysis.findings.filter(
    (finding) => finding.reviewerState !== "removed",
  );
  const removedFindings = analysis.findings.filter(
    (finding) => finding.reviewerState === "removed",
  );
  const approvedCount = visibleFindings.filter(
    (finding) => finding.reviewerState === "approved",
  ).length;
  const allReviewed =
    visibleFindings.length > 0 && approvedCount === visibleFindings.length;
  const isApproved = audit?.status === "approved";

  function openSource(fragmentId: string) {
    setActiveFragmentId(fragmentId);
    window.setTimeout(() => {
      document.getElementById(`fragment-${fragmentId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 30);
  }

  return (
    <div className="analysis-panel">
      <header className="result-header">
        <div>
          <p className="eyebrow">{isApproved ? "Review complete" : "Review required"}</p>
          <h2>{audit?.vendorName} evidence gaps</h2>
        </div>
        <span className="result-mode">
          {analysis.mode === "openai" ? "AI-assisted" : "Local demo analysis"}
        </span>
      </header>

      <div className="result-summary">
        <strong>{analysis.summary}</strong>
        <span>
          {approvedCount} of {visibleFindings.length} retained findings approved
          {removedFindings.length ? ` · ${removedFindings.length} removed` : ""}
        </span>
      </div>

      {analysis.mode === "demo" ? (
        <div className="message notice-message" role="note">
          No OpenAI API key is connected, so this run used the conservative local demo analyzer. It only surfaces cited claims and treats missing separate support as an evidence gap.
        </div>
      ) : null}

      {analysis.extractionWarnings.length ? (
        <details className="warning-details">
          <summary>{analysis.extractionWarnings.length} source warning{analysis.extractionWarnings.length === 1 ? "" : "s"}</summary>
          <ul>{analysis.extractionWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
        </details>
      ) : null}

      <section className="finding-section" aria-labelledby="findings-title">
        <div className="section-heading">
          <p className="step-kicker">Cited finding ledger</p>
          <h3 id="findings-title">Highest-priority gaps</h3>
        </div>
        {visibleFindings.length ? (
          <div className="finding-list">
            {visibleFindings.map((finding, index) => (
              <FindingCard
                key={finding.id}
                finding={finding}
                index={index}
                busy={busy}
                onReview={onReview}
                onEdit={onEdit}
                onOpenSource={openSource}
              />
            ))}
          </div>
        ) : (
          <div className="empty-packet">
            <strong>No visible findings</strong>
            <p>Add more readable supplied evidence or restore a removed finding by rerunning the analysis.</p>
          </div>
        )}
        {removedFindings.length ? (
          <details className="removed-findings">
            <summary>Removed findings ({removedFindings.length})</summary>
            <div>
              {removedFindings.map((finding) => (
                <article key={finding.id}>
                  <span>{finding.claim}</span>
                  <button type="button" onClick={() => onReview(finding.id, "pending")}>
                    Restore
                  </button>
                </article>
              ))}
            </div>
          </details>
        ) : null}
      </section>

      <section className="question-section" aria-labelledby="questions-title">
        <p className="step-kicker">Next action</p>
        <h3 id="questions-title">Questions for the vendor</h3>
        <ol>{analysis.questions.map((question) => <li key={question}>{question}</li>)}</ol>
      </section>

      <SourceViewer
        fragments={fragments}
        activeFragmentId={activeFragmentId}
      />

      <section className={`review-gate ${isApproved ? "is-approved" : ""}`}>
        <div>
          <p className="step-kicker">Human review gate</p>
          <h3>{isApproved ? "Decision brief ready" : "Complete this review"}</h3>
          <p>
            {isApproved
              ? "Every retained finding was approved. You can now share or download the brief."
              : allReviewed
                ? "Every retained finding is approved. Complete the review to unlock sharing."
                : "Approve or remove every finding. Editing a finding returns it to needs review."}
          </p>
        </div>
        {isApproved ? (
          <div className="export-actions">
            <button className="primary-button" type="button" onClick={onShare} disabled={busy}>
              Share brief
            </button>
            <button className="secondary-button" type="button" onClick={onDownload} disabled={busy}>
              Download .md
            </button>
          </div>
        ) : (
          <button
            className="primary-button"
            type="button"
            onClick={onComplete}
            disabled={!allReviewed || busy}
          >
            Complete human review
          </button>
        )}
      </section>

      <div className="result-boundary">
        Human review is required before sharing. This analyzes only supplied materials and is not a legal, compliance, safety, or purchasing verdict.
      </div>
      <button className="text-button danger-text" type="button" onClick={onStartOver}>
        Delete this packet and start another review
      </button>
    </div>
  );
}

function FindingCard({
  finding,
  index,
  busy,
  onReview,
  onEdit,
  onOpenSource,
}: {
  finding: FindingRecord;
  index: number;
  busy: boolean;
  onReview: (findingId: string, state: FindingRecord["reviewerState"]) => void;
  onEdit: (findingId: string, edits: FindingEdits) => Promise<boolean>;
  onOpenSource: (fragmentId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [claim, setClaim] = useState(finding.claim);
  const [rationale, setRationale] = useState(finding.rationale);
  const [buyerRelevance, setBuyerRelevance] = useState(finding.buyerRelevance);
  const [followUpQuestion, setFollowUpQuestion] = useState(
    finding.followUpQuestion ?? "",
  );

  function cancelEditing() {
    setClaim(finding.claim);
    setRationale(finding.rationale);
    setBuyerRelevance(finding.buyerRelevance);
    setFollowUpQuestion(finding.followUpQuestion ?? "");
    setEditing(false);
  }

  async function saveEditing(event: FormEvent) {
    event.preventDefault();
    const saved = await onEdit(finding.id, {
      claim,
      rationale,
      buyerRelevance,
      followUpQuestion,
    });
    if (saved) setEditing(false);
  }

  return (
    <article className={`finding-card state-${finding.reviewerState}`}>
      <div className="finding-topline">
        <span className="finding-index">{String(index + 1).padStart(2, "0")}</span>
        <span className="status-badge">{finding.evidenceStatus}</span>
        <span className={`relevance relevance-${finding.buyerRelevance}`}>
          {finding.buyerRelevance} relevance
        </span>
      </div>

      {editing ? (
        <form className="finding-edit-form" onSubmit={saveEditing}>
          <Field label="Atomic claim" required>
            <textarea value={claim} onChange={(event) => setClaim(event.target.value)} rows={3} maxLength={2_000} required />
          </Field>
          <Field label="Rationale" required>
            <textarea value={rationale} onChange={(event) => setRationale(event.target.value)} rows={4} maxLength={3_000} required />
          </Field>
          <Field label="Intended-use relevance">
            <select aria-label="Intended-use relevance" value={buyerRelevance} onChange={(event) => setBuyerRelevance(event.target.value as FindingRecord["buyerRelevance"])}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </Field>
          <Field label="Vendor follow-up question" required>
            <textarea value={followUpQuestion} onChange={(event) => setFollowUpQuestion(event.target.value)} rows={3} maxLength={1_000} required />
          </Field>
          <div className="edit-actions">
            <button className="primary-button" type="submit" disabled={busy}>Save changes</button>
            <button className="text-button" type="button" onClick={cancelEditing} disabled={busy}>Cancel</button>
          </div>
        </form>
      ) : (
        <>
          <h4>{finding.claim}</h4>
          <p className="finding-rationale">{finding.rationale}</p>
        </>
      )}

      <details className="citation-details">
        <summary>Inspect exact citation</summary>
        <div>
          <strong>{finding.claimCitation.sourceTitle}</strong>
          <span>{finding.claimCitation.sourceLocation}</span>
          <blockquote>“{finding.claimCitation.sourceQuote}”</blockquote>
          <button className="citation-link" type="button" onClick={() => onOpenSource(finding.claimCitation.fragmentId)}>
            Open in supplied source
          </button>
          {finding.evidenceCitations.length ? (
            <div className="evidence-citation-list">
              <span>Separate supplied evidence</span>
              {finding.evidenceCitations.map((citation) => (
                <article key={`${citation.fragmentId}-${citation.sourceQuote}`}>
                  <strong>{citation.sourceTitle}</strong>
                  <small>{citation.sourceLocation}</small>
                  <blockquote>“{citation.sourceQuote}”</blockquote>
                  <button className="citation-link" type="button" onClick={() => onOpenSource(citation.fragmentId)}>
                    Open evidence source
                  </button>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </details>
      {!editing && finding.followUpQuestion ? (
        <div className="follow-up">
          <span>Ask the vendor</span>
          <p>{finding.followUpQuestion}</p>
        </div>
      ) : null}
      {!editing ? (
        <div className="review-actions" aria-label="Reviewer decision">
          <button
            type="button"
            className={finding.reviewerState === "approved" ? "is-selected" : ""}
            onClick={() => onReview(finding.id, "approved")}
            disabled={busy}
          >
            ✓ Approve
          </button>
          <button type="button" onClick={() => setEditing(true)} disabled={busy}>Edit</button>
          <button type="button" onClick={() => onReview(finding.id, "removed")} disabled={busy}>Remove</button>
        </div>
      ) : null}
    </article>
  );
}

function SourceViewer({
  fragments,
  activeFragmentId,
}: {
  fragments: FragmentRecord[];
  activeFragmentId: string | null;
}) {
  const groups = Array.from(new Set(fragments.map((fragment) => fragment.sourceId))).map(
    (sourceId) => ({
      sourceId,
      title: fragments.find((fragment) => fragment.sourceId === sourceId)?.sourceTitle ?? "Supplied source",
      fragments: fragments.filter((fragment) => fragment.sourceId === sourceId),
    }),
  );
  return (
    <section className="source-viewer" aria-labelledby="sources-title">
      <div className="section-heading">
        <p className="step-kicker">Citation source viewer</p>
        <h3 id="sources-title">Supplied text</h3>
      </div>
      {groups.length ? groups.map((group) => (
        <details
          className="source-group"
          key={group.sourceId}
          open={group.fragments.some((fragment) => fragment.id === activeFragmentId)}
        >
          <summary>
            <div>
              <span>{group.title}</span>
              <em>
                {group.sourceId === "product-description" || group.sourceId === "product-url"
                  ? "Vendor statement source"
                  : "Supplied supporting evidence"}
              </em>
            </div>
            <small>{group.fragments.length} fragment{group.fragments.length === 1 ? "" : "s"}</small>
          </summary>
          <div className="fragment-list">
            {group.fragments.map((fragment) => (
              <article
                id={`fragment-${fragment.id}`}
                className={fragment.id === activeFragmentId ? "is-active" : ""}
                key={fragment.id}
              >
                <strong>{fragment.sourceLocation}</strong>
                <p>{fragment.text}</p>
              </article>
            ))}
          </div>
        </details>
      )) : (
        <p className="source-empty">Rerun this saved analysis to attach its normalized source fragments.</p>
      )}
    </section>
  );
}

function downloadTextBrief(text: string, vendorName: string) {
  const filename = `${vendorName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "vendor"}-evidence-brief.md`;
  const url = URL.createObjectURL(new Blob([text], { type: "text/markdown" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function formatFileSize(bytes: number) {
  if (bytes < 1_024) return `${bytes} B`;
  if (bytes < 1_024 * 1_024) return `${Math.round(bytes / 1_024)} KB`;
  return `${(bytes / (1_024 * 1_024)).toFixed(1)} MB`;
}

function capitalize(value: string) {
  return value ? value[0].toUpperCase() + value.slice(1) : "Not set";
}
