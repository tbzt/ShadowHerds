"use strict";

/* ============================================================
   RUN RENDERER
   ============================================================ */
import { CardRenderer } from "../card/cardrenderer.js";
import { CardFooter } from "../card/cardfooter.js";
import { Dossiers } from "../journal/dossiers.js";

export const RunRenderer = {
  render(r) {
    const el = document.createElement("div");
    el.className = "run-card";
    const obj2 = r.objectif2
      ? `<div class="run-field">
           <span class="run-field-label">Objectif secondaire</span>
           <span class="run-field-val" style="color:var(--accent2);font-size:var(--fs-xs);">${CardRenderer._esc(r.objectif2)}</span>
         </div>`
      : "";
    el.innerHTML = `
      <div class="run-card-frame">
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
          ${
            r.contactHook
              ? `<div class="run-field run-memory">
                   <span class="run-field-label">☏ Contact</span>
                   <span class="run-field-val">${CardRenderer._esc(r.contactHook)}</span>
                 </div>`
              : ""
          }
          ${
            r.reputationNote
              ? `<div class="run-field run-memory">
                   <span class="run-field-label">✶ Réputation</span>
                   <span class="run-field-val">${CardRenderer._esc(r.reputationNote)}</span>
                 </div>`
              : ""
          }
          ${
            r.beatsEcho
              ? `<div class="run-field run-memory">
                   <span class="run-field-label">◆ Écho</span>
                   <span class="run-field-val">${CardRenderer._esc(r.beatsEcho)}</span>
                 </div>`
              : ""
          }
          <div class="cluster stats-row" style="margin-top:0.5rem;">
            <span class="stat-pill accent">Paiement <strong>${r.payment}</strong></span>
          </div>
        </div>
        ${this._footerHtml(r)}
      </div>`;
    return el;
  },

  /** Pied unifié (CardFooter, D6). Promu en run (dossierId) : le badge 📁
      remplace le bouton de promotion, préfixé au pied comme le fait le
      socle Collection pour ★/🏷 (même geste, cf. doc de CardFooter). Pas de
      promotion : « ＋ Faire un run » devient le primaire. */
  _footerHtml(r) {
    const promoted = r.dossierId || r.dossierName;
    const actions = promoted
      ? this._footerActions(r)
      : [
          {
            kind: "primary",
            icon: "＋",
            label: "Faire un run",
            attrs: `data-action="run-to-dossier" data-run-name="${CardRenderer._esc(r.type)}" title="Promouvoir ce topos en run canon"`,
          },
          ...this._footerActions(r),
        ];
    const footer = CardFooter.render(actions);
    if (!promoted) return footer;
    const badge = `<span class="pnj-rank-badge" title="Rangé dans ce dossier">📁 ${CardRenderer._esc(
      (r.dossierId && Dossiers.nameOf(r.dossierId)) || r.dossierName,
    )}</span>`;
    return footer.replace('<div class="cluster pnj-card-footer">', `<div class="cluster pnj-card-footer">${badge}`);
  },

  /** Pied unifié (CardFooter, D6) : Éditer + Rencontre en secondaires
      (visibles), Trame/Plan/Ambiance dans le ⋯ (actions moins fréquentes),
      « Virer » dans le ⋯ en rouge — jamais un bouton destructeur nu dans le
      pied (loi D6, Fitts en négatif). Remplace l'ancien pied fait main. */
  _footerActions(r) {
    return [
      { kind: "secondary", label: "Éditer", attrs: `data-action="edit-run" title="Éditer ce topos"` },
      ...this._rencontreAction(r),
      ...this._trameAction(r),
      ...this._planActions(r),
      { kind: "menu", danger: true, label: "Virer", attrs: `data-action="discard-run"` },
    ];
  },

  /** Distingue au premier coup d'œil un topos encore libre d'un run canon
      (`dossierId` posé par `RunGen.toDossier`) — même carte, deux états, sinon
      rien ne les sépare visuellement avant le footer (bouton vs badge 📁). */
  _stateBadge(r) {
    return r.dossierId || r.dossierName
      ? `<span class="run-state-badge status is-accent" title="Promu en run canon">Run</span>`
      : `<span class="run-state-badge" title="Pas encore promu en run">Topos</span>`;
  },

  /** R4 : miroir du geste « rencontre » de dossierbar (même dossierId, mêmes
      méthodes DossierBar.open/closeRencontre) — seulement pour un run
      rangé dans un dossier réellement typé « run ». */
  _rencontreAction(r) {
    if (!r.dossierId || Dossiers.kindOf(r.dossierId) !== "run") return [];
    const active = Encounter.activeDossierId === r.dossierId;
    const action = active ? "close-rencontre" : "open-rencontre";
    const label = active
      ? "⏹ Fermer la rencontre"
      : `▶ ${Encounter.hasStash(r.dossierId) ? "Rouvrir" : "Ouvrir"} la rencontre`;
    return [{ kind: "secondary", label, attrs: `data-action="${action}" data-dossier="${r.dossierId}"` }];
  },

  /** « Générer la trame » — seulement sur un topos promu en run (`dossierId`) et
      porteur d'un profil de sécurité (topos généré ≥ 3a) : RunGen pose alors une
      trame jouable complète (scènes, horloges, front, faction + casting) liée au
      run. Un clic de plus si une trame existe déjà (proposée à l'ouverture). */
  _trameAction(r) {
    if (!r.dossierId || !r.securityProfile) return [];
    return [
      {
        kind: "menu",
        label: "◈ Générer la trame",
        attrs: `data-action="run-trame" title="Générer une trame jouable (scènes, horloges, front, faction + casting) et la lier au run"`,
      },
    ];
  },

  /** Actions du lieu. Deux natures distinctes, gatées séparément :
      - « Plan tactique » (MapGen SVG) = la STRUCTURE : gratuit, hors opt-in IA,
        seulement là où un plan a du sens (site à `planUtile`, 3a). Déterministe
        par graine, régénéré à l'affichage (`run-map` → RunGen.showMap).
      - « Ambiance » (Pollinations) = le RESSENTI : image IA, pour TOUT lieu
        (une scène a toujours une ambiance, ≠ un plan structurel) si l'opt-in
        Images IA est actif ; vignette cliquable si déjà générée. */
  _planActions(r) {
    const out = [];
    if (r.planUtile) {
      out.push({
        kind: "menu",
        label: "🗺 Plan tactique",
        attrs: `data-action="run-map" title="Plan tactique du lieu (généré, gratuit)"`,
      });
    }
    const aiEnabled =
      typeof Settings !== "undefined" && Settings.getPortraitSettings().enabled;
    if (aiEnabled && r.lieu) {
      out.push(
        r.planUrl
          ? {
              kind: "menu",
              label: "✨ Ambiance",
              attrs: `data-portrait-preview="${CardRenderer._esc(r.planUrl)}" data-portrait-caption="${CardRenderer._esc(`Ambiance — ${r.lieu}`)}" title="Voir l'ambiance générée"`,
            }
          : {
              kind: "menu",
              label: "✨ Ambiance",
              attrs: `data-action="run-plan" title="Générer une ambiance du lieu (IA)"`,
            },
      );
    }
    return out;
  },
};

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.RunRenderer = RunRenderer;
