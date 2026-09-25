'use strict';
// VS Code lifecycle/IPC contract exercised without opening an editor window.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = process.env.CODEX_CONTEXT_LENS_TEST_ROOT || path.resolve(__dirname,'..');
async function main(){
  class MarkdownString { constructor(){this.value='';} appendMarkdown(value){this.value+=value;return this;} }
  let statusWrites=0, autoRefreshHover=true, languageOption='auto';
  const status={set text(value){statusWrites++;this.label=value;},set tooltip(value){statusWrites++;this.card=value;},get tooltip(){return this.card;},show(){},dispose(){},get tooltip2(){throw Error('proposed API must not be accessed');}};
  const commands=new Map(), sent=[], timers=new Map(), state=new Map();
  let receive, configChanged, disposal, version=0, timerId=0, panel, watcher, viewProvider;
  const disposable=()=>({dispose(){}});
  const uri=p=>({fsPath:p,toString:()=>p});
  const vscode={
    MarkdownString,StatusBarAlignment:{Right:1},ViewColumn:{Beside:2},env:{remoteName:''},
    Uri:{joinPath:(base,...parts)=>uri(path.join(base.fsPath,...parts))},
    workspace:{workspaceFolders:[{uri:uri('/new-project')}],getConfiguration:()=>({get:(key,fallback)=>key==='autoRefreshHover'?autoRefreshHover:key==='language'?languageOption:fallback}),onDidChangeConfiguration:fn=>{configChanged=fn;return disposable();}},
    commands:{registerCommand:(id,fn)=>{commands.set(id,fn);return disposable();},executeCommand:async()=>{}},
    window:{registerWebviewViewProvider:(id,provider)=>{viewProvider=provider;return disposable();},onDidChangeActiveColorTheme:()=>disposable(),createStatusBarItem:()=>status,showQuickPick:async()=>undefined,
      createWebviewPanel:()=>{panel={visible:true,reveal(){},dispose(){disposal?.();},onDidDispose:fn=>{disposal=fn;return disposable();},onDidChangeViewState:()=>disposable(),webview:{set html(value){this.page=value;assert.equal(typeof receive,'function','ready listener must exist before loading HTML');void receive({type:'ready'});},get html(){return this.page;},cspSource:'test-local:',asWebviewUri:x=>x,postMessage:async m=>sent.push(m),onDidReceiveMessage:fn=>{receive=fn;return disposable();}}};return panel;}}
  };
  let updates=0;
  const usage={codexHome:()=>'/codex',discover:async()=>({files:[{file:'/codex/sessions/review.jsonl',size:20},{file:'/codex/sessions/a.jsonl',size:20}],totalFiles:1,errors:[]}),metadata:async file=>({id:'session-a',cwd:'/repo',title:'Hello',internal:file.includes('review')}),IncrementalReader:class{constructor(file){this.file=file;}async update(){updates++;return {file:this.file,id:'session-a',title:'Hello',contextPercent:25+version,last:{input:90,output:10,total:100},total:{total:100},usageAt:'2026-09-25T00:00:00Z'};}}};
  const context={extensionUri:uri(root),extensionPath:root,subscriptions:[],workspaceState:{get:(key,fallback)=>state.get(key)||fallback,update:async(key,value)=>state.set(key,value)}};
  const sandbox={module:{exports:{}},require:name=>({'vscode':vscode,'node:fs/promises':fs,'node:path':path,'node:crypto':crypto,'./usage':usage,'./watcher':{SessionWatcher:class{constructor(change,state){this.change=change;this.state=state;watcher=this;}start(){this.state(true);}dispose(){this.closed=true;}}},'../media/i18n':require(path.join(root,'media/i18n')),'./hover':require(path.join(root,'src/hover'))}[name]),process,console,setTimeout:(fn,delay)=>{timers.set(++timerId,{fn,delay});return timerId;},clearTimeout:id=>timers.delete(id)};
  vm.runInNewContext(await fs.readFile(path.join(root,'src/extension.js'),'utf8'),sandbox);
  sandbox.module.exports.activate(context);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(updates,1);assert.equal(commands.size,5);
  await commands.get('codexContextLens.open')();assert.ok(!panel.webview.html.includes('{{'));assert.ok(panel.webview.html.includes("connect-src 'none'"));
  await receive({type:'ready'});assert.equal(sent.at(-1).snapshot.id,'session-a');assert.ok(sent.at(-1).selectionNote);assert.equal(sent.at(-1).snapshot.file,'/codex/sessions/a.jsonl','auto selection skips internal review sessions');
  await receive({type:'select',file:'/private/auth.json'});assert.equal(state.get('selectedSession'),undefined);
  await receive({type:'select',file:'/codex/sessions/a.jsonl'});assert.equal(state.get('selectedSession'),'/codex/sessions/a.jsonl');assert.equal(sent.at(-1).pinned,true);
  await receive({type:'select',file:''});assert.equal(sent.at(-1).pinned,false);
  assert.ok(status.tooltip instanceof MarkdownString);
  for(const [id,t] of [...timers])if(t.delay===2000){timers.delete(id);t.fn();}
  const writes=statusWrites;
  for(let i=0;i<4;i++)await receive({type:'refresh'});
  assert.equal(statusWrites,writes,'unchanged data and read timestamps must not reset hover');
  const before=updates;
  for(let i=0;i<20;i++)watcher.change('/codex/sessions/a.jsonl','change');
  const pending=[...timers.entries()].filter(([,t])=>t.delay===400);
  assert.equal(pending.length,1,'burst notifications coalesce');
  version++;
  timers.delete(pending[0][0]);pending[0][1].fn();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(updates,before+1);
  assert.equal(statusWrites,writes,'changed data waits for bounded card synchronization');
  const cardTimers=[...timers.entries()].filter(([,t])=>t.delay===5000);
  assert.equal(cardTimers.length,1);
  version++;
  await receive({type:'refresh'});
  assert.equal([...timers.entries()].find(([,t])=>t.delay===5000)[0],cardTimers[0][0],'continuous changes do not postpone publication');
  timers.delete(cardTimers[0][0]);cardTimers[0][1].fn();
  assert.ok(status.tooltip.value.includes('27%'),'latest pending sample appears without a manual command');
  await commands.get('codexContextLens.refresh')();assert.ok(status.tooltip.value.includes('27%'));
  assert.equal(status.label,'$(pulse) Codex Context Lens','status anchor never moves');
  assert.equal(statusWrites,writes+1,'only changed card is published');
  assert.equal([...timers.values()].filter(t=>t.delay===5000).length,0,'identical refresh does not queue a redraw');
  version++;
  await receive({type:'refresh'});
  assert.equal([...timers.values()].filter(t=>t.delay===5000).length,1);
  await commands.get('codexContextLens.refresh')();
  assert.ok(status.tooltip.value.includes('28%'));
  assert.equal([...timers.values()].filter(t=>t.delay===5000).length,0,'explicit refresh cancels pending duplicate');
  watcher.change('/codex/sessions/review.jsonl','change');
  assert.equal([...timers.values()].filter(t=>t.delay===400).length,0);
  watcher.change('/codex/sessions/a.jsonl','change');
  console.log('PASS stable API only, changed-log refresh, event coalescing, internal filtering and idle hover deduplication');
  const sidebarMessages=[];
  const side={visible:true,onDidDispose:()=>disposable(),onDidChangeVisibility:()=>disposable(),webview:{cspSource:'test-local:',asWebviewUri:x=>x,postMessage:async m=>sidebarMessages.push(m),onDidReceiveMessage:()=>disposable()}};
  await viewProvider.resolveWebviewView(side);
  assert.ok(side.webview.html.includes('dashboard.js'));
  assert.ok(sidebarMessages.at(-1).snapshot.last.total===100);
  console.log('PASS sidebar receives existing snapshot immediately on resolve');
  await receive({type:'select',file:'/codex/sessions/a.jsonl'});
  languageOption='zh-CN';
  configChanged({affectsConfiguration:key=>key==='codexContextLens'||key==='codexContextLens.language'});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(state.get('selectedSession'),'/codex/sessions/a.jsonl','language change preserves pinned session');
  assert.equal(sidebarMessages.at(-1).language,'zh-CN');
  assert.ok(status.tooltip.value.includes('固定会话'));
  languageOption='en';
  configChanged({affectsConfiguration:key=>key==='codexContextLens'||key==='codexContextLens.language'});
  await new Promise(resolve=>setImmediate(resolve));
  assert.ok(status.tooltip.value.includes('Pinned session'));
  autoRefreshHover=false;
  configChanged({affectsConfiguration:()=>true});
  await new Promise(resolve=>setImmediate(resolve));
  const manualWrites=statusWrites;
  version++;await receive({type:'refresh'});
  assert.equal(statusWrites,manualWrites,'optional manual mode stays static');
  assert.equal([...timers.values()].filter(t=>t.delay===5000).length,0);
  autoRefreshHover=true;
  configChanged({affectsConfiguration:()=>true});
  await new Promise(resolve=>setImmediate(resolve));
  version++;await receive({type:'refresh'});
  assert.equal([...timers.values()].filter(t=>t.delay===5000).length,1);
  disposal();for(const item of context.subscriptions)item.dispose();assert.equal(timers.size,0);assert.equal(watcher.closed,true);
  console.log('PASS activation, auto selection, CSP, IPC, pinning, path allowlist and disposal');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
