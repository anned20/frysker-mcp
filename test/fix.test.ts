import assert from "node:assert/strict";
import { test } from "node:test";

import { CHECK_RESULTS } from "../src/fixtures.js";
import { applyFixes } from "../src/fix.js";

test("skips overlapping annotations without corrupting offsets", () => {
  const issues = CHECK_RESULTS.husk!.issues;
  const result = applyFixes("husk", issues);
  assert.equal(result.text, "húsk");
  assert.equal(result.changes.length, 1);
  assert.equal(result.changes[0]!.type, "FARIANT");
  assert.equal(result.changes[0]!.word, "usk");
});

test("applies changes from the highest offset down", () => {
  const text = "It hus is in moai doarp.";
  const result = applyFixes(
    text,
    CHECK_RESULTS["It hus is in moai doarp."]!.issues,
  );
  assert.equal(result.text, "It hûs is yn mooi doarp.");
  assert.deepEqual(
    result.changes.map((change) => change.replacement),
    ["hûs", "yn", "mooi"],
  );
});

test("restricts fixes to the requested types", () => {
  const text = "It hus is in moai doarp.";
  const issues = CHECK_RESULTS["It hus is in moai doarp."]!.issues;
  const result = applyFixes(text, issues, ["SPELLING_FRIES"]);
  assert.equal(result.text, "It hûs is in moai doarp.");
  assert.equal(result.changes.length, 1);
  assert.equal(result.changes[0]!.type, "SPELLING_FRIES");
});
