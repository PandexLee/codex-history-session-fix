# Fix Codex Desktop Missing History Sidebar on Windows

中文：Codex Desktop Windows 历史会话侧栏 / session list / recent conversations 短暂显示后消失的复现、分析和 MSIX 补丁教程。

This repository documents a Windows Codex Desktop issue where the history sidebar briefly appears at startup and then becomes empty. It includes a protocol-level reproduction script, a minimal ASAR patcher, a Windows MSIX patch-and-install wrapper, and verification steps.

> Disclaimer: this is an unofficial community workaround. It modifies and repackages the locally installed Windows MSIX package. Read the scripts before running them, start with `-DryRun`, and use at your own risk.

## Problem

Observed symptom:

- Codex Desktop starts normally.
- The left history sidebar initially shows recent sessions.
- After the app finishes loading, the history/session list becomes empty.
- The underlying history data still exists.

Search phrases this repository is intended to help with:

- Codex Desktop history sidebar missing
- Codex Desktop session list empty
- Codex Desktop recent conversations disappeared
- OpenAI Codex Windows MSIX app.asar patch
- `thread/list limit=500 useStateDbOnly=true`

## Affected Environment

Verified environment:

- Platform: Windows
- Package type: MSIX / AppX package
- Problem version observed: `26.623.19656.0`
- Older package observed to avoid the symptom: `26.602.9276.0`

Other versions may or may not match the same minified frontend shape. The patcher fails closed when the expected code shape is not found.

## Root Cause Summary

Protocol-level reproduction showed that a state-database-only request can return an empty list for a large history query:

```text
thread/list limit=50  useStateDbOnly=true  -> 50
thread/list limit=500 useStateDbOnly=true  -> 0
thread/list limit=500 useStateDbOnly=false -> 100
```

In the affected Desktop build, the expanded sidebar history refresh path can request `limit=500,useStateDbOnly=true`. That empty response then overwrites the list that was initially loaded correctly.

The workaround changes only the sidebar recent-history refresh call in `webview/assets/thread-context-inputs-*.js` so it no longer sends `useStateDbOnly=true` for that path.

## Quick Start

Run every command from the repository root in PowerShell.

First, reproduce the app-server behavior without modifying anything:

```powershell
node .\scripts\repro-thread-list-state-db-bug.cjs
```

Dry-run the Windows MSIX patch process:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\patch-history-sidebar-windows-msix.ps1 -DryRun
```

Patch, install, and launch Codex Desktop:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\patch-history-sidebar-windows-msix.ps1 -Install -Launch -InstallPrerequisites
```

Verify the installed package contains the expected patch:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-installed-history-sidebar-patch.ps1
```

## What The Patch Changes

The patcher searches the extracted ASAR directory for `webview/assets/thread-context-inputs-*.js` and replaces these calls:

```text
this.listRecentThreads({limit:a,cursor:null,useStateDbOnly:i})
this.listRecentThreads({limit:a-e.length,cursor:n,useStateDbOnly:!0})
```

with:

```text
this.listRecentThreads({limit:a,cursor:null,useStateDbOnly:!1})
this.listRecentThreads({limit:a-e.length,cursor:n,useStateDbOnly:!1})
```

It does not edit SQLite history data, provider mappings, or unrelated state-only queries.

## Scripts

| Script | Purpose | Mutates System |
| --- | --- | --- |
| `scripts/repro-thread-list-state-db-bug.cjs` | Starts `codex app-server --stdio` and compares `thread/list` query shapes. | No |
| `scripts/patch-history-sidebar.cjs` | Patches an already extracted `app.asar` directory. | Only the provided extracted ASAR directory |
| `scripts/patch-history-sidebar-windows-msix.ps1` | Copies the installed package, extracts `app.asar`, applies the patch, repacks/signs MSIX, and optionally installs it. | Yes when `-Install` is used |
| `scripts/verify-installed-history-sidebar-patch.ps1` | Checks the installed `app.asar` for patched and old string shapes. | No |

See `scripts/README.md` for prerequisites, outputs, and risk notes.

## Documentation

- `docs/INDEX.md`: AI-friendly repository map.
- `docs/reproduction.md`: protocol-level reproduction steps.
- `docs/patch-design.md`: why this workaround patches the frontend ASAR path.
- `docs/windows-msix-installation.md`: Windows MSIX packaging, signing, and installation notes.
- `docs/troubleshooting.md`: common failures and recovery steps.
- `docs/codex-desktop-history-sidebar-2026-07-07.md`: sanitized incident case study.

## Safety And Reversibility

- The main PowerShell script copies the installed package to a temporary work directory before changing anything.
- `-DryRun` extracts and patches the copied ASAR but does not repack or install a package.
- `-Install` removes and reinstalls the `OpenAI.Codex` MSIX package, attempting to preserve application data where supported.
- `-InstallPrerequisites` may download Microsoft Windows SDK BuildTools from NuGet when `makeappx.exe` or `signtool.exe` is missing.
- Store updates can overwrite the patched package. Re-run the patch after an update if the same symptom returns.

## Known Limits

- This is a workaround for one observed frontend trigger path, not a root fix for the app-server state database query behavior.
- If a later Codex Desktop build renames or rewrites `thread-context-inputs-*.js`, the patcher should fail with a shape mismatch.
- `Add-AppxPackage -AllowUnsigned` behavior depends on Windows policy and may fail on locked-down systems.

## License

MIT. See `LICENSE`.
