"use strict";

/* ============================================================
   FACTION STORE — la vérité des rosters transverses du MONDE.
   ------------------------------------------------------------
   Frère de RelationsStore, mais pour les ROSTERS (pas les arêtes) :
   un registre plat de factions, par édition, sur Storage :

       Faction { id, name, color?, anchor?, members: [entityId…] }

   `members` = ids d'entités TOUS TYPES (PNJ, PJ, contact, serveur) —
   une faction traverse les collections, ce que `Collection.groups`
   (cloisonné par collection) ne sait pas faire. `anchor` (optionnel)
   ancre la faction à une clé du catalogue canon (`ToposCatalog.factions`)
   pour réconcilier la faction-MJ avec la mémoire du monde (VIS-12).

   Vérité UNIQUE d'appartenance (contrainte Kernel) : `members` est la
   SEULE source ; le graphe DÉRIVE ses arêtes « membre », il n'y a pas de
   store d'arêtes en double. Ce module N'EST PAS une Collection : pas de
   grille, pas de GroupPicker, pas de rendu — juste la forme roster, comme
   RelationsStore est la forme arête. Feuille : dépend de Storage seul.
   Voir PLANS/VISION_MONDE_ET_JEU.md § 3.1.
   ============================================================ */
import { Storage } from "./storage.js";

export const FactionStore = {
  _key: "entity_factions",
  _factions: [],

  /* ---- Persistance (par édition, via Storage) ---- */
  load() {
    const raw = Storage.get(this._key, []);
    this._factions = Array.isArray(raw) ? raw : [];
    return this._factions;
  },
  save() {
    Storage.set(this._key, this._factions);
  },

  _uid() {
    return "f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },

  /* ---- Lecture ---- */
  all() {
    return this._factions;
  },
  get(id) {
    return this._factions.find((f) => f && f.id === id) || null;
  },
  /** Factions dont `id` est membre — l'accesseur de la bande fiche. */
  factionsOf(id) {
    return this._factions.filter(
      (f) => f && Array.isArray(f.members) && f.members.includes(id),
    );
  },

  /* ---- CRUD faction ---- */
  /** Crée une faction (nom requis ; color/anchor optionnels). Renvoie la faction. */
  create({ name, color = null, anchor = null } = {}) {
    const clean = String(name || "").trim();
    if (!clean) return null;
    const f = { id: this._uid(), name: clean, color: color || null, members: [] };
    if (anchor) f.anchor = anchor;
    this._factions.push(f);
    this.save();
    return f;
  },
  /** Insère ou met à jour une faction (par id si présent). Renvoie la faction. */
  upsert(faction) {
    if (!faction) return null;
    if (faction.id) {
      const f = this.get(faction.id);
      if (f) {
        Object.assign(f, faction, {
          id: f.id,
          members: Array.isArray(faction.members) ? faction.members : f.members,
        });
        this.save();
        return f;
      }
    }
    const f = Object.assign({ id: this._uid(), members: [] }, faction);
    this._factions.push(f);
    this.save();
    return f;
  },
  rename(id, name) {
    const f = this.get(id);
    const clean = String(name || "").trim();
    if (!f || !clean) return false;
    f.name = clean;
    this.save();
    return true;
  },
  setColor(id, color) {
    const f = this.get(id);
    if (!f) return false;
    f.color = color || null;
    this.save();
    return true;
  },
  /** Ancre (ou dé-ancre avec `null`) la faction à une clé du catalogue canon. */
  setAnchor(id, anchor) {
    const f = this.get(id);
    if (!f) return false;
    if (anchor) f.anchor = anchor;
    else delete f.anchor;
    this.save();
    return true;
  },
  remove(id) {
    const before = this._factions.length;
    this._factions = this._factions.filter((f) => f && f.id !== id);
    if (this._factions.length !== before) this.save();
  },

  /* ---- Appartenance (par id) ---- */
  addMember(factionId, entityId) {
    const f = this.get(factionId);
    if (!f || !entityId) return false;
    if (!Array.isArray(f.members)) f.members = [];
    if (f.members.includes(entityId)) return false;
    f.members.push(entityId);
    this.save();
    return true;
  },
  removeMember(factionId, entityId) {
    const f = this.get(factionId);
    if (!f || !Array.isArray(f.members)) return false;
    const i = f.members.indexOf(entityId);
    if (i < 0) return false;
    f.members.splice(i, 1);
    this.save();
    return true;
  },
  toggleMember(factionId, entityId, on) {
    return on
      ? this.addMember(factionId, entityId)
      : this.removeMember(factionId, entityId);
  },

  /* ---- Intégrité (Failsafe) ---- */
  /** Retire les entités supprimées de TOUS les rosters. Renvoie les retraits
      `{factionId, entityId}` pour un éventuel undo (comme RelationsStore rend
      ses arêtes purgées). */
  purgeEntities(ids) {
    const set = ids instanceof Set ? ids : new Set(ids);
    const removed = [];
    let changed = false;
    for (const f of this._factions) {
      if (!f || !Array.isArray(f.members)) continue;
      const kept = [];
      for (const m of f.members) {
        if (set.has(m)) {
          removed.push({ factionId: f.id, entityId: m });
          changed = true;
        } else kept.push(m);
      }
      if (kept.length !== f.members.length) f.members = kept;
    }
    if (changed) this.save();
    return removed;
  },
  /** Réinsère des appartenances retirées (undo de suppression d'entité).
      Idempotent : ignore une appartenance déjà présente ou une faction disparue. */
  addMemberships(list) {
    if (!Array.isArray(list) || !list.length) return;
    let changed = false;
    for (const { factionId, entityId } of list) {
      const f = this.get(factionId);
      if (f && Array.isArray(f.members) && !f.members.includes(entityId)) {
        f.members.push(entityId);
        changed = true;
      }
    }
    if (changed) this.save();
  },
};

// Pont couche 1 (voir PLANS/PLAN_MODULES_ES.md) : global classique tant que
// les couches hautes n'ont pas basculé en `import`.
window.FactionStore = FactionStore;
