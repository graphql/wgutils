import type { Argv } from "yargs";
import * as versionCmd from "./version/cli.js";
import * as releaseCmd from "./release/cli.js";
import type { ArgsFromOptions } from "../interfaces.js";

export function options(yargs: Argv) {
  return yargs
    .command(
      "version [options] <tag>",
      "Create a named version of the spec ready for voting",
      versionCmd.options,
      versionCmd.run,
    )
    .command(
      "release <tag>",
      "Release the spec once voting completes",
      releaseCmd.options,
      releaseCmd.run,
    )
    .demandCommand();
}
export function run(_args: ArgsFromOptions<typeof options>) {
  // This should never happen, yargs handles it for us
  throw new Error("Subcommand required");
}
