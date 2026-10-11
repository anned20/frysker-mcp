import type { CheckResult, SearchResult } from "./types.js";

export const TRANSLATIONS: Record<string, Record<string, string>> = {
  nl: {
    "Het huis staat in de tuin.": "It hûs stiet yn de tún.",
    "De man rint nei it doarp.": "De man rint nei it doarp.",
  },
  fry: {
    "It hus stiet yn de tun.": "Het huis staat in de tuin.",
    "It hûs stiet yn de tún.": "Het huis staat in de tuin.",
  },
};

export const SEARCH_RESULTS: Record<string, SearchResult> = {
  "fry:hûs": {
    query: "hûs",
    from: "fry",
    candidates: [
      {
        form: "hûs",
        lang: "fry",
        pos: "noun",
        translations: [
          { form: "rent", lang: "en" },
          { form: "house", lang: "en" },
          { form: "home", lang: "en" },
        ],
      },
      { form: "hûs-oan-hûsblêd", lang: "fry", pos: "noun", translations: [] },
      { form: "hûs-oan-hûskrante", lang: "fry", pos: "noun", translations: [] },
      { form: "hûsútsetting", lang: "fry", pos: "noun", translations: [] },
      { form: "husa", lang: "fry", pos: "intj", translations: [] },
      { form: "husearje", lang: "fry", pos: "verb", translations: [] },
      { form: "husky", lang: "fry", pos: "noun", translations: [] },
      {
        form: "hús",
        lang: "fry",
        pos: "intj",
        translations: [
          { form: "rent", lang: "en" },
          { form: "house", lang: "en" },
          { form: "home", lang: "en" },
        ],
      },
    ],
    details: [
      {
        lemma: "hûs",
        pos: "noun",
        article: "it",
        hyphenation: "huːs",
        pronunciation: "hûs",
        inflections: [
          { description: "singular", forms: ["hûs"] },
          { description: "plural", forms: ["huzen", "hûzen"] },
          { description: "diminutive singular", forms: ["húske", "hûske"] },
          { description: "diminutive plural", forms: ["húskes", "hûskes"] },
        ],
        synonyms: ["behuzing", "huzing", "wenning", "wente"],
        variants: ["hús"],
        translations: [
          { form: "huis", lang: "nl" },
          { form: "rent", lang: "en" },
          { form: "house", lang: "en" },
          { form: "home", lang: "en" },
        ],
        definitions: ["bouwurk dat as wenning foar minsken tsjinst docht"],
      },
    ],
  },
  "fry:huzen": {
    query: "huzen",
    from: "fry",
    candidates: [
      {
        form: "húzje",
        lang: "fry",
        pos: "verb",
        translations: [{ form: "live, stay", lang: "en" }],
      },
      {
        form: "hûs",
        lang: "fry",
        pos: "noun",
        translations: [
          { form: "rent", lang: "en" },
          { form: "house", lang: "en" },
          { form: "home", lang: "en" },
        ],
      },
    ],
    details: [
      {
        lemma: "hûs",
        pos: "noun",
        article: "it",
        hyphenation: "huːs",
        pronunciation: "hûs",
        inflections: [{ description: "plural", forms: ["huzen", "hûzen"] }],
        synonyms: [],
        variants: [],
        translations: [
          { form: "huis", lang: "nl" },
          { form: "house", lang: "en" },
        ],
        definitions: [],
      },
    ],
  },
  "nl:huis": {
    query: "huis",
    from: "nl",
    candidates: [
      {
        form: "huis",
        lang: "nl",
        pos: "noun",
        translations: [
          { form: "hûs", lang: "fry" },
          { form: "rent", lang: "en" },
          { form: "house", lang: "en" },
          { form: "home", lang: "en" },
        ],
      },
      {
        form: "huis(e)lijk",
        lang: "nl",
        pos: "adv",
        translations: [{ form: "hûslik", lang: "fry" }],
      },
    ],
    details: [
      {
        lemma: "huis",
        pos: "noun",
        article: null,
        hyphenation: null,
        pronunciation: null,
        inflections: [],
        synonyms: [],
        variants: [],
        translations: [
          { form: "hûs", lang: "fry" },
          { form: "rent", lang: "en" },
          { form: "house", lang: "en" },
          { form: "home", lang: "en" },
        ],
        definitions: [],
      },
    ],
  },
};

export const CHECK_RESULTS: Record<string, CheckResult> = {
  "It hus staat yn de tún.": {
    issues: [
      {
        type: "SPELLING_FRIES",
        word: "hus",
        start: 3,
        end: 6,
        suggestions: ["hûs", "hys", "huls", "hie", "ha"],
      },
    ],
  },
  "It hus is in moai doarp.": {
    issues: [
      {
        type: "SPELLING_FRIES",
        word: "hus",
        start: 3,
        end: 6,
        suggestions: ["hûs", "hys"],
      },
      {
        type: "HOLLANISME",
        word: "in",
        start: 10,
        end: 12,
        suggestions: ["yn"],
      },
      {
        type: "FARIANT",
        word: "moai",
        start: 13,
        end: 17,
        suggestions: ["mooi", "kreas"],
      },
    ],
  },
  husk: {
    issues: [
      {
        type: "SPELLING_FRIES",
        word: "husk",
        start: 0,
        end: 4,
        suggestions: ["hûske"],
      },
      {
        type: "FARIANT",
        word: "usk",
        start: 1,
        end: 4,
        suggestions: ["úsk"],
      },
    ],
  },
};
