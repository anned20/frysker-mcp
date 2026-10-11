import assert from "node:assert/strict";
import { test } from "node:test";

import { loadConfig } from "../src/config.js";
import { createGateway } from "../src/gatewayFactory.js";
import { HttpGateway } from "../src/httpGateway.js";
import { MockGateway } from "../src/mockGateway.js";

test("defaults match the observed public endpoints and credential", () => {
  const config = loadConfig({});
  assert.equal(config.graphqlUrl, "https://frisian.eu/languageapi_v8");
  assert.equal(config.checkerUrl, "https://web-api.taalweb.frl/kt/analyse");
  assert.match(config.checkerAuth, /^Basic /);
  assert.equal(config.timeoutMs, 20_000);
  assert.equal(config.mock, false);
});

test("environment variables override endpoints, credential and timeout", () => {
  const config = loadConfig({
    FRYSKER_GRAPHQL_URL: "https://a.test/gql",
    FRYSKER_CHECKER_URL: "https://b.test/kt",
    FRYSKER_CHECKER_AUTH: "Basic xyz",
    FRYSKER_TIMEOUT_MS: "5000",
  });
  assert.equal(config.graphqlUrl, "https://a.test/gql");
  assert.equal(config.checkerUrl, "https://b.test/kt");
  assert.equal(config.checkerAuth, "Basic xyz");
  assert.equal(config.timeoutMs, 5000);
});

test("FRYSKER_MOCK selects the offline mock gateway", () => {
  assert.ok(createGateway(loadConfig({ FRYSKER_MOCK: "1" })) instanceof MockGateway);
  assert.ok(createGateway(loadConfig({})) instanceof HttpGateway);
});
