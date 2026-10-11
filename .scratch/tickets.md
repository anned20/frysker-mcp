# Tickets: Frysker MCP server

A stdio MCP server exposing Frysker's Frisian language aids (word lookup, Dutch/Frisian translation, spell-check + fix) as three agent tools. Source spec: `.scratch/spec.md`.

Work the **frontier**: any ticket whose blockers are all done. For a purely linear chain that means top to bottom.

## Walking skeleton: `translate` end-to-end

**What to build:** The thinnest complete vertical path: a buildable stdio MCP server that an agent can call `translate` on and get a translated paragraph back. Includes the project scaffold (TypeScript + official MCP SDK, build to `dist/`), the `FryskerGateway` interface, a real `HttpGateway.translate` that chunks text at ~500 characters on sentence boundaries (paragraph breaks preserved), translates Dutch↔Frisian sequentially, and rejects English input as unsupported. Plus a `MockGateway` backed by a captured translation fixture and a passing test that exercises `translate` through the tool surface.

**Blocked by:** None — can start immediately.

- [ ] `tsc` builds clean; the server starts over stdio and answers an MCP initialize.
- [ ] Calling `translate` on a Dutch paragraph returns Frisian, and vice versa.
- [ ] Text over ~500 chars is chunked on sentence boundaries and reassembled with paragraph structure preserved.
- [ ] `from: "en"` (or English input) is rejected with a clear message, not silently echoed.
- [ ] `node --test` exercises `translate` via `MockGateway` and passes without network access.

## `search_word` lookup

**What to build:** The `search_word` tool: an agent supplies a Frisian or Dutch word and gets candidate lemmas plus full dictionary detail for the top matches. Behind it, `HttpGateway.searchWord` runs the GraphQL `lemmasearch` (fuzzy, `<word>*`) to gather candidate forms, then `details` for the top `max` candidates that resolve, prioritising an exact case-insensitive match. Each detailed entry surfaces part of speech, article, pronunciation/hyphenation, inflections, Dutch/English translations, and Frisian definitions. The full candidate list is included so near-misses and inflected inputs still guide the agent to a lemma. Adds a search fixture to `MockGateway` and tests.

**Blocked by:** Walking skeleton: `translate` end-to-end.

- [ ] `search_word("hûs")` returns article `it`, plural `huzen`, and English translation `house`.
- [ ] A Dutch input word returns Frisian equivalents.
- [ ] An exact match is prioritised above prefix matches; the raw candidate list is shown.
- [ ] Inflected input (e.g. an inflected form `details` cannot resolve) still surfaces the correct lemma via the fuzzy search.
- [ ] Tests run against `MockGateway` with no network access.

## `check_text` (check-only)

**What to build:** The `check_text` tool in check-only mode: an agent supplies Frisian text and gets back structured issues. `HttpGateway.checkText` posts the XML docmodel (with the escaped text and `desired-level`) to the Klinkende Taal checker and parses the returned annotations into typed issues — `SPELLING_FRIES`, `HOLLANISME`, `FARIANT` — each carrying the flagged word, its character offsets, and ranked suggestions. Results are rendered as concise labelled text. `fix` defaults to off, so a plain call never rewrites text. Adds a checker fixture to `MockGateway` and tests.

**Blocked by:** Walking skeleton: `translate` end-to-end.

- [ ] `check_text("It hus staat yn de tún.")` reports `hus` as a `SPELLING_FRIES` issue with `hûs` as the top suggestion.
- [ ] Each issue includes the offending word and its start/end offsets into the input.
- [ ] Suggestion lists are returned in rank order.
- [ ] Spelling, Dutchism, and variant issues are distinguished by type.
- [ ] `level` is passed through to the checker; tests run against `MockGateway`.

## `check_text` auto-fix

**What to build:** The fixing half of `check_text`. When called with `fix: true`, apply the top-ranked suggestion for each selected issue, iterating from the highest offset downward so earlier offsets stay valid and skipping overlaps, then return the corrected text plus a change log (word → replacement, per issue). A `types` filter lets the caller restrict fixes to specific issue categories (e.g. spellings only, leaving Dutchisms/variants untouched).

**Blocked by:** `check_text` (check-only).

- [ ] `fix: true` returns corrected text with `hus` → `hûs`.
- [ ] A change log lists each applied change with its issue type.
- [ ] `types` restricts which issue categories are fixed; excluded issues are left intact.
- [ ] Overlapping annotations are handled without corrupting offsets.

## Resilience & configuration

**What to build:** Harden the shared transport and make the server configurable. Per-request timeout (default ~20s) with a single retry on network errors / 5xx (no retry on 4xx or GraphQL validation errors); hard failures surfaced as MCP tool errors carrying the underlying message rather than empty results; endpoint URLs and the checker credential overridable by environment variable (with the observed public values as defaults); and a `FRYSKER_MOCK=1` offline mode that swaps in `MockGateway`.

**Blocked by:** Walking skeleton: `translate` end-to-end; `search_word` lookup; `check_text` (check-only).

- [ ] A slow/unavailable endpoint yields a clear MCP tool error, not a hang or empty result.
- [ ] One retry happens on network/5xx failure; none on 4xx / validation errors.
- [ ] Endpoint URLs and the checker credential can be overridden via env.
- [ ] `FRYSKER_MOCK=1` makes the server run entirely against `MockGateway`.

## Packaging for publish

**What to build:** Prepare the package so it can later be run via `npx` or published, without publishing it. Add the `bin` entry with a `#!/usr/bin/env node` shebang, the `files` allowlist, and a build-on-publish step; confirm `npm pack --dry-run` produces the expected tarball. Write the README covering what the server is, the three tools, and example opencode / Claude Desktop config — without wiring it into any local config.

**Blocked by:** Walking skeleton: `translate` end-to-end.

- [ ] `npm pack --dry-run` includes `dist/`, the bin, and metadata, and excludes sources/tests.
- [ ] The packed bin is executable and starts the server.
- [ ] README documents the three tools and example client configuration.
- [ ] No publish is performed and no local agent config is modified.
