/**
 * LKID-63 — Shared API helpers for the no-auth tokenized flow.
 *
 * The backend is FastAPI (Railway). In local dev, tests, and MSW handlers we
 * default to http://localhost:8000; in Vercel builds NEXT_PUBLIC_API_URL is
 * set to the production Railway URL.
 */

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function apiUrl(path: string): string {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}
