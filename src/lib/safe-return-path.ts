export function safeReturnPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(value)) return "/";
  const base = "https://bizflow.invalid";
  try {
    const target = new URL(value, base);
    return target.origin === base ? target.pathname + target.search + target.hash : "/";
  } catch {
    return "/";
  }
}
