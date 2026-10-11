export type Language = "fry" | "nl" | "en";
export type SourceLanguage = "fry" | "nl";
export type IssueType = "SPELLING_FRIES" | "HOLLANISME" | "FARIANT";
export type Level = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export interface Translation {
  form: string;
  lang: string;
}

export interface Inflection {
  description: string;
  forms: string[];
}

export interface WordDetail {
  lemma: string;
  pos: string;
  article: string | null;
  hyphenation: string | null;
  pronunciation: string | null;
  inflections: Inflection[];
  synonyms: string[];
  variants: string[];
  translations: Translation[];
  definitions: string[];
}

export interface SearchCandidate {
  form: string;
  lang: string;
  pos: string;
  translations: Translation[];
}

export interface SearchResult {
  query: string;
  from: SourceLanguage;
  candidates: SearchCandidate[];
  details: WordDetail[];
}

export interface CheckIssue {
  type: IssueType;
  word: string;
  start: number;
  end: number;
  suggestions: string[];
}

export interface CheckResult {
  issues: CheckIssue[];
}

export interface FixChange {
  type: IssueType;
  word: string;
  replacement: string;
}

export interface FixResult {
  text: string;
  changes: FixChange[];
}
