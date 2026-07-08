# 修复 Windows Codex Desktop 历史会话侧栏消失问题

[English](README.md) | 中文说明

本仓库整理了一个 Windows Codex Desktop 问题的复现、分析和临时补丁：应用启动时左侧历史会话侧栏会短暂显示，随后在刷新后变空。仓库包含协议级复现脚本、最小 ASAR 补丁脚本、Windows MSIX 打包安装脚本和验证方法。

> 免责声明：这不是官方补丁。这里的方案会修改并重新打包本机已安装的 Windows MSIX 应用包。运行前请先审阅脚本，从 `-DryRun` 开始，风险自担。

## 问题现象

典型表现：

- Codex Desktop 可以正常启动。
- 左侧历史会话侧栏一开始能看到最近会话。
- 应用加载完成后，历史会话 / session list / recent conversations 变空。
- 历史数据本身仍然存在。

这个仓库刻意覆盖这些搜索关键词：

- Codex Desktop history sidebar missing
- Codex Desktop session list empty
- Codex Desktop recent conversations disappeared
- OpenAI Codex Windows MSIX app.asar patch
- `thread/list limit=500 useStateDbOnly=true`

## 已验证环境

- 平台：Windows
- 包类型：MSIX / AppX
- 已观察到的问题版本：`26.623.19656.0`
- 已观察到可避开该问题的旧版本：`26.602.9276.0`

其他版本不一定匹配相同的前端压缩代码形状。脚本在找不到预期代码形状时会失败退出，不会盲目替换。

## 根因摘要

协议级复现显示，大 limit 的 state-database-only 查询可能返回空列表：

```text
thread/list limit=50  useStateDbOnly=true  -> 50
thread/list limit=500 useStateDbOnly=true  -> 0
thread/list limit=500 useStateDbOnly=false -> 100
```

受影响 Desktop 版本的 expanded 历史侧栏刷新路径可能请求 `limit=500,useStateDbOnly=true`。这个空结果随后覆盖了最初正常加载出来的历史列表。

本方案只修改 `webview/assets/thread-context-inputs-*.js` 中侧栏 recent-history refresh 的调用，让该路径不再发送 `useStateDbOnly=true`。

## 快速开始

所有命令都在仓库根目录下用 PowerShell 运行。

先只读复现 app-server 查询行为：

```powershell
node .\scripts\repro-thread-list-state-db-bug.cjs
```

先 dry-run 检查 MSIX 补丁流程：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\patch-history-sidebar-windows-msix.ps1 -DryRun
```

确认脚本后，补丁、安装并启动 Codex Desktop：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\patch-history-sidebar-windows-msix.ps1 -Install -Launch -InstallPrerequisites
```

验证当前安装包是否包含补丁：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-installed-history-sidebar-patch.ps1
```

## 补丁改了什么

补丁脚本会在解包后的 ASAR 目录中查找 `webview/assets/thread-context-inputs-*.js`，把这些调用：

```text
this.listRecentThreads({limit:a,cursor:null,useStateDbOnly:i})
this.listRecentThreads({limit:a-e.length,cursor:n,useStateDbOnly:!0})
```

改成：

```text
this.listRecentThreads({limit:a,cursor:null,useStateDbOnly:!1})
this.listRecentThreads({limit:a-e.length,cursor:n,useStateDbOnly:!1})
```

它不会修改 SQLite 历史数据、provider 映射，也不会修改其他 state-only 查询路径。

## 脚本说明

| 脚本 | 用途 | 是否修改系统 |
| --- | --- | --- |
| `scripts/repro-thread-list-state-db-bug.cjs` | 启动 `codex app-server --stdio`，比较不同 `thread/list` 查询形状。 | 否 |
| `scripts/patch-history-sidebar.cjs` | 对已解包的 `app.asar` 目录执行精确补丁。 | 只修改传入的解包目录 |
| `scripts/patch-history-sidebar-windows-msix.ps1` | 复制已安装包、解包 `app.asar`、打补丁、重打包/签名 MSIX，并可选安装。 | 使用 `-Install` 时会修改系统安装包 |
| `scripts/verify-installed-history-sidebar-patch.ps1` | 检查已安装 `app.asar` 中的新旧字符串形状。 | 否 |

更多脚本细节见 `scripts/README.md`。

## 文档

- `docs/INDEX.md`：给 AI 和快速阅读者看的仓库地图。
- `docs/reproduction.md`：协议级复现步骤。
- `docs/patch-design.md`：为什么选择补丁前端 ASAR 路径。
- `docs/windows-msix-installation.md`：Windows MSIX 打包、签名、安装说明。
- `docs/troubleshooting.md`：常见失败和处理方式。
- `docs/codex-desktop-history-sidebar-2026-07-07.md`：脱敏后的问题复盘案例。

## 安全与可回退性

- 主 PowerShell 脚本会先把已安装包复制到临时工作目录，再做修改。
- `-DryRun` 只解包并验证补丁，不会重新打包或安装。
- `-Install` 会移除并重新安装 `OpenAI.Codex` MSIX 包，尽量保留应用数据。
- `-InstallPrerequisites` 在缺少 `makeappx.exe` 或 `signtool.exe` 时，可能从 NuGet 下载 Microsoft Windows SDK BuildTools。
- Microsoft Store 后续更新可能覆盖补丁；如果同样症状再次出现，需要重新运行补丁。

## 已知限制

- 这是针对一个已观察到的前端触发路径的规避补丁，不是 app-server state database 查询行为的根因修复。
- 如果后续 Codex Desktop 版本重命名或重构了 `thread-context-inputs-*.js`，补丁脚本会因为形状不匹配而失败，需要重新定位。
- `Add-AppxPackage -AllowUnsigned` 是否可用取决于本机 Windows 策略，受管设备可能会拒绝安装。

## 许可证

MIT。见 `LICENSE`。
