import { mkdirSync, writeFileSync } from "fs";
import { execGit, $ } from "../../git";
import { Config } from "../../interfaces.js";
import { validateSpecRepo } from "../validateRepo";

export async function buildSpec(
  config: Config,
  options: {
    test?: boolean;
  },
) {
  await validateSpecRepo(config);
  if (!config.spec) {
    throw new Error(`This configuration is not setup for spec publishing`);
  }

  console.log(`Build the spec${options.test ? " (test)" : ""}`);
  // This script publishes the GraphQL specification document to the web.

  // Determine if this is a tagged release
  const GITTAG = execGit(["tag", "--points-at", "HEAD"]).trim();

  function specMd(
    options: {
      ref: string;
    },
    ...positionals: string[]
  ) {
    return $("node_modules/.bin/spec-md", [
      "--metadata",
      "spec/metadata.json",
      "--githubSource",
      `${config.repoUrl}/blame/${options.ref}/`,
      ...positionals,
    ]);
  }

  // Build the specification draft document
  console.log("Building spec draft");
  mkdirSync("public/draft", { recursive: true });
  const output = specMd({ ref: "main" }, config.spec.mainFile);
  writeFileSync("public/draft/index.html", output);

  // If this is a tagged commit, also build the release document
  if (GITTAG) {
    console.log(`Building spec release ${GITTAG}`);
    mkdirSync(`public/${GITTAG}`, { recursive: true });
    const output = specMd({ ref: GITTAG }, `spec/GraphQL.md`);
    writeFileSync(`public/$GITTAG/index.html`, output);
  }

  // Create the index file
  console.log("Rebuilding: / (index)");

  // Include latest draft
  const GITDATE = execGit([
    "show",
    "-s",
    "--format=%cd",
    "--date=format:%a, %b %-d, %Y",
    "HEAD",
  ]);

  let HTML = `<html>
  <head>
    <title>GraphQL Specification Versions</title>
    <style>
      body {
        color: #333333;
        font: 13pt/18pt Cambria, 'Palatino Linotype', Palatino, 'Liberation Serif', serif;
        margin: 6rem auto 3rem;
        max-width: 780px;
      }
      @media (min-width: 1240px) {
        body {
          padding-right: 300px;
        }
      }
      a {
        color: #3B5998;
        text-decoration: none;
      }
      a:hover {
        text-decoration: underline;
      }
      h1 {
        font-size: 1.5em;
        margin: 8rem 0 2em;
      }
      td {
        padding-bottom: 5px;
      }
      td + td {
        padding-left: 2ch;
      }
    </style>
  </head>
  <body>
    <h1>GraphQL</h1>
    <table>
    <tr>
      <td><em>Prerelease</em></td>
      <td><a href="./draft" keep-hash>Working Draft</a></td>
      <td>${GITDATE}</td>
      <td></td>
    </tr>
  `;

  const GITHUB_RELEASES = `${config.repoUrl}/releases/tag`;
  const tags = execGit(["tag", "-l", "--sort=-*committerdate"])
    .trim()
    .split(/\s+/);
  let HAS_LATEST_RELEASE = false;
  for (const GITTAG of tags) {
    const VERSIONYEAR = GITTAG.slice(-4);
    const TAGTITLE = `${GITTAG.slice(0, -4)} ${VERSIONYEAR}`;
    const TAGGEDCOMMIT = execGit(["rev-list", "-1", GITTAG]).trim();
    const GITDATE = execGit([
      "show",
      "-s",
      "--format=%cd",
      "--date=format:%a, %b %-d, %Y",
      TAGGEDCOMMIT,
    ]).trim();

    HTML += `
    <tr>`;

    if (!HAS_LATEST_RELEASE) {
      HTML += `
      <td><em>Latest Release</em></td>`;
      HAS_LATEST_RELEASE = true;
    } else {
      HTML += `
      <td></td>`;
    }

    HTML += `
      <td><a href="./${GITTAG}" keep-hash>${TAGTITLE}</a></td>
      <td>${GITDATE}</td>
      <td><a href="${GITHUB_RELEASES}/${GITTAG}">Release Notes</a></td>
    </tr>`;
  }

  HTML += `
    </table>
    <script>
      var links = document.getElementsByTagName('a');
      for (var i = 0; i < links.length; i++) {
        if (links[i].hasAttribute('keep-hash')) {
          links[i].href += location.hash;
          links[i].removeAttribute('keep-hash');
        }
      }
    </script>
  </body>
</html>`;

  writeFileSync("public/index.html", HTML);
}
