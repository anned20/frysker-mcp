# frysker-mcp

A local, stdio [Model Context Protocol](https://modelcontextprotocol.io) server
that exposes [Frysker](https://frysker.nl)'s Frisian language aids — the Fryske
Akademy's digital writing tool — as tools an agent can call mid-task.

Frysker's language aids sit behind two undocumented backends: a GraphQL language
API and an XML spell-checker. This server wraps both behind one clean gateway and
exposes three tools, so an agent writing Frisian can look words up, translate
between Dutch and Frisian, and spell-check and correct Frisian prose.

## Tools

### `search_word`

Look up a Frisian or Dutch word. Returns candidate lemmas plus full dictionary
detail for the top matches: part of speech, article (`it` / `de`), pronunciation
and hyphenation, inflections, Dutch/English translations, synonyms, variants and
Frisian definitions.

- `word` (string, required) — the word to look up.
- `from` (string, default `"fry"`) — `"fry"` for Frisian, `"nl"` for Dutch.
- `max` (number, default `5`) — maximum number of detailed entries.

Fuzzy and inflected input is resolved through the API's lemma-aware search, and an
exact match is prioritised above prefix matches. The full candidate list is always
included.

### `translate`

Translate text between Dutch and Frisian. Long text is chunked on sentence
boundaries (paragraph breaks preserved) and translated sequentially.

- `text` (string, required) — the text to translate.
- `from` (string, default `"nl"`) — `"nl"` (Dutch) or `"fry"` (Frisian).

English is not supported by the backend; English input is rejected with a clear
message rather than echoed back.

### `check_text`

Spell/grammar/variant check Frisian text. Reports structured issues
(`SPELLING_FRIES`, `HOLLANISME`, `FARIANT`), each with the offending word, its
character offsets and ranked suggestions.

- `text` (string, required) — the Frisian text to check.
- `level` (string, default `"B1"`) — target language level (`A1`–`C2`).
- `fix` (boolean, default `false`) — when `true`, apply the top-ranked suggestion
  per issue and return the corrected text plus a change log.
- `types` (array, optional) — restrict fixes to specific issue types.

`fix` defaults to off, so a plain call never rewrites text.

## Install and run

The package is not published yet, but it runs from source:

```sh
npm install
npm run build
node dist/index.js
```

Set `FRYSKER_MOCK=1` to run entirely against captured fixtures, with no network
access:

```sh
FRYSKER_MOCK=1 node dist/index.js
```

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `FRYSKER_GRAPHQL_URL` | `https://frisian.eu/languageapi_v8` | GraphQL language API endpoint. |
| `FRYSKER_CHECKER_URL` | `https://web-api.taalweb.frl/kt/analyse` | Klinkende Taal XML checker endpoint. |
| `FRYSKER_CHECKER_AUTH` | public `Basic` token | Checker credential. |
| `FRYSKER_TIMEOUT_MS` | `20000` | Per-request timeout. |
| `FRYSKER_MOCK` | unset | `1` or `true` runs against the offline mock gateway. |

Requests time out (default ~20s) and retry once on network errors or 5xx
responses; 4xx responses and GraphQL validation errors are reported immediately.
Hard failures surface as MCP tool errors carrying the underlying message.

## Client configuration

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "frysker": {
      "command": "npx",
      "args": ["-y", "frysker-mcp"]
    }
  }
}
```

### opencode

Add to `opencode.json` (or `opencode.jsonc`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "frysker": {
      "type": "local",
      "command": ["npx", "-y", "frysker-mcp"],
      "enabled": true
    }
  }
}
```

To run from a local checkout instead, point `command` at the built entry point:

```json
{
  "command": ["node", "/absolute/path/to/frysker-mcp/dist/index.js"]
}
```

## Development

```sh
npm run build       # compile to dist/
npm run typecheck   # typecheck sources and tests
npm test            # run the test suite (node --test, offline via MockGateway)
```

Tests assert external behaviour only, injected with the mock gateway, and never
touch the network.

## Notes

Both backends are undocumented and reverse-engineered from the site's network
traffic; they may change without notice. The env-overridable endpoints and the
isolated gateway exist to contain that risk. The checker credential is a public
token embedded in Frysker's client JavaScript, not a user secret.
