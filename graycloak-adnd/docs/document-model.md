# Graycloak Document Model v0.3

Graycloak uses a Foundry-inspired document model for game objects that have their own identity and lifecycle. This is an **application contract**, not a requirement that every record live in one Firestore collection.

## Rule of thumb

Give a document ID to anything that may need to be independently referenced, modified, transferred, targeted, expired, audited, or logged.

Do not give IDs to ordinary scalar properties. Strength 17 is a field. A particular Ring of Invisibility is a document.

## Common contract

All Graycloak documents carry:

- `id`
- `documentType`
- `type`
- `schemaVersion`
- `campaignId`
- `name`
- `createdAt`
- `updatedAt`

The runtime helper is `public/adnd-documents.js`.

## Initial document types

### Actor

Living or independently acting game entities:

- `character`
- `npc`
- `henchman`
- `hireling`
- `mount`
- `animal`
- `monster`

The existing `characters/{id}` collection remains the physical storage for PCs. New characters are stamped `documentType: "actor"` and `type: "character"`. Existing character records can be normalized on read and do not require a destructive migration.

Actor runtime metadata reserves three time fields:

- `lastResolvedTick`
- `availableAtTick`
- `activityId`

These do **not** create private character timelines. v0.3 defines them against one shared campaign `worldTick`; see `docs/world-clock.md`. Tick values are non-negative safe integers, with one tick equal to one six-second OSRIC combat segment.

### Item

An owned or world item instance. `definitionId` identifies what the rules/content catalog says the thing is; `id` identifies this particular instance.

Example: `definitionId: "long-sword"`, `id: "item-..."`, `ownerActorId: "char-..."`.

The current Document-model work does not migrate the existing `equipment` array. Item persistence should be introduced when inventory becomes an active gameplay system.

### ActiveEffect

A separately addressable temporary or persistent condition such as Haste, poison, disease, or a magic-item effect. Effects may refer to a source document and world-tick start/expiry values.

### Activity

A time-spanning commitment such as travel, training, resting, research, or construction. Activities are the intended bridge to the non-realtime MMO clock. Multiple actors can share one activity.

### GameEvent

An immutable audit/history record for authoritative outcomes such as character creation, travel, damage, spell casting, XP awards, death, and world-clock advancement.

The Document model defines the shape only. It does not yet create an event collection or move authority out of the browser.

## Definition versus instance

Rules/content definitions should remain separate from persistent instances.

A rules definition answers: "What is a Long Sword?"

An item instance answers: "Which Long Sword is this, who owns it, what condition is it in, and what has happened to it?"

The same principle can later apply to monsters, spells, abilities, settlements, and other catalog-driven content.

## Migration policy

The migration policy remains intentionally additive:

1. Existing Firestore collections remain in place.
2. Existing character fields remain in place.
3. New PCs gain document metadata.
4. Old PCs remain readable and can be normalized on read.
5. No `characters` to `actors` collection migration is performed yet.
6. No inventory migration is performed yet.

This lets the abstraction prove useful before Graycloak pays the cost of broader schema migration.
