/**
 * Used to release a spec version
 *
 * wgutils spec release September2026
 */

import { mkdir, writeFile, readFile } from "node:fs/promises";
import { Config } from "../../interfaces.js";
import { exists } from "../../utils.js";
import { validateSpecRepo } from "../validateRepo.js";
import { execGit } from "../../git.js";

export async function releaseSpec(
  config: Config,
  options: {
    tag: string;
  },
) {
  await validateSpecRepo(config);
  if (!config.spec) {
    throw new Error(`This configuration is not setup for spec publishing`);
  }
  const { tag } = options;

  const tags = execGit(["tag", "-l"])
    .split(/\r?\n/)
    .map((t) => t.trim());
  if (tags.includes(tag)) {
    throw new Error(`git tag '${tag}' already exists!`);
  }

  const newEdition = `${
    // This should cover us until 2999... it's probably someone else's problem by then
    tag.replace(/2/, " 2")
  } Edition`;

  const mainFileText = await readFile(config.spec.mainFile, "utf8");
  if (!mainFileText.includes(newEdition)) {
    throw new Error(
      `${config.spec.mainFile} does not include '${newEdition}' - you might need to run \`wgutils spec version\` first.`,
    );
  }

  const changelogsDir = `${process.cwd()}/changelogs`;
  const changelogsFile = `${changelogsDir}/${tag}.md`;
  if (!(await exists(changelogsFile))) {
    throw new Error(
      `${changelogsFile} does not exist - you might need to run \`wgutils spec version\` first.`,
    );
  }
  const changelogText = await readFile(changelogsFile, "utf8");
  const matches = changelogText.match(
    /\[github: all changes[^\]]+\]\([^)]*\.\.([^.)]+)\)/i,
  );
  if (!matches) {
    throw new Error(
      `Could not determine end commit hash - was \`[GitHub: all changes ...](...)\` link present?`,
    );
  }
  const HEAD = matches[1];
  if (HEAD !== tag) {
    const newChangelogText = changelogText.replaceAll(HEAD, tag);
    await writeFile(changelogsFile, newChangelogText);
    execGit(["add", changelogsFile]);
    execGit(["commit", "-m", "Update reference to match tag"]);
  }
  execGit(["tag", tag, "-m", newEdition]);

  const updatedMainFileText = mainFileText.replace(
    newEdition,
    "Current Working Draft",
  );
  await writeFile(config.spec.mainFile, updatedMainFileText);
  execGit(["add", config.spec.mainFile]);
  execGit(["commit", "-m", "Next working draft"]);

  console.log(`Tag ${tag} created; to release: 'git push --follow-tags'`);
}
