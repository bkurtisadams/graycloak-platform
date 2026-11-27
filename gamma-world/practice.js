import {readCampaign} from './campaign.js';
import {survivorStatus} from './roster.js';
const select=document.getElementById('practiceRoster');
for(const e of Object.values(readCampaign().characters)){if(!survivorStatus(e).ready)continue;const o=document.createElement('option');o.value=e.id;o.textContent=e.record.base.name||'Unnamed survivor';select.append(o);}
document.getElementById('practiceStart').onclick=()=>{const e=readCampaign().characters[select.value];if(e)sessionStorage.setItem('graycloak.gw.sandbox.character',JSON.stringify(e.record));else sessionStorage.removeItem('graycloak.gw.sandbox.character');location.href='tactical.html';};
