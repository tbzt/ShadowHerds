"use strict";

/* ============================================================
   TAG PICKER — popover d'étiquetage d'une entité.
   ------------------------------------------------------------
   Calque de FactionPicker, mais provider = le VOCABULAIRE de tags
   (union des tags déjà posés, `Tags.vocabulary()`) + les tags propres
   de l'entité pour l'état coché. Écrit via `UI.toggleTag`/`UI.addTag`
   (le seul écrivain d'entité sanctionné — mute toutes les copies,
   persiste par appartenance). Un tag est une étiquette libre : pas de
   roster partagé, contrairement aux factions.

   Réutilise le CSS `#…-picker-panel` / `.group-picker-*`. Câblage par
   délégation `data-action="tag-*"`, aucun handler inline.
   ============================================================ */
import { CardRenderer } from "../card/cardrenderer.js";
import { Dialog } from "./dialog.js";
import { Tags } from "../../core/tags.js";

export const TagPicker = {
  _id: null,
  _wired: false,

  /** Délégation des déclencheurs de fiche (＋ Tag / ✕), montée une fois sur
      `document` — les cartes sont rendues dynamiquement. L'écriture (UI) est le
      propriétaire ; ici on ne fait qu'orchestrer. */
  _wireTriggers() {
    if (this._wired) return;
    this._wired = true;
    document.addEventListener("click", (e) => {
      const open = e.target.closest('[data-action="tag-open-picker"]');
      if (open) {
        this.open(open.dataset.id, open);
        return;
      }
      const rm = e.target.closest('[data-action="tag-remove"]');
      if (rm) {
        if (typeof UI !== "undefined") UI.removeTag(rm.dataset.id, rm.dataset.tag);
      }
    });
  },

  /** Les tags courants de l'entité (via l'écrivain d'entité, qui sait résoudre
      toutes les copies). Lecture seule. */
  _tagsOf(id) {
    const ent = typeof UI !== "undefined" ? UI._entityCopies(id)[0] : null;
    return ent ? Tags.of(ent) : [];
  },

  _ensure() {
    if (document.getElementById("tag-picker-panel")) return;

    const backdrop = document.createElement("div");
    backdrop.id = "tag-picker-backdrop";
    backdrop.addEventListener("click", () => this.close());
    document.body.appendChild(backdrop);

    const panel = document.createElement("div");
    panel.id = "tag-picker-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Tags de l'entité");
    document.body.appendChild(panel);

    panel.addEventListener("change", (e) => {
      const cb = e.target.closest('input[type="checkbox"][data-tag]');
      if (!cb || !this._id) return;
      if (typeof UI !== "undefined") UI.toggleTag(this._id, cb.dataset.tag, cb.checked);
      this._render();
    });
    panel.addEventListener("click", (e) => {
      const el = e.target.closest("[data-action]");
      if (!el) return;
      if (el.dataset.action === "close") this.close();
      if (el.dataset.action === "create") this.createAndAssign();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.close();
    });
    window.addEventListener("resize", () => {
      if (this._id) this.close();
    });
  },

  open(id, triggerEl) {
    if (!id) return;
    this._ensure();
    this._id = id;
    this._render();
    document.getElementById("tag-picker-backdrop").classList.add("open");
    document.getElementById("tag-picker-panel").classList.add("open");
    this._position(triggerEl);
  },

  close() {
    const panel = document.getElementById("tag-picker-panel");
    const backdrop = document.getElementById("tag-picker-backdrop");
    if (panel) panel.classList.remove("open");
    if (backdrop) backdrop.classList.remove("open");
    this._id = null;
  },

  /** Ancre le panneau sous le déclencheur (desktop/iPad) ; feuille basse en CSS
      sur mobile. Même géométrie que FactionPicker._position. */
  _position(triggerEl) {
    const panel = document.getElementById("tag-picker-panel");
    if (!panel || !triggerEl || window.innerWidth <= 640) return;
    const r = triggerEl.getBoundingClientRect();
    const panelW = 240;
    let left = r.right - panelW;
    left = Math.max(8, Math.min(left, window.innerWidth - panelW - 8));
    const estHeight = Math.min(320, panel.offsetHeight || 220);
    let top = r.bottom + 6;
    if (top + estHeight > window.innerHeight - 8) {
      top = Math.max(8, r.top - estHeight - 6);
    }
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  },

  _render() {
    const panel = document.getElementById("tag-picker-panel");
    if (!panel || !this._id) return;
    const mine = new Set(this._tagsOf(this._id).map((t) => t.toLowerCase()));
    // Vocabulaire = union des tags existants ∪ ceux de l'entité (déjà inclus,
    // vocabulary scanne toutes les entités).
    const rows = Tags.vocabulary()
      .map((t) => {
        const checked = mine.has(t.toLowerCase()) ? "checked" : "";
        return `<label class="group-picker-row">
          <input type="checkbox" ${checked} data-tag="${CardRenderer._esc(t)}">
          <span>${CardRenderer._esc(t)}</span>
        </label>`;
      })
      .join("");

    panel.innerHTML = `
      <div class="group-picker-head">
        <span class="group-picker-title">Tags</span>
        <button class="btn-icon-tiny" data-action="close" aria-label="Fermer">✕</button>
      </div>
      <div class="group-picker-list">${rows || `<div class="group-picker-empty">Aucun tag pour l'instant.</div>`}</div>
      <button class="group-picker-new" data-action="create">+ Nouveau tag</button>`;
  },

  /** Crée un tag libre et l'assigne directement à l'entité courante. */
  createAndAssign() {
    const id = this._id;
    if (!id) return;
    Dialog.prompt({
      title: "Nouveau tag",
      label: "Nom du tag",
      placeholder: "ex. corpo, matrice, indics…",
      confirmLabel: "Ajouter",
    }).then((name) => {
      const t = Tags.normalize(name);
      if (!t) return;
      // `id` est capturé : le picker peut s'être fermé pendant que la modale
      // était ouverte (elle prend le focus) — on applique quand même à l'entité
      // visée. `UI.addTag` rafraîchit la carte ; on ne re-rend le picker que s'il
      // est encore ouvert sur la même entité.
      if (typeof UI !== "undefined") UI.addTag(id, t);
      if (this._id === id) this._render();
    });
  },
};

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.TagPicker = TagPicker;
TagPicker._wireTriggers();
