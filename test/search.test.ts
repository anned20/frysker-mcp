import { expect, test } from "vitest";

import { callTool, connect, isError, textOf } from "./helpers.js";

test("looks up the Frisian lemma hûs with article, plural and English translation", async () => {
  const client = await connect();
  const result = await callTool(client, "search_word", { word: "hûs" });
  expect(isError(result)).toBe(false);
  const output = textOf(result);
  expect(output).toMatch(/article: it/);
  expect(output).toMatch(/plural: huzen/);
  expect(output).toMatch(/house \(en\)/);
});

test("looks up a Dutch word and returns Frisian equivalents", async () => {
  const client = await connect();
  const result = await callTool(client, "search_word", {
    word: "huis",
    from: "nl",
  });
  expect(isError(result)).toBe(false);
  expect(textOf(result)).toMatch(/hûs \(fry\)/);
});

test("prioritises an exact match above prefix matches", async () => {
  const client = await connect();
  const result = await callTool(client, "search_word", { word: "hûs" });
  const output = textOf(result);
  const firstCandidate = output
    .split("\n")
    .find((line) => /^\s+1\. /.test(line));
  expect(firstCandidate, "a first candidate is listed").toBeTruthy();
  expect(firstCandidate).toMatch(/hûs/);
});

test("resolves an inflected form to its lemma via fuzzy search", async () => {
  const client = await connect();
  const result = await callTool(client, "search_word", { word: "huzen" });
  expect(isError(result)).toBe(false);
  const output = textOf(result);
  expect(output).toMatch(/hûs/);
  expect(output).toMatch(/plural: huzen/);
});

test("rejects an unsupported lookup language", async () => {
  const client = await connect();
  const result = await callTool(client, "search_word", {
    word: "house",
    from: "en",
  });
  expect(isError(result)).toBe(true);
});
