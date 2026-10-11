import type {
  CheckResult,
  Level,
  SearchResult,
  SourceLanguage,
} from "./types.js";

export interface FryskerGateway {
  searchWord(
    word: string,
    from: SourceLanguage,
    max: number,
  ): Promise<SearchResult>;
  translate(text: string, from: SourceLanguage): Promise<string>;
  checkText(text: string, level: Level): Promise<CheckResult>;
}
