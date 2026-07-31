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
   ------------------------------------------------------------
   `buildFlowGraph({ parentId? })` → { nodes, edges } — VIS-15 B3, la 2ᵉ
   projection (« mode enchaînement »). Lit `Dossiers` : les enfants directs
   de `parentId` (runs d'une campagne, ou scènes d'un run — même grammaire
   aux deux échelles, `node.next`) deviennent les nœuds, `next`/`nextKind`
   les arêtes. `parentId` null → les campagnes racines. Layout HIÉRARCHIQUE
   (couches par profondeur topologique depuis les sources), pas de forces :
   un flux se lit de haut en bas, pas en essaim. Aucune position n'est
   persistée (Dossiers n'a pas de champ x/y) — recalculée à chaque
   projection, un glisser reste local à la session (repositionne le temps de
   la vue ouverte, comme un brouillon).
   ============================================================ */
import { CardZones } from "../../rules/cardzones.js";
import { Dossiers } from "../journal/dossiers.js";

// VIS-15 B3 — vocabulaire de nœud du mode Flux, greffé de l'Approche 1 du
// doc aveugle (cf. PLAN_MOTEUR_GRAPHE_UNIFIE.md § B3) : système-agnostique
// (SR5/SR6/Anarchy partagent la même liste), forme BPMN par catégorie —
// même vocabulaire de forme que le moteur (P1) et la Trame (scénariograph),
// pour que « seuil = cercle », « décision = losange » se lisent pareil
// partout. Un nœud sans `sceneType` reste un rectangle neutre (◻).
const FLOW_TYPES = {
  accroche: { glyph: "◎", shape: "circle", label: "Accroche" },
  legwork: { glyph: "⌕", shape: "rect", label: "Enquête" },
  action: { glyph: "⚔", shape: "rect", label: "Action" },
  sociale: { glyph: "❝", shape: "rect", label: "Sociale" },
  "décision": { glyph: "⑂", shape: "diamond", label: "Décision" },
  "retombée": { glyph: "⚑", shape: "circle-double", label: "Retombée" },
};
// Motif de trait par type d'arête (édition-neutre, canal `pattern` du moteur).
const FLOW_KIND_PATTERN = { libre: "solid", conditionnelle: "dotted", evenement: "dashed" };

export const GraphProjections = {
  // Vocabulaire exposé pour les vues (sélecteurs de type de nœud/arête) —
  // une seule source, la projection ne le laisse pas se dupliquer en vue.
  FLOW_TYPES,
  FLOW_KIND_PATTERN,

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
        nodes.push({ ...CardZones.density0({ ...loc, id }), inScope: core.has(id), portrait: loc.portraitUrl || null });
    }

    // 4. Arêtes dont les deux bouts sont présents (orphelines écartées). On
    // projette aussi le style d'arête (Lot 3 : couleur/pointillés/direction/mot),
    // défauts défensifs — une vieille arête sans ces champs se lit proprement.
    const present = new Set(nodes.map((n) => n.id));
    const keptEdges = edges
      .filter((e) => present.has(e.from) && present.has(e.to))
      .map((e) => ({
        id: e.id,
        from: e.from,
        to: e.to,
        type: e.type,
        label: e.label || "",
        color: e.color || null,
        pattern: e.pattern || null, // P3 — motif de trait (rétrocompat via dashed)
        dashed: !!e.dashed,
        dir: e.dir || "none",
      }));

    return { nodes, edges: keptEdges };
  },

  /** VIS-15 B3 — projette le mode Flux : les enfants directs de `parentId`
      (grammaire `Dossiers` : campagnes racines si `parentId` est absent,
      runs d'une campagne, scènes d'un run) et leurs arêtes `next`, mis en
      couches par profondeur topologique (source = sans arête entrante dans
      cet ensemble). `width`/`height` = la taille réelle du canvas hôte
      (mesurée par la vue) : sans elles, les nœuds se poseraient au repère
      par défaut du moteur, pas au centre du conteneur réel. */
  buildFlowGraph({ parentId = null, width = 640, height = 460 } = {}) {
    const kids = parentId == null ? Dossiers.roots() : Dossiers.children(parentId);
    const nodes = kids.map((d) => {
      const t = FLOW_TYPES[d.sceneType] || null;
      return {
        id: d.id,
        label: d.name,
        sceneType: d.sceneType || null,
        glyph: t ? t.glyph : "◻",
        shape: t ? t.shape : "rect",
      };
    });
    const idSet = new Set(nodes.map((n) => n.id));
    const edges = [];
    for (const d of kids) {
      for (const toId of Array.isArray(d.next) ? d.next : []) {
        if (!idSet.has(toId)) continue; // cible hors de cette portée : ignorée (pas un lien fantôme)
        const kind = Dossiers.nextKindOf(d.id, toId);
        edges.push({
          id: `${d.id}→${toId}`,
          from: d.id,
          to: toId,
          kind,
          dir: "forward",
          pattern: FLOW_KIND_PATTERN[kind] || "solid",
          label: kind !== "libre" ? kind : "",
        });
      }
    }
    const pos = this._layerLayout(nodes, edges, width, height);
    for (const n of nodes) {
      const p = pos.get(n.id);
      n.x = p ? p.x : width / 2;
      n.y = p ? p.y : height / 2;
    }
    return { nodes, edges };
  },

  /** Couches par profondeur topologique (Kahn), source = degré entrant nul
      dans l'ensemble projeté. Un cycle ou un nœud jamais atteint depuis une
      source reste à sa profondeur par défaut (0) — visible, pas invisible :
      le mode Flux ne masque jamais un nœud, il le range moins bien. */
  _layerLayout(nodes, edges, W, H) {
    const ids = nodes.map((n) => n.id);
    const indeg = new Map(ids.map((id) => [id, 0]));
    const adj = new Map(ids.map((id) => [id, []]));
    const idSet = new Set(ids);
    for (const e of edges) {
      if (!idSet.has(e.from) || !idSet.has(e.to)) continue;
      adj.get(e.from).push(e.to);
      indeg.set(e.to, (indeg.get(e.to) || 0) + 1);
    }
    const depth = new Map(ids.map((id) => [id, 0]));
    const queue = ids.filter((id) => indeg.get(id) === 0);
    const seen = new Set(queue);
    for (let i = 0; i < queue.length; i++) {
      const id = queue[i];
      for (const to of adj.get(id)) {
        if (depth.get(to) < depth.get(id) + 1) depth.set(to, depth.get(id) + 1);
        if (!seen.has(to)) { seen.add(to); queue.push(to); }
      }
    }
    const byDepth = new Map();
    for (const id of ids) {
      const d = depth.get(id) || 0;
      if (!byDepth.has(d)) byDepth.set(d, []);
      byDepth.get(d).push(id);
    }
    const maxDepth = Math.max(0, ...byDepth.keys());
    const pos = new Map();
    const padX = 70, padY = 60;
    for (const [d, row] of byDepth) {
      const y = maxDepth ? padY + (d / maxDepth) * Math.max(1, H - 2 * padY) : H / 2;
      row.forEach((id, i) => {
        const x = (Math.max(1, W - 2 * padX) / (row.length + 1)) * (i + 1) + padX;
        pos.set(id, { x, y });
      });
    }
    return pos;
  },
};

// Pont couche 5 (voir PLANS/PLAN_MODULES_ES.md).
window.GraphProjections = GraphProjections;
