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
        ${this._stateBadge(r)}
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
        ${
          r.memory
            ? `<div class="run-field run-memory">
                 <span class="run-field-label">⟲ Mémoire</span>
                 <span class="run-field-val">${CardRenderer._esc(r.memory)}</span>
               </div>`
            : ""
        }
        <div class="stats-row" style="margin-top:0.5rem;">
          <span class="stat-pill accent">Paiement <strong>${r.payment}</strong></span>
        </div>
      </div>
      <div class="pnj-card-footer">
        ${
          r.dossierId || r.dossierName
            ? `<span class="pnj-rank-badge" title="Rangé dans ce dossier">📁 ${CardRenderer._esc(
                (r.dossierId && Dossiers.nameOf(r.dossierId)) || r.dossierName,
              )}</span>`
            : `<button class="card-action-btn" data-action="run-to-dossier"
                 data-run-name="${CardRenderer._esc(r.type)}" title="Promouvoir ce topos en run canon">＋ Faire un run</button>`
        }
        <button class="card-action-btn" data-action="edit-run" title="Éditer ce topos">✎ Éditer</button>
        ${this._rencontreBtn(r)}
        ${this._castBtn(r)}
        ${this._planBtn(r)}
        <button class="card-action-btn danger" data-action="discard-run">Virer</button>
      </div>`;
    return el;
  },

  /** Distingue au premier coup d'œil un topos encore libre d'un run canon
      (`dossierId` posé par `RunGen.toDossier`) — même carte, deux états, sinon
      rien ne les sépare visuellement avant le footer (bouton vs badge 📁). */
  _stateBadge(r) {
    return r.dossierId || r.dossierName
      ? `<span class="run-state-badge is-run" title="Promu en run canon">Run</span>`
      : `<span class="run-state-badge" title="Pas encore promu en run">Topos</span>`;
  },

  /** R4 : miroir du geste « rencontre » de dossierbar (même dossierId, mêmes
      méthodes DossierBar.open/closeRencontre) — seulement pour un run
      rangé dans un dossier réellement typé « run ». */
  _rencontreBtn(r) {
    if (!r.dossierId || Dossiers.kindOf(r.dossierId) !== "run") return "";
    const active = Encounter.activeDossierId === r.dossierId;
    const action = active ? "close-rencontre" : "open-rencontre";
    const label = active
      ? "⏹ Fermer la rencontre"
      : `▶ ${Encounter.hasStash(r.dossierId) ? "Rouvrir" : "Ouvrir"} la rencontre`;
    return `<button class="card-action-btn" data-action="${action}" data-dossier="${r.dossierId}">${label}</button>`;
  },

  /** « Générer le casting » (Lot 3b) — seulement sur un topos promu en run
      (`dossierId`) et porteur d'un profil de sécurité (topos généré ≥ 3a) :
      RunGen produit alors les PNJ d'opposition et les range dans le run. */
  _castBtn(r) {
    if (!r.dossierId || !r.securityProfile) return "";
    return `<button class="card-action-btn" data-action="run-cast" title="Générer les PNJ d'opposition et les ranger dans le run">⚔ Casting</button>`;
  },

  /** Boutons « plan » d'un site à plan utile (tag `planUtile`, 3a) ; rien pour
      un topos vierge. Deux chemins :
      - « Plan tactique » (MapGen) : plan CONSTRUIT, gratuit, instantané, hors
        opt-in IA — toujours proposé. Déterministe par graine, régénéré à
        l'affichage (`run-map` → RunGen.showMap).
      - « Ambiance » (Pollinations, Lot 4) : image d'ambiance IA, seulement si
        l'opt-in Images IA est actif ; vignette cliquable si déjà générée. */
  _planBtn(r) {
    if (!r.planUtile) return "";
    let out = `<button class="card-action-btn" data-action="run-map" title="Plan tactique du lieu (généré, gratuit)">🗺 Plan tactique</button>`;
    const aiEnabled =
      typeof Settings !== "undefined" && Settings.getPortraitSettings().enabled;
    if (aiEnabled) {
      out += r.planUrl
        ? `<button class="card-action-btn" data-portrait-preview="${CardRenderer._esc(r.planUrl)}" data-portrait-caption="${CardRenderer._esc(`Ambiance — ${r.lieu || "lieu inconnu"}`)}" title="Voir l'ambiance générée">✨ Ambiance</button>`
        : `<button class="card-action-btn" data-action="run-plan" title="Générer une ambiance du lieu (IA)">✨ Ambiance</button>`;
    }
    return out;
  },
};

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.RunRenderer = RunRenderer;
