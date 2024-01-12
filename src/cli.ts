import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";

import * as agendasCmd from "./agendas/cli.js";
import * as initCmd from "./init/cli.js";

yargs(hideBin(process.argv))
  .parserConfiguration({
    // Last option wins - do NOT make duplicates into arrays!
    "duplicate-arguments-array": false,
  })
  .example("$0 agenda gen 2024 1", "Generate the agendas for January 2024")
  .command(
    "init",
    "Initialize wgtools",
    (yargs) => initCmd.options(yargs),
    initCmd.run,
  )
  .command(
    "agenda",
    "Tools for helping with agendas",
    (yargs) => agendasCmd.options(yargs),
    agendasCmd.run,
  )
  .demandCommand();
