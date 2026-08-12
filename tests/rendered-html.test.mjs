import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AuditIntake } from "../app/AuditIntake.tsx";
import { SignInForm } from "../app/sign-in/SignInForm.tsx";
import { safeReturnPath } from "../app/reviewer-auth.ts";

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

test("renders universal email sign-in without ChatGPT language", () => {
  const html = renderToStaticMarkup(
    React.createElement(SignInForm, { returnTo: "/" }),
  );

  assert.match(html, /Use any email address/i);
  assert.match(html, /Email me a sign-in link/i);
  assert.doesNotMatch(html, /sign in with ChatGPT/i);
});

test("rejects external and protocol-relative authentication return paths", () => {
  assert.equal(safeReturnPath("/audits/example?step=review"), "/audits/example?step=review");
  assert.equal(safeReturnPath("https://attacker.example/steal"), "/");
  assert.equal(safeReturnPath("//attacker.example/steal"), "/");
  assert.equal(safeReturnPath("/sign-in?returnTo=/sign-in"), "/");
  assert.equal(safeReturnPath("/auth/callback?code=untrusted"), "/");
});
