import { execFileSync } from "node:child_process";
import graphql from "../labelsets/graphql.json" with { type: "json" };

const labelsets = { graphql };
type LabelsetName = keyof typeof labelsets;
export const labelsetNames = Object.keys(labelsets) as LabelsetName[];

export function syncLabels(labelset: LabelsetName) {
  const endpoint = "repos/{owner}/{repo}/labels";
  const pages: { name: string }[][] = JSON.parse(
    execFileSync("gh", ["api", "--paginate", "--slurp", endpoint], {
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 400,
    }),
  );
  const existing = new Set(
    pages.flat().map((label) => label.name.toLowerCase()),
  );
  for (const label of labelsets[labelset]) {
    if (existing.has(label.name.toLowerCase())) continue;
    execFileSync("gh", [
      "api",
      "--method",
      "POST",
      endpoint,
      "-f",
      `name=${label.name}`,
      "-f",
      `description=${label.description}`,
      "-f",
      `color=${label.color}`,
    ]);
    console.log(`Created ${label.name}`);
  }
}
