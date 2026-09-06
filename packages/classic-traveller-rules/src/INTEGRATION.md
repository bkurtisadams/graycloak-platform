# NPC Generator Integration Guide

## Where these files go

Copy these four files into your rules package:

```
packages/classic-traveller-rules/src/
  npc-primitives.js
  npc-careers.js
  npc-templates.js
  npc-generator.js
```

Then re-export from your package index:

```javascript
// packages/classic-traveller-rules/index.js
export {
  generateQuickNPC,
  generateFullNPC,
  generateOppositionGroup,
  listCareers,
  listOppositionTemplates,
} from './src/npc-generator.js';
```

## Where the buttons go (NOT on the sheet)

### 1. Roster Panel — `[ ADD QUICK NPC ]` and `[ GENERATE FULL NPC ]`

The roster panel (introduced in v0.15.1) is the natural home for creation.

```javascript
// In your roster panel component
import { generateQuickNPC, generateFullNPC } from '@graycloak/classic-traveller-rules';

// [ ADD QUICK NPC ]
function onAddQuickNPC() {
  const npc = generateQuickNPC({ careerKey: 'other' }); // or let it randomize
  campaignDoc.actorRoster.push(npc);        // however you persist
  openActorSheet(npc.id);                   // open for editing if desired
}

// [ GENERATE FULL NPC ]
async function onGenerateFullNPC() {
  // If you have a real Book 1 engine:
  const npc = await generateFullNPC({
    careerKey: pick(['navy','marines','army','scouts','merchants','other']),
    runCharacterGeneration: yourExistingBook1Engine, // plug it in here
  });
  campaignDoc.actorRoster.push(npc);
  openActorSheet(npc.id);
}
```

**Why here:** The roster is a *collection* view. Creating a new member belongs in the collection UI, not inside an individual record.

### 2. Encounter Setup — `[ GENERATE OPPOSITION ]`

When the referee opens encounter setup (v0.13.1+ manual combat), add a template selector:

```javascript
import { generateOppositionGroup, listOppositionTemplates } from '@graycloak/classic-traveller-rules';

// In encounter setup UI
const templates = listOppositionTemplates(); // [{key:'pirate-crew', label:'Pirate Crew'}, ...]

function onGenerateOpposition(templateKey) {
  const enemies = generateOppositionGroup(templateKey); // uses template's default count

  enemies.forEach(npc => {
    // Add to roster (or keep as encounter-only)
    campaignDoc.actorRoster.push(npc);

    // Place on map
    encounterDoc.combatants.push({
      actorId: npc.id,
      side: 'enemy',
      position: findEmptyMapSquare(),
    });
  });
}
```

**Why here:** The referee is already in "create encounter" mode. Generating opposition is part of setup, not part of editing an existing actor.

### 3. Campaign Menu — `[ GENERATE PATRON ]`

For Book 3 patron generation, use the `patron-contact` template:

```javascript
const [patron] = generateOppositionGroup('patron-contact', 1);
// Then attach to your Situation/Adventure engine
```

## What NOT to do

- **Do not** add a `[ RANDOMIZE ]` button to the NPC Actor sheet. The sheet is for *editing* a specific record. Randomizing from inside a record creates ambiguity: does it overwrite? Clone? The mental model breaks.
- **Do not** show full NPC generation to players. Keep it referee-only.
- **Do not** generate full Book 1 history for every bar patron. Use `generateQuickNPC` for extras and `generateFullNPC` only for recurring characters.

## Document schema compatibility

The generators output objects matching your Actor Document schema:

```javascript
{
  id: 'actor-abc123',
  type: 'actor',
  bodyType: 'biological', // or 'robot', 'creature'
  name: { full: '...', short: '...' },
  description: '...',
  upp: { str, dex, end, int, edu, soc },
  characteristics: { ...upp },
  currentPhysical: { str, dex, end },
  age: 22,
  career: { service, rank, terms, ... },
  skills: { 'Gun Combat': 1, ... },
  equipment: { readyWeapon, wornArmor, inventory: [] },
  credits: 450,
  notes: { public: '', referee: '...' },
  effects: [],
  state: 'alive',
  portraitRef: null,
  _meta: { generated: '...', method: 'quick-npc', uppString: '777777' }
}
```

The `_meta` field is non-standard; strip it before persistence if you want strict schema compliance, or keep it for debugging.

## Customizing

### Add a new career
Edit `npc-careers.js` and add an entry to `QUICK_CAREERS`. The generator will pick it up automatically.

### Add a new opposition template
Edit `npc-templates.js` and add an entry to `OPPOSITION_TEMPLATES`. Good for region-specific fauna (e.g., `dune-worm`, `ice-crawler`).

### Replace name generation
Swap out `npc-primitives.js` `generateName()` with your own tables, or pass `opts.name` to override.

## Testing

```javascript
import { generateQuickNPC, generateOppositionGroup } from './npc-generator.js';

// Quick smoke test
const npc = generateQuickNPC({ careerKey: 'scouts' });
console.log(npc.name.full, npc.uppString, npc.skills);

// Opposition test
const pirates = generateOppositionGroup('pirate-crew');
console.log(`Generated ${pirates.length} pirates`);
pirates.forEach(p => console.log(p.name.short, p.equipment.readyWeapon));
```
