import { relative } from "node:path";
import { execGit } from "../../git";

const DIVIDER = "§FIELD_DIVIDE§";

function markdownTableEscape(str: string) {
  return str
    .replace(
      /[&|]|\n|\r\n?/g,
      (t) =>
        ({
          "&": "&amp;",
          "|": "&#124;",
          "\n": "<br/>",
          "\r\n": "<br/>",
          "\r": "<br/>",
        })[t] ?? t,
    )
    .replace(/<([a-zA-Z]+(?:[ >]|\/>))/g, "&lt;$1");
}

export async function gitLog(previousTag: string, HEAD: string, path: string) {
  const args = [
    "log",
    `${previousTag}..${HEAD}`,
    `--format=[%h](https://github.com/graphql/graphql-spec/commit/%H)${DIVIDER}%s${DIVIDER}%an <%ae> %(trailers:key=Co-authored-by,valueonly,separator=%x20)`,
    "--",
    relative(process.cwd(), path),
  ];
  const lines = execGit(args);
  const result = lines
    .trim()
    .split(/\r?\n/)
    .map(
      (l) =>
        "| " + l.split(DIVIDER).map(markdownTableEscape).join(" | ") + " |",
    )
    .join("\n");
  return `
Listed in reverse-chronological order (latest commit on top).

| Hash | Change | Authors |
| ---- | ------ | ------- |
${result}

Generated with:

\`\`\`sh
git ${args.map(escapeArgumentForMarkdown).join(" ")}
\`\`\`

`;
}

function escapeArgumentForMarkdown(rawArg: string): string {
  // Make it more legible
  const arg = rawArg.replaceAll(DIVIDER, " | ");
  if (/^[-a-zA-Z0-9_./]+$/.test(arg)) {
    return arg;
  } else {
    const escape = (str: string) => str.replace(/([$"])/g, `"'$1'"`);
    const matches = /^(--[-A-Za-z0-9]+=)(.*)$/.exec(arg);
    if (matches) {
      return `${matches[1]}"${escape(matches[2])}"`;
    } else {
      return `"${escape(arg)}"`;
    }
  }
}
