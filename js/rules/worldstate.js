"use strict";

/* ============================================================
   WORLD STATE — la mémoire du monde, DÉRIVÉE (VIS-12, Phase 1).
   ------------------------------------------------------------
   Feuille de couche basse, NEUTRE : elle LIT la vérité déjà persistée
   (les topos rangés dans `gen_runs`, l'arbre `Dossiers`, le catalogue
   de factions) et REND des FAITS. Elle n'écrit rien, n'introduit aucun
   store, ne connaît AUCUN contrôleur. Le générateur ne l'importe pas :
   c'est `RunGen` (couche haute) qui calcule les faits et les passe à
   `ToposCatalog.assemble(facts)` — injection DESCENDANTE, jamais montante.

   Phase 1 = un seul fait : le HEAT DE FACTION (récurrence d'une faction
   comme opposition/mandant dans les runs passés de la portée courante).
   Annotation seule côté générateur (aucun pick biaisé) : informer, jamais
   décider. Phases 2+ (biais, relations, réputation) : cf.
   PLANS/PLAN_WORLDSTATE_MEMOIRE_MONDE.md.
   ============================================================ */
import { Storage } from "../core/storage.js";
import { ToposCatalog } from "./toposcatalog.js";

export const WorldState = {
  /** Faits de campagne dérivés pour la portée d'un dossier. La mémoire est
      CAMPAGNE-LARGE : on remonte à la racine de l'arbre auquel `dossierId`
      appartient, puis on prend tout son sous-arbre — générer dans un run voit
      donc la mémoire de tous les runs de sa campagne. `dossierId` falsy (hors
      campagne) → aucun fait. Recalculé à la demande, jamais persisté. */
  factsFor(dossierId) {
    if (!dossierId) return { factions: [], contacts: [] };
    const scopeSet = new Set(this._campaignScope(dossierId));
    const runs = (Storage.get("gen_runs", []) || []).filter(
      (r) => r && scopeSet.has(r.dossierId),
    );

    // Récurrence de faction : compte les apparitions comme opposition/mandant.
    const byKey = new Map();
    const bump = (key, role) => {
      if (!key || !ToposCatalog.factions[key]) return;
      let f = byKey.get(key);
      if (!f) {
        f = { key, name: ToposCatalog.factions[key].nom, count: 0, asOpposition: 0, asMandant: 0 };
        byKey.set(key, f);
      }
      f.count++;
      if (role === "opposition") f.asOpposition++;
      else f.asMandant++;
    };
    for (const r of runs) {
      bump(r.opposition, "opposition");
      bump(r.mandant, "mandant");
    }

    const factions = [...byKey.values()].sort((a, b) => b.count - a.count);
    return { factions, contacts: this._contactsIn(scopeSet) };
  },

  /** Sous-arbre de la RACINE de campagne à laquelle appartient `dossierId`
      (remontée `parentId` jusqu'au sommet, puis descendants). */
  _campaignScope(dossierId) {
    if (typeof Dossiers === "undefined") return [dossierId];
    let node = Dossiers.get(dossierId);
    for (let i = 0; node && node.parentId && i < 50; i++) node = Dossiers.get(node.parentId);
    const rootId = node ? node.id : dossierId;
    return [...Dossiers.descendantIds(rootId)];
  },

  /** Contacts connus de l'ÉQUIPE dans la portée : les PJ rangés dans le
      sous-arbre (lu brut `characters_groups`, comme `gen_runs` — pas de
      remontée vers DossierBar) → leurs liens contact (`RelationsStore`, core),
      dédupliqués par contact (meilleure loyauté retenue), triés par loyauté.
      Reste couche basse : Storage + RelationsStore, jamais un widget. */
  _contactsIn(scopeSet) {
    const RS = typeof RelationsStore !== "undefined" ? RelationsStore : null;
    if (!RS) return [];
    const groups = Storage.get("characters_groups", {}) || {};
    const pjIds = new Set();
    for (const [key, members] of Object.entries(groups))
      if (scopeSet.has(key) && Array.isArray(members)) for (const id of members) pjIds.add(id);
    const nameById = new Map((Storage.get("contacts_all", []) || []).map((c) => [c.id, c.name]));
    const byContact = new Map();
    for (const pjId of pjIds) {
      for (const l of RS.contactLinksOf(pjId)) {
        const ex = byContact.get(l.contactId);
        if (ex) {
          if ((l.loyalty ?? 0) > (ex.loyalty ?? 0)) {
            ex.loyalty = l.loyalty ?? null;
            if (l.relation) ex.relation = l.relation;
          }
          continue;
        }
        byContact.set(l.contactId, {
          id: l.contactId,
          name: nameById.get(l.contactId) || "un contact",
          relation: l.relation || "",
          loyalty: l.loyalty ?? null,
        });
      }
    }
    return [...byContact.values()].sort((a, b) => (b.loyalty ?? 0) - (a.loyalty ?? 0));
  },
};

// Pont couche 2 (voir PLANS/PLAN_MODULES_ES.md).
window.WorldState = WorldState;
