'use strict';
const p=require('../package.json');
const missing=[];
if(!p.publisher || p.publisher==='lambo-local')missing.push('A confirmed public publisher is required.');
if(!p.name || p.name.endsWith('-local'))missing.push('A confirmed public extension name is required.');
if(!p.repository?.url?.startsWith('https://github.com/'))missing.push('A public HTTPS source repository is required.');
if(!p.bugs?.url?.startsWith('https://'))missing.push('A public HTTPS support URL is required.');
if(!p.homepage?.startsWith('https://'))missing.push('A public HTTPS homepage is required.');
if(p.enabledApiProposals?.length)missing.push('Remove proposed API dependencies.');
if(missing.length){console.error('Release metadata incomplete:\n- '+missing.join('\n- '));process.exitCode=1;}
else console.log('Public identity and link fields are present. This does not verify ownership, hosted links, Marketplace acceptance or publication authorization.');
