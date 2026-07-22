"use strict";

/* ============================================================
   FACTION PICKER — popover d'appartenance à une faction.
   ------------------------------------------------------------
   Calque de GroupPicker, mais provider = FactionStore (roster
   transverse) au lieu d'une Collection : une entité (PNJ, PJ,
   contact) peut appartenir à plusieurs factions à la fois. Un seul
   panneau flottant, repositionné sur le déclencheur ; feuille basse
   sur mobile (réutilise le CSS `#…-picker-panel`, cf. shadows-contacts.css
   / responsive.css).

   Décision A1 (Le Monde et le Jeu) : picker MINCE dédié plutôt que
   généraliser GroupPicker — dont la moitié Collection est retirée en A2.
   Câblage par délégation `data-action="faction-*"`, aucun handler inline.
   ============================================================ */
import { CardRenderer } from "../card/cardrenderer.js";
import { Dialog } from "./dialog.js";
import { FactionStore } from "../../core/factionstore.js";

export const FactionPicker = {
  _id: null,
  _wired: false,
  // Palette curée partagée avec la lentille graphe (GraphView._EDGE_COLORS) :
  // une faction neuve prend la couleur suivante, pour des poches distinctes.
  _PALETTE: ["#e0533d", "#3d90e0", "#3dbf6e", "#c9a13d", "#9d5fd6", "#3dc2c2"],

  /** Délégation des déclencheurs de fiche (◈ Faction / ✕), montée une fois
      sur `document` — les cartes sont rendues dynamiquement. */
  _wireTriggers() {
    if (this._wired) return;
    this._wired = true;
    document.addEventListener("click", (e) => {
      const open = e.target.closest('[data-action="faction-open-picker"]');
      if (open) {
        this.open(open.dataset.id, open);
        return;
      }
      const rm = e.target.closest('[data-action="faction-remove"]');
      if (rm) {
        FactionStore.removeMember(rm.dataset.faction, rm.dataset.id);
        this._refreshCard(rm.dataset.id);
      }
    });
  },

  _refreshCard(id) {
    if (typeof UI !== "undefined") UI.refreshEntityCard(id);
  },

  _ensure() {
    if (document.getElementById("faction-picker-panel")) return;

    const backdrop = document.createElement("div");
    backdrop.id = "faction-picker-backdrop";
    backdrop.addEventListener("click", () => this.close());
    document.body.appendChild(backdrop);

    const panel = document.createElement("div");
    panel.id = "faction-picker-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Factions de l'entité");
    document.body.appendChild(panel);

    panel.addEventListener("change", (e) => {
      const cb = e.target.closest('input[type="checkbox"][data-faction]');
      if (!cb || !this._id) return;
      FactionStore.toggleMember(cb.dataset.faction, this._id, cb.checked);
      this._refreshCard(this._id);
      this._render();
    });
    panel.addEventListener("click", (e) => {
      const el = e.target.closest("[data-action]");
      if (!el) return;
      if (el.dataset.action === "close") this.close();
      if (el.dataset.action === "create") this.createAndAssign();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.close();
    });
    window.addEventListener("resize", () => {
      if (this._id) this.close();
    });
  },

  open(id, triggerEl) {
    if (!id) return;
    this._ensure();
    this._id = id;
    this._render();
    document.getElementById("faction-picker-backdrop").classList.add("open");
    document.getElementById("faction-picker-panel").classList.add("open");
    this._position(triggerEl);
  },

  close() {
    const panel = document.getElementById("faction-picker-panel");
    const backdrop = document.getElementById("faction-picker-backdrop");
    if (panel) panel.classList.remove("open");
    if (backdrop) backdrop.classList.remove("open");
    this._id = null;
  },

  /** Ancre le panneau sous le déclencheur (desktop/iPad) ; feuille basse en
      CSS sur mobile. Même géométrie que GroupPicker._position. */
  _position(triggerEl) {
    const panel = document.getElementById("faction-picker-panel");
    if (!panel || !triggerEl || window.innerWidth <= 640) return;
    const r = triggerEl.getBoundingClientRect();
    const panelW = 240;
    let left = r.right - panelW;
    left = Math.max(8, Math.min(left, window.innerWidth - panelW - 8));
    const estHeight = Math.min(320, panel.offsetHeight || 220);
    let top = r.bottom + 6;
    if (top + estHeight > window.innerHeight - 8) {
      top = Math.max(8, r.top - estHeight - 6);
    }
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  },

  _render() {
    const panel = document.getElementById("faction-picker-panel");
    if (!panel || !this._id) return;
    const mine = new Set(FactionStore.factionsOf(this._id).map((f) => f.id));
    const rows = FactionStore.all()
      .map((f) => {
        const checked = mine.has(f.id) ? "checked" : "";
        const dot = `<span class="faction-dot"${f.color ? ` style="background:${CardRenderer._esc(f.color)}"` : ""}></span>`;
        return `<label class="group-picker-row">
          <input type="checkbox" ${checked} data-faction="${CardRenderer._esc(f.id)}">
          ${dot}<span>${CardRenderer._esc(f.name)}</span>
        </label>`;
      })
      .join("");

    panel.innerHTML = `
      <div class="group-picker-head">
        <span class="group-picker-title">Factions</span>
        <button class="btn-icon-tiny" data-action="close" aria-label="Fermer">✕</button>
      </div>
      <div class="group-picker-list">${rows || `<div class="group-picker-empty">Aucune faction pour l'instant.</div>`}</div>
      <button class="group-picker-new" data-action="create">+ Nouvelle faction</button>`;
  },

  /** Crée une faction et y assigne directement l'entité courante. */
  createAndAssign() {
    const id = this._id;
    if (!id) return;
    Dialog.prompt({
      title: "Nouvelle faction",
      label: "Nom de la faction",
      placeholder: "ex. Les Halloweeners, Cellule Renraku…",
      confirmLabel: "Créer",
    }).then((name) => {
      if (!name || !name.trim() || this._id !== id) return;
      const color = this._PALETTE[FactionStore.all().length % this._PALETTE.length];
      const f = FactionStore.create({ name: name.trim(), color });
      if (!f) return;
      FactionStore.addMember(f.id, id);
      this._refreshCard(id);
      this._render();
      toast(`Faction « ${f.name} » créée.`);
    });
  },
};

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.FactionPicker = FactionPicker;
FactionPicker._wireTriggers();
