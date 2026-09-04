/**
 * Used to version a spec
 *
 * wgutils spec version --previous September2025 September2026
 */

import { mkdir, writeFile } from "node:fs/promises";
import { Config } from "../../interfaces.js";
import { exists } from "../../utils.js";
import { format } from "prettier";
import { validateSpecRepo } from "../validateRepo.js";
import { gitLog } from "./gitLog.js";
import { generateContributorList } from "../contributors/utils.js";
import { execGit } from "../../git.js";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export async function versionSpec(
  config: Config,
  options: {
    tag: string;
    previousTag: string;
    current?: string;
    force?: boolean;
  },
) {
  await validateSpecRepo(config);
  if (!config.spec) {
    throw new Error(`This configuration is not setup for spec publishing`);
  }
  const { tag, previousTag, force, current } = options;
  if (!/^[a-zA-Z0-9]+$/.test(tag)) {
    console.error(`Unsupported tag: ${tag}`);
    process.exit(1);
  }
  if (!/^[a-zA-Z0-9]+$/.test(previousTag)) {
    console.error(`Unsupported previous tag: ${tag}`);
    process.exit(1);
  }
  const date = new Date();
  date.setHours(12); // Avoid DST issues
  date.setDate(1);
  date.setMonth(date.getMonth() - 1);
  const expectedTags: string[] = [];
  for (let i = 0; i < 4; i++) {
    expectedTags.push(`${MONTHS[date.getMonth()]}${date.getFullYear()}`);
    date.setMonth(date.getMonth() + 1);
  }
  if (!force && !expectedTags.includes(tag)) {
    console.error(
      `Expected tag ('${tag}') to be in '${expectedTags.join("', '")}' (use --force to force)`,
    );
    process.exit(1);
  }

  const changelogsDir = `${process.cwd()}/changelogs`;
  const specDir = `${process.cwd()}/spec`;
  await mkdir(changelogsDir, { recursive: true });
  const changelogsFile = `${changelogsDir}/${tag}.md`;
  if (!force && (await exists(changelogsFile))) {
    console.error(
      `Refusing to overwrite existing changelog ${changelogsFile} (use --force to force)`,
    );
    process.exit(1);
  }
  const hasPreviousChangelog = await exists(
    `${changelogsDir}/${previousTag}.md`,
  );
  const specUrl = config.spec.url.replace(/[/]$/, "");
  const repoUrl = config.repoUrl.replace(/[/]$/, "");

  const contributorList = await generateContributorList(
    previousTag,
    tag,
    `${process.cwd()}/spec`,
  );
  const HEAD = execGit(["rev-parse", current ?? "HEAD"]).trim();
  const getCommitDate = (commit: string) =>
    execGit(["show", "-s", "--format=%cs", commit + "^{commit}"]).trim();
  const headDate = getCommitDate(HEAD);
  const previousTagDate = getCommitDate(previousTag).trim();

  const template = `\
# ${tag.replace(/([0-9])/, " $1")} Changelog

This describes the set of changes since the last edition of
${config.spec.sentenceName}, [${previousTag}](${specUrl}/${previousTag}/)${
    hasPreviousChangelog
      ? ` (see [prior
changelog](./${previousTag}.md))`
      : ""
  }. It's intended to ease the review of changes since the last edition for
reviewers or curious readers, but is not normative. Please read the
[specification document](${specUrl}/${tag}/) itself for
full detail and context.

## Thank you, contributors!

<!-- TODO: add editors notes! -->

## Contributors

Anyone is welcome to join working group meetings and contribute to GraphQL. See
[Contributing.md](${repoUrl}/blob/main/CONTRIBUTING.md)
for more information. Thank you to these community members for their technical
contribution to this edition of the GraphQL specification.

${contributorList}

## Notable contributions

<!-- TODO: pull out notable changes -->

## Changeset

- [Github: all Accepted RFC PRs merged since last spec cut](${repoUrl}/pulls?q=is%3Apr+is%3Amerged+base%3Amain+merged%3A${previousTagDate}..${headDate}+label%3A%22%F0%9F%8F%81+Accepted+%28RFC+3%29%22)
- [Github: all Editorial PRs merged since last spec cut](${repoUrl}/pulls?page=1&q=is%3Apr+is%3Amerged+base%3Amain+merged%3A${previousTagDate}..${headDate}+label%3A%22%E2%9C%8F%EF%B8%8F+Editorial%22)
- [Github: all changes since last spec cut](${repoUrl}/compare/${previousTag}...${HEAD})

${await gitLog(previousTag, HEAD, specDir)}

## Diff

[Github: diff from last spec cut](${repoUrl}/compare/${previousTag}...${HEAD}?w=1)

## Notes

This changeset was generated with the help of

\`\`\`sh
yarn wgutils spec version --previous ${previousTag} ${tag}
\`\`\`
`;

  const formatted = await format(template, {
    parser: "markdown",
    proseWrap: "always",
    trailingComma: "all",
  });

  await writeFile(changelogsFile, formatted);

  console.log(`${changelogsFile} written.`);
}
