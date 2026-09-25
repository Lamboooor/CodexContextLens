'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { SessionWatcher } = require('../src/watcher');
const { IncrementalReader } = require('../src/usage');
async function main() {
  const home=await fs.mkdtemp(path.join(os.tmpdir(),'lens-watch-'));
  let watcher;
  try {
    const states=[];
    watcher=new SessionWatcher(()=>{},v=>states.push(v));
    watcher.start(home);assert.equal(states.at(-1),false);
    const dir=path.join(home,'sessions','2026','09','25');await fs.mkdir(dir,{recursive:true});
    const file=path.join(dir,'fixture.jsonl');await fs.writeFile(file,'');
    const reader=new IncrementalReader(file);await reader.update();
    let seen;
    const arrived=new Promise(resolve=>{seen=resolve;});
    watcher.onChange=changed=>{if(changed===file)seen();};
    watcher.start(home);assert.equal(states.at(-1),true);
    const event={type:'event_msg',payload:{type:'token_count',info:{model_context_window:1000,last_token_usage:{input_tokens:300,output_tokens:20,total_tokens:320}}}};
    await fs.appendFile(file,JSON.stringify(event)+'\n');
    let timeout;
    try { await Promise.race([arrived,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('No filesystem notification')),4000);})]); }
    finally { clearTimeout(timeout); }
    assert.equal((await reader.update()).contextPercent,32);
    watcher.dispose();assert.equal(watcher.handle,null);
    console.log('PASS real recursive filesystem event, missing-directory recovery, incremental usage and disposal');
  } finally { watcher?.dispose();await fs.rm(home,{recursive:true,force:true}); }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
