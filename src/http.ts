export class HttpError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export interface PostRequest {
  url: string;
  headers: Record<string, string>;
  body: string;
}

export interface TransportOptions {
  timeoutMs: number;
  fetchFn?: typeof fetch;
}

async function bodySnippet(res: Response): Promise<string> {
  try {
    const text = await res.text();
    return text.slice(0, 300);
  } catch {
    return "";
  }
}

/**
 * POST with a per-request timeout and a single retry on network errors or 5xx
 * responses. 4xx responses and other hard failures are surfaced immediately.
 */
export async function postWithRetry(
  req: PostRequest,
  options: TransportOptions,
): Promise<string> {
  const fetchFn = options.fetchFn ?? globalThis.fetch;
  const attempts = 2;

  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs);
    try {
      const res = await fetchFn(req.url, {
        method: "POST",
        headers: req.headers,
        body: req.body,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.status >= 500) {
        lastError = new HttpError(
          `HTTP ${res.status} from ${req.url}`,
          res.status,
        );
        continue;
      }
      if (!res.ok) {
        const snippet = await bodySnippet(res);
        throw new HttpError(
          `HTTP ${res.status} from ${req.url}${snippet ? `: ${snippet}` : ""}`,
          res.status,
        );
      }
      return await res.text();
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof HttpError && err.status !== undefined && err.status < 500) {
        throw err;
      }
      lastError = err;
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error(String(lastError));
}
