"use strict";

/* ============================================================
   BLOC-NOTES DE SÉANCE (CH-M2) — scratchpad persistant du MJ (montants
   négociés, promesses, fils narratifs, alertes). Volontairement LÉGER :
   un simple textarea, pas un wiki. Overlay calqué sur le journal des jets
   (DiceLog) ; persistance globale via Storage, jamais localStorage direct.
   ============================================================ */
const Notepad = {
  _open: false,
  _KEY: "sessionNotes", // global (comme le journal des jets), survit au F5
  _saveTimer: null,
  _mode: "read", // "read" (puces @/#) | "edit" (jeton brut) — E7

  _ensure() {
    if (document.getElementById("notepad-panel")) return;

    const backdrop = document.createElement("div");
    backdrop.id = "notepad-backdrop";
    backdrop.addEventListener("click", () => this.close());
    document.body.appendChild(backdrop);

    const panel = document.createElement("div");
    panel.id = "notepad-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Bloc-notes de séance");
    panel.innerHTML = `
      <div class="dice-log-head">
        <span class="dice-log-title">Bloc-notes de séance</span>
        <button class="btn-icon-tiny" data-action="toggle-mode" title="Lire / Éditer" aria-label="Lire / Éditer">✎</button>
        <button class="btn-icon-tiny" data-action="close" title="Fermer" aria-label="Fermer">✕</button>
      </div>
      <div class="notepad-body">
        <div class="notepad-read" id="notepad-read"></div>
        <textarea class="notepad-textarea" id="notepad-textarea" data-mentions
          placeholder="Montants négociés, promesses, alertes, fils narratifs…"></textarea>
      </div>`;
    document.body.appendChild(panel);

    panel
      .querySelector('[data-action="close"]')
      .addEventListener("click", () => this.close());
    panel
      .querySelector('[data-action="toggle-mode"]')
      .addEventListener("click", () => this.toggleMode());

    const ta = panel.querySelector("#notepad-textarea");
    // Sauvegarde débouncée : on n'écrit pas à chaque frappe.
    ta.addEventListener("input", () => {
      clearTimeout(this._saveTimer);
      this._saveTimer = setTimeout(() => this._save(ta.value), 400);
    });
    // E7 : autocomplétion @/# (mentions.js) câblée par l'auto-attach délégué
    // sur `data-mentions` (Mentions.wireAuto) — plus de câblage explicite ici.

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.close();
    });
  },

  /** Bascule Lire (puces @/# cliquables) / Éditer (jeton brut, jamais tapé à
      la main — toujours inséré par l'autocomplétion). E7. */
  toggleMode() {
    const ta = document.getElementById("notepad-textarea");
    if (this._mode === "read") {
      this._mode = "edit";
      this._syncView();
      ta?.focus();
    } else {
      // Flush immédiat : jamais de vue lecture périmée par rapport au texte tapé.
      if (ta) this._save(ta.value);
      clearTimeout(this._saveTimer);
      this._mode = "read";
      this._syncView();
    }
  },

  _syncView() {
    const ta = document.getElementById("notepad-textarea");
    const read = document.getElementById("notepad-read");
    if (!ta || !read) return;
    if (this._mode === "read") {
      read.innerHTML =
        Mentions.renderText(ta.value) ||
        '<span class="notepad-read-empty">Vide.</span>';
      read.hidden = false;
      ta.hidden = true;
    } else {
      read.hidden = true;
      ta.hidden = false;
    }
  },

  _save(value) {
    Storage.setGlobal(this._KEY, value);
  },

  /** Câble le bouton d'ouverture de la barre du haut (index.html). */
  init() {
    const btn = document.getElementById("notepad-btn");
    if (btn) btn.addEventListener("click", () => this.toggle());
  },

  toggle() {
    this._open ? this.close() : this.open();
  },

  open() {
    this._ensure();
    const ta = document.getElementById("notepad-textarea");
    ta.value = Storage.getGlobal(this._KEY, "");
    this._mode = ta.value.trim() ? "read" : "edit";
    this._syncView();
    document.getElementById("notepad-backdrop").classList.add("open");
    document.getElementById("notepad-panel").classList.add("open");
    this._open = true;
    if (this._mode === "edit") ta.focus();
  },

  close() {
    if (!this._open) return;
    // Flush immédiat au cas où le debounce n'aurait pas encore écrit.
    const ta = document.getElementById("notepad-textarea");
    if (ta) this._save(ta.value);
    clearTimeout(this._saveTimer);
    document.getElementById("notepad-panel")?.classList.remove("open");
    document.getElementById("notepad-backdrop")?.classList.remove("open");
    this._open = false;
  },
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => Notepad.init());
} else {
  Notepad.init();
}
