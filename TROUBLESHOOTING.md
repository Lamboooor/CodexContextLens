# Troubleshooting / 故障排查

## No status-bar entry / 底部没有入口

Check **View → Appearance → Status Bar**, confirm the extension is enabled in this window, then run **Developer: Reload Window** after a VSIX upgrade. Do not enable experimental APIs; the public build does not use them.

## No data / 没有数据

Open the full dashboard and inspect diagnostics. `codexLens.codexHome` must name the parent of `sessions`. Leave it empty to use `CODEX_HOME` or `~/.codex`. Existing logs load at startup without a new model request. Empty, unreadable or incompatible logs cannot provide counters; a large session can take time to analyze.

In a remote window, the workspace extension reads the remote filesystem. A local Codex installation does not imply that its logs are available on SSH/WSL. Do not copy authentication files as a workaround.

## Wrong conversation / 会话不一致

Automatic selection matches the workspace directory, then falls back to the most recent main session with a notice. It does not track the official chat tab. Use **Codex Lens: 选择并固定会话** to pin the intended log; choose automatic mode to unpin.

## Hover flickers or looks old / 悬浮闪烁或旧数据

The stable VS Code tooltip API replaces the whole card when content changes. Automatic updates use a five-second coalescing window; this reduces redraw frequency but cannot eliminate flicker. The live sidebar updates individual DOM elements. Set `codexLens.autoRefreshHover` to false for a manual hover snapshot, or keep using the sidebar for live monitoring. A current read does not imply a new token record exists in the log.

## No weekly quota / 缺少七天额度

Quota windows must be present in the selected log. A missing value is unknown, not zero usage. The extension does not query account billing or infer why a window is absent from the official interface.

## Counters seem inconsistent / 数值疑问

Cached input is a subset of input; reasoning output is a subset of output. Session totals span requests and can exceed context capacity. Content breakdown uses visible characters rather than token attribution. See [ACCURACY.md](ACCURACY.md).

## Duplicate entries after upgrading / 升级后有两个入口

The personal preview and public identity are separate extensions. Remove `lambo-local.codex-lens-local` and keep `ruoyu-li.codex-lens`. See [installation](docs/INSTALLATION.md). Reload afterward.

Still stuck? Follow [SUPPORT.md](SUPPORT.md). 请先脱敏再提交问题。
