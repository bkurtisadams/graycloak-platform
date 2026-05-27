# PHB weapon-data audit — sim WEAPONS + CDATA.weapons vs AD&D 1e PHB

**Coverage:** sim has **14** weapons (of which 11 are PHB); CDATA has **45** weapons; PHB tables encoded here cover **58** weapon rows (43 melee + 15 ranged).

## §1 — Catalog coverage

**In CDATA but NOT registered in sim (34)** — these would populate at boot once we call `cdataWeaponToSim` across the catalog:

  bardiche, bastard_sword, bec_de_corbin, bill_guisarme, bo_stick, broad_sword, fauchard, fauchard_fork, flail, glaive, glaive_guisarme, guisarme, guisarme_voulge, hammer, heavy_crossbow, horsemans_flail, horsemans_mace, horsemans_pick, jo_stick, light_crossbow, long_bow, lucern_hammer, military_fork, military_pick, morning_star, partisan, quarterstaff, ranseur, scimitar, short_bow, spetum, trident, two_h_sword, voulge

**In PHB tables but missing from CDATA entirely (9)** — need adding from scratch:

  - `composite_long_bow` — Composite Long Bow
  - `composite_short_bow` — Composite Short Bow
  - `dart` — Dart
  - `javelin` — Javelin
  - `lance_heavy` — Lance (heavy horse)
  - `lance_light` — Lance (light horse)
  - `lance_medium` — Lance (med horse)
  - `sling_bullet` — Sling (bullet)
  - `sling_stone` — Sling (stone)

**In sim but not in PHB (3)** — sim-specific extras (keep, but flag):

  ogre_club, sling, spider_bite

## §2 — Field-by-field discrepancies (PHB is the authority)

### `bardiche` — Bardiche
  - CDATA=120 vs PHB=125

### `battle_axe` — Battle Axe
  - CDATA=1d8 vs PHB=1d4
  - CDATA=70 vs PHB=75
  - AC3: CDATA=-2 vs PHB=-1
  - AC4: CDATA=-1 vs PHB=+1

### `bo_stick` — Bo Stick
  - CDATA=10 vs PHB=15

### `broad_sword` — Broad Sword
  - CDATA=70 vs PHB=75

### `club` — Club
  - CDATA=2 vs PHB=1

### `dagger` — Dagger
  - sim=1 vs PHB=1.25

### `glaive` — Glaive  *(PHB row uncertain: vs_ac row mangled in paste)*
  - CDATA=70 vs PHB=75

### `halberd` — Halberd
  - CDATA=170 vs PHB=175
  - AC2: sim=-3 vs PHB=+1
  - AC3: sim=-2 vs PHB=+1
  - AC4: sim=-1 vs PHB=+1
  - AC5: sim=0 vs PHB=+2
  - AC6: sim=0 vs PHB=+2
  - AC7: sim=0 vs PHB=+2
  - AC8: sim=0 vs PHB=+1
  - AC10: sim=2 vs PHB=+0

### `hand_axe` — Hand/Throwing Axe
  - sim=2 vs PHB=1.5

### `heavy_crossbow` — Heavy Crossbow
  - CDATA=1 vs PHB=0.5

### `horsemans_flail` — Flail, horseman's
  - CDATA=30 vs PHB=35

### `long_sword` — Long Sword
  - sim=4 vs PHB=3.5

### `mace` — Mace, footman's
  - sim=4 vs PHB=2.5
  - AC2: sim=-1 vs PHB=+1
  - AC3: sim=-1 vs PHB=+1
  - AC8: sim=1 vs PHB=+0
  - AC10: sim=1 vs PHB=-1

### `military_fork` — Military Fork
  - CDATA=70 vs PHB=75

### `morning_star` — Morning Star
  - CDATA=120 vs PHB=125

### `pike` — Awl Pike
  - sim=6 vs PHB=18
  - AC2: sim=-2 vs PHB=-1
  - AC3: sim=-1 vs PHB=+0
  - AC9: sim=1 vs PHB=-1
  - AC10: sim=2 vs PHB=-2

### `quarterstaff` — Quarter Staff
  - CDATA=40 vs PHB=50

### `short_sword` — Short Sword
  - CDATA=50 vs PHB=35

### `spear` — Spear  *(PHB row uncertain: length/weight/speed are PHB ranges (5-13ft / 40-60gp / 6-8); midpoints used)*
  - CDATA=7 vs PHB=6
  - sim=4 vs PHB=8
  - CDATA=9 vs PHB=8
  - AC4: sim=0 vs PHB=-1
  - AC5: sim=0 vs PHB=-1
  - AC9: sim=1 vs PHB=+0
  - AC10: sim=2 vs PHB=+0

### `trident` — Trident  *(PHB row uncertain: length/speed PHB ranges (4-8ft / 6-8); midpoints used)*
  - CDATA=7 vs PHB=6

### `voulge` — Voulge
  - CDATA=120 vs PHB=125

## §3 — Structural gaps (not per-row, affect the whole catalog)

- **Sim `WEAPONS` is missing the `space`, `weight`, `classes` fields entirely** — every melee weapon in the sim lacks the PHB "Space Required" column, which is what the new space-too-small warning will key off.
- **CDATA ranged weapons have no `vs_ac` table at all** — PHB gives a vs_ac adjustment at short range (with -2 at medium, -5 at long). Today every ranged shot computes wpnVsAc as 0. This is a *missing feature*, not a wrong value, but it changes to-hit math materially (a long bow vs AC2 should be -1 short / -3 mid / -6 long, etc.).
- **Sling is one CDATA entry but two PHB weapons** — the bullet has damage `1d4+1/1d6+1` with range `5/10/20`, the stone has damage `1d4/1d4` with range `4/8/16`. CDATA carries bullet damage with stone range (`1d4+1/1d6+1` at `4/8/16`) — wrong on either count.
- **9 PHB weapons absent from CDATA**: composite long/short bows, sling bullet & stone (as separate items), heavy & light crossbow quarrels (the projectiles, not the bows), arrow, lance light/medium, the fist/open-hand row, and a few others (see §1).

## Summary: **21** weapons have at least one PHB discrepancy. Catalog gap is the bigger story: the sim is using ~25% of the PHB list.
