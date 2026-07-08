# Codex Desktop History Sidebar Incident Case Study

Date: 2026-07-07

This is a sanitized incident analysis for a Windows Codex Desktop issue where the history sidebar briefly appeared at startup and then became empty.

## Symptom

- Codex Desktop started normally.
- The left sidebar initially showed recent history sessions.
- After the app completed its refresh sequence, the history list disappeared or became empty.
- Installing an older MSIX package such as `codex-26-602-9276-0.msix` avoided the symptom in this environment.
- Provider/history synchronization had already been attempted, but the symptom remained.

## Key Evidence

Running `codex app-server --stdio` directly and requesting `thread/list` showed the issue was tied to a specific parameter shape:

```text
CASE limit50-state         count 50  next true
CASE limit500-state        count 0   next false
CASE limit500-scan         count 100 next true
CASE provider-state-500    count 0   next false
```

The exact counts depend on local history size. The important signal is that the history data is still available when `useStateDbOnly=false`, while `limit=500,useStateDbOnly=true` can return an empty list.

## Version Comparison

Observed affected version:

```text
OpenAI.Codex_26.623.19656.0_x64__<publisher-id>
```

Older observed working package:

```text
codex-26-602-9276-0.msix
```

The affected version included an expanded sidebar history refresh path in `thread-context-inputs-*.js`:

```js
let r=this.params.getHistoryLimit?.()??50,
    i=(t===`expanded`||n)&&r>50,
    a=i?r:50,
    s=await this.listRecentThreads({limit:a,cursor:null,useStateDbOnly:i});
```

When the sidebar is expanded and `historyLimit > 50`, this path can request `limit=500,useStateDbOnly=true`. In the observed environment, that request returned an empty result and the UI replaced the previously visible list with it.

## Why Not Patch The History Database

The workaround does not edit SQLite history data or provider metadata because:

- Provider synchronization did not resolve the symptom.
- The same history data was returned through `useStateDbOnly=false`.
- The immediate UI failure was caused by a later frontend refresh request.

## Workaround Strategy

Use a minimal ASAR patch:

- Keep the newer UI and expanded history behavior.
- Change only the sidebar recent history refresh call.
- Avoid sending `useStateDbOnly=true` from that path.
- Leave other state-only queries alone.

Patch target:

```text
webview/assets/thread-context-inputs-*.js
```

Replacement:

```text
listRecentThreads({limit:a,cursor:null,useStateDbOnly:i})
  -> listRecentThreads({limit:a,cursor:null,useStateDbOnly:!1})

listRecentThreads({limit:a-e.length,cursor:n,useStateDbOnly:!0})
  -> listRecentThreads({limit:a-e.length,cursor:n,useStateDbOnly:!1})
```

## Installation Notes

Unsigned or self-signed MSIX installation can fail depending on local Windows policy. One observed failure mode was a root certificate trust error. In the environment used for this case study, installing the repacked package with:

```powershell
Add-AppxPackage -Path <patched.msix> -AllowUnsigned
```

was the working route.

This repository's PowerShell wrapper supports that installation path when `-Install` is passed. Review `docs/windows-msix-installation.md` before using it.

## Final Verification Pattern

Static installed `app.asar` verification should show:

```text
PatchedFirstCallPresent      True
PatchedPaginationCallPresent True
OldFirstCallPresent          False
OldPaginationCallPresent     False
```

UI verification should confirm:

- Codex Desktop starts from the installed package.
- The history sidebar remains populated after the startup refresh completes.
- Both project and non-project history entries remain visible.

Avoid publishing real local session titles, account identifiers, or full machine paths in verification notes.

## Lessons

1. Do not assume every "history missing" issue is caused by provider bucket mismatch.
2. Protocol-level reproduction with `codex app-server --stdio` helps separate missing data from a bad query path.
3. Compare old and new frontend loading paths when an older MSIX avoids the symptom.
4. Do not edit files in `WindowsApps` in place; copy, unpack, patch, repack, and reinstall.
5. Static string verification is useful but not enough. Confirm the live UI behavior after install.

## Risks

- Microsoft Store updates can replace the patched package.
- The underlying `limit=500,useStateDbOnly=true` app-server behavior may still exist.
- Future Codex Desktop builds may change the minified frontend shape, causing the patcher to fail until updated.
