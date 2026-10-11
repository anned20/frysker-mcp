import assert from "node:assert/strict";
import { test } from "node:test";

import { callTool, connect, isError, textOf } from "./helpers.js";

test("looks up the Frisian lemma hûs with article, plural and English translation", async () => {
  const client = await connect();
  const result = await callTool(client, "search_word", { word: "hûs" });
  assert.equal(isError(result), false);
  const output = textOf(result);
  assert.match(output, /article: it/);
  assert.match(output, /plural: huzen/);
  assert.match(output, /house \(en\)/);
});

test("looks up a Dutch word and returns Frisian equivalents", async () => {
  const client = await connect();
  const result = await callTool(client, "search_word", {
    word: "huis",
    from: "nl",
  });
  assert.equal(isError(result), false);
  assert.match(textOf(result), /hûs \(fry\)/);
});

test("prioritises an exact match above prefix matches", async () => {
  const client = await connect();
  const result = await callTool(client, "search_word", { word: "hûs" });
  const output = textOf(result);
  const firstCandidate = output
    .split("\n")
    .find((line) => /^\s+1\. /.test(line));
  assert.ok(firstCandidate, "a first candidate is listed");
  assert.match(firstCandidate, /hûs/);
});

test("resolves an inflected form to its lemma via fuzzy search", async () => {
  const client = await connect();
  const result = await callTool(client, "search_word", { word: "huzen" });
  assert.equal(isError(result), false);
  const output = textOf(result);
  assert.match(output, /hûs/);
  assert.match(output, /plural: huzen/);
});

test("rejects an unsupported lookup language", async () => {
  const client = await connect();
  const result = await callTool(client, "search_word", {
    word: "house",
    from: "en",
  });
  assert.equal(isError(result), true);
});
