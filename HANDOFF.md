# Handoff — vscode-acp

**Branch**: `main` → `origin/main` (5 ahead)
**Last commit**: `723523a fix: webview usage bar layout — flex-wrap + margin for second-row display`

## Current State

| Feature | Status | Commit |
|---|---|---|
| Status bar usage (`45K/200K`) | ✅ Verified in VS Code | `1fa4b79` |
| Webview progress bar | ✅ Fixed layout, installed | `8cb501e` + `723523a` |

## Architecture (usage feature)

```
Agent → session/update { sessionUpdate: "usage_update", used, size }
  → AcpClientImpl.sessionUpdate()
    → SessionUpdateHandler.handleUpdate()
      → ChatWebviewProvider.handleSessionUpdate()
        → SessionManager.applyUsage()         ← stores session.usage
        → postMessage({ type: 'sessionUpdate' }) → webview handleUpdate() → updateUsageBar()
      → SessionManager.emit('session-usage-changed') → StatusBarManager
```

## File Map (relevant to recent changes)

| File | Lines | Role |
|---|---|---|
| `src/core/SessionManager.ts` | ~1020 | `applyUsage()`, `pendingUsages` buffer, `usage` on SessionInfo |
| `src/ui/ChatWebviewProvider.ts` | ~2665 | HTML banner (L1188), CSS themes (L427 + L812), webview JS (L1284+), message switch (L2231) |
| `src/ui/StatusBarManager.ts` | ~60 | `formatTokens()`, status bar text with usage suffix |
| `src/handlers/SessionUpdateHandler.ts` | ~38 | Routes `session/update` to listeners |

## SDK Types

- `UsageUpdate` from `@agentclientprotocol/sdk` v0.21.1: `{ used: number, size: number }`
- `SessionUpdate` union includes `UsageUpdate & { sessionUpdate: "usage_update" }`

## Conventions

- Single file: `ChatWebviewProvider.ts` contains HTML template + CSS + embedded webview JS
- Two CSS theme blocks (light/dark) — changes must be applied to both
- Webview JS message dispatch: top-level `window.addEventListener('message')` switch → `handleUpdate()` inner switch on `update.sessionUpdate`
- `var(--vscode-*)` CSS custom properties only — never hardcode colors
- Verify: `npm run compile` then `npm run lint`

## Build / Install

```bash
vsce package          # → acp-client-0.2.0.vsix
code --install-extension acp-client-0.2.0.vsix
# Then reload window in VS Code
```
