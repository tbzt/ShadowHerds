"use strict";

/* ============================================================
   ROSTER VIEW — bascule Ombres entre cartes compactes
   et ligne d'annuaire dense (CardRenderer.renderRow), pour consulter
   un long roster sans faire défiler des accordéons repliés. Préférence
   globale (toutes éditions), persistée via Storage.getGlobal — pas de
   localStorage direct (doctrine).
   ============================================================ */
const RosterView = {
  _key: "roster_row_view",
  _on: false,
  _wired: false,

  init() {
    this._on = !!Storage.getGlobal(this._key, false);
    this._syncButtons();
  },

  active() {
    return this._on;
  },

  bindDelegation() {
    if (this._wired) return;
    this._wired = true;

    document.addEventListener("click", (e) => {
      if (e.target.closest('[data-action="toggle-roster-row"]')) {
        this.toggle();
        return;
      }
      // Clic sur le nom d'une ligne d'annuaire : repasse en carte et
      // ramène la fiche complète sous les yeux (même mécanisme que le
      // badge « lié à » d'un véhicule, UI.focusOwner).
      const nameEl = e.target.closest('[data-action="roster-row-open"]');
      if (nameEl) {
        const id = nameEl.getAttribute("data-id");
        this.disable();
        requestAnimationFrame(() => UI.focusOwner(id));
      }
    });
  },

  toggle() {
    this._on ? this.disable() : this.enable();
  },
  enable() {
    this._on = true;
    Storage.setGlobal(this._key, true);
    this._syncButtons();
    if (typeof Hub !== "undefined") Hub.render();
  },
  disable() {
    this._on = false;
    Storage.setGlobal(this._key, false);
    this._syncButtons();
    if (typeof Hub !== "undefined") Hub.render();
  },

  _syncButtons() {
    document
      .querySelectorAll('[data-action="toggle-roster-row"]')
      .forEach((b) => {
        b.classList.toggle("active", this._on);
        b.textContent = this._on ? "▤ Cartes" : "☰ Annuaire";
      });
  },
};
