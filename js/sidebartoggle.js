"use strict";

/* ============================================================
   SIDEBAR TOGGLE — repli/ouverture des sidebars de groupes
   Gère "shadows" (Ombres portées) et "contacts".
   Préférence d'affichage globale (toutes éditions confondues),
   stockée hors du namespace Storage préfixé par édition.
   ============================================================ */
const SidebarToggle = {
  _key: "sr_pnj_v2_global_sidebar_collapsed",
  _mobileBreakpoint: 640,
  state: { shadows: false, contacts: false },

  init() {
    // Restaurer l'état persisté
    try {
      const saved = JSON.parse(localStorage.getItem(this._key) || "{}");
      if (typeof saved.shadows === "boolean")
        this.state.shadows = saved.shadows;
      if (typeof saved.contacts === "boolean")
        this.state.contacts = saved.contacts;
    } catch {
      /* noop */
    }

    // Sur mobile : replier par défaut (overlay), sans écraser un choix explicite déjà stocké
    if (this._isMobile() && localStorage.getItem(this._key) === null) {
      this.state.shadows = true;
      this.state.contacts = true;
    }

    this._apply("shadows");
    this._apply("contacts");
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
    try {
      localStorage.setItem(this._key, JSON.stringify(this.state));
    } catch {
      /* noop */
    }
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
