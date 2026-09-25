'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { UsageAccumulator, IncrementalReader, discover, normalize } = require('../src/usage');
let checks = 0;
function test(name, fn) { fn(); checks++; console.log('PASS', name); }
const usage = (input, output, cached=0) => ({ input_tokens: input, output_tokens: output, cached_input_tokens: cached, reasoning_output_tokens: 2, total_tokens: input+output });
const event = (type,payload) => JSON.stringify({type,timestamp:'2026-09-25T04:00:00Z',payload});
const count = (last,total=last) => event('event_msg',{type:'token_count',info:{last_token_usage:last,total_token_usage:total,model_context_window:1000}});

async function main() {
  test('unknown fields and subset counters',()=>{
    assert.equal(normalize({input_tokens:100,output_tokens:20}).cached,null);
    assert.equal(normalize(usage(100,20,80)).total,120);
    assert.equal(normalize({input_tokens:-1,output_tokens:2}),null);
  });
  test('deduplicate request IDs and snapshots',()=>{
    const a=new UsageAccumulator(),u=usage(200,10,100),total=usage(2000,100,1000);
    const raw=event('token_usage_record',{response_id:'one',usage:u,thread_token_usage:total});
    a.feed(raw);a.feed(count(u,total));a.feed(raw);a.feed(count(u,total));
    const s=a.snapshot();assert.equal(s.total.total,2100);assert.equal(s.rows.length,1);assert.equal(s.requestCount,1);assert.equal(s.contextPercent,21);
  });
  test('quota-only events preserve tokens and zero quota',()=>{
    const a=new UsageAccumulator();a.feed(count(usage(100,10)));
    a.feed(event('event_msg',{type:'token_count',info:null,rate_limits:{primary:{used_percent:0}}}));
    assert.equal(a.snapshot().last.input,100);assert.equal(a.snapshot().rateLimits.primary.used_percent,0);
  });
  test('null quota preserves timestamped previous snapshot',()=>{
    const a=new UsageAccumulator();a.feed(event('event_msg',{type:'token_count',rate_limits:{primary:{used_percent:50}}}));
    a.feed(event('event_msg',{type:'token_count',rate_limits:null}));assert.equal(a.snapshot().rateLimits.primary.used_percent,50);
  });
  test('conservative file attribution and untrusted text',()=>{
    const a=new UsageAccumulator();
    a.feed(event('response_item',{type:'function_call',name:'read_file',call_id:'x',arguments:'{}'}));
    a.feed(event('response_item',{type:'function_call_output',call_id:'x',output:'12345'}));
    a.feed(event('response_item',{type:'custom_tool_call',name:'exec',call_id:'y',input:'tools.exec_command(...)'}));
    a.feed(event('response_item',{type:'custom_tool_call_output',call_id:'y',output:'123'}));
    a.feed(event('response_item',{type:'message',role:'developer',content:[{text:'<script>bad()</script>'}]}));
    const p=Object.fromEntries(a.snapshot().parts.map(x=>[x.key,x.units]));assert.equal(p.files,5);assert.equal(p.tools,3);assert.equal(p.instructions,22);
  });
  test('user event/message de-duplication and history migration',()=>{
    const a=new UsageAccumulator();a.feed(event('event_msg',{type:'task_started',turn_id:'a'}));
    a.feed(event('event_msg',{type:'user_message',message:'abc'}));
    a.feed(event('response_item',{type:'message',role:'user',content:[{text:'abc'}]}));
    a.feed(event('response_item',{type:'message',role:'assistant',content:[{text:'xy'}]}));
    a.feed(event('event_msg',{type:'task_started',turn_id:'b'}));
    const p=Object.fromEntries(a.snapshot().parts.map(x=>[x.key,x.units]));assert.equal(p.history,5);assert.equal(p.prompt,0);
  });
  test('compaction invalidates context but preserves cumulative usage',()=>{
    const a=new UsageAccumulator();a.feed(count(usage(800,10)));a.feed(event('compacted',{message:'summary'}));
    assert.equal(a.snapshot().contextPercent,null);assert.equal(a.snapshot().visibleUnits,7);assert.equal(a.snapshot().total.total,810);
    a.feed(count(usage(120,10),usage(920,20)));assert.equal(a.snapshot().contextPercent,13);
  });
  test('malformed and future records are tolerated',()=>{
    const a=new UsageAccumulator();a.feed('{broken');a.feed(event('new_future_event',{}));assert.equal(a.snapshot().errors,1);
  });
  test('bounded history does not change cumulative counters',()=>{
    const a=new UsageAccumulator();for(let i=0;i<200;i++)a.feed(event('token_usage_record',{response_id:String(i),usage:usage(10,1),thread_token_usage:usage((i+1)*10,i+1)}));
    assert.equal(a.snapshot().rows.length,160);assert.equal(a.snapshot().requestCount,200);assert.equal(a.snapshot().total.total,2200);
  });
  test('separated or reversed user mirrors do not double count',()=>{
    for (const reverse of [false,true]) {
      const a=new UsageAccumulator();
      const ev=event('event_msg',{type:'user_message',message:'same'});
      const msg=event('response_item',{type:'message',role:'user',content:[{text:'same'}]});
      a.feed(reverse?msg:ev);a.feed(count(usage(1,1)));a.feed(reverse?ev:msg);
      assert.equal(a.snapshot().parts.find(x=>x.key==='prompt').units,4);
    }
  });
  test('valid JSON with an invalid event shape is skipped',()=>{
    const a=new UsageAccumulator();a.feed('null');a.feed('[]');
    a.feed(event('response_item',{type:'message',role:'user',content:[null,{text:'ok'}]}));
    assert.equal(a.snapshot().errors,2);assert.equal(a.snapshot().visibleUnits,2);
  });
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'codex-context-lens-test-'));
  try {
    const dir=path.join(temp,'sessions','2026','09','25');await fs.mkdir(dir,{recursive:true});
    const file=path.join(dir,'rollout.jsonl');
    await fs.writeFile(file,event('session_meta',{id:'test',cwd:temp})+'\n');
    const reader=new IncrementalReader(file);await reader.update();
    const unicode=event('event_msg',{type:'user_message',message:'中文🙂'});
    const bytes=Buffer.from(unicode+'\n'+count(usage(100,10))+'\n');
    const split=bytes.indexOf(Buffer.from('中'))+1;
    await fs.appendFile(file,bytes.subarray(0,split));await reader.update();
    await fs.appendFile(file,bytes.subarray(split));
    const s=await reader.update();assert.equal(s.title,'中文🙂');assert.equal(s.last.input,100);assert.equal(s.errors,0);
    const again=await reader.update();assert.equal(again.lines,s.lines);checks++;console.log('PASS incremental UTF-8 and partial-line handling');
    await fs.writeFile(file,count(usage(20,1))+'\n');assert.equal((await reader.update()).last.input,20);checks++;console.log('PASS file truncation');
    assert.equal((await discover(temp)).files.length,1);assert.ok((await discover(path.join(temp,'missing'))).errors.length);checks++;console.log('PASS discovery and missing-folder diagnostics');
  } finally { await fs.rm(temp,{recursive:true,force:true}); }
  class Element {
    constructor(tag){this.tag=tag;this.children=[];this.style={};this.listeners={};this.value='';this.hidden=false;this.textContent='';}
    append(...items){this.children.push(...items);} replaceChildren(...items){this.children=items;}
    addEventListener(type,handler){this.listeners[type]=handler;}
  }
  const ids=new Map(),messages=[],handlers={};
  const sandbox={ContextLensI18n:require('../media/i18n'),setTimeout:()=>0,clearTimeout:()=>{},document:{getElementById:id=>{if(!ids.has(id))ids.set(id,new Element(id));return ids.get(id);},createElement:tag=>new Element(tag)},window:{addEventListener:(type,handler)=>handlers[type]=handler},acquireVsCodeApi:()=>({postMessage:m=>messages.push(m)}),console};
  vm.runInNewContext(await fs.readFile(path.join(__dirname,'../media/dashboard.js'),'utf8'),sandbox);
  const a=new UsageAccumulator();a.feed(count(usage(500,20,400)));
  const state={type:'state',sessions:[{file:'a',id:'a',title:'<img onerror=evil()>',cwd:'/tmp'}],snapshot:a.snapshot(),home:'/tmp',selected:'a',pinned:true,inventory:{count:1,errors:[]}};
  handlers.message({data:state});assert.equal(ids.get('context').textContent,'52%');assert.equal(ids.get('rows').children.length,1);assert.equal(ids.get('session').children[1].textContent,'<img onerror=evil()> · a');
  ids.get('refresh').listeners.click();assert.equal(messages.at(-1).type,'refresh');
  handlers.message({data:{...state,snapshot:null,error:'missing'}});assert.equal(ids.get('context').textContent,'—');assert.equal(ids.get('error').hidden,false);checks++;console.log('PASS headless dashboard render, empty state and safe text');
  console.log(`All ${checks} checks passed.`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
