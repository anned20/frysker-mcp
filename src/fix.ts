import type { CheckIssue, FixChange, FixResult, IssueType } from "./types.js";

interface AppliedChange extends FixChange {
  start: number;
}

/**
 * Apply the top-ranked suggestion for each selected issue, from the highest
 * offset down, so earlier offsets stay valid. Overlapping issues are skipped.
 */
export function applyFixes(
  text: string,
  issues: CheckIssue[],
  types?: IssueType[],
): FixResult {
  const allowed = types && types.length > 0 ? new Set(types) : null;

  const selected = issues
    .filter((issue) => issue.suggestions.length > 0)
    .filter((issue) => !allowed || allowed.has(issue.type))
    .sort((a, b) => b.start - a.start);

  const applied: Array<{ start: number; end: number }> = [];
  const changes: AppliedChange[] = [];
  let result = text;

  for (const issue of selected) {
    const replacement = issue.suggestions[0];
    if (replacement === undefined) continue;
    if (
      issue.start < 0 ||
      issue.start >= issue.end ||
      issue.end > text.length
    ) {
      continue;
    }
    const overlaps = applied.some(
      (region) => issue.start < region.end && issue.end > region.start,
    );
    if (overlaps) continue;

    result = result.slice(0, issue.start) + replacement + result.slice(issue.end);
    applied.push({ start: issue.start, end: issue.end });
    changes.push({
      type: issue.type,
      word: issue.word,
      replacement,
      start: issue.start,
    });
  }

  changes.sort((a, b) => a.start - b.start);
  return {
    text: result,
    changes: changes.map(({ type, word, replacement }) => ({
      type,
      word,
      replacement,
    })),
  };
}
