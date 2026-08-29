const g=new Proxy({},{get:(_,n)=>w.__G(n)}); const S=w.__S(); const out=(l,c)=>console.log((c?'PASS ':'FAIL ')+l);
try{
 const ES=g.mkUnit('ELF_SKIRM','A',6,20,20),OR=g.mkUnit('ORC','B',12,20,40);S.units=[ES,OR];S.setup=true;g.renderAll();g.beginBattle();S.initiativeWinner='A';S.firstMover='A';g.advancePhase();g.renderAll();
 const vis=id=>{const b=w.document.getElementById(id);return b&&!b.hidden&&!b.classList.contains('parked');};
 out('Initial Missile: Fire lives in the Initial column, MM proxy parked, Pass under Initial', vis('btn-fire')&&!vis('btn-fire-mm')&&vis('btn-pass-flow')&&!vis('btn-pass-mm'));
 for(let i=0;i<6&&g.curPhase().id!=='movement';i++){const pf=w.document.getElementById('btn-pass-flow');if(!pf.classList.contains('parked')&&!pf.disabled)g.passPhaseFlow();else g.advancePhase();g.renderAll();}
 console.log('phase',g.curPhase().id,'moveStep',S.moveStep,'elect',JSON.stringify(g.electState()));
 const pills=[...w.document.querySelectorAll('.pstep[data-phase="movement"] .ppill')];
 out('Movement: A/B pills are electable while the winner may still choose', g.curPhase().id==='movement'&&pills.length===2&&pills.every(p=>p.classList.contains('elect')));
 const before=S.moverSide||S.firstMover; pills.find(p=>p.textContent.trim()!==before).click(); out('clicking the other pill elects that side to move first', (S.moverSide||S.firstMover)!==before);
 out('Movement: Pass move visible, Pass parked', vis('btn-pass-move')&&!vis('btn-pass-flow')&&!vis('btn-pass-rally')&&!vis('btn-pass-mm'));
 for(let i=0;i<6&&g.curPhase().id!=='missileMagic';i++){const pm=w.document.getElementById('btn-pass-move');if(!pm.classList.contains('parked')&&!pm.disabled)pm.click();else g.advancePhase();g.renderAll();}
 console.log('now',g.curPhase().id, g.activePhaseStep()?.kind);
 if(g.curPhase().id==='missileMagic'){out('M&M: Fire proxy in the Missile column, Initial Fire parked, Pass under M&M', !vis('btn-fire')&&vis('btn-pass-mm')&&!vis('btn-pass-flow'));}
 const widths=[...w.document.querySelectorAll('.pstep')].map(p=>p.dataset.phase); console.log('rail cells',widths.join(','));
}catch(e){console.log('ERR',e.stack.slice(0,900));}
