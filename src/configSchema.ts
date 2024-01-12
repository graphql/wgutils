import { z } from "zod";

const secondaryMeetingSchema = z.object({
  dayOffset: z
    .number()
    .describe(
      'If this is on a different day, set this to the "offset", e.g. if the main meeting is Thursday but the secondary is the next Wednesday, use `-1`',
    )
    .optional(),
  nth: z.number(),
  time: z.string(),
  name: z.string().optional().default("Secondary"),
  description: z.string().optional(),
  filenameFragment: z.string().optional(),
});

export const configSchema = z.object({
  name: z.string(),
  repoUrl: z.string(),
  videoConferenceDetails: z.string(),
  liveNotesUrl: z.string().optional(),
  repoSubpath: z.string().optional(),
  description: z.string().optional(),
  // linksMarkdown: z.string().optional(),
  links: z.record(z.string()).optional(),
  attendeesTemplate: z.string(),
  /* From dateandtime.com URL query string: p1=...&p2=...&... */
  dateAndTimeLocations: z.string().optional(),
  /** In the agenda file name */
  filenameFragment: z.string().optional(),
  agendasFolder: z.string(),
  joinAMeetingFile: z.string().optional(),
  // TODO: support more timezones
  timezone: z.enum(["US/Pacific", "UTC"]),
  frequency: z.enum(["weekly", "monthly"]),
  /** If weekly, which meeting is the primary? */
  primaryN: z.number().optional(),
  weekday: z.enum(["M", "Tu", "W", "Th", "F", "Sa", "Su"]),
  /** If frequency="monthly", the nth weekday will be used */
  nth: z.number().optional(),
  /** 24h range, e.g. `"09:15-19:45"` */
  time: z.string(),
  /** If this WG has secondary meetings, specify them here. Only for monthly. */
  secondaryMeetings: z.array(secondaryMeetingSchema).optional(),
});

export type Config = z.infer<typeof configSchema>;
