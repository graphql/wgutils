import { Config } from "../../configSchema.js";
import { revList, parseCoAuthorLines } from "../../git.js";
import {
  loginFromNoreply,
  getToken,
  fetchCommitsByOidBatch,
  graphql,
  candidateHandlesFromEmailAndName,
} from "../../github.js";
import { normalizeName, pickBetterName } from "../../names.js";
import { die, sleep, toLower, cmp, repoOwnerAndName } from "../../utils.js";

function sanitizeDisplayName(raw: string, fallback: string) {
  const s = (raw || "").trim();
  if (!s) return fallback;
  if (/moved\s+to\s+@/i.test(s)) return fallback;
  if (/@/.test(s)) return fallback;
  if (/^\s*[-–—]+\s*$/.test(s)) return fallback;
  return s;
}

export async function generateContributorList(options: {
  config: Config;
  from: string;
  to: string;
  path: string;
  debug?: boolean;
}) {
  const { from, to, path, debug: DEBUG = false, config } = options;
  if (!config.spec) {
    throw new Error("Please set the 'spec: {...}' entry in wg.config.ts");
  }
  // ---------- flags / utils
  const logd = (...xs: any[]) => {
    if (DEBUG) console.error(...xs);
  };

  const range = `${from}..${to}`;
  const paths = [path];

  // ---------- GraphQL
  const [OWNER, NAME] = repoOwnerAndName(config.repoUrl);
  const TOKEN = getToken();
  if (!TOKEN)
    console.error(
      "Warning: no GITHUB_TOKEN/GH_TOKEN (or gh auth token). Resolution will be limited.",
    );

  // GraphQL user search helpers (users only)
  async function searchUsersByNameExact(name: string) {
    if (!TOKEN) return "";
    const queryStr = `"${name.replace(/"/g, '\\"')}" in:name type:user`;
    const query = `query($q:String!){ search(type: USER, query: $q, first: 25) { nodes { ... on User { login name } } } }`;
    const r = await graphql({
      token: TOKEN,
      query,
      variables: { q: queryStr },
    });
    const nodes = r?.data?.search?.nodes ?? [];
    const target = normalizeName(name);
    for (const it of nodes) {
      if (!it?.login) continue;
      if (normalizeName(it.name || "") === target) return it.login;
    }
    return "";
  }
  async function searchUsersByLoginToken(loginToken: string) {
    if (!TOKEN) return "";
    const query = `query($q:String!){ search(type: USER, query: $q, first: 5) { nodes { ... on User { login name } } } }`;
    const r = await graphql({
      token: TOKEN,
      query,
      variables: { q: `${loginToken} in:login type:user` },
    });
    const items = r?.data?.search?.nodes ?? [];
    if (items.length === 1) return items[0]?.login || "";
    return "";
  }
  async function fetchProfileNames(logins: string[]) {
    const out = new Map();
    const chunkSize = 40;
    for (let i = 0; i < logins.length; i += chunkSize) {
      const chunk = logins.slice(i, i + chunkSize);
      const fields = chunk
        .map((login, idx) => `u${idx}: user(login: "${login}") { login name }`)
        .join("\n");
      const query = `query { ${fields} }`;
      const r = await graphql({ token: TOKEN, query });
      const data = r?.data || {};
      for (let idx = 0; idx < chunk.length; idx++) {
        const u = data[`u${idx}`];
        out.set(chunk[idx], (u?.name || "").trim());
      }
    }
    return out;
  }

  const shas = revList(range, paths);
  if (!shas.length) die("No commits in the specified range/path.");

  // 1) Commit info + primary author counts
  const { commitInfo, authorCount } = await fetchCommitsByOidBatch({
    token: TOKEN,
    owner: OWNER,
    name: NAME,
    oids: shas,
  });

  // 2) Collect authors and co-authors
  const loginBestName = new Map<string, string>(); // login -> name hint
  const pool: Array<{ name: string; email: string }> = []; // [{ name, email }] to resolve (co-authors + primaries with missing login)

  for (const sha of shas) {
    const info = commitInfo.get(sha);
    if (!info) continue;
    const { login, name, email, message } = info;

    if (login) {
      loginBestName.set(
        login,
        pickBetterName(loginBestName.get(login) || "", name),
      );
    } else {
      const guess = loginFromNoreply(email);
      if (guess)
        loginBestName.set(
          guess,
          pickBetterName(loginBestName.get(guess) || "", name),
        );
      else pool.push({ name, email });
    }
    for (const ca of parseCoAuthorLines(message)) pool.push(ca);
  }

  // 3) Resolve pool (GraphQL users search only)
  const emailToLogin = new Map(); // emailLower -> login
  const concurrency = 8;
  let idx = 0;

  async function worker() {
    while (idx < pool.length) {
      const i = idx++;
      const { name, email } = pool[i];
      const ekey = toLower(email);
      if (emailToLogin.has(ekey)) continue;

      let login = loginFromNoreply(email);
      if (!login) login = await searchUsersByNameExact(name);
      if (!login) {
        const cands = candidateHandlesFromEmailAndName(email, name);
        for (const cand of cands) {
          const solo = await searchUsersByLoginToken(cand);
          if (solo) {
            login = solo;
            break;
          }
        }
      }
      if (!login && DEBUG) logd(`Unresolved: "${name}" <${email}>`);
      emailToLogin.set(ekey, login || "");
      if (login)
        loginBestName.set(
          login,
          pickBetterName(loginBestName.get(login) || "", name),
        );

      if (i % 10 === 0) await sleep(60);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));

  // 4) Build candidate rows (resolved only), fetch profile names
  const resolvedLogins = Array.from(loginBestName.keys());
  const profileNames = await fetchProfileNames(resolvedLogins);

  const candidates = resolvedLogins.map((login) => {
    const prof = (profileNames.get(login) || "").trim();
    const hint = (loginBestName.get(login) || "").trim();
    const display = sanitizeDisplayName(prof || hint || login, prof || login);
    return { login, display, authorCommits: authorCount.get(login) || 0 };
  });

  // 5) Collapse duplicate people with the same display name
  type Candidate = (typeof candidates)[number];
  const byDisplay = new Map<string, Candidate>(); // normName -> best candidate
  const score = (x: Candidate) =>
    (x.authorCommits > 0 ? 2 : 0) +
    (x.display.toLowerCase() !== x.login.toLowerCase() ? 1 : 0);
  for (const c of candidates) {
    const key = normalizeName(c.display);
    if (!byDisplay.has(key)) {
      byDisplay.set(key, c);
      continue;
    }
    const cur = byDisplay.get(key)!;
    if (
      score(c) > score(cur) ||
      (score(c) === score(cur) &&
        c.login.toLowerCase() < cur.login.toLowerCase())
    ) {
      if (DEBUG)
        logd(
          `Collapsed duplicate "${c.display}": keeping ${c.login} over ${cur.login}`,
        );
      byDisplay.set(key, c);
    }
  }
  const resolvedRows = Array.from(byDisplay.values())
    .filter(
      (v, i, arr) =>
        arr.findIndex(
          (x) => x.login.toLowerCase() === v.login.toLowerCase(),
        ) === i,
    )
    .map(({ display, login }) => ({
      name: display,
      gh: `[@${login}](https://github.com/${login})`,
      login,
    }));

  // 6) Unmatched → show email (dedupe by name+email)
  const unmatched = [];
  const seenUnk = new Set();
  for (const { name, email } of pool) {
    const login = emailToLogin.get(toLower(email));
    if (login) continue;
    const nm = sanitizeDisplayName(name || "(Unknown)", name || "(Unknown)");
    const key = normalizeName(nm) + "|" + email.toLowerCase();
    if (seenUnk.has(key)) continue;
    seenUnk.add(key);
    unmatched.push({ name: nm, gh: email, login: "" });
  }

  // 7) Merge, sort, output
  const allRows = [...resolvedRows, ...unmatched];
  allRows.sort((a, b) => cmp(a.name, b.name));

  const output: string[] = [];
  output.push("| Author | Github |");
  output.push("| ------ | ------ |");
  for (const r of allRows) {
    output.push(`| ${r.name} | ${r.gh}`);
  }
  return output.join("\n") + "\n";
}
