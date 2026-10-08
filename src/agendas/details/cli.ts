import type { Argv } from "yargs";
import type { ArgsFromOptions } from "../../interfaces.ts";
import { loadConfig } from "../../config.ts";

export function options(yargs: Argv) {
  return yargs
    .positional("year", { type: "string" })
    .positional("month", { type: "string" })
    .positional("day", { type: "string" })
    .option("json", { type: "boolean", default: false });
}

export async function run(args: ArgsFromOptions<typeof options>) {
  const { getAgendaDetails, formatAgendaDetails } = await import("./index.ts");
  const config = await loadConfig();
  if (config.meetings === false) {
    throw new Error(`This config has meetings disabled`);
  }
  const details = await getAgendaDetails(config, {
    year: args.year,
    month: args.month,
    day: args.day,
  });
  console.log(
    args.json ? JSON.stringify(details, null, 2) : formatAgendaDetails(details),
  );
}
