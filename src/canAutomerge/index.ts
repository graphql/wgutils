import { exec } from "node:child_process";
import { promisify } from "node:util";
// I don't trust the minified version, but have checked the raw code
// @ts-ignore
import parseDiffRaw from "parse-diff/parse.js";

import { Config } from "../interfaces.js";

const parseDiff = parseDiffRaw as typeof import("parse-diff");

const execAsync = promisify(exec);

const safeChars =
  /^[^\x00-\x08\x0B\x0C\x0E-\x1F\u200B\u200C\u200D\uFEFF\uE000-\uF8FF]*$/u;

function checkPatch(patch: string, expectedHash: string) {
  const lines = patch.split("\n");
  const hash = lines[0].split(" ")[1];
  if (hash !== expectedHash) {
    throw new Error(`Unexpected hash - ${hash} !== ${expectedHash}`);
  }

  const SUMMARY_START = "\n\n---\n ";
  const SUMMARY_END = "\n\n";
  const summaryStart = patch.indexOf(SUMMARY_START);
  if (summaryStart < 0) {
    throw new Error("Diff parse failure - could not find summaryStart");
  }
  const summaryEnd = patch.indexOf(
    SUMMARY_END,
    summaryStart + SUMMARY_START.length,
  );
  if (summaryEnd < 0) {
    throw new Error("Diff parse failure - could not find summaryEnd");
  }
  const _summary = patch.slice(summaryStart + SUMMARY_START.length, summaryEnd);
  const diffText = patch.slice(summaryEnd + SUMMARY_END.length);
  const diff = parseDiff(diffText);
  if (diff.length !== 1) {
    throw new Error(`Too many files changed`);
  }
  const file = diff[0];
  if (!file.from || !file.to || file.from !== file.to) {
    throw new Error(`File was renamed`);
  }
  if (
    // TODO: replace this with a config-aware agenda check
    !/^agendas\/[0-9]+\/[0-9]{1,2}-[A-Za-z]+\/[0-9]+-[-a-z]+\.md$/.test(file.to)
  ) {
    throw new Error(`Not an agenda file`);
  }
  for (const chunk of file.chunks) {
    for (const change of chunk.changes) {
      switch (change.type) {
        case "normal": {
          continue;
        }
        case "add": {
          if (!safeChars.test(change.content)) {
            throw new Error(`Aborting due to unexpected characters`);
          }
          break;
        }
        case "del": {
          throw new Error(`Aborting due to deletion`);
        }
        default: {
          const never: never = change;
          throw new Error(
            `Aborting due to unexpected change type ${JSON.stringify(never)}`,
          );
        }
      }
    }
  }
}

export async function checkPr(
  config: Config,
  prNumber: number,
  hash: string,
): Promise<void> {
  if (!Number.isFinite(prNumber)) {
    throw new Error(`Invalid PR number`);
  }
  if (!/^[a-z0-9]{40}$/.test(hash)) {
    throw new Error(`Invalid commit hash`);
  }

  const { stdout: patch } = await execAsync(`gh pr diff ${prNumber} --patch`);

  checkPatch(patch, hash);
  console.log("Looks safe");
}
