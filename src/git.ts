import {
  ExecFileOptionsWithStringEncoding,
  execFileSync,
} from "node:child_process";
import { die } from "./utils.js";

export function execGit(
  argv: string[],
  opts: Partial<ExecFileOptionsWithStringEncoding> = {},
): string {
  try {
    return execFileSync("git", argv, {
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 400,
      ...opts,
    });
  } catch (e) {
    die(`git ${argv.join(" ")} failed: ${e}`);
  }
}
