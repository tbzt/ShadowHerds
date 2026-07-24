"use strict";

/* ============================================================
   CONVOKE PICKER — popover de casting par CONVOCATION (Fil B · Option C).
   ------------------------------------------------------------
   Calque de FactionPicker, mais scopé à un NŒUD DE JEU (run/scène) :
   on convoque le Monde par RÉFÉRENCE (`Dossiers.convoke`), jamais par
   recopie. Deux sources cochables :
     · Factions — le roster transverse réutilisable (toujours listé).
     · Entités  — PNJ/PJ/contacts/serveurs, filtrés par recherche (la
       bibliothèque peut être vaste) ; les déjà-convoquées restent
       visibles pour être retirées d'un clic.

   Câblage par délégation sur le panneau (aucun handler inline). Le
   déclencheur « ＋ convoquer » vit dans Jouer (Play._wire) et appelle
   `open(runId, el)` ; ce module ne pose donc pas de délégation globale.
   Réutilise le CSS partagé `#…-picker-*` / `.group-picker-*`.
   ============================================================ */
import { CardRenderer } from "../card/cardrenderer.js";
import { Dossiers } from "../journal/dossiers.js";
import { FactionStore } from "../../core/factionstore.js";

export const ConvokePicker = {
  _runId: null,
  _MAX: 40, // borne la liste d'entités quand une recherche est en cours

  _ensure() {
    if (document.getElementById("convoke-picker-panel")) return;

    const backdrop = document.createElement("div");
    backdrop.id = "convoke-picker-backdrop";
    backdrop.addEventListener("click", () => this.close());
    document.body.appendChild(backdrop);

    const panel = document.createElement("div");
    panel.id = "convoke-picker-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Convoquer sur ce run");
    document.body.appendChild(panel);

    // Toggle d'une case → convoque/retire par RÉFÉRENCE, puis re-rend la liste
    // (état des cases) et Jouer (les puces du casting). Le run reste la vérité.
    panel.addEventListener("change", (e) => {
      const cb = e.target.closest('input[type="checkbox"][data-ref]');
      if (!cb || !this._runId) return;
      if (cb.checked) Dossiers.convoke(this._runId, cb.dataset.ref, cb.dataset.cid);
      else Dossiers.unconvoke(this._runId, cb.dataset.ref, cb.dataset.cid);
      this._renderList();
      if (typeof Play !== "undefined") Play.render();
    });
    // Recherche : ne re-rend QUE la liste (le champ garde le focus).
    panel.addEventListener("input", (e) => {
      if (e.target.matches('[data-role="convoke-search"]')) this._renderList();
    });
    panel.addEventListener("click", (e) => {
      const el = e.target.closest("[data-action]");
      if (el && el.dataset.action === "close") this.close();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.close();
    });
    window.addEventListener("resize", () => {
      if (this._runId) this.close();
    });
  },

  open(runId, triggerEl) {
    if (!runId) return;
    this._ensure();
    this._runId = runId;
    this._renderShell();
    document.getElementById("convoke-picker-backdrop").classList.add("open");
    document.getElementById("convoke-picker-panel").classList.add("open");
    this._position(triggerEl);
    const input = document.querySelector('[data-role="convoke-search"]');
    if (input && window.innerWidth > 640) input.focus();
  },

  close() {
    const panel = document.getElementById("convoke-picker-panel");
    const backdrop = document.getElementById("convoke-picker-backdrop");
    if (panel) panel.classList.remove("open");
    if (backdrop) backdrop.classList.remove("open");
    this._runId = null;
  },

  /** Ancre le panneau sous le déclencheur (desktop/iPad) ; feuille basse en CSS
      sur mobile. Même géométrie que FactionPicker._position. */
  _position(triggerEl) {
    const panel = document.getElementById("convoke-picker-panel");
    if (!panel || !triggerEl || window.innerWidth <= 640) return;
    const r = triggerEl.getBoundingClientRect();
    const panelW = 260;
    let left = Math.max(8, Math.min(r.left, window.innerWidth - panelW - 8));
    const estHeight = Math.min(360, panel.offsetHeight || 260);
    let top = r.bottom + 6;
    if (top + estHeight > window.innerHeight - 8) top = Math.max(8, r.top - estHeight - 6);
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  },

  /** Coquille STABLE (tête + recherche + conteneur de liste), montée une fois
      par ouverture — le champ de recherche ne doit pas être recréé à chaque
      frappe, sinon il perd le focus. La liste se peuple via `_renderList`. */
  _renderShell() {
    const panel = document.getElementById("convoke-picker-panel");
    if (!panel) return;
    panel.innerHTML = `
      <div class="group-picker-head">
        <span class="group-picker-title">Convoquer</span>
        <button class="btn-icon-tiny" data-action="close" aria-label="Fermer">✕</button>
      </div>
      <input class="convoke-search" data-role="convoke-search" type="search"
             placeholder="Chercher un PNJ, un contact, un serveur…"
             aria-label="Chercher une entité à convoquer">
      <div class="group-picker-list" id="convoke-picker-list"></div>`;
    this._renderList();
  },

  _esc(s) {
    return CardRenderer._esc(s);
  },

  _entityCols() {
    return [
      { all: (typeof Shadows !== "undefined" && Shadows.data.all) || [], type: "PNJ" },
      { all: (typeof Characters !== "undefined" && Characters.data.all) || [], type: "PJ" },
      { all: (typeof ContactsBook !== "undefined" && ContactsBook.data.all) || [], type: "Contact" },
      { all: (typeof Servers !== "undefined" && Servers.data.all) || [], type: "Serveur" },
    ];
  },

  _renderList() {
    const box = document.getElementById("convoke-picker-list");
    if (!box || !this._runId) return;
    const cv = Dossiers.convokesOf(this._runId) || [];
    const facSet = new Set(cv.filter((c) => c && c.ref === "faction").map((c) => c.id));
    const entSet = new Set(cv.filter((c) => c && c.ref === "entity").map((c) => c.id));
    const input = document.querySelector('[data-role="convoke-search"]');
    const q = ((input && input.value) || "").trim().toLowerCase();

    // — Factions (toujours, jeu restreint) —
    const factions =
      typeof FactionStore !== "undefined"
        ? FactionStore.all().filter((f) => !q || (f.name || "").toLowerCase().includes(q))
        : [];
    const facRows = factions
      .map((f) => {
        const dot = `<span class="faction-dot"${f.color ? ` style="background:${this._esc(f.color)}"` : ""}></span>`;
        const n = Array.isArray(f.members) ? f.members.length : 0;
        return `<label class="group-picker-row">
          <input type="checkbox" ${facSet.has(f.id) ? "checked" : ""} data-ref="faction" data-cid="${this._esc(f.id)}">
          ${dot}<span>${this._esc(f.name || "Faction")}</span><span class="convoke-type">${n} m.</span>
        </label>`;
      })
      .join("");

    // — Entités : déjà convoquées (toujours, pour retrait) + résultats de
    //   recherche (bornés). Sans recherche, on n'inonde pas d'une bibliothèque. —
    const seen = new Set();
    let entRows = "";
    let count = 0;
    for (const { all, type } of this._entityCols()) {
      for (const e of all) {
        if (!e || seen.has(e.id)) continue;
        const isConvoked = entSet.has(e.id);
        const matches = q && (e.name || "").toLowerCase().includes(q);
        if (!isConvoked && !matches) continue;
        if (matches && !isConvoked && count >= this._MAX) continue;
        seen.add(e.id);
        if (matches && !isConvoked) count++;
        entRows += `<label class="group-picker-row">
          <input type="checkbox" ${isConvoked ? "checked" : ""} data-ref="entity" data-cid="${this._esc(e.id)}">
          <span>${this._esc(e.name || "Sans nom")}</span><span class="convoke-type">${type}</span>
        </label>`;
      }
    }
    const entHint = !entRows
      ? `<div class="group-picker-empty">${q ? "Aucune entité trouvée." : "Tapez pour chercher une entité."}</div>`
      : "";

    box.innerHTML =
      `<div class="convoke-sec">Factions</div>` +
      (facRows || `<div class="group-picker-empty">Aucune faction.</div>`) +
      `<div class="convoke-sec">Entités</div>` +
      entRows +
      entHint;
  },
};

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.ConvokePicker = ConvokePicker;
