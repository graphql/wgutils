import { configSchema, Config } from "./configSchema";

export function getConfigPath() {
  return `${process.cwd()}/wg.config.js`;
}

export async function loadConfig(): Promise<Config> {
  const configPath = getConfigPath();
  const rawConfig = (await import(configPath)).default;

  const result = configSchema.safeParse(rawConfig);
  if (result.success) {
    return result.data;
  } else {
    const formatted = result.error.format();
    console.error(
      `Your configuration did not pass validation; the following Zod errors were discovered:`,
    );
    console.error(formatted);
    process.exit(1);
  }
}

export const template = `\
// @ts-check

/** @type {import('wgutils').Config} */
const config = {
  name: "GraphQL WG",
  repoUrl: 'https://github.com/graphql/graphql-wg',
  videoConferenceDetails: \`https://zoom.us/j/593263740
  - _Password:_ graphqlwg\`,
  liveNotesUrl: "https://docs.google.com/document/d/...",
  timezone: "US/Pacific",
  frequency: "monthly",
  // For "last" set nth to -1
  nth: 1,
  weekday: "Th", // M, Tu, W, Th, F, Sa, Su
  time: "10:30-12:00", // 24-hour clock, range
  attendeesTemplate: \`\\
| Name             | GitHub        | Organization       | Location              |
| :--------------- | :------------ | :----------------- | :-------------------- |
| Lee Byron (Host) | @leebyron     | GraphQL Foundation | San Francisco, CA, US |
\`,
/*
  // Additional configuration (optional):

  agendasFolder: "agendas",
  dateAndTimeLocations: 'p1=224&p2=179&p3=136&p4=268&p5=367&p6=438&p7=248&p8=240',
  joiningAMeetingFile: "JoiningAMeeting.md",
  filenameFragment: "wg-primary",
  description: \`\\
The GraphQL Working Group meets regularly to discuss changes to the
[GraphQL Specification][] and other core GraphQL projects. This is an open
meeting in which anyone in the GraphQL community may attend.

This is the primary monthly meeting, which typically meets on the first Thursday
of the month. In the case we have additional agenda items or follow ups, we also
hold additional secondary meetings later in the month.\`,
  links: {
    "graphql specification": "https://github.com/graphql/graphql-spec",
    calendar: "https://calendar.google.com/calendar/embed?src=linuxfoundation.org_ik79t9uuj2p32i3r203dgv5mo8%40group.calendar.google.com",
"google calendar": "https://calendar.google.com/calendar?cid=bGludXhmb3VuZGF0aW9uLm9yZ19pazc5dDl1dWoycDMyaTNyMjAzZGd2NW1vOEBncm91cC5jYWxlbmRhci5nb29nbGUuY29t",
"ical file": "https://calendar.google.com/calendar/ical/linuxfoundation.org_ik79t9uuj2p32i3r203dgv5mo8%40group.calendar.google.com/public/basic.ics",
  },
  secondaryMeetings: [
    {
      // Wednesday, not Thursday
      dayOffset: -1,
      nth: 2,
      time: "16:00-17:00",
      name: "Secondary, APAC",
      // filenameFragment: "wg-secondary-apac",
      description: \`\\
The GraphQL Working Group meets regularly to discuss changes to the
[GraphQL Specification][] and other core GraphQL projects. This is an open
meeting in which anyone in the GraphQL community may attend.

This is a secondary meeting, timed to be acceptable for those in Asia Pacific
timezones, which typically meets on the second Wednesday of the month. The
primary meeting is preferred for new agenda, where this meeting is for overflow
agenda items, follow ups from the primary meeting, or agenda introduced by those
who could not make the primary meeting time.\`,
    },
    {
      nth: 3,
      time: "10:30-12:00",
      name: "Secondary, EU",
      filenameFragment: "wg-secondary-eu",
      description: \`\\
The GraphQL Working Group meets regularly to discuss changes to the
[GraphQL Specification][] and other core GraphQL projects. This is an open
meeting in which anyone in the GraphQL community may attend.

This is a secondary meeting, timed to be acceptable for those in European
timezones, which typically meets on the third Thursday of the month. The
primary meeting is preferred for new agenda, where this meeting is for overflow
agenda items, follow ups from the primary meeting, or agenda introduced by those
who could not make the primary meeting time.\`,
    },
  ],
*/
};

module.exports = config;
`;
