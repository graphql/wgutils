import type { Argv } from "yargs";
import { loadConfig } from "../../config.ts";
import type { ArgsFromOptions } from "../../interfaces.ts";

export function options(yargs: Argv) {
  return yargs.positional("date", {
    type: "string",
    demandOption: true,
    describe: "Meeting date (YYYY-MM-DD)",
  });
}

export async function run(args: ArgsFromOptions<typeof options>) {
  const { correlateNotes } = await import("./index.ts");
  const config = await loadConfig();
  if (config.meetings === false) {
    throw new Error("This config has meetings disabled");
  }
  await correlateNotes(config, args.date);
}
