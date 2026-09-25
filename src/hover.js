'use strict';
const { chart } = require('./chart');
const { translator, category } = require('../media/i18n');
const escape = text => String(text ?? '').replace(/[\\`*_{}\[\]()<>#+.!|$~-]/g, '\\$&').replace(/[\r\n]+/g, ' ');
function buildHover(vscode, { snapshot: s, chosen, error, watching, selectionNote, autoRefreshHover = true, language = vscode.env?.language || 'en' }) {
  const t=translator(language);
  const stamp = value => value && Number.isFinite(new Date(value).getTime()) ? new Date(value).toLocaleString(language, {hour12:false}) : t('未知','Unknown');
  const md = new vscode.MarkdownString();
  md.isTrusted = { enabledCommands: ['codexContextLens.refresh', 'codexContextLens.select', 'codexContextLens.open', 'codexContextLens.sidebar'] };
  md.supportHtml = false;
  const lines = ['**Codex Context Lens** · '+(chosen ? t('固定会话', 'Pinned session') : t('工作区最近会话', 'Latest workspace session')), '', escape(s?.title || s?.id || t('正在读取会话记录…', 'Reading session records…')), ''];
  if (selectionNote) lines.push(escape(selectionNote), '', escape(s?.cwd || ''), '');
  if (error) lines.push(t(`**读取失败 · 下方可能是旧数据**：${escape(error)}`, `**Read failed · values may be stale**: ${escape(error)}`), '');
  if (s?.catchingUp) lines.push(t('**历史分析中 · 数据尚不完整**', '**Analyzing history · incomplete values**'), '');
  if (!s && !error) lines.push(t('首次加载中；日志读取完成后会自动更新。', 'Loading; values update automatically after logs are read.'), '');
  const light = [1,4].includes(vscode.window?.activeColorTheme?.kind);
  const svg = chart(s, light, language);
  const alt = t(`上下文 ${s?.contextPercent == null ? '未知' : Math.round(s.contextPercent)+'%'}；最近输入 ${s?.last?.input ?? '未知'}，输出 ${s?.last?.output ?? '未知'}；会话累计 ${s?.total?.total ?? '未知'}。可见内容字符占比：${(s?.parts||[]).filter(p=>p.percent>0).map(p=>category(p.key,p.label,language)+' '+p.percent.toFixed(1)+'%').join('、')}`, `Context ${s?.contextPercent == null ? 'Unknown' : Math.round(s.contextPercent)+'%'}; latest input ${s?.last?.input ?? 'Unknown'}, output ${s?.last?.output ?? 'Unknown'}; session total ${s?.total?.total ?? 'Unknown'}. Visible character shares: ${(s?.parts||[]).filter(p=>p.percent>0).map(p=>category(p.key,p.label,language)+' '+p.percent.toFixed(1)+'%').join(', ')}`);
  lines.push(`![${escape(alt)}](data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')})`, '',
    t('构成不含隐藏提示和图像，不代表完整上下文的 token 分账。', 'Breakdown excludes hidden prompts and images; it is not complete token attribution.'), '',
    t(`用量记录：${stamp(s?.usageAt)}  `, `Usage recorded: ${stamp(s?.usageAt)}  `),
    autoRefreshHover ? t('自动同步 · 连续变化最多每 5 秒更新卡片', 'Automatic sync · changes coalesced every 5 seconds') : t('手动快照 · 点击刷新更新数据', 'Manual snapshot · select Refresh to update'), '',
    t('[实时视图](command:codexContextLens.sidebar)　[详细面板](command:codexContextLens.open)　[选择会话](command:codexContextLens.select)　[刷新](command:codexContextLens.refresh)', '[Live view](command:codexContextLens.sidebar)　[Dashboard](command:codexContextLens.open)　[Select session](command:codexContextLens.select)　[Refresh](command:codexContextLens.refresh)'));
  md.appendMarkdown(lines.join('\n'));
  return md;
}
module.exports = { buildHover };
