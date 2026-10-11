import assert from "node:assert/strict";
import { test } from "node:test";

import { callTool, connect, isError, textOf } from "./helpers.js";

const TEXT = "It hus staat yn de tún.";

test("reports a spelling issue with its word, offsets and suggestions", async () => {
  const client = await connect();
  const result = await callTool(client, "check_text", { text: TEXT });
  assert.equal(isError(result), false);
  const output = textOf(result);
  assert.match(output, /SPELLING_FRIES "hus"/);
  assert.match(output, /chars 3-6/);
  assert.match(output, /suggestions: hûs, hys/);
});

test("distinguishes spelling, Dutchism and variant issues by type", async () => {
  const client = await connect();
  const result = await callTool(client, "check_text", {
    text: "It hus is in moai doarp.",
  });
  const output = textOf(result);
  assert.match(output, /SPELLING_FRIES/);
  assert.match(output, /HOLLANISME/);
  assert.match(output, /FARIANT/);
});

test("check-only is the default and never rewrites text", async () => {
  const client = await connect();
  const result = await callTool(client, "check_text", { text: TEXT });
  const output = textOf(result);
  assert.doesNotMatch(output, /Corrected text/);
  assert.doesNotMatch(output, /hus → hûs/);
});

test("fix applies the top suggestion and returns a change log", async () => {
  const client = await connect();
  const result = await callTool(client, "check_text", {
    text: TEXT,
    fix: true,
  });
  assert.equal(isError(result), false);
  const output = textOf(result);
  assert.match(output, /SPELLING_FRIES: hus → hûs/);
  assert.match(output, /It hûs staat yn de tún\./);
});

test("types restricts which issue categories are fixed", async () => {
  const client = await connect();
  const result = await callTool(client, "check_text", {
    text: "It hus is in moai doarp.",
    fix: true,
    types: ["SPELLING_FRIES"],
  });
  const output = textOf(result);
  assert.match(output, /SPELLING_FRIES: hus → hûs/);
  assert.doesNotMatch(output, /HOLLANISME/);
  assert.doesNotMatch(output, /FARIANT/);
  assert.match(output, /It hûs is in moai doarp\./);
});
