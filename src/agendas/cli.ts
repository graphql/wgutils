import type { Argv } from "yargs";
import * as genCmd from "./gen/cli.js";
import type { ArgsFromOptions } from "../interfaces.js";

export function options(yargs: Argv) {
  return yargs
    .command(
      "gen [year] [month]",
      "Generate agenda for particular month",
      genCmd.options,
      genCmd.run,
    )
    .demandCommand();
}
export function run(_args: ArgsFromOptions<typeof options>) {
  // This should never happen, yargs handles it for us
  throw new Error("Subcommand required");
}
