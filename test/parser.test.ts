import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  buildCheckDocument,
  parseCheckResponse,
} from "../src/httpGateway.js";

const capturedXml = readFileSync(
  new URL("../../fixtures/check-response.xml", import.meta.url),
  "utf8",
);

test("parses the captured Klinkende Taal checker response", () => {
  const result = parseCheckResponse(capturedXml);
  assert.equal(result.issues.length, 1);
  const issue = result.issues[0]!;
  assert.equal(issue.type, "SPELLING_FRIES");
  assert.equal(issue.word, "hus");
  assert.equal(issue.start, 3);
  assert.equal(issue.end, 6);
  assert.equal(issue.suggestions[0], "hûs");
  assert.deepEqual(issue.suggestions, ["hûs", "hys", "huls", "hie", "ha"]);
});

test("builds an XML-escaped checker document carrying the level", () => {
  const document = buildCheckDocument("Frysk & <b> \"goed\"", "C1");
  assert.match(document, /Frysk &amp; &lt;b&gt; &quot;goed&quot;/);
  assert.match(
    document,
    /<name>desired-level<\/name><content>C1<\/content>/,
  );
  assert.match(document, /<name>document-name<\/name><content>frysk<\/content>/);
});
