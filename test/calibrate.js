'use strict';
// Offline only. Execute just the inspected, pure indicator function in a VM.
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { contextUsage } = require('../src/context');
const { discover, codexHome, UsageAccumulator } = require('../src/usage');
async function main() {
  const extensions=path.join(os.homedir(),'.vscode/extensions');
  const names=(await fs.readdir(extensions)).filter(n=>n.startsWith('openai.chatgpt-')).sort().reverse();
  let source, version;
  for(const name of names) {
    const dir=path.join(extensions,name,'webview/assets');
    for(const file of await fs.readdir(dir)) {
      if(!/^app-initial-.*\.js$/.test(file))continue;
      const code=await fs.readFile(path.join(dir,file),'utf8');
      const match=code.match(/function \w+\(e\)\{let t=e\?\.modelContextWindow\?\?null,n=e\?\.last.totalTokens\?\?null;[^]*?remainingTokens:null\}\}/);
      if(match){source=match[0];version=name;break;}
    }
    if(source)break;
  }
  assert.ok(source && source.length<1000,'Native formula changed; inspect bundle before updating calibration');
  const native=vm.runInNewContext('('+source+')',Object.create(null),{timeout:100});
  let boundaries=0, snapshots=0, parserChecks=0, oldDifference=0, maxDifference=0;
  for(const window of [null,0,-1,1000,258400,NaN])for(const total of [null,-1,0,1,500,1000,300000,NaN]) {
    const expected=native({modelContextWindow:window,last:{totalTokens:total}});
    assert.equal(JSON.stringify(contextUsage(total,window)),JSON.stringify(expected));boundaries++;
  }
  assert.equal(contextUsage(1,Infinity).percent,null); // Deliberately reject non-JSON infinite limits.
  const inventory=await discover(codexHome(''),3);
  for(const item of inventory.files) {
    // Fixed boundary: do not follow the live writer or expose session content.
    assert.ok(item.size<100*1024*1024,'Large log: use a bounded offline fixture');
    const handle=await fs.open(item.file,'r'),data=Buffer.alloc(item.size);
    try{await handle.read(data,0,data.length,0);}finally{await handle.close();}
    const lines=data.toString('utf8').split('\n');lines.pop();
    const acc=new UsageAccumulator();
    for(const line of lines) {
      acc.feed(line);
      let e;try{e=JSON.parse(line);}catch{continue;}
      const info=e.type==='event_msg'&&e.payload?.type==='token_count'&&e.payload.info;
      if(!info || !info.last_token_usage || !info.model_context_window)continue;
      const total=info.last_token_usage.total_tokens,window=info.model_context_window;
      const expected=native({modelContextWindow:window,last:{totalTokens:total}});
      assert.equal(JSON.stringify(contextUsage(total,window)),JSON.stringify(expected));snapshots++;
      const s=acc.snapshot();
      if(!s.contextAfterCompaction){assert.equal(s.contextPercent,expected.percent);parserChecks++;}
      const diff=Math.abs(info.last_token_usage.input_tokens/window*100-expected.percent);
      if(diff>1e-10)oldDifference++;
      maxDifference=Math.max(maxDifference,diff);
    }
  }
  console.log(JSON.stringify({officialExtension:version,formulaSHA256:crypto.createHash('sha256').update(source).digest('hex'),boundaries,files:inventory.files.length,snapshots,parserChecks,mismatches:0,oldFormulaDifferentSnapshots:oldDifference,oldFormulaMaxPercentagePointDifference:maxDifference},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
