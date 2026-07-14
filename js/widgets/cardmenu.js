"use strict";

/* ============================================================
   CARD MENU — popover de débordement « ⋯ » d'un pied de carte.
   Ne gère QUE l'ouverture/fermeture (délégation globale, modèle
   ContentModal). Les items du menu sont de simples boutons
   data-action déjà câblés par la délégation de leur domaine
   (CardRenderer — dont les contacts, CO-b —, Servers) : ce module n'exécute
   aucune action métier. Un seul menu ouvert à la fois ; clic
   ailleurs ou Échap → fermeture.
   ============================================================ */
const CardMenu = {
  _wired: false,

  bindDelegation() {
    if (this._wired) return;
    this._wired = true;

    document.addEventListener("click", (e) => {
      const toggle = e.target.closest("[data-card-menu-toggle]");
      if (toggle) {
        const menu = toggle.parentElement.querySelector(".card-menu");
        const willOpen = menu && menu.hidden;
        this._closeAll();
        if (willOpen) {
          menu.hidden = false;
          toggle.classList.add("open");
          toggle.setAttribute("aria-expanded", "true");
        }
        return;
      }
      // Clic ailleurs — y compris sur un item : son action se déclenche
      // via sa propre délégation, puis le menu se referme.
      this._closeAll();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this._closeAll();
    });
  },

  _closeAll() {
    document.querySelectorAll(".card-menu:not([hidden])").forEach((m) => {
      m.hidden = true;
      const t = m.parentElement.querySelector("[data-card-menu-toggle]");
      if (t) {
        t.classList.remove("open");
        t.setAttribute("aria-expanded", "false");
      }
    });
  },
};
