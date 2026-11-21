/**
 * The `fetch` the packages call. The global `fetch` of any runtime satisfies it; pass your own to add proxies,
 * instrumentation or test doubles.
 */
export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

/** Transport options every network call accepts. */
export type RequestOptions = {
  /** Defaults to the global `fetch`. */
  fetch?: FetchLike;
  /** Aborts the call (and every request it makes). */
  signal?: AbortSignal;
  /** Deadline for the whole call, in milliseconds. Defaults to 30 seconds. */
  timeoutMs?: number;
};

export const DEFAULT_TIMEOUT_MS = 30_000;

/** One signal for a call: its deadline, plus the caller's signal when there is one. */
export const callSignal = (options: RequestOptions): AbortSignal => {
  const deadline = AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  return options.signal === undefined
    ? deadline
    : AbortSignal.any([
        deadline,
        options.signal,
      ]);
};

/** Compares two strings in time that depends only on their length, for `state` checks. */
export const timingSafeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) {
    return false;
  }
  let difference = 0;
  for (let index = 0; index < a.length; index++) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return difference === 0;
};
