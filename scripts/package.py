"""Compatibility entry point: use the official, locked vsce packager."""
from pathlib import Path
import subprocess, shutil, os
root=Path(__file__).resolve().parents[1]
node=shutil.which('node')
location=root/'.tools/node-location.txt'
if not node and location.exists():node=str(root/'.tools'/location.read_text().strip()/'node.exe')
if not node:raise SystemExit('Install Node.js 22+, run npm ci --ignore-scripts, then npm run package:local')
raise SystemExit(subprocess.call([node,str(root/'scripts/build.cjs')],cwd=root,creationflags=0x08000000 if os.name=='nt' else 0))
