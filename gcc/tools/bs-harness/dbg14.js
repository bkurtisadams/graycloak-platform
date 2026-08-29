const g=new Proxy({},{get:(_,n)=>w.__G(n)}); const S=w.__S(); const out=(l,c)=>console.log((c?'PASS ':'FAIL ')+l);
try{ const V=g.mkUnit('PCNPC','A',1,20,20),O=g.mkUnit('ORC','B',12,30,30);S.units=[V,O];S.setup=true;S.selId=V.id;S.targetId=O.id;g.renderAll();
 const pip=w.document.querySelector('[data-uid="'+O.id+'"] [data-fig="2"]'); out('targeted unit renders clickable pips', !!pip);
 pip.dispatchEvent(new w.MouseEvent('mousedown',{bubbles:true,clientX:0,clientY:0}));
 const pip2=w.document.querySelector('[data-uid="'+O.id+'"] [data-fig="7"]'); pip2.dispatchEvent(new w.MouseEvent('mousedown',{bubbles:true,shiftKey:true,clientX:0,clientY:0}));
 out('pips on the target build a figure-target set', S.figTarget&&S.figTarget.unitId===O.id&&S.figTarget.slots.length===2&&S.selId===V.id);
 out('targeted pips highlighted', w.document.querySelectorAll('.fig-targeted').length===2);
 const ov=g.figureTargetOverride(O,4); out('override lists the chosen figures', ov&&ov[0].count===2&&ov[0].figureIndexes.join(',')==='2,7');
 const ov1=g.figureTargetOverride(O,1); out('hold-person cap trims to the count', ov1[0].count===1);
 S.targetId=null; g.pruneExtraTargets(); out('clearing the target clears figure targets', !S.figTarget);
}catch(e){console.log('ERR',e.stack.slice(0,700));}
