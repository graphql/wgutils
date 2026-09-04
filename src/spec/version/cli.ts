import type { Argv } from "yargs";
import type { ArgsFromOptions } from "../../interfaces.js";

import { versionSpec } from "./index.js";
import { loadConfig } from "../../config.js";

export function options(yargs: Argv) {
  return yargs
    .option("previous", {
      type: "string",
      demandOption: true,
      description: "The tag of the previous release",
    })
    .positional("tag", {
      type: "string",
      demandOption: true,
      description: "The tag for this release",
    })
    .example(
      "$0 --previous September2025 September2026",
      "Generate September2026 spec release",
    );
}

export async function run(args: ArgsFromOptions<typeof options>) {
  const config = await loadConfig();
  await versionSpec(config, {
    previousTag: args.previous,
    tag: args.tag,
  });
}
