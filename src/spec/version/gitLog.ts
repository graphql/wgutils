import { relative } from "node:path";
import { execGit } from "../../git";

export async function gitLog(previousTag: string, HEAD: string, path: string) {
  const args = [
    "log",
    `${previousTag}..${HEAD}`,
    "--format=| [%h](https://github.com/graphql/graphql-spec/commit/%H) | %s | %an <%ae> %(trailers:key=Co-authored-by,valueonly,separator=%x20)",
    "--",
    relative(process.cwd(), path),
  ];
  const result = execGit(args);
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

function escapeArgumentForMarkdown(arg: string): string {
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
