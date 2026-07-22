"use strict";

/* ============================================================
   GRAPH VIEW — la lentille « relations » montée à l'écran.
   ------------------------------------------------------------
   Coquille .modal-overlay (patron FoundationView/debrief, thème par
   édition hérité), dans laquelle GraphEngine rend la projection de
   GraphProjections. Un tap sur un nœud le SÉLECTIONNE et affiche SA fiche
   (la vraie carte, `CardRenderer.render`, éditable par délégation globale)
   dans le panneau latéral — la carte « sur le côté », pas un overlay ; tap
   sur un autre nœud échange la fiche, tap sur le fond désélectionne. Se
   re-projette à l'ouverture ; la vérité vit dans RelationsStore/Collection,
   jamais ici. Aucun `onclick` : délégation + fermeture overlay/croix/Échap.
   ============================================================ */
import { GraphProjections } from "./graphprojections.js";
import { GraphEngine } from "./graphengine.js";
import { CardRenderer } from "../card/cardrenderer.js";
import { Utils } from "../../core/utils.js";

export const GraphView = {
  _el: null,
  _lastScope: null,
  _weave: false,
  _halo: true, // B4 : afficher la couronne de voisins hors périmètre (estompée)

  /** Ouvre le graphe. `focusId` = centrer sur une entité + ses voisines ;
      `memberIds` = restreindre à un ensemble (portée dossier, résolue par
      l'appelant) ; ni l'un ni l'autre = toutes les entités reliées. */
  open({ focusId = null, memberIds = null, title = "Liens" } = {}) {
    this._lastScope = { focusId, memberIds };
    this._weave = false; // chaque ouverture démarre en mode déplacement
    const overlay = this._ensure();
    this._reflectWeave(overlay);
    this._reflectHalo(overlay);
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
    const accent =
      (typeof App !== "undefined" && App.editionModule && App.editionModule.mapAccent) || "#35e0e6";
    GraphEngine.mount(host, {
      nodes: graph.nodes,
      edges: graph.edges,
      accent,
      onNodeTap: (id) => this._selectNode(id),
      onBackgroundTap: () => this._clearInspector(),
      onWeave: (fromId, toId) => this._createWeave(fromId, toId),
    });
    GraphEngine.setWeave(this._weave); // le remontage réinitialise le mode
    this._clearInspector(); // le panneau démarre sur l'invite
  },

  /** Tap sur un nœud : le surligner et afficher SA fiche dans le panneau
      latéral. On injecte la VRAIE carte (`CardRenderer.render`, élément DOM
      interactif par délégation globale — cf. encounterrenderer/contactsbook),
      en lecture : aucune vérité détenue ici. Les types que la carte ne sait
      pas dessiner (serveur) retombent sur une carte d'identité légère. */
  _selectNode(id) {
    GraphEngine.select(id);
    const panel = this._el.querySelector('[data-graph="inspector"]');
    if (!panel) return;
    panel.classList.remove("empty");
    panel.textContent = "";
    const ent = typeof PnjLookup !== "undefined" ? PnjLookup.find(id) : null;
    if (ent && this._renderable(id))
      panel.appendChild(CardRenderer.render(ent, ["edit"], CardRenderer.liveDeps()));
    else panel.appendChild(this._identityCard(id));
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
    const panel = this._el.querySelector('[data-graph="inspector"]');
    if (!panel) return;
    panel.classList.add("empty");
    panel.innerHTML = `<p class="graph-hint">Touchez un nœud pour afficher sa fiche ici.<br>Glissez pour déplacer · <strong>◈ Tisser</strong> pour relier.</p>`;
  },

  /** Tisser un lien générique (`type:"relation"`) entre deux entités, si aucun
      n'existe déjà (dans un sens ou l'autre), puis re-projeter pour l'afficher.
      Les liens contact restent faits sur la fiche — ici, une relation générique. */
  _createWeave(fromId, toId) {
    if (!fromId || !toId || fromId === toId) return;
    const exists =
      RelationsStore.edgesWhere({ from: fromId, to: toId, type: "relation" }).length ||
      RelationsStore.edgesWhere({ from: toId, to: fromId, type: "relation" }).length;
    if (!exists) RelationsStore.upsert({ from: fromId, to: toId, type: "relation" });
    this._project();
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
      }
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
window.GraphView = GraphView;
