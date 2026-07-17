"use strict";

/* ============================================================
   RUN RENDERER
   ============================================================ */
import { CardRenderer } from "../card/cardrenderer.js";
import { Dossiers } from "../journal/dossiers.js";

export const RunRenderer = {
  render(r) {
    const el = document.createElement("div");
    el.className = "run-card";
    const obj2 = r.objectif2
      ? `<div class="run-field">
           <span class="run-field-label">Objectif secondaire</span>
           <span class="run-field-val" style="color:var(--accent2);font-size:0.75rem;">${CardRenderer._esc(r.objectif2)}</span>
         </div>`
      : "";
    el.innerHTML = `
      <div class="run-card-header">
        <div class="run-type">${CardRenderer._esc(r.type)}</div>
        <span class="pnj-rank-badge">${r.difficulte}</span>
      </div>
      <div class="run-card-body">
        <div class="run-field">
          <span class="run-field-label">Client</span>
          <span class="run-field-val">${CardRenderer._esc(r.client)}</span>
        </div>
        <div class="run-field">
          <span class="run-field-label">Lieu</span>
          <span class="run-field-val">${CardRenderer._esc(r.lieu)}</span>
        </div>
        <div class="run-field">
          <span class="run-field-label">Complication</span>
          <span class="run-field-val run-complication">${CardRenderer._esc(r.complication)}</span>
        </div>
        ${obj2}
        <div class="stats-row" style="margin-top:0.5rem;">
          <span class="stat-pill accent">Paiement <strong>${r.payment}</strong></span>
        </div>
      </div>
      <div class="pnj-card-footer">
        ${
          r.dossierId || r.dossierName
            ? `<span class="pnj-rank-badge" title="Rangée dans ce dossier">📁 ${CardRenderer._esc(
                (r.dossierId && Dossiers.nameOf(r.dossierId)) || r.dossierName,
              )}</span>`
            : `<button class="card-action-btn" data-action="run-to-dossier"
                 data-run-name="${CardRenderer._esc(r.type)}" title="Promouvoir ce topos en run canon">＋ Faire une run</button>`
        }
        ${this._rencontreBtn(r)}
        <button class="card-action-btn danger" data-action="discard-run">Virer</button>
      </div>`;
    return el;
  },

  /** R4 : miroir du geste « rencontre » de dossierbar (même dossierId, mêmes
      méthodes DossierBar.open/closeRencontre) — seulement pour une run
      rangée dans un dossier réellement typé « run ». */
  _rencontreBtn(r) {
    if (!r.dossierId || Dossiers.kindOf(r.dossierId) !== "run") return "";
    const active = Encounter.activeDossierId === r.dossierId;
    const action = active ? "close-rencontre" : "open-rencontre";
    const label = active
      ? "⏹ Fermer la rencontre"
      : `▶ ${Encounter.hasStash(r.dossierId) ? "Rouvrir" : "Ouvrir"} la rencontre`;
    return `<button class="card-action-btn" data-action="${action}" data-dossier="${r.dossierId}">${label}</button>`;
  },
};

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.RunRenderer = RunRenderer;
