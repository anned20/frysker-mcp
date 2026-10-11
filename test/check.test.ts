import { expect, test } from "vitest";

import { callTool, connect, isError, textOf } from "./helpers.js";

const TEXT = "It hus staat yn de tún.";

test("reports a spelling issue with its word, offsets and suggestions", async () => {
  const client = await connect();
  const result = await callTool(client, "check_text", { text: TEXT });
  expect(isError(result)).toBe(false);
  const output = textOf(result);
  expect(output).toMatch(/SPELLING_FRIES "hus"/);
  expect(output).toMatch(/chars 3-6/);
  expect(output).toMatch(/suggestions: hûs, hys/);
});

test("distinguishes spelling, Dutchism and variant issues by type", async () => {
  const client = await connect();
  const result = await callTool(client, "check_text", {
    text: "It hus is in moai doarp.",
  });
  const output = textOf(result);
  expect(output).toMatch(/SPELLING_FRIES/);
  expect(output).toMatch(/HOLLANISME/);
  expect(output).toMatch(/FARIANT/);
});

test("check-only is the default and never rewrites text", async () => {
  const client = await connect();
  const result = await callTool(client, "check_text", { text: TEXT });
  const output = textOf(result);
  expect(output).not.toMatch(/Corrected text/);
  expect(output).not.toMatch(/hus → hûs/);
});

test("fix applies the top suggestion and returns a change log", async () => {
  const client = await connect();
  const result = await callTool(client, "check_text", {
    text: TEXT,
    fix: true,
  });
  expect(isError(result)).toBe(false);
  const output = textOf(result);
  expect(output).toMatch(/SPELLING_FRIES: hus → hûs/);
  expect(output).toMatch(/It hûs staat yn de tún\./);
});

test("types restricts which issue categories are fixed", async () => {
  const client = await connect();
  const result = await callTool(client, "check_text", {
    text: "It hus is in moai doarp.",
    fix: true,
    types: ["SPELLING_FRIES"],
  });
  const output = textOf(result);
  expect(output).toMatch(/SPELLING_FRIES: hus → hûs/);
  expect(output).not.toMatch(/HOLLANISME/);
  expect(output).not.toMatch(/FARIANT/);
  expect(output).toMatch(/It hûs is in moai doarp\./);
});
