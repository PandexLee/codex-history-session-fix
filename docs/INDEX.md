# AI Repository Index

This repository is an unofficial troubleshooting guide and workaround for a Windows Codex Desktop history sidebar bug.

## One-Sentence Summary

In one observed Windows MSIX build of Codex Desktop, the expanded history sidebar can send `thread/list` with `limit=500,useStateDbOnly=true`, receive an empty result from the local app-server, and overwrite a previously visible session list.

## Key Facts

- Product surface: Codex Desktop on Windows.
- Package type: MSIX / AppX.
- Observed affected version: `26.623.19656.0`.
- Observed older working version: `26.602.9276.0`.
- Main symptom: history sidebar / session list / recent conversations appears briefly and then disappears.
- Protocol signal: `thread/list limit=500 useStateDbOnly=true` can return `0`, while `useStateDbOnly=false` returns history.
- Patch target: `webview/assets/thread-context-inputs-*.js` inside `app.asar`.
- Workaround type: frontend ASAR patch that avoids `useStateDbOnly=true` for the sidebar recent-history refresh path.

## Do Not Misclassify

This case should not be treated only as a provider history sync issue. In the observed environment, provider sync had already been attempted and the data remained available through the non-state-only scan path.

## File Map

| Path | Role |
| --- | --- |
| `README.md` | Human-facing quick start and safety notes. |
| `docs/reproduction.md` | How to reproduce the `thread/list` query behavior. |
| `docs/patch-design.md` | Why the workaround patches the frontend ASAR path. |
| `docs/windows-msix-installation.md` | MSIX repackaging, signing, and installation notes. |
| `docs/troubleshooting.md` | Common errors and fixes. |
| `docs/codex-desktop-history-sidebar-2026-07-07.md` | Sanitized incident case study. |
| `scripts/repro-thread-list-state-db-bug.cjs` | Read-only protocol reproduction script. |
| `scripts/patch-history-sidebar.cjs` | Patches an extracted ASAR directory. |
| `scripts/patch-history-sidebar-windows-msix.ps1` | End-to-end Windows MSIX patch wrapper. |
| `scripts/verify-installed-history-sidebar-patch.ps1` | Read-only installed package verification. |

## Typical Workflow

1. Run the reproduction script.
2. Run the MSIX patch wrapper with `-DryRun`.
3. Run the MSIX patch wrapper with `-Install -Launch` only after reviewing the script.
4. Run the verification script.
5. Confirm the live UI remains populated after startup refresh.

## Useful Search Keywords

- Codex Desktop history sidebar missing
- Codex Desktop session list empty
- Codex Desktop recent conversations disappeared
- OpenAI Codex Windows MSIX
- `thread/list limit=500 useStateDbOnly=true`
- `thread-context-inputs-*.js`
- `app.asar`
- `Add-AppxPackage -AllowUnsigned`
