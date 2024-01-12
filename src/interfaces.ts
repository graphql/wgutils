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

export interface Config {
  repoUrl: string;
  root?: string;
  repoSubpath?: string;
  wgName: string;
  description?: string;
  linksMarkdown?: string;
  attendeesTemplate: string;
  /* From dateandtime.com URL query string: p1=...&p2=...&... */
  dateAndTimeLocations?: string;
  /** In the agenda file name */
  filenameFragment?: string;
  agendasFolder: string;
  joinAMeetingFile?: string;
  timezone: "US/Pacific" | "UTC" | string;
  frequency: "weekly" | "monthly";
  /** If weekly, which meeting is the primary? */
  primaryN?: number;
  weekday: "M" | "Tu" | "W" | "Th" | "F" | "Sa" | "Su";
  /** If frequency="monthly", the nth weekday will be used */
  nth?: number; // If "Monthly"
  /** 24h range, e.g. `"09:15-19:45"` */
  time: string;
  /** If this WG has secondary meetings, specify them here. Only for monthly. */
  secondaryMeetings?: Array<{
    /** If this is on a different day, set this to the "offset", e.g. if the main meeting is Thursday but the secondary is the next Wednesday, use `-1` */
    dayOffset?: number;
    nth: number;
    time: string;
    /** Default 'Secondary' */
    name?: string;
    description?: string;
    filenameFragment?: string;
  }>;
}

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
