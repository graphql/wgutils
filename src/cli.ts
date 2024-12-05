#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import * as agendasCmd from "./agendas/cli.js";
import * as initCmd from "./init/cli.js";
import * as canAutomergeCmd from "./canAutomerge/cli.js";

yargs(hideBin(process.argv))
  .strict()
  .showHelpOnFail(false, "Specify --help for available options")
  .wrap(yargs.terminalWidth())
  .parserConfiguration({
    // Last option wins - do NOT make duplicates into arrays!
    "duplicate-arguments-array": false,
  })
  .example("$0 agenda gen 2024 1", "Generate the agendas for January 2024")
  .command(
    "init",
    "Initialize wgutils",
    (yargs) => initCmd.options(yargs),
    initCmd.run,
  )
  .command(
    "agenda",
    "Tools for helping with agendas",
    (yargs) => agendasCmd.options(yargs),
    agendasCmd.run,
  )
  .command(
    "can-automerge [pr] [hash]",
    "Designed to run in CI to see if the given PR (at the given hash) can be auto-merged - be certain to ensure all the necessary checks are in place!",
    canAutomergeCmd.options,
    canAutomergeCmd.run,
  )
  .demandCommand().argv;
// Note: the above 'argv' property access actually triggers yargs to start; don't remove it.
