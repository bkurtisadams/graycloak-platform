const g=new Proxy({},{get:(_,n)=>w.__G(n)}); const $=s=>w.document.querySelector(s); const out=(l,c)=>console.log((c?'PASS ':'FAIL ')+l);
try{
 w.__S().setup=true; const H=g.mkUnit('PCNPC','A',1,20,20); H.char.name='Ogre Mage'; w.__S().units=[H]; w.__S().selId=H.id;
 H.char.inventory=g.normalizeCharacterInventory({items:[
  {id:'sw',name:'Longsword +1',kind:'weapon',sourceType:'weapon',state:'equipped',weaponData:{sm:'1d8+1',l:'1d12+1',hit:1,dmod:1,magic:true,magicPlus:1}},
  {id:'cl',name:'Claw',kind:'weapon',sourceType:'weapon',state:'carried',weaponData:{sm:'2d5',l:'2d5'}},
  {id:'rm',name:'Ring Mail',kind:'armor',sourceType:'armor',state:'equipped',armorData:{ac:7}}],mainWeapon:'sw',weaponsCanonical:true});
 g.renderSel();
 const txt=$('#sel-pane').textContent;
 out('play view lists both weapon rows (no Fights-with select without routines)', /Longsword \+1/.test(txt)&&/Claw/.test(txt)&&!$('#ch-active-attack'));
 out('play view marks the approximated CRT die for 2d5', !!$('#sel-pane .char-attack-approx'));
 out('Ring Mail stayed armor', g.characterInventory(H).items.find(x=>x.id==='rm').kind==='armor'&&g.characterInventory(H).armor==='rm');
 // unassign primary via inventory API
 g.setCharacterInventoryAssignment(H,'sw','');
 const inv=g.characterInventory(H);
 out('Unassigning Primary leaves it empty (explicit)', inv.mainWeapon===''&&inv.mainWeaponExplicit===true);
 out('No weapon in hand → melee problem names Fights with', /Fights with/.test(g.individualMeleeWeaponProblem(H)));
 g.setCharacterInventoryAssignment(H,'cl','mainWeapon');
 out('Reassigning Primary clears explicit flag', g.characterInventory(H).mainWeapon==='cl'&&!g.characterInventory(H).mainWeaponExplicit);
 const fr=g.fallbackIndividualAttackRoutine(H); out('Claw primary → §9.4B routine sm 2d5', fr.components[0].sm==='2d5');
 const wp=g.weaponProfile(H); out('Claw primary → §9.4A CRT approximated', wp.approximated===true&&wp.sourceExpr==='2d5');
 // edit mode: add natural routine via DOM, remove Claw weapon row
 w.__S().editId=H.id; g.renderSel();
 const rows=[...w.document.querySelectorAll('#ch-attack-rows [data-atk-row]')];
 out('editor shows 2 weapon rows', rows.length===2);
 rows.find(r=>r.dataset.atkItem==='cl').querySelector('[data-atk-delete]').click();
 $('#ch-atk-add').click(); let row=$('#ch-attack-rows').lastElementChild; row.querySelector('[data-atk-name]').value='Bite'; row.querySelector('[data-atk-dmg]').value='1d10'; let gsel=row.querySelector('[data-atk-group]'); gsel.value='__new'; gsel.dispatchEvent(new w.Event('change'));
 const rid=gsel.value;
 $('#ch-atk-add').click(); row=$('#ch-attack-rows').lastElementChild; row.querySelector('[data-atk-name]').value='Claw'; row.querySelector('[data-atk-dmg]').value='2d5'; gsel=row.querySelector('[data-atk-group]'); gsel.value=rid; gsel.dispatchEvent(new w.Event('change'));
 const strip=$('#ch-attack-routines-edit [data-rt-row]'); strip.querySelector('[data-rt-name]').value='Claw / Bite'; strip.querySelector('input[name="ch-active-attack"]').checked=true;
 g.applyCharacterEdit(H);
 const inv2=g.characterInventory(H), rt=g.configuredAttackRoutines(H)[0];
 out('Apply removed Claw weapon item and kept Longsword', !inv2.items.some(x=>x.id==='cl')&&inv2.items.some(x=>x.id==='sw'));
 out('Apply created routine Claw / Bite with 2 components in order', rt&&rt.name==='Claw / Bite'&&rt.components.map(c=>c.name).join('/')==='Bite/Claw');
 out('Routine is active', g.activeConfiguredAttackRoutine(H)?.id===rt.id&&g.effectiveIndividualAttackRate(H)==='1/1');
 out('§9.4A with active routine uses heaviest component (Claw 2d5 avg 6 > Bite 1d10 avg 5.5)', g.weaponProfile(H).sourceExpr.includes('Claw 2d5'));
 // play view switch back to weapon via select
 g.renderSel(); const sel=$('#ch-active-attack'); out('select shows routine active', sel.value===rt.id);
 sel.value='weapon'; sel.dispatchEvent(new w.Event('change'));
 out('switching to Weapon in hand works in Setup', g.activeConfiguredAttackRoutine(H)===null&&H.prof.activeAttackRoutineId==='weapon');
 // rollDamage integration through engine
 const rd=w.__ENGINE__.BattlesystemIndividualCombat.rollDamage('2d5',()=>0.999); out('engine 2d5 max = 10', rd.total===10);
 // JSON export/import survives? check normalize keeps explicit flag
 const back=g.normalizeCharacterInventory(JSON.parse(JSON.stringify(g.characterInventory(H)))); out('inventory JSON round trip keeps explicit empty Primary', back.mainWeapon===''&&back.mainWeaponExplicit===true);
 console.log('LOG TAIL:', [...w.document.querySelectorAll('#log .log-entry, #log > *')].slice(-3).map(x=>x.textContent.slice(0,160)).join(' | '));
}catch(e){console.log('CHECK ERR',e.stack.slice(0,1500));}
try{
 const H2=g.mkUnit('PCNPC','A',1,25,25); H2.char.name='Val Test'; w.__S().units.push(H2); w.__S().selId=H2.id; w.__S().editId=null;
 H2.char.inventory=g.normalizeCharacterInventory({items:[{id:'fb',name:'Frost Brand Sword, Long',kind:'weapon',sourceType:'weapon',state:'equipped',weaponData:{sm:'1d8',l:'1d12',hit:3,dmod:3,magic:true,magicPlus:3}},{id:'bow',name:'longbow +2',kind:'weapon',sourceType:'weapon',state:'carried',weaponData:{sm:'1d6',l:'1d6',hit:2,dmod:2,magic:true,magicPlus:2}}],mainWeapon:'fb',weaponsCanonical:true});
 g.renderSel(); const pane=$('#sel-pane'), t=pane.textContent;
 const rows=[...pane.querySelectorAll('.char-attack-read:not(.head)')];
 out('conventional +3 weapon shows no repeated mods', rows[0]&&/Frost Brand Sword, Long \+3/.test(rows[0].textContent)&&rows[0].children[2].textContent.trim()==='—');
 out('no Fights-with select when hero has no routines', !$('#ch-active-attack')&&!!$('#ch-attack-routines'));
 out('helper captions gone', !/one place|reusable defense|Preparation\/access/.test(t));
 out('Inventory is a single line with Armor/Rings/Ready + button', !!pane.querySelector('.char-flat-inv')&&pane.querySelectorAll('[data-char-section-body="loadout"]').length===1&&!!$('#ch-inventory'));
 out('Details collapsed by default; Command/Round visible', [...pane.querySelectorAll('[data-char-section-body="details"]')].every(x=>x.hidden)&&/Command/.test(t)&&/Round/.test(t));
 out('Effects and AR-modifiers rows omitted when empty', !pane.querySelector('.char-flat-effects')&&!/THACO \/ AR MODIFIERS/.test(t));
 out('Ammunition spans below combat block', !!pane.querySelector('.char-flat-ammo')&&/Normal arrows/.test(t));
 out('all sheet buttons carry the small ruled class', [...pane.querySelectorAll('.unit-sheet button')].every(b=>b.classList.contains('char-flat-btn')));
 pane.querySelector('[data-char-section="details"]').click(); out('Details toggles open', [...pane.querySelectorAll('[data-char-section-body="details"]')].every(x=>!x.hidden));
}catch(e){console.log('CHECK2 ERR',e.stack.slice(0,1200));}
