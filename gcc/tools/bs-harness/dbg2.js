const g=new Proxy({},{get:(_,n)=>w.__G(n)}); const S=w.__S(); const out=(l,c)=>console.log((c?'PASS ':'FAIL ')+l);
try{
 const MA=g.mkUnit('MEN_HF','A',12,30,20),O1=g.mkUnit('ORC','B',6,30,20),O2=g.mkUnit('ORC','B',6,30,20);MA.formation='closed';O1.formation='closed';O2.formation='closed';
 g.setUnitCenter(MA,30,20);MA.facing=0;const r=g.unitRect(MA);
 g.setUnitCenter(O1,30-2.2,20-r.h/2-1.1);g.setUnitCenter(O2,30+2.2,20-r.h/2-1.1);O1.facing=180;O2.facing=180;
 S.units=[MA,O1,O2];S.setup=false;S.enforce=true;S.phaseIdx=g.PHASES.findIndex(x=>x.id==='melee');S.meleeResolvedPairs=[];S.meleeDeferred=[];S.meleeAllocations={};for(const u of S.units){u.acted={};u.moraleChecked={};}
 console.log('contacts',g.meleeContactEnemies(MA).length,'pf',g.presentedFrontage(MA),'arc',g.arcOf(MA,O1),g.arcOf(MA,O2),'ci',g.contactInfo(MA,O1),g.contactInfo(MA,O2));
 const al=g.meleeAllocationOf(MA); console.log('alloc',JSON.stringify(al.enemies));
 out('frontal two-enemy split sums to ≤ frontage with one side extra each', Object.values(al.enemies).reduce((n,e)=>n+e.contact,0)<=g.presentedFrontage(MA)&&Object.values(al.enemies).every(e=>e.side===1));
 S.selId=MA.id; g.renderSel(); const btn=[...w.document.querySelectorAll('#sel-pane button')].find(b=>/Designate figures/.test(b.textContent)); out('Designate figures… button appears on the unit sheet', !!btn);
 btn.click(); const dlg=w.document.querySelector('.melee-allocation-editor'); out('dialog opens with one row per opponent', !!dlg&&dlg.querySelectorAll('[data-alloc]').length===2);
 const rows=dlg.querySelectorAll('[data-alloc]'); rows[0].querySelector('[data-alloc-contact]').value='7'; rows[1].querySelector('[data-alloc-contact]').value='5'; rows[0].querySelector('[data-alloc-contact]').dispatchEvent(new w.Event('input'));
 out('over-allocation disables Save', dlg.querySelector('#mal-save').disabled===true);
 rows[0].querySelector('[data-alloc-contact]').value='4'; rows[1].querySelector('[data-alloc-contact]').value='2'; rows[0].querySelector('[data-alloc-side]').value='1'; rows[1].querySelector('[data-alloc-side]').value='0'; rows[0].querySelector('[data-alloc-contact]').dispatchEvent(new w.Event('input'));
 dlg.querySelector('#mal-save').click();
 const a2=S.meleeAllocations[MA.id]; out('manual designation saved', a2.manual===true&&a2.enemies[String(O1.id)].contact===4&&a2.enemies[String(O2.id)].contact===2);
 out('resolver uses the manual designation per pair', g.meleeAllocationFor(MA,O1).contactFrontage===4&&g.meleeAllocationFor(MA,O2).contactFrontage===2&&g.meleeAllocationFor(MA,O2).sideExtras===0);
}catch(e){console.log('DBG2 ERR',e.stack.slice(0,1500));}
