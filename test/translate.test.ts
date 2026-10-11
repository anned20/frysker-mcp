import { expect, test } from "vitest";

import { chunkParagraphs } from "../src/httpGateway.js";
import { callTool, connect, isError, textOf } from "./helpers.js";

test("answers MCP initialize and lists the three tools", async () => {
  const client = await connect();
  const { tools } = await client.listTools();
  const names = tools.map((tool) => tool.name).sort();
  expect(names).toEqual(["check_text", "search_word", "translate"]);
});

test("translates a Dutch paragraph into Frisian", async () => {
  const client = await connect();
  const result = await callTool(client, "translate", {
    text: "Het huis staat in de tuin.",
    from: "nl",
  });
  expect(isError(result)).toBe(false);
  expect(textOf(result)).toBe("It hûs stiet yn de tún.");
});

test("translates a Frisian sentence into Dutch", async () => {
  const client = await connect();
  const result = await callTool(client, "translate", {
    text: "It hus stiet yn de tun.",
    from: "fry",
  });
  expect(isError(result)).toBe(false);
  expect(textOf(result)).toBe("Het huis staat in de tuin.");
});

test("rejects an explicit English source language", async () => {
  const client = await connect();
  const result = await callTool(client, "translate", {
    text: "The house is big.",
    from: "en",
  });
  expect(isError(result)).toBe(true);
  expect(textOf(result)).toMatch(/Unsupported source language/i);
});

test("rejects English text that the API echoes back unchanged", async () => {
  const client = await connect();
  const result = await callTool(client, "translate", {
    text: "The house is big.",
    from: "nl",
  });
  expect(isError(result)).toBe(true);
  expect(textOf(result)).toMatch(/unchanged/i);
});

test("chunks long text on sentence boundaries, preserving paragraphs", () => {
  const sentence = "Dit is in sin. ";
  const paragraph = sentence.repeat(60).trim();
  const text = `${paragraph}\n\n${paragraph}`;

  const groups = chunkParagraphs(text, 500);
  expect(groups.length, "one chunk-group per paragraph").toBe(2);
  for (const group of groups) {
    expect(group.length, "long paragraph splits into several chunks").toBeGreaterThanOrEqual(2);
    for (const chunk of group) {
      expect(chunk.length, `chunk too long: ${chunk.length}`).toBeLessThanOrEqual(500);
      expect(chunk).toMatch(/[.!?]$/);
    }
  }

  const rebuilt = groups.map((group) => group.join(" ")).join("\n\n");
  expect(rebuilt).toBe(
    text
      .split(/\n{2,}/)
      .map((part) => part.trim())
      .join("\n\n"),
  );
});
