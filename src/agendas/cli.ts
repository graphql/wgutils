import type { Argv } from "yargs";
import * as genCmd from "./gen/cli.ts";
import * as detailsCmd from "./details/cli.ts";
import type { ArgsFromOptions } from "../interfaces.ts";

export function options(yargs: Argv) {
  return yargs
    .command(
      "gen [year] [month]",
      "Generate agenda for particular month",
      genCmd.options,
      genCmd.run,
    )
    .command(
      "details [year] [month] [day]",
      "Show details from agenda files",
      detailsCmd.options,
      detailsCmd.run,
    )
    .demandCommand();
}
export function run(_args: ArgsFromOptions<typeof options>) {
  // This should never happen, yargs handles it for us
  throw new Error("Subcommand required");
}
