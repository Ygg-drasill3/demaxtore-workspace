/** Show full-page fatal error only when the initial load failed (no cached data). */
export function showQueryFatalError(opts: {
  isLoading: boolean;
  isError: boolean;
  data: unknown;
}): boolean {
  return !opts.isLoading && opts.isError && opts.data == null;
}
