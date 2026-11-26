import { graphql } from "../../github.ts";

export interface Reference {
  key: string;
  owner: string;
  repo: string;
  number: number;
  discussion: boolean;
}

export function getReferences(
  source: string,
  localRepo: string | undefined,
): Reference[] {
  const references: Reference[] = [];

  function add(repository: string, digits: string, discussion = false) {
    const number = Number(digits);
    if (number < 1 || number > 2_147_483_647) return;
    const [owner, repo] = repository.toLowerCase().split("/");
    references.push({
      key: `${owner}/${repo}#${number}`,
      owner,
      repo,
      number,
      discussion,
    });
  }

  // A shorthand-looking link label refers to its URL, which may be in a
  // different repository from the agenda.
  source = source.replace(
    /\[(?:[\w.-]+\/[\w.-]+)?#\d+\](?=\(\s*<?https?:\/\/)/gi,
    "",
  );
  source = source.replace(
    /\[[^\]\n]+\](?=\(\s*<?https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/(?:issues|pulls?|discussions)\/(\d+)\b)/gi,
    (link, number: string) =>
      link.replace(/(?<![\w/])#\d+\b/g, (ref) =>
        ref === `#${number}` ? "" : ref,
      ),
  );

  // Consume URLs first so their fragments cannot be mistaken for shorthand.
  const shorthand = source.replace(/https?:\/\/[^\s<>"`()[\]]+/gi, (url) => {
    const match =
      /^https:\/\/github\.com\/([\w.-]+\/[\w.-]+)\/(issues|pulls?|discussions)\/(\d+)(?=$|[/?#.,:;!])/i.exec(
        url,
      );
    if (match)
      add(match[1], match[3], match[2].toLowerCase() === "discussions");
    return " ";
  });

  for (const match of shorthand.matchAll(
    /(?<![\w/])(?:([\w.-]+\/[\w.-]+))?#(\d+)\b/gi,
  )) {
    const [, repository = localRepo, number] = match;
    if (repository) add(repository, number);
  }
  return references;
}

interface GitHubItem {
  __typename: "Issue" | "PullRequest" | "Discussion";
  title: string;
  url: string;
  body: string;
  author: { login: string } | null;
  labels: { nodes: Array<{ name: string } | null> | null } | null;
}

const itemFields = `
  title
  url
  body
  author { login }
  labels(first: 20) { nodes { name } }
`;

export async function fetchReference(ref: Reference, token: string) {
  async function lookup(field: "discussion" | "issueOrPullRequest") {
    const selection =
      field === "discussion"
        ? itemFields
        : `... on Issue { ${itemFields} } ... on PullRequest { ${itemFields} }`;
    const { data, errors } = await graphql({
      token,
      query: `query($owner: String!, $repo: String!, $number: Int!) {
        repository(owner: $owner, name: $repo) {
          item: ${field}(number: $number) { __typename ${selection} }
        }
      }`,
      variables: { owner: ref.owner, repo: ref.repo, number: ref.number },
    });
    const item: GitHubItem | null | undefined = data?.repository?.item;
    const itemNotFound =
      item === null &&
      errors?.every(
        (error) =>
          error.type === "NOT_FOUND" &&
          error.path?.join(".") === "repository.item",
      );
    if (item === undefined || (errors?.length && !itemNotFound)) {
      throw new Error(`GitHub lookup failed for ${ref.key}`);
    }
    return item;
  }

  const item = ref.discussion
    ? await lookup("discussion")
    : ((await lookup("issueOrPullRequest")) ?? (await lookup("discussion")));
  if (!item) throw new Error(`GitHub reference ${ref.key} was not found`);
  return {
    title: item.title,
    url: item.url,
    type: item.__typename,
    description: item.body.slice(0, 2_000),
    author: item.author?.login ?? null,
    labels:
      item.labels?.nodes?.flatMap((label) => (label ? [label.name] : [])) ?? [],
  };
}
