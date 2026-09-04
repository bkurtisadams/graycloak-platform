// @graycloak/battlesystem-engine magic-healing.js v0.1.0 - 2026-09-04
// Pure BATTLESYSTEM §14.16 curative-magic vocabulary and hit-dice arithmetic.
// Hosts own spell expenditure, target selection, state mutation, logs, and UI.
//
// §14.16: on a figure representing more than one creature that carries a
// Wound marker, cure light/serious/critical wounds cure 1 HD per spell level;
// heal, regeneration, restoration and resurrection cure 2 HD per spell level;
// the marker is removed once the total cured by such magic equals ½ the
// figure's HD. Raise dead returns one individual to life who cannot fight for
// the rest of the battle (Immobilized). A limited wish or alter reality removes
// one Wound marker; a wish removes two or brings one figure back to life. Magic
// that cures hit points rather than hit dice restores hp ÷ 4 HD. On a figure
// representing a single individual, curative magic works by the normal AD&D
// rules (hp).

const HEALING_SPELLS = Object.freeze([
  { name:'Cure Light Wounds',    key:'cure-light-wounds',    level:1, mode:'hd', hdPerLevel:1, hpExpr:'1d8',    range:'touch' },
  { name:'Cure Serious Wounds',  key:'cure-serious-wounds',  level:4, mode:'hd', hdPerLevel:1, hpExpr:'2d8+1',  range:'touch' },
  { name:'Cure Critical Wounds', key:'cure-critical-wounds', level:5, mode:'hd', hdPerLevel:1, hpExpr:'3d8+3',  range:'touch' },
  { name:'Cureall',              key:'cureall',              level:6, mode:'hd', hdPerLevel:2, hpExpr:'all',    range:'touch' },
  { name:'Heal',                 key:'heal',                 level:6, mode:'hd', hdPerLevel:2, hpExpr:'all-1d4',range:'touch' },
  { name:'Regeneration',         key:'regeneration',         level:7, mode:'hd', hdPerLevel:2, hpExpr:'all',    range:'touch' },
  { name:'Restoration',          key:'restoration',          level:7, mode:'hd', hdPerLevel:2, hpExpr:'none',   range:'touch' },
  { name:'Resurrection',         key:'resurrection',         level:7, mode:'hd', hdPerLevel:2, hpExpr:'all',    range:'touch' },
  { name:'Raise Dead',           key:'raise-dead',           level:5, mode:'raise',                              range:'touch' },
  { name:'Raise Dead Fully',     key:'raise-dead-fully',     level:5, mode:'raise',                              range:'touch' },
  { name:'Limited Wish',         key:'limited-wish',         level:7, mode:'wound', markers:1 },
  { name:'Alter Reality',        key:'alter-reality',        level:7, mode:'wound', markers:1 },
  { name:'Wish',                 key:'wish',                 level:9, mode:'wish',  markers:2 }
]);

function textKey(value='') {
  return String(value||'').toLowerCase().replace(/[’']/g,"'").replace(/[^a-z0-9]+/g,' ').trim();
}

const HEALING_BY_KEY = Object.freeze(Object.fromEntries(HEALING_SPELLS.map(s=>[textKey(s.name),s])));

function entryTexts(entry={}) {
  return [entry?.functionName,entry?.name,entry?.sourceName].map(textKey).filter(Boolean);
}

function healingSpec(entry={}) {
  const texts=entryTexts(entry);
  for(const t of texts)if(HEALING_BY_KEY[t])return HEALING_BY_KEY[t];
  const keys=Object.keys(HEALING_BY_KEY).sort((a,b)=>b.length-a.length);
  for(const t of texts)for(const key of keys)if((` ${t} `).includes(` ${key} `))return HEALING_BY_KEY[key];
  return null;
}

function healingProfile(entry={},opts={}) {
  const spec=healingSpec(entry);if(!spec)return null;
  const level=Math.max(1,Math.round(Number(entry?.level)||spec.level));
  const touch=spec.range==='touch';
  const hdCured=spec.mode==='hd'?level*spec.hdPerLevel:0;
  const what=spec.mode==='hd'?`${hdCured} HD cured on a wounded mass figure (${spec.hdPerLevel} HD per spell level · L${level}) · marker removed at ½ the figure's HD cured`
    :spec.mode==='raise'?'one individual returns to life and cannot fight for the rest of the battle (Immobilized)'
    :spec.mode==='wound'?'removes one Wound marker'
    :'removes a Wound marker or brings one lost figure back';
  return Object.freeze({
    healingMagic:true,
    healingKey:spec.key,
    healingName:spec.name,
    healingMode:spec.mode,
    healingHd:hdCured,
    healingHpExpr:spec.hpExpr||null,
    healingMarkers:spec.markers||0,
    sourceSection:'14.16',
    defaultTarget:'target',
    saveType:'none',
    lockSaveType:true,
    passThroughFire:false,
    rangeIn:touch?(Number.isFinite(Number(opts.touchRangeIn))?Number(opts.touchRangeIn):1):null,
    executionResolver:'healing',
    automation:spec.mode==='wish'?'partial':'full',
    label:`${spec.name} · curative magic [14.16] · ${touch?'touch':'no range'} · ${what}`
  });
}

// §14.16: hp-based cures restore hp ÷ 4 HD (round ½ and higher up, as [14.5]).
function hpToHd(hp) {
  const n=Number(hp);if(!Number.isFinite(n)||n<=0)return 0;
  return Math.round(n/4);
}

// Cumulative cure against one Wound marker. `healedSoFar` is the HD already cured
// on this marker by earlier magic; the marker clears at ½ the figure's HD.
function cureWound(figureHd,healedSoFar,curedNow) {
  const hd=Math.max(0,Number(figureHd)||0),before=Math.max(0,Number(healedSoFar)||0),now=Math.max(0,Number(curedNow)||0);
  const threshold=hd/2,total=before+now,removed=hd>0&&total>=threshold-1e-9;
  return Object.freeze({threshold,before,cured:now,total,removed,carry:removed?0:total});
}

export const BattlesystemMagicHealing = Object.freeze({
  spells:HEALING_SPELLS,
  textKey,
  healingSpec,
  healingProfile,
  hpToHd,
  cureWound
});
