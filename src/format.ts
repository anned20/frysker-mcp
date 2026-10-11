import type { CheckIssue, CheckResult, FixResult, SearchResult } from "./types.js";

export function renderSearch(result: SearchResult): string {
  const lines: string[] = [];
  lines.push(`Candidates for "${result.query}" (${result.from}):`);
  if (result.candidates.length === 0) {
    lines.push("  (none found)");
  } else {
    result.candidates.forEach((candidate, index) => {
      const translations = candidate.translations
        .filter((translation) => translation.lang !== result.from)
        .map((translation) => `${translation.form} (${translation.lang})`)
        .join(", ");
      const suffix = translations ? ` — ${translations}` : "";
      lines.push(
        `  ${index + 1}. ${candidate.form} (${candidate.pos})${suffix}`,
      );
    });
  }

  if (result.details.length > 0) {
    lines.push("");
    lines.push("Details:");
    result.details.forEach((detail, index) => {
      const head = [`${index + 1}. ${detail.lemma} — ${detail.pos}`];
      if (detail.article) head.push(`article: ${detail.article}`);
      if (detail.pronunciation) head.push(`pronunciation: ${detail.pronunciation}`);
      lines.push(head.join(" — "));
      if (detail.hyphenation) lines.push(`   hyphenation: ${detail.hyphenation}`);
      if (detail.translations.length > 0) {
        lines.push(
          `   translations: ${detail.translations
            .map((translation) => `${translation.form} (${translation.lang})`)
            .join(", ")}`,
        );
      }
      if (detail.inflections.length > 0) {
        lines.push("   inflections:");
        for (const inflection of detail.inflections) {
          lines.push(
            `     ${inflection.description}: ${inflection.forms.join(", ")}`,
          );
        }
      }
      if (detail.synonyms.length > 0) {
        lines.push(`   synonyms: ${detail.synonyms.join(", ")}`);
      }
      if (detail.variants.length > 0) {
        lines.push(`   variants: ${detail.variants.join(", ")}`);
      }
      if (detail.dutchisms.length > 0) {
        lines.push(`   dutchisms: ${detail.dutchisms.join(", ")}`);
      }
      if (detail.definitions.length > 0) {
        lines.push("   definitions:");
        for (const definition of detail.definitions) {
          lines.push(`     - ${definition}`);
        }
      }
    });
  }

  return lines.join("\n");
}

function renderIssue(issue: CheckIssue, index: number): string[] {
  const lines = [
    `  [${index + 1}] ${issue.type} "${issue.word}" (chars ${issue.start}-${issue.end})`,
  ];
  lines.push(
    issue.suggestions.length > 0
      ? `      suggestions: ${issue.suggestions.join(", ")}`
      : "      suggestions: (none)",
  );
  return lines;
}

export function renderCheck(result: CheckResult): string {
  if (result.issues.length === 0) return "No issues found.";
  const lines = [`Found ${result.issues.length} issue(s):`];
  result.issues.forEach((issue, index) => {
    lines.push(...renderIssue(issue, index));
  });
  return lines.join("\n");
}

export function renderFix(result: FixResult): string {
  if (result.changes.length === 0) {
    return `No issues were fixed.\n\n${result.text}`;
  }
  const lines = [`Fixed ${result.changes.length} issue(s):`];
  for (const change of result.changes) {
    lines.push(`  ${change.type}: ${change.word} → ${change.replacement}`);
  }
  lines.push("");
  lines.push("Corrected text:");
  lines.push(result.text);
  return lines.join("\n");
}
