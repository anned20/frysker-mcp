export interface Config {
  graphqlUrl: string;
  graphqlAuth: string;
  checkerUrl: string;
  checkerAuth: string;
  timeoutMs: number;
  mock: boolean;
}

const DEFAULTS: Omit<Config, "mock"> = {
  graphqlUrl: "https://frisian.eu/languageapi_v8",
  graphqlAuth: "",
  checkerUrl: "https://web-api.taalweb.frl/kt/analyse",
  checkerAuth:
    "Basic ZnJ5c2s6MmI2YTYzOGI5MDY0MWZiZDg0YzM1NDQ3NmNiY2UwMDg=",
  timeoutMs: 20_000,
};

function intFrom(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function loadConfig(
  env: Record<string, string | undefined> = process.env,
): Config {
  return {
    graphqlUrl: env.FRYSKER_GRAPHQL_URL?.trim() || DEFAULTS.graphqlUrl,
    graphqlAuth: env.FRYSKER_GRAPHQL_AUTH?.trim() || DEFAULTS.graphqlAuth,
    checkerUrl: env.FRYSKER_CHECKER_URL?.trim() || DEFAULTS.checkerUrl,
    checkerAuth: env.FRYSKER_CHECKER_AUTH?.trim() || DEFAULTS.checkerAuth,
    timeoutMs: intFrom(env.FRYSKER_TIMEOUT_MS, DEFAULTS.timeoutMs),
    mock: env.FRYSKER_MOCK === "1" || env.FRYSKER_MOCK === "true",
  };
}
