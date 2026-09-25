"""Generate original geometric icon and screenshots using synthetic data only.
Requires Python Playwright, Edge and Node.js; never reads Codex session logs.
"""
from pathlib import Path
import json, subprocess, shutil, os
from datetime import datetime, timezone
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
out=root/'docs/screenshots';out.mkdir(parents=True,exist_ok=True)
icon='<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" rx="56" fill="#18212d"/><circle cx="114" cy="112" r="64" fill="none" stroke="#334359" stroke-width="17"/><path d="M114 48a64 64 0 0 1 58 91" fill="none" stroke="#4dd6b6" stroke-width="17" stroke-linecap="round"/><path d="m161 160 42 42" stroke="#6bafff" stroke-width="20" stroke-linecap="round"/><rect x="80" y="111" width="15" height="26" rx="5" fill="#6bafff"/><rect x="107" y="94" width="15" height="43" rx="5" fill="#b29af4"/><rect x="134" y="77" width="15" height="60" rx="5" fill="#4dd6b6"/></svg>'
(root/'docs/icon.svg').write_text(icon,encoding='utf8')
parts=[('history','历史对话 / 压缩摘要',42),('prompt','本轮用户消息',7),('files','明确的文件读取结果',20),('tools','其他工具结果 / 混合输出',16),('instructions','可见系统与开发者指令',6),('assistant','本轮助手文本',5),('reasoning','可见推理摘要',1),('calls','工具调用参数',3)]
s={'id':'demo-session','file':'/demo/sessions/sample.jsonl','cwd':'/demo/project','title':'Demo · 重构示例应用（合成数据）','model':'Demo model','contextPercent':42,'contextUsed':108528,'contextRemaining':149872,'window':258400,'last':{'input':102400,'output':6128,'total':108528,'cached':81920,'reasoning':2048},'total':{'input':1720000,'output':110000,'total':1830000,'cached':1290000},'parts':[{'key':k,'label':label,'units':int(p*1000),'percent':p} for k,label,p in parts],'visibleUnits':100000,'usageAt':'2026-09-25T12:00:00Z','quotaAt':'2026-09-25T12:00:00Z','rateLimits':{'primary':{'used_percent':37,'window_minutes':300,'resets_at':4102462800},'secondary':{'used_percent':62,'window_minutes':10080,'resets_at':4102981200}},'rows':[{'at':'2026-09-25T12:00:00Z','input':n,'output':1200,'total':n+1200,'cached':int(n*.8),'reasoning':300} for n in [18000,23000,41000,32000,57000,68000,82000,102400]],'rowKind':'request','requestCount':24,'lines':560,'errors':0,'compactions':1}
s['rows'][-1]={'at':s['usageAt'],**s['last']}
s['rateLimits']['primary']['resets_at']=int(datetime(2026,9,25,16,tzinfo=timezone.utc).timestamp())
s['rateLimits']['secondary']['resets_at']=int(datetime(2026,10,2,12,tzinfo=timezone.utc).timestamp())
state={'type':'state','sessions':[{'file':s['file'],'id':s['id'],'title':s['title']}],'snapshot':s,'selected':s['file'],'pinned':True,'watching':True,'checkedAt':s['usageAt'],'home':'/demo/.codex','inventory':{'count':3,'errors':[]}}
node=shutil.which('node')
if not node:
    location=root/'.tools/node-location.txt'
    if location.exists():node=str(root/'.tools'/location.read_text().strip()/'node.exe')
if not node:raise RuntimeError('Node.js required to render the actual hover chart')
media=root/'media'
base_html=(media/'dashboard.html').read_text(encoding='utf8').replace('{{NONCE}}','demo').replace('{{CSP}}','http://lens.test').replace('{{CSS}}','http://lens.test/dashboard.css').replace('{{JS}}','http://lens.test/dashboard.js').replace('{{I18N}}','http://lens.test/i18n.js')
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True,args=['--disable-gpu','--mute-audio','--disable-background-networking'])
    try:
        for language in ['en','zh-CN']:
            target=out/language;target.mkdir(exist_ok=True)
            s['title']='Demo · Refactor a sample app (synthetic data)' if language=='en' else '演示 · 重构示例应用（合成数据）'
            s['model']='Demo model' if language=='en' else '演示模型'
            state['sessions'][0]['title']=s['title'];state['language']=language
            result=subprocess.run([node,'-e',"process.stdout.write(require('./src/chart').chart(JSON.parse(process.argv[1]),false,process.argv[2]))",json.dumps(s),language],cwd=root,capture_output=True,text=True,encoding='utf8',timeout=15,creationflags=0x08000000 if os.name=='nt' else 0);result.check_returncode()
            hover=result.stdout
            html=base_html.replace('{{LANG}}',language)
            page=browser.new_page(viewport={'width':1100,'height':1100},device_scale_factor=1,timezone_id='UTC')
            errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            page.route('http://lens.test/**',lambda route:route.fulfill(body=html,content_type='text/html') if route.request.url.endswith('/') else route.fulfill(path=str(media/route.request.url.rsplit('/',1)[-1])))
            page.add_init_script("Date.now=()=>Date.parse('2026-09-25T12:00:00Z');window.acquireVsCodeApi=()=>({postMessage:()=>{}})")
            page.goto('http://lens.test/')
            page.evaluate("data=>window.dispatchEvent(new MessageEvent('message',{data}))",state)
            assert '{{i18n:' not in page.locator('main').inner_text()
            if language=='en':assert not page.evaluate(r"/[\u4e00-\u9fff]/.test(document.body.innerText)")
            page.screenshot(path=str(target/'dashboard.png'),full_page=True)
            page.set_viewport_size({'width':400,'height':1100})
            page.screenshot(path=str(target/'sidebar.png'))
            assert not errors,errors
            page.set_viewport_size({'width':400,'height':338})
            page.set_content('<body style="margin:0">'+hover+'</body>')
            assert page.evaluate("[...document.querySelectorAll('svg text')].every(e=>{const b=e.getBBox();return b.x>=0 && b.x+b.width<=400})"), 'Hover text overflows: '+language
            page.screenshot(path=str(target/'hover.png'),omit_background=True)
            page.close()
        page=browser.new_page(viewport={'width':256,'height':256})
        page.set_content('<body style="margin:0">'+icon+'</body>')
        page.screenshot(path=str(media/'icon.png'),omit_background=True)
        page.close()
    finally:browser.close()
print('Generated icon and bilingual screenshots from synthetic data; no live log access')
