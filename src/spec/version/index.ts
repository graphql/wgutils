/**
 * Used to version a spec
 *
 * wgutils spec version --previous September2025 September2026
 */

import { mkdir, writeFile, readFile } from "node:fs/promises";
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
  inConfig: Config,
  options: {
    tag: string;
    previousTag: string | false | undefined;
    current?: string;
    force?: boolean;
    debug?: boolean;
  },
) {
  const config = await validateSpecRepo(inConfig);
  const { tag, previousTag: rawPT, force, current, debug } = options;
  const previousTag = (() => {
    if (rawPT === false || rawPT === "-") {
      // No previous tag
      return null;
    } else if (rawPT === undefined) {
      // Guess the previous tag
      const tags = execGit(["tag", "-l", "--sort=-*committerdate"])
        .split(/\s+/)
        .filter((t) => t !== "" && t != tag);
      return tags[0] ?? null;
    } else if (typeof rawPT === "string") {
      return rawPT;
    } else {
      throw new Error(`Did not understand ${rawPT}`);
    }
  })();
  if (!/^[a-zA-Z0-9]+$/.test(tag)) {
    console.error(`Unsupported tag: ${tag}`);
    process.exit(1);
  }
  if (previousTag != null && !/^[a-zA-Z0-9]+$/.test(previousTag)) {
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
  const hasPreviousChangelog =
    previousTag != null && (await exists(`${changelogsDir}/${previousTag}.md`));
  const specUrl = config.spec.url.replace(/[/]$/, "");
  const repoUrl = config.repoUrl.replace(/[/]$/, "");

  const HEAD = execGit(["rev-parse", current ?? "HEAD"]).trim();
  const previousGitRef =
    previousTag ??
    execGit(["rev-list", "--first-parent", "--max-parents=0", HEAD]).trim();
  const contributorList = await generateContributorList({
    config,
    from: previousGitRef,
    to: HEAD,
    path: `${process.cwd()}/spec`,
    debug,
  });
  const getCommitDate = (commit: string) =>
    execGit(["show", "-s", "--format=%cs", commit + "^{commit}"]).trim();
  const headDate = getCommitDate(HEAD);
  const previousTagDate = getCommitDate(previousGitRef).trim();

  if (previousTag != null && !hasPreviousChangelog) {
    throw new Error(`There's no previous changelog matching '${previousTag}'?`);
  }

  const newEdition = `${
    // This should cover us until 2999... it's probably someone else's problem by then
    tag.replace(/2/, " 2")
  } Edition`;
  const mainFileText = await readFile(config.spec.mainFile, "utf8");
  const updatedMainFileText = mainFileText.replace(
    /Current Working Draft/i,
    newEdition,
  );
  if (mainFileText === updatedMainFileText) {
    if (!mainFileText.includes(newEdition)) {
      throw new Error("'Current Working Draft' text not found!");
    }
  } else {
    await writeFile(config.spec.mainFile, updatedMainFileText);
  }

  const since =
    previousTag == null ? "before initial spec cut" : "since last spec cut";

  const template = `\
# ${tag.replace(/([0-9])/, " $1")} Changelog

${
  previousTag == null
    ? `\
This describes the set of changes incorporated into the initial version of
the ${config.spec.title} specification. It's intended to ease the review of the specification for
`
    : `\
This describes the set of changes since the last edition of
the ${config.spec.title} specification, [${previousTag}](${specUrl}/${previousTag}/)${
        hasPreviousChangelog
          ? ` (see [prior
changelog](./${previousTag}.md))`
          : ""
      }. It's intended to ease the review of changes since the last edition for
`
}\
reviewers or curious readers, but is not normative. Please read the
[specification document](${specUrl}/${tag}/) itself for
full detail and context.

## Thank you, contributors!

<!-- TODO: add editors notes! -->

## Contributors

Anyone is welcome to join working group meetings and contribute to the ${config.spec.title} specification. See
[Contributing.md](${repoUrl}/blob/main/CONTRIBUTING.md)
for more information. Thank you to these community members for their technical
contribution to this edition of the ${config.spec.title} specification.

${contributorList}

## Notable contributions

<!-- TODO: pull out notable changes from the full list above -->

## Changeset

- [GitHub: all Accepted RFC PRs merged ${since}](${repoUrl}/pulls?q=is%3Apr+is%3Amerged+base%3Amain+merged%3A${previousTagDate}..${headDate}+label%3A%22%F0%9F%8F%81+Accepted+%28RFC+3%29%22)
- [GitHub: all Editorial PRs merged ${since}](${repoUrl}/pulls?page=1&q=is%3Apr+is%3Amerged+base%3Amain+merged%3A${previousTagDate}..${headDate}+label%3A%22%E2%9C%8F%EF%B8%8F+Editorial%22)
- [GitHub: all changes ${since}](${repoUrl}/compare/${previousGitRef}...${HEAD})

${await gitLog(previousGitRef, HEAD, specDir)}

${
  previousTag == null
    ? ""
    : `\
## Diff

[GitHub: diff from last spec cut](${repoUrl}/compare/${previousGitRef}...${HEAD}?w=1)
`
}
## Notes

This changeset was generated with the help of

\`\`\`sh
yarn wgutils spec version ${previousTag == null ? `--no-previous` : `--previous ${previousTag}`} --current ${HEAD} ${tag}
\`\`\`
`;

  const formatted = await format(template, {
    parser: "markdown",
    proseWrap: "always",
    trailingComma: "all",
  });

  await writeFile(changelogsFile, formatted);

  execGit(["add", config.spec.mainFile, changelogsFile]);
  execGit(["commit", "-m", `Prepare for ${tag} release`]);

  console.log(
    `${changelogsFile} written, spec title updated, and all committed.\n\nNext: add editors notes and similar, review in full, commit, then raise a PR and send to the TSC for approval.`,
  );
}
