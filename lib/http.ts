import { ZodError } from "zod";

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export function validationError(error: ZodError) {
  const firstIssue = error.issues[0];
  return jsonError(firstIssue?.message ?? "Check the submitted fields.", 422);
}
