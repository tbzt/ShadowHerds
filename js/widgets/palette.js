"use strict";

/* ============================================================
   PALETTE DE COMMANDES (CH-Q7) — Ctrl/Cmd+K : trouver n'importe quelle
   entité sauvegardée par nom/archétype et y aller, sans connaître son
   rangement. Source unique : PnjLookup.search (pas de résolveur concurrent).
   ============================================================ */
const Palette = {
  _open: false,
  _sel: 0,
  _results: [],

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

  _onInput() {
    const q = document.getElementById("palette-input").value;
    this._results = PnjLookup.search(q);
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
      box.innerHTML = `<div class="palette-empty">${typed ? "Aucun résultat." : "Tapez pour rechercher dans vos bibliothèques."}</div>`;
      return;
    }
    box.innerHTML = this._results
      .map(
        (r, i) =>
          `<div class="palette-row${i === this._sel ? " sel" : ""}" data-idx="${i}" role="option" aria-selected="${i === this._sel}">
            <span class="palette-type">${this._TYPE_LABEL[r.type] || r.type}</span>
            <span class="palette-name">${Utils.escHtml(r.name)}</span>
          </div>`,
      )
      .join("");
    box.querySelector(".palette-row.sel")?.scrollIntoView({ block: "nearest" });
  },

  _activate() {
    const r = this._results[this._sel];
    if (r) this._reveal(r);
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
