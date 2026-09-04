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

export function revList(range: string, paths: string[]) {
  const args = ["rev-list", range];
  if (paths.length) args.push("--", ...paths);
  const out = execGit(args);
  return out.split(/\r?\n/).filter(Boolean);
}

export function parseCoAuthorLines(message: string) {
  const out = [];
  const re = /^[ \t]*Co-authored-by:\s*(.+?)\s*<([^>]+)>/gim;
  let m;
  while ((m = re.exec(message)))
    out.push({ name: m[1].trim(), email: m[2].trim() });
  return out;
}
