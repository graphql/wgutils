import { existsSync, mkdirSync, readdirSync, writeFileSync } from "fs";
import { execGit, $ } from "../../git";
import { Config } from "../../interfaces.js";
import { validateSpecRepo } from "../validateRepo";
import { SpecConfig } from "../../configSchema";

async function specMd(config: SpecConfig, ref: string) {
  const {
    repoUrl,
    spec: { mainFile },
  } = config;
  return $("node_modules/.bin/spec-md", [
    "--metadata",
    "spec/metadata.json",
    "--githubSource",
    `${repoUrl}/blame/${ref}/`,
    mainFile,
  ]);
}

function write(file: string, contents: string, test: boolean) {
  const buffer = Buffer.from(contents, "utf8");
  console.log(
    `${file}: ${buffer.length} bytes${test ? " (test)" : " (written)"}`,
  );
  if (!test) writeFileSync(file, contents);
}

export async function buildSpecRelease(
  config: SpecConfig,
  tag: string,
  test = false,
) {
  console.log(`Building spec release ${tag}`);
  if (!test) mkdirSync(`published/${tag}`, { recursive: true });
  const output = await specMd(config, tag);
  const filename = `published/${tag}/index.html`;
  write(filename, output, test);
  return filename;
}

export async function buildSpec(
  rawConfig: Config,
  options: {
    test?: boolean;
  },
) {
  const { test = false } = options;
  const config = await validateSpecRepo(rawConfig);
  const {
    repoUrl,
    spec: { title },
  } = config;

  // This script publishes the GraphQL specification document to the web.

  // Determine if this is a tagged release
  const GITTAG = execGit(["tag", "--points-at", "HEAD"]).trim();
  if (/\s/.test(GITTAG)) {
    throw new Error(`Matched multiple tags! ${GITTAG}`);
  }

  // Build the specification draft document
  console.log("Building spec draft");
  if (!test) mkdirSync("public/draft", { recursive: true });
  const output = await specMd(config, "main");
  write("public/draft/index.html", output, test);

  // If this is a tagged commit, also build the release document
  if (GITTAG) {
    await buildSpecRelease(config, GITTAG, test);
  }

  // Copy all published versions into `public`
  if (existsSync("published")) {
    for (const dir of readdirSync("published", { withFileTypes: true })) {
      if (!dir.name.startsWith(".") && dir.isDirectory()) {
        if (!test) {
          $("cp", ["-a", `published/${dir.name}`, `public/${dir.name}`]);
        }
      }
    }
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
  ]).trim();

  let HTML = `<html>
  <head>
    <title>${title} Specification Versions</title>
    <style>
      body {
        color: #333333;
        font:
          13pt/18pt Cambria,
          "Palatino Linotype",
          Palatino,
          "Liberation Serif",
          serif;
        margin: 6rem auto 3rem;
        max-width: 780px;
      }
      @media (min-width: 1240px) {
        body {
          padding-right: 300px;
        }
      }
      a {
        color: #3b5998;
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
    <h1>${title}</h1>
    <table>
      <tr>
        <td><em>Prerelease</em></td>
        <td><a href="./draft" keep-hash>Working Draft</a></td>
        <td>${GITDATE}</td>
        <td></td>
      </tr>`;

  const GITHUB_RELEASES = `${repoUrl}/releases/tag`;
  const tags = execGit(["tag", "-l", "--sort=-*committerdate"])
    .split(/\s+/)
    .filter((t) => t !== "");
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
        <td>
          <a
            href="${GITHUB_RELEASES}/${GITTAG}"
            >Release Notes</a
          >
        </td>
      </tr>`;
  }

  HTML += `
    </table>
    <script>
      var links = document.getElementsByTagName("a");
      for (var i = 0; i < links.length; i++) {
        if (links[i].hasAttribute("keep-hash")) {
          links[i].href += location.hash;
          links[i].removeAttribute("keep-hash");
        }
      }
    </script>
  </body>
</html>
`;

  write("public/index.html", HTML, test);
}
