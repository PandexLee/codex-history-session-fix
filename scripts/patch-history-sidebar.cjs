const fs = require("fs");
const path = require("path");

/*
 * Purpose: patch the history sidebar refresh code inside an extracted app.asar.
 * Platform: Node.js.
 * Mutates system: only the extracted ASAR directory passed as argv[2].
 * Usage:
 *   node scripts/patch-history-sidebar.cjs <extracted-asar-dir>
 *
 * This script fails closed when the expected minified code shape is not found.
 */

const asarDir = process.argv[2];
if (!asarDir) {
  console.error("usage: node patch-history-sidebar.cjs <extracted-asar-dir>");
  process.exit(2);
}

const assetsDir = path.join(asarDir, "webview", "assets");
if (!fs.existsSync(assetsDir)) {
  console.error(`assets directory not found: ${assetsDir}`);
  process.exit(2);
}

const files = fs
  .readdirSync(assetsDir)
  .filter((name) => /^thread-context-inputs-.*\.js$/.test(name))
  .map((name) => path.join(assetsDir, name));

if (files.length === 0) {
  console.error("thread-context-inputs asset not found");
  process.exit(1);
}

const firstCallBefore =
  "this.listRecentThreads({limit:a,cursor:null,useStateDbOnly:i})";
const firstCallAfter =
  "this.listRecentThreads({limit:a,cursor:null,useStateDbOnly:!1})";
const nextPageBefore =
  "this.listRecentThreads({limit:a-e.length,cursor:n,useStateDbOnly:!0})";
const nextPageAfter =
  "this.listRecentThreads({limit:a-e.length,cursor:n,useStateDbOnly:!1})";

let selected = null;
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  if (
    text.includes("async runRecentConversationRefresh") &&
    (text.includes(firstCallBefore) || text.includes(firstCallAfter)) &&
    (text.includes(nextPageBefore) || text.includes(nextPageAfter))
  ) {
    selected = { file, text };
    break;
  }
}

if (!selected) {
  console.error(
    "history refresh target shape not found in thread-context-inputs asset",
  );
  process.exit(1);
}

const beforeFirst = selected.text.includes(firstCallBefore);
const beforeNext = selected.text.includes(nextPageBefore);
const afterFirst = selected.text.includes(firstCallAfter);
const afterNext = selected.text.includes(nextPageAfter);

if ((beforeFirst || beforeNext) && !(beforeFirst && beforeNext)) {
  console.error("partial unpatched history refresh shape detected");
  process.exit(1);
}

if (!beforeFirst && !beforeNext) {
  if (afterFirst && afterNext) {
    console.log(
      JSON.stringify({
        status: "already-patched",
        file: path.relative(asarDir, selected.file),
      }),
    );
    process.exit(0);
  }
  console.error("history refresh target shape did not match before or after");
  process.exit(1);
}

const patched = selected.text
  .replace(firstCallBefore, firstCallAfter)
  .replace(nextPageBefore, nextPageAfter);

if (
  patched.includes(firstCallBefore) ||
  patched.includes(nextPageBefore) ||
  !patched.includes(firstCallAfter) ||
  !patched.includes(nextPageAfter)
) {
  console.error("history sidebar replacement verification failed");
  process.exit(1);
}

fs.writeFileSync(selected.file, patched, "utf8");
console.log(
  JSON.stringify({
    status: "patched",
    file: path.relative(asarDir, selected.file),
  }),
);
