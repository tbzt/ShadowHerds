"use strict";

/* ============================================================
   GRAPH VIEW — la lentille « relations » montée à l'écran.
   ------------------------------------------------------------
   Coquille .modal-overlay (patron FoundationView/debrief, thème par
   édition hérité), dans laquelle GraphEngine rend la projection de
   GraphProjections. Un tap sur un nœud le SÉLECTIONNE et affiche SA fiche
   (la vraie carte, `CardRenderer.render`, éditable par délégation globale)
   dans le panneau latéral — la carte « sur le côté », pas un overlay ; tap
   sur un autre nœud échange la fiche, tap sur le fond désélectionne. Un tap
   sur une ARÊTE ouvre son inspecteur (Lot 3 : couleur, direction, pointillés,
   mot — le style vit sur l'arête dans RelationsStore ; ici on l'édite). La
   couleur du nœud (Lot 4) est portée par l'entité (`pcColor`), écrite via
   l'accesseur sanctionné `UI.setColor` (jamais dans une collection ici). Se
   re-projette à l'ouverture ; la vérité vit dans RelationsStore/Collection,
   jamais ici. Aucun `onclick` : délégation + fermeture overlay/croix/Échap.
   ============================================================ */
import { GraphProjections } from "./graphprojections.js";
import { GraphEngine } from "./graphengine.js";
import { CardRenderer } from "../card/cardrenderer.js";
import { UI } from "../kit/ui.js";
import { Utils } from "../../core/utils.js";

export const GraphView = {
  _el: null,
  _lastScope: null,
  _weave: false,
  _halo: true, // B4 : afficher la couronne de voisins hors périmètre (estompée)
  _pockets: true, // A3 : afficher les poches de faction (zones colorées)
  _groupMode: false, // A3b : mode « en faire une faction » (sélection multiple)
  _groupSel: new Set(), // A3b : ids sélectionnés pour la faction en construction
  _edges: null, // dernières arêtes projetées (source de l'inspecteur d'arête)
  _selectedEdge: null, // arête en cours d'édition dans le panneau (Lot 3)
  _selectedNodeId: null, // nœud sélectionné (pour la couleur, Lot 4)
  // Palette curée d'arête (mêmes teintes que les PJ) + échappatoire « autre
  // couleur » : pas de roue libre, la cohérence DA des 4 identités prime. Lot 3.
  _EDGE_COLORS: ["#e0533d", "#3d90e0", "#3dbf6e", "#c9a13d", "#9d5fd6", "#3dc2c2"],

  /** Ouvre le graphe. `focusId` = centrer sur une entité + ses voisines ;
      `memberIds` = restreindre à un ensemble (portée dossier, résolue par
      l'appelant) ; ni l'un ni l'autre = toutes les entités reliées. */
  open({ focusId = null, memberIds = null, title = "Liens" } = {}) {
    this._lastScope = { focusId, memberIds };
    this._weave = false; // chaque ouverture démarre en mode déplacement
    this._groupMode = false; // ni en construction de faction
    this._groupSel = new Set();
    const overlay = this._ensure();
    this._reflectWeave(overlay);
    this._reflectHalo(overlay);
    this._reflectPockets(overlay);
    overlay.querySelector('[data-graph="title"]').textContent = title;
    overlay.classList.add("open");
    // Monter synchrone : lire `clientWidth` (dans _project) force le reflow,
    // donc le container a ses dimensions réelles dès maintenant — sans dépendre
    // d'un rAF (throttlé onglet en arrière-plan, et fragile au premier rendu).
    this._project();
  },

  hide() {
    if (this._el) this._el.classList.remove("open");
    GraphEngine.destroy();
  },

  _project() {
    const overlay = this._el;
    if (!overlay || !overlay.classList.contains("open")) return;
    const split = overlay.querySelector(".graph-split");
    const host = overlay.querySelector('[data-graph="canvas"]');
    const empty = overlay.querySelector('[data-graph="empty"]');
    const { focusId, memberIds } = this._lastScope || {};
    const graph = GraphProjections.buildRelationGraph({ focusId, memberIds, halo: this._halo });

    if (!graph.nodes.length) {
      split.hidden = true;
      empty.hidden = false;
      GraphEngine.destroy();
      return;
    }
    split.hidden = false;
    empty.hidden = true;
    this._edges = graph.edges; // mémorisées pour l'inspecteur d'arête (Lot 3)
    const accent =
      (typeof App !== "undefined" && App.editionModule && App.editionModule.mapAccent) || "#35e0e6";
    GraphEngine.mount(host, {
      nodes: graph.nodes,
      edges: graph.edges,
      accent,
      onNodeTap: (id) => this._onNodeTap(id),
      onEdgeTap: (id) => this._selectEdge(id),
      onBackgroundTap: () => this._clearInspector(),
      onWeave: (fromId, toId) => this._createWeave(fromId, toId),
    });
    GraphEngine.setWeave(this._weave); // le remontage réinitialise le mode
    this._applyPockets(graph.nodes); // A3 — poches de faction sur les nœuds présents
    this._clearInspector(); // le panneau démarre sur l'invite
  },

  /** Tap sur un nœud : le surligner et afficher SA fiche dans le panneau
      latéral. On injecte la VRAIE carte (`CardRenderer.render`, élément DOM
      interactif par délégation globale — cf. encounterrenderer/contactsbook),
      en lecture : aucune vérité détenue ici. Les types que la carte ne sait
      pas dessiner (serveur) retombent sur une carte d'identité légère. */
  /** A3b — aiguillage du tap sur un nœud : en mode groupe, il (dé)sélectionne
      pour la faction en construction ; sinon, il ouvre la fiche (comportement
      historique). */
  _onNodeTap(id) {
    if (this._groupMode) this._toggleGroupNode(id);
    else this._selectNode(id);
  },

  _selectNode(id) {
    GraphEngine.select(id);
    this._selectedEdge = null;
    this._selectedNodeId = id;
    const panel = this._el.querySelector('[data-graph="inspector"]');
    if (!panel) return;
    panel.classList.remove("empty");
    panel.textContent = "";
    // A3b — entrée « en faire une faction » : amorce le mode groupe avec ce nœud.
    panel.insertAdjacentHTML(
      "beforeend",
      `<button type="button" class="graph-group-start" data-graph-action="group-start">◈ En faire une faction</button>`,
    );
    const ent = typeof PnjLookup !== "undefined" ? PnjLookup.find(id) : null;
    if (ent && this._renderable(id)) {
      // Rangée « couleur du nœud » (Lot 4) AU-DESSUS de la fiche, puis la vraie
      // carte. La rangée survit à un refresh de la carte (élément frère).
      panel.insertAdjacentHTML("beforeend", this._nodeColorRow(id));
      panel.appendChild(CardRenderer.render(ent, ["edit"], CardRenderer.liveDeps()));
    } else panel.appendChild(this._identityCard(id));
  },

  /** A3b — entre en mode « construction de faction », amorcé par le nœud
      sélectionné. Le tissage est incompatible (les deux détournent le tap) → OFF.
      Le tap devient (dé)sélection multiple ; l'inspecteur montre le panneau de
      groupe. */
  _startGroup(seedId) {
    if (!seedId) return;
    if (this._weave) { this._weave = false; this._reflectWeave(this._el); GraphEngine.setWeave(false); }
    this._groupMode = true;
    this._groupSel = new Set([seedId]);
    GraphEngine.select(null);
    GraphEngine.clearMultiSelected();
    GraphEngine.setNodeMultiSelected(seedId, true);
    this._renderGroupPanel();
  },

  _toggleGroupNode(id) {
    const on = !this._groupSel.has(id);
    if (on) this._groupSel.add(id);
    else this._groupSel.delete(id);
    GraphEngine.setNodeMultiSelected(id, on);
    this._renderGroupPanel();
  },

  /** Panneau de l'inspecteur en mode groupe : le compte + créer/annuler. Le
      retour visuel des membres est l'anneau sur les nœuds (pas une liste ici). */
  _renderGroupPanel() {
    const panel = this._el && this._el.querySelector('[data-graph="inspector"]');
    if (!panel) return;
    const n = this._groupSel.size;
    panel.classList.remove("empty");
    panel.innerHTML = `<div class="graph-group-panel">
      <div class="graph-group-head">Construction d'une faction</div>
      <p class="graph-hint">Touchez les nœuds à regrouper.<br><strong>${n}</strong> membre${n > 1 ? "s" : ""} sélectionné${n > 1 ? "s" : ""}.</p>
      <div class="graph-group-actions">
        <button type="button" class="btn-primary btn-small" data-graph-action="make-faction"${n ? "" : " disabled"}>＋ Créer la faction</button>
        <button type="button" class="btn-secondary btn-small" data-graph-action="group-cancel">Annuler</button>
      </div>
    </div>`;
  },

  /** Crée la faction depuis la sélection : nom demandé, couleur = prochaine de la
      palette curée (poches distinctes). Écrit via `FactionStore` (jamais un store
      parallèle), puis sort du mode et re-projette pour faire apparaître la poche. */
  _makeFaction() {
    const ids = [...this._groupSel];
    if (!ids.length) return;
    Dialog.prompt({
      title: "Nouvelle faction",
      label: "Nom de la faction",
      placeholder: "ex. Les Halloweeners, Cellule Renraku…",
      confirmLabel: "Créer",
    }).then((name) => {
      const clean = (name || "").trim();
      if (!clean || typeof FactionStore === "undefined") return;
      const color = this._EDGE_COLORS[FactionStore.all().length % this._EDGE_COLORS.length];
      const f = FactionStore.create({ name: clean, color });
      if (!f) return;
      for (const id of ids) FactionStore.addMember(f.id, id);
      if (typeof toast === "function") toast(`Faction « ${f.name} » créée (${ids.length}).`);
      this._exitGroup();
      this._project(); // re-projette → la nouvelle poche apparaît
    });
  },

  /** Sort du mode groupe : efface les anneaux + la sélection + l'inspecteur. */
  _exitGroup() {
    this._groupMode = false;
    this._groupSel = new Set();
    GraphEngine.clearMultiSelected();
    this._clearInspector();
  },

  /** Rangée de couleur du nœud (palette curée + échappatoire), reflète la
      couleur courante de l'entité (`pcColor`). Namespace `data-graph-node`. */
  _nodeColorRow(id) {
    const ent = typeof PnjLookup !== "undefined" ? PnjLookup.find(id) : null;
    const cur = (ent && ent.pcColor) || "";
    const esc = Utils.escHtml;
    const swatches = this._EDGE_COLORS.map(
      (c) =>
        `<button type="button" class="em-color-swatch${cur === c ? " selected" : ""}" style="background:${c}" data-graph-node="color" data-color="${c}" aria-label="Couleur ${c}"></button>`,
    ).join("");
    const isCustom = cur && !this._EDGE_COLORS.includes(cur);
    return `<div class="graph-node-color">
      <span class="graph-edge-flabel">Couleur du nœud</span>
      <div class="em-color-picker">
        <button type="button" class="em-color-swatch graph-color-default${!cur ? " selected" : ""}" data-graph-node="color" data-color="" title="Couleur par défaut" aria-label="Couleur par défaut">✕</button>
        ${swatches}
        <label class="em-color-swatch em-color-custom${isCustom ? " selected" : ""}"${isCustom ? ` style="background:${esc(cur)}"` : ""} title="Autre couleur…">
          <input type="color" class="em-color-custom-input" data-graph-node="color-custom" value="${esc(cur || "#3d90e0")}">
        </label>
      </div>
    </div>`;
  },

  /** Change la couleur du nœud sélectionné : persiste via l'accesseur sanctionné
      `UI.setColor` (toutes copies + rafraîchit la carte), patche le nœud SVG en
      place, puis reflète la sélection des pastilles. */
  _setNodeColor(color) {
    const id = this._selectedNodeId;
    if (!id) return;
    const c = color || null;
    UI.setColor(id, c);
    GraphEngine.setNodeColor(id, c);
    this._reflectNodeColor(c);
  },

  _reflectNodeColor(color) {
    const panel = this._el.querySelector('[data-graph="inspector"]');
    const row = panel && panel.querySelector(".graph-node-color");
    if (!row) return;
    row.querySelectorAll(".em-color-swatch[data-color]").forEach((b) => {
      b.classList.toggle("selected", (b.dataset.color || "") === (color || ""));
    });
    const custom = row.querySelector(".em-color-custom");
    if (custom) {
      const isCustom = !!(color && !this._EDGE_COLORS.includes(color));
      custom.classList.toggle("selected", isCustom);
      if (isCustom) custom.style.background = color;
    }
  },

  _onNodeControl(el) {
    if (el.dataset.graphNode === "color") this._setNodeColor(el.dataset.color || null);
  },

  /** CardRenderer sait dessiner PNJ/PJ/contact ; les autres → identité. */
  _renderable(id) {
    const loc = typeof PnjLookup !== "undefined" ? PnjLookup.locate(id) : null;
    return !!loc && (loc.type === "pnj" || loc.type === "pj" || loc.type === "contact");
  },

  /** Carte d'identité minimale (repli pour un type non rendu par la carte). */
  _identityCard(id) {
    const loc = (typeof PnjLookup !== "undefined" && PnjLookup.locate(id)) || null;
    const box = document.createElement("div");
    box.className = "graph-identity";
    box.innerHTML = `<div class="graph-identity-name">${Utils.escHtml((loc && loc.name) || "Entité")}</div>
      <div class="graph-identity-type">${Utils.escHtml((loc && loc.type) || "")}</div>`;
    return box;
  },

  /** Désélection : le panneau revient à l'invite. */
  _clearInspector() {
    GraphEngine.select(null);
    this._selectedEdge = null;
    this._selectedNodeId = null;
    const panel = this._el.querySelector('[data-graph="inspector"]');
    if (!panel) return;
    panel.classList.add("empty");
    panel.innerHTML = `<p class="graph-hint">Touchez un nœud pour afficher sa fiche, une arête pour la styler.<br>Glissez pour déplacer · <strong>◈ Tisser</strong> pour relier.</p>`;
  },

  /* ============================================================
     INSPECTEUR D'ARÊTE (Lot 3) — styler un lien comme un schéma
     heuristique : couleur, direction, pointillés, mot. La vérité
     est l'arête (RelationsStore) ; ici on lit/écrit son style, le
     moteur le rend. Annotations NEUTRES côté édition.
     ============================================================ */

  /** Tap sur une arête : la surligner et ouvrir son inspecteur dans le panneau. */
  _selectEdge(id) {
    GraphEngine.selectEdge(id);
    this._selectedNodeId = null;
    const e = (this._edges || []).find((x) => x.id === id) || null;
    this._selectedEdge = e;
    const panel = this._el.querySelector('[data-graph="inspector"]');
    if (!panel || !e) return;
    panel.classList.remove("empty");
    panel.innerHTML = this._edgeInspectorHtml(e);
  },

  _nameOf(id) {
    const loc = (typeof PnjLookup !== "undefined" && PnjLookup.locate(id)) || null;
    return (loc && loc.name) || "?";
  },

  /** Le formulaire d'arête : mot, direction (4 états), couleur (palette curée +
      échappatoire), pointillés, suppression. `data-graph-edge` = namespace de
      délégation propre à la vue (distinct de la délégation carte globale). */
  _edgeInspectorHtml(e) {
    const esc = Utils.escHtml;
    const cur = e.color || "";
    const swatches = this._EDGE_COLORS.map(
      (c) =>
        `<button type="button" class="em-color-swatch${cur === c ? " selected" : ""}" style="background:${c}" data-graph-edge="color" data-color="${c}" aria-label="Couleur ${c}"></button>`,
    ).join("");
    const isCustom = cur && !this._EDGE_COLORS.includes(cur);
    const dirs = [
      ["none", "—", "Aucune flèche"],
      ["forward", "→", "Vers la cible"],
      ["back", "←", "Vers la source"],
      ["both", "↔", "Réciproque"],
    ];
    const dirBtns = dirs
      .map(
        ([d, g, t]) =>
          `<button type="button" class="graph-dir-btn${(e.dir || "none") === d ? " active" : ""}" data-graph-edge="dir" data-dir="${d}" title="${t}" aria-pressed="${(e.dir || "none") === d}">${g}</button>`,
      )
      .join("");
    return `<div class="graph-edge-inspector">
      <div class="graph-edge-ends">${esc(this._nameOf(e.from))} <span aria-hidden="true">↔</span> ${esc(this._nameOf(e.to))}</div>
      <label class="graph-edge-field">
        <span class="graph-edge-flabel">Mot sur le trait</span>
        <input type="text" class="graph-edge-label-input" data-graph-edge="label" value="${esc(e.label || "")}" placeholder="ex. doit une faveur" maxlength="40">
      </label>
      <div class="graph-edge-field">
        <span class="graph-edge-flabel">Direction</span>
        <div class="graph-dir-row">${dirBtns}</div>
      </div>
      <div class="graph-edge-field">
        <span class="graph-edge-flabel">Couleur</span>
        <div class="em-color-picker">
          <button type="button" class="em-color-swatch graph-color-default${!cur ? " selected" : ""}" data-graph-edge="color" data-color="" title="Couleur par défaut (accent)" aria-label="Couleur par défaut">✕</button>
          ${swatches}
          <label class="em-color-swatch em-color-custom${isCustom ? " selected" : ""}"${isCustom ? ` style="background:${esc(cur)}"` : ""} title="Autre couleur…">
            <input type="color" class="em-color-custom-input" data-graph-edge="color-custom" value="${esc(cur || "#3d90e0")}">
          </label>
        </div>
      </div>
      <label class="graph-edge-field graph-edge-check">
        <input type="checkbox" data-graph-edge="dashed"${e.dashed ? " checked" : ""}>
        <span>Trait en pointillés</span>
      </label>
      <button type="button" class="graph-edge-delete" data-graph-edge="delete">Supprimer ce lien</button>
    </div>`;
  },

  /** Applique une modif de style à l'arête sélectionnée : met à jour la copie
      projetée, PERSISTE via RelationsStore.upsert (sa vérité), pousse le rendu
      en place (sans remontage), puis reflète l'état des contrôles. */
  _applyEdgeChange(patch) {
    const e = this._selectedEdge;
    if (!e) return;
    Object.assign(e, patch);
    RelationsStore.upsert({
      from: e.from,
      to: e.to,
      type: e.type,
      label: e.label || "",
      color: e.color || null,
      dashed: !!e.dashed,
      dir: e.dir || "none",
    });
    GraphEngine.updateEdgeStyle(e.id, { color: e.color, dashed: e.dashed, dir: e.dir, label: e.label });
    this._reflectEdgeInspector();
  },

  /** Reflète l'état courant sur les contrôles SANS reconstruire le panneau
      (préserve le focus/caret du champ « mot » pendant la frappe). */
  _reflectEdgeInspector() {
    const e = this._selectedEdge;
    const panel = this._el.querySelector('[data-graph="inspector"]');
    if (!e || !panel) return;
    panel.querySelectorAll('[data-graph-edge="dir"]').forEach((b) => {
      const on = (e.dir || "none") === b.dataset.dir;
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", String(on));
    });
    panel.querySelectorAll('.em-color-swatch[data-color]').forEach((b) => {
      b.classList.toggle("selected", (b.dataset.color || "") === (e.color || ""));
    });
    const custom = panel.querySelector(".em-color-custom");
    if (custom) {
      const isCustom = !!(e.color && !this._EDGE_COLORS.includes(e.color));
      custom.classList.toggle("selected", isCustom);
      if (isCustom) custom.style.background = e.color;
    }
  },

  /** Supprime définitivement l'arête (topologie changée → re-projection). */
  _deleteEdge() {
    const e = this._selectedEdge;
    if (!e) return;
    RelationsStore.removeWhere({ from: e.from, to: e.to, type: e.type });
    this._selectedEdge = null;
    this._project();
  },

  /** Aiguillage des contrôles d'arête reçus au clic (boutons). Le champ « mot »,
      la couleur personnalisée et la case pointillés passent par l'écouteur
      `input` (valeurs), pas ici. */
  _onEdgeControl(el) {
    const kind = el.dataset.graphEdge;
    if (kind === "color") this._applyEdgeChange({ color: el.dataset.color || null });
    else if (kind === "dir") this._applyEdgeChange({ dir: el.dataset.dir || "none" });
    else if (kind === "delete") this._deleteEdge();
  },

  /** Tisser un lien générique (`type:"relation"`) entre deux entités, si aucun
      n'existe déjà (dans un sens ou l'autre), puis re-projeter pour l'afficher.
      Les liens contact restent faits sur la fiche — ici, une relation générique. */
  _createWeave(fromId, toId) {
    if (!fromId || !toId || fromId === toId) return;
    const exists =
      RelationsStore.edgesWhere({ from: fromId, to: toId, type: "relation" }).length ||
      RelationsStore.edgesWhere({ from: toId, to: fromId, type: "relation" }).length;
    const edge = exists ? null : RelationsStore.upsert({ from: fromId, to: toId, type: "relation" });
    this._project();
    // Ouvrir aussitôt l'inspecteur sur le lien créé : on le nomme/style dans la
    // foulée du geste de tissage (le mot, la direction… tant que c'est frais).
    if (edge) this._selectEdge(edge.id);
  },

  /** Reflète l'état du mode tissage sur le bouton (aria-pressed + classe). */
  _reflectWeave(overlay) {
    const btn = overlay.querySelector('[data-graph-action="toggle-weave"]');
    if (!btn) return;
    btn.setAttribute("aria-pressed", String(this._weave));
    btn.classList.toggle("active", this._weave);
  },

  /** Reflète l'état du halo (voisins) sur le bouton (aria-pressed + classe). */
  _reflectHalo(overlay) {
    const btn = overlay.querySelector('[data-graph-action="toggle-halo"]');
    if (!btn) return;
    btn.setAttribute("aria-pressed", String(this._halo));
    btn.classList.toggle("active", this._halo);
  },

  /** Reflète l'état des poches de faction sur le bouton (aria-pressed + classe). */
  _reflectPockets(overlay) {
    const btn = (overlay || this._el).querySelector('[data-graph-action="toggle-pockets"]');
    if (!btn) return;
    btn.setAttribute("aria-pressed", String(this._pockets));
    btn.classList.toggle("active", this._pockets);
  },

  /** A3 — projette les Factions en POCHES sur le graphe : chaque faction dont au
      moins un membre est présent devient une zone colorée (sa couleur). Lecture
      seule de `FactionStore` (jamais un store parallèle) ∩ nœuds affichés ;
      délègue la géométrie et le rendu à GraphEngine. */
  _applyPockets(nodes) {
    const present = new Set(nodes.map((n) => n.id));
    const factions = typeof FactionStore !== "undefined" ? FactionStore.all() : [];
    const list = [];
    for (const f of factions) {
      const ids = (f.members || []).filter((id) => present.has(id));
      if (ids.length) list.push({ id: f.id, color: f.color, memberIds: ids });
    }
    GraphEngine.setPockets(list);
    GraphEngine.setPocketsVisible(this._pockets);
  },

  _ensure() {
    if (this._el) return this._el;
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay graph-overlay";
    overlay.id = "graph-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML = `
      <div class="modal graph-modal">
        <div class="modal-header">
          <span class="modal-title" data-graph="title">Liens</span>
          <button class="graph-pockets-toggle" data-graph-action="toggle-pockets" aria-pressed="true" title="Afficher les poches de faction (zones colorées)">◇ Poches</button>
          <button class="graph-halo-toggle" data-graph-action="toggle-halo" aria-pressed="true" title="Afficher les voisins hors périmètre (estompés)">Voisins</button>
          <button class="graph-weave-toggle" data-graph-action="toggle-weave" aria-pressed="false" title="Tisser un lien : tirer d'un nœud à l'autre">◈ Tisser</button>
          <button class="modal-close" data-graph-action="close" aria-label="Fermer">✕</button>
        </div>
        <div class="modal-body graph-body">
          <div class="graph-split">
            <div class="graph-canvas" data-graph="canvas"></div>
            <aside class="graph-inspector empty" data-graph="inspector"></aside>
          </div>
          <p class="graph-empty" data-graph="empty" hidden>Aucun lien à afficher — tissez des liens contact sur les fiches, ils apparaîtront ici.</p>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) return this.hide();
      const nodeCtl = e.target.closest("[data-graph-node]");
      if (nodeCtl) return this._onNodeControl(nodeCtl);
      const edgeCtl = e.target.closest("[data-graph-edge]");
      if (edgeCtl) return this._onEdgeControl(edgeCtl);
      const btn = e.target.closest("[data-graph-action]");
      if (!btn) return;
      if (btn.dataset.graphAction === "close") this.hide();
      else if (btn.dataset.graphAction === "toggle-weave") {
        this._weave = !this._weave;
        this._reflectWeave(overlay);
        GraphEngine.setWeave(this._weave);
      } else if (btn.dataset.graphAction === "toggle-halo") {
        this._halo = !this._halo;
        this._reflectHalo(overlay);
        this._project(); // re-projeter avec/sans la couronne de voisins
      } else if (btn.dataset.graphAction === "toggle-pockets") {
        // A3 — masquer/afficher les poches SANS remonter (patch de visibilité).
        this._pockets = !this._pockets;
        this._reflectPockets(overlay);
        GraphEngine.setPocketsVisible(this._pockets);
      } else if (btn.dataset.graphAction === "group-start") {
        this._startGroup(this._selectedNodeId); // A3b — amorcer depuis le nœud ouvert
      } else if (btn.dataset.graphAction === "make-faction") {
        this._makeFaction();
      } else if (btn.dataset.graphAction === "group-cancel") {
        this._exitGroup();
      }
    });
    // Valeurs continues de l'inspecteur d'arête : mot (frappe), couleur
    // personnalisée (color picker), pointillés (case). Rendu en direct.
    overlay.addEventListener("input", (e) => {
      const edgeEl = e.target.closest("[data-graph-edge]");
      if (edgeEl) {
        const kind = edgeEl.dataset.graphEdge;
        if (kind === "label") this._applyEdgeChange({ label: edgeEl.value });
        else if (kind === "color-custom") this._applyEdgeChange({ color: edgeEl.value || null });
        else if (kind === "dashed") this._applyEdgeChange({ dashed: edgeEl.checked });
        return;
      }
      const nodeEl = e.target.closest("[data-graph-node]");
      if (nodeEl && nodeEl.dataset.graphNode === "color-custom") this._setNodeColor(nodeEl.value || null);
    });
    document.addEventListener("keydown", (e) => {
      if (!overlay.classList.contains("open")) return;
      // Ne pas fermer sur Échap si l'on tape dans le champ « mot » de l'arête.
      if (e.key === "Escape" && !(e.target && e.target.closest(".graph-edge-inspector"))) {
        e.preventDefault();
        this.hide();
      }
    });
    this._el = overlay;
    return overlay;
  },
};

// Pont couche 5 (voir PLANS/PLAN_MODULES_ES.md).
window.GraphView = GraphView;
