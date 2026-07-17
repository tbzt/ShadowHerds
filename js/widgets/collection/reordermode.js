"use strict";

/* ============================================================
   MODE RÉORGANISER (global) — Vague B1, jumeau de SelectionMode.
   Révèle les poignées ⠿ de glisser-déposer sur les cartes de collection
   via une classe `reordering` sur <body>. Entrée/sortie exclusivement par
   bouton de barre d'outils (data-action="toggle-reorder-mode") — pas de
   geste implicite (appui long/clic droit), déjà pris par SelectionMode ;
   les deux modes s'excluent mutuellement pour ne jamais superposer deux
   jeux de contrôles de carte sur le même repos visuel.
   État transient (jamais persisté).
   ============================================================ */
import { SelectionMode } from "./selectionmode.js";

export const ReorderMode = {
  _wired: false,

  bindDelegation() {
    if (this._wired) return;
    this._wired = true;

    document.addEventListener("click", (e) => {
      if (!e.target.closest('[data-action="toggle-reorder-mode"]')) return;
      this.toggle();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isOn()) this.exit();
    });
  },

  isOn() {
    return document.body.classList.contains("reordering");
  },
  toggle() {
    if (this.isOn()) this.exit();
    else this.enter();
  },
  enter() {
    if (typeof SelectionMode !== "undefined" && SelectionMode.isOn()) SelectionMode.exit();
    document.body.classList.add("reordering");
    this._syncButtons();
  },
  exit() {
    document.body.classList.remove("reordering");
    this._syncButtons();
  },

  /** Reflète l'état on/off sur tous les boutons d'entrée. */
  _syncButtons() {
    const on = this.isOn();
    document
      .querySelectorAll('[data-action="toggle-reorder-mode"]')
      .forEach((b) => {
        b.classList.toggle("active", on);
        b.textContent = on ? "✕ Terminer" : "⠿ Réorganiser";
      });
  },
};

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.ReorderMode = ReorderMode;
