export function ensureSchema(): Promise<void> {
  // Production migrations are applied explicitly with `npm run db:migrate`.
  return Promise.resolve();
}
