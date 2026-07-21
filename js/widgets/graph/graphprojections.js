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
import { CardZones } from "../../rules/cardzones.js";

export const GraphProjections = {
  /** Voisins directs d'un ensemble d'ids (les bouts d'arête hors de l'ensemble). */
  _neighborsOf(edges, idSet) {
    const out = new Set();
    for (const e of edges) {
      if (idSet.has(e.from) && !idSet.has(e.to)) out.add(e.to);
      if (idSet.has(e.to) && !idSet.has(e.from)) out.add(e.from);
    }
    return out;
  },

  /** Projette la lentille « relations ». Lit RelationsStore + PnjLookup,
      tous deux résolveurs (jamais de store parallèle). `halo` (B4) : quand la
      portée est bornée (focus ou membres), ajoute une couronne de voisins
      immédiats HORS portée, marqués `inScope:false` — le périmètre en plein, ses
      voisins estompés. */
  buildRelationGraph({ focusId = null, memberIds = null, halo = false } = {}) {
    const store = typeof RelationsStore !== "undefined" ? RelationsStore : null;
    const edges = (store ? store.all() : []).filter((e) => e && e.from && e.to);

    // 1. Le CŒUR (in-scope) selon la portée.
    let core;
    if (focusId) {
      core = new Set([focusId]);
      for (const nb of this._neighborsOf(edges, core)) core.add(nb); // focus + voisins directs
    } else if (Array.isArray(memberIds)) {
      core = new Set(memberIds);
    } else {
      core = new Set();
      for (const e of edges) { core.add(e.from); core.add(e.to); }
    }

    // 2. Le HALO : voisins immédiats du cœur, hors cœur (portée bornée seulement).
    const bounded = !!focusId || Array.isArray(memberIds);
    const haloSet = halo && bounded ? this._neighborsOf(edges, core) : new Set();
    const included = new Set([...core, ...haloSet]);

    // 3. Résolution typée ; un id non résolu est écarté (jamais un nœud fantôme).
    const nodes = [];
    for (const id of included) {
      const loc = typeof PnjLookup !== "undefined" ? PnjLookup.locate(id) : null;
      if (loc)
        // Face-NŒUD = densité 0 du continuum carte : l'identité (id/nom/type)
        // définie à un seul endroit (cardzones), pas ré-inlinée ici. `inScope`
        // (B4, portée/halo) est une donnée de PROJECTION, ajoutée par-dessus.
        nodes.push({ ...CardZones.density0({ ...loc, id }), inScope: core.has(id) });
    }

    // 4. Arêtes dont les deux bouts sont présents (orphelines écartées).
    const present = new Set(nodes.map((n) => n.id));
    const keptEdges = edges
      .filter((e) => present.has(e.from) && present.has(e.to))
      .map((e) => ({ id: e.id, from: e.from, to: e.to, type: e.type, label: e.label || "" }));

    return { nodes, edges: keptEdges };
  },
};

// Pont couche 5 (voir PLANS/PLAN_MODULES_ES.md).
window.GraphProjections = GraphProjections;
