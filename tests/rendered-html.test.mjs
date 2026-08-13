import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AuditIntake } from "../app/AuditIntake.tsx";
import { SignInForm } from "../app/sign-in/SignInForm.tsx";
import { safeReturnPath } from "../app/reviewer-auth.ts";
import { getOpenAIAnalysisKey } from "../lib/analyze-evidence.ts";

test("server-renders the mobile application shell", async () => {
  const html = renderToStaticMarkup(
    React.createElement(AuditIntake, { reviewerName: "Test reviewer" }),
  );
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const manifest = await readFile(
    new URL("../public/manifest.webmanifest", import.meta.url),
    "utf8",
  );

  assert.match(layout, /Claim Auditor — AI vendor evidence review/i);
  assert.match(html, /Find the questions hidden in vendor documents/i);
  assert.match(layout, /manifest\.webmanifest/i);
  assert.match(manifest, /"display"\s*:\s*"standalone"/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("renders one-tap guest demo access without requiring email", () => {
  const html = renderToStaticMarkup(
    React.createElement(SignInForm, { returnTo: "/", enableGuestDemo: true }),
  );

  assert.match(html, /Continue to the demo/i);
  assert.match(html, /No email required/i);
  assert.doesNotMatch(html, /Email me a sign-in link/i);
  assert.doesNotMatch(html, /sign in with ChatGPT/i);
});

test("renders Google as the production sign-in path", () => {
  const html = renderToStaticMarkup(
    React.createElement(SignInForm, {
      returnTo: "/",
      enableGoogleAuth: true,
    }),
  );

  assert.match(html, /Continue with Google/i);
  assert.doesNotMatch(html, /Continue to the demo/i);
  assert.doesNotMatch(html, /Email me a sign-in link/i);
});

test("keeps long source fragments inside the mobile viewport", async () => {
  const css = await readFile(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );

  assert.match(css, /\.fragment-list article\s*\{[^}]*min-width:\s*0/s);
  assert.match(css, /\.fragment-list p,[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(css, /body\s*\{[^}]*overflow-x:\s*clip/s);
});

test("supports browser-independent token-hash email callbacks", async () => {
  const callback = await readFile(
    new URL("../app/auth/callback/route.ts", import.meta.url),
    "utf8",
  );

  assert.match(callback, /token_hash/);
  assert.match(callback, /verifyOtp/);
});

test("removes one-time OAuth parameters after an authenticated redirect", async () => {
  const reviewerAccount = await readFile(
    new URL("../app/ReviewerAccount.tsx", import.meta.url),
    "utf8",
  );

  assert.match(reviewerAccount, /searchParams\.delete\("code"\)/);
  assert.match(reviewerAccount, /history\.replaceState/);
});

test("requires an explicit billing-boundary flag before using the OpenAI key", () => {
  assert.equal(
    getOpenAIAnalysisKey({ OPENAI_API_KEY: "secret", OPENAI_ANALYSIS_ENABLED: "false" }),
    null,
  );
  assert.equal(
    getOpenAIAnalysisKey({ OPENAI_API_KEY: "secret", OPENAI_ANALYSIS_ENABLED: "true" }),
    "secret",
  );
});

test("does not silently replace a failed production AI request with local results", async () => {
  const source = await readFile(
    new URL("../lib/analyze-evidence.ts", import.meta.url),
    "utf8",
  );
  const route = await readFile(
    new URL("../app/api/audits/[auditId]/analyze/route.ts", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /OpenAI analysis failed; using the local guarded fallback/);
  assert.match(source, /return analyzeWithOpenAI\(apiKey, audit, fragments\)/);
  assert.match(route, /DAILY_REVIEWER_ANALYSIS_LIMIT\s*=\s*3/);
  assert.match(route, /DAILY_APPLICATION_ANALYSIS_LIMIT\s*=\s*25/);
});

test("rejects external and protocol-relative authentication return paths", () => {
  assert.equal(safeReturnPath("/audits/example?step=review"), "/audits/example?step=review");
  assert.equal(safeReturnPath("https://attacker.example/steal"), "/");
  assert.equal(safeReturnPath("//attacker.example/steal"), "/");
  assert.equal(safeReturnPath("/sign-in?returnTo=/sign-in"), "/");
  assert.equal(safeReturnPath("/auth/callback?code=untrusted"), "/");
});
