# Windows MSIX Installation Notes

The end-to-end wrapper script is:

```text
scripts/patch-history-sidebar-windows-msix.ps1
```

It is a high-impact script. Use `-DryRun` first.

## What The Script Does

With `-DryRun`, it:

1. Locates the installed `OpenAI.Codex` package.
2. Copies the package layout into a temporary work directory.
3. Extracts `app.asar`.
4. Applies `scripts/patch-history-sidebar.cjs`.
5. Runs `node --check` against the patched asset.
6. Deletes the temporary work directory unless `-KeepWorkDir` is used.

Without `-DryRun`, it also:

1. Re-packs `app.asar`.
2. Updates Electron ASAR integrity metadata in `Codex.exe` when present.
3. Re-packs the copied package as an MSIX.
4. Creates or reuses a local code-signing certificate.
5. Signs the MSIX.

With `-Install`, it also:

1. Stops Codex Desktop processes from the installed package.
2. Removes the existing `OpenAI.Codex` package, preserving application data where supported.
3. Installs the patched package with `Add-AppxPackage -AllowUnsigned`.
4. Optionally launches Codex Desktop when `-Launch` is passed.

## Prerequisites

- PowerShell.
- Node.js and `npx`.
- Windows SDK tools: `makeappx.exe` and `signtool.exe`.
- Optional: `-InstallPrerequisites` downloads Microsoft Windows SDK BuildTools from NuGet if SDK tools are missing.

## Command Examples

Dry run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\patch-history-sidebar-windows-msix.ps1 -DryRun
```

Install after review:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\patch-history-sidebar-windows-msix.ps1 -Install -Launch -InstallPrerequisites
```

Keep the temporary work directory for inspection:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\patch-history-sidebar-windows-msix.ps1 -DryRun -KeepWorkDir
```

## Security Notes

- Review the PowerShell script before running it.
- `-InstallPrerequisites` downloads SDK tooling from `https://api.nuget.org/`.
- `-Install` changes the installed Codex Desktop package.
- The verification script may print local package paths. Do not paste full output publicly if those paths reveal sensitive local details.

## Reverting

Common revert paths:

- Install a newer official Codex Desktop update from the Microsoft Store.
- Reinstall the official MSIX package you trust.
- Remove and reinstall Codex Desktop from the official source.

Store updates can overwrite the patch, which is expected.
