"use strict";

/* ============================================================
   GRAPH PROJECTIONS — la vérité d'arête (RelationsStore) + les
   rosters (Collection, via PnjLookup) PROJETÉS en { nodes, edges }
   consommables par le moteur de graphe. Aucune vérité détenue : une
   pure lentille, recalculée à la demande.
   ------------------------------------------------------------
   `buildRelationGraph({ focusId?, memberIds? })` → { nodes, edges }
     - focusId  : ne garder que l'entité + ses voisines directes ;
     - memberIds: restreindre l'univers à ces ids (calculé par la vue
                  depuis l'appartenance de dossier — la projection reste
                  pure, sans coupler Collection/Dossiers) ;
     - aucun    : toutes les entités touchées par au moins une arête.
   Nœuds typés via `PnjLookup.locate` (pnj/pj/contact/server) ; un id
   qui ne résout plus (entité supprimée) est écarté, et les arêtes
   orphelines avec — la purge B0 les retire déjà, ce filtre est le
   garde-fou d'affichage. VIS-15 B1, cf. PLAN_MOTEUR_GRAPHE_UNIFIE.md.
   ============================================================ */

export const GraphProjections = {
  /** Projette la lentille « relations ». Lit RelationsStore + PnjLookup,
      tous deux résolveurs (jamais de store parallèle). */
  buildRelationGraph({ focusId = null, memberIds = null } = {}) {
    const store = typeof RelationsStore !== "undefined" ? RelationsStore : null;
    const edges = (store ? store.all() : []).filter((e) => e && e.from && e.to);

    // 1. Univers de nœuds selon la portée.
    let nodeIds;
    if (focusId) {
      nodeIds = new Set([focusId]);
      for (const e of edges) {
        if (e.from === focusId) nodeIds.add(e.to);
        if (e.to === focusId) nodeIds.add(e.from);
      }
    } else if (Array.isArray(memberIds)) {
      nodeIds = new Set(memberIds);
    } else {
      nodeIds = new Set();
      for (const e of edges) {
        nodeIds.add(e.from);
        nodeIds.add(e.to);
      }
    }

    // 2. Résolution typée ; un id non résolu est écarté (jamais un nœud fantôme).
    const nodes = [];
    for (const id of nodeIds) {
      const loc = typeof PnjLookup !== "undefined" ? PnjLookup.locate(id) : null;
      if (loc) nodes.push({ id, label: loc.name || "Sans nom", type: loc.type, pcColor: loc.pcColor || null });
    }

    // 3. Arêtes dont les deux bouts sont présents (orphelines écartées).
    const present = new Set(nodes.map((n) => n.id));
    const keptEdges = edges
      .filter((e) => present.has(e.from) && present.has(e.to))
      .map((e) => ({ id: e.id, from: e.from, to: e.to, type: e.type, label: e.label || "" }));

    return { nodes, edges: keptEdges };
  },
};

// Pont couche 5 (voir PLANS/PLAN_MODULES_ES.md).
window.GraphProjections = GraphProjections;
