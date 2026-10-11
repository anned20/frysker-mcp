import { XMLParser } from "fast-xml-parser";

import { loadConfig, type Config } from "./config.js";
import type { FryskerGateway } from "./gateway.js";
import { postWithRetry } from "./http.js";
import type {
  CheckIssue,
  CheckResult,
  IssueType,
  Level,
  SearchCandidate,
  SearchResult,
  SourceLanguage,
  Translation,
  WordDetail,
} from "./types.js";

const TRANSLATE_QUERY = `query Translate($text: String!, $lang: LangType!) {
  translatetext(text: $text, lang: $lang) { translation translationlang }
}`;

const LEMMASEARCH_QUERY = `query Search($term: String!, $lang: LangType!, $source: String) {
  lemmasearch(offset: 0, max: 25, searchterm: $term, lang: $lang, source: $source, sensitive: false, lexiconFallback: true, englishTranslations: true) {
    total
    lemmas {
      form
      lang
      pos
      translations { form lang }
      link { lemma source lang pos }
    }
  }
}`;

const DETAILS_QUERY = `query Details($lemma: String!, $source: String!) {
  details(lemma: $lemma, source: $source, englishTranslations: true) {
    source
    lemma {
      form
      pos
      lang
      article
      hyphenation
      pronunciation
      subForms {
        __typename
        ... on FormInfo { linguistics description paradigms { form lang hyphenation pronunciation preferred } }
        ... on Synonym { form lang meaning }
        ... on Variant { form lang }
      }
    }
    translations { form lang pos }
    senses {
      definition {
        def {
          __typename
          ... on Gloss { gloss { text { __typename ... on T { textT } ... on L { link { lemma } } } } }
        }
      }
      translations {
        __typename
        ... on Lemma { form lang pos }
        ... on TextTranslated { lang text { text { __typename ... on T { textT } } } }
      }
    }
  }
}`;

interface GraphQLError {
  message: string;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
}

interface MinLemma {
  form: string;
  lang: string;
  pos: string;
  translations?: Translation[];
}

interface LemmasData {
  lemmasearch: { total: number; lemmas?: MinLemma[] | null };
}

interface Paradigm {
  form: string;
  preferred?: boolean | null;
}

type SubForm =
  | {
      __typename: "FormInfo";
      description: string;
      paradigms?: Paradigm[] | null;
    }
  | { __typename: "Synonym"; form: string }
  | { __typename: "Variant"; form: string };

interface FormattedTextElement {
  __typename?: string;
  textT?: string;
  link?: { lemma?: string | null } | null;
}

interface FormattedText {
  text?: FormattedTextElement[] | null;
}

type SenseTranslation =
  | { __typename: "Lemma"; form: string; lang: string }
  | { __typename: "TextTranslated"; lang: string; text?: FormattedText | null };

interface GlossaryContent {
  __typename: string;
  gloss?: FormattedText | null;
}

interface Sense {
  definition?: { def?: GlossaryContent[] | null } | null;
  translations?: SenseTranslation[] | null;
}

interface DetailsEntry {
  source: string;
  lemma: {
    form: string;
    pos: string;
    lang: string;
    article?: string | null;
    hyphenation?: string | null;
    pronunciation?: string | null;
    subForms?: SubForm[] | null;
  };
  translations?: Translation[] | null;
  senses?: Sense[] | null;
}

interface DetailsData {
  details?: DetailsEntry[] | null;
}

function extractText(formatted: FormattedText | null | undefined): string {
  const parts = (formatted?.text ?? [])
    .map((part) => {
      if (typeof part.textT === "string") return part.textT;
      if (part.link?.lemma) return part.link.lemma;
      return "";
    })
    .filter((piece) => piece.length > 0);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function mapDetail(entry: DetailsEntry): WordDetail {
  const inflections = [];
  const synonyms: string[] = [];
  const variants: string[] = [];
  for (const sub of entry.lemma.subForms ?? []) {
    if (sub.__typename === "FormInfo") {
      inflections.push({
        description: sub.description,
        forms: (sub.paradigms ?? []).map((p) => p.form),
      });
    } else if (sub.__typename === "Synonym") {
      synonyms.push(sub.form);
    } else if (sub.__typename === "Variant") {
      variants.push(sub.form);
    }
  }

  const translations: Translation[] = [];
  const seen = new Set<string>();
  const addTranslation = (form: string | undefined, lang: string | undefined) => {
    if (!form || !lang) return;
    const key = `${form}|${lang}`;
    if (seen.has(key)) return;
    seen.add(key);
    translations.push({ form, lang });
  };
  for (const t of entry.translations ?? []) addTranslation(t.form, t.lang);
  for (const sense of entry.senses ?? []) {
    for (const t of sense.translations ?? []) {
      if (t.__typename === "Lemma") addTranslation(t.form, t.lang);
      else addTranslation(extractText(t.text), t.lang);
    }
  }

  const definitions: string[] = [];
  for (const sense of entry.senses ?? []) {
    for (const def of sense.definition?.def ?? []) {
      const text = extractText(def.gloss);
      if (text) definitions.push(text);
    }
  }

  return {
    lemma: entry.lemma.form,
    pos: entry.lemma.pos,
    article: entry.lemma.article ?? null,
    hyphenation: entry.lemma.hyphenation ?? null,
    pronunciation: entry.lemma.pronunciation ?? null,
    inflections,
    synonyms,
    variants,
    translations,
    definitions,
  };
}

/** Split a paragraph into sentence-sized pieces, keeping terminators. */
export function splitSentences(text: string): string[] {
  const matches = text.match(/[^.!?]+[.!?]+[)"'\]]*|[^.!?]+$/g);
  return (matches ?? []).map((s) => s.trim()).filter((s) => s.length > 0);
}

/** Greedily pack sentences into chunks no longer than maxChars. */
export function packChunks(paragraph: string, maxChars: number): string[] {
  const chunks: string[] = [];
  let current = "";
  for (const sentence of splitSentences(paragraph)) {
    if (sentence.length > maxChars) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      for (let i = 0; i < sentence.length; i += maxChars) {
        chunks.push(sentence.slice(i, i + maxChars));
      }
      continue;
    }
    if (!current) current = sentence;
    else if (`${current} ${sentence}`.length <= maxChars)
      current = `${current} ${sentence}`;
    else {
      chunks.push(current);
      current = sentence;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/** Chunk text into paragraph groups of sentence-boundary chunks. */
export function chunkParagraphs(text: string, maxChars = 500): string[][] {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
    .map((paragraph) => packChunks(paragraph, maxChars));
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildCheckDocument(text: string, level: Level): string {
  const escaped = escapeXml(text);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><document xmlns="http://www.gridline.nl/1.0/docmodel/documents"><id xmlns="">frysk</id><source xmlns="">kt_jsgem</source><fields xmlns=""><field><name>document-name</name><content>frysk</content></field><field><name>content</name><content>${escaped}</content></field><field><name>desired-level</name><content>${level}</content></field></fields></document>`;
}

interface ParsedLabel {
  name: string;
  score?: number | string;
}
interface ParsedAnnotation {
  type: string;
  reason?: string;
  start: number | string;
  end: number | string;
  labels?: { label?: ParsedLabel[] | null } | null;
}

function findAnnotations(node: unknown): ParsedAnnotation[] {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findAnnotations(child);
      if (found.length > 0) return found;
    }
    return [];
  }
  if (node && typeof node === "object") {
    const record = node as Record<string, unknown>;
    if (Array.isArray(record.annotation)) {
      return record.annotation as ParsedAnnotation[];
    }
    for (const value of Object.values(record)) {
      const found = findAnnotations(value);
      if (found.length > 0) return found;
    }
  }
  return [];
}

const ISSUE_TYPES = new Set<IssueType>([
  "SPELLING_FRIES",
  "HOLLANISME",
  "FARIANT",
]);

export function parseCheckResponse(xml: string): CheckResult {
  const parser = new XMLParser({
    ignoreAttributes: true,
    removeNSPrefix: true,
    isArray: (name) => name === "annotation" || name === "label",
  });
  const parsed = parser.parse(xml);
  const annotations = findAnnotations(parsed);
  const issues: CheckIssue[] = [];
  for (const annotation of annotations) {
    const type = annotation.type as IssueType;
    if (!ISSUE_TYPES.has(type)) continue;
    const suggestions = [...(annotation.labels?.label ?? [])]
      .sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0))
      .map((label) => label.name);
    issues.push({
      type,
      word: annotation.reason ?? "",
      start: Number(annotation.start),
      end: Number(annotation.end),
      suggestions,
    });
  }
  return { issues };
}

export interface HttpGatewayOptions {
  config?: Config;
  fetchFn?: typeof fetch;
  chunkChars?: number;
}

export class HttpGateway implements FryskerGateway {
  private readonly config: Config;
  private readonly fetchFn: typeof fetch;
  private readonly chunkChars: number;

  constructor(options: HttpGatewayOptions = {}) {
    this.config = options.config ?? loadConfig();
    this.fetchFn = options.fetchFn ?? globalThis.fetch;
    this.chunkChars = options.chunkChars ?? 500;
  }

  private async gql<T>(
    query: string,
    variables: Record<string, unknown>,
  ): Promise<T> {
    const body = JSON.stringify({ query, variables });
    const raw = await postWithRetry(
      {
        url: this.config.graphqlUrl,
        headers: { "content-type": "application/json" },
        body,
      },
      { timeoutMs: this.config.timeoutMs, fetchFn: this.fetchFn },
    );
    const parsed = JSON.parse(raw) as GraphQLResponse<T>;
    if (parsed.errors && parsed.errors.length > 0) {
      throw new Error(parsed.errors.map((e) => e.message).join("; "));
    }
    if (!parsed.data) throw new Error("Empty response from language API.");
    return parsed.data;
  }

  private async translateChunk(
    text: string,
    from: SourceLanguage,
  ): Promise<string> {
    const data = await this.gql<{
      translatetext: { translation: string } | null;
    }>(TRANSLATE_QUERY, { text, lang: from });
    if (!data.translatetext) {
      throw new Error("Translation API returned no result.");
    }
    return data.translatetext.translation;
  }

  async translate(text: string, from: SourceLanguage): Promise<string> {
    const paragraphs = chunkParagraphs(text, this.chunkChars);
    const translated: string[] = [];
    for (const chunks of paragraphs) {
      const pieces: string[] = [];
      for (const chunk of chunks) {
        pieces.push(await this.translateChunk(chunk, from));
      }
      translated.push(pieces.join(" "));
    }
    return translated.join("\n\n");
  }

  async searchWord(
    word: string,
    from: SourceLanguage,
    max: number,
  ): Promise<SearchResult> {
    const lookupSource = from === "fry" ? "fkw" : "nfwb";
    const detailSource = from === "fry" ? "fhwb" : "nfwb";
    const data = await this.gql<LemmasData>(LEMMASEARCH_QUERY, {
      term: `${word}*`,
      lang: from,
      source: lookupSource,
    });

    const candidates: SearchCandidate[] = (data.lemmasearch.lemmas ?? []).map(
      (lemma) => ({
        form: lemma.form,
        lang: lemma.lang,
        pos: lemma.pos,
        translations: lemma.translations ?? [],
      }),
    );

    const target = word.toLowerCase();
    const ordered = [...candidates].sort((a, b) => {
      const aExact = a.form.toLowerCase() === target ? 0 : 1;
      const bExact = b.form.toLowerCase() === target ? 0 : 1;
      return aExact - bExact;
    });

    const details: WordDetail[] = [];
    const maxAttempts = Math.max(max * 3, max);
    let attempts = 0;
    for (const candidate of ordered) {
      if (details.length >= max) break;
      if (attempts >= maxAttempts) break;
      attempts++;
      try {
        const result = await this.gql<DetailsData>(DETAILS_QUERY, {
          lemma: candidate.form,
          source: detailSource,
        });
        const entry = result.details?.[0];
        if (entry) details.push(mapDetail(entry));
      } catch {
        // Inflected or unknown forms cannot be resolved by `details`; skip them.
      }
    }

    return { query: word, from, candidates, details };
  }

  async checkText(text: string, level: Level): Promise<CheckResult> {
    const body = buildCheckDocument(text, level);
    const raw = await postWithRetry(
      {
        url: this.config.checkerUrl,
        headers: {
          "content-type": "application/xml",
          accept: "application/xml",
          authorization: this.config.checkerAuth,
        },
        body,
      },
      { timeoutMs: this.config.timeoutMs, fetchFn: this.fetchFn },
    );
    return parseCheckResponse(raw);
  }
}
