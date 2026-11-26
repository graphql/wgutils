import type { Argv } from "yargs";
import type { ArgsFromOptions } from "../../interfaces.ts";
import { labelsetNames, syncLabels } from "./index.ts";

export function options(yargs: Argv) {
  return yargs.positional("labelset", {
    choices: labelsetNames,
    demandOption: true,
  });
}

export function run(args: ArgsFromOptions<typeof options>) {
  syncLabels(args.labelset);
}
