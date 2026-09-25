'use strict';
const api = acquireVsCodeApi();
let renderRoot = null;
const $ = id => renderRoot ? renderRoot.querySelector('#'+id) : document.getElementById(id);
const colors = ['#5b9ee6','#4fd1b0','#d7b36c','#a48bd5','#dc8d9f','#83b9b7','#a4aece','#bcaa87'];
const num = n => n == null ? '—' : Number(n).toLocaleString('zh-CN');
const compact = n => n == null ? '—' : n >= 1e6 ? (n/1e6).toFixed(2)+'M' : n >= 1e3 ? (n/1e3).toFixed(1)+'k' : String(n);
const time = t => t && Number.isFinite(new Date(t).getTime()) ? new Date(t).toLocaleString('zh-CN',{hour12:false}) : '未知';
const age = t => t && Number.isFinite(new Date(t).getTime()) ? `${Math.max(0,Math.floor((Date.now()-new Date(t).getTime())/60000))} 分钟前` : '未知';
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
  const root=document.querySelector?.('main');
  if(!root) { renderContent(data); return; }
  const next=root.cloneNode(true);
  try { renderRoot=next; renderContent(data); } finally { renderRoot=null; }
  reconcile(root,next);
}
function renderContent(data) {
  const s=data.snapshot, signature=JSON.stringify([data.sessions,data.selected,data.pinned]);
  if(signature!==sessionSignature){
    sessionSignature=signature;
    $('session').replaceChildren();
    const auto=el('option','自动 · 工作区最近会话');auto.value='';$('session').append(auto);
    for(const item of data.sessions||[]){const option=el('option',`${item.title} · ${item.id?.slice(-8)||'未知 ID'}`);option.value=item.file;$('session').append(option);}
    if(data.pinned && !(data.sessions||[]).some(x=>x.file===data.selected)){const missing=el('option','已固定会话（不在近期列表）');missing.value=data.selected;$('session').append(missing);}
    $('session').value=data.pinned?data.selected:'';
  }
  text('selection-note',`${data.selectionNote || (data.pinned?'已固定':'自动选择')} · ${s?.title||s?.id||'暂无会话'}${s?.cwd?' · '+s.cwd:''}。不跟随官方聊天焦点。`);
  text('error',data.error||'');$('error').hidden=!data.error;
  $('loading').hidden=!s?.catchingUp;
  text('loading',s?.catchingUp?`正在增量分析历史：${compact(s.bytesRead)} / ${compact(s.fileSize)} 字节。当前数值尚不完整。`:'');
  const pct=s?.contextPercent;
  text('context',pct==null?'—':`${Math.round(pct)}%`);
  $('ring').style.background=`conic-gradient(${pct>=80?'#dda44c':'#37bba7'} ${Math.min(100,Math.max(0,pct||0))}%, var(--edge) 0)`;
  text('model',s?.model||'等待模型信息');
  text('context-detail',`${num(s?.contextUsed)} / ${num(s?.window)} tokens`);
  text('context-note',s?.contextAfterCompaction?'检测到压缩，等待压缩后的新请求记录。':`数据：${age(s?.usageAt)}。仅代表最近记录的请求，不是实时精确剩余空间。`);
  text('total',compact(s?.total?.total));$('total').title=num(s?.total?.total);
  text('input',compact(s?.total?.input));text('output',compact(s?.total?.output));
  text('cache',s?.total?.input && s.total.cached!=null?(s.total.cached/s.total.input*100).toFixed(1)+'%':'—');
  $('stack').replaceChildren();$('parts').replaceChildren();
  (s?.parts||[]).forEach((part,i)=>{
    if(part.units){const segment=el('div');segment.style.width=part.percent+'%';segment.style.background=colors[i];segment.title=`${part.label}：${part.percent.toFixed(1)}%（文本量）`;$('stack').append(segment);}
    const row=el('div',null,'part'),dot=el('i');dot.style.background=colors[i];
    row.append(dot,el('span',part.label),el('strong',part.percent.toFixed(1)+'%'),el('small',compact(part.units)+' 字符'));$('parts').append(row);
  });
  if(!s?.visibleUnits)$('parts').append(el('p','暂无可分析的文本记录。','empty'));
  $('last').replaceChildren(metric('输入',num(s?.last?.input)),metric('缓存输入（包含于输入）',num(s?.last?.cached)),metric('输出',num(s?.last?.output)),metric('推理（包含于输出）',num(s?.last?.reasoning)));
  text('usage-time',`记录于 ${time(s?.usageAt)}`);
  $('quota').replaceChildren();
  let windows=0;
  for(const key of ['primary','secondary']){
    const w=s?.rateLimits?.[key];if(!w || typeof w.used_percent!=='number')continue;windows++;
    const minutes=w.window_minutes,label=minutes?minutes%1440===0?`${minutes/1440} 天窗口`:minutes%60===0?`${minutes/60} 小时窗口`:`${minutes} 分钟窗口`:key==='primary'?'主窗口':'次窗口';
    const expired=w.resets_at && Date.now()/1000>=w.resets_at;
    const row=el('div',null,'quota-line'),caption=el('div',null,'quota-caption'),track=el('div',null,'quota-track'),fill=el('div',null,'quota-fill');
    caption.append(el('span',label),el('b',`${w.used_percent}% 已用${expired?' · 已过重置时间':''}`));fill.style.width=Math.max(0,Math.min(100,w.used_percent))+'%';track.append(fill);row.append(caption,track,el('small',`记录的重置时间：${w.resets_at?time(w.resets_at*1000):'未知'}`,'muted'));$('quota').append(row);
  }
  if(!windows)$('quota').append(el('p','所选会话未提供额度快照。','empty'));
  text('quota-time',`快照：${time(s?.quotaAt)}（${age(s?.quotaAt)}）。其他机器或账号的后续用量可能未反映；过期不自动当作 100% 剩余。`);
  const rows=(s?.rows||[]).slice(-60);
  text('row-kind',s?.rowKind==='request'?'逐次请求 · 不与快照叠加':'兼容模式 · 用量快照');
  text('history-note',`已观测 ${num(s?.requestCount||0)} 条${s?.rowKind==='request'?'请求':'去重快照'}，显示最近 ${rows.length} 条。累计值采用 Codex 的会话计数器；表格不是额外消耗。`);
  $('timeline').replaceChildren();const max=Math.max(1,...rows.map(r=>r.total));
  for(const r of rows){const bar=el('div');bar.style.height=Math.max(2,r.total/max*100)+'%';bar.title=`${time(r.at)} · ${num(r.total)} tokens`;$('timeline').append(bar);}
  $('rows').replaceChildren();
  for(const r of [...rows].reverse()){const tr=el('tr');for(const value of [time(r.at),num(r.input),num(r.cached),num(r.output),num(r.reasoning),num(r.total)])tr.append(el('td',value));$('rows').append(tr);}
  if(!rows.length){const tr=el('tr'),td=el('td','等待 Codex 写入 token 记录。');td.colSpan=6;tr.append(td);$('rows').append(tr);}
  const diagnostics={ '刷新方式':data.watching?'日志监听 + 定时兜底':'定时检查（监听待恢复）', '读取位置':data.remote||'本机', 'Codex 主目录':data.home,'发现会话':`${data.inventory?.count??0}（列表 ${data.sessions?.length||0}）`,'文件':s?.file||'—','会话 ID':s?.id||'—','解析行数':num(s?.lines||0),'跳过异常行':num(s?.errors||0),'压缩记录':num(s?.compactions||0),'等待完整行':s?.pendingLine?'是':'否','目录问题':data.inventory?.errors?.join('\n')||'无','扫描截断':data.inventory?.truncated?'是，达到目录扫描上限':'否','检查时间':time(data.checkedAt) };
  $('diagnostics').replaceChildren();for(const [key,value]of Object.entries(diagnostics))$('diagnostics').append(el('dt',key),el('dd',value));
}
function requestState() {
  if(receivedState)return;
  api.postMessage({type:'ready'});
  readyRetry=setTimeout(requestState,1500);
}
requestState();
