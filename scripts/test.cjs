const {spawnSync}=require('node:child_process');
const path=require('node:path');
for(const file of ['run','hover','host','watcher']){const r=spawnSync(process.execPath,[path.join(__dirname,'../test',file+'.js')],{stdio:'inherit',windowsHide:true});if(r.error)throw r.error;if(r.status!==0)process.exit(r.status||1);}
