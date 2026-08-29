const g=new Proxy({},{get:(_,n)=>w.__G(n)}); const S=w.__S(); const out=(l,c)=>console.log((c?'PASS ':'FAIL ')+l);
try{ const F=g.mkUnit('MEN_HF','A',12,30,30);S.units=[F];S.setup=true;S.selId=F.id;g.renderAll();
 const pip=w.document.querySelector('[data-uid="'+F.id+'"] [data-fig="5"]'); out('selected unit renders clickable pips', !!pip);
 pip.dispatchEvent(new w.MouseEvent('mousedown',{bubbles:true,clientX:0,clientY:0}));
 out('mousedown on a pip selects that figure', S.figSel&&S.figSel.unitId===F.id&&S.figSel.slots.includes(5));
 const pip2=w.document.querySelector('[data-uid="'+F.id+'"] [data-fig="11"]'); pip2.dispatchEvent(new w.MouseEvent('mousedown',{bubbles:true,shiftKey:true,clientX:0,clientY:0}));
 out('shift+mousedown adds a second figure', S.figSel.slots.length===2);
 out('selected pips are highlighted', w.document.querySelectorAll('.fig-selected').length===2);
}catch(e){console.log('ERR',e.stack.slice(0,700));}
