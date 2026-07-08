# Scripts

Run scripts from the repository root unless noted otherwise.

## Summary

| Script | Purpose | Reads | Writes | Risk |
| --- | --- | --- | --- | --- |
| `repro-thread-list-state-db-bug.cjs` | Starts `codex app-server --stdio` and compares `thread/list` query shapes. | Local Codex app-server responses. | Nothing. | Low |
| `patch-history-sidebar.cjs` | Patches `thread-context-inputs-*.js` in an extracted ASAR directory. | The provided extracted ASAR directory. | The target minified JS asset in that directory. | Medium |
| `patch-history-sidebar-windows-msix.ps1` | End-to-end Windows MSIX copy, ASAR patch, repack, signing, and optional installation. | Installed `OpenAI.Codex` package. | Temp work directory; patched MSIX; installed package when `-Install` is used. | High |
| `verify-installed-history-sidebar-patch.ps1` | Checks the installed package for expected patched/old strings. | Installed `app.asar`. | Nothing. | Low |

## `repro-thread-list-state-db-bug.cjs`

Read-only reproduction:

```powershell
node .\scripts\repro-thread-list-state-db-bug.cjs
```

Custom Codex command:

```powershell
node .\scripts\repro-thread-list-state-db-bug.cjs "C:\Path\To\codex.cmd"
```

Provider-specific optional case:

```powershell
$env:CODEX_HISTORY_PROVIDER = "provider-name"
node .\scripts\repro-thread-list-state-db-bug.cjs
Remove-Item Env:\CODEX_HISTORY_PROVIDER
```

The script prints counts only. It does not print thread titles, IDs, prompts, or paths.

## `patch-history-sidebar.cjs`

Patch an already extracted ASAR directory:

```powershell
node .\scripts\patch-history-sidebar.cjs "C:\Path\To\extracted-app-asar"
```

This script fails closed if the expected minified code shape is absent.

## `patch-history-sidebar-windows-msix.ps1`

Dry run first:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\patch-history-sidebar-windows-msix.ps1 -DryRun
```

Install after reviewing the script:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\patch-history-sidebar-windows-msix.ps1 -Install -Launch -InstallPrerequisites
```

Important behavior:

- `-DryRun` does not repack or install the package.
- `-InstallPrerequisites` may download Windows SDK BuildTools from NuGet.
- `-Install` removes and reinstalls the `OpenAI.Codex` package.
- `-Launch` starts Codex Desktop after successful installation.
- `-KeepWorkDir` keeps temporary extracted files for inspection.

## `verify-installed-history-sidebar-patch.ps1`

Verify static patch markers in the installed package:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-installed-history-sidebar-patch.ps1
```

Expected markers:

```text
PatchedFirstCallPresent      True
PatchedPaginationCallPresent True
OldFirstCallPresent          False
OldPaginationCallPresent     False
```

The output may contain local package paths. Sanitize it before sharing publicly.
