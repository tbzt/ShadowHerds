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
export const CardMenu = {
  _wired: false,

  bindDelegation() {
    if (this._wired) return;
    this._wired = true;

    document.addEventListener("click", (e) => {
      const toggle = e.target.closest("[data-card-menu-toggle]");
      if (toggle) {
        const menu = toggle.parentElement.querySelector(".card-menu");
        const willOpen = menu && menu.hidden;
        this.closeAll();
        if (willOpen) {
          menu.hidden = false;
          toggle.classList.add("open");
          toggle.setAttribute("aria-expanded", "true");
          this._orient(toggle, menu);
        }
        return;
      }
      // Clic ailleurs — y compris sur un item : son action se déclenche
      // via sa propre délégation, puis le menu se referme.
      this.closeAll();
    });
    // Échap : une seule source, l'écouteur en couches d'app.js — il appelle
    // `closeAll()` en premier et s'arrête là si un menu était ouvert (D5,
    // CODIR 2026-09-04). Un second écouteur ici fermerait le menu ET
    // laisserait app.js fermer la couche du dessous dans la même touche.
  },

  // Par défaut le popover s'ouvre vers le HAUT (patron carte : pied de
  // carte overflow:hidden, le popover reste dans son rectangle). Mais le
  // même patron .card-kebab/.card-menu est réutilisé ailleurs — barre
  // d'outils du suivi de combat, dossier bar, etc. — où le bouton peut
  // être proche du haut de son conteneur clippé (overflow:hidden/auto) :
  // ouvrir vers le haut y pousserait le popover hors du cadre visible.
  // On mesure donc l'espace réellement disponible au-dessus, dans le
  // premier ancêtre qui clippe (ou la fenêtre à défaut), et on bascule
  // vers le bas si ça ne tient pas.
  _orient(toggle, menu) {
    const clip = this._clippingAncestor(toggle);
    const clipTop = clip ? clip.getBoundingClientRect().top : 0;
    const toggleTop = toggle.getBoundingClientRect().top;
    const menuHeight = menu.getBoundingClientRect().height;
    const spaceAbove = toggleTop - clipTop;
    menu.classList.toggle("card-menu--down", spaceAbove < menuHeight);
  },

  _clippingAncestor(el) {
    let node = el.parentElement;
    while (node && node !== document.body) {
      const overflowY = getComputedStyle(node).overflowY;
      if (overflowY === "hidden" || overflowY === "auto" || overflowY === "scroll") {
        return node;
      }
      node = node.parentElement;
    }
    return null;
  },

  /** Ferme tout menu ouvert. Renvoie `true` s'il y en avait un : c'est ce
      que l'Échap en couches lit pour savoir si la touche est consommée. */
  closeAll() {
    const open = document.querySelectorAll(".card-menu:not([hidden])");
    open.forEach((m) => {
      m.hidden = true;
      m.classList.remove("card-menu--down");
      const t = m.parentElement.querySelector("[data-card-menu-toggle]");
      if (t) {
        t.classList.remove("open");
        t.setAttribute("aria-expanded", "false");
      }
    });
    return open.length > 0;
  },
};

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.CardMenu = CardMenu;
