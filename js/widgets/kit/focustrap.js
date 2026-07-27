"use strict";

/* ============================================================
   FOCUS TRAP — la loi « le focus est piégé et restitué »
   (DESIGN-SYSTEM.md § 6.3) appliquée UNE fois, partagée par les overlays
   bloquants. Mesuré au re-audit D7 (2026-07-27) : 0 occurrence d'un piège
   de focus dans tout le projet, Échap réimplémenté dans 34 fichiers. Ce
   module ne touche PAS à Échap (chaque overlay garde sa fermeture, souvent
   liée à une Promise) — seulement le bouclage de Tab et la restitution.

     const release = FocusTrap.activate(container);
     ...                          // à la fermeture :
     release();                   // Tab redevient libre, focus rendu

   Empilable (overlay ouvert par-dessus un overlay) : chaque activation
   restaure le focus qui était actif AU MOMENT de son propre appel, pas
   celui d'avant l'overlay parent.
   ============================================================ */
export const FocusTrap = {
  _FOCUSABLE:
    'a[href], button:not([disabled]), textarea:not([disabled]), ' +
    'input:not([disabled]), select:not([disabled]), ' +
    '[tabindex]:not([tabindex="-1"])',

  _focusable(container) {
    return [...container.querySelectorAll(this._FOCUSABLE)].filter(
      (el) => el.getClientRects().length > 0,
    );
  },

  /** Piège Tab dans `container` et mémorise l'élément actif pour le
      restituer à la sortie. Renvoie la fonction de libération. */
  activate(container) {
    const trigger = document.activeElement;
    const onKeydown = (e) => {
      if (e.key !== "Tab") return;
      const focusable = this._focusable(container);
      if (!focusable.length) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    container.addEventListener("keydown", onKeydown);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      container.removeEventListener("keydown", onKeydown);
      if (
        trigger &&
        document.contains(trigger) &&
        typeof trigger.focus === "function"
      ) {
        trigger.focus();
      }
    };
  },
};

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.FocusTrap = FocusTrap;
