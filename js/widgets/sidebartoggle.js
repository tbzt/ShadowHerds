"use strict";

/* ============================================================
   SIDEBAR TOGGLE — repli/ouverture des sidebars de dossiers
   Gère toute barre `.shadows-layout[data-sidebar="…"]` : hub
   (shadows) + écrans de génération (generator, contacts, matrix,
   run). Préférence d'affichage globale (toutes éditions
   confondues), stockée hors du namespace Storage par édition.
   ============================================================ */
const SidebarToggle = {
  _key: "sidebar_collapsed",
  _mobileBreakpoint: 640,
  _panels: ["shadows", "characters", "generator", "contacts", "matrix", "run"],
  state: {},

  init() {
    const saved = Storage.getGlobal(this._key, {});
    // Sur mobile : replier par défaut (overlay) pour tout panel sans
    // préférence stockée, sans écraser un choix stocké — indépendant de
    // firstRun (sinon un panel jamais visité s'ouvre en grand dès qu'un
    // autre panel a été togglé une fois).
    for (const panel of this._panels) {
      this.state[panel] =
        typeof saved[panel] === "boolean" ? saved[panel] : this._isMobile();
      this._apply(panel);
    }
  },

  _isMobile() {
    return window.innerWidth <= this._mobileBreakpoint;
  },

  _layout(panel) {
    return document.querySelector(`.shadows-layout[data-sidebar="${panel}"]`);
  },

  _apply(panel) {
    const el = this._layout(panel);
    if (!el) return;
    el.classList.toggle("sidebar-collapsed", this.state[panel]);
  },

  _persist() {
    Storage.setGlobal(this._key, this.state);
  },

  open(panel) {
    this.state[panel] = false;
    this._apply(panel);
    this._persist();
  },

  close(panel) {
    this.state[panel] = true;
    this._apply(panel);
    this._persist();
  },

  toggle(panel) {
    this.state[panel] ? this.open(panel) : this.close(panel);
  },

  _delegated: false,
  bindDelegation() {
    if (this._delegated) return;
    this._delegated = true;
    document.addEventListener("click", (e) => {
      const el = e.target.closest("[data-sidebar-action]");
      if (!el) return;
      const target = el.dataset.sidebarTarget;
      if (el.dataset.sidebarAction === "open") this.open(target);
      else if (el.dataset.sidebarAction === "close") this.close(target);
    });
  },
};

// Initialisation au chargement du DOM
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => SidebarToggle.init());
} else {
  SidebarToggle.init();
}
