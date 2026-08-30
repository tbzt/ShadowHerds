"use strict";

/* ============================================================
   ENCOUNTER STORE — persistance du tracker de combat.

   Sorti d'encounter.js, qui cumulait persistance, règles,
   composition de scène et câblage DOM là où la doctrine en
   tolère deux. Ce module possède SEUL :
     · les deux clés (`encounter_current`, `encounter_by_dossier`),
     · la FORME de la scène persistée et sa version,
     · la carte dossierId → bundle des rencontres rangées.

   Il ne connaît ni le DOM, ni le rendu, ni les règles de round :
   Encounter orchestre, ce module range. Toute écriture passe par
   Storage (prohibition n°2) ; aucune de ces méthodes ne touche
   `localStorage`.

   Les bundles rendus sont DÉTACHÉS (structuredClone) : un appelant
   qui mute ce qu'il a lu ne corrompt pas la copie rangée.
   ============================================================ */
import { Storage } from "./storage.js";

export const EncounterStore = {
  _KEY: "encounter_current",

  /* ---- Rencontre persistante (R1, PLAN_RANGER_LA_RUN.md) -----------------
     Le tracker reste mono-scène ACTIVE ; la persistance multi-scène vit dans
     ce side-key édition-scopé, keyé par id de dossier `kind:"run"`. Clé
     additive (défaut `{}`) : aucune migration nécessaire. */
  _STASH_KEY: "encounter_by_dossier",

  /** Version de la FORME de l'état persisté (round/pass/turnIndex/combatants/
      serverId/v) — distincte du `schemaVersion` de Storage, qui versionne la
      chaîne de migrations elle-même. Si la forme évolue encore, incrémenter
      ici et ajouter le backfill correspondant à la migration de Storage (le
      seul endroit qui migre — voir CONTRIBUTING.md § Versionner les
      schémas). Les scènes persistées avant l'ajout de ce champ sont
      tamponnées `v:1` par cette migration au boot : `readScene()` peut donc
      supposer l'état déjà à niveau, sans rétro-compat locale. */
  _V: 3,

  /** Scène vide au format courant. Le compteur de séquence (journal des
      jets) n'est PAS ici : il est session-only, il appartient à Encounter. */
  emptyScene() {
    // `chase: null` = pas de poursuite en cours. Champ ADDITIF, comme
    // `matrix` en son temps : une scène persistée avant le moteur ⇉ le lit
    // `undefined`, ce que toutes les gardes traitent comme `null` — aucune
    // migration (cf. § Versionner les schémas).
    return { v: this._V, round: 1, pass: 1, turnIndex: 0, combatants: [], serverId: null, noise: 0, focusId: null, motors: ["combat"], matrix: {}, chase: null };
  },

  /* ---- Scène active ---- */
  readScene() {
    return Storage.get(this._KEY, null);
  },

  writeScene(state) {
    Storage.set(this._KEY, state);
  },

  /* ---- Rencontres rangées, par dossier ---- */
  _map() {
    return Storage.get(this._STASH_KEY, {});
  },

  /** Bundle détaché du dossier, ou `null`. */
  readBundle(dossierId) {
    if (!dossierId) return null;
    const bundle = this._map()[dossierId];
    return bundle ? structuredClone(bundle) : null;
  },

  writeBundle(dossierId, bundle) {
    if (!dossierId) return;
    const map = this._map();
    map[dossierId] = structuredClone(bundle);
    Storage.set(this._STASH_KEY, map);
  },

  /** Affordance UI (R4) : un dossier a-t-il une rencontre rangée ? */
  has(dossierId) {
    if (!dossierId) return false;
    return Object.prototype.hasOwnProperty.call(this._map(), dossierId);
  },

  /** Combien de ces dossiers portent une rencontre rangée (lecture seule) — sert
      à NOMMER ce qui va partir dans la confirmation de suppression, avant de le
      purger. */
  countIn(dossierIds) {
    if (!Array.isArray(dossierIds) && !(dossierIds instanceof Set)) return 0;
    const map = this._map();
    let n = 0;
    for (const id of dossierIds) if (Object.prototype.hasOwnProperty.call(map, id)) n++;
    return n;
  },

  /** Purge les rencontres rangées de ces dossiers (VIS-16 Failsafe : un nœud
      supprimé ne doit pas laisser son bundle derrière lui). Sans ça l'entrée
      survit au nœud, ne se voit plus nulle part — et la fusion de sauvegarde
      étant ADDITIVE (`backup.js`), l'orphelin ne meurt pas : il voyage d'un
      appareil à l'autre. Renvoie le nombre d'entrées retirées. */
  purge(dossierIds) {
    if (!Array.isArray(dossierIds) && !(dossierIds instanceof Set)) return 0;
    const map = this._map();
    let n = 0;
    for (const id of dossierIds) {
      if (Object.prototype.hasOwnProperty.call(map, id)) { delete map[id]; n++; }
    }
    if (n) Storage.set(this._STASH_KEY, map);
    return n;
  },

  /** Résumé STATIQUE d'une rencontre rangée (cockpit V4) : lit le bundle du
      dossier sans le restaurer — `{ count, round }` (combattants + round au
      moment du rangement). `null` si aucun bundle. */
  summary(dossierId) {
    const bundle = this.readBundle(dossierId);
    if (!bundle) return null;
    return { count: (bundle.combatants || []).length, round: bundle.round || 1 };
  },
};

// Pont couche 1 (migration modules ES) — retiré en fin de migration.
window.EncounterStore = EncounterStore;
