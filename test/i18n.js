'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const i18n=require('../media/i18n'),{chart}=require('../src/chart'),{buildHover}=require('../src/hover');
assert.equal(i18n.language('auto','zh-TW'),'zh-CN');
assert.equal(i18n.language('auto','de'),'en');
assert.equal(i18n.language('en','zh-CN'),'en');
assert.equal(i18n.language('zh-CN','en'),'zh-CN');
const template=fs.readFileSync(path.join(__dirname,'../media/dashboard.html'),'utf8');
const english=i18n.html(template,'en'),chinese=i18n.html(template,'zh-CN');
assert.ok(!/[\u4e00-\u9fff]/.test(english));assert.ok(chinese.includes('刷新'));assert.ok(!english.includes('{{i18n:'));
const snapshot={title:'Demo',contextPercent:40,parts:[{key:'files',label:'文件读取',percent:100}]};
for(const lang of ['en','zh-CN']){
 const svg=chart(snapshot,false,lang);assert.ok(svg.includes(lang==='en'?'File reads':'文件读取'));
 if(lang==='en')assert.ok(!/[\u4e00-\u9fff]/.test(svg));
 class MarkdownString {constructor(){this.value='';}appendMarkdown(v){this.value+=v;}}
 const hover=buildHover({MarkdownString},{snapshot,language:lang});
 assert.ok(hover.value.includes(lang==='en'?'Live view':'实时视图'));
 if(lang==='en')assert.ok(!/[\u4e00-\u9fff]/.test(hover.value));
}
const manifest=require('../package.json'),en=require('../package.nls.json');
for(const file of ['package.nls.zh-cn.json','package.nls.zh-tw.json'])assert.deepEqual(Object.keys(require('../'+file)).sort(),Object.keys(en).sort());
for(const [,key] of JSON.stringify(manifest).matchAll(/%([^%]+)%/g))assert.ok(en[key],'Missing manifest translation '+key);
console.log('PASS language resolution, translated HTML/SVG/hover and complete manifest translations');
