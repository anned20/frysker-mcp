import { expect, test } from "vitest";

import { loadConfig } from "../src/config.js";
import { HttpGateway } from "../src/httpGateway.js";

type FetchLike = typeof fetch;

function asFetch(
  fn: (url: string, init?: RequestInit) => Promise<Response>,
): FetchLike {
  return fn as unknown as FetchLike;
}

const lemmasResponse = JSON.stringify({
  data: {
    lemmasearch: {
      total: 1,
      lemmas: [
        {
          form: "hûs",
          lang: "fry",
          pos: "noun",
          translations: [],
          link: { lemma: "hûs" },
        },
      ],
    },
  },
});

function detailsEntry() {
  return {
    source: "fhwb",
    lemma: {
      form: "hûs",
      pos: "noun",
      lang: "fry",
      article: "it",
      hyphenation: "hûs",
      pronunciation: "huːs",
      subForms: [
        { __typename: "Synonym", form: "wenning", lang: "fry" },
        { __typename: "Dutchism", form: "huis", lang: "nl" },
      ],
    },
    translations: [],
    senses: [
      {
        definition: {
          def: [
            {
              __typename: "Gloss",
              gloss: {
                text: [
                  { __typename: "T", textT: "bouwurk" },
                  {
                    __typename: "Q",
                    textQ: [{ __typename: "T", textT: "benammen" }],
                  },
                  {
                    __typename: "I",
                    textI: [
                      {
                        __typename: "Q",
                        textQ: [{ __typename: "T", textT: "figuerlik" }],
                      },
                    ],
                  },
                  { __typename: "L", link: { lemma: "wenning" } },
                ],
              },
            },
            {
              __typename: "FormattedText",
              text: [{ __typename: "T", textT: "losse definysje" }],
            },
          ],
        },
        translations: [
          {
            __typename: "TextTranslated",
            lang: "nl",
            text: {
              text: [
                {
                  __typename: "Q",
                  textQ: [{ __typename: "T", textT: "een huis" }],
                },
                { __typename: "T", textT: "staat" },
              ],
            },
          },
        ],
      },
    ],
  };
}

function recordingGateway(options: {
  senseSubForms: boolean;
  auth?: string;
  senses?: unknown[];
}) {
  const requests: Array<{
    query: string;
    headers: Record<string, string>;
  }> = [];
  const fetchFn = asFetch(async (_url, init) => {
    const body = String(init?.body ?? "");
    const query = (JSON.parse(body) as { query?: string }).query ?? "";
    requests.push({
      query,
      headers: (init?.headers as Record<string, string>) ?? {},
    });
    if (query.includes("lemmasearch")) {
      return new Response(lemmasResponse, { status: 200 });
    }
    if (query.includes('__type(name: "Sense")')) {
      const fields = options.senseSubForms
        ? [{ name: "id" }, { name: "subForms" }]
        : [{ name: "id" }, { name: "definition" }];
      return new Response(JSON.stringify({ data: { __type: { fields } } }), {
        status: 200,
      });
    }
    const entry = detailsEntry();
    if (options.senses) entry.senses = options.senses as typeof entry.senses;
    return new Response(JSON.stringify({ data: { details: [entry] } }), {
      status: 200,
    });
  });
  const config = options.auth
    ? loadConfig({ FRYSKER_GRAPHQL_AUTH: options.auth })
    : loadConfig({});
  return { gateway: new HttpGateway({ config, fetchFn }), requests };
}

test("extracts quoted, italic, linked and bare-text definitions", async () => {
  const { gateway } = recordingGateway({ senseSubForms: false });
  const result = await gateway.searchWord("hûs", "fry", 1);
  const detail = result.details[0]!;
  expect(detail.definitions).toEqual([
    "bouwurk benammen figuerlik wenning",
    "losse definysje",
  ]);
});

test("captures Dutchism subforms separately from synonyms and variants", async () => {
  const { gateway } = recordingGateway({ senseSubForms: false });
  const result = await gateway.searchWord("hûs", "fry", 1);
  const detail = result.details[0]!;
  expect(detail.synonyms).toEqual(["wenning"]);
  expect(detail.variants).toEqual([]);
  expect(detail.dutchisms).toEqual(["huis"]);
});

test("extracts quoted text from a TextTranslated sense translation", async () => {
  const { gateway } = recordingGateway({ senseSubForms: false });
  const result = await gateway.searchWord("hûs", "fry", 1);
  const detail = result.details[0]!;
  expect(
    detail.translations.some(
      (translation) =>
        translation.form === "een huis staat" && translation.lang === "nl",
    ),
    "the TextTranslated text is joined from its nested Q and T segments",
  ).toBe(true);
});

test("keeps sense-level subForms out of the query when the endpoint lacks them", async () => {
  const { gateway, requests } = recordingGateway({ senseSubForms: false });
  await gateway.searchWord("hûs", "fry", 1);
  const details = requests.filter((r) => r.query.includes("query Details"));
  expect(details.length).toBe(1);
  expect(details[0]!.query.match(/on FormInfo/g)?.length).toBe(1);
});

test("queries and collects sense-level subForms when the endpoint supports them", async () => {
  const senses = [
    {
      subForms: [{ __typename: "Variant", form: "húskes", lang: "fry" }],
      definition: { def: [] },
      translations: [],
    },
  ];
  const { gateway, requests } = recordingGateway({ senseSubForms: true, senses });
  const result = await gateway.searchWord("hûs", "fry", 1);
  const detail = result.details[0]!;
  expect(detail.variants).toEqual(["húskes"]);
  const details = requests.find((r) => r.query.includes("query Details"));
  expect(details, "a details query was sent").toBeTruthy();
  expect(details!.query.match(/on FormInfo/g)?.length).toBe(2);
});

test("sends a GraphQL authorization header when one is configured", async () => {
  const { gateway, requests } = recordingGateway({
    senseSubForms: false,
    auth: "Bearer secret",
  });
  await gateway.searchWord("hûs", "fry", 1);
  expect(requests.length).toBeGreaterThan(0);
  for (const request of requests) {
    expect(request.headers.authorization).toBe("Bearer secret");
  }
});
