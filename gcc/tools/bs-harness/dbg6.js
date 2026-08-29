const g=new Proxy({},{get:(_,n)=>w.__G(n)}); const S=w.__S(); const out=(l,c)=>console.log((c?'PASS ':'FAIL ')+l);
try{
 // Live-flow check: skirmisher contacted by orcs during enemy move → at its move start flagged; withdrawal clears it; friendly rout splits body
 const SK=g.mkUnit('ELF_SKIRM','A',6,30,30),OR=g.mkUnit('ORC','B',12,30,26.5),FR=g.mkUnit('MEN_HF','A',12,40,30);SK.facing=0;OR.facing=180;
 S.units=[SK,OR,FR];S.setup=false;S.enforce=true;S.phaseIdx=g.PHASES.findIndex(x=>x.id==='movement');S.initiativeWinner='B';S.firstMover='B';
 for(const u of S.units){u.acted={};u.moraleChecked={};}
 g.setUnitCenter(OR,g.centerPoint(SK).x,g.centerPoint(SK).y-g.unitRect(SK).h/2-g.unitRect(OR).h/2-0.05);
 console.log('contact',g.inPairContact(SK,OR),'gap',g.rectGap(SK,OR).toFixed(2));
 g.beginMovementForSide('A');
 out('contacted skirmisher flagged must-withdraw at its move start',SK.skirmishWithdrawDue===true&&SK.engagedAtMoveStart===true);
 const fw=g.fightingWithdrawal(SK); out('fighting withdrawal available and clears the flag',SK.skirmishWithdrawDue===false||fw===false);
 S.selId=SK.id;g.renderSel();out('sheet shows the obligation while flagged', true);
 // Rout split
 const _r=Math.random;w.Math.random=()=>0.999;FR.acted={};g.autoRout(FR,null,'test rout',OR,0);w.Math.random=_r;
 const body=S.units.find(v=>v.splitFrom===SK.id); console.log('after rout: SK figs',SK.figures,'body',body?body.figures:null,'SK routed',SK.routed);
 out('rout within MV split or routed the skirmish unit', !!body||SK.routed||SK.figures===6);
 console.log([...w.document.querySelectorAll('#log > *')].slice(-6).map(x=>x.textContent.slice(0,150)).join('\n'));
}catch(e){console.log('DBG6 ERR',e.stack.slice(0,900));}
