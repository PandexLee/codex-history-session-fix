const { spawn } = require("child_process");

/*
 * Purpose: read-only reproduction of Codex app-server thread/list behavior.
 * Platform: Windows-focused, but works anywhere `codex app-server --stdio` works.
 * Mutates system: no.
 * Usage:
 *   node scripts/repro-thread-list-state-db-bug.cjs
 *   node scripts/repro-thread-list-state-db-bug.cjs "C:\\Path\\To\\codex.cmd"
 *
 * Optional environment:
 *   CODEX_CMD               command/path used when no argv[2] is passed
 *   CODEX_HISTORY_PROVIDER  adds one provider-specific state-only case
 */

const codexCmd = process.argv[2] || process.env.CODEX_CMD || "codex";
const provider = process.env.CODEX_HISTORY_PROVIDER;
const child = spawn(`"${codexCmd}" app-server --stdio`, {
  stdio: ["pipe", "pipe", "pipe"],
  windowsHide: true,
  shell: true,
});

let nextId = 1;
let buffer = "";
const pending = new Map();

child.stdout.on("data", (chunk) => {
  buffer += chunk.toString("utf8");
  let idx;
  while ((idx = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, idx).trim();
    buffer = buffer.slice(idx + 1);
    if (!line) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      console.log("NONJSON", line);
      continue;
    }
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  }
});

child.stderr.on("data", (chunk) => process.stderr.write(chunk));

function request(method, params) {
  const id = nextId++;
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`timeout ${method}`));
    }, 15000);
    pending.set(id, (msg) => {
      clearTimeout(timer);
      resolve(msg);
    });
  });
}

(async () => {
  try {
    await request("initialize", {
      clientInfo: { name: "codex-history-sidebar-repro", version: "1.0.0" },
    });

    const cases = [
      ["limit50-state", { limit: 50, useStateDbOnly: true }],
      ["limit500-state", { limit: 500, useStateDbOnly: true }],
      ["limit500-scan", { limit: 500, useStateDbOnly: false }],
    ];

    if (provider) {
      cases.push([
        "provider-state-500",
        { limit: 500, useStateDbOnly: true, modelProviders: [provider] },
      ]);
    }

    for (const [name, params] of cases) {
      const res = await request("thread/list", params);
      if (res.error) {
        console.log("CASE", name, "ERROR", JSON.stringify(res.error));
      } else {
        const data = res.result?.data || [];
        console.log("CASE", name, "count", data.length, "next", Boolean(res.result?.nextCursor));
      }
    }
  } finally {
    child.kill();
  }
})().catch((error) => {
  console.error(error.stack || error);
  child.kill();
  process.exit(1);
});
