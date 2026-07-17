"use strict";

/* ============================================================
   PALETTE DE COMMANDES — Ctrl/Cmd+K : trouver n'importe quelle
   entité sauvegardée par nom/archétype et y aller, sans connaître son
   rangement. Source unique : PnjLookup.search (pas de résolveur concurrent).
   ============================================================ */
import { CardRenderer } from "./card/cardrenderer.js";
import { DossierBar } from "./dossierbar.js";
import { Mentions } from "./mentions.js";
import { Notebooks } from "../rules/notebooks.js";
import { Notepad } from "./notepad.js";
import { PinRow } from "./pinrow.js";

export const Palette = {
  _open: false,
  _sel: 0,
  _results: [],
  _mode: "entity", // "entity" | "tag" (préfixe `#`)

  _TYPE_LABEL: { pnj: "PNJ", pj: "PJ", contact: "Contact", server: "Serveur" },

  _ensure() {
    if (document.getElementById("palette-overlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "palette-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-label", "Palette de commandes");
    overlay.innerHTML = `
      <div id="palette-box">
        <input id="palette-input" type="text" autocomplete="off" spellcheck="false"
          placeholder="Rechercher un PNJ, contact, serveur, PJ…" aria-label="Rechercher">
        <div id="palette-results" role="listbox"></div>
        <div id="palette-hint">↑↓ naviguer · ↵ ouvrir · Échap fermer</div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) this.close();
      const row = e.target.closest(".palette-row");
      if (row) {
        this._sel = Number(row.dataset.idx);
        this._activate();
      }
    });

    const input = overlay.querySelector("#palette-input");
    input.addEventListener("input", () => this._onInput());
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); this._move(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); this._move(-1); }
      else if (e.key === "Enter") { e.preventDefault(); this._activate(); }
      else if (e.key === "Escape") { e.preventDefault(); this.close(); }
    });
  },

  toggle() {
    this._open ? this.close() : this.open();
  },

  open() {
    this._ensure();
    const overlay = document.getElementById("palette-overlay");
    overlay.classList.add("open");
    const input = document.getElementById("palette-input");
    input.value = "";
    this._mode = "entity";
    this._results = [];
    this._sel = 0;
    this._render();
    input.focus();
    this._open = true;
  },

  close() {
    if (!this._open) return;
    document.getElementById("palette-overlay")?.classList.remove("open");
    this._open = false;
  },

  /** Ouvre la Palette en mode mot-clé, `#tag` pré-rempli (clic sur une puce
      `#`). */
  openTag(tag) {
    this.open();
    const input = document.getElementById("palette-input");
    input.value = `#${tag}`;
    this._onInput();
  },

  _onInput() {
    const q = document.getElementById("palette-input").value;
    if (q.startsWith("#")) {
      this._mode = "tag";
      this._results = Mentions.notesWithTag(q.slice(1));
    } else {
      this._mode = "entity";
      // #61 : au-delà de 2 caractères, complète les entités par les notes
      // (Notepad global + carnets) dont le texte contient la requête.
      this._results =
        q.trim().length >= 2
          ? [...PnjLookup.search(q), ...Mentions.notesWithText(q)]
          : PnjLookup.search(q);
    }
    this._sel = 0;
    this._render();
  },

  _move(delta) {
    if (!this._results.length) return;
    this._sel = (this._sel + delta + this._results.length) % this._results.length;
    this._render();
  },

  _render() {
    const box = document.getElementById("palette-results");
    if (!this._results.length) {
      const typed = document.getElementById("palette-input").value.trim();
      const empty =
        this._mode === "tag"
          ? typed
            ? "Aucune note avec ce mot-clé."
            : "Tapez #mot-clé pour retrouver les notes qui le portent."
          : typed
            ? "Aucun résultat."
            : "Tapez pour rechercher dans vos bibliothèques.";
      box.innerHTML = `<div class="palette-empty">${empty}</div>`;
      return;
    }
    if (this._mode === "tag") {
      box.innerHTML = this._results
        .map((r, i) => {
          const label = r.kind === "notepad" ? r.label : r.name;
          return `<div class="palette-row${i === this._sel ? " sel" : ""}" data-idx="${i}" role="option" aria-selected="${i === this._sel}">
              <span class="palette-type">${r.kind === "notepad" ? "Bloc-notes" : this._TYPE_LABEL[r.type] || r.type}</span>
              <span class="palette-name">${Utils.escHtml(label)}</span>
            </div>`;
        })
        .join("");
      box.querySelector(".palette-row.sel")?.scrollIntoView({ block: "nearest" });
      return;
    }
    box.innerHTML = this._results
      .map((r, i) => {
        const sel = i === this._sel ? " sel" : "";
        // #61 : résultat "note" (Mentions.notesWithText) mêlé aux entités —
        // même gabarit que le mode tag, pas d'avatar (ce n'est pas une carte).
        if (r.kind === "notepad" || r.kind === "entity") {
          const label = r.kind === "notepad" ? r.label : r.name;
          return `<div class="palette-row${sel}" data-idx="${i}" role="option" aria-selected="${i === this._sel}">
              <span class="palette-type">${r.kind === "notepad" ? "Bloc-notes" : this._TYPE_LABEL[r.type] || r.type}</span>
              <span class="palette-name">${Utils.escHtml(label)}</span>
            </div>`;
        }
        // Avatar PJ constant (couleur+anneau+initiale) — un aller-retour
        // PnjLookup de plus par ligne, liste bornée à 30 résultats (search()).
        const avatar = r.type === "pj" ? CardRenderer._pcAvatar(PnjLookup.find(r.id)) : "";
        return `<div class="palette-row${sel}" data-idx="${i}" role="option" aria-selected="${i === this._sel}">
            <span class="palette-type">${this._TYPE_LABEL[r.type] || r.type}</span>
            <span class="palette-name">${avatar}${Utils.escHtml(r.name)}</span>
          </div>`;
      })
      .join("");
    box.querySelector(".palette-row.sel")?.scrollIntoView({ block: "nearest" });
  },

  _activate() {
    const r = this._results[this._sel];
    if (!r) return;
    if (r.kind === "notepad") {
      this._openNotebook(r.dossierId);
      return;
    }
    // #61 : un résultat "note" en mode entité a la même forme _locOut("entity")
    // qu'un résultat PnjLookup.search (id/type/name) — réutilise _reveal tel quel.
    this._reveal(r);
  },

  /** Ouvre le carnet où vit le résultat (#61 — corrige l'ouverture qui
      atterrissait toujours dans le carnet du dossier courant, ignorant celui
      où la note a été trouvée). `dossierId` est `Notebooks._GLOBAL` pour le
      bloc-notes de séance, sinon un vrai id de dossier. */
  _openNotebook(dossierId) {
    this.close();
    DossierBar.select(dossierId === Notebooks._GLOBAL ? "all" : dossierId);
    Notepad.open();
  },

  /** API publique : révèle une entité par id (clic sur une puce `@`). */
  reveal(id) {
    const ent = PnjLookup.locate(id);
    if (ent) this._reveal(ent);
  },

  /** Amène l'entité à l'écran en réutilisant le filtre existant (Q1) : pas de
      dépendance à la classe de carte ni à un flash. */
  _reveal(r) {
    this.close();
    PinRow.noteConsulted(r);
    if (r.type === "pj") {
      App.showPanel("characters");
      setTimeout(() => {
        const f = document.querySelector('#panel-characters input[data-action="filter"]');
        if (f) { f.value = r.name; f.dispatchEvent(new Event("input", { bubbles: true })); }
      }, 40);
      return;
    }
    App.showPanel("shadows");
    DossierBar.select("all");
    Hub.setType(r.type);
    Hub.setFilter(r.name);
    setTimeout(() => {
      const f = document.querySelector("#panel-shadows [data-hub-filter]");
      if (f) f.value = r.name;
    }, 0);
  },
};

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.Palette = Palette;
