"use strict";

/* ============================================================
   SCENARIO GRAPH — la lentille « schéma de scènes » (atelier).
   ------------------------------------------------------------
   Éditeur de la carte heuristique d'une trame : nœuds-scènes typés
   + arêtes de transition. Réutilise le MOTEUR `GraphEngine` en mode
   « layout auteur » (`static:true`) — les positions sont arrangées à la
   main et PERSISTÉES (drag → `onNodeMoved` → ScenarioStore), pas un layout
   de forces émergent. Peau distincte du graphe d'entités : glyphe par TYPE
   de scène (◎ accroche · ⌕ repérage · ⚔ action · ❝ sociale · ⑂ décision ·
   ⚑ retombée), fournie par la projection (le moteur reste bête).

   Une vérité, plusieurs lentilles-éditrices : la vérité est `ScenarioStore` ;
   ici on la lit et l'édite, jamais on ne la détient. La vue s'ABONNE au store
   (`subscribe`) pour refléter les écritures EXTERNES (à terme le cockpit S2) ;
   ses propres écritures sont « muettes » (`_apply`) pour ne pas se remonter
   sous les doigts (préserve focus/caret). Positions auteur + persistées ⇒ un
   remontage reproduit exactement la carte (idempotent visuel).

   Bibliothèque autonome (S1) : créer/ouvrir/renommer/supprimer une trame ;
   la liaison trame↔run se fera en S2 (cockpit dans Jouer). Aucun `onclick` :
   délégation `data-scenario-*`. Cf. PLANS/architecture-graphe-scenaristique.md § S1.
   ============================================================ */
import { GraphEngine } from "./graphengine.js";
import { Utils } from "../../core/utils.js";

export const ScenarioGraph = {
  _el: null,
  _scenarioId: null,
  _weave: false,
  _selNode: null,
  _selEdge: null,
  _unsub: null,
  _muted: false, // vrai pendant une écriture interne (l'abonnement l'ignore)

  // Les 6 beats transposés à Shadowrun. Glyphes monochromes du vocabulaire
  // établi (◎ = seuil/entrée ; ⚔ = action ; ❝ = dialogue). Édition-NEUTRE.
  _TYPES: [
    { key: "accroche", glyph: "◎", label: "Accroche" },
    { key: "repérage", glyph: "⌕", label: "Repérage" },
    { key: "action", glyph: "⚔", label: "Action" },
    { key: "sociale", glyph: "❝", label: "Sociale" },
    { key: "décision", glyph: "⑂", label: "Décision" },
    { key: "retombée", glyph: "⚑", label: "Retombée" },
  ],
  _KINDS: [
    { key: "libre", label: "Libre" },
    { key: "conditionnelle", label: "Conditionnelle" },
    { key: "evenement", label: "Événement joueur" },
    { key: "temporelle", label: "Temporelle" },
  ],
  // Teinte de l'arête « sortie de secours » (échec) — constante de vue, comme
  // GraphView._EDGE_COLORS : le moteur pose la couleur en attribut (pas de token CSS).
  _HATCH: "#a65a5a",

  /* ---- Ouverture / fermeture ---- */
  /** `scenarioId` optionnel : ouvrir directement sur cette trame (depuis le
      cockpit « Trame » de Jouer, S2). Sinon, la dernière ouverte / la dernière
      de la liste / aucune. */
  open(scenarioId) {
    const overlay = this._ensure();
    if (scenarioId && ScenarioStore.get(scenarioId)) {
      this._scenarioId = scenarioId;
    } else if (!this._scenarioId || !ScenarioStore.get(this._scenarioId)) {
      const list = ScenarioStore.all();
      this._scenarioId = list.length ? list[list.length - 1].id : null;
    }
    if (!this._unsub) this._unsub = ScenarioStore.subscribe((evt) => this._onStoreEvent(evt));
    overlay.classList.add("open");
    this._renderLibrary();
    this._project();
  },

  hide() {
    if (this._el) this._el.classList.remove("open");
    GraphEngine.destroy();
    if (this._unsub) { this._unsub(); this._unsub = null; }
  },

  /* ---- Écriture interne guardée : ne pas se remonter sur son propre événement. ---- */
  _apply(fn) {
    this._muted = true;
    try { return fn(); }
    finally { this._muted = false; }
  },

  /** Événement du store. Interne (muet) → déjà reflété. Externe sur la trame
      ouverte (cockpit S2, plus tard) → re-projeter (positions auteur = stable). */
  _onStoreEvent(evt) {
    if (this._muted) return;
    if (!evt || evt.scenarioId !== this._scenarioId) return;
    this._renderLibrary();
    this._project();
  },

  /* ============================================================
     PROJECTION — mappe la trame détenue → { nodes, edges } du moteur.
     ============================================================ */
  _project() {
    const overlay = this._el;
    if (!overlay || !overlay.classList.contains("open")) return;
    const split = overlay.querySelector(".graph-split");
    const host = overlay.querySelector('[data-scenario="canvas"]');
    const empty = overlay.querySelector('[data-scenario="empty"]');
    const sc = this._scenarioId ? ScenarioStore.get(this._scenarioId) : null;

    if (!sc) {
      split.hidden = true;
      empty.hidden = false;
      empty.textContent = ScenarioStore.all().length
        ? "Choisissez une trame ci-dessus."
        : "Aucune trame. Créez-en une (＋ Nouvelle trame) pour poser vos étapes.";
      GraphEngine.destroy();
      return;
    }
    split.hidden = false;
    empty.hidden = true;

    const glyphOf = new Map(this._TYPES.map((t) => [t.key, t.glyph]));
    const nodes = sc.sceneNodes.map((n) => ({
      id: n.id,
      type: n.type,
      glyph: glyphOf.get(n.type) || "●",
      label: n.title || "(sans titre)",
      x: n.x, y: n.y,
    }));
    const edges = sc.sceneEdges.map((e) => ({
      id: e.id, from: e.from, to: e.to,
      dir: "forward",
      dashed: !!e.isEscapeHatch,
      color: e.isEscapeHatch ? this._HATCH : null,
      label: this._edgeLabel(e),
    }));
    const accent =
      (typeof App !== "undefined" && App.editionModule && App.editionModule.mapAccent) || "#35e0e6";

    GraphEngine.mount(host, {
      nodes, edges, accent,
      static: true, // layout auteur : x,y honorés + persistés
      onNodeMoved: (id, x, y) => this._apply(() => ScenarioStore.updateSceneNode(sc.id, id, { x, y })),
      onNodeTap: (id) => this._selectNode(id),
      onEdgeTap: (id) => this._selectEdge(id),
      onBackgroundTap: () => this._clearInspector(),
      onWeave: (a, b) => this._createEdge(a, b),
    });
    GraphEngine.setWeave(this._weave);

    // Mise en avant de l'ÉTAPE COURANTE (runtime, S2) — l'anneau « current »
    // suit `runtime.currentSceneId` : bifurquer au cockpit ré-éclaire ici.
    const curId = sc.runtime && sc.runtime.currentSceneId;
    if (curId && sc.sceneNodes.some((n) => n.id === curId)) GraphEngine.setNodeCurrent(curId, true);

    // Reposer la sélection si elle survit ; sinon l'invite.
    if (this._selNode && sc.sceneNodes.some((n) => n.id === this._selNode)) this._selectNode(this._selNode);
    else if (this._selEdge && sc.sceneEdges.some((e) => e.id === this._selEdge)) this._selectEdge(this._selEdge);
    else this._clearInspector();
  },

  _edgeLabel(e) {
    const parts = [];
    if (e.label) parts.push(e.label);
    if (e.gateway === "parallel") parts.push("∥");
    else if (e.gateway === "exclusive") parts.push("⋔");
    if (e.isEscapeHatch && !e.label) parts.push("échec");
    return parts.join(" ");
  },
  _edgeLabelById(id) {
    const sc = ScenarioStore.get(this._scenarioId);
    const e = sc && sc.sceneEdges.find((x) => x.id === id);
    return e ? this._edgeLabel(e) : "";
  },

  /* ============================================================
     BIBLIOTHÈQUE — choisir / créer / renommer / supprimer une trame.
     ============================================================ */
  _renderLibrary() {
    const overlay = this._el;
    if (!overlay) return;
    const sel = overlay.querySelector('[data-scenario-action="pick"]');
    const list = ScenarioStore.all();
    if (sel) {
      sel.innerHTML = list.length
        ? list.map((s) => `<option value="${s.id}"${s.id === this._scenarioId ? " selected" : ""}>${Utils.escHtml(s.title)}</option>`).join("")
        : `<option value="">— aucune trame —</option>`;
    }
    const has = !!(this._scenarioId && ScenarioStore.get(this._scenarioId));
    overlay
      .querySelectorAll('[data-scenario-action="rename"], [data-scenario-action="delete"], [data-scenario-action="toggle-weave"]')
      .forEach((b) => { b.disabled = !has; });
    this._renderToolbar(has);
    this._reflectWeave();
  },

  _renderToolbar(has) {
    const tb = this._el && this._el.querySelector('[data-scenario="toolbar"]');
    if (!tb) return;
    tb.hidden = !has;
    tb.innerHTML = has
      ? `<span class="scenario-tb-label">Ajouter une étape :</span>` +
        this._TYPES.map((t) => `<button type="button" class="scenario-type-btn" data-scenario-action="add-node" data-type="${t.key}" title="Ajouter : ${t.label}"><span class="scenario-type-glyph">${t.glyph}</span> ${t.label}</button>`).join("")
      : "";
  },

  _newScenario() {
    Dialog.prompt({
      title: "Nouvelle trame",
      label: "Titre de la trame",
      placeholder: "ex. La parole est à la défense",
      confirmLabel: "Créer",
    }).then((name) => {
      const clean = (name || "").trim();
      if (!clean) return;
      const sys = (typeof App !== "undefined" && App.edition) || null;
      const sc = this._apply(() => ScenarioStore.create({ title: clean, system: sys }));
      if (!sc) return;
      this._scenarioId = sc.id;
      this._selNode = this._selEdge = null;
      this._renderLibrary();
      this._project();
      if (typeof toast === "function") toast(`Trame « ${sc.title} » créée.`);
    });
  },

  _renameScenario() {
    const sc = ScenarioStore.get(this._scenarioId);
    if (!sc) return;
    Dialog.prompt({ title: "Renommer la trame", label: "Titre", value: sc.title, confirmLabel: "Renommer" })
      .then((name) => {
        const clean = (name || "").trim();
        if (!clean) return;
        this._apply(() => ScenarioStore.rename(sc.id, clean));
        this._renderLibrary();
      });
  },

  _deleteScenario() {
    const sc = ScenarioStore.get(this._scenarioId);
    if (!sc) return;
    Dialog.confirm({
      title: "Supprimer la trame",
      message: `Supprimer « ${sc.title} » et toutes ses scènes ? Définitif.`,
      danger: true,
      confirmLabel: "Supprimer",
    }).then((ok) => {
      if (!ok) return;
      this._apply(() => ScenarioStore.remove(sc.id));
      const list = ScenarioStore.all();
      this._scenarioId = list.length ? list[list.length - 1].id : null;
      this._selNode = this._selEdge = null;
      this._renderLibrary();
      this._project();
    });
  },

  /* ============================================================
     SCÈNES — ajout, sélection, édition, suppression.
     ============================================================ */
  _addNode(type) {
    const sc = ScenarioStore.get(this._scenarioId);
    if (!sc) return;
    // Position de spawn : centre du canvas courant (même repère que le moteur) +
    // léger décalage pour ne pas empiler.
    const host = this._el.querySelector('[data-scenario="canvas"]');
    const W = Math.max(320, (host && host.clientWidth) || 640);
    const H = Math.max(240, (host && host.clientHeight) || 460);
    const x = W / 2 + (Math.random() - 0.5) * 90;
    const y = H / 2 + (Math.random() - 0.5) * 90;
    const node = this._apply(() => ScenarioStore.addSceneNode(sc.id, { type, x, y }));
    this._project(); // remontage stable (positions auteur)
    if (node) this._selectNode(node.id);
  },

  _selectNode(id) {
    GraphEngine.select(id);
    this._selNode = id;
    this._selEdge = null;
    const sc = ScenarioStore.get(this._scenarioId);
    const n = sc && sc.sceneNodes.find((x) => x.id === id);
    const panel = this._el.querySelector('[data-scenario="inspector"]');
    if (!n || !panel) return;
    panel.classList.remove("empty");
    panel.innerHTML = this._nodeInspectorHtml(n);
  },

  _nodeInspectorHtml(n) {
    const esc = Utils.escHtml;
    const typeOpts = this._TYPES
      .map((t) => `<option value="${t.key}"${t.key === n.type ? " selected" : ""}>${t.glyph} ${t.label}</option>`)
      .join("");
    return `<div class="scenario-inspector">
      <div class="scenario-insp-head">Étape</div>
      <label class="graph-edge-field">
        <span class="graph-edge-flabel">Type</span>
        <select data-scenario-node="type">${typeOpts}</select>
      </label>
      <label class="graph-edge-field">
        <span class="graph-edge-flabel">Titre</span>
        <input type="text" data-scenario-node="title" value="${esc(n.title || "")}" placeholder="ex. Un Johnson avec un badge" maxlength="80">
      </label>
      <label class="graph-edge-field">
        <span class="graph-edge-flabel">Description (MJ)</span>
        <textarea data-scenario-node="body" rows="5" placeholder="Ce qui se joue dans cette scène…">${esc(n.body || "")}</textarea>
      </label>
      <div class="graph-edge-field">
        <span class="graph-edge-flabel">Casting</span>
        <div class="scenario-cast-list">${this._castChipsHtml(n)}<button type="button" class="scenario-cast-add" data-scenario-node="cast">＋ Caster</button></div>
        ${(n.castIds || []).length >= 2 ? `<button type="button" class="scenario-cast-link" data-scenario-node="cast-link" title="Créer les liens manquants entre ces personnages sur la carte des Liens">◈ Relier entre eux</button>` : ""}
      </div>
      <button type="button" class="graph-edge-delete" data-scenario-node="delete">Supprimer cette étape</button>
    </div>`;
  },

  /** Puces du cast d'une étape (par RÉFÉRENCE : nom résolu via PnjLookup), chacune
      retirable. Cast = ids d'entités (`castIds`), distinct des convokes du dossier. */
  _castChipsHtml(n) {
    const esc = Utils.escHtml;
    return (n.castIds || [])
      .map((cid) => {
        const loc = typeof PnjLookup !== "undefined" ? PnjLookup.locate(cid) : null;
        const name = loc ? loc.name : "(entité supprimée)";
        return `<span class="scenario-cast-chip">${esc(name)}<button type="button" class="scenario-cast-x" data-scenario-node="cast-remove" data-cid="${esc(cid)}" aria-label="Retirer ${esc(name)}">✕</button></span>`;
      })
      .join("");
  },
  _openCastPicker(trigger) {
    if (this._selNode && typeof ScenarioCastPicker !== "undefined")
      ScenarioCastPicker.open(this._scenarioId, this._selNode, trigger);
  },
  _removeCast(cid) {
    const sc = ScenarioStore.get(this._scenarioId);
    const node = sc && sc.sceneNodes.find((n) => n.id === this._selNode);
    if (!node || !cid) return;
    const cur = (node.castIds || []).filter((x) => x !== cid);
    this._apply(() => ScenarioStore.updateSceneNode(sc.id, node.id, { castIds: cur }));
    this._selectNode(this._selNode); // re-render des puces
  },

  _onNodeControl(el) {
    const k = el.dataset.scenarioNode;
    if (k === "delete") this._deleteNode();
    else if (k === "cast") this._openCastPicker(el);
    else if (k === "cast-remove") this._removeCast(el.dataset.cid);
    else if (k === "cast-link") this._linkCast();
  },

  /** S2c — propagation OPTIONNELLE « le schéma modifie des relations » : offre de
      créer les liens manquants entre les co-castés d'une étape sur la carte des
      Liens (RelationsStore, sa vérité). Une OFFRE explicite (confirmation), jamais
      automatique — on RÉFÉRENCE les entités, on ne fusionne pas les vérités (Kernel).
      Générique (`type:"relation"`, comme le tissage de GraphView) : éditable ensuite. */
  _linkCast() {
    const sc = ScenarioStore.get(this._scenarioId);
    const node = sc && sc.sceneNodes.find((n) => n.id === this._selNode);
    if (!node || typeof RelationsStore === "undefined") return;
    const ids = (node.castIds || []).slice();
    if (ids.length < 2) return;
    Dialog.confirm({
      title: "Relier le casting",
      message: `Créer les liens manquants entre les ${ids.length} personnages de cette étape ? (relations génériques, éditables sur la carte des Liens.)`,
      confirmLabel: "Relier",
    }).then((ok) => {
      if (!ok) return;
      let created = 0;
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const a = ids[i], b = ids[j];
          const exists =
            RelationsStore.edgesWhere({ from: a, to: b, type: "relation" }).length ||
            RelationsStore.edgesWhere({ from: b, to: a, type: "relation" }).length;
          if (!exists) {
            RelationsStore.upsert({ from: a, to: b, type: "relation" });
            created++;
          }
        }
      }
      if (typeof toast === "function")
        toast(created ? `${created} lien${created > 1 ? "s" : ""} créé${created > 1 ? "s" : ""} sur la carte des Liens.` : "Ces personnages sont déjà tous reliés.");
    });
  },
  _onNodeInput(el, isChange) {
    const sc = ScenarioStore.get(this._scenarioId);
    if (!sc || !this._selNode) return;
    const k = el.dataset.scenarioNode;
    if (k === "title") this._apply(() => ScenarioStore.updateSceneNode(sc.id, this._selNode, { title: el.value }));
    else if (k === "body") this._apply(() => ScenarioStore.updateSceneNode(sc.id, this._selNode, { body: el.value }));
    else if (k === "type" && isChange) {
      this._apply(() => ScenarioStore.updateSceneNode(sc.id, this._selNode, { type: el.value }));
      this._project(); // le glyphe change → remontage (discret, hors frappe)
      this._selectNode(this._selNode);
    }
  },
  _deleteNode() {
    const sc = ScenarioStore.get(this._scenarioId);
    if (!sc || !this._selNode) return;
    this._apply(() => ScenarioStore.removeSceneNode(sc.id, this._selNode));
    this._selNode = null;
    this._project();
    this._clearInspector();
  },

  /* ============================================================
     ARÊTES — tissage, sélection, réglage, suppression.
     ============================================================ */
  _createEdge(from, to) {
    if (!from || !to || from === to) return;
    const sc = ScenarioStore.get(this._scenarioId);
    if (!sc) return;
    const exists = sc.sceneEdges.some((e) => e.from === from && e.to === to);
    const edge = exists ? null : this._apply(() => ScenarioStore.addSceneEdge(sc.id, { from, to, kind: "libre" }));
    this._project();
    if (edge) this._selectEdge(edge.id); // nommer/régler la transition dans la foulée
  },

  _selectEdge(id) {
    GraphEngine.selectEdge(id);
    this._selEdge = id;
    this._selNode = null;
    const sc = ScenarioStore.get(this._scenarioId);
    const e = sc && sc.sceneEdges.find((x) => x.id === id);
    const panel = this._el.querySelector('[data-scenario="inspector"]');
    if (!e || !panel) return;
    panel.classList.remove("empty");
    panel.innerHTML = this._edgeInspectorHtml(e);
  },

  _edgeInspectorHtml(e) {
    const esc = Utils.escHtml;
    const kindOpts = this._KINDS
      .map((k) => `<option value="${k.key}"${(e.kind || "libre") === k.key ? " selected" : ""}>${k.label}</option>`)
      .join("");
    const gw = e.gateway || "";
    const gwBtn = (val, glyph, title) =>
      `<button type="button" class="graph-dir-btn${gw === val ? " active" : ""}" data-scenario-edge="gateway" data-gw="${val}" title="${title}" aria-pressed="${gw === val}">${glyph}</button>`;
    return `<div class="scenario-inspector">
      <div class="scenario-insp-head">Transition</div>
      <label class="graph-edge-field">
        <span class="graph-edge-flabel">Type de lien</span>
        <select data-scenario-edge="kind">${kindOpts}</select>
      </label>
      <div class="graph-edge-field">
        <span class="graph-edge-flabel">Embranchement</span>
        <div class="graph-dir-row">
          ${gwBtn("", "—", "Aucun")}
          ${gwBtn("exclusive", "⋔", "Exclusif : le joueur choisit A ou B")}
          ${gwBtn("parallel", "∥", "Parallèle : A et B se déroulent ensemble")}
        </div>
      </div>
      <label class="graph-edge-field graph-edge-check">
        <input type="checkbox" data-scenario-edge="hatch"${e.isEscapeHatch ? " checked" : ""}>
        <span>Sortie de secours (échec)</span>
      </label>
      <label class="graph-edge-field">
        <span class="graph-edge-flabel">Condition / mot sur le trait</span>
        <input type="text" data-scenario-edge="label" value="${esc(e.label || "")}" placeholder="ex. si l'infiltration échoue" maxlength="60">
      </label>
      <button type="button" class="graph-edge-delete" data-scenario-edge="delete">Supprimer ce lien</button>
    </div>`;
  },

  _setEdge(patch) {
    const sc = ScenarioStore.get(this._scenarioId);
    if (!sc || !this._selEdge) return;
    this._apply(() => ScenarioStore.updateSceneEdge(sc.id, this._selEdge, patch));
  },
  _onEdgeControl(el) {
    const k = el.dataset.scenarioEdge;
    if (k === "gateway") { this._setEdge({ gateway: el.dataset.gw || null }); this._reflectEdgeInspector(); GraphEngine.updateEdgeStyle(this._selEdge, { label: this._edgeLabelById(this._selEdge) }); }
    else if (k === "delete") this._deleteEdge();
  },
  _onEdgeInput(el, isChange) {
    const k = el.dataset.scenarioEdge;
    if (k === "kind" && isChange) this._setEdge({ kind: el.value });
    else if (k === "hatch") {
      this._setEdge({ isEscapeHatch: el.checked });
      GraphEngine.updateEdgeStyle(this._selEdge, { dashed: el.checked, color: el.checked ? this._HATCH : null, label: this._edgeLabelById(this._selEdge) });
    } else if (k === "label") {
      this._setEdge({ label: el.value });
      GraphEngine.updateEdgeStyle(this._selEdge, { label: this._edgeLabelById(this._selEdge) });
    }
  },
  /** Reflète les boutons d'embranchement sans reconstruire (préserve le champ). */
  _reflectEdgeInspector() {
    const sc = ScenarioStore.get(this._scenarioId);
    const e = sc && sc.sceneEdges.find((x) => x.id === this._selEdge);
    const panel = this._el && this._el.querySelector('[data-scenario="inspector"]');
    if (!e || !panel) return;
    panel.querySelectorAll('[data-scenario-edge="gateway"]').forEach((b) => {
      const on = (e.gateway || "") === (b.dataset.gw || "");
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", String(on));
    });
  },
  _deleteEdge() {
    const sc = ScenarioStore.get(this._scenarioId);
    if (!sc || !this._selEdge) return;
    this._apply(() => ScenarioStore.removeSceneEdge(sc.id, this._selEdge));
    this._selEdge = null;
    this._project();
    this._clearInspector();
  },

  /* ---- Inspecteur : invite quand rien n'est sélectionné. ---- */
  _clearInspector() {
    this._selNode = null;
    this._selEdge = null;
    const panel = this._el && this._el.querySelector('[data-scenario="inspector"]');
    if (!panel) return;
    panel.classList.add("empty");
    const sc = ScenarioStore.get(this._scenarioId);
    const hasNodes = sc && sc.sceneNodes.length;
    panel.innerHTML = `<p class="graph-hint">${
      hasNodes
        ? "Touchez une étape pour l'éditer, un lien pour le régler.<br>Glissez pour arranger · <strong>◈ Relier</strong> pour tisser une transition."
        : "Ajoutez une étape avec la barre du haut pour commencer votre trame."
    }</p>`;
  },

  _reflectWeave() {
    const b = this._el && this._el.querySelector('[data-scenario-action="toggle-weave"]');
    if (!b) return;
    b.setAttribute("aria-pressed", String(this._weave));
    b.classList.toggle("active", this._weave);
  },

  /* ============================================================
     COQUILLE — .modal-overlay + délégation `data-scenario-*` (0 onclick).
     ============================================================ */
  _ensure() {
    if (this._el) return this._el;
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay graph-overlay scenario-overlay";
    overlay.id = "scenario-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML = `
      <div class="modal graph-modal scenario-modal">
        <div class="modal-header scenario-header">
          <span class="modal-title">Trames</span>
          <select class="scenario-picker" data-scenario-action="pick" aria-label="Choisir une trame"></select>
          <button class="btn-small" data-scenario-action="new">＋ Nouvelle trame</button>
          <button class="btn-small" data-scenario-action="rename">Renommer</button>
          <button class="btn-small" data-scenario-action="delete">Supprimer</button>
          <button class="graph-weave-toggle" data-scenario-action="toggle-weave" aria-pressed="false" title="Relier deux étapes : tirer de l'une à l'autre">◈ Relier</button>
          <button class="modal-close" data-scenario-action="close" aria-label="Fermer">✕</button>
        </div>
        <div class="modal-body graph-body">
          <div class="scenario-toolbar" data-scenario="toolbar" hidden></div>
          <div class="graph-split">
            <div class="graph-canvas" data-scenario="canvas">
              <div class="graph-zoom" role="group" aria-label="Zoom de la carte">
                <button type="button" class="graph-zoom-btn" data-scenario-action="zoom-in" aria-label="Zoomer" title="Zoomer (molette · pincement)">＋</button>
                <button type="button" class="graph-zoom-btn" data-scenario-action="zoom-reset" aria-label="Vue d'ensemble" title="Vue d'ensemble">⤢</button>
                <button type="button" class="graph-zoom-btn" data-scenario-action="zoom-out" aria-label="Dézoomer" title="Dézoomer">−</button>
              </div>
            </div>
            <aside class="graph-inspector empty" data-scenario="inspector"></aside>
          </div>
          <p class="graph-empty" data-scenario="empty" hidden></p>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) return this.hide();
      const nodeCtl = e.target.closest("[data-scenario-node]");
      if (nodeCtl) return this._onNodeControl(nodeCtl);
      const edgeCtl = e.target.closest("[data-scenario-edge]");
      if (edgeCtl) return this._onEdgeControl(edgeCtl);
      const btn = e.target.closest("[data-scenario-action]");
      if (!btn || btn.tagName === "SELECT") return;
      const a = btn.dataset.scenarioAction;
      if (a === "close") this.hide();
      else if (a === "new") this._newScenario();
      else if (a === "rename") this._renameScenario();
      else if (a === "delete") this._deleteScenario();
      else if (a === "add-node") this._addNode(btn.dataset.type);
      else if (a === "toggle-weave") {
        this._weave = !this._weave;
        this._reflectWeave();
        GraphEngine.setWeave(this._weave);
      } else if (a === "zoom-in") GraphEngine.zoomBy(1.3);
      else if (a === "zoom-out") GraphEngine.zoomBy(1 / 1.3);
      else if (a === "zoom-reset") GraphEngine.resetView();
    });

    overlay.addEventListener("change", (e) => {
      const el = e.target;
      if (el.matches('[data-scenario-action="pick"]')) {
        this._scenarioId = el.value || null;
        this._selNode = this._selEdge = null;
        this._renderLibrary();
        this._project();
        return;
      }
      const nodeCtl = el.closest && el.closest("[data-scenario-node]");
      if (nodeCtl) return this._onNodeInput(nodeCtl, true);
      const edgeCtl = el.closest && el.closest("[data-scenario-edge]");
      if (edgeCtl) return this._onEdgeInput(edgeCtl, true);
    });

    overlay.addEventListener("input", (e) => {
      const nodeCtl = e.target.closest && e.target.closest("[data-scenario-node]");
      if (nodeCtl) return this._onNodeInput(nodeCtl, false);
      const edgeCtl = e.target.closest && e.target.closest("[data-scenario-edge]");
      if (edgeCtl) return this._onEdgeInput(edgeCtl, false);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this._el && this._el.classList.contains("open")) this.hide();
    });

    this._el = overlay;
    return overlay;
  },
};

// Pont couche 5 (voir PLANS/PLAN_MODULES_ES.md) : global classique.
window.ScenarioGraph = ScenarioGraph;
