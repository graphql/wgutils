import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { getAgendaDetails } from "../dist/index.js";

test("meeting details distinguish simultaneous agendas and prefilled attendees", async (t) => {
  const cwd = process.cwd();
  const repo = await mkdtemp(join(tmpdir(), "wgutils-agendas-"));
  process.chdir(repo);
  t.after(async () => {
    process.chdir(cwd);
    await rm(repo, { recursive: true, force: true });
  });

  const folder = "wg/schedules/2026/07-Jul";
  await mkdir(folder, { recursive: true });
  const header = "| Name | GitHub |\n| --- | --- |";
  const config = {
    repoSubpath: "wg",
    agendasFolder: "schedules",
    attendeesTemplate: header + "\n| Host | @host |\n| Co-host | |",
  };
  const prefilled = "| co-HOST | |\n| Renamed host | @HOST |";
  const cases = [
    ["primary", "6:00 – 7:00 PM GMT+2", prefilled, "17:00", false],
    [
      "secondary",
      "9:00-9:30 AM PDT",
      "| Guest | @guest |\n| Host | @host |",
      "16:30",
      true,
    ],
    ["overnight", "11:00 PM – 12:30 AM", prefilled, "17:30", false],
    ["single", "6:00 PM", prefilled, null, false],
  ];
  for (const [name, range, rows] of cases) {
    await writeFile(
      folder + "/02-" + name + ".md",
      `# Meeting\n\n- **Date & Time**: [${range}](https://www.timeanddate.com/worldclock/converter.html?iso=20260702T160000&p1=1)\n\n${header}\n${rows}\n`,
    );
  }

  const { meetings } = await getAgendaDetails(config, {
    year: "2026",
    month: "7",
    day: "2",
  });
  assert.equal(meetings.length, cases.length);
  for (const [name, , rows, end, hasSignups] of cases) {
    const path = folder + "/02-" + name + ".md";
    const meeting = meetings.find((meeting) => meeting.path === path);
    assert.ok(meeting, path);
    assert.equal(meeting.start, "2026-07-02T16:00:00.000Z");
    assert.equal(meeting.end, end && `2026-07-02T${end}:00.000Z`);
    assert.equal(meeting.hasSignups, hasSignups);
    assert.deepEqual(
      meeting.attendees.map((a) => a.name),
      rows.split("\n").map((row) => row.split("|")[1].trim()),
    );
  }
});
