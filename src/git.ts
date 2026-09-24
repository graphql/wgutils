import {
  ExecFileOptionsWithStringEncoding,
  execFileSync,
} from "node:child_process";
import { die } from "./utils.js";

/** Do not use this in security sensitive places; it's just for presentation */
function printArg(arg: string): string {
  if (/^[-a-zA-Z0-9]+$/.test(arg)) {
    return arg;
  } else {
    return `'${arg.replaceAll("'", `'"'"'`)}'`;
  }
}

export function execGit(
  argv: string[],
  opts: Partial<ExecFileOptionsWithStringEncoding> = {},
): string {
  return $("git", argv, opts);
}

export function $(
  commandName: string,
  argv: string[],
  opts: Partial<ExecFileOptionsWithStringEncoding> = {},
): string {
  try {
    return execFileSync(commandName, argv, {
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 400,
      ...opts,
    });
  } catch (e) {
    const { stdout, stderr } = e as any;
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    die(`${commandName} ${argv.map(printArg).join(" ")} failed: ${e}`);
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
