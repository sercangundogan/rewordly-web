import { waitUntil } from '@vercel/functions';

/**
 * Runs bookkeeping (cache, quota and usage rows) without making the user wait for it: the answer is sent
 * first, and Vercel keeps the function alive until the work ends. Outside Vercel the work simply runs on.
 * A failure is logged, never thrown: there is no request left to fail.
 */
export function afterResponse(work: Promise<unknown>, label: string): void {
  waitUntil(work.catch((error) => console.error(`${label} failed after the response:`, error)));
}
