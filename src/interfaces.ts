import type { Argv, Arguments } from "yargs";

// All this because yargs ESM doesn't export CamelCaseKey helper.
type PascalCase<S extends string> = string extends S
  ? string
  : S extends `${infer T}-${infer U}`
    ? `${Capitalize<T>}${PascalCase<U>}`
    : Capitalize<S>;
type CamelCase<S extends string> = string extends S
  ? string
  : S extends `${infer T}-${infer U}`
    ? `${T}${PascalCase<U>}`
    : S;
type CamelCaseKey<K extends PropertyKey> = K extends string
  ? Exclude<CamelCase<K>, "">
  : K;

/** @internal */
export type OptionsFunction<TArgs> = (yargs: Argv) => Argv<TArgs>;

/** @internal */
export type ArgsFromOptions<TOptionsFunction extends OptionsFunction<any>> =
  TOptionsFunction extends OptionsFunction<infer U> ? Args<U> : never;

/** @internal */
export type Args<TArgs> = {
  [
    key in keyof Arguments<TArgs> as key | CamelCaseKey<key>
  ]: Arguments<TArgs>[key];
};

/** @internal */
export interface Meeting {
  primary: boolean;
  name: string;
  description: string | undefined;
  timezone: string;
  year: number;
  /** 1 - Jan, 12 - Dec */
  month: number;
  date: number;
  /** Range, 24h */
  time: string;
  filenameFragment: string;
}

export type { Config } from "./configSchema.ts";
