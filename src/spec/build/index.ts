import { Config } from "../../interfaces.js";

export function buildSpec(
  config: Config,
  options: {
    test?: boolean;
  },
) {
  console.log(`Build the spec${options.test ? " (test)" : ""}`);
}
