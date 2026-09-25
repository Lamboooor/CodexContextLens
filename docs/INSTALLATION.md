# Installation and upgrades / 安装与升级

## Availability

Codex Context Lens is currently a source-available early preview under MIT. Marketplace publication has not occurred. The intended extension ID is `ruoyu-li.codex-context-lens`. Do not assume similarly named Marketplace listings are this project.

## Build and install

Prerequisites: desktop VS Code 1.96+, Node.js 22+ and npm, and readable Codex session logs on the extension host.

```sh
git clone https://github.com/Lamboooor/CodexContextLens.git
cd CodexContextLens
npm ci --ignore-scripts
npm test
npm run package:local
```

The VSIX is written to `dist/codex-context-lens-<version>-candidate.vsix`. Open VS Code's command palette, run **Extensions: Install from VSIX…**, select that file, then **Developer: Reload Window**. Open the bottom **Codex Context Lens** entry. No account sign-in or experimental flags are needed by this extension.

`npm run check:package` additionally inspects the archive and requires Python 3. Build commands never publish or install automatically. npm downloads development dependencies; the installed extension itself makes no network requests.

## Upgrade from earlier previews

1. Uninstall earlier personal or unpublished preview builds in Extensions to avoid duplicate entries.
2. Install the new VSIX with identity `ruoyu-li.codex-context-lens`.
3. Reload VS Code, re-enter any custom data-source/language settings under `codexContextLens.*`, and select the intended session again.

The renamed identity is a separate extension, not an in-place Marketplace update. Older settings are not automatically migrated; Codex session logs are never removed or changed.

## Uninstall

Uninstall Codex Context Lens from the Extensions view. You can optionally remove its `codexContextLens.*` settings. The extension does not create a separate transcript database and does not modify Codex logs.

## 中文速览

当前从源码打包安装，尚未上架。执行上方命令后，在命令面板选择“从 VSIX 安装扩展”，再重载窗口。旧预览版与新版 ID、设置前缀不同，请先卸载旧版避免双入口；自定义设置需重新填写，固定会话需重新选择。不要为了安装公开版启用实验 API。

## Language / 语言

The UI follows VS Code by default (`codexContextLens.language: auto`). Choose `en` for English or `zh-CN` for Simplified Chinese in Settings. The override applies to live views, hover and session picker; command names and settings labels follow VS Code itself. Chinese locale variants use Simplified Chinese; other languages fall back to English. Switching languages preserves your pinned session.

设置中搜索 `codexContextLens.language`，可选择跟随 VS Code、English 或简体中文。切换语言不会翻译会话原文，也不会改变 token 统计。
