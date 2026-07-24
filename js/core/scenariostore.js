"use strict";

/* ============================================================
   SCENARIO STORE — la vérité des TRAMES scénaristiques du MJ.
   ------------------------------------------------------------
   Vérité NOUVELLE et détenue (les scènes n'existent nulle part
   ailleurs), routée par Storage — jamais de localStorage direct.
   Sœur de FactionStore par la forme (un registre plat, par édition,
   sur une clé unique), mais d'un domaine tout autre : une trame est
   un petit graphe de scènes + les couches qui s'y greffent.

       Scenario {
         id, title, system,
         templateOrigin,
         sceneNodes[], sceneEdges[],     ← le graphe de scènes (S1)
         infoNodes[], clues[],           ← le graphe d'indices (S4)
         clocks[], fronts[],             ← la pression dynamique (S5)
         runtime                         ← l'état de PARTIE, séparé de l'édition
       }

   Ce module est le socle (lot S0) : la coque de données + l'émetteur.
   Il PROUVE le patron générique sur UN sous-tableau (scènes + arêtes) ;
   les autres sous-tableaux (infoNodes, clues, clocks, fronts) répliquent
   exactement le même moule à leur lot — pas de code mort écrit d'avance.

   ── Deux garanties portées dès S0 ──
   1. SÉPARATION édition/runtime (Failsafe) : les mutateurs d'édition ne
      touchent JAMAIS `runtime` ; `patchRuntime`/`clearRuntime` ne touchent
      JAMAIS un champ d'édition. Une partie en cours n'écrase pas la prep.
   2. INTÉGRITÉ interne : `removeSceneNode` élague les arêtes pendantes et
      les ancres d'indice qui le visent, et RENVOIE les retraits (undo),
      comme `FactionStore.purgeEntities` rend ses retraits.

   ── L'émetteur SÉMANTIQUE (le cœur du live) ──
   Distinct de `Storage.subscribe`, qui ne dit que « le blob a changé » —
   trop grossier pour un patch chirurgical. Ici chaque mutation émet CE qui
   a changé : { scenarioId, kind, op, id }. Une lentille (schéma, cockpit)
   s'abonne et ne re-rend QUE le nœud touché → « une vérité, plusieurs
   lentilles-éditrices », édition live sans écraser le feel.
   Contrat d'ordre : muter → save() (→ Storage._notify) → _emit(sémantique).

   Ids STABLES partout (jamais de référence par titre — piège activeIdentity) :
   `from/to`, `toInfoNode`, `anchorSceneNodes`, `targetId`, `castIds`,
   `factionId` sont des ids. Édition-NEUTRE : un graphe de scènes est commun
   aux 4 livres ; Storage gère le namespacing par édition. Feuille : dépend
   de Storage seul. Voir PLANS/architecture-graphe-scenaristique.md § S0.
   ============================================================ */
import { Storage } from "./storage.js";

export const ScenarioStore = {
  _key: "scenarios",
  _scenarios: [],
  _observers: new Set(),

  /* ---- Persistance (par édition, via Storage) ---- */
  load() {
    const raw = Storage.get(this._key, []);
    this._scenarios = Array.isArray(raw) ? raw : [];
    return this._scenarios;
  },
  save() {
    Storage.set(this._key, this._scenarios);
  },

  _uid(prefix) {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },

  /* ---- Émetteur sémantique (≠ Storage.subscribe) ----
     `subscribe` renvoie une fonction de désabonnement. `_emit` est appelé
     APRÈS mutation + save() par chaque mutateur ; un abonné qui lit
     `get(scenarioId)` dans le callback voit donc l'état neuf. */
  subscribe(cb) {
    if (typeof cb !== "function") return () => {};
    this._observers.add(cb);
    return () => this._observers.delete(cb);
  },
  _emit(evt) {
    for (const cb of this._observers) {
      try { cb(evt); }
      catch (e) { /* un observateur défaillant n'interrompt pas les autres */ }
    }
  },

  /* ---- Lecture ---- */
  all() {
    return this._scenarios;
  },
  get(id) {
    return this._scenarios.find((s) => s && s.id === id) || null;
  },

  /* ---- CRUD scénario ---- */
  /** Crée une trame vide (titre requis ; `system` pour la peau, pas pour
      brancher — la structure est édition-neutre). Renvoie le scénario. */
  create({ title, system = null } = {}) {
    const clean = String(title || "").trim();
    if (!clean) return null;
    const sc = {
      id: this._uid("sc"),
      title: clean,
      system: system || null,
      runId: null, // S2 : run (dossier) que cette trame structure — liaison légère
      templateOrigin: null,
      sceneNodes: [],
      sceneEdges: [],
      infoNodes: [],
      clues: [],
      clocks: [],
      fronts: [],
      runtime: null,
    };
    this._scenarios.push(sc);
    this.save();
    this._emit({ scenarioId: sc.id, kind: "scenario", op: "add", id: sc.id });
    return sc;
  },
  rename(id, title) {
    const sc = this.get(id);
    const clean = String(title || "").trim();
    if (!sc || !clean) return false;
    sc.title = clean;
    this.save();
    this._emit({ scenarioId: id, kind: "scenario", op: "update", id });
    return true;
  },
  setSystem(id, system) {
    const sc = this.get(id);
    if (!sc) return false;
    sc.system = system || null;
    this.save();
    this._emit({ scenarioId: id, kind: "scenario", op: "update", id });
    return true;
  },
  /** S2 — lie (ou délie avec `null`) la trame au run qu'elle structure. Le lien
      est porté par la TRAME (pas par le schéma Dossiers — Kernel : ne pas muter
      la vérité d'un autre store). Le cockpit retrouve la trame par `byRun`. */
  setRunId(id, runId) {
    const sc = this.get(id);
    if (!sc) return false;
    sc.runId = runId || null;
    this.save();
    this._emit({ scenarioId: id, kind: "scenario", op: "update", id });
    return true;
  },
  /** La trame liée à un run (la première ; une trame par run par convention). */
  byRun(runId) {
    if (!runId) return null;
    return this._scenarios.find((s) => s && s.runId === runId) || null;
  },
  remove(id) {
    const before = this._scenarios.length;
    this._scenarios = this._scenarios.filter((s) => s && s.id !== id);
    if (this._scenarios.length === before) return false;
    this.save();
    this._emit({ scenarioId: id, kind: "scenario", op: "remove", id });
    return true;
  },

  /* ============================================================
     GRAPHE DE SCÈNES — le moule générique, prouvé une fois ici.
     Les sous-tableaux infoNodes/clues/clocks/fronts le répliquent
     à leur lot (S4/S5) : mêmes trois verbes, même contrat d'émission.
     ============================================================ */

  /** Ajoute un nœud-scène. `type` par défaut "action" ; `castIds` (convokes)
      et `locationId` restent vides à S0 — S1 les peuplera. */
  addSceneNode(scId, { type = "action", title = "", body = "", x = 0, y = 0 } = {}) {
    const sc = this.get(scId);
    if (!sc) return null;
    const node = {
      id: this._uid("n"),
      type,
      title: String(title || "").trim(),
      body: body || "",
      castIds: [],
      locationId: null,
      templateBeat: null,
      x, y,
    };
    sc.sceneNodes.push(node);
    this.save();
    this._emit({ scenarioId: scId, kind: "sceneNode", op: "add", id: node.id });
    return node;
  },
  updateSceneNode(scId, nodeId, patch = {}) {
    const sc = this.get(scId);
    if (!sc) return false;
    const node = sc.sceneNodes.find((n) => n && n.id === nodeId);
    if (!node) return false;
    Object.assign(node, patch, { id: node.id }); // l'id ne se réécrit jamais
    this.save();
    this._emit({ scenarioId: scId, kind: "sceneNode", op: "update", id: nodeId });
    return true;
  },
  /** Retire un nœud + tout ce qui le référence en interne (arêtes pendantes,
      ancres d'indice, pointeur de scène courante du runtime). Renvoie les
      retraits pour un undo, comme FactionStore.purgeEntities. */
  removeSceneNode(scId, nodeId) {
    const sc = this.get(scId);
    if (!sc) return null;
    const idx = sc.sceneNodes.findIndex((n) => n && n.id === nodeId);
    if (idx < 0) return null;
    const node = sc.sceneNodes[idx];
    sc.sceneNodes.splice(idx, 1);

    const removedEdges = sc.sceneEdges.filter(
      (e) => e && (e.from === nodeId || e.to === nodeId),
    );
    if (removedEdges.length)
      sc.sceneEdges = sc.sceneEdges.filter(
        (e) => e && e.from !== nodeId && e.to !== nodeId,
      );

    const removedAnchors = [];
    for (const c of sc.clues) {
      if (c && Array.isArray(c.anchorSceneNodes) && c.anchorSceneNodes.includes(nodeId)) {
        c.anchorSceneNodes = c.anchorSceneNodes.filter((a) => a !== nodeId);
        removedAnchors.push({ clueId: c.id, sceneNodeId: nodeId });
      }
    }

    // Intégrité runtime : la scène courante ne peut pas pointer un nœud disparu.
    if (sc.runtime && sc.runtime.currentSceneId === nodeId) sc.runtime.currentSceneId = null;

    this.save();
    this._emit({ scenarioId: scId, kind: "sceneNode", op: "remove", id: nodeId });
    return { node, removedEdges, removedAnchors };
  },

  /** Ajoute une arête entre deux nœuds existants. `gateway` (exclusive/parallel)
      et `isEscapeHatch` (la sortie de secours d'Alexander) par défaut neutres. */
  addSceneEdge(scId, {
    from, to,
    kind = "libre", gateway = null, isEscapeHatch = false,
    condition = null, triggerClockId = null, triggerThreshold = null, label = "",
  } = {}) {
    const sc = this.get(scId);
    if (!sc || !from || !to) return null;
    const has = (id) => sc.sceneNodes.some((n) => n && n.id === id);
    if (!has(from) || !has(to)) return null;
    const edge = {
      id: this._uid("e"),
      from, to, kind, gateway,
      isEscapeHatch: !!isEscapeHatch,
      condition, triggerClockId, triggerThreshold,
      label: String(label || ""),
    };
    sc.sceneEdges.push(edge);
    this.save();
    this._emit({ scenarioId: scId, kind: "sceneEdge", op: "add", id: edge.id });
    return edge;
  },
  updateSceneEdge(scId, edgeId, patch = {}) {
    const sc = this.get(scId);
    if (!sc) return false;
    const edge = sc.sceneEdges.find((e) => e && e.id === edgeId);
    if (!edge) return false;
    Object.assign(edge, patch, { id: edge.id });
    this.save();
    this._emit({ scenarioId: scId, kind: "sceneEdge", op: "update", id: edgeId });
    return true;
  },
  removeSceneEdge(scId, edgeId) {
    const sc = this.get(scId);
    if (!sc) return false;
    const before = sc.sceneEdges.length;
    sc.sceneEdges = sc.sceneEdges.filter((e) => e && e.id !== edgeId);
    if (sc.sceneEdges.length === before) return false;
    this.save();
    this._emit({ scenarioId: scId, kind: "sceneEdge", op: "remove", id: edgeId });
    return true;
  },

  /* ---- Runtime : état de PARTIE, strictement séparé de l'édition (Failsafe) ----
     N'écrit QUE `runtime`. Aucun mutateur d'édition n'écrit `runtime` :
     une séance en cours ne peut donc pas corrompre la prep. */
  patchRuntime(scId, partial = {}) {
    const sc = this.get(scId);
    if (!sc) return false;
    sc.runtime = Object.assign({}, sc.runtime || {}, partial || {});
    this.save();
    this._emit({ scenarioId: scId, kind: "runtime", op: "patch", id: scId });
    return true;
  },
  clearRuntime(scId) {
    const sc = this.get(scId);
    if (!sc) return false;
    sc.runtime = null;
    this.save();
    this._emit({ scenarioId: scId, kind: "runtime", op: "clear", id: scId });
    return true;
  },

  /* ---- Intégrité EXTERNE (entités supprimées) ----
     Méthode prête ; le CÂBLAGE dans collection.js est différé à S1 (les
     `castIds` n'existent qu'à partir de S1 — le brancher maintenant serait
     du code mort). Calqué FactionStore : renvoie les retraits pour l'undo. */
  purgeEntities(ids) {
    const set = ids instanceof Set ? ids : new Set(ids);
    const removed = [];
    let changed = false;
    for (const sc of this._scenarios) {
      if (!sc || !Array.isArray(sc.sceneNodes)) continue;
      for (const n of sc.sceneNodes) {
        if (!n || !Array.isArray(n.castIds) || !n.castIds.length) continue;
        const kept = [];
        for (const eid of n.castIds) {
          if (set.has(eid)) {
            removed.push({ scenarioId: sc.id, sceneNodeId: n.id, entityId: eid });
            changed = true;
          } else kept.push(eid);
        }
        if (kept.length !== n.castIds.length) n.castIds = kept;
      }
    }
    if (changed) this.save();
    return removed;
  },
  /** Réinsère des appartenances de cast retirées (undo de suppression d'entité).
      Idempotent : ignore un cast déjà présent, un nœud ou un scénario disparu. */
  addMemberships(list) {
    if (!Array.isArray(list) || !list.length) return;
    let changed = false;
    for (const { scenarioId, sceneNodeId, entityId } of list) {
      const sc = this.get(scenarioId);
      const n = sc && sc.sceneNodes.find((x) => x && x.id === sceneNodeId);
      if (n && Array.isArray(n.castIds) && !n.castIds.includes(entityId)) {
        n.castIds.push(entityId);
        changed = true;
      }
    }
    if (changed) this.save();
  },
};

// Pont couche 1 (voir PLANS/PLAN_MODULES_ES.md) : global classique tant que
// les couches hautes n'ont pas basculé en `import`.
window.ScenarioStore = ScenarioStore;
