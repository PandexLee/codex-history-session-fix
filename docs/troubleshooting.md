# Troubleshooting

## `codex` command is not found

Pass the command path explicitly to the reproduction script:

```powershell
node .\scripts\repro-thread-list-state-db-bug.cjs "C:\Path\To\codex.cmd"
```

## `makeappx.exe` or `signtool.exe` is missing

Install the Windows SDK, or let the wrapper download the SDK BuildTools NuGet package:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\patch-history-sidebar-windows-msix.ps1 -DryRun -InstallPrerequisites
```

## Patcher reports target shape not found

The installed Codex Desktop version probably changed the minified frontend asset shape.

Recommended next steps:

1. Keep the script output.
2. Inspect the extracted ASAR directory with `-KeepWorkDir`.
3. Search `webview/assets` for `runRecentConversationRefresh` and `listRecentThreads`.
4. Update the patcher only after confirming the new equivalent call path.

## Install fails with certificate or trust errors

Windows AppX/MSIX trust behavior depends on local policy. This repository's wrapper uses:

```powershell
Add-AppxPackage -Path <patched.msix> -AllowUnsigned
```

when `-Install` is passed. Locked-down devices may still reject the package. In that case, use an official package or resolve policy requirements locally.

## Verification shows old strings still present

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-installed-history-sidebar-patch.ps1
```

Expected patch markers:

```text
PatchedFirstCallPresent      True
PatchedPaginationCallPresent True
OldFirstCallPresent          False
OldPaginationCallPresent     False
```

If old strings remain:

- The patched package may not be installed.
- A Store update may have overwritten it.
- The patcher may have run against a copied package but installation did not complete.

## Sidebar is still empty after static verification passes

This workaround only addresses one observed frontend trigger path. If static verification passes but the UI is still empty:

1. Restart Codex Desktop.
2. Wait for startup refresh to complete.
3. Re-run the protocol reproduction script.
4. Check whether a new frontend path or a different data issue is involved.

Do not publish thread titles, project paths, prompts, or local database content when sharing diagnostics.
