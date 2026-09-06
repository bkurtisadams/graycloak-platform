/**
 * npc-usage-example.js
 * Quick examples of how to use the generator in your app.
 */

import {
  generateQuickNPC,
  generateFullNPC,
  generateOppositionGroup,
  listCareers,
  listOppositionTemplates,
} from './npc-generator.js';

// ------------------------------------------------------------------
// 1. Quick NPC for a bar encounter
// ------------------------------------------------------------------
const bartender = generateQuickNPC({ careerKey: 'other' });
console.log(bartender.name.full);        // "Joss Hale"
console.log(bartender.upp);              // { str:7, dex:8, end:6, int:5, edu:4, soc:9 }
console.log(bartender.skills);           // { Streetwise: 1, Carousing: 1 }
console.log(bartender._meta.uppString);  // "785649"

// ------------------------------------------------------------------
// 2. Quick NPC with custom constraints
// ------------------------------------------------------------------
const marineSergeant = generateQuickNPC({
  careerKey: 'marines',
  uppMods: { str: 1, end: 1 },
  levelCap: 3,
});

// ------------------------------------------------------------------
// 3. Full NPC with your existing Book 1 engine
// ------------------------------------------------------------------
// Assuming you have `runClassicTravellerChargen(service)` in your rules:
const fullCharacter = await generateFullNPC({
  careerKey: 'navy',
  runCharacterGeneration: runClassicTravellerChargen,
});

// ------------------------------------------------------------------
// 4. Full NPC without an existing engine (uses fallback)
// ------------------------------------------------------------------
const fallbackNPC = await generateFullNPC({ careerKey: 'scouts', maxTerms: 3 });

// ------------------------------------------------------------------
// 5. Opposition: 2-5 pirates (random count from template)
// ------------------------------------------------------------------
const pirates = generateOppositionGroup('pirate-crew');
// pirates.length is 2-5
// Each has random UPP, 1-2 skills, weapon, armor

// ------------------------------------------------------------------
// 6. Opposition: exactly 4 security guards
// ------------------------------------------------------------------
const guards = generateOppositionGroup('security-guard', 4);

// ------------------------------------------------------------------
// 7. Opposition: single patron for adventure hook
// ------------------------------------------------------------------
const [patron] = generateOppositionGroup('patron-contact', 1);

// ------------------------------------------------------------------
// 8. List available options for UI dropdowns
// ------------------------------------------------------------------
const careers = listCareers();
// [{ key: 'navy', label: 'Navy' }, { key: 'marines', label: 'Marines' }, ...]

const templates = listOppositionTemplates();
// [{ key: 'pirate-crew', label: 'Pirate Crew' }, ...]

// ------------------------------------------------------------------
// 9. Integration into roster UI (pseudo-code)
// ------------------------------------------------------------------
function RosterPanel({ campaign, onAddActor }) {
  return `
    <div class="roster-actions">
      <button onclick="${() => onAddActor(generateQuickNPC())}">
        Add Quick NPC
      </button>
      <button onclick="${async () => onAddActor(await generateFullNPC())}">
        Generate Full NPC
      </button>
    </div>
  `;
}

// ------------------------------------------------------------------
// 10. Integration into encounter setup (pseudo-code)
// ------------------------------------------------------------------
function EncounterSetup({ onAddCombatants }) {
  const templates = listOppositionTemplates();

  return `
    <div class="encounter-setup">
      <label>Generate Opposition:</label>
      <select id="template-select">
        ${templates.map(t => `<option value="${t.key}">${t.label}</option>`).join('')}
      </select>
      <button onclick="${() => {
        const key = document.getElementById('template-select').value;
        const group = generateOppositionGroup(key);
        onAddCombatants(group);
      }}">
        Place on Map
      </button>
    </div>
  `;
}
