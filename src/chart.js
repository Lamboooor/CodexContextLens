'use strict';
const xml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const compact = n => !Number.isFinite(n) ? '—' : n >= 1e6 ? (n/1e6).toFixed(2)+'M' : n >= 1000 ? (n/1000).toFixed(1)+'k' : String(n);
const { translator } = require('../media/i18n');
function chart(s, light = false, locale = 'en') {
  const t=translator(locale);
const labels = { history:t('历史对话', 'History'), prompt:t('本轮提问', 'Prompt'), files:t('文件读取', 'File reads'), tools:t('工具结果', 'Tool output'), instructions:t('可见指令', 'Instructions'), assistant:t('助手文本', 'Assistant'), reasoning:t('推理摘要', 'Reasoning'), calls:t('调用参数', 'Arguments') };

  const bg=light?'#f7f9fc':'#18212d', tile=light?'#eaf0f7':'#222f40', fg=light?'#192b42':'#f0f5fc', muted=light?'#506078':'#a4b5ca', edge=light?'#d5dfec':'#334359';
  const pct=Number.isFinite(s?.contextPercent)?Math.max(0,Math.min(100,s.contextPercent)):null;
  const accent=pct>=90?'#ef826f':pct>=75?'#e9b65e':light?'#00856f':'#4dd6b6';
  const colors=['#6bafff','#b29af4','#e9b65e','#849bb5'];
  const parts=(s?.parts||[]).filter(p=>Number.isFinite(p.percent)&&p.percent>0).sort((a,b)=>b.percent-a.percent);
  const shown=parts.slice(0,3).map(p=>({label:labels[p.key]||p.label,percent:p.percent}));
  if(parts.length>3)shown.push({label:t('其他内容', 'Other'),percent:parts.slice(3).reduce((n,p)=>n+p.percent,0)});
  let out=`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="338" viewBox="0 0 400 338"><rect width="400" height="338" rx="14" fill="${bg}"/><g font-family="Segoe UI,Microsoft YaHei,sans-serif">`;
  const text=(x,y,value,size=12,color=fg,weight=400)=>{out+=`<text x="${x}" y="${y}" fill="${color}" font-size="${size}" font-weight="${weight}">${xml(value)}</text>`;};
  text(20,28,t('上下文', 'Context'),14,fg,600);text(223,28,t('原生口径 · 日志快照', 'Native formula · Log snapshot'),11,muted);
  out+=`<circle cx="76" cy="99" r="44" fill="none" stroke="${edge}" stroke-width="9"/>`;
  if(pct!==null)out+=`<circle cx="76" cy="99" r="44" fill="none" stroke="${accent}" stroke-width="9" stroke-dasharray="${pct/100*276.46} 276.46" transform="rotate(-90 76 99)"/>`;
  out+=`<text x="76" y="105" text-anchor="middle" fill="${fg}" font-family="Segoe UI,sans-serif" font-size="26" font-weight="700">${pct===null?'—':Math.round(pct)+'%'}</text>`;
  text(61,124,t('已用', 'used'),10,muted);
  text(147,79,`${compact(s?.contextUsed)} / ${compact(s?.window)}`,25,fg,600);
  text(147,102,t(`tokens · 剩余 ${compact(s?.contextRemaining)}`, `tokens · remaining ${compact(s?.contextRemaining)}`),12,muted);
  text(147,127,s?.contextAfterCompaction?t('压缩后等待新记录', 'Waiting after compaction'):pct===null?t('等待用量记录', 'Waiting for usage records'):t('最近请求总量 ÷ 上下文上限', 'Latest total / context window'),11,muted);
  const metrics=[[t('最近输入', 'Latest input'),s?.last?.input],[t('最近输出', 'Latest output'),s?.last?.output],[t('会话累计', 'Session total'),s?.total?.total]];
  metrics.forEach(([label,value],i)=>{const x=20+i*123;out+=`<rect x="${x}" y="157" width="114" height="59" rx="8" fill="${tile}"/>`;text(x+11,178,label,11,muted);text(x+11,202,compact(value),20,fg,600);});
  text(20,245,t('可见内容构成', 'Visible content'),13,fg,600);text(246,245,t('字符占比 ≠ token 分账', 'Character share, not tokens'),10,muted);
  out+=`<rect x="20" y="258" width="360" height="10" rx="4" fill="${edge}"/>`;
  let x=20;shown.forEach((p,i)=>{const width=Math.max(0,Math.min(380-x,p.percent*3.6));out+=`<rect x="${x}" y="258" width="${width}" height="10" fill="${colors[i]}"/>`;x+=width;});
  shown.forEach((p,i)=>{const x=20+(i%2)*184,y=290+Math.floor(i/2)*23;out+=`<circle cx="${x+4}" cy="${y-4}" r="4" fill="${colors[i]}"/>`;text(x+14,y,p.label,11,muted);text(x+120,y,p.percent.toFixed(1)+'%',11,fg,600);});
  if(!shown.length)text(20,298,t('暂无可见文本记录', 'No visible text records'),12,muted);
  return out+'</g></svg>';
}
module.exports = { chart, compact };
