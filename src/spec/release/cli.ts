import type { Argv } from "yargs";
import type { ArgsFromOptions } from "../../interfaces.ts";

import { releaseSpec } from "./index.ts";
import { loadConfig } from "../../config.ts";

export function options(yargs: Argv) {
  return yargs
    .positional("tag", {
      type: "string",
      demandOption: true,
      description: "The tag for this release",
    })
    .example("$0 September2026", "Tag September2026 spec release");
}

export async function run(args: ArgsFromOptions<typeof options>) {
  const config = await loadConfig();
  await releaseSpec(config, {
    tag: args.tag,
  });
}
