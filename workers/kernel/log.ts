export type LogSeverity = 'info' | 'error';

export type ExtensionLog = {
  info: (message: string, details?: Record<string, unknown>) => void;
  error: (message: string, details?: Record<string, unknown>) => void;
};

const secretKey = /password|secret|token|authorization|cookie|passphrase|api[-_]?key|email|phone/i;
const emailAddress = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

export function redact(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(emailAddress, '[redacted]');
  }
  if (Array.isArray(value)) {
    return value.map((item) => redact(item));
  }
  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      output[key] = secretKey.test(key) ? '[redacted]' : redact(item);
    }
    return output;
  }
  return value;
}

export function logLine(input: {
  severity: LogSeverity;
  message: string;
  requestId?: string;
  extensionKey?: string;
  details?: Record<string, unknown>;
}): string {
  return JSON.stringify({
    severity: input.severity,
    requestId: input.requestId ?? 'none',
    message: redact(input.message),
    extensionKey: input.extensionKey,
    details: input.details ? redact(input.details) : undefined,
  });
}

export function createExtensionLog(
  extensionKey: string,
  options: { requestId?: string; write?: (line: string) => void } = {},
): ExtensionLog {
  const requestId = options.requestId ?? 'none';
  const write = options.write ?? ((line) => console.log(line));
  return {
    info(message, details) {
      write(logLine({ severity: 'info', message, requestId, extensionKey, details }));
    },
    error(message, details) {
      write(logLine({ severity: 'error', message, requestId, extensionKey, details }));
    },
  };
}
