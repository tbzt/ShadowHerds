"use strict";

/* ============================================================
   GRAPH VIEW — la lentille « relations » montée à l'écran.
   ------------------------------------------------------------
   Coquille .modal-overlay (patron FoundationView/debrief, thème par
   édition hérité), dans laquelle GraphEngine rend la projection de
   GraphProjections. Un tap sur un nœud ouvre `CardPeek.open` PAR-DESSUS
   (jamais d'éjection — prérequis VIS-14). Se re-projette à l'ouverture ;
   la vérité vit dans RelationsStore/Collection, jamais ici. Aucun
   `onclick` : délégation + fermeture overlay/croix/Échap. VIS-15 B1.
   ============================================================ */
import { GraphProjections } from "./graphprojections.js";
import { GraphEngine } from "./graphengine.js";
import { CardPeek } from "../card/cardpeek.js";

export const GraphView = {
  _el: null,
  _lastScope: null,

  /** Ouvre le graphe. `focusId` = centrer sur une entité + ses voisines ;
      `memberIds` = restreindre à un ensemble (portée dossier, résolue par
      l'appelant) ; ni l'un ni l'autre = toutes les entités reliées. */
  open({ focusId = null, memberIds = null, title = "Liens" } = {}) {
    this._lastScope = { focusId, memberIds };
    const overlay = this._ensure();
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
    const host = overlay.querySelector('[data-graph="canvas"]');
    const empty = overlay.querySelector('[data-graph="empty"]');
    const { focusId, memberIds } = this._lastScope || {};
    const graph = GraphProjections.buildRelationGraph({ focusId, memberIds });

    if (!graph.nodes.length) {
      host.hidden = true;
      empty.hidden = false;
      GraphEngine.destroy();
      return;
    }
    host.hidden = false;
    empty.hidden = true;
    const accent =
      (typeof App !== "undefined" && App.editionModule && App.editionModule.mapAccent) || "#35e0e6";
    const allIds = graph.nodes.map((n) => n.id);
    GraphEngine.mount(host, {
      nodes: graph.nodes,
      edges: graph.edges,
      accent,
      onNodeTap: (id) => CardPeek.open(id, { siblings: allIds }),
    });
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
          <button class="modal-close" data-graph-action="close" aria-label="Fermer">✕</button>
        </div>
        <div class="modal-body graph-body">
          <div class="graph-canvas" data-graph="canvas"></div>
          <p class="graph-empty" data-graph="empty" hidden>Aucun lien à afficher — tissez des liens contact sur les fiches, ils apparaîtront ici.</p>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) return this.hide();
      const btn = e.target.closest("[data-graph-action]");
      if (btn && btn.dataset.graphAction === "close") this.hide();
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
