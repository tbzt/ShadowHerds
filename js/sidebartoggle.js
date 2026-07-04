"use strict";

/* ============================================================
   SIDEBAR TOGGLE — repli/ouverture des sidebars de groupes
   Gère "shadows" (Ombres portées) et "contacts".
   Préférence d'affichage globale (toutes éditions confondues),
   stockée hors du namespace Storage préfixé par édition.
   ============================================================ */
const SidebarToggle = {
  _key: "sidebar_collapsed",
  _mobileBreakpoint: 640,
  state: { shadows: false, contacts: false, matrix: false },

  init() {
    // Restaurer l'état persisté
    const saved = Storage.getGlobal(this._key, {});
    if (typeof saved.shadows === "boolean") this.state.shadows = saved.shadows;
    if (typeof saved.contacts === "boolean")
      this.state.contacts = saved.contacts;
    if (typeof saved.matrix === "boolean") this.state.matrix = saved.matrix;

    // Sur mobile : replier par défaut (overlay), sans écraser un choix explicite déjà stocké
    if (this._isMobile() && Storage.getGlobal(this._key, null) === null) {
      this.state.shadows = true;
      this.state.contacts = true;
      this.state.matrix = true;
    }

    this._apply("shadows");
    this._apply("contacts");
    this._apply("matrix");
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
};

// Initialisation au chargement du DOM
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => SidebarToggle.init());
} else {
  SidebarToggle.init();
}
