import type { FryskerGateway } from "./gateway.js";
import { CHECK_RESULTS, SEARCH_RESULTS, TRANSLATIONS } from "./fixtures.js";
import type {
  CheckResult,
  Level,
  SearchResult,
  SourceLanguage,
} from "./types.js";

export class MockGateway implements FryskerGateway {
  async searchWord(
    word: string,
    from: SourceLanguage,
    _max: number,
  ): Promise<SearchResult> {
    const hit =
      SEARCH_RESULTS[`${from}:${word.toLowerCase()}`] ??
      SEARCH_RESULTS[`${from}:${word}`];
    if (hit) return hit;
    return { query: word, from, candidates: [], details: [] };
  }

  async translate(text: string, from: SourceLanguage): Promise<string> {
    const table = TRANSLATIONS[from] ?? {};
    return table[text] ?? text;
  }

  async checkText(text: string, _level: Level): Promise<CheckResult> {
    return CHECK_RESULTS[text] ?? { issues: [] };
  }
}
