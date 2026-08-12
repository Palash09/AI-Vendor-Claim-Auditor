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

test("supports browser-independent token-hash email callbacks", async () => {
  const callback = await readFile(
    new URL("../app/auth/callback/route.ts", import.meta.url),
    "utf8",
  );

  assert.match(callback, /token_hash/);
  assert.match(callback, /verifyOtp/);
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

test("rejects external and protocol-relative authentication return paths", () => {
  assert.equal(safeReturnPath("/audits/example?step=review"), "/audits/example?step=review");
  assert.equal(safeReturnPath("https://attacker.example/steal"), "/");
  assert.equal(safeReturnPath("//attacker.example/steal"), "/");
  assert.equal(safeReturnPath("/sign-in?returnTo=/sign-in"), "/");
  assert.equal(safeReturnPath("/auth/callback?code=untrusted"), "/");
});
