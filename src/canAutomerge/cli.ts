import type { Argv } from "yargs";
import type { ArgsFromOptions } from "../interfaces.ts";

import { checkPr } from "./index.ts";
import { loadConfig } from "../config.ts";

export function options(yargs: Argv) {
  return yargs
    .positional("pr", { type: "number", demandOption: true })
    .positional("hash", { type: "string", demandOption: true })
    .example(
      "$0 <pr> <hash>",
      "Returns success if PR #<pr> at hash <hash> meets the automerge requirements",
    );
}

export async function run(args: ArgsFromOptions<typeof options>) {
  const config = await loadConfig();
  if (config.meetings === false) {
    throw new Error(`This config has meetings disabled`);
  }
  try {
    await checkPr(config, args.pr, args.hash);
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error(err.message);
    process.exit(1);
  }
}
