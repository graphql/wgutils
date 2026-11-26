import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { mock, test } from "node:test";
import * as github from "../dist/github.js";

process.env.OPENAI_API_KEY = "test";
process.env.OPENAI_MODEL = "test";

const key = "graphql/graphql-spec#123";
const begin = `<!--BEGIN[${key}]-->`;
const end = `<!--END[${key}]-->`;
const done = "<!-- wgutils:correlated-notes v1 -->";
const lookup = mock.fn(async ({ variables }) => {
  assert.deepEqual(variables, {
    owner: "graphql",
    repo: "graphql-spec",
    number: 123,
  });
  return {
    data: {
      repository: {
        item: { __typename: "PullRequest", title: "Proposal", body: "" },
      },
    },
  };
});
mock.module("../dist/github.js", {
  namedExports: { ...github, graphql: lookup, getToken: () => "test" },
});
const { correlateNotes } =
  await import("../dist/agendas/correlate-notes/index.js");

const notes = "- Alice follows up\n  - Bob reviews\n\nAnother paragraph.\n";
const date = "2099-01-01";
const proposal =
  "1. [#123][proposal]\n   - [#123][]\n\n[proposal]: https://github.com/graphql/graphql-spec/pull/123\n[#123]: https://github.com/graphql/graphql-spec/pull/123";

async function fixture(t, agenda = proposal) {
  const dir = await mkdtemp(join(tmpdir(), "wgutils-test-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(join(dir, "agendas"));
  await mkdir(join(dir, "notes/2099"), { recursive: true });
  const file = join(dir, "notes/2099/summary-" + date + ".md");
  await writeFile(file, notes);
  await writeFile(
    join(dir, "agendas/meeting.md"),
    `# Meeting\n\nhttps://www.timeanddate.com/worldclock/converter.html?iso=20990101T100000&x=1\n\n## Agenda\n\n${agenda}\n`,
  );
  lookup.mock.resetCalls();
  t.mock.method(console, "warn", () => {});
  return {
    file,
    run: () =>
      correlateNotes(
        {
          repoUrl: "https://github.com/graphql/graphql-wg",
          repoSubpath: relative(process.cwd(), dir),
        },
        date,
      ),
  };
}

function responses(t, outputs) {
  const requests = [];
  t.mock.method(globalThis, "fetch", async (_, { body }) => {
    const { input } = JSON.parse(body);
    requests.push(JSON.parse(input));
    assert.ok(requests.length <= outputs.length, "unexpected model request");
    return Response.json({
      status: "completed",
      output: [
        {
          type: "message",
          content: [
            { type: "output_text", text: outputs[requests.length - 1] },
          ],
        },
      ],
    });
  });
  return requests;
}

test("reference links resolve in both the lookup and topic inputs", async (t) => {
  const { run, file } = await fixture(t);
  const requests = responses(t, [`\n${begin}\n\n${notes}\n${end}\n`]);
  await run();
  assert.equal(requests.length, 1);
  assert.equal(lookup.mock.callCount(), 1);
  const [topic] = requests[0].agenda.topics;
  assert.deepEqual(topic.references, [key]);
  assert.deepEqual(topic.subitems[0].references, [key]);
  assert.ok((await readFile(file, "utf8")).endsWith(done + "\n"));
});

test("sibling lists retain their order and references at each topic depth", async (t) => {
  const { run } = await fixture(
    t,
    [
      "1. Updates",
      "   - Background",
      "   1. [Proposal](https://github.com/graphql/graphql-spec/pull/123)",
      "      - Status",
      "      1. [Implementation discussion](https://github.com/graphql/graphql-spec/pull/123)",
    ].join("\n"),
  );
  const requests = responses(t, [notes]);
  await run();
  const [topic] = requests[0].agenda.topics;
  assert.deepEqual(topic.subitems, [
    { title: "Background", references: [] },
    {
      title: "Proposal",
      references: [key],
      subitems: [
        { title: "Status", references: [] },
        { title: "Implementation discussion", references: [key] },
      ],
    },
  ]);
});

test("an external-only agenda is marked locally without credentials", async (t) => {
  const { run, file } = await fixture(
    t,
    "1. [#123][external]\n\n[external]: https://github.com/other/project/issues/123",
  );
  const requests = responses(t, []);
  const saved = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    await run();
    await run();
  } finally {
    process.env.OPENAI_API_KEY = saved;
  }
  assert.equal(requests.length, 0);
  assert.equal(lookup.mock.callCount(), 0);
  assert.equal(await readFile(file, "utf8"), notes + "\n" + done + "\n");
});

for (const [label, first] of [
  ["flattened list", notes.replace("\n  -", " -")],
  ["lost indentation", notes.replace("  -", "-")],
  ["removed paragraph break", notes.replace("\n\n", "\n")],
  ["blank first response", " \n "],
]) {
  test(label + " triggers a retry", async (t) => {
    const { run } = await fixture(t);
    const requests = responses(t, [first, notes]);
    await run();
    assert.match(requests[1].previousFailure, /Markdown structure|blank/);
  });
}
test("blank retry leaves the original file intact", async (t) => {
  const { run, file } = await fixture(t);
  responses(t, [" ", begin + " \n" + end]);
  await assert.rejects(run(), /blank/);
  assert.equal(await readFile(file, "utf8"), notes);
});

test("emphasized GitHub URLs reach both lookup and topic inputs", async (t) => {
  const { run } = await fixture(
    t,
    "1. **https://github.com/graphql/graphql-spec/pull/123**",
  );
  const requests = responses(t, [notes]);
  await run();
  assert.equal(lookup.mock.callCount(), 1);
  assert.deepEqual(requests[0].agenda.topics[0].references, [key]);
});

test("unused definitions do not trigger GitHub or model requests", async (t) => {
  const { run, file } = await fixture(
    t,
    "1. Updates\n\n[old-proposal]: https://github.com/graphql/graphql-spec/pull/123",
  );
  responses(t, []);
  await run();
  assert.equal(lookup.mock.callCount(), 0);
  assert.equal(await readFile(file, "utf8"), notes + "\n" + done + "\n");
});

for (const [name, line] of [
  ["list item", "- Follow up"],
  ["heading", "## Follow up"],
]) {
  test("misplaced marker before a " + name + " triggers a retry", async (t) => {
    const { run, file } = await fixture(t);
    await writeFile(file, line);
    const valid = line.replace("Follow", begin + "Follow" + end);
    const requests = responses(t, [begin + line + end, valid]);
    await run();
    assert.match(requests[1].previousFailure, /marker placement/);
    assert.equal(await readFile(file, "utf8"), valid + "\n\n" + done + "\n");
  });
}

test("misplaced markers on both attempts preserve the original", async (t) => {
  const { run, file } = await fixture(t);
  const invalid = begin + notes + end;
  responses(t, [invalid, invalid]);
  await assert.rejects(run(), /marker placement/);
  assert.equal(await readFile(file, "utf8"), notes);
});

test("markers around a tight list item's quoted text preserve the list", async (t) => {
  const { run, file } = await fixture(t);
  const action = 'Review the "matches" directive';
  await writeFile(file, "- " + action);
  const annotated = "- " + begin + action + end;
  const requests = responses(t, [annotated]);
  await run();
  assert.equal(requests.length, 1);
  assert.equal(await readFile(file, "utf8"), annotated + "\n\n" + done + "\n");
});

test("a marker that hides emphasis inside a tight list item triggers a retry", async (t) => {
  const { run, file } = await fixture(t);
  const action = "- Check **this**";
  await writeFile(file, action);
  const requests = responses(t, [
    "- " + begin + "Check **this**" + end,
    action,
  ]);
  await run();
  assert.match(requests[1].previousFailure, /marker placement/);
});
