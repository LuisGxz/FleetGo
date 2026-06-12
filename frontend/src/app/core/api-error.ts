/** Shape of RFC 7807 ProblemDetails as our API emits it (GlobalExceptionHandler). */
interface ProblemDetails {
  detail?: string;
  errors?: Record<string, string[]>;
}

/**
 * Turns any API error into user-readable messages.
 * Validation failures (400) carry per-field `errors`; business/auth failures carry `detail`.
 * Falls back to the caller's localized message only when the server said nothing useful.
 */
export function apiErrorMessages(e: unknown, fallback: string): string[] {
  const problem = (e as { error?: ProblemDetails })?.error;

  if (problem?.errors && Object.keys(problem.errors).length > 0) {
    return Object.values(problem.errors).flat();
  }
  if (problem?.detail) {
    return [problem.detail];
  }
  return [fallback];
}
