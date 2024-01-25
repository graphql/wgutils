/**
 * This tool generates new agenda files in a consistent format. When making
 * changes to future agenda templates, please make the changes to this tool
 * first, then generate files.
 *
 * To use this tool, provide year and month as command arguments
 *
 * wgutils agenda gen 2023 6
 *
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { toDate } from "date-fns-tz";
import { Config, Meeting } from "../../interfaces.js";
import { inspect } from "node:util";

const EMDASH = "—";

export async function generateAgendas(
  config: Config,
  options: {
    year: string;
    month: string;
  },
) {
  const year = parseInt(options.year, 10);
  const month = parseInt(options.month, 10);
  if (!year || !month) {
    throw new Error(`Please pass year and month`);
  }
  const today = new Date();
  if (year < today.getFullYear() - 3 || year > today.getFullYear() + 9) {
    console.error(
      `Invalid year '${year}', please select a recent or close future year`,
    );
    process.exit(1);
  }
  if (month < 1 || month > 12) {
    console.error(`Invalid month '${month}', must be between 1 and 12`);
    process.exit(1);
  }

  // Get JoiningAMeeting contents
  const howToJoin = config.joiningAMeetingFile
    ? (
        await readFile(`${process.cwd()}/${config.joiningAMeetingFile}`, "utf8")
      ).split("\n## How to join\n\n")[1]
    : undefined;

  const meetings = getMeetings(config, year, month);
  for (const meeting of meetings) {
    const contents = fillMeetingTemplate(config, meeting, howToJoin);
    const { absPath } = getPaths(config, meeting);
    await mkdirp(dirname(absPath));
    await writeFile(absPath, contents);
    console.log(`Wrote file: ${absPath}`);
  }
}

function getPaths(config: Config, meeting: Meeting) {
  const { year, month, date, filenameFragment } = meeting;
  const ROOT = process.cwd();
  const relativePath = `${config.agendasFolder ?? "agendas"}/${year}/${month2D(
    month,
  )}-${monthShort(month)}/${day2D(year, month, date)}-${filenameFragment}.md`;
  const url = `${config.repoUrl}/blob/main/${relativePath}`;
  const absPath = `${ROOT}/${relativePath}`;
  return { relativePath, url, absPath };
}

function fillMeetingTemplate(
  config: Config,
  meeting: Meeting,
  howToJoin?: string,
) {
  const priorSecondaryMeetings = meeting.primary
    ? getPriorMeetings(config, meeting)
    : [];

  const { links } = config;
  const allLinks = {
    calendar:
      "https://calendar.google.com/calendar/embed?src=linuxfoundation.org_ik79t9uuj2p32i3r203dgv5mo8%40group.calendar.google.com",
    "google calendar":
      "https://calendar.google.com/calendar?cid=bGludXhmb3VuZGF0aW9uLm9yZ19pazc5dDl1dWoycDMyaTNyMjAzZGd2NW1vOEBncm91cC5jYWxlbmRhci5nb29nbGUuY29t",
    "ical file":
      "https://calendar.google.com/calendar/ical/linuxfoundation.org_ik79t9uuj2p32i3r203dgv5mo8%40group.calendar.google.com/public/basic.ics",
    ...links,
    ...(config.joiningAMeetingFile
      ? {
          [config.joiningAMeetingFile]: `${config.repoUrl}/blob/main/${config.joiningAMeetingFile}`,
        }
      : null),
    ...(config.liveNotesUrl ? { "live notes": config.liveNotesUrl } : null),
  };
  const { description: meetingDescription } = meeting;

  return t`${
    howToJoin
      ? t`<!--

# How to join (copied directly from /${config.joiningAMeetingFile!})

${howToJoin}

-->

`
      : t``
  }\
| This is an open meeting: To attend, ${
    config.joiningAMeetingFile
      ? `read [${config.joiningAMeetingFile}][] then `
      : ""
  }edit and PR this file. (Edit: ✎ above, or press "e") |
| ---------------------------------------------------------------------------------------- |

# ${meeting.name}

${meetingDescription ? meetingDescription + "\n\n" : ""}\
- **Date & Time**: ${dateAndTimeMarkdown(config, meeting)}
  - View the [calendar][], or subscribe ([Google Calendar][], [ical file][]).
  - _Please Note:_ The date or time may change. Please check this agenda the
    week of the meeting to confirm. While we try to keep all calendars accurate,
    this agenda document is the source of truth.
- **Video Conference Link**: ${config.videoConferenceDetails}
${config.liveNotesUrl ? `- **Live Notes**: [Live Notes][]\n` : ""}\

${Object.entries(allLinks)
  .map(([name, href]) => t`[${name}]: ${href}`)
  .join("\n")}

## Attendees

<!-- prettier-ignore -->
${config.attendeesTemplate}

## Agenda

1. Agree to Membership Agreement, Participation & Contribution Guidelines and Code of Conduct (1m, Host)
   - [Specification Membership Agreement](https://github.com/graphql/foundation)
   - [Participation Guidelines](https://github.com/graphql/graphql-wg#participation-guidelines)
   - [Contribution Guide](https://github.com/graphql/graphql-spec/blob/main/CONTRIBUTING.md)
   - [Code of Conduct](https://github.com/graphql/foundation/blob/master/CODE-OF-CONDUCT.md)
1. Introduction of attendees (5m, Host)
1. Determine volunteers for note taking (1m, Host)
1. Review agenda (2m, Host)
${
  priorSecondaryMeetings.length > 0
    ? `\
1. Review prior secondary meetings (5m, Host)
${
  priorSecondaryMeetings
    .map((prior) => `   - [${prior.name}](${getPaths(config, prior).url})`)
    .join("\n") + "\n"
}`
    : ""
}\
${
  config.agendaTemplateBottom ??
  `\
1. Review previous meeting's action items (5m, Host)
   - [Ready for review](${config.repoUrl}/issues?q=is%3Aissue+is%3Aopen+label%3A%22Ready+for+review+%F0%9F%99%8C%22+sort%3Aupdated-desc)
   - [All open action items (by last update)](${config.repoUrl}/issues?q=is%3Aissue+is%3Aopen+label%3A%22Action+item+%3Aclapper%3A%22+sort%3Aupdated-desc)
`
}`;
}

function getPriorMeetings(config: Config, primaryMeeting: Meeting) {
  // TODO: handle the primary meeting not being the first in a month
  const previousYear =
    primaryMeeting.month === 1 ? primaryMeeting.year - 1 : primaryMeeting.year;
  const previousMonth =
    primaryMeeting.month === 1 ? 12 : primaryMeeting.month - 1;
  const meetings = getMeetings(config, previousYear, previousMonth).filter(
    (m) => !m.primary,
  );
  // TODO: Check the file exists
  return meetings;
}

function processTime(time: string) {
  const matches = /^([0-9]{1,2}):([0-9]{2})-([0-9]{1,2}):([0-9]{2})$/.exec(
    time,
  );
  if (!matches) {
    throw new Error(
      `Invalid time range string '${time}'; should be of format 'HH:MM-HH:MM' in 24 hour clock.`,
    );
  }

  return {
    startHH: parseInt(matches[1], 10),
    startMM: parseInt(matches[2], 10),
    endHH: parseInt(matches[3], 10),
    endMM: parseInt(matches[4], 10),
  };
}

function dateAndTimeMarkdown(config: Config, meeting: Meeting) {
  const { startHH, startMM, endHH, endMM } = processTime(meeting.time);
  const { year, month, date } = meeting;
  const start = toDate(
    `${year}-${String(month).padStart(2, "0")}-${String(date).padStart(
      2,
      "0",
    )}T${String(startHH).padStart(2, "0")}:${String(startMM).padStart(
      2,
      "0",
    )}:00`,
    { timeZone: config.timezone },
  );
  const end = toDate(
    `${year}-${String(month).padStart(2, "0")}-${String(date).padStart(
      2,
      "0",
    )}T${String(endHH).padStart(2, "0")}:${String(endMM).padStart(2, "0")}:00`,
    { timeZone: config.timezone },
  );
  const dateTimeRange = new Intl.DateTimeFormat("en-US", {
    timeZone: config.timezone,
    year: "numeric",
    month: "long",
    day: "numeric",
    hour12: true,
    hour: "numeric",
    minute: "numeric",
    timeZoneName: "short",
  }).formatRange(start, end);

  const isoTime = start.toISOString().replace(/[:-]/g, "").slice(0, 15);
  const timeLink = `https://www.timeanddate.com/worldclock/converter.html?iso=${isoTime}&${
    config.dateAndTimeLocations ??
    `p1=224&p2=179&p3=136&p4=268&p5=367&p6=438&p7=248&p8=240`
  }`;
  return `[${dateTimeRange}](${timeLink})`;
}

function t(strings: TemplateStringsArray, ...values: Array<string | number>) {
  return strings.reduce((out, string, i) => {
    const value = values[i - 1];
    if (value == null) {
      throw new Error(
        `Error occurred with ${i}th parameter in template: ${inspect(
          value,
        )}; template: ${strings.join("_____")}`,
      );
    }
    return out + value + string;
  });
}

function getWeekdayNumber(weekday: Config["weekday"]): number {
  const lower = weekday.toLowerCase();
  const std = /^[st]/.test(lower) ? lower.slice(0, 2) : lower[0];
  switch (std) {
    case "su":
      return 0;
    case "m":
      return 1;
    case "tu":
      return 2;
    case "w":
      return 3;
    case "th":
      return 4;
    case "f":
      return 5;
    case "sa":
      return 6;
    default: {
      throw new Error(
        `Please specify the weekday as M, Tu, W, Th, F, Sa or Su.`,
      );
    }
  }
}

/** Returns the date of the nth weekday in the given year/month; or null if it doesn't have one */
function nthDate(
  year: number,
  month: number,
  weekday: number,
  nth: number,
): number | null {
  // Critical: date is at noon so it's unaffected by daylight savings time
  const monthStartWeekday = new Date(year, month - 1, 1, 12).getDay();
  const date = new Date(
    year,
    month - 1,
    (monthStartWeekday <= weekday ? weekday + 1 : weekday + 8) -
      monthStartWeekday,
  );

  /** All of the `weekday` dates in the given month */
  const weekdayDates = [new Date(+date)];

  for (let i = 1; i <= 5; i++) {
    const oldDate = date.getDate();
    // Add a week
    date.setDate(oldDate + 7);
    if (date.getDate() < oldDate) {
      // Must have gone forward a month
      break;
    }
    weekdayDates.push(new Date(+date));
  }

  const d =
    nth > 0 ? weekdayDates[nth - 1] : weekdayDates[weekdayDates.length + nth];
  if (!d) {
    return null;
  }
  return d.getDate();
}

function monthName(month: number) {
  return new Date(2024, month - 1, 1, 12).toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    month: "long",
  });
}

function monthShort(month: number) {
  return new Date(2024, month - 1, 1, 12).toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    month: "short",
  });
}

function month2D(month: number) {
  return new Date(2024, month - 1, 1, 12).toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    month: "2-digit",
  });
}
function day2D(year: number, month: number, date: number) {
  return new Date(year, month - 1, date, 12).toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    day: "2-digit",
  });
}

function getMeetings(config: Config, year: number, month: number) {
  const weekday = getWeekdayNumber(config.weekday);
  const meetings: Meeting[] = [];
  if (config.frequency === "monthly") {
    const date = nthDate(year, month, weekday, config.nth ?? 1);
    if (date === null) {
      throw new Error(
        `There's no ${config.nth}th ${config.weekday} in ${year}-${month}?`,
      );
    }
    const name = `${config.name} ${EMDASH} ${monthName(month)} ${year}${
      config.secondaryMeetings ? " (Primary)" : ""
    }`;
    meetings.push({
      primary: true,
      name,
      description: config.description,
      year,
      month,
      date,
      timezone: config.timezone,
      time: config.time,
      filenameFragment: config.filenameFragment ?? fragmentFromName(name),
    });
    if (config.secondaryMeetings) {
      for (let index = 0; index < config.secondaryMeetings.length; index++) {
        const m = config.secondaryMeetings[index];
        const baseDate = nthDate(year, month, weekday, m.nth);
        if (baseDate === null) {
          throw new Error(
            `There's no ${config.nth}th ${config.weekday} in ${year}-${month}?`,
          );
        }
        const date = baseDate + (m.dayOffset ?? 0);
        const name = `${config.name} ${EMDASH} ${monthName(month)} ${year} (${
          m.name ?? `Secondary ${index + 1}`
        })`;
        meetings.push({
          primary: false,
          name,
          description: m.description ?? config.description,
          year,
          month,
          date,
          timezone: config.timezone,
          time: m.time,
          filenameFragment:
            m.filenameFragment ??
            config.filenameFragment ??
            fragmentFromName(name),
        });
      }
    }
  } else if (config.frequency === "weekly") {
    if (config.secondaryMeetings) {
      throw new Error(
        `Weekly meetings can't have secondary meetings right now`,
      );
    }
    for (let n = 1; n <= 5; n++) {
      const date = nthDate(year, month, weekday, n);
      if (date === null) break;
      const primary = n === (config.primaryN ?? 1);
      meetings.push({
        primary,
        name: `${config.name} ${EMDASH} ${monthName(month)} ${year} (${
          primary ? "Primary" : `Week ${n}`
        })`,
        description: config.description,
        year,
        month,
        date,
        timezone: config.timezone,
        time: config.time,
        filenameFragment:
          config.filenameFragment ?? (primary ? `primary` : `week-${n}`),
      });
    }
  } else {
    throw new Error(`Frequency must be "monthly" or "weekly"`);
  }
  return meetings;
}

function fragmentFromName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function mkdirp(path: string): Promise<void> {
  try {
    await mkdir(path, { recursive: true });
  } catch (e: any) {
    if (e.code === "EEXIST") {
      return;
    }
    throw e;
  }
}
