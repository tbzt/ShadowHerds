"use strict";

/* ============================================================
   SCENARIO CAST PICKER — casting PAR ÉTAPE de trame (S2b).
   ------------------------------------------------------------
   Calque mince de ConvokePicker, mais scopé à un NŒUD DE TRAME
   (`sceneNode`) : coche des entités → `sceneNode.castIds` (par
   RÉFÉRENCE, ids stables), via `ScenarioStore.updateSceneNode`.
   Distinct des convokes du dossier (ConvokePicker reste dédié au run)
   et de l'Encounter (le cast en combat). Entités seulement — `castIds`
   référence des entités (purgeEntities/PnjLookup opèrent dessus).

   Déclenché depuis l'atelier (inspecteur d'étape) ET le cockpit Jouer,
   qui appellent `open(scenarioId, nodeId, triggerEl)`. Aucune délégation
   globale ici. Réutilise le CSS partagé `#…-picker-*` / `.group-picker-*`.
   ============================================================ */
import { CardRenderer } from "../card/cardrenderer.js";

export const ScenarioCastPicker = {
  _scId: null,
  _nodeId: null,
  _MAX: 40,

  _ensure() {
    if (document.getElementById("scenario-cast-picker-panel")) return;

    const backdrop = document.createElement("div");
    backdrop.id = "scenario-cast-picker-backdrop";
    backdrop.className = "picker-backdrop";
    backdrop.addEventListener("click", () => this.close());
    document.body.appendChild(backdrop);

    const panel = document.createElement("div");
    panel.id = "scenario-cast-picker-panel";
    panel.className = "picker-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Caster cette étape");
    document.body.appendChild(panel);

    panel.addEventListener("change", (e) => {
      const cb = e.target.closest('input[type="checkbox"][data-cid]');
      if (!cb) return;
      this._toggle(cb.dataset.cid, cb.checked);
      this._renderList();
      // Le store émet → atelier/cockpit se re-rendent via leurs abonnements.
    });
    panel.addEventListener("input", (e) => {
      if (e.target.matches('[data-role="cast-search"]')) this._renderList();
    });
    panel.addEventListener("click", (e) => {
      const el = e.target.closest("[data-action]");
      if (el && el.dataset.action === "close") this.close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this._scId) this.close();
    });
    window.addEventListener("resize", () => {
      if (this._scId) this.close();
    });
  },

  open(scId, nodeId, triggerEl) {
    if (!scId || !nodeId) return;
    this._ensure();
    this._scId = scId;
    this._nodeId = nodeId;
    this._renderShell();
    document.getElementById("scenario-cast-picker-backdrop").classList.add("open");
    document.getElementById("scenario-cast-picker-panel").classList.add("open");
    this._position(triggerEl);
    const input = document.querySelector('[data-role="cast-search"]');
    if (input && window.innerWidth > 640) input.focus();
  },

  close() {
    const panel = document.getElementById("scenario-cast-picker-panel");
    const backdrop = document.getElementById("scenario-cast-picker-backdrop");
    if (panel) panel.classList.remove("open");
    if (backdrop) backdrop.classList.remove("open");
    this._scId = null;
    this._nodeId = null;
  },

  _node() {
    const sc = typeof ScenarioStore !== "undefined" ? ScenarioStore.get(this._scId) : null;
    return sc ? sc.sceneNodes.find((n) => n.id === this._nodeId) || null : null;
  },
  _toggle(cid, on) {
    const node = this._node();
    if (!node) return;
    const cur = Array.isArray(node.castIds) ? node.castIds.slice() : [];
    const i = cur.indexOf(cid);
    if (on && i < 0) cur.push(cid);
    else if (!on && i >= 0) cur.splice(i, 1);
    else return;
    ScenarioStore.updateSceneNode(this._scId, this._nodeId, { castIds: cur });
  },

  _position(triggerEl) {
    const panel = document.getElementById("scenario-cast-picker-panel");
    if (!panel || !triggerEl || window.innerWidth <= 640) return;
    const r = triggerEl.getBoundingClientRect();
    const panelW = 260;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - panelW - 8));
    const estHeight = Math.min(360, panel.offsetHeight || 260);
    let top = r.bottom + 6;
    if (top + estHeight > window.innerHeight - 8) top = Math.max(8, r.top - estHeight - 6);
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  },

  _esc(s) {
    return CardRenderer._esc(s);
  },

  _renderShell() {
    const panel = document.getElementById("scenario-cast-picker-panel");
    if (!panel) return;
    panel.innerHTML = `
      <div class="group-picker-head">
        <span class="group-picker-title">Caster cette étape</span>
        <button class="btn-icon-tiny" data-action="close" aria-label="Fermer">✕</button>
      </div>
      <input class="convoke-search" data-role="cast-search" type="search"
             placeholder="Chercher un PNJ, un contact, un serveur…"
             aria-label="Chercher une entité à caster">
      <div class="group-picker-list" id="scenario-cast-picker-list"></div>`;
    this._renderList();
  },

  _entityCols() {
    return [
      { all: (typeof Shadows !== "undefined" && Shadows.data.all) || [], type: "PNJ" },
      { all: (typeof Characters !== "undefined" && Characters.data.all) || [], type: "PJ" },
      { all: (typeof ContactsBook !== "undefined" && ContactsBook.data.all) || [], type: "Contact" },
      { all: (typeof Servers !== "undefined" && Servers.data.all) || [], type: "Serveur" },
    ];
  },

  _renderList() {
    const box = document.getElementById("scenario-cast-picker-list");
    const node = this._node();
    if (!box || !node) return;
    const castSet = new Set(Array.isArray(node.castIds) ? node.castIds : []);
    const input = document.querySelector('[data-role="cast-search"]');
    const q = ((input && input.value) || "").trim().toLowerCase();

    // Déjà castés (toujours visibles, pour retrait) + résultats de recherche (bornés).
    const seen = new Set();
    let rows = "";
    let count = 0;
    for (const { all, type } of this._entityCols()) {
      for (const e of all) {
        if (!e || seen.has(e.id)) continue;
        const isCast = castSet.has(e.id);
        const matches = q && (e.name || "").toLowerCase().includes(q);
        if (!isCast && !matches) continue;
        if (matches && !isCast && count >= this._MAX) continue;
        seen.add(e.id);
        if (matches && !isCast) count++;
        rows += `<label class="group-picker-row">
          <input type="checkbox" ${isCast ? "checked" : ""} data-cid="${this._esc(e.id)}">
          <span>${this._esc(e.name || "Sans nom")}</span><span class="convoke-type">${type}</span>
        </label>`;
      }
    }
    box.innerHTML =
      rows ||
      `<div class="group-picker-empty">${q ? "Aucune entité trouvée." : "Tapez pour chercher une entité à caster."}</div>`;
  },
};

// Pont couche 4 (migration modules ES).
window.ScenarioCastPicker = ScenarioCastPicker;
