# Reproducing The Thread List Query Behavior

This page explains how to reproduce the local `thread/list` behavior without modifying the Codex Desktop installation.

## Prerequisites

- Windows with Codex installed.
- Node.js available in `PATH`.
- The `codex` command available in `PATH`, or a custom command path passed to the script.

## Run

From the repository root:

```powershell
node .\scripts\repro-thread-list-state-db-bug.cjs
```

If `codex` is not in `PATH`, pass the command explicitly:

```powershell
node .\scripts\repro-thread-list-state-db-bug.cjs "C:\Path\To\codex.cmd"
```

To also test a provider-specific query, set `CODEX_HISTORY_PROVIDER`:

```powershell
$env:CODEX_HISTORY_PROVIDER = "provider-name"
node .\scripts\repro-thread-list-state-db-bug.cjs
Remove-Item Env:\CODEX_HISTORY_PROVIDER
```

## Expected Signal

The exact counts depend on local history size. The suspicious pattern is:

```text
CASE limit50-state count <non-zero> next <true-or-false>
CASE limit500-state count 0 next false
CASE limit500-scan count <non-zero> next <true-or-false>
```

This means history exists, but the large state-database-only query returns empty.

## Why This Matters

In the observed affected build, the expanded history sidebar can use the large state-only query shape. When that returns empty, the frontend can overwrite the initially populated sidebar list with an empty result.

## Privacy Notes

The reproduction script prints only case names, counts, and whether a next cursor exists. It does not print thread titles, thread IDs, project paths, prompts, or message content.
