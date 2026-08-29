const g=new Proxy({},{get:(_,n)=>w.__G(n)}); const S=w.__S(); const out=(l,c)=>console.log((c?'PASS ':'FAIL ')+l);
try{
 const ES=g.mkUnit('ELF_SKIRM','A',6,20,20),EL=g.mkUnit('ELF','A',12,30,20),MEN=g.mkUnit('MEN_HF','A',12,40,20),OR=g.mkUnit('ORC','B',12,20,40);
 S.units=[ES,EL,MEN,OR];S.setup=true;g.renderAll();g.beginBattle();
 // force Side A initiative
 S.initiativeWinner='A';S.firstMover='A';g.advancePhase();g.renderAll();
 const cues=S.units.map(u=>[g.uName(u),g.unitStepCue(u)?.kind||null,g.unitStepCue(u)?.glyph||'']);console.log(g.curPhase().id,g.activePhaseStep()?.id,JSON.stringify(cues));
 const rings=w.document.querySelectorAll('.bs-cue-ring.can').length;const glyphs=[...w.document.querySelectorAll('.bs-cue-glyph')].map(t=>t.textContent);
 out('Initial Missile: longbow units of Side A get gold rings, others none', cues.filter(c=>c[1]==='can').length===1&&rings===1&&glyphs.every(x=>x==='\u27b6'));
 console.log('prompt:',w.document.getElementById('phase-flow-hint').textContent.slice(0,160));
 out('prompt tally shows 1 can act', /1 can act/.test(w.document.getElementById('phase-flow-hint').textContent));
}catch(e){console.log('ERR',e.stack.slice(0,900));}
try{ const ES=S.units[0],OR=S.units[3]; S.selId=ES.id;S.targetId=OR.id;g.renderAll(); const fs=g.fireState(ES,OR); console.log('fireState',fs.ok,fs.reason||''); if(fs.ok){w.document.getElementById('btn-fire').click(); g.renderAll(); out('after firing the cue turns to done', g.unitStepCue(ES)?.kind==='done'&&w.document.querySelectorAll('.bs-cue.done').length===1);} }catch(e){console.log('ERR2',e.stack.slice(0,400));}
try{ const ES=S.units[0]; console.log('after fire: shotsUsed',ES.shotsUsed,'phase',g.curPhase().id,g.activePhaseStep()?.id,'cue',JSON.stringify(g.unitStepCue(ES)),'log',[...w.document.querySelectorAll('#log > *')].slice(-2).map(x=>x.textContent.slice(0,120)).join(' | ')); }catch(e){console.log('ERR3',e.message);}
