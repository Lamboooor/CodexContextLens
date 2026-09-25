'use strict';
const api = acquireVsCodeApi();
let locale = ContextLensI18n.language(document.documentElement?.lang || 'en');
const t = (zh,en) => ContextLensI18n.translator(locale)(zh,en);
const category = part => ContextLensI18n.category(part.key,part.label,locale);
ContextLensI18n.localize(document,locale);
let renderRoot = null;
const $ = id => renderRoot ? renderRoot.querySelector('#'+id) : document.getElementById(id);
const colors = ['#5b9ee6','#4fd1b0','#d7b36c','#a48bd5','#dc8d9f','#83b9b7','#a4aece','#bcaa87'];
const num = n => n == null ? '—' : Number(n).toLocaleString(locale);
const compact = n => n == null ? '—' : n >= 1e6 ? (n/1e6).toFixed(2)+'M' : n >= 1e3 ? (n/1e3).toFixed(1)+'k' : String(n);
const time = value => value && Number.isFinite(new Date(value).getTime()) ? new Date(value).toLocaleString(locale,{hour12:false}) : t('未知', 'Unknown');
const age = value => value && Number.isFinite(new Date(value).getTime()) ? t(`${Math.max(0,Math.floor((Date.now()-new Date(value).getTime())/60000))} 分钟前`, `${Math.max(0,Math.floor((Date.now()-new Date(value).getTime())/60000))} min ago`) : t('未知', 'Unknown');
function text(id, value) { $(id).textContent = value; }
function el(tag, value, cls) { const node=document.createElement(tag);if(value!=null)node.textContent=value;if(cls)node.className=cls;return node; }
function metric(label, value) { const node=el('div');node.append(el('span',label),el('b',value));return node; }
for (const id of ['refresh','settings','picker']) $(id).addEventListener('click',()=>api.postMessage({type:id}));
$('session').addEventListener('change',e=>api.postMessage({type:'select',file:e.target.value}));
let sessionSignature='', readyRetry;
let receivedState=false;
window.addEventListener('message',({data})=>{ if(data?.type==='state') { receivedState=true; clearTimeout(readyRetry); render(data); } });
// Build the next state offscreen, then patch existing nodes in place. This
// preserves focus, scroll, details state and the identity of cards/number nodes.
function reconcile(current, next) {
  if (current.nodeType === 3) { if(current.nodeValue !== next.nodeValue) current.nodeValue = next.nodeValue; return; }
  if (current.nodeType !== 1) return;
  for (const a of [...current.attributes]) if(!next.hasAttribute(a.name))current.removeAttribute(a.name);
  for (const a of next.attributes) if(current.getAttribute(a.name)!==a.value)current.setAttribute(a.name,a.value);
  for(let i=0;i<next.childNodes.length;i++) {
    const old=current.childNodes[i],fresh=next.childNodes[i];
    if(!old)current.appendChild(fresh.cloneNode(true));
    else if(old.nodeType!==fresh.nodeType || old.nodeName!==fresh.nodeName)old.replaceWith(fresh.cloneNode(true));
    else reconcile(old,fresh);
  }
  while(current.childNodes.length>next.childNodes.length)current.lastChild.remove();
  if(current.tagName==='SELECT' && current.value!==next.value)current.value=next.value;
}
function render(data) {
  locale = ContextLensI18n.language(data.language || locale);
  if(document.documentElement)document.documentElement.lang=locale;
  if(document.head)ContextLensI18n.localize(document.head,locale);
  const root=document.querySelector?.('main');
  if(!root) { renderContent(data); return; }
  const next=root.cloneNode(true);
  try { renderRoot=next; ContextLensI18n.localize(next,locale); renderContent(data); } finally { renderRoot=null; }
  reconcile(root,next);
}
function renderContent(data) {
  const s=data.snapshot, signature=JSON.stringify([locale,data.sessions,data.selected,data.pinned]);
  if(signature!==sessionSignature){
    sessionSignature=signature;
    $('session').replaceChildren();
    const auto=el('option',t('自动 · 工作区最近会话', 'Auto · Latest workspace session'));auto.value='';$('session').append(auto);
    for(const item of data.sessions||[]){const option=el('option',t(`${item.title} · ${item.id?.slice(-8)||'未知 ID'}`, `${item.title} · ${item.id?.slice(-8)||'Unknown ID'}`));option.value=item.file;$('session').append(option);}
    if(data.pinned && !(data.sessions||[]).some(x=>x.file===data.selected)){const missing=el('option',t('已固定会话（不在近期列表）', 'Pinned session (outside recent list)'));missing.value=data.selected;$('session').append(missing);}
    $('session').value=data.pinned?data.selected:'';
  }
  text('selection-note',t(`${data.selectionNote || (data.pinned?'已固定':'自动选择')} · ${s?.title||s?.id||'暂无会话'}${s?.cwd?' · '+s.cwd:''}。不跟随官方聊天焦点。`, `${data.selectionNote || (data.pinned?'Pinned':'Automatic selection')} · ${s?.title||s?.id||'No session'}${s?.cwd?' · '+s.cwd:''}. Does not follow the active Codex chat.`));
  text('error',data.error||'');$('error').hidden=!data.error;
  $('loading').hidden=!s?.catchingUp;
  text('loading',s?.catchingUp?t(`正在增量分析历史：${compact(s.bytesRead)} / ${compact(s.fileSize)} 字节。当前数值尚不完整。`, `Analyzing history: ${compact(s.bytesRead)} / ${compact(s.fileSize)} bytes. Values are incomplete.`):'');
  const pct=s?.contextPercent;
  text('context',pct==null?'—':`${Math.round(pct)}%`);
  $('ring').style.background=`conic-gradient(${pct>=80?'#dda44c':'#37bba7'} ${Math.min(100,Math.max(0,pct||0))}%, var(--edge) 0)`;
  text('model',s?.model||t('等待模型信息', 'Waiting for model information'));
  text('context-detail',`${num(s?.contextUsed)} / ${num(s?.window)} tokens`);
  text('context-note',s?.contextAfterCompaction?t('检测到压缩，等待压缩后的新请求记录。', 'Compaction detected. Waiting for a new request record.'):t(`数据：${age(s?.usageAt)}。仅代表最近记录的请求，不是实时精确剩余空间。`, `Recorded: ${age(s?.usageAt)}. Latest recorded request only; not live remaining capacity.`));
  text('total',compact(s?.total?.total));$('total').title=num(s?.total?.total);
  text('input',compact(s?.total?.input));text('output',compact(s?.total?.output));
  text('cache',s?.total?.input && s.total.cached!=null?(s.total.cached/s.total.input*100).toFixed(1)+'%':'—');
  $('stack').replaceChildren();$('parts').replaceChildren();
  (s?.parts||[]).forEach((part,i)=>{
    if(part.units){const segment=el('div');segment.style.width=part.percent+'%';segment.style.background=colors[i];segment.title=t(`${category(part)}：${part.percent.toFixed(1)}%（文本量）`, `${category(part)}: ${part.percent.toFixed(1)}% (text size)`);$('stack').append(segment);}
    const row=el('div',null,'part'),dot=el('i');dot.style.background=colors[i];
    row.append(dot,el('span',category(part)),el('strong',part.percent.toFixed(1)+'%'),el('small',compact(part.units)+t(' 字符', ' chars')));$('parts').append(row);
  });
  if(!s?.visibleUnits)$('parts').append(el('p',t('暂无可分析的文本记录。', 'No visible text records to analyze.'),'empty'));
  $('last').replaceChildren(metric(t('输入', 'Input'),num(s?.last?.input)),metric(t('缓存输入（包含于输入）', 'Cached input (part of input)'),num(s?.last?.cached)),metric(t('输出', 'Output'),num(s?.last?.output)),metric(t('推理（包含于输出）', 'Reasoning (part of output)'),num(s?.last?.reasoning)));
  text('usage-time',t(`记录于 ${time(s?.usageAt)}`, `Recorded at ${time(s?.usageAt)}`));
  $('quota').replaceChildren();
  let windows=0;
  for(const key of ['primary','secondary']){
    const w=s?.rateLimits?.[key];if(!w || typeof w.used_percent!=='number')continue;windows++;
    const minutes=w.window_minutes,label=minutes?minutes%1440===0?t(`${minutes/1440} 天窗口`, `${minutes/1440} day window`):minutes%60===0?t(`${minutes/60} 小时窗口`, `${minutes/60} hour window`):t(`${minutes} 分钟窗口`, `${minutes} minute window`):key==='primary'?t('主窗口', 'Primary window'):t('次窗口', 'Secondary window');
    const expired=w.resets_at && Date.now()/1000>=w.resets_at;
    const row=el('div',null,'quota-line'),caption=el('div',null,'quota-caption'),track=el('div',null,'quota-track'),fill=el('div',null,'quota-fill');
    caption.append(el('span',label),el('b',t(`${w.used_percent}% 已用${expired?' · 已过重置时间':''}`, `${w.used_percent}% used${expired?' · reset time passed':''}`)));fill.style.width=Math.max(0,Math.min(100,w.used_percent))+'%';track.append(fill);row.append(caption,track,el('small',t(`记录的重置时间：${w.resets_at?time(w.resets_at*1000):'未知'}`, `Recorded reset: ${w.resets_at?time(w.resets_at*1000):'Unknown'}`),'muted'));$('quota').append(row);
  }
  if(!windows)$('quota').append(el('p',t('所选会话未提供额度快照。', 'No quota snapshot in the selected session.'),'empty'));
  text('quota-time',t(`快照：${time(s?.quotaAt)}（${age(s?.quotaAt)}）。其他机器或账号的后续用量可能未反映；过期不自动当作 100% 剩余。`, `Snapshot: ${time(s?.quotaAt)} (${age(s?.quotaAt)}). Later usage on other devices or accounts may be missing; expiry does not imply a full allowance.`));
  const rows=(s?.rows||[]).slice(-60);
  text('row-kind',s?.rowKind==='request'?t('逐次请求 · 不与快照叠加', 'Per request · not added to snapshots'):t('兼容模式 · 用量快照', 'Compatibility mode · usage snapshots'));
  text('history-note',t(`已观测 ${num(s?.requestCount||0)} 条${s?.rowKind==='request'?'请求':'去重快照'}，显示最近 ${rows.length} 条。累计值采用 Codex 的会话计数器；表格不是额外消耗。`, `Observed ${num(s?.requestCount||0)} ${s?.rowKind==='request'?'requests':'deduplicated snapshots'}; showing the latest ${rows.length}. Totals use Codex session counters; rows are not extra usage.`));
  $('timeline').replaceChildren();const max=Math.max(1,...rows.map(r=>r.total));
  for(const r of rows){const bar=el('div');bar.style.height=Math.max(2,r.total/max*100)+'%';bar.title=`${time(r.at)} · ${num(r.total)} tokens`;$('timeline').append(bar);}
  $('rows').replaceChildren();
  for(const r of [...rows].reverse()){const tr=el('tr');for(const value of [time(r.at),num(r.input),num(r.cached),num(r.output),num(r.reasoning),num(r.total)])tr.append(el('td',value));$('rows').append(tr);}
  if(!rows.length){const tr=el('tr'),td=el('td',t('等待 Codex 写入 token 记录。', 'Waiting for Codex token records.'));td.colSpan=6;tr.append(td);$('rows').append(tr);}
  const diagnostics={ [t('刷新方式', 'Refresh mode')]:data.watching?t('日志监听 + 定时兜底', 'File watcher + polling fallback'):t('定时检查（监听待恢复）', 'Polling (watcher recovering)'), [t('读取位置', 'Read location')]:data.remote||t('本机', 'Local'), [t('Codex 主目录', 'Codex home')]:data.home,[t('发现会话', 'Sessions found')]:t(`${data.inventory?.count??0}（列表 ${data.sessions?.length||0}）`, `${data.inventory?.count??0} (listed ${data.sessions?.length||0})`),[t('文件', 'File')]:s?.file||'—',[t('会话 ID', 'Session ID')]:s?.id||'—',[t('解析行数', 'Parsed lines')]:num(s?.lines||0),[t('跳过异常行', 'Malformed lines skipped')]:num(s?.errors||0),[t('压缩记录', 'Compactions')]:num(s?.compactions||0),[t('等待完整行', 'Waiting for a complete line')]:s?.pendingLine?t('是', 'Yes'):t('否', 'No'),[t('目录问题', 'Directory issues')]:data.inventory?.errors?.join('\n')||t('无', 'None'),[t('扫描截断', 'Scan truncated')]:data.inventory?.truncated?t('是，达到目录扫描上限', 'Yes, scan limit reached'):t('否', 'No'),[t('检查时间', 'Checked at')]:time(data.checkedAt) };
  $('diagnostics').replaceChildren();for(const [key,value]of Object.entries(diagnostics))$('diagnostics').append(el('dt',key),el('dd',value));
}
function requestState() {
  if(receivedState)return;
  api.postMessage({type:'ready'});
  readyRetry=setTimeout(requestState,1500);
}
requestState();
