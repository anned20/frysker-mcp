import assert from "node:assert/strict";
import { test } from "node:test";

import { chunkParagraphs } from "../src/httpGateway.js";
import { callTool, connect, isError, textOf } from "./helpers.js";

test("answers MCP initialize and lists the three tools", async () => {
  const client = await connect();
  const { tools } = await client.listTools();
  const names = tools.map((tool) => tool.name).sort();
  assert.deepEqual(names, ["check_text", "search_word", "translate"]);
});

test("translates a Dutch paragraph into Frisian", async () => {
  const client = await connect();
  const result = await callTool(client, "translate", {
    text: "Het huis staat in de tuin.",
    from: "nl",
  });
  assert.equal(isError(result), false);
  assert.equal(textOf(result), "It hûs stiet yn de tún.");
});

test("translates a Frisian sentence into Dutch", async () => {
  const client = await connect();
  const result = await callTool(client, "translate", {
    text: "It hus stiet yn de tun.",
    from: "fry",
  });
  assert.equal(isError(result), false);
  assert.equal(textOf(result), "Het huis staat in de tuin.");
});

test("rejects an explicit English source language", async () => {
  const client = await connect();
  const result = await callTool(client, "translate", {
    text: "The house is big.",
    from: "en",
  });
  assert.equal(isError(result), true);
  assert.match(textOf(result), /Unsupported source language/i);
});

test("rejects English text that the API echoes back unchanged", async () => {
  const client = await connect();
  const result = await callTool(client, "translate", {
    text: "The house is big.",
    from: "nl",
  });
  assert.equal(isError(result), true);
  assert.match(textOf(result), /unchanged/i);
});

test("chunks long text on sentence boundaries, preserving paragraphs", () => {
  const sentence = "Dit is in sin. ";
  const paragraph = sentence.repeat(60).trim();
  const text = `${paragraph}\n\n${paragraph}`;

  const groups = chunkParagraphs(text, 500);
  assert.equal(groups.length, 2, "one chunk-group per paragraph");
  for (const group of groups) {
    assert.ok(group.length >= 2, "long paragraph splits into several chunks");
    for (const chunk of group) {
      assert.ok(chunk.length <= 500, `chunk too long: ${chunk.length}`);
      assert.match(chunk, /[.!?]$/, "chunks break on sentence boundaries");
    }
  }

  const rebuilt = groups.map((group) => group.join(" ")).join("\n\n");
  assert.equal(
    rebuilt,
    text
      .split(/\n{2,}/)
      .map((part) => part.trim())
      .join("\n\n"),
  );
});
