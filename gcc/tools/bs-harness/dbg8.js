const g=new Proxy({},{get:(_,n)=>w.__G(n)}); const S=w.__S(); const out=(l,c)=>console.log((c?'PASS ':'FAIL ')+l);
try{
 // geometry stability: record slot widths/positions (via computed inline style presence) across a phase walk
 const ids=['btn-magic','btn-fire','btn-pt','btn-melee','btn-melee-all','btn-charge','btn-rally','btn-elect-order','btn-pass-move','btn-pass-flow','btn-back-setup'];
 const A=g.mkUnit('MEN_HF','A',12,20,20),B=g.mkUnit('ORC','B',12,20,40),H=g.mkUnit('PCNPC','A',1,30,30);S.units=[A,B,H];S.setup=true;g.renderAll();
 const cls0=ids.map(id=>w.document.getElementById(id).className.replace(/\b(parked|flow-primary|flow-quiet|ready|armed)\b/g,'').trim());
 const disp0=ids.map(id=>w.getComputedStyle(w.document.getElementById(id)).display);
 g.beginBattle();
 let changed=0; for(let i=0;i<8;i++){ g.advancePhase(); const disp=ids.map(id=>w.getComputedStyle(w.document.getElementById(id)).display); if(disp.some((d,k)=>d!==disp0[k]))changed++; }
 out('no dock slot changes its display across a full phase walk (visibility only)', changed===0);
 out('↩ Setup visible in battle, parked in setup', !w.document.getElementById('btn-back-setup').classList.contains('parked'));
 g.backToSetup(); out('after ↩ Setup: setup mode, button parked, Begin battle shown', S.setup===true&&w.document.getElementById('btn-back-setup').classList.contains('parked')&&w.document.getElementById('btn-begin').style.display!=='none');
}catch(e){console.log('DBG8 ERR',e.stack.slice(0,900));}
