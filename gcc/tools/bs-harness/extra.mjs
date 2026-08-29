import fs from 'node:fs';
const src=fs.readFileSync('run.mjs','utf8').replace("await new Promise(r=>setTimeout(r,3000));","await new Promise(r=>setTimeout(r,2500));\n"+fs.readFileSync('checks.js','utf8'));
fs.writeFileSync('run_extra.mjs',src);
