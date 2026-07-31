"use strict";

/* ============================================================
   FLOW VIEW — la lentille « enchaînement » (VIS-15 B3) montée à l'écran.
   ------------------------------------------------------------
   Même patron que GraphView (coquille .modal-overlay, GraphEngine en
   dessous), une vue DISTINCTE parce que c'est un mode différent : ici on
   arrange des NŒUDS DOSSIERS (runs d'une campagne, ou scènes d'un run —
   même grammaire aux deux échelles) reliés par `Dossiers.next`, layout
   HIÉRARCHIQUE (GraphProjections._layerLayout), pas de forces. Le glisser
   d'un nœud n'est jamais persisté (Dossiers n'a pas de x/y) : il redispose
   la session en cours, un remontage revient au rangement calculé — c'est un
   brouillon de lecture, pas une carte heuristique arrangée à la main (cf.
   ScenarioGraph, qui LUI persiste, sur `ScenarioStore`).
   Tap nœud → typer la scène (sceneType). Tap arête → typer le lien
   (libre/conditionnelle/événement) ou le retirer. Tisser (◈) = poser un
   lien (`Dossiers.linkNext`), pas en créer un nouveau store. Aucune
   création/suppression de nœud ici : la vérité des runs/scènes se pose
   ailleurs (Jouer, Hub) — VIS-16 n'a délégué à VIS-15 que l'ÉDITION
   visuelle des arêtes + le typage de scène, jamais le cycle de vie du nœud.
   ============================================================ */
import { GraphProjections } from "./graphprojections.js";
import { GraphEngine } from "./graphengine.js";
import { Dossiers } from "../journal/dossiers.js";
import { FocusTrap } from "../kit/focustrap.js";
import { Utils } from "../../core/utils.js";

export const FlowView = {
  _el: null,
  _releaseTrap: null,
  _parentId: null,
  _weave: false,
  _selNodeId: null,
  _selEdgeId: null,
  _edges: null, // dernières arêtes projetées (source de l'inspecteur d'arête)
  _warnings: [], // validateur « sortie de secours », recalculé à chaque projection
  _KINDS: [
    { key: "libre", label: "Libre" },
    { key: "conditionnelle", label: "Conditionnelle" },
    { key: "evenement", label: "Événement joueur" },
  ],

  /** Ouvre le mode Flux scopé à `parentId` (un run → ses scènes ; une
      campagne → ses runs ; absent → les campagnes racines). */
  open({ parentId = null, title = "Flux" } = {}) {
    this._parentId = parentId;
    this._weave = false;
    this._selNodeId = null;
    this._selEdgeId = null;
    const overlay = this._ensure();
    this._reflectWeave(overlay);
    overlay.querySelector('[data-flow="title"]').textContent = title;
    overlay.classList.add("open");
    this._releaseTrap = FocusTrap.activate(overlay);
    overlay.querySelector('[data-flow-action="close"]').focus();
    this._project(); // monté synchrone (cf. GraphView : clientWidth déjà valide, pas de rAF)
  },

  hide() {
    if (this._el) this._el.classList.remove("open");
    if (this._releaseTrap) { this._releaseTrap(); this._releaseTrap = null; }
    GraphEngine.destroy();
  },

  _project() {
    const overlay = this._el;
    if (!overlay || !overlay.classList.contains("open")) return;
    const split = overlay.querySelector(".graph-split");
    const host = overlay.querySelector('[data-flow="canvas"]');
    const empty = overlay.querySelector('[data-flow="empty"]');
    const W = Math.max(320, host.clientWidth || 640);
    const H = Math.max(240, host.clientHeight || 460);
    const graph = GraphProjections.buildFlowGraph({ parentId: this._parentId, width: W, height: H });

    if (!graph.nodes.length) {
      split.hidden = true;
      empty.hidden = false;
      GraphEngine.destroy();
      return;
    }
    split.hidden = false;
    empty.hidden = true;
    this._edges = graph.edges;
    this._warnings = this._computeWarnings(graph);
    this._reflectWarnings(overlay);
    const accent =
      (typeof App !== "undefined" && App.editionModule && App.editionModule.mapAccent) || "#35e0e6";
    GraphEngine.mount(host, {
      nodes: graph.nodes,
      edges: graph.edges,
      accent,
      static: true, // positions calculées (couches) ; drag = ephémère, rien à persister
      onNodeTap: (id) => this._selectNode(id),
      onEdgeTap: (id) => this._selectEdge(id),
      onBackgroundTap: () => this._clearInspector(),
      onWeave: (fromId, toId) => this._createLink(fromId, toId),
    });
    GraphEngine.setWeave(this._weave);
    if (this._selNodeId && graph.nodes.some((n) => n.id === this._selNodeId)) this._selectNode(this._selNodeId);
    else if (this._selEdgeId && graph.edges.some((e) => e.id === this._selEdgeId)) this._selectEdge(this._selEdgeId);
    else this._clearInspector();
  },

  /** Validateur « sortie de secours » (B3, Approche 1) : une étape Action
      n'a qu'une seule sortie ⇒ l'échec n'a nulle part où aller. Pure
      lentille sur le graphe déjà projeté, aucun store à elle. */
  _computeWarnings(graph) {
    const outCount = new Map();
    for (const e of graph.edges) outCount.set(e.from, (outCount.get(e.from) || 0) + 1);
    const warns = [];
    for (const n of graph.nodes) {
      if (n.sceneType === "action" && (outCount.get(n.id) || 0) < 2)
        warns.push({ targetId: n.id, message: `« ${n.label} » (Action) n'a qu'une sortie — l'échec n'a nulle part où aller.` });
    }
    return warns;
  },

  _reflectWarnings(overlay) {
    const b = overlay.querySelector('[data-flow-action="robustesse"]');
    if (!b) return;
    const n = this._warnings.length;
    b.textContent = n ? `⚠ Robustesse (${n})` : "✓ Robustesse";
    b.classList.toggle("has-warnings", n > 0);
  },

  /* ---- Inspecteur nœud : typer la scène (sceneType) ---- */
  _selectNode(id) {
    GraphEngine.select(id);
    this._selEdgeId = null;
    this._selNodeId = id;
    const panel = this._el.querySelector('[data-flow="inspector"]');
    if (!panel) return;
    const node = Dossiers.get(id);
    if (!node) return this._clearInspector();
    panel.classList.remove("empty");
    panel.innerHTML = this._nodeInspectorHtml(node);
  },

  _nodeInspectorHtml(node) {
    const esc = Utils.escHtml;
    const opts = [`<option value=""${!node.sceneType ? " selected" : ""}>◻ (non typé)</option>`]
      .concat(Object.entries(GraphProjections.FLOW_TYPES).map(
        ([key, t]) => `<option value="${key}"${node.sceneType === key ? " selected" : ""}>${t.glyph} ${t.label}</option>`,
      ))
      .join("");
    return `<div class="stack graph-edge-inspector">
      <div class="graph-edge-ends">${esc(node.name)}</div>
      <label class="stack stack--tight graph-edge-field">
        <span class="graph-edge-flabel">Type de scène</span>
        <select data-flow-node="scene-type">${opts}</select>
      </label>
      <p class="graph-hint">Glissez pour ranger · <strong>◈ Tisser</strong> pour enchaîner vers une autre scène.</p>
    </div>`;
  },

  _setSceneType(type) {
    const id = this._selNodeId;
    if (!id) return;
    Dossiers.setSceneType(id, type || null);
    this._project(); // le type change la forme/glyphe : remontage (positions recalculées, pas de dérive)
  },

  /* ---- Inspecteur arête : typer le lien (kind) ou le retirer ---- */
  _selectEdge(id) {
    GraphEngine.selectEdge(id);
    this._selNodeId = null;
    const e = (this._edges || []).find((x) => x.id === id) || null;
    this._selEdgeId = id;
    const panel = this._el.querySelector('[data-flow="inspector"]');
    if (!panel || !e) return;
    panel.classList.remove("empty");
    panel.innerHTML = this._edgeInspectorHtml(e);
  },

  _edgeInspectorHtml(e) {
    const esc = Utils.escHtml;
    const kindBtns = this._KINDS.map(
      (k) => `<button type="button" class="graph-dir-btn${e.kind === k.key ? " active" : ""}" data-flow-edge="kind" data-kind="${k.key}" aria-pressed="${e.kind === k.key}">${k.label}</button>`,
    ).join("");
    return `<div class="stack graph-edge-inspector">
      <div class="graph-edge-ends">${esc(Dossiers.nameOf(e.from) || "?")} <span aria-hidden="true">→</span> ${esc(Dossiers.nameOf(e.to) || "?")}</div>
      <div class="stack stack--tight graph-edge-field">
        <span class="graph-edge-flabel">Nature du lien</span>
        <div class="cluster graph-dir-row">${kindBtns}</div>
      </div>
      <button type="button" class="graph-edge-delete" data-flow-edge="delete">Retirer ce lien</button>
    </div>`;
  },

  _setEdgeKind(kind) {
    const e = (this._edges || []).find((x) => x.id === this._selEdgeId);
    if (!e) return;
    Dossiers.setNextKind(e.from, e.to, kind);
    this._project();
  },

  _deleteEdge() {
    const e = (this._edges || []).find((x) => x.id === this._selEdgeId);
    if (!e) return;
    Dossiers.unlinkNext(e.from, e.to);
    this._selEdgeId = null;
    this._project();
  },

  _clearInspector() {
    GraphEngine.select(null);
    this._selNodeId = null;
    this._selEdgeId = null;
    const panel = this._el.querySelector('[data-flow="inspector"]');
    if (!panel) return;
    panel.classList.add("empty");
    panel.innerHTML = `<p class="graph-hint">Touchez une scène pour la typer, une flèche pour la styler.<br>Glissez pour ranger · <strong>◈ Tisser</strong> pour enchaîner.</p>`;
  },

  /** Panneau Robustesse (validateur « sortie de secours »), même patron que
      ScenarioGraph : liste d'alertes, tap → surligne le nœud concerné. */
  _showWarnings() {
    const panel = this._el && this._el.querySelector('[data-flow="inspector"]');
    if (!panel) return;
    this._selNodeId = this._selEdgeId = null;
    GraphEngine.select(null); GraphEngine.selectEdge(null);
    panel.classList.remove("empty");
    const esc = Utils.escHtml;
    const items = this._warnings.length
      ? this._warnings.map((w) => `<li class="scenario-robust-item warn" data-flow-warn="${esc(w.targetId)}">${esc(w.message)}</li>`).join("")
      : `<li class="scenario-robust-item ok">Aucune alerte : chaque étape Action a une issue au-delà du succès.</li>`;
    panel.innerHTML = `<div class="stack scenario-inspector">
      <div class="scenario-insp-head">Robustesse du flux</div>
      <ul class="stack stack--tight scenario-robust-list">${items}</ul>
    </div>`;
  },

  /** Tisser un lien `from → to` (`Dossiers.linkNext`), puis ouvrir aussitôt
      son inspecteur (nommer sa nature tant que le geste est frais). */
  _createLink(fromId, toId) {
    if (!fromId || !toId || fromId === toId) return;
    const ok = Dossiers.linkNext(fromId, toId);
    this._project();
    if (ok) this._selectEdge(`${fromId}→${toId}`);
  },

  _reflectWeave(overlay) {
    const btn = overlay.querySelector('[data-flow-action="toggle-weave"]');
    if (!btn) return;
    btn.setAttribute("aria-pressed", String(this._weave));
    btn.classList.toggle("active", this._weave);
  },

  _ensure() {
    if (this._el) return this._el;
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay graph-overlay";
    overlay.id = "flow-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "flow-title");
    overlay.innerHTML = `
      <div class="modal graph-modal">
        <div class="cluster modal-header">
          <span class="modal-title" id="flow-title" data-flow="title">Flux</span>
          <button class="chip scenario-robust-badge" data-flow-action="robustesse" title="Alertes de robustesse du flux (sorties de secours)">✓ Robustesse</button>
          <button class="graph-weave-toggle" data-flow-action="toggle-weave" aria-pressed="false" title="Tisser un enchaînement : tirer d'une scène à l'autre">◈ Tisser</button>
          <button class="modal-close" data-flow-action="close" aria-label="Fermer">✕</button>
        </div>
        <div class="modal-body graph-body">
          <div class="graph-split">
            <div class="graph-canvas" data-flow="canvas">
              <div class="stack graph-zoom" role="group" aria-label="Zoom du flux">
                <button type="button" class="graph-zoom-btn" data-flow-action="zoom-in" aria-label="Zoomer" title="Zoomer (molette · pincement à deux doigts)">＋</button>
                <button type="button" class="graph-zoom-btn" data-flow-action="zoom-reset" aria-label="Vue d'ensemble" title="Vue d'ensemble">⤢</button>
                <button type="button" class="graph-zoom-btn" data-flow-action="zoom-out" aria-label="Dézoomer" title="Dézoomer">−</button>
              </div>
            </div>
            <aside class="graph-inspector empty" data-flow="inspector"></aside>
          </div>
          <p class="graph-empty" data-flow="empty" hidden>Rien à enchaîner ici — il faut au moins une scène (ou un run) pour ouvrir le flux.</p>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) return this.hide();
      const nodeCtl = e.target.closest("[data-flow-node]");
      if (nodeCtl) return; // sceneType passe par `change` (select), pas ici
      const edgeCtl = e.target.closest("[data-flow-edge]");
      if (edgeCtl) {
        const kind = edgeCtl.dataset.flowEdge;
        if (kind === "kind") return this._setEdgeKind(edgeCtl.dataset.kind);
        if (kind === "delete") return this._deleteEdge();
        return;
      }
      const warnEl = e.target.closest("[data-flow-warn]");
      if (warnEl) return this._selectNode(warnEl.dataset.flowWarn);
      const btn = e.target.closest("[data-flow-action]");
      if (!btn) return;
      if (btn.dataset.flowAction === "close") this.hide();
      else if (btn.dataset.flowAction === "toggle-weave") {
        this._weave = !this._weave;
        this._reflectWeave(overlay);
        GraphEngine.setWeave(this._weave);
      } else if (btn.dataset.flowAction === "robustesse") this._showWarnings();
      else if (btn.dataset.flowAction === "zoom-in") GraphEngine.zoomBy(1.3);
      else if (btn.dataset.flowAction === "zoom-out") GraphEngine.zoomBy(1 / 1.3);
      else if (btn.dataset.flowAction === "zoom-reset") GraphEngine.resetView();
    });
    overlay.addEventListener("change", (e) => {
      const nodeEl = e.target.closest("[data-flow-node]");
      if (nodeEl && nodeEl.dataset.flowNode === "scene-type") this._setSceneType(nodeEl.value || null);
    });
    document.addEventListener("keydown", (e) => {
      if (!overlay.classList.contains("open")) return;
      if (e.key === "Escape") { e.preventDefault(); this.hide(); }
    });
    this._el = overlay;
    return overlay;
  },
};

// Pont couche 5 (voir PLANS/PLAN_MODULES_ES.md).
window.FlowView = FlowView;
