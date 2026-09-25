"""Local candidate inspection; no credentials, account or network access."""
from pathlib import Path
import json, zipfile, hashlib, re
root=Path(__file__).resolve().parents[1]
p=json.loads((root/'package.json').read_text(encoding='utf8'))
file=root/'dist'/f"{p['name']}-{p['version']}-candidate.vsix"
allowed={'SECURITY.md','TROUBLESHOOTING.md','docs/INSTALLATION.md','package.json','README.md','README.zh-CN.md','CHANGELOG.md','LICENSE','LICENSE.txt','PRIVACY.md','SUPPORT.md','ACCURACY.md','HOVER.md','CONTRIBUTING.md','RELEASE.md',*[str(x.relative_to(root)).replace('\\','/') for x in (root/'src').glob('*.js')], 'media/dashboard.html','media/dashboard.css','media/dashboard.js','media/icon.png'}
with zipfile.ZipFile(file) as z:
    assert z.testzip() is None
    shipped=[]
    for name in z.namelist():
        if name in {'extension.vsixmanifest','[Content_Types].xml'}:continue
        assert name.startswith('extension/'),name
        rel=name[len('extension/'):];assert rel.lower() in {x.lower() for x in allowed},rel
        raw=z.read(name)
        if rel.endswith(('.js','.json','.md','.html','.css','.txt')):
            text=raw.decode('utf8')
            assert not re.search(r'(?:sk-[A-Za-z0-9]{24,}|ghp_[A-Za-z0-9]{30,}|BEGIN [A-Z ]*PRIVATE KEY)',text), 'Secret-like content: '+rel
            assert not re.search(r'[A-Za-z]:[\\/]Users[\\/](?!Public|Default)[^\\/\s]+',text), 'Personal path: '+rel
        shipped.append(rel)
    manifest=json.loads(z.read('extension/package.json'))
    assert not manifest.get('enabledApiProposals')
    assert not manifest.get('dependencies')
    assert 'extension/media/icon.png' in z.namelist()
report={'package':file.name,'bytes':file.stat().st_size,'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'files':sorted(shipped),'proposedApi':False,'runtimeDependencies':0,'scope':'Local package inspection only; not Marketplace approval or an exhaustive security audit'}
(root/'dist/package-report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
print(json.dumps({k:v for k,v in report.items() if k!='files'},indent=2))
