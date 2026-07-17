"use strict";

/* ============================================================
   PLAY — panneau « Jouer ». Vue dédiée de la colonne
   Campagne › Run › Scène, pendant « monde Jouer » du hub
   « monde Créer ». Ne crée AUCUNE donnée : projette `Dossiers`
   (campagnes ❖ + runs ◆) + l'état vivant (`App.context.scene`,
   `Encounter`) en liste d'accès rapide.

   Doctrine `DOCTRINE_CAMPAGNE_RUN_SCENE.md` : « Naviguer = choisir
   parmi ce qui est vivant ». Chaque run offre Reprendre la scène
   (si vivante/rangée), Focus (→ hub filtré), Voir le topos (prep).
   Délégation `data-action` (aucun onclick), neutre par édition.
   ============================================================ */
import { Collection } from "../widgets/collection/collection.js";
import { DossierBar } from "../widgets/journal/dossierbar.js";
import { Dossiers } from "../widgets/journal/dossiers.js";
import { Encounter } from "./encounter.js";
import { RunGen } from "./rungen.js";

export const Play = {
  _wired: false,

  initPanel() {
    this._wire();
    this.render();
  },

  _wire() {
    if (this._wired) return;
    this._wired = true;
    document.getElementById("panel-play").addEventListener("click", (e) => {
      const el = e.target.closest("[data-action]");
      if (!el) return;
      const id = el.dataset.dossier;
      switch (el.dataset.action) {
        case "play-resume":
          // Rouvre la scène de cette run (restaure + focus + tracker) — un seul
          // geste, réutilise la mécanique de la barre de dossiers (R4).
          DossierBar.openRencontre(id);
          break;
        case "play-focus":
          DossierBar.select(id);
          App.showPanel("shadows");
          break;
        // « Voir le topos » et les CTA d'état vide passent par le data-action
        // global `show-panel` (app.js) — rien à intercepter ici.
      }
    });
  },

  render() {
    const box = document.getElementById("play-content");
    if (!box) return;
    const roots = Dossiers.roots().filter((d) => d.name !== Collection.FAV_GROUP);
    const campaigns = roots.filter((d) => d.kind === "campaign");
    // Runs hors campagne : racines typées `run`, OU runs dont le parent n'est
    // pas une campagne (dossier neutre) — présentées à plat sous « Runs ».
    const looseRuns = Dossiers.list().filter(
      (d) =>
        d.kind === "run" &&
        !(d.parentId && Dossiers.kindOf(d.parentId) === "campaign"),
    );

    if (!campaigns.length && !looseRuns.length) {
      box.innerHTML = this._emptyHtml();
      return;
    }

    let html = "";
    for (const camp of campaigns) {
      const runs = Dossiers.children(camp.id).filter((d) => d.kind === "run");
      html += this._sectionHtml(
        `❖ ${CardRenderer._esc(camp.name)}`,
        `${runs.length} run${runs.length > 1 ? "s" : ""}`,
        runs.length
          ? runs.map((r) => this._runRow(r)).join("")
          : `<div class="play-empty-note">Aucune run — « Faire une run » depuis un topos la rangera ici.</div>`,
      );
    }
    if (looseRuns.length) {
      html += this._sectionHtml(
        "◆ Runs",
        `${looseRuns.length}`,
        looseRuns.map((r) => this._runRow(r)).join(""),
      );
    }
    box.innerHTML = html;
  },

  _sectionHtml(title, count, inner) {
    return `<div class="hub-section">
      <div class="hub-section-head">
        <span class="hub-section-title">${title}</span>
        <span class="hub-section-count">${count}</span>
      </div>
      ${inner}
    </div>`;
  },

  /** Une ligne de run : nom + badge « en cours » si sa scène est vivante, +
      actions (Reprendre / Focus / Voir le topos). L'état vivant/rangé dérive
      d'`App.context.scene` et d'`Encounter` — jamais recopié sur le dossier. */
  _runRow(run) {
    const live = App.context && App.context.scene === run.id;
    const stashed = Encounter.hasStash(run.id);
    const hasTopos = typeof RunGen !== "undefined" && RunGen.forDossier(run.id).length > 0;

    const liveBadge = live
      ? `<span class="play-live" title="Scène en cours"><span class="tb-crumb-live" aria-hidden="true"></span>En cours</span>`
      : "";
    // Reprendre : proposé si une scène tourne (live) ou a été rangée (stashed).
    const resumeBtn =
      live || stashed
        ? `<button class="btn-secondary btn-small" data-action="play-resume" data-dossier="${run.id}">${live ? "Reprendre la scène" : "Ouvrir la rencontre"}</button>`
        : "";
    const toposBtn = hasTopos
      ? `<button class="btn-secondary btn-small" data-action="show-panel" data-panel="run">Voir le topos</button>`
      : "";

    return `<div class="play-run">
      <button class="play-run-name" data-action="play-focus" data-dossier="${run.id}" title="Ouvrir « ${CardRenderer._esc(run.name)} » dans la bibliothèque">
        <span class="play-run-icon" aria-hidden="true">◆</span>${CardRenderer._esc(run.name)}
      </button>
      ${liveBadge}
      <span class="play-run-actions">${resumeBtn}${toposBtn}</span>
    </div>`;
  },

  _emptyHtml() {
    return `<div class="play-onboard">
      <p class="play-onboard-lead">Rien à jouer pour l'instant.</p>
      <p>La colonne <strong>Campagne › Run › Scène</strong> se remplit dès que vous typez un dossier en campagne / run (menu ⋯ d'un dossier), ou que vous <strong>faites une run</strong> depuis un topos.</p>
      <div class="play-onboard-cta">
        <button class="btn-primary btn-small" data-action="show-panel" data-panel="run">Générer un topos</button>
        <button class="btn-secondary btn-small" data-action="show-panel" data-panel="shadows">Ouvrir la bibliothèque</button>
      </div>
    </div>`;
  },
};

// Pont couche 5 (migration modules ES) — retiré en fin de migration.
window.Play = Play;
