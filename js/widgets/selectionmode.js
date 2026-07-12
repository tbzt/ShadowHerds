"use strict";

/* ============================================================
   MODE SÉLECTION MULTIPLE (global) — Chrome de carte, doctrine #1.
   Au repos, aucune case de sélection n'est visible : ce mode les
   révèle (ainsi que la gouttière) sur toutes les cartes via la
   classe `selecting` sur <body>. Entrée par bouton de barre
   d'outils (data-action="toggle-select-mode") OU appui long
   (tactile) / clic droit (desktop) sur une carte. Sortie par le
   même bouton, Échap, ou l'annulation de la sélection.

   État transient (jamais persisté). Ne connaît des collections
   que l'API publique de BulkBar (sortie = vidage de la sélection).
   ============================================================ */
const SelectionMode = {
  _wired: false,
  _lpTimer: null,
  _LONG_PRESS_MS: 500,

  bindDelegation() {
    if (this._wired) return;
    this._wired = true;

    document.addEventListener("click", (e) => {
      if (!e.target.closest('[data-action="toggle-select-mode"]')) return;
      this.toggle();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isOn()) this.exit();
    });

    // Clic droit (desktop) : entre en mode et coche la carte.
    document.addEventListener("contextmenu", (e) => {
      const card = e.target.closest(".bulk-selectable");
      if (!card) return;
      e.preventDefault();
      this.enter();
      this._check(card);
    });

    // Appui long (tactile) : idem, après _LONG_PRESS_MS sans relâcher ni
    // faire défiler. Sans effet si déjà en mode (la case suffit alors).
    document.addEventListener(
      "touchstart",
      (e) => {
        const card = e.target.closest(".bulk-selectable");
        if (!card || this.isOn()) return;
        this._lpTimer = setTimeout(() => {
          this.enter();
          this._check(card);
        }, this._LONG_PRESS_MS);
      },
      { passive: true },
    );
    const cancelLp = () => clearTimeout(this._lpTimer);
    document.addEventListener("touchend", cancelLp);
    document.addEventListener("touchmove", cancelLp);
  },

  isOn() {
    return document.body.classList.contains("selecting");
  },
  toggle() {
    if (this.isOn()) this.exit();
    else this.enter();
  },
  enter() {
    document.body.classList.add("selecting");
    this._syncButtons();
  },
  exit() {
    document.body.classList.remove("selecting");
    BulkBar.exit(); // vide la sélection active et referme la barre
    this._syncButtons();
  },

  /** Coche une carte via sa case de sélection déléguée (socle Collection). */
  _check(card) {
    const cb = card.querySelector('.bulk-select-check input[type="checkbox"]');
    if (cb && !cb.checked) {
      cb.checked = true;
      cb.dispatchEvent(new Event("change", { bubbles: true }));
    }
  },

  /** Reflète l'état on/off sur tous les boutons d'entrée. */
  _syncButtons() {
    const on = this.isOn();
    document
      .querySelectorAll('[data-action="toggle-select-mode"]')
      .forEach((b) => {
        b.classList.toggle("active", on);
        b.textContent = on ? "✕ Terminer" : "☑ Sélectionner";
      });
  },
};
