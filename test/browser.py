"""Optional headless DOM regression. Requires Python Playwright and local Edge."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root = Path(__file__).resolve().parents[1] / 'media'
html = (root / 'dashboard.html').read_text(encoding='utf8').replace('{{NONCE}}', 'fixture').replace('{{CSP}}', 'http://lens.test').replace('{{CSS}}', 'http://lens.test/dashboard.css').replace('{{JS}}', 'http://lens.test/dashboard.js')
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True, args=['--disable-gpu', '--mute-audio', '--disable-background-networking'])
    try:
        page = browser.new_page(viewport={'width': 380, 'height': 800})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.route('http://lens.test/**', lambda route: route.fulfill(body=html, content_type='text/html') if route.request.url.endswith('/') else route.fulfill(path=str(root / route.request.url.rsplit('/', 1)[-1])))
        page.add_init_script("window.acquireVsCodeApi=()=>({postMessage:()=>{}})")
        page.goto('http://lens.test/')
        page.evaluate("""() => {
          window.state={type:'state',sessions:[],snapshot:{model:'fixture',contextPercent:25,contextUsed:250,window:1000,total:{total:500},last:{input:240,output:10},parts:[{key:'history',label:'History',units:5,percent:100}],visibleUnits:5,rows:[]}};
          window.push=()=>window.dispatchEvent(new MessageEvent('message',{data:state}));push();
          window.oldMain=document.querySelector('main');window.oldNumber=document.querySelector('#context').firstChild;
          window.oldPart=document.querySelector('#parts').firstChild;
          document.querySelector('#refresh').focus();
          for(let i=0;i<30;i++){state.snapshot.contextPercent=26+i;state.snapshot.parts[0].units=6+i;push();}
        }""")
        assert page.evaluate("oldMain===document.querySelector('main') && oldNumber===document.querySelector('#context').firstChild && oldPart===document.querySelector('#parts').firstChild")
        assert page.locator('#context').inner_text() == '55%'
        assert page.evaluate("document.activeElement.id") == 'refresh'
        assert not errors, errors
        print('PASS 30 live updates preserve card, number and category nodes plus keyboard focus')
    finally:
        browser.close()
