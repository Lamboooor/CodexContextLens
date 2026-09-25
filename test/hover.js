'use strict';
const assert = require('node:assert/strict');
const { buildHover } = require('../src/hover');
class MarkdownString { constructor(){this.value='';} appendMarkdown(text){this.value+=text;return this;} }
const vscode={MarkdownString,env:{language:'zh-CN'}};
const snapshot={title:'[run](command:evil) <img> $(zap)',contextPercent:25,last:{input:250,output:10,total:260,cached:200,reasoning:5},total:{input:500,output:20,total:520},window:1000,visibleUnits:4,parts:[{label:'History',percent:75},{label:'Files',percent:25}],usageAt:'2026-09-25T03:00:00Z'};
const card=buildHover(vscode,{snapshot,chosen:'a',checkedAt:'2026-09-25T03:01:00Z',watching:true});
assert.ok(card.value.includes('25%'));
assert.ok(card.value.includes('History 75\\.0%'));
assert.ok(card.value.includes('Files 25\\.0%'));
assert.ok(!card.value.includes('[run](command:evil)'));
assert.ok(!card.value.includes('<img>'));
assert.equal(card.supportHtml,false);
assert.deepEqual(card.isTrusted.enabledCommands,['codexContextLens.refresh','codexContextLens.select','codexContextLens.open','codexContextLens.sidebar']);
assert.ok(buildHover(vscode,{snapshot:null,watching:false}).value.includes('自动同步'));
assert.ok(buildHover(vscode,{snapshot,error:'IO failed',watching:true}).value.includes('旧数据'));
const svg=Buffer.from(card.value.match(/base64,([^)]*)/)[1],'base64').toString('utf8');
assert.ok(svg.includes('<circle'));assert.ok(svg.includes('75.0%'));assert.ok(!svg.includes('<script'));
console.log('PASS rich hover values, percentages, missing/error states and command injection escaping');

assert.ok(buildHover(vscode,{snapshot:null,autoRefreshHover:false}).value.includes('手动快照'));
