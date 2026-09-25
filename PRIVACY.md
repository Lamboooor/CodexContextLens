# Privacy / 隐私说明

Applies to the Codex Lens extension runtime. Updated 2026-09-25.

## Read and process / 读取与处理

The extension lists JSONL files under the configured Codex home `sessions` directory. It reads metadata from session prefixes and incrementally parses the selected log. This processing can encounter prompts, responses, tool output, instructions and code already present in those logs. It derives token counters and visible-text sizes locally. No new copy of the transcript is written by the extension.

插件读取会话日志元数据，并在内存解析选中日志的原文。保留统计数字、有限历史、会话标题、目录和 ID 等必要状态。它不读取 auth.json、API Key 或浏览器 Cookie。

## Storage / 本地保存

A pinned session path is stored in VS Code workspaceState. Configuration values are stored by VS Code according to its settings rules. There is no custom disk database, transcript export, telemetry identifier or runtime analytics service. Selecting automatic mode clears the pinned selection. Uninstalling does not delete Codex's own session logs. VS Code controls the lifecycle of its extension storage.

固定会话路径存入 VS Code 工作区状态；设置由 VS Code 保存。统计主要留在内存。选择“自动”解除固定。卸载不会删除 Codex 原始日志。

## Network and third parties / 联网与第三方

The extension runtime makes no network requests, sends no telemetry and calls no models. Webviews block network connections through Content Security Policy. VS Code and the official Codex application operate under their own policies. Development tools such as npm and vsce can contact their registries; they are not shipped runtime dependencies.

## Display and user reports / 界面和反馈

Titles, workspace paths, session IDs and usage values can appear on screen. Screenshots you share may disclose these. Support reports should include only redacted diagnostics, never authentication files or full session logs. The supplied marketing screenshots use synthetic data.

商店截图使用合成数据。请勿公开真实会话日志、凭据或未经脱敏的截图。

## Control / 控制

You can change the Codex home, pin another session, disable the extension or uninstall it. These operations do not modify your Codex account, usage allowance or original logs.
