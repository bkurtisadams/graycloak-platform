const g=new Proxy({},{get:(_,n)=>w.__G(n)}); const S=w.__S();
try{
 const A=g.mkUnit('ELF_SKIRM','A',6,20,20),B=g.mkUnit('ORC','B',12,20,40);S.units=[A,B];S.setup=true;g.renderAll();g.beginBattle();
 const walk=[];for(let i=0;i<9;i++){S.selId=A.id;g.renderAll();const h=w.document.getElementById('phase-flow-hint');walk.push(`${g.curPhase().id}/${g.activePhaseStep()?.id||'-'} :: ${h.textContent.slice(0,150)} :: fire=${!w.document.getElementById('btn-fire').disabled}`);const pf=w.document.getElementById('btn-pass-flow');if(!pf.classList.contains('parked')&&!pf.disabled)g.passPhaseFlow();else g.advancePhase();}
 console.log(walk.join('\n'));
}catch(e){console.log('ERR',e.stack.slice(0,900));}
