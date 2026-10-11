import { expect, test } from "vitest";

import { loadConfig } from "../src/config.js";
import { createGateway } from "../src/gatewayFactory.js";
import { HttpGateway } from "../src/httpGateway.js";
import { MockGateway } from "../src/mockGateway.js";

test("defaults match the observed public endpoints and credential", () => {
  const config = loadConfig({});
  expect(config.graphqlUrl).toBe("https://frisian.eu/languageapi_v8");
  expect(config.graphqlAuth).toBe("");
  expect(config.checkerUrl).toBe("https://web-api.taalweb.frl/kt/analyse");
  expect(config.checkerAuth).toMatch(/^Basic /);
  expect(config.timeoutMs).toBe(20_000);
  expect(config.mock).toBe(false);
});

test("environment variables override endpoints, credential and timeout", () => {
  const config = loadConfig({
    FRYSKER_GRAPHQL_URL: "https://a.test/gql",
    FRYSKER_GRAPHQL_AUTH: "Bearer abc",
    FRYSKER_CHECKER_URL: "https://b.test/kt",
    FRYSKER_CHECKER_AUTH: "Basic xyz",
    FRYSKER_TIMEOUT_MS: "5000",
  });
  expect(config.graphqlUrl).toBe("https://a.test/gql");
  expect(config.graphqlAuth).toBe("Bearer abc");
  expect(config.checkerUrl).toBe("https://b.test/kt");
  expect(config.checkerAuth).toBe("Basic xyz");
  expect(config.timeoutMs).toBe(5000);
});

test("FRYSKER_MOCK selects the offline mock gateway", () => {
  expect(createGateway(loadConfig({ FRYSKER_MOCK: "1" }))).toBeInstanceOf(
    MockGateway,
  );
  expect(createGateway(loadConfig({}))).toBeInstanceOf(HttpGateway);
});
