import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { applyFixes } from "./fix.js";
import { renderCheck, renderFix, renderSearch } from "./format.js";
import type { FryskerGateway } from "./gateway.js";

const SOURCE_LANGUAGE = z.enum(["fry", "nl", "en"]);
const LEVEL = z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]);
const ISSUE_TYPE = z.enum(["SPELLING_FRIES", "HOLLANISME", "FARIANT"]);

interface ToolTextResult {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

function text(value: string): ToolTextResult {
  return { content: [{ type: "text", text: value }] };
}

function failure(error: unknown): ToolTextResult {
  const message = error instanceof Error ? error.message : String(error);
  return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
}

export function createServer(gateway: FryskerGateway): McpServer {
  const server = new McpServer({ name: "frysker-mcp", version: "0.1.0" });

  server.registerTool(
    "translate",
    {
      title: "Translate Dutch ↔ Frisian",
      description:
        "Translate text between Dutch and Frisian. `from` must be \"nl\" (Dutch) or \"fry\" (Frisian); English is not supported and is rejected.",
      inputSchema: {
        text: z.string().describe("The text to translate."),
        from: SOURCE_LANGUAGE.default("nl").describe(
          "Source language: \"nl\" for Dutch, \"fry\" for Frisian.",
        ),
      },
    },
    async ({ text: input, from }) => {
      try {
        if (from === "en") {
          throw new Error(
            'Unsupported source language "en": only "nl" (Dutch) and "fry" (Frisian) can be translated.',
          );
        }
        const translation = await gateway.translate(input, from);
        if (input.trim().length > 0 && translation.trim() === input.trim()) {
          throw new Error(
            "Translation returned the input unchanged. English (or another unsupported language) cannot be translated.",
          );
        }
        return text(translation);
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    "search_word",
    {
      title: "Look up a Frisian or Dutch word",
      description:
        "Look up a Frisian or Dutch word: candidate lemmas plus full dictionary detail (part of speech, article, pronunciation, inflections, translations, definitions).",
      inputSchema: {
        word: z.string().describe("The word to look up."),
        from: SOURCE_LANGUAGE.default("fry").describe(
          'Language of the word: "fry" for Frisian, "nl" for Dutch.',
        ),
        max: z
          .number()
          .int()
          .min(1)
          .max(20)
          .default(5)
          .describe("Maximum number of detailed entries to return."),
      },
    },
    async ({ word, from, max }) => {
      try {
        if (from === "en") {
          throw new Error(
            'Unsupported language "en": only "fry" (Frisian) and "nl" (Dutch) can be looked up.',
          );
        }
        const result = await gateway.searchWord(word, from, max);
        return text(renderSearch(result));
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    "check_text",
    {
      title: "Check (and optionally fix) Frisian text",
      description:
        "Spell/grammar/variant check Frisian text. Returns structured issues (SPELLING_FRIES, HOLLANISME, FARIANT) with offsets and ranked suggestions. Set `fix: true` to apply the top suggestion per issue.",
      inputSchema: {
        text: z.string().describe("The Frisian text to check."),
        level: LEVEL.default("B1").describe("Target language level."),
        fix: z
          .boolean()
          .default(false)
          .describe("When true, apply the top-ranked suggestion per issue."),
        types: z
          .array(ISSUE_TYPE)
          .optional()
          .describe("Restrict fixes to these issue types."),
      },
    },
    async ({ text: input, level, fix, types }) => {
      try {
        const result = await gateway.checkText(input, level);
        if (!fix) return text(renderCheck(result));
        const fixed = applyFixes(input, result.issues, types);
        return text(renderFix(fixed));
      } catch (error) {
        return failure(error);
      }
    },
  );

  return server;
}
