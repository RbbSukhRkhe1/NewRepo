/** Integration-test and smoke-test causes — hidden from admin manage list. */
export function isTestCause(cause: { title: string }): boolean {
  const title = cause.title.trim();
  return (
    /^Test Cause\b/i.test(title) ||
    /^Updated Test\b/i.test(title) ||
    title === 'Blocked Cause'
  );
}
