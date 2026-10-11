import { readFileSync } from "node:fs";

import { expect, test } from "vitest";

import { buildCheckDocument, parseCheckResponse } from "../src/httpGateway.js";

const capturedXml = readFileSync(
  new URL("../fixtures/check-response.xml", import.meta.url),
  "utf8",
);

test("parses the captured Klinkende Taal checker response", () => {
  const result = parseCheckResponse(capturedXml);
  expect(result.issues.length).toBe(1);
  const issue = result.issues[0]!;
  expect(issue.type).toBe("SPELLING_FRIES");
  expect(issue.word).toBe("hus");
  expect(issue.start).toBe(3);
  expect(issue.end).toBe(6);
  expect(issue.suggestions[0]).toBe("hûs");
  expect(issue.suggestions).toEqual(["hûs", "hys", "huls", "hie", "ha"]);
});

test("builds an XML-escaped checker document carrying the level", () => {
  const document = buildCheckDocument("Frysk & <b> \"goed\"", "C1");
  expect(document).toMatch(/Frysk &amp; &lt;b&gt; &quot;goed&quot;/);
  expect(document).toMatch(/<name>desired-level<\/name><content>C1<\/content>/);
  expect(document).toMatch(/<name>document-name<\/name><content>frysk<\/content>/);
});
