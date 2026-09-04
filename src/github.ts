import * as https from "node:https";
import { execFileSync } from "node:child_process";

export function getToken() {
  const env = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
  if (env) return env;
  try {
    return execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

export function loginFromNoreply(email: string) {
  const m = email
    .toLowerCase()
    .match(/^(?:\d+\+)?([a-z0-9-]+)@users\.noreply\.github\.com$/i);
  return m ? m[1] : "";
}

export function candidateHandlesFromEmailAndName(email: string, name: string) {
  const cands = new Set<string>();
  const local = email.split("@")[0];
  const bare = local.replace(/[._]/g, "");
  const bareNoDigits = bare.replace(/\d+$/, "");
  cands.add(bare);
  cands.add(bareNoDigits);
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0],
      last = parts[parts.length - 1];
    cands.add(`${first}${last}`);
    cands.add(`${first}-${last}`);
    cands.add(`${first}_${last}`);
    cands.add(`${first[0]}${last}`);
    if (last.length >= 3) cands.add(`${first}${last.slice(0, 3)}`);
  }
  const nameParts = name.split(/\s+/).filter(Boolean);
  if (nameParts.length >= 2) {
    const f = nameParts[0].replace(/[^A-Za-z0-9-]/g, "");
    const l = nameParts[nameParts.length - 1].replace(/[^A-Za-z0-9-]/g, "");
    if (f && l) {
      cands.add(`${f}${l}`);
      cands.add(`${f}-${l}`);
      cands.add(`${f[0]}${l}`);
    }
  }
  const q = name.match(/'([^']{1,39})'/);
  if (q) cands.add(q[1]);
  const p = name.match(/\(([^) ]{1,39})\)/);
  if (p) cands.add(p[1]);
  return Array.from(cands).filter((s) => /^[A-Za-z0-9-]{2,39}$/.test(s));
}

export async function graphql(request: {
  query: string;
  variables?: Record<string, unknown>;
  token: string;
  debug?: boolean;
}): Promise<{
  data?: any;
  errors?: any[];
}> {
  const { query, variables, token, debug: DEBUG = false } = request;
  const body = JSON.stringify(variables ? { query, variables } : { query });
  const options = {
    hostname: "api.github.com",
    path: "/graphql",
    method: "POST",
    headers: {
      "User-Agent": "contributors-table-graphql",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    },
  };
  return await new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          const json = JSON.parse(data || "{}");
          if (json.errors && DEBUG)
            console.error(
              "GraphQL errors:",
              JSON.stringify(json.errors, null, 2),
            );
          resolve(json);
        } catch {
          resolve({});
        }
      });
    });
    req.on("error", () => resolve({}));
    req.write(body);
    req.end();
  });
}

// Batch fetch commit author + message for SHAs; count primary-author occurrences per login
export async function fetchCommitsByOidBatch(props: {
  token: string;
  owner: string;
  name: string;
  oids: string[];
}) {
  const { token, owner, name, oids } = props;
  const out = new Map(); // oid -> { login | "", name, email, message }
  const authorCount = new Map(); // login -> # of primary authored commits in range
  const chunkSize = 40;
  for (let i = 0; i < oids.length; i += chunkSize) {
    const chunk = oids.slice(i, i + chunkSize);
    const fields = chunk
      .map(
        (oid, idx) => `
      c${idx}: object(oid: "${oid}") {
        ... on Commit {
          message
          author { user { login } name email }
        }
      }`,
      )
      .join("\n");
    const query = `query($owner:String!, $name:String!) { repository(owner:$owner, name:$name) { ${fields} } }`;
    const res = await graphql({ token, query, variables: { owner, name } });
    const repo = res?.data?.repository || {};
    for (let idx = 0; idx < chunk.length; idx++) {
      const node = repo[`c${idx}`];
      if (!node) continue;
      const info = {
        login: node?.author?.user?.login || "",
        name: node?.author?.name || "",
        email: node?.author?.email || "",
        message: node?.message || "",
      };
      out.set(chunk[idx], info);
      const L = info.login;
      if (L) authorCount.set(L, (authorCount.get(L) || 0) + 1);
    }
  }
  return { commitInfo: out, authorCount };
}
