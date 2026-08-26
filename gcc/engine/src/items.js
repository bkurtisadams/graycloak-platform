// @graycloak/battlesystem-engine items.js v0.6.0 - 2026-08-26
// Pure canonical character-item, loadout, resource, action, and effect helpers.
// Host adapters own actor/character documents, UI, import dialogs, battlefield state,
// logging, undo, and serialization. This module mutates only explicitly supplied
// canonical inventory/item objects and never normalizes during read-only predicates.

import { BattlesystemEffects } from './effects.js';
import { BattlesystemActions, CHARACTER_ACTION_KINDS } from './actions.js';

const MAGIC_ITEM_TYPES = Object.freeze(['wand','staff','rod','ring','scroll','potion','misc']);
const MAGIC_ITEM_TYPE_LABELS = Object.freeze({wand:'Wand',staff:'Staff',rod:'Rod',ring:'Ring',scroll:'Scroll',potion:'Potion',misc:'Misc.'});
const MAGIC_ITEM_DEFAULT_LEVEL = Object.freeze({wand:6,staff:8,ring:12});

// Existing v0.44.15 reference item. Item-specific spell effects remain data here;
// battlefield spell resolution still belongs to the host/spell layer.
const MAGIC_ITEM_LIBRARY = Object.freeze({
  'wand of fire':Object.freeze({type:'wand',effectiveLevel:6,rechargeable:true,usesPerRound:1,functions:Object.freeze([
    Object.freeze({name:'Burning Hands',chargeCost:1,defaultTarget:'area',preset:Object.freeze({level:6,shape:'cone',sourceLength:1.2,sourceWidth:1,saveType:'none',damageExpr:'6',saveEffect:'none',damageTag:'fire',label:'Wand of Fire · Burning Hands · 12′ fan, 10′ wide at terminus · 6 hp · 1 charge'})}),
    Object.freeze({name:'Fireball',chargeCost:2,defaultTarget:'area',damageFloor:2,preset:Object.freeze({level:6,rangeIn:16,shape:'circle',sourceLength:2,saveType:'rsw',damageExpr:'6d6',saveEffect:'half',damageTag:'fire',damageFloor:2,label:'Wand of Fire · Fireball · effective MU 6 · range 16″ · 2″ radius · 6d6 (each die minimum 2) · save vs Rod/Staff/Wand for half · 2 charges'})}),
    Object.freeze({name:'Pyrotechnics',chargeCost:1,preset:Object.freeze({level:6,label:'Wand of Fire · Pyrotechnics · duplicates the spell · 1 charge; spell-specific smoke/firework geometry remains referee-set'})}),
    Object.freeze({name:'Wall of Fire',chargeCost:2,defaultTarget:'area',preset:Object.freeze({level:6,durationRounds:6,damageTag:'fire',label:'Wand of Fire · Wall of Fire · 12 square AD&D inches or 2¼″ ring · 6 rounds · touch/proximity damage is position-specific · 2 charges'})})
  ])})
});

const CHARACTER_ITEM_SCHEMA = 2;
const CHARACTER_INVENTORY_NORMALIZED = Symbol('bsCharacterInventoryNormalized');
const ACTIVE_GEAR_KINDS = Object.freeze(['ring','weapon','armor','shield']);

function magicItemKey(name='') {
  return String(name||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
}

function magicItemTypeFromName(name='') {
  const k=magicItemKey(name);
  if(/^wand\b/.test(k)||/\bwand\b/.test(k))return'wand';
  if(/^staff\b/.test(k)||/\bstaff\b/.test(k))return'staff';
  if(/^rod\b/.test(k)||/\brod\b/.test(k))return'rod';
  if(/^ring\b/.test(k)||/\bring\b/.test(k))return'ring';
  if(/^scroll\b/.test(k)||/\bscroll\b/.test(k))return'scroll';
  if(/^potion\b/.test(k)||/\bpotion\b/.test(k))return'potion';
  return'misc';
}

function magicItemLibrarySpec(name='') {
  return MAGIC_ITEM_LIBRARY[magicItemKey(name)]||null;
}

function magicNullableInt(v) {
  if(v===null||v===undefined||String(v).trim()==='')return null;
  const n=Number(v);
  return Number.isFinite(n)?Math.max(0,Math.round(n)):null;
}

function nullableNumber(v) {
  if(v===null||v===undefined||String(v).trim()==='')return null;
  const n=Number(v);
  return Number.isFinite(n)?n:null;
}

function normalizeMagicItemFunction(raw={}) {
  raw=raw&&typeof raw==='object'?raw:{};
  const name=String(raw.name||raw.functionName||'Use item').trim()||'Use item';
  return {
    name,
    chargeCost:Math.max(0,Math.round(Number(raw.chargeCost??raw.cost)||0)),
    effectiveLevel:magicNullableInt(raw.effectiveLevel??raw.level),
    defaultTarget:['self','target','area','none'].includes(raw.defaultTarget)?raw.defaultTarget:null,
    damageFloor:Math.max(1,Math.round(Number(raw.damageFloor)||1)),
    preset:raw.preset&&typeof raw.preset==='object'?{...raw.preset}:null,
    notes:String(raw.notes||'').trim()
  };
}

function normalizeMagicItem(raw={},index=0) {
  if(typeof raw==='string')raw={name:raw};
  raw=raw&&typeof raw==='object'?raw:{};
  const name=String(raw.name||'').trim();
  if(!name)return null;
  const lib=magicItemLibrarySpec(name), inferred=magicItemTypeFromName(name), type=MAGIC_ITEM_TYPES.includes(raw.type)?raw.type:(lib?.type||inferred);
  const explicitLevel=magicNullableInt(raw.effectiveLevel??raw.casterLevel), effectiveLevel=explicitLevel??magicNullableInt(lib?.effectiveLevel??MAGIC_ITEM_DEFAULT_LEVEL[type]);
  const current=magicNullableInt(raw.current??raw.charges??raw.doses??raw.usesRemaining), maximum=magicNullableInt(raw.maximum??raw.maxCharges??raw.maxDoses??raw.maxUses);
  const rechargeable=typeof raw.rechargeable==='boolean'?raw.rechargeable:(lib?.rechargeable??(['wand','staff','rod'].includes(type)));
  const usesPerRound=magicNullableInt(raw.usesPerRound)??magicNullableInt(lib?.usesPerRound), id=String(raw.id||`mi-${magicItemKey(name).replace(/\s+/g,'-')||'item'}-${index+1}`);
  const functions=Array.isArray(raw.functions)?raw.functions.map(normalizeMagicItemFunction).filter(Boolean):[];
  return {
    id,name,type,current,maximum,rechargeable,effectiveLevel,usesPerRound,functions,
    notes:String(raw.notes||'').trim(),resourceKind:String(raw.resourceKind||'').trim().toLowerCase(),
    inventoryId:String(raw.inventoryId||raw.sourceItemId||''),passive:!!raw.passive,
    sourceState:String(raw.sourceState||''),sourceType:String(raw.sourceType||''),
    lastUseRound:Number.isFinite(Number(raw.lastUseRound))?Number(raw.lastUseRound):null,
    usesInLastRound:Math.max(0,Math.round(Number(raw.usesInLastRound)||0)),
    depleted:current!=null&&current>0?false:(!!raw.depleted||(current===0&&['wand','staff','rod'].includes(type)))
  };
}

function normalizeMagicItemData(raw,legacyText='') {
  const list=Array.isArray(raw)?raw:[];
  let out=list.map((x,i)=>normalizeMagicItem(x,i)).filter(Boolean);
  if(!out.length)out=String(legacyText||'').split(/[\n;,]+/).map(x=>x.trim()).filter(Boolean).map((name,i)=>normalizeMagicItem({name},i)).filter(Boolean);
  const seen=new Set();
  return out.filter(x=>{const k=x.id||magicItemKey(x.name);if(seen.has(k))return false;seen.add(k);return true;});
}

function magicItemFunctions(item) {
  if(!item)return[];
  const lib=magicItemLibrarySpec(item.name), src=item.functions?.length?item.functions:(lib?.functions||[]);
  if(src.length)return src.map(normalizeMagicItemFunction);
  if(item.passive)return[];
  const cost=['wand','staff','rod'].includes(item.type)||item.type==='potion'||item.type==='scroll'?1:0;
  return[normalizeMagicItemFunction({name:'Use item',chargeCost:cost,effectiveLevel:item.effectiveLevel})];
}

function magicItemResourceKind(item) {
  const custom=String(item?.resourceKind||'').trim().toLowerCase();
  if(custom)return custom;
  return ['wand','staff','rod'].includes(item?.type)?'charges':item?.type==='potion'?'doses':item?.type==='scroll'?'inscriptions':'uses';
}

function magicItemResourceUnit(kind,count=1,short=false) {
  if(kind==='charges')return short?'ch':`charge${count===1?'':'s'}`;
  if(kind==='doses')return short?'dose':`dose${count===1?'':'s'}`;
  if(kind==='inscriptions')return short?'spell':`spell${count===1?'':'s'}`;
  if(kind==='fuel')return'fuel';
  return short?'use':`use${count===1?'':'s'}`;
}

function magicItemResourceLabel(item) {
  if(!item)return'';
  const kind=magicItemResourceKind(item),cur=item.current,max=item.maximum;
  if(cur==null&&max==null)return kind==='uses'?'':`${kind} not recorded`;
  return`${cur==null?'?':cur}${max==null?'':`/${max}`} ${magicItemResourceUnit(kind,cur??2,true)}${kind==='fuel'?'':(cur===1?'':'s')}`;
}

function magicItemFunctionSummary(item) {
  return magicItemFunctions(item).map(f=>`${f.name}${f.chargeCost?` (${f.chargeCost} ${magicItemResourceUnit(magicItemResourceKind(item),f.chargeCost,true)})`:''}`).join(' · ');
}

function normalizeEffect(raw={},index=0) {
  return BattlesystemEffects.normalize(raw,index,{defaultCondition:'equipped'});
}

function normalizeAction(raw={},index=0) {
  return BattlesystemActions.normalize(raw,index,{allowedKinds:CHARACTER_ACTION_KINDS,fallbackKind:'useItem'});
}

function normalizeWeaponData(raw=null) {
  if(!raw||typeof raw!=='object')return null;
  const out={};
  for(const k of ['hit','dmod','rangeS','rangeM','rangeL','magicPlus'])if(raw[k]!==undefined&&raw[k]!==null&&String(raw[k]).trim()!=='')out[k]=k.startsWith('range')?String(raw[k]).trim():Number(raw[k])||0;
  for(const k of ['sm','l','atOverride'])if(raw[k]!==undefined&&raw[k]!==null&&String(raw[k]).trim()!=='')out[k]=String(raw[k]).trim();
  for(const k of ['magic','silver','sharpness','fire','acid'])if(raw[k])out[k]=true;
  return out;
}

function normalizeArmorData(raw=null) {
  if(!raw||typeof raw!=='object')return null;
  const ac=nullableNumber(raw.ac),bonus=nullableNumber(raw.bonus??raw.acBonus),notes=String(raw.notes||'').trim();
  if(ac==null&&bonus==null&&!notes)return null;
  return{ac,bonus,notes};
}

function gearKind(raw={}) {
  const name=String(raw.name||''),type=String(raw.sourceType||raw.type||'item').toLowerCase(),alias=String(raw.alias||'').toLowerCase();
  if(/^ring\b/i.test(name)||alias==='ring')return'ring';
  if(/\bshield\b/i.test(name)||alias==='shield')return'shield';
  if(type==='weapon')return'weapon';
  if(type==='armor')return'armor';
  if(type==='potion')return'potion';
  if(type==='scroll')return'scroll';
  if(type==='container')return'container';
  return'item';
}

function normalizeGearItem(raw={},index=0) {
  raw=raw&&typeof raw==='object'?raw:{};
  const name=String(raw.name||'').trim();
  if(!name)return null;
  const id=String(raw.id||raw.sourceItemId||`gear-${index+1}`),state=['equipped','carried','nocarried'].includes(raw.state)?raw.state:'carried',kind=gearKind(raw);
  const weaponData=normalizeWeaponData(raw.weaponData||raw.weapon),armorData=normalizeArmorData(raw.armorData||raw.armor),effects=(Array.isArray(raw.effects)?raw.effects:[]).map(normalizeEffect).filter(Boolean),actions=(Array.isArray(raw.actions)?raw.actions:[]).map(normalizeAction).filter(Boolean);
  const magicData=raw.magicData&&typeof raw.magicData==='object'?normalizeMagicItem({...raw.magicData,name:raw.magicData.name||name,inventoryId:id}):null;
  const weight=raw.weight===null||raw.weight===undefined||String(raw.weight).trim()===''?null:(Number.isFinite(Number(raw.weight))?Number(raw.weight):null),weaponMagic=!!weaponData?.magic||Number(weaponData?.magicPlus)>0;
  return{id,name,kind,sourceType:String(raw.sourceType||raw.type||'item'),state,magic:!!raw.magic||!!magicData||weaponMagic,identified:raw.identified!==false,quantity:Math.max(1,Math.round(Number(raw.quantity)||1)),weight,alias:String(raw.alias||''),notes:String(raw.notes||''),playerDescription:String(raw.playerDescription??raw.description??''),gmDescription:String(raw.gmDescription??raw.gmNotes??''),source:String(raw.source||''),actionCount:Math.max(actions.length,Math.max(0,Math.round(Number(raw.actionCount)||0))),weaponData,armorData,effects,actions,magicData};
}

function markInventoryNormalized(inv) {
  if(inv&&typeof inv==='object'&&!inv[CHARACTER_INVENTORY_NORMALIZED])Object.defineProperty(inv,CHARACTER_INVENTORY_NORMALIZED,{value:true,enumerable:false,configurable:false});
  return inv;
}

function isNormalizedInventory(inv) {
  return !!(inv?.[CHARACTER_INVENTORY_NORMALIZED]&&inv.schemaVersion===CHARACTER_ITEM_SCHEMA&&Array.isArray(inv.items)&&Array.isArray(inv.readyMagic));
}

function normalizeInventory(raw={}) {
  raw=raw&&typeof raw==='object'?raw:{};
  const items=(Array.isArray(raw.items)?raw.items:[]).map(normalizeGearItem).filter(Boolean),ids=new Set(items.map(x=>x.id)),available=id=>!id||ids.has(String(id)),first=(kind,state='equipped')=>items.find(x=>x.kind===kind&&x.state===state)?.id||'';
  const weapons=items.filter(x=>x.kind==='weapon'&&x.state!=='nocarried'),equippedWeapons=weapons.filter(x=>x.state==='equipped');
  let mainWeapon=available(raw.mainWeapon??raw.mainHand)?String(raw.mainWeapon??raw.mainHand??''):'';
  if(!mainWeapon)mainWeapon=equippedWeapons[0]?.id||weapons[0]?.id||'';
  let alternateWeapon=available(raw.alternateWeapon??raw.offHand)?String(raw.alternateWeapon??raw.offHand??''):'';
  if(!alternateWeapon)alternateWeapon=equippedWeapons.find(x=>x.id!==mainWeapon)?.id||weapons.find(x=>x.id!==mainWeapon)?.id||'';
  if(alternateWeapon===mainWeapon)alternateWeapon='';
  const hasArmor=Object.prototype.hasOwnProperty.call(raw,'armor'),hasShield=Object.prototype.hasOwnProperty.call(raw,'shield'),hasRingLeft=Object.prototype.hasOwnProperty.call(raw,'ringLeft'),hasRingRight=Object.prototype.hasOwnProperty.call(raw,'ringRight');
  let armor=available(raw.armor)?String(raw.armor||''):'';if(!hasArmor&&!armor)armor=first('armor');
  let shield=available(raw.shield)?String(raw.shield||''):'';if(!hasShield&&!shield)shield=first('shield');
  let ringLeft=available(raw.ringLeft)?String(raw.ringLeft||''):'',ringRight=available(raw.ringRight)?String(raw.ringRight||''):'';
  if(!hasRingLeft&&!ringLeft)ringLeft=first('ring');
  if(!hasRingRight&&!ringRight)ringRight=items.find(x=>x.kind==='ring'&&x.state==='equipped'&&x.id!==ringLeft)?.id||'';
  if(ringLeft&&ringLeft===ringRight)ringRight='';
  const readyMagic=(Array.isArray(raw.readyMagic)?raw.readyMagic:[]).map(String).filter((id,i,a)=>ids.has(id)&&a.indexOf(id)===i).slice(0,3);
  while(readyMagic.length<3)readyMagic.push('');
  return markInventoryNormalized({schemaVersion:CHARACTER_ITEM_SCHEMA,items,mainWeapon,alternateWeapon,armor,shield,ringLeft,ringRight,readyMagic,activeAmmo:available(raw.activeAmmo)?String(raw.activeAmmo||''):'',weaponsCanonical:!!raw.weaponsCanonical,magicCanonical:!!raw.magicCanonical,source:String(raw.source||''),importedAt:String(raw.importedAt||'')});
}

function inventoryItem(inv,id) {
  return inv?.items?.find(x=>x.id===String(id||''))||null;
}
function weaponItems(inv) {return (inv?.items||[]).filter(x=>x.kind==='weapon'&&x.state!=='nocarried'&&x.weaponData);}
function armorItems(inv) {return (inv?.items||[]).filter(x=>x.kind==='armor'&&x.state!=='nocarried');}
function shieldItems(inv) {return (inv?.items||[]).filter(x=>x.kind==='shield'&&x.state!=='nocarried');}
function ringItems(inv) {return (inv?.items||[]).filter(x=>x.kind==='ring'&&x.state!=='nocarried');}
function readyMagicItems(inv) {return (inv?.items||[]).filter(x=>x.magic&&!ACTIVE_GEAR_KINDS.includes(x.kind)&&x.state!=='nocarried');}

function itemActive(inv,item) {
  if(!item||!inv)return false;
  if(item.kind==='ring')return item.id===inv.ringLeft||item.id===inv.ringRight;
  if(item.kind==='weapon')return item.id===inv.mainWeapon;
  if(item.kind==='armor')return item.id===inv.armor;
  if(item.kind==='shield')return item.id===inv.shield;
  if(item.magic)return (inv.readyMagic||[]).includes(item.id)||item.state==='equipped';
  return item.state==='equipped';
}

function weaponDataFromRow(row={}) {
  const out={};
  for(const k of ['hit','sm','l','dmod','atOverride','rangeS','rangeM','rangeL','magic','magicPlus','silver','sharpness','fire','acid'])if(row[k]!==undefined&&row[k]!==null&&String(row[k]).trim()!=='')out[k]=row[k];
  return normalizeWeaponData(out);
}

function weaponRow(item) {
  return{name:item.name,itemId:item.id,_itemBacked:true,...(item.weaponData||{})};
}

function syncWeaponRows(inv,rows=[],{replace=false,activeWeapon=''}={}) {
  if(!inv||typeof inv!=='object')return inv;
  if(!Array.isArray(inv.items))inv.items=[];
  rows=Array.isArray(rows)?rows.filter(x=>x?.name):[];
  if(replace)for(const it of inv.items||[])if(it.kind==='weapon')it.weaponData=null;
  const used=[];
  for(let i=0;i<rows.length;i++){
    const row=rows[i],key=magicItemKey(row.name);
    let it=(inv.items||[]).find(x=>x.kind==='weapon'&&magicItemKey(x.name)===key);
    if(!it){it=normalizeGearItem({id:`weapon-${key.replace(/\s+/g,'-')||i+1}-${i+1}`,name:row.name,sourceType:'weapon',state:i===0?'equipped':'carried',source:'BATTLESYSTEM roster'},inv.items.length);inv.items.push(it);}
    it.weaponData=weaponDataFromRow(row)||{};
    used.push(it);
  }
  inv.weaponsCanonical=true;
  if(used.length){
    const activeKey=magicItemKey(activeWeapon||rows[0]?.name||''),active=used.find(x=>magicItemKey(x.name)===activeKey)||used[0];
    inv.mainWeapon=active.id;
    const alt=used.find(x=>x.id!==active.id);
    if(!inv.alternateWeapon||!used.some(x=>x.id===inv.alternateWeapon))inv.alternateWeapon=alt?.id||'';
  }
  return inv;
}

function magicItemActionsForGear(mi) {
  return magicItemFunctions(mi).map((fn,i)=>normalizeAction({id:`magic-${mi.id}-${i+1}`,name:fn.name==='Use item'?mi.name:fn.name,kind:'activateMagic',resourceKind:magicItemResourceKind(mi),resourceCost:fn.chargeCost,effectiveLevel:fn.effectiveLevel??mi.effectiveLevel,sourceFunction:fn.name,notes:fn.notes},i)).filter(Boolean);
}

function syncMagicItems(inv,list=[],{replace=false}={}) {
  if(!inv||typeof inv!=='object')return inv;
  if(!Array.isArray(inv.items))inv.items=[];
  list=(Array.isArray(list)?list:[]).map((x,i)=>normalizeMagicItem(x,i)).filter(Boolean);
  if(replace)for(const it of inv.items||[])if(it.magicData){it.magicData=null;it.actions=(it.actions||[]).filter(a=>a.kind!=='activateMagic');}
  for(const mi0 of list){
    let it=mi0.inventoryId?(inv.items||[]).find(x=>x.id===mi0.inventoryId):null;
    if(!it)it=(inv.items||[]).find(x=>magicItemKey(x.name)===magicItemKey(mi0.name)&&x.state!=='nocarried');
    if(!it){const kind=mi0.type==='ring'?'ring':mi0.type==='potion'?'potion':mi0.type==='scroll'?'scroll':'item';it=normalizeGearItem({id:`magic-${mi0.id}`,name:mi0.name,sourceType:kind,state:'carried',magic:true,source:'BATTLESYSTEM magic roster'},inv.items.length);inv.items.push(it);}
    const mi=normalizeMagicItem({...mi0,inventoryId:it.id});
    it.magic=true;it.magicData=mi;it.actions=magicItemActionsForGear(mi);it.actionCount=it.actions.length;
  }
  inv.magicCanonical=true;
  return inv;
}

function activeEffects(inv) {
  return (inv?.items||[]).filter(it=>(it.effects||[]).length&&itemActive(inv,it)).flatMap(it=>(it.effects||[]).filter(x=>x.enabled).map(x=>({...x,itemId:it.id,itemName:it.name})));
}

function applyProfileEffects(profile,effects,opts={}) {
  if(!profile||!Array.isArray(effects)||!effects.length)return profile;
  return BattlesystemEffects.applyProfile(profile,effects,opts);
}

function actionSources(inv) {
  return (inv?.items||[]).filter(x=>itemActive(inv,x)).map(it=>({itemId:it.id,actions:it.actions||[]}));
}

function buildActionSurface({inventory,weapons=[],spells=[],innate=[]}={}) {
  return BattlesystemActions.buildSurface({weapons,spells,items:actionSources(inventory),innate});
}

function setLoadoutSlot(inv,slot,value,{dryRun=false}={}) {
  if(!inv||typeof inv!=='object')return{ok:false,reason:'inventory missing'};
  const id=String(value||''),gear=id?inventoryItem(inv,id):null;
  if(id&&(!gear||gear.state==='nocarried'))return{ok:false,reason:'item is not carried'};
  const readySlot=/^ready[0-2]$/.test(slot),kindFor={mainWeapon:'weapon',alternateWeapon:'weapon',armor:'armor',shield:'shield',ringLeft:'ring',ringRight:'ring'}[slot];
  if(!kindFor&&!readySlot)return{ok:false,reason:'unknown loadout slot'};
  if(kindFor&&gear&&gear.kind!==kindFor)return{ok:false,reason:`${gear.name} cannot occupy ${slot}`};
  if(readySlot&&gear&&(!gear.magic||ACTIVE_GEAR_KINDS.includes(gear.kind)))return{ok:false,reason:`${gear.name} is not eligible for Ready Magic`};
  if(dryRun)return{ok:true,inventory:inv,gear,id,slot};
  if(slot==='mainWeapon'||slot==='alternateWeapon'){
    const other=slot==='mainWeapon'?'alternateWeapon':'mainWeapon';inv[slot]=id;if(id&&inv[other]===id)inv[other]='';
    for(const w of (inv.items||[]).filter(x=>x.kind==='weapon'&&x.state!=='nocarried'))w.state=(w.id===inv.mainWeapon||w.id===inv.alternateWeapon)?'equipped':'carried';
  } else if(slot==='armor'||slot==='shield'){
    inv[slot]=id;for(const it of (inv.items||[]).filter(x=>x.kind===slot&&x.state!=='nocarried'))it.state=it.id===id?'equipped':'carried';
  } else if(slot==='ringLeft'||slot==='ringRight'){
    const other=slot==='ringLeft'?'ringRight':'ringLeft';inv[slot]=id;if(id&&inv[other]===id)inv[other]='';
    for(const r of (inv.items||[]).filter(x=>x.kind==='ring'&&x.state!=='nocarried'))r.state=(r.id===inv.ringLeft||r.id===inv.ringRight)?'equipped':'carried';
  } else if(readySlot){
    const idx=Number(slot.slice(-1));if(!Array.isArray(inv.readyMagic))inv.readyMagic=['','',''];while(inv.readyMagic.length<3)inv.readyMagic.push('');
    for(let i=0;i<3;i++)if(i!==idx&&inv.readyMagic[i]===id)inv.readyMagic[i]='';inv.readyMagic[idx]=id;
  }
  return{ok:true,inventory:inv,gear,id,slot};
}

function magicItemCost(entry,item) {
  if(entry?.kind!=='item')return 0;
  if(Number.isFinite(Number(entry.chargeCost)))return Math.max(0,Math.round(Number(entry.chargeCost)));
  return ['wand','staff','rod'].includes(item?.type)||item?.type==='potion'||item?.type==='scroll'?1:0;
}

function magicItemUseState(item,entry,{loadoutActive=true,setup=false,round=0}={}) {
  if(!item)return{ok:true,warns:entry?.kind==='item'?['item statistics are not recorded — charges/doses remain referee-managed']:[]};
  if(!loadoutActive)return{ok:false,reason:`${item.name} is not in the active battle loadout`};
  const cost=magicItemCost(entry,item),warns=[],kind=magicItemResourceKind(item);
  if(item.depleted&&cost>0)return{ok:false,reason:`${item.name} is depleted`};
  if(cost>0){
    if(item.current==null)warns.push(`${kind} remaining are not recorded — expenditure is referee-managed`);
    else if(item.current<cost)return{ok:false,reason:`${item.name} needs ${cost} ${magicItemResourceUnit(kind,cost)}, but only ${item.current} remain`};
  }
  if(!setup&&item.usesPerRound&&item.lastUseRound===round&&item.usesInLastRound>=item.usesPerRound)return{ok:false,reason:`${item.name} can operate only ${item.usesPerRound} time${item.usesPerRound===1?'':'s'} per round`};
  return{ok:true,warns,item,cost};
}

function expendMagicItemUse(item,entry,{sandbox=false,setup=false,round=0,loadoutActive=true}={}) {
  const chk=magicItemUseState(item,entry,{loadoutActive,setup,round});
  if(!chk.ok&&!sandbox)return{ok:false,reason:chk.reason};
  const cost=chk.cost??magicItemCost(entry,item);
  if(!item)return{ok:true,label:'item resource not recorded'};
  const before=item.current;
  if(!sandbox&&cost>0&&item.current!=null)item.current=Math.max(0,item.current-cost);
  if(!setup&&!sandbox){if(item.lastUseRound===round)item.usesInLastRound++;else{item.lastUseRound=round;item.usesInLastRound=1;}}
  if(!sandbox&&cost>0&&item.current===0&&['wand','staff','rod'].includes(item.type))item.depleted=true;
  const kind=magicItemResourceKind(item),resource=sandbox?'advisory Setup test · resource not expended':cost>0?(before==null?`${cost} ${kind} expended · remaining count not recorded`:`${kind} ${before}→${item.current}`):'no charge/dose cost';
  return{ok:true,item,cost,before,after:item.current,label:resource,depleted:item.depleted};
}

export const BattlesystemItems = Object.freeze({
  CHARACTER_ITEM_SCHEMA,
  CHARACTER_INVENTORY_NORMALIZED,
  MAGIC_ITEM_TYPES,
  MAGIC_ITEM_TYPE_LABELS,
  MAGIC_ITEM_DEFAULT_LEVEL,
  MAGIC_ITEM_LIBRARY,
  magicItemKey,
  magicItemTypeFromName,
  magicItemLibrarySpec,
  magicNullableInt,
  nullableNumber,
  normalizeMagicItemFunction,
  normalizeMagicItem,
  normalizeMagicItemData,
  magicItemFunctions,
  magicItemResourceKind,
  magicItemResourceUnit,
  magicItemResourceLabel,
  magicItemFunctionSummary,
  normalizeEffect,
  normalizeAction,
  normalizeWeaponData,
  normalizeArmorData,
  gearKind,
  normalizeGearItem,
  markInventoryNormalized,
  isNormalizedInventory,
  normalizeInventory,
  inventoryItem,
  weaponItems,
  armorItems,
  shieldItems,
  ringItems,
  readyMagicItems,
  itemActive,
  weaponDataFromRow,
  weaponRow,
  syncWeaponRows,
  magicItemActionsForGear,
  syncMagicItems,
  activeEffects,
  applyProfileEffects,
  actionSources,
  buildActionSurface,
  setLoadoutSlot,
  magicItemCost,
  magicItemUseState,
  expendMagicItemUse
});
