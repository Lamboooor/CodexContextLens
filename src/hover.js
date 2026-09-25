'use strict';
const { chart } = require('./chart');
const stamp = t => t && Number.isFinite(new Date(t).getTime()) ? new Date(t).toLocaleString('zh-CN', { hour12: false }) : '未知';
const escape = text => String(text ?? '').replace(/[\\`*_{}\[\]()<>#+.!|$~-]/g, '\\$&').replace(/[\r\n]+/g, ' ');
function buildHover(vscode, { snapshot: s, chosen, error, watching, selectionNote, autoRefreshHover = true }) {
  const md = new vscode.MarkdownString();
  md.isTrusted = { enabledCommands: ['codexLens.refresh', 'codexLens.select', 'codexLens.open', 'codexLens.sidebar'] };
  md.supportHtml = false;
  const lines = ['**Codex Lens** · '+(chosen ? '固定会话' : '工作区最近会话'), '', escape(s?.title || s?.id || '正在读取会话记录…'), ''];
  if (selectionNote) lines.push(escape(selectionNote), '', escape(s?.cwd || ''), '');
  if (error) lines.push(`**读取失败 · 下方可能是旧数据**：${escape(error)}`, '');
  if (s?.catchingUp) lines.push('**历史分析中 · 数据尚不完整**', '');
  if (!s && !error) lines.push('首次加载中；日志读取完成后会自动更新。', '');
  const light = [1,4].includes(vscode.window?.activeColorTheme?.kind);
  const svg = chart(s, light);
  const alt = `上下文 ${s?.contextPercent == null ? '未知' : Math.round(s.contextPercent)+'%'}；最近输入 ${s?.last?.input ?? '未知'}，输出 ${s?.last?.output ?? '未知'}；会话累计 ${s?.total?.total ?? '未知'}。可见内容字符占比：${(s?.parts||[]).filter(p=>p.percent>0).map(p=>p.label+' '+p.percent.toFixed(1)+'%').join('、')}`;
  lines.push(`![${escape(alt)}](data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')})`, '',
    '构成不含隐藏提示和图像，不代表完整上下文的 token 分账。', '',
    `用量记录：${stamp(s?.usageAt)}  `,
    autoRefreshHover ? '自动同步 · 连续变化最多每 5 秒更新卡片' : '手动快照 · 点击刷新更新数据', '',
    '[实时视图](command:codexLens.sidebar)　[详细面板](command:codexLens.open)　[选择会话](command:codexLens.select)　[刷新](command:codexLens.refresh)');
  md.appendMarkdown(lines.join('\n'));
  return md;
}
module.exports = { buildHover };
