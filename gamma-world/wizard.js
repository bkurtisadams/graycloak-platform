import {wizardState,wizardRestore,wizardName,wizardSave} from './app.js';
const $=id=>document.getElementById(id);
let step=0;
const titles=['Character type','Roll attributes','Choose mutations','Starting equipment','Name your survivor'];
const help=['Choose a survivor type. Plants and robots are campaign extensions.','Roll once to create attributes and mutation slots.','Complete the required selections. Defects are assigned by the referee.','Choose equipment and body mass.','Name your survivor, then begin adventuring.'];
function noMutations(){return ['psh','robot'].includes(wizardState().species);}
function display(){for(let i=0;i<5;i++)$('step'+i).hidden=i!==step;$('wizardProgress').textContent=`Step ${step+1} of 5`;$('wizardTitle').textContent=titles[step];$('wizardHelp').textContent=help[step];$('wizardBack').disabled=step===0;$('wizardSave').disabled=!wizardState().generated;$('wizardNext').textContent=step===4?'Begin Adventure':'Next';$('wizardRoll').disabled=wizardState().generated; $('species').disabled=wizardState().generated;$('stock').disabled=wizardState().generated;$('method').disabled=wizardState().generated;$('mutationMethod').disabled=wizardState().generated;}
function act(fn){try{$('wizardError').textContent='';fn();display();}catch(e){$('wizardError').textContent=e.message;}}
$('wizardRoll').onclick=()=>act(()=>{$('builder').dispatchEvent(new Event('submit',{cancelable:true}));if(!wizardState().generated)throw Error($('status').textContent||'Unable to roll attributes');});
$('wizardBack').onclick=()=>act(()=>{step=Math.max(0,step-1);if(step===2&&noMutations())step=1;});
$('wizardNext').onclick=()=>act(()=>{if(step===0&&$('species').value==='animal'&&!$('stock').value.trim())throw Error('Enter an animal stock.');if(step===1&&!wizardState().generated)throw Error('Roll attributes first.');if(step===2&&!wizardState().ready)throw Error('Complete the required mutation selections.');if(step===4){const name=$('name').value.trim();if(!name)throw Error('Enter a survivor name.');wizardName(name);if(!wizardState().ready)throw Error('Complete the character first.');wizardSave(true);location.href='play.html';return;}step++;if(step===2&&noMutations())step=3;});
$('wizardSave').onclick=()=>act(()=>{wizardName($('name').value);wizardSave();$('wizardError').textContent='Draft saved. Resume it from Character Select.';});
for(const id of ['mutations','weapon','armor','weight','name'])$(id).addEventListener('input',()=>{$('wizardError').textContent='';});
try{const id=new URLSearchParams(location.search).get('id');if(id){wizardRestore(id);step=wizardState().ready?3:2;}}catch(e){$('wizardError').textContent=e.message;}display();
