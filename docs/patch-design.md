# Patch Design

This workaround is intentionally narrow. It avoids one frontend query path that can trigger an empty result, while leaving history data and unrelated app-server behavior untouched.

## Observed Failure Path

The affected frontend shape contains logic equivalent to:

```js
let r=this.params.getHistoryLimit?.()??50,
    i=(t===`expanded`||n)&&r>50,
    a=i?r:50,
    s=await this.listRecentThreads({limit:a,cursor:null,useStateDbOnly:i});
```

When the sidebar is expanded and the history limit is greater than `50`, the first page can be requested with:

```text
limit=500,useStateDbOnly=true
```

In the observed environment, that query returned an empty list even though the non-state-only query returned history.

## Patch Scope

The patcher changes only these minified calls in `webview/assets/thread-context-inputs-*.js`:

```text
this.listRecentThreads({limit:a,cursor:null,useStateDbOnly:i})
this.listRecentThreads({limit:a-e.length,cursor:n,useStateDbOnly:!0})
```

to:

```text
this.listRecentThreads({limit:a,cursor:null,useStateDbOnly:!1})
this.listRecentThreads({limit:a-e.length,cursor:n,useStateDbOnly:!1})
```

## Why Not Modify SQLite Or Provider Metadata

The case study showed:

- The history rows still existed.
- The non-state-only app-server path returned history.
- Provider synchronization did not resolve the symptom.

Changing the database would not prevent the affected frontend refresh path from sending the query shape that returned empty.

## Why Patch ASAR

Codex Desktop's webview assets are packaged inside `app.asar`. The practical workaround is:

1. Copy the installed MSIX package layout to a temporary work directory.
2. Extract `app.asar`.
3. Patch the target minified asset.
4. Repack `app.asar`.
5. Update Electron ASAR integrity metadata in `Codex.exe` when present.
6. Repack, sign, and install a patched MSIX.

## Fail-Closed Behavior

`scripts/patch-history-sidebar.cjs` verifies the target code shape before and after replacement. It exits non-zero when:

- `webview/assets` is missing.
- No `thread-context-inputs-*.js` asset exists.
- The expected before/after shape cannot be found.
- Only part of the expected unpatched shape is present.
- Replacement verification fails.

This is intentional. A later Codex Desktop version may need a new patch target.
