import type { Argv } from "yargs";
import * as syncCmd from "./sync/cli.ts";

export function options(yargs: Argv) {
  return yargs
    .command(
      "sync <labelset>",
      "Create missing labels in the current GitHub repository",
      syncCmd.options,
      syncCmd.run,
    )
    .demandCommand();
}
