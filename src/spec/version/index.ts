/**
 * Used to version a spec
 *
 * wgutils spec version --previous September2025 September2026
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { Config } from "../../interfaces.js";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export async function versionSpec(
  config: Config,
  options: {
    tag: string;
    previousTag: string;
  },
) {
  const { tag, previousTag } = options;
  if (!/^[a-zA-Z0-9]+$/.test(tag)) {
    console.error(`Unsupported tag: ${tag}`);
    process.exit(1);
  }
  if (!/^[a-zA-Z0-9]+$/.test(previousTag)) {
    console.error(`Unsupported previous tag: ${tag}`);
    process.exit(1);
  }
  const date = new Date();
  date.setHours(12); // Avoid DST issues
  date.setDate(1);
  date.setMonth(date.getMonth() - 1);
  const expectedTags: string[] = [];
  for (let i = 0; i < 4; i++) {
    expectedTags.push(`${MONTHS[date.getMonth()]}${date.getFullYear()}`);
    date.setMonth(date.getMonth() + 1);
  }
  if (!expectedTags.includes(tag)) {
    console.error(
      `Expected tag ('${tag}') to be in '${expectedTags.join("', '")}'`,
    );
    process.exit(1);
  }
}
