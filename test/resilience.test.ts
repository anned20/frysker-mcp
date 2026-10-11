import { expect, test } from "vitest";

import { loadConfig } from "../src/config.js";
import { HttpGateway } from "../src/httpGateway.js";

type FetchLike = typeof fetch;

const okTranslate = JSON.stringify({
  data: { translatetext: { translation: "It hûs.", translationlang: "nl" } },
});

function asFetch(
  fn: (url: string, init?: RequestInit) => Promise<Response>,
): FetchLike {
  return fn as unknown as FetchLike;
}

test("retries once on a 5xx response, then succeeds", async () => {
  let calls = 0;
  const fetchFn = asFetch(async () => {
    calls++;
    if (calls === 1) return new Response("boom", { status: 503 });
    return new Response(okTranslate, { status: 200 });
  });
  const gateway = new HttpGateway({ config: loadConfig({}), fetchFn });
  expect(await gateway.translate("Het huis.", "nl")).toBe("It hûs.");
  expect(calls).toBe(2);
});

test("does not retry on a 4xx response", async () => {
  let calls = 0;
  const fetchFn = asFetch(async () => {
    calls++;
    return new Response("nope", { status: 400 });
  });
  const gateway = new HttpGateway({ config: loadConfig({}), fetchFn });
  await expect(gateway.translate("Het huis.", "nl")).rejects.toThrow(/HTTP 400/);
  expect(calls).toBe(1);
});

test("retries a network error once and surfaces the failure", async () => {
  let calls = 0;
  const fetchFn = asFetch(async () => {
    calls++;
    throw new Error("ECONNRESET");
  });
  const gateway = new HttpGateway({ config: loadConfig({}), fetchFn });
  await expect(gateway.translate("Het huis.", "nl")).rejects.toThrow(
    /ECONNRESET/,
  );
  expect(calls).toBe(2);
});

test("surfaces GraphQL validation errors without retrying", async () => {
  let calls = 0;
  const fetchFn = asFetch(async () => {
    calls++;
    return new Response(JSON.stringify({ errors: [{ message: "bad query" }] }), {
      status: 200,
    });
  });
  const gateway = new HttpGateway({ config: loadConfig({}), fetchFn });
  await expect(gateway.translate("Het huis.", "nl")).rejects.toThrow(/bad query/);
  expect(calls).toBe(1);
});

test("times out and reports an error instead of hanging", async () => {
  const fetchFn = asFetch(
    (_url, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new Error("aborted")),
        );
      }),
  );
  const config = loadConfig({ FRYSKER_TIMEOUT_MS: "20" });
  const gateway = new HttpGateway({ config, fetchFn });
  await expect(gateway.translate("Het huis.", "nl")).rejects.toThrow();
});

test("uses an overridden GraphQL endpoint", async () => {
  let seen = "";
  const fetchFn = asFetch(async (url) => {
    seen = url;
    return new Response(okTranslate, { status: 200 });
  });
  const config = loadConfig({ FRYSKER_GRAPHQL_URL: "https://example.test/gql" });
  const gateway = new HttpGateway({ config, fetchFn });
  await gateway.translate("Het huis.", "nl");
  expect(seen).toBe("https://example.test/gql");
});

test("posts the requested level and overridden credential to the checker", async () => {
  let body = "";
  let authorization = "";
  const fetchFn = asFetch(async (_url, init) => {
    body = String(init?.body ?? "");
    authorization = String(
      (init?.headers as Record<string, string> | undefined)?.authorization ?? "",
    );
    return new Response(
      "<document><fields><field><name>content</name><annotations/></field></fields></document>",
      { status: 200 },
    );
  });
  const config = loadConfig({
    FRYSKER_CHECKER_URL: "https://example.test/kt",
    FRYSKER_CHECKER_AUTH: "Basic abc",
  });
  const gateway = new HttpGateway({ config, fetchFn });
  const result = await gateway.checkText("It hus.", "A2");
  expect(result.issues).toEqual([]);
  expect(body).toMatch(/<name>desired-level<\/name><content>A2<\/content>/);
  expect(authorization).toBe("Basic abc");
});
