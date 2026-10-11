# Spec: Frysker MCP server

**Status:** ready-for-agent
**Tracker:** no issue tracker configured (project is not a git repo) — spec captured locally in `.scratch/`

## Problem Statement

An agent that writes or edits Frisian text has no way to look up Frisian words,
translate between Dutch and Frisian, or spell-check and correct Frisian prose.
The knowledge lives behind Frysker (https://frysker.nl), the Fryske Akademy's
digital writing tool, but it is only reachable through a web UI. An agent cannot
call the web UI, and the two APIs behind it are undocumented, use two different
protocols (GraphQL and an XML document-model API), and require reverse-engineering.

## Solution

A local, stdio MCP server that exposes Frysker's language aids as three tools an
agent can call mid-task:

- `search_word` — look up a Frisian or Dutch word: candidate lemmas plus full
  dictionary detail (part of speech, article, pronunciation, inflections,
  Dutch/English translations, Frisian definitions).
- `translate` — translate text between Dutch and Frisian.
- `check_text` — spell/grammar/variant check Frisian text, and optionally apply
  the checker's suggested corrections.

The server translates the two undocumented backends into a single clean gateway
interface, so the tools are testable offline and the API integration is isolated.

## User Stories

1. As a Frisian-writing agent, I want to look up a Frisian word and see its
   meaning, so that I use it correctly.
2. As a Frisian-writing agent, I want to see a word's part of speech and article
   (`it` / `de`), so that I use the right gender.
3. As a Frisian-writing agent, I want to see a word's inflections (singular,
   plural, diminutives), so that I inflect it correctly in a sentence.
4. As a Frisian-writing agent, I want to see a word's pronunciation/hyphenation,
   so that I can handle it phonetically when needed.
5. As a Frisian-writing agent, I want to see synonyms and variants, so that I can
   choose the preferred form.
6. As a Frisian-writing agent, I want Dutch and English translations of a Frisian
   word, so that I can confirm I have the right sense.
7. As a Frisian-writing agent, I want to supply a Dutch word and get Frisian
   equivalents, so that I can find the Frisian term I mean.
8. As a Frisian-writing agent, I want a fuzzy/prefix search that returns candidate
   lemmas, so that near-misses and inflected forms still lead me to the entry.
9. As a Frisian-writing agent, I want an exact match prioritised over prefix
   matches, so that a precise lookup returns the obvious entry first.
10. As a Frisian-writing agent, I want to see the full candidate list alongside
    the detailed entries, so that I can spot the word I actually wanted.
11. As a Frisian-writing agent, I want to pass an inflected form and be led to its
    lemma, so that I do not have to know the citation form.
12. As a Frisian-writing agent, I want to translate a Dutch sentence into Frisian,
    so that I can draft Frisian text from Dutch notes.
13. As a Frisian-writing agent, I want to translate a Frisian sentence into Dutch,
    so that I can check my Frisian against the Dutch intent.
14. As a Frisian-writing agent, I want long text translated accurately, so that a
    whole paragraph does not degrade into garbage.
15. As a Frisian-writing agent, I want paragraph structure preserved through
    translation, so that the result is directly pasteable.
16. As a Frisian-writing agent, I want an unsupported language (English) rejected
    with a clear message, so that I am not handed a silent no-op.
17. As a Frisian-writing agent, I want to spell-check a Frisian text, so that I can
    catch errors before publishing.
18. As a Frisian-writing agent, I want each issue reported with the offending word
    and its character offsets, so that I can locate it precisely.
19. As a Frisian-writing agent, I want ranked suggestions per issue, so that I can
    choose rather than blindly accept.
20. As a Frisian-writing agent, I want spelling, Dutchism, and variant issues
    distinguished, so that I know whether a flag is an error or a style preference.
21. As a Frisian-writing agent, I want to request an automatic fix that applies the
    top suggestion per issue, so that I get corrected text in one step.
22. As a Frisian-writing agent, I want the automatic fix to also return a change
    log, so that I can see what was changed and why.
23. As a Frisian-writing agent, I want to restrict a fix to specific issue types,
    so that I can correct spellings without imposing stylistic changes.
24. As a Frisian-writing agent, I want `check_text` to default to check-only, so
    that a plain call never silently rewrites my text.
25. As a Frisian-writing agent, I want to set the checker's target language level,
    so that feedback matches the intended register.
26. As a Frisian-writing agent, I want tool results as concise labelled text, so
    that they are easy to read and quote without JSON noise.
27. As a developer, I want the two backends behind one gateway interface, so that
    the tools are decoupled from the transport.
28. As a developer, I want a mock gateway backed by captured fixtures, so that
    tests are deterministic and do not hit the network.
29. As a developer, I want an offline/mock mode toggle, so that the server can be
    demoed without network access.
30. As a developer, I want timeouts and a single retry on transient failures, so
    that slow or flaky third parties do not hang the agent.
31. As a developer, I want hard failures surfaced as MCP tool errors with the
    underlying message, so that I can diagnose rather than receive empty results.
32. As a developer, I want endpoint URLs and the checker credential overridable by
    environment variable, so that the server survives token rotation or API moves.
33. As a developer, I want a `bin` entry and prepared publish metadata, so that the
    server can later be run via `npx`/published without further setup.
34. As a developer, I want `tsc` typecheck plus `node --test` integration tests
    against the mock gateway, so that regressions are caught without live calls.

## Implementation Decisions

### Runtime and packaging
- TypeScript on Node, using the official Model Context Protocol SDK.
- **stdio** transport only. No HTTP transport.
- Compiled to `dist/`; a `bin` entry exposes the server as `frysker-mcp`.
- Package metadata prepared for publishing (`files`, build-on-publish script,
  `#!/usr/bin/env node` shebang) but **not published** as part of this work.
- Not wired into any local agent config.

### Gateway seam (the single seam)
- One interface, `FryskerGateway`, sits in front of both external backends. It has
  three methods: `searchWord`, `translate`, `checkText`.
- Two implementations:
  - `HttpGateway` — real network calls (used by the running server).
  - `MockGateway` — returns captured fixtures (used by tests, and available as an
    offline mode selected by `FRYSKER_MOCK=1`).
- This is the only seam. Tools depend on the interface, never on `fetch` or the
  concrete HTTP layer. Tests exercise external behaviour through the same tool
  surface, injected with the mock gateway.

### Tool surface
- `search_word(word: string, from: "fry" | "nl" = "fry", max: number = 5)`
- `translate(text: string, from: "fry" | "nl" = "nl")`
- `check_text(text: string, level: "A1"|"A2"|"B1"|"B2"|"C1"|"C2" = "B1", fix: boolean = false, types?: ("SPELLING_FRIES"|"HOLLANISME"|"FARIANT")[])`
- Results are returned as concise, well-labelled plain text (markdown-ish), **not**
  raw JSON. Structured data stays internal to the server.

### Backend A — GraphQL language API
- Endpoint: `https://frisian.eu/languageapi_v8` (POST, JSON GraphQL).
- Introspection confirmed the schema. Relevant query fields: `lemmasearch`,
  `details`, `translatetext`, `sources` (plus `textsearch`, `index`, `rhyme`,
  unused here).
- `LangType` enum: `nl`, `fry`, `en`.
- `Pos` enum: `adj, adp, adv, aux, cconj, det, intj, noun, num, part, pron, propn, punct, conj, sconj, sym, verb, x, abbr`.
- Available sources (`sources { source fromlang tolang title lexicon }`):
  - `onfw` nl->fry "Online Nederlands Fries Woordenboek"
  - `fhwb` fry->nl "Frysk Hanwurdboek"
  - `fnwb` fry->nl "Frysk-Nederlansk Wurdboek"
  - `nfwb` nl->fry "Nederlansk-Frysk Wurdboek"
  - `jurwb` nl->fry "Juridysk Wurdboek"
  - `fiwb` fry->en "Frysk Ingelsk Wurdboek"
  - `fkw` fry->fry "Frisian Lexicon" (`lexicon: true`)
- **`details` only resolves exact lemmas.** Inflected forms fail
  (`details("huzen")` -> "not found"; `details("huske")` -> "not found").
- **`lemmasearch` is fuzzy/lemma-aware.** Searching `huzen*` surfaced the lemma
  `hus`; searching `huz*` surfaced `hus` among many `huz-` compounds.
- Search source selection: Frisian -> `fkw` for lookup, `fhwb` for detail;
  Dutch -> `nfwb` for both lookup and detail.
- `search_word` strategy: run `lemmasearch` with `"<word>*"`, collect candidate
  forms, then call `details` for the top `max` candidates that resolve,
  prioritising an exact (case-insensitive) match on the input word. Unresolvable
  candidates are skipped. The full candidate list is included in the output.
- `details` returns an array; each entry has `lemma` (form, lang, pos, article,
  hyphenation, pronunciation, meaning, subForms) and `translations` (form, lang,
  pos) and `senses` (definition gloss text, links).
- Definitions are extracted from `senses[].definition.def[].gloss.text[].textT`
  (and the `FormattedText.text[].textT` variant), joining non-empty fragments.
- `translatetext(text, lang)` returns `{ translation, translationlang }`.
  **`translationlang` echoes the source `lang`, not the target** — the output is
  always the opposite of the input among nl/fry. English input is echoed back
  unchanged (unsupported) and must be rejected by the tool.

### Backend B — Klinkende Taal XML checker
- Endpoint: `https://web-api.taalweb.frl/kt/analyse` (POST, `application/xml`).
- Requires a `Basic` auth header. Value observed in Frysker's public JS:
  `Basic ZnJ5c2s6MmI2YTYzOGI5MDY0MWZiZDg0YzM1NDQ3NmNiY2UwMDg=`
  (user `frysk`). Hardcoded as default, overridable via env.
- Request body is an XML document:
  ```xml
  <document xmlns="http://www.gridline.nl/1.0/docmodel/documents">
    <id xmlns="">frysk</id>
    <source xmlns="">kt_jsgem</source>
    <fields xmlns="">
      <field><name>document-name</name><content>frysk</content></field>
      <field><name>content</name><content>{text}</content></field>
      <field><name>desired-level</name><content>{level}</content></field>
    </fields>
  </document>
  ```
  `{text}` must be XML-escaped.
- Response is a docmodel XML. The part the tool needs is the `annotations`
  element under the `content` field:
  ```xml
  <annotation>
    <type>SPELLING_FRIES|HOLLANISME|FARIANT</type>
    <source>SuggestionsAggregator</source>
    <start>3</start><end>6</end>
    <reason>hus</reason>
    <labels>
      <label><name>hus</name><score>1.09</score></label>
      ...
    </labels>
  </annotation>
  ```
- `start`/`end` are character offsets into the input text; labels are ranked
  suggestions (highest score first).
- Fix strategy: apply the top-ranked suggestion per issue, iterating from the
  highest offset downward so earlier offsets remain valid; skip overlapping
  annotations. Default `fix` applies all three types; `types` filters which are
  applied. `fix: false` (default) never rewrites text.

### Operational behaviour
- Per-request timeout default ~20s, env-overridable.
- One retry on network errors / 5xx responses. No retry on 4xx or GraphQL
  validation errors.
- Hard failures surfaced as MCP tool errors carrying the underlying message; no
  silent empty results.
- Endpoint URLs and the checker credential read from environment with the observed
  public values as defaults.

## Testing Decisions

- Tests assert **external behaviour** only (tool outputs given inputs), never
  implementation details of the gateway or formatting internals.
- The `FryskerGateway` interface is the test seam. Tests inject `MockGateway`,
  which replays captured fixtures, so tests are deterministic and offline.
- Coverage:
  - `search_word`: known lemma (`hus`) yields article `it`, plural `huzen`, and
    an English translation `house`; Dutch lookup yields Frisian equivalents;
    exact match is prioritised.
  - `translate`: `It hus stiet yn de tun.` -> `Het huis staat in de tuin.`;
    paragraph chunking preserves structure; English input is rejected.
  - `check_text`: `It hus staat yn de tun.` flags `hus` with `hus` as top
    suggestion; `fix: true` returns corrected text and a change log.
- Typecheck via `tsc --noEmit`.
- Run with `node --test`.
- Prior art: none in-repo (greenfield project); follow standard Node test-runner
  conventions.

## Out of Scope

- Publishing to npm (package prepared only; `npm publish` is the user's action).
- Wiring the server into any local agent/tool configuration.
- HTTP/SSE transport; remote hosting.
- The other GraphQL capabilities not needed here: `textsearch`, `index`, `rhyme`.
- Human-facing UI or interactive CLI beyond the MCP stdio interface.
- Support for English source/target translation (the API is a no-op for it).

## Further Notes

- Both backends are undocumented and reverse-engineered from the site's network
  traffic; they may change without notice. The env-overridable endpoints and the
  isolated gateway exist to contain that risk.
- The checker credential is a public token embedded in Frysker's client JS, not a
  user secret.
- Captured fixtures for the mock layer were saved while exploring the site
  (`search-response.json`, `translate-response.json`, `check-response.xml`).
