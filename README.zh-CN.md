<p align="center"><img src="https://raw.githubusercontent.com/Lamboooor/CodexLenz/main/media/icon.png" width="96" height="96" alt="Codex Lens 图标"></p>

# Codex Lens

在 VS Code 中看清 Codex 的 token 消耗、上下文占用和本地记录构成。

**早期预览版 · 已验证 Windows · MIT 开源 · 尚未发布 Marketplace**

独立社区工具，非 OpenAI 官方产品。无需 API Key，无遥测；扩展运行时不发送网络请求。

[English](README.md) · [安装指南](docs/INSTALLATION.md) · [隐私说明](PRIVACY.md) · [问题反馈](https://github.com/Lamboooor/CodexLenz/issues/new/choose)

![使用合成数据展示的 Codex Lens 面板](https://raw.githubusercontent.com/Lamboooor/CodexLenz/main/docs/screenshots/zh-CN/dashboard.png)

*截图全部采用合成数据，不包含真实会话。此处展示中文界面；英文 README 使用对应英文截图。*

## 可以查看什么

- 上下文圆环：最近记录的占用量和上下文上限。
- Token 指标：输入、输出、缓存输入和会话累计消耗。
- 可见内容构成：历史对话、文件读取、工具结果等文本的字符占比。
- 额度快照：日志中存在时，显示额度窗口及重置时间。
- 实时侧边栏和完整面板：保留节点，只更新数字、图表及必要的列表。

## 开始使用

1. 按[安装指南](docs/INSTALLATION.md)从源码生成 VSIX，在 VS Code 执行 **Extensions: Install from VSIX…** 安装。
2. 运行 **Developer: Reload Window** 后，点击窗口底部 **Codex Lens** 打开实时侧边栏。
3. 要查看完整面板，运行 **Codex Lens: 打开用量面板**。
4. 多个会话并行时，使用“选择并固定会话”；选“自动”解除固定。

启动时直接读取已有日志，不必先发送新消息。自动模式优先匹配当前工作区；没有匹配项时显示最近主会话并注明来源。它不会跟随官方 Codex 界面当前选中的聊天，也不会自动选择内部子会话。

## 指标边界

| 指标 | 含义 |
| --- | --- |
| 上下文占用 | 最近记录的 total_tokens ÷ 记录中的上下文上限，最大 100%；不是服务器瞬时状态。 |
| 输入、输出、累计 | Codex 日志计数；缓存输入已包含在输入中，推理输出已包含在输出中。累计消耗不等于当前上下文大小。 |
| 内容构成 | 可见文本的 UTF-16 字符单位占比，**不是各来源的精确 token 分账**。 |
| 账号额度 | 当前日志最近一次额度快照，可能过期，也可能没有七天窗口。 |

隐藏提示、图像、服务器侧裁剪和未记录内容无法还原。日志格式变化可能影响兼容性。详见[准确性说明](ACCURACY.md)。

## 刷新与悬浮

日志变化时增量读取，另有定时兜底。悬浮卡片默认自动同步，连续变化每 5 秒合并一次，相同内容不重复发布。

**已知限制：原生悬浮在替换内容时可能闪烁。** 正式接口没有状态栏鼠标移入回调，也不能只替换悬浮里的数字。持续观察建议使用实时侧边栏；可将 `codexLens.autoRefreshHover` 设为 `false`，使悬浮改为手动快照。详见[刷新说明](HOVER.md)。

## 界面语言

支持 English 和简体中文，默认跟随 VS Code 显示语言；中文地区设置显示简体中文，其他语言回退到英文。设置 `codexLens.language` 为 `en` 或 `zh-CN` 可单独切换面板、会话选择器和悬浮语言，切换不会丢失固定会话。命令和设置名称跟随 VS Code 显示语言。会话标题和日志原文不会被翻译。

## 设置

| 设置 | 默认值 | 用途 |
| --- | --- | --- |
| `codexLens.language` | auto | 跟随 VS Code，或选择 en / zh-CN。 |
| `codexLens.codexHome` | 空 | 使用 `CODEX_HOME` 或 `~/.codex`；填写 sessions 的父目录。 |
| `codexLens.refreshSeconds` | 15 | 文件监听之外的兜底检查间隔，单位秒。 |
| `codexLens.maxSessions` | 80 | 最近会话列表数量；工作区匹配可能查找更早的主会话。 |
| `codexLens.autoRefreshHover` | true | 自动同步悬浮；关闭不影响实时面板。 |

## 兼容与支持

桌面版 VS Code 1.96+，无需实验 API。Windows 已执行自动验证；macOS、Linux、WSL、SSH 尚未完成真实环境验收。远程窗口读取扩展宿主所在机器的日志。暂不支持纯浏览器版 VS Code 或归档会话。

遇到问题请先看[故障排查](TROUBLESHOOTING.md)，再提交 [Issue](https://github.com/Lamboooor/CodexLenz/issues/new/choose)。不要上传完整会话日志、auth.json、密钥或未经脱敏的截图。

## 开发与许可

Node.js 22+；运行 `npm ci --ignore-scripts`、`npm test`、`npm run package:local`。详见[贡献指南](CONTRIBUTING.md)。

MIT 许可证。发布身份为 `ruoyu-li.codex-lens`；GitHub 仓库名为 **CodexLenz**，产品名为 **Codex Lens**。
