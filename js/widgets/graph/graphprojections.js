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
// ⚠ Les clés sont CELLES DE LA TRAME (`ScenarioGraph._TYPES`), pas celles du
// plan : il écrivait « legwork », l'app dit « repérage » depuis S1 et c'est ce
// mot que le MJ lit. Deux lentilles sur la même grammaire ne peuvent pas
// nommer différemment la même chose ; la teinte suit (`--t-*` partagés).
const FLOW_TYPES = {
  accroche: { glyph: "◎", shape: "circle", label: "Accroche", tint: "--t-accroche" },
  "repérage": { glyph: "⌕", shape: "rect", label: "Repérage", tint: "--t-reperage" },
  action: { glyph: "⚔", shape: "rect", label: "Action", tint: "--t-action" },
  sociale: { glyph: "❝", shape: "rect", label: "Sociale", tint: "--t-sociale" },
  "décision": { glyph: "⑂", shape: "diamond", label: "Décision", tint: "--t-decision" },
  "retombée": { glyph: "⚑", shape: "circle-double", label: "Retombée", tint: "--t-retombee" },
};
// Motif de trait par type d'arête (édition-neutre, canal `pattern` du moteur).
const FLOW_KIND_PATTERN = { libre: "solid", conditionnelle: "dotted", evenement: "dashed" };

// P1 (reliquat) — formes par catégorie pour le graphe d'ENTITÉS. Le moteur
// portait déjà le canal `n.shape` de façon neutre, mais seule la Trame
// l'alimentait : toutes les entités sortaient en cercle.
//
// ⚠ Ce n'est PAS une information neuve — le moteur distingue déjà les quatre
// types par glyphe (`TYPE_GLYPH` : pj ◆ · pnj ● · contact ◈ · server ▤). Ce
// que la forme ajoute, c'est la LISIBILITÉ À DISTANCE : un glyphe dans un
// disque de 16 px disparaît dès qu'on recule ou qu'on dézoome, la silhouette
// non (« à un mètre, les yeux plissés », checklist du design system). Même
// information, deux échelles de lecture.
//
// La forme RIME donc avec le glyphe déjà en service plutôt que d'inventer un
// second vocabulaire : ● reste un cercle, ▤ devient un rectangle, ◆ un losange.
// `contact` est le seul arbitrage : c'est un pnj AVEC un lien vers l'équipe,
// d'où le cercle redoublé — une personne, cerclée.
//
// ⚠ Réserve assumée : `diamond` et `circle-double` portent aussi un sens dans
// la Trame (décision, retombée). Les deux lentilles ne partagent jamais un
// canvas — l'une montre des SCÈNES, l'autre des PERSONNES — et la doctrine
// interdit de nommer différemment la même chose, pas de réemployer une
// primitive géométrique sur deux familles d'objets. Aucune forme libre ne
// permettait d'éviter tout recouvrement (le moteur en offre cinq).
const ENTITY_SHAPE = { pj: "diamond", pnj: "circle", contact: "circle-double", server: "rect" };

export const GraphProjections = {
  // Vocabulaire exposé pour les vues (sélecteurs de type de nœud/arête) —
  // une seule source, la projection ne le laisse pas se dupliquer en vue.
  FLOW_TYPES,
  FLOW_KIND_PATTERN,
  ENTITY_SHAPE,

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
        // `shape` (P1) est une donnée de PROJECTION, comme `inScope` : le moteur
        // ne décide pas du sens, il rend la forme demandée. Type inconnu →
        // `circle`, le défaut du moteur (aucune régression possible).
        nodes.push({
          ...CardZones.density0({ ...loc, id }),
          shape: ENTITY_SHAPE[loc.type] || "circle",
          inScope: core.has(id),
          portrait: loc.portraitUrl || null,
        });
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
        // « Carte à silhouette » : même canal `card` que la Trame, rempli des
        // SEULS champs qu'un nœud Dossiers porte réellement — un dossier n'a
        // ni description ni lieu (contrairement à `ScenarioStore.sceneNodes`),
        // donc rien n'est inventé : le sous-titre dit ce que le nœud CONTIENT
        // (dérivé de l'arbre) et les puces qui il CONVOQUE (dérivé de
        // `convokes`, par référence). Le moteur ne replie en petit disque que
        // sous faible largeur, tout seul.
        card: {
          glyph: t ? t.glyph : "◻",
          typeLabel: t ? t.label : this._kindLabel(d),
          title: d.name,
          sub: this._flowSub(d),
          chips: this._castChips(d),
          tintVar: t ? t.tint : null,
        },
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

  /** Étiquette de repli quand le nœud n'a pas de `sceneType` : son `kind` de
      campagne (Campagne/Run/Scène) plutôt qu'un vide — un run non typé reste
      un run. Rien pour un dossier libre : il n'est rien de nommé. */
  _kindLabel(d) {
    return { campaign: "Campagne", run: "Run", scene: "Scène" }[d.kind] || "";
  },

  /** Sous-titre ▸ : ce que le nœud CONTIENT, dérivé de l'arbre (jamais saisi).
      Une campagne compte ses runs, un run ses scènes ; à défaut, ses
      sous-dossiers. Vide quand il n'a pas d'enfant — pas de « 0 » à lire. */
  _flowSub(d) {
    const kids = Dossiers.children(d.id);
    if (!kids.length) return "";
    const runs = kids.filter((k) => k.kind === "run").length;
    if (runs) return `${runs} run${runs > 1 ? "s" : ""}`;
    const scenes = kids.filter((k) => k.kind === "scene").length;
    if (scenes) return `${scenes} scène${scenes > 1 ? "s" : ""}`;
    return `${kids.length} sous-dossier${kids.length > 1 ? "s" : ""}`;
  },

  /** Puces de casting : les refs CONVOQUÉES par le nœud, résolues par nom (une
      Faction reste UNE puce — on ne déplie pas son roster ici, la carte dirait
      douze noms là où le MJ en a convoqué un). 3 max + « +N », comme la Trame.
      Une ref qui ne résout plus est écartée, pas rendue en « ? ». */
  _castChips(d) {
    const names = [];
    for (const c of Dossiers.convokesOf(d.id)) {
      if (!c) continue;
      if (c.ref === "faction") {
        const f = typeof FactionStore !== "undefined" ? FactionStore.get(c.id) : null;
        if (f) names.push(f.name);
      } else {
        const loc = typeof PnjLookup !== "undefined" ? PnjLookup.locate(c.id) : null;
        if (loc) names.push(loc.name);
      }
    }
    if (!names.length) return [];
    const shown = names.slice(0, 3).map((text) => ({ text }));
    if (names.length > 3) shown.push({ text: `+${names.length - 3}` });
    return shown;
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
    // Marges dimensionnées sur la CARTE (168 × 84 dans le moteur), pas sur le
    // petit disque : une demi-carte de chaque côté, sinon les cartes des bords
    // sortent du cadre et celles d'une même couche se chevauchent. La couche
    // suivante est posée au moins une hauteur de carte plus bas — le câble doit
    // rester lisible entre deux étages.
    const padX = 95, padY = 60, ROW_MIN = 110;
    const usableH = Math.max(1, H - 2 * padY);
    for (const [d, row] of byDepth) {
      const y = maxDepth
        ? padY + (d / maxDepth) * Math.max(usableH, maxDepth * ROW_MIN)
        : H / 2;
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
