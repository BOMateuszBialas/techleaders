import "server-only";

/**
 * Minimal structured server logger. Every context object is redacted before
 * it is written: sensitive keys are masked, URL credentials are stripped and
 * errors are reduced to name, message and stack. Use it instead of `console.*`
 * in server code.
 */
type LogLevel = "info" | "warn" | "error";
export type LogContext = Record<string, unknown>;

const REDACTED = "[REDACTED]";
const MAX_DEPTH = 5;
const SENSITIVE_KEY =
  /pass(word)?|secret|token|authorization|cookie|session|api[-_]?key|jwt|card|cvc|cvv/i;
const URL_CREDENTIALS = /\/\/[^/\s:@]+:[^/\s@]+@/g;

function redactString(value: string): string {
  return value.replace(URL_CREDENTIALS, `//${REDACTED}@`);
}

export function redact(value: unknown, depth = 0): unknown {
  if (typeof value === "string") return redactString(value);
  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactString(value.message),
      stack: value.stack ? redactString(value.stack) : undefined,
    };
  }
  if (value === null || typeof value !== "object") return value;
  if (depth >= MAX_DEPTH) return "[Truncated]";
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      SENSITIVE_KEY.test(key) ? REDACTED : redact(entry, depth + 1),
    ]),
  );
}

function write(level: LogLevel, message: string, context: LogContext = {}): void {
  const entry = JSON.stringify({
    level,
    time: new Date().toISOString(),
    message,
    ...(redact(context) as LogContext),
  });
  console[level](entry);
}

export const logger = {
  info: (message: string, context?: LogContext) => write("info", message, context),
  warn: (message: string, context?: LogContext) => write("warn", message, context),
  error: (message: string, context?: LogContext) => write("error", message, context),
};
