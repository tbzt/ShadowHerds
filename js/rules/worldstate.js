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
  /** Faits de campagne dérivés pour la portée d'un dossier (son sous-arbre).
      `dossierId` falsy (hors campagne) → aucun fait. Recalculé à la demande,
      jamais mis en cache/persisté. */
  factsFor(dossierId) {
    if (!dossierId) return { factions: [] };
    const scope =
      typeof Dossiers !== "undefined" ? [...Dossiers.descendantIds(dossierId)] : [dossierId];
    const scopeSet = new Set(scope);
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
    return { factions };
  },
};

// Pont couche 2 (voir PLANS/PLAN_MODULES_ES.md).
window.WorldState = WorldState;
