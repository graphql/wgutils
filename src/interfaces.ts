import type { Argv, Arguments, CamelCaseKey } from "yargs";

export type OptionsFunction<TArgs> = (yargs: Argv) => Argv<TArgs>;

export type ArgsFromOptions<TOptionsFunction extends OptionsFunction<any>> =
  TOptionsFunction extends OptionsFunction<infer U> ? Args<U> : never;

export type Args<TArgs> = {
  [key in keyof Arguments<TArgs> as
    | key
    | CamelCaseKey<key>]: Arguments<TArgs>[key];
};
