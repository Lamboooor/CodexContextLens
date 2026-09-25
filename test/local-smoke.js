'use strict';
// Read-only offline smoke. Prints counts only; never copies or prints messages.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { discover, IncrementalReader, codexHome } = require('../src/usage');
async function main() {
  const inventory = await discover(codexHome(''), 2);
  assert.ok(inventory.files.length, 'No local logs');
  for (const item of inventory.files) {
    const start = Date.now(), reader = new IncrementalReader(item.file);
    let snapshot;
    // A fixed byte boundary avoids chasing a log actively written by Codex.
    while (reader.offset < item.size) snapshot = await reader.update(Math.min(1024 * 1024, item.size - reader.offset));
    const file = await fs.open(item.file, 'r');
    let data;
    try { data = Buffer.alloc(reader.offset); await file.read(data, 0, data.length, 0); } finally { await file.close(); }
    const lines = data.toString('utf8').split('\n');lines.pop();
    let expectedLast, expectedTotal;
    const responseIds = new Set();
    for (const line of lines) {
      let e;try{e=JSON.parse(line);}catch{continue;}
      if(e.type==='token_usage_record'){
        expectedLast=e.payload.usage;expectedTotal=e.payload.thread_token_usage;
        if(e.payload.response_id)responseIds.add(e.payload.response_id);
      } else if(e.type==='event_msg'&&e.payload?.type==='token_count'&&e.payload.info){
        expectedLast=e.payload.info.last_token_usage;expectedTotal=e.payload.info.total_token_usage;
      }
    }
    if(expectedLast){assert.equal(snapshot.last.input,expectedLast.input_tokens);assert.equal(snapshot.last.output,expectedLast.output_tokens);}
    if(expectedTotal)assert.equal(snapshot.total.total,expectedTotal.total_tokens);
    if(responseIds.size)assert.equal(snapshot.requestCount,responseIds.size);
    const sum=snapshot.parts.reduce((n,p)=>n+p.percent,0);
    assert.ok(sum===0||Math.abs(sum-100)<0.00001);
    console.log(JSON.stringify({bytes:reader.offset,lines:snapshot.lines,errors:snapshot.errors,requests:snapshot.requestCount,rowKind:snapshot.rowKind,compactions:snapshot.compactions,hasContext:snapshot.contextPercent!==null,elapsedMs:Date.now()-start}));
  }
  console.log('PASS local logs independently match the latest raw counters');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
