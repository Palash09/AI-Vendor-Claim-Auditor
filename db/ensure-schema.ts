export function ensureSchema(): Promise<void> {
  // Netlify applies versioned SQL migrations during deploy and `netlify dev`.
  return Promise.resolve();
}
