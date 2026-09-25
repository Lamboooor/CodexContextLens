## 0.7.0

- Add English and Simplified Chinese dashboards, hover charts, session picker, diagnostics, command names and settings labels.
- Follow VS Code by default; `codexLens.language` optionally overrides runtime views. Switching languages preserves pinned sessions and keeps user text unchanged.
- Generate separate English and Chinese screenshot sets and match them to each README.
- Add language fallback, translation completeness, live switching and SVG layout checks. Native hover redraw behavior is unchanged.

## 0.6.0

First public-source preview, under `ruoyu-li.codex-lens` with display name **Codex Lens**. Includes bilingual documentation, synthetic product screenshots, installation/migration guidance, support templates and CI. The 0.5.2 runtime refresh behavior is retained; native hover redraw remains a documented limitation. Marketplace publication is pending.

Earlier entries describe personal-preview builds under the legacy extension identity.

## 0.5.2

- 恢复悬浮卡片默认自动更新：变化采用固定 5 秒合并窗口，无变化不重绘，不再必须点击刷新。
- 增加可选手动快照设置；首次加载、手动刷新和会话切换仍立即同步。
- 明确正式接口的限制：后台同步不是鼠标移入回调，原生卡片替换仍可能重绘；侧边栏继续局部更新。

# 0.5.1

- Prepare a local Marketplace candidate with official vsce packaging, a locked development toolchain, an original icon, bilingual documentation and privacy/support notes.
- Runtime behavior remains the same as 0.5.0. No public publishing action is included.

# 0.5.0

- 新工作区没有匹配会话时回退最近主会话并标注来源；启动即读取旧数据。
- 主会话匹配不受内部会话占满最近列表影响。
- 增加侧边栏实时视图；面板数字和图表原位更新，保留节点与焦点。
- 原生悬浮改为静态快照，停止后台替换导致的闪烁，仍可手动刷新。

# 0.4.0

- 改为递归监听会话日志，合并事件后增量读取；保留定时兜底、错误恢复和首次追赶。
- 移除实验 API 声明及调用；使用正式 tooltip 展示准备好的卡片。
- 状态栏文字固定，内容相同不推送，持续变更最多每两秒更新卡片。

# 0.3.1

- 自动选择跳过后台子会话。
- 面板先监听后加载，并重试首次握手。
- 首次悬浮明确提示加载状态，保持卡片不闪烁。

# 0.3.0

- 悬浮卡片改为支持明暗主题的圆环、数字卡与构成色条，保留无闪烁刷新。
- 上下文改用最近 total_tokens，限制到 100%，与本机官方指示器同口径。
- 添加只读原生函数校准脚本，明确快照延迟和文本分类的准确性边界。

# 0.2.2

- 修复持续悬停时提示框闪烁：按需悬浮模式下，底部入口固定为 **Codex Lens**。启动后不再周期性重写该状态栏项的 text、tooltip 或 provider。
- 每次重新悬停仍扫描并增量读取最新日志；后台继续刷新统计数据及已打开的详细面板。
- 悬浮卡片显示期间保持当前这次读取结果，避免重绘。需要看后续数据时移出再移入；卡片中的“立即刷新”可先刷新缓存，下次悬停显示最新结果。
- 0.2.1 仅阻止 provider 执行期间的更新，没有覆盖 provider 返回后仍然可见的卡片，因此防护不充分。此版本使用固定入口，不依赖取消令牌推断鼠标是否离开。
- 回归测试覆盖 provider 返回后的四次定时刷新、打开面板、手动刷新，均不得写入状态栏；下一次悬停仍须返回更新后的数字。

安装后运行 **Developer: Reload Window** 加载新版。无需再次修改实验接口设置。
没有注入鼠标事件或自动打开图形测试窗口；真实视觉效果未在本轮自动验收。
