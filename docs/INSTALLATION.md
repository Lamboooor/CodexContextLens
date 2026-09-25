# Installation and upgrades / 安装与升级

## Availability

Codex Lens is currently a source-available early preview under MIT. Marketplace publication has not occurred. The intended extension ID is `ruoyu-li.codex-lenz`. Do not assume similarly named Marketplace listings are this project.

## Build and install

Prerequisites: desktop VS Code 1.96+, Node.js 22+ and npm, and readable Codex session logs on the extension host.

```sh
git clone https://github.com/Lamboooor/CodexLenz.git
cd CodexLenz
npm ci --ignore-scripts
npm test
npm run package:local
```

The VSIX is written to `dist/codex-lenz-<version>-candidate.vsix`. Open VS Code's command palette, run **Extensions: Install from VSIX…**, select that file, then **Developer: Reload Window**. Open the bottom **Codex Lens** entry. No account sign-in or experimental flags are needed by this extension.

`npm run check:package` additionally inspects the archive and requires Python 3. Build commands never publish or install automatically. npm downloads development dependencies; the installed extension itself makes no network requests.

## Upgrade from the personal preview

1. In Extensions, find `@id:lambo-local.codex-lens-local` and uninstall it.
2. Install the new VSIX with identity `ruoyu-li.codex-lenz`.
3. Reload VS Code and choose the intended session again.

The two identities are not an in-place Marketplace upgrade. Existing `codexLens.*` settings normally remain in VS Code settings, but the pinned session is extension-specific and must be selected again. Codex session logs are never removed by the extension.

## Uninstall

Uninstall Codex Lens from the Extensions view. You can optionally remove its `codexLens.*` settings. The extension does not create a separate transcript database and does not modify Codex logs.

## 中文速览

当前从源码打包安装，尚未上架。执行上方命令后，在命令面板选择“从 VSIX 安装扩展”，再重载窗口。旧个人版与公开版 ID 不同，请先卸载旧版，避免双入口；固定会话需重新选择。不要为了安装公开版启用实验 API。

## Language / 语言

The UI follows VS Code by default (`codexLens.language: auto`). Choose `en` for English or `zh-CN` for Simplified Chinese in Settings. The override applies to live views, hover and session picker; command names and settings labels follow VS Code itself. Chinese locale variants use Simplified Chinese; other languages fall back to English. Switching languages preserves your pinned session.

设置中搜索 `codexLens.language`，可选择跟随 VS Code、English 或简体中文。切换语言不会翻译会话原文，也不会改变 token 统计。

## Rejected publication name

The earlier `codex-lens` candidate was rejected because the Marketplace name was already taken. The new internal name is `codex-lenz`; the display name remains **Codex Lens**. If you installed the unpublished `ruoyu-li.codex-lens` candidate locally, uninstall it before installing `ruoyu-li.codex-lenz` to avoid duplicate entries.
