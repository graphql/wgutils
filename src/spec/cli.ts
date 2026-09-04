import type { Argv } from "yargs";
import * as versionCmd from "./version/cli.js";
import type { ArgsFromOptions } from "../interfaces.js";

export function options(yargs: Argv) {
  return yargs
    .command(
      "version [options] <tag>",
      "Generate agenda for particular month",
      versionCmd.options,
      versionCmd.run,
    )
    .demandCommand();
}
export function run(_args: ArgsFromOptions<typeof options>) {
  // This should never happen, yargs handles it for us
  throw new Error("Subcommand required");
}
