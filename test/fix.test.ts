import { expect, test } from "vitest";

import { CHECK_RESULTS } from "../src/fixtures.js";
import { applyFixes } from "../src/fix.js";

test("skips overlapping annotations without corrupting offsets", () => {
  const issues = CHECK_RESULTS.husk!.issues;
  const result = applyFixes("husk", issues);
  expect(result.text).toBe("húsk");
  expect(result.changes.length).toBe(1);
  expect(result.changes[0]!.type).toBe("FARIANT");
  expect(result.changes[0]!.word).toBe("usk");
});

test("applies changes from the highest offset down", () => {
  const text = "It hus is in moai doarp.";
  const result = applyFixes(
    text,
    CHECK_RESULTS["It hus is in moai doarp."]!.issues,
  );
  expect(result.text).toBe("It hûs is yn mooi doarp.");
  expect(result.changes.map((change) => change.replacement)).toEqual([
    "hûs",
    "yn",
    "mooi",
  ]);
});

test("restricts fixes to the requested types", () => {
  const text = "It hus is in moai doarp.";
  const issues = CHECK_RESULTS["It hus is in moai doarp."]!.issues;
  const result = applyFixes(text, issues, ["SPELLING_FRIES"]);
  expect(result.text).toBe("It hûs is in moai doarp.");
  expect(result.changes.length).toBe(1);
  expect(result.changes[0]!.type).toBe("SPELLING_FRIES");
});
