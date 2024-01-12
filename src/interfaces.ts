import type { Argv, Arguments, CamelCaseKey } from "yargs";

/** @internal */
export type OptionsFunction<TArgs> = (yargs: Argv) => Argv<TArgs>;

/** @internal */
export type ArgsFromOptions<TOptionsFunction extends OptionsFunction<any>> =
  TOptionsFunction extends OptionsFunction<infer U> ? Args<U> : never;

/** @internal */
export type Args<TArgs> = {
  [key in keyof Arguments<TArgs> as
    | key
    | CamelCaseKey<key>]: Arguments<TArgs>[key];
};

/** @internal */
export interface Meeting {
  primary: boolean;
  name: string;
  description: string | undefined;
  timezone: string;
  year: number;
  month: number;
  date: number;
  /** Range, 24h */
  time: string;
  filenameFragment: string;
}

export { Config } from "./configSchema.js";
