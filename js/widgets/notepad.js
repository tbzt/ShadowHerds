"use strict";

/* ============================================================
   BLOC-NOTES DE SÉANCE — scratchpad persistant du MJ (montants
   négociés, promesses, fils narratifs, alertes). Volontairement LÉGER :
   un simple textarea, pas un wiki. Overlay calqué sur le journal des jets
   (DiceLog) ; persistance globale via Storage, jamais localStorage direct.
   ============================================================ */
const Notepad = {
  _open: false,
  _saveTimer: null,
  _mode: "read", // "read" (puces @/#) | "edit" (jeton brut)
  // R2 (Notebooks) : carnet courant, figé à l'ouverture (le panneau est un
  // overlay plein écran à backdrop bloquant — le dossier courant ne peut pas
  // changer pendant qu'il est ouvert, pas besoin de re-résoudre en direct).
  _openDossierId: null,

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
        <button class="ctx-trigger notepad-ctx" id="notepad-ctx" title="Changer de carnet (contexte)" aria-haspopup="listbox">
          <span class="ctx-trigger-icon" aria-hidden="true">◇</span><span class="ctx-trigger-label" id="notepad-ctx-label">Bloc-notes de séance</span><span class="ctx-trigger-caret" aria-hidden="true">▾</span>
        </button>
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
    // Le titre EST le sélecteur de contexte (« select en haut du
    // bloc-note »). Ouvrir le sélecteur unique ; changer de contexte recharge
    // le carnet sans fermer le panneau.
    panel
      .querySelector("#notepad-ctx")
      .addEventListener("click", (e) => this._openSelector(e.currentTarget));

    // Click-to-edit — cible énorme (tout le rendu) plutôt que le ✎
    // minuscule. Garde puce : un clic sur @/# navigue (délégation document,
    // app.js). Garde sélection : sélectionner pour copier ne bascule pas.
    panel.querySelector("#notepad-read").addEventListener("click", (e) => {
      if (e.target.closest("[data-action]")) return;
      if (!document.getSelection().isCollapsed) return;
      this._editFromRead();
    });

    const ta = panel.querySelector("#notepad-textarea");
    // Sauvegarde débouncée : on n'écrit pas à chaque frappe.
    ta.addEventListener("input", () => {
      clearTimeout(this._saveTimer);
      this._saveTimer = setTimeout(() => this._save(ta.value), 400);
    });
    // Autocomplétion @/# (mentions.js) câblée par l'auto-attach délégué
    // sur `data-mentions` (Mentions.wireAuto) — plus de câblage explicite ici.

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.close();
    });
  },

  /** Bascule Lire (puces @/# cliquables) / Éditer (jeton brut, jamais tapé à
      la main — toujours inséré par l'autocomplétion). */
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

  /** Bascule en édition depuis un clic dans le rendu, curseur en fin (décision A : on ajoute 90 % du temps, pas de mapping clic→offset). */
  _editFromRead() {
    if (this._mode !== "read") return;
    this._mode = "edit";
    this._syncView();
    const ta = document.getElementById("notepad-textarea");
    if (!ta) return;
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
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
    Notebooks.set(this._openDossierId, value);
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
    // Le carnet courant dérive d'App.context (vérité unique du contexte),
    // résolu à l'ouverture puis re-résolu quand le sélecteur change de contexte
    // (_reloadForContext). "all"/aucun focus → carnet global.
    this._openDossierId =
      (typeof App !== "undefined" && App.context && App.context.dossier) || null;
    Notebooks.seedFromLegacyIfEmpty(this._openDossierId);
    const ta = document.getElementById("notepad-textarea");
    ta.value = Notebooks.get(this._openDossierId);
    this._mode = ta.value.trim() ? "read" : "edit";
    this._syncView();
    this._updateTitle();
    document.getElementById("notepad-backdrop").classList.add("open");
    document.getElementById("notepad-panel").classList.add("open");
    this._open = true;
    if (this._mode === "edit") ta.focus();
  },

  /** Ouvre le sélecteur de contexte unique depuis le titre. On flush
      d'abord le carnet courant (sinon une frappe non encore débouncée
      s'écrirait dans le mauvais carnet après bascule). */
  _openSelector(trigger) {
    const ta = document.getElementById("notepad-textarea");
    if (ta) this._save(ta.value);
    clearTimeout(this._saveTimer);
    ContextSelector.open(trigger, () => this._reloadForContext());
  },

  /** Recharge le carnet pour le contexte désormais courant (App.context),
      sans fermer le panneau. */
  _reloadForContext() {
    this._openDossierId =
      (typeof App !== "undefined" && App.context && App.context.dossier) || null;
    Notebooks.seedFromLegacyIfEmpty(this._openDossierId);
    const ta = document.getElementById("notepad-textarea");
    if (ta) ta.value = Notebooks.get(this._openDossierId);
    this._mode = ta && ta.value.trim() ? "read" : "edit";
    this._syncView();
    this._updateTitle();
    if (this._mode === "edit" && ta) ta.focus();
  },

  /** Affiche le nom du carnet courant dans le déclencheur de titre — sans ça,
      rien ne distingue « je suis dans le carnet de cette run » du carnet global. */
  _updateTitle() {
    const label = document.getElementById("notepad-ctx-label");
    if (!label) return;
    const name = this._openDossierId && Dossiers.nameOf(this._openDossierId);
    label.textContent = name ? `Bloc-notes — ${name}` : "Bloc-notes de séance";
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
