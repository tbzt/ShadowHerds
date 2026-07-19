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
        case "play-notes":
          // Notes de CETTE run : poser le contexte sur la run (App.context.dossier
          // = carnet courant) puis DÉLÉGUER au Notepad — le poste de commandement
          // n'édite jamais les notes lui-même (source unique Notebooks).
          DossierBar.select(id);
          Notepad.open();
          break;
        case "play-cast-consult":
          // Consulter une fiche du casting : réutilise le résolveur public de la
          // palette (id → panneau), aucun 2ᵉ résolveur nom→fiche.
          Palette.reveal(el.dataset.id);
          break;
        case "play-cast-toscene":
          // Envoyer un participant préparé dans la scène vivante — délégué à
          // Encounter.add (toast interne, dédup). Re-rendu pour l'état « en scène ».
          Encounter.add(el.dataset.id);
          this.render();
          break;
        case "play-cast-server":
          // Mettre un serveur cible EN JEU : moteur Matrice de la scène. Délégué
          // à Encounter.linkServer, seul propriétaire de l'état d'intrusion
          // (Failsafe : un fait, une source). Async (confirm éventuel) → re-rendu
          // après résolution pour faire apparaître l'horloge d'intrusion.
          Promise.resolve(Encounter.linkServer(el.dataset.id)).then(() => this.render());
          break;
        case "play-matrix":
          // Horloge d'intrusion → ouvre le tiroir Matrice (détail par édition :
          // Surveillance/DIEU/CI), sans le dupliquer ici.
          Encounter.openMatrixDrawer();
          break;
        case "play-presence":
          // Présence d'un participant (RA/RV/astral) — état de scène, posé sur
          // le combattant. `data-next` déjà calculé au rendu (défaut de capacité).
          Encounter.setPresence(el.dataset.id, el.dataset.next);
          this.render();
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

    // Poste de commandement (V4-b) : la run COURANTE (contexte, cf. doctrine
    // « le vivant a une perche privilégiée ») est sortie en tête, en grand ;
    // les autres restent l'index. `null` si le MJ n'a aucune run en contexte.
    const heroId = this._currentRunId();
    const hero = heroId ? Dossiers.get(heroId) : null;

    let html = "";
    if (hero && hero.kind === "run") html += this._runCommandHtml(hero);

    for (const camp of campaigns) {
      const runs = Dossiers.children(camp.id).filter((d) => d.kind === "run");
      const others = runs.filter((r) => r.id !== heroId);
      // Une run dont la seule occurrence est le poste de commandement ci-dessus
      // n'est pas « absente » : on renvoie vers le haut plutôt que « Aucune run ».
      const inner = others.length
        ? others.map((r) => this._runRow(r)).join("")
        : runs.length
          ? `<div class="play-empty-note">Run en cours affichée ci-dessus ↑</div>`
          : `<div class="play-empty-note">Aucune run — « Faire une run » depuis un topos la rangera ici.</div>`;
      html += this._sectionHtml(
        `❖ ${CardRenderer._esc(camp.name)}`,
        `${runs.length} run${runs.length > 1 ? "s" : ""}`,
        inner,
      );
    }
    const otherLoose = looseRuns.filter((r) => r.id !== heroId);
    if (otherLoose.length) {
      html += this._sectionHtml(
        "◆ Runs",
        `${otherLoose.length}`,
        otherLoose.map((r) => this._runRow(r)).join(""),
      );
    }
    box.innerHTML = html;
  },

  /** La run « courante » qui mérite le poste de commandement : le contexte
      choisi par le MJ d'abord (`App.context.dossier` s'il pointe une run),
      sinon la run qui porte la scène vivante (`App.context.scene`). `null` si
      aucun contexte de run — l'écran reste alors le simple index. */
  _currentRunId() {
    const ctx = typeof App !== "undefined" && App.context;
    if (!ctx) return null;
    if (ctx.dossier && Dossiers.kindOf(ctx.dossier) === "run") return ctx.dossier;
    if (ctx.scene && Dossiers.has(ctx.scene)) return ctx.scene;
    return null;
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
      d'`App.context.scene` et d'`Encounter` — jamais recopié sur le dossier.
      V4 (cockpit) : la Scène — le seul niveau où le temps tourne — n'est plus
      réduite à un badge. Le run VIVANT projette son état (round/passe + moteur
      + pouls du roster) ; le run RANGÉ affiche un résumé statique du bundle.
      Projection LECTURE SEULE (garde-fou K8) : rien n'est muté ici. */
  _runRow(run) {
    const live = App.context && App.context.scene === run.id;
    const stashed = Encounter.hasStash(run.id);
    const hasTopos = typeof RunGen !== "undefined" && RunGen.forDossier(run.id).length > 0;

    const liveBadge = live
      ? `<span class="play-live" title="Scène en cours"><span class="tb-crumb-live" aria-hidden="true"></span>En cours</span>`
      : "";
    // Reprendre : proposé si une scène tourne (live) ou a été rangée (stashed).
    // 1a : toujours un bouton — la scène se REPREND (vivante), se ROUVRE
    // (rangée) ou se LANCE (aucune scène encore jouée). Les trois délèguent à
    // DossierBar.openRencontre ; Encounter.restore initialise une scène vierge
    // liée au dossier quand aucun stash n'existe (rien créé ici — délégation).
    const resumeLabel = live
      ? "Reprendre la scène"
      : stashed
        ? "Ouvrir la rencontre"
        : "Lancer la scène";
    const resumeBtn = `<button class="btn-secondary btn-small" data-action="play-resume" data-dossier="${run.id}">${resumeLabel}</button>`;
    const toposBtn = hasTopos
      ? `<button class="btn-secondary btn-small" data-action="show-panel" data-panel="run">Voir le topos</button>`
      : "";

    // Corps projeté : le vivant a la priorité (scène active) ; sinon le résumé
    // rangé ; sinon rien (run préparée sans scène encore jouée).
    const body = live ? this._liveSceneHtml() : stashed ? this._stashSummaryHtml(run.id) : "";

    return `<div class="play-run${live ? " is-live" : ""}">
      <div class="play-run-head">
        <button class="play-run-name" data-action="play-focus" data-dossier="${run.id}" title="Ouvrir « ${CardRenderer._esc(run.name)} » dans la bibliothèque">
          <span class="play-run-icon" aria-hidden="true">◆</span>${CardRenderer._esc(run.name)}
        </button>
        ${liveBadge}
        <span class="play-run-actions">${resumeBtn}${toposBtn}</span>
      </div>
      ${body}
    </div>`;
  },

  /** Cockpit — projection de la scène VIVANTE (celle d'`App.context.scene`,
      qui EST `Encounter.state` : le tracker est mono-scène active). Round/passe
      + glyphe de moteur + une barre de vie par combattant, via les accesseurs
      neutres du module (`_rows()[].gauge`, `combatModel`) et `CardRenderer.lifeBar`
      — jamais de branche d'édition, aucune mutation. Vide si la scène n'a pas
      encore de combattant (repli sur la seule ligne de titre). */
  _liveSceneHtml() {
    const st = Encounter.state;
    if (!st || !st.combatants.length) return "";
    const rows = Encounter._rows();
    const passLabel = st.pass > 1 ? ` · P${st.pass}` : "";
    // Préréglage de moteurs de la scène (state.motors, neutre) — le glyphe
    // réutilise le vocabulaire établi (⚔ Combat / ⚡ Matrice), pas d'invention.
    const combat = (st.motors || ["combat"]).includes("combat");
    // Grammaire commune avec l'horloge d'intrusion : GAUCHE = moteur (⚔/⚡),
    // DROITE = pendule (round·passe). Mêmes classes `.play-motor-name/-bits`
    // que `_matrixClockHtml` → les deux lignes se lisent pareil.
    const motorName = combat ? "⚔ Combat" : "⚡ Matrice";
    const strip = rows
      .map((r) => {
        const name = CardRenderer._esc(r.pnj?.name || r.name || "?");
        const bar = CardRenderer.lifeBar(r.gauge, "play-life");
        return `<div class="play-fighter"><span class="play-fighter-name">${name}</span>${bar}${this._presenceToggleHtml(r)}</div>`;
      })
      .join("");
    return `<div class="play-scene">
      <div class="play-motor-line play-scene-meta">
        <span class="play-motor-name">${motorName}</span>
        <span class="play-motor-bits"><span class="play-motor-clock">Round ${st.round}${passLabel}</span></span>
      </div>
      <div class="play-roster">${strip}</div>
    </div>`;
  },

  /** Contrôle de présence (RA/RV/astral) d'un participant, PILOTÉ PAR LA
      CAPACITÉ (décision utilisateur) : pas de projection astrale sans magie,
      un Éveillé ne va pas en RV, un esprit est astral de base ; RA = état off
      implicite. Détection par champs NEUTRES (type/attrs.MAG/spells/powers —
      posés à l'identique par les 4 modules) : aucune branche d'édition.
      `null` = pas de présence (CI native Matrice, drone, véhicule, ligne
      ad-hoc). Retourne `{ mode, def }` : `mode` = bascule spéciale proposée,
      `def` = état par défaut si le MJ n'a rien posé. */
  _presenceFor(r) {
    if (r.kind === "matrix") return null;
    const p = r.pnj;
    if (!p || p._adhoc || p.kind === "drone" || p.kind === "vehicule") return null;
    if (p.type === "spirit") return { mode: "astral", def: "astral" };
    const awakened =
      (p.attrs && p.attrs.MAG > 0) ||
      (p.spells && p.spells.length) ||
      (p.powers && p.powers.length);
    return awakened ? { mode: "astral", def: "ar" } : { mode: "vr", def: "ar" };
  },

  /** Rend la bascule de présence d'une ligne : un seul bouton, le mode
      pertinent (RV ou Astral) ; allumé quand le participant y est. Le clic pose
      `data-next` (calculé ici selon le défaut de capacité — un esprit part
      allumé) → `Encounter.setPresence`. Vide si l'entité n'a pas de présence. */
  _presenceToggleHtml(r) {
    const pt = this._presenceFor(r);
    if (!pt) return "";
    const current = r.presence || pt.def;
    const on = current === pt.mode;
    const label = pt.mode === "astral" ? "Astral" : "RV";
    const next = on ? "ar" : pt.mode;
    const title = on
      ? `${label} — taper pour repasser en RA`
      : `Taper : passe en ${label}`;
    return `<button class="play-presence is-${pt.mode}${on ? " is-on" : ""}" data-action="play-presence" data-id="${r.pnjId}" data-next="${next}" title="${title}" aria-pressed="${on}">${label}</button>`;
  },

  /** Cockpit — résumé STATIQUE d'une rencontre rangée (pas de projection
      vivante : le bundle n'est pas restauré). Lu via l'accesseur propriétaire
      `Encounter.stashSummary` (le format de clé du stash reste privé à
      Encounter — prohibition n°2). */
  _stashSummaryHtml(runId) {
    const s = Encounter.stashSummary(runId);
    if (!s) return "";
    return `<div class="play-scene is-stashed">
      <span class="play-stash-note">Rangée · ${s.count} combattant${s.count > 1 ? "s" : ""} · round ${s.round}</span>
    </div>`;
  },

  /** V4-b — Poste de commandement de la run COURANTE : un seul lieu pour la
      séance. Empile scène vivante (cockpit V4) + topos condensé + casting
      préparé + accès aux notes. Tout est PROJETÉ/DÉLÉGUÉ (RunGen, DossierBar,
      Encounter, Notebooks via Notepad) — Jouer n'est propriétaire d'aucune de
      ces données (garde-fous Kernel/Failsafe). */
  _runCommandHtml(run) {
    const live = App.context && App.context.scene === run.id;
    const stashed = Encounter.hasStash(run.id);
    // 1a : toujours un bouton — la scène se REPREND (vivante), se ROUVRE
    // (rangée) ou se LANCE (aucune scène encore jouée). Les trois délèguent à
    // DossierBar.openRencontre ; Encounter.restore initialise une scène vierge
    // liée au dossier quand aucun stash n'existe (rien créé ici — délégation).
    const resumeLabel = live
      ? "Reprendre la scène"
      : stashed
        ? "Ouvrir la rencontre"
        : "Lancer la scène";
    const resumeBtn = `<button class="btn-secondary btn-small" data-action="play-resume" data-dossier="${run.id}">${resumeLabel}</button>`;
    // Corps de scène : vivante (projection) · rangée (résumé) · aucune (invite).
    const scene = live
      ? this._liveSceneHtml()
      : stashed
        ? this._stashSummaryHtml(run.id)
        : `<div class="play-scene is-idle"><span class="play-stash-note">Aucune scène en cours — préparez, puis lancez le combat.</span></div>`;
    return `<div class="play-command">
      <div class="play-command-head">
        <span class="play-run-icon" aria-hidden="true">◆</span>
        <button class="play-command-name" data-action="play-focus" data-dossier="${run.id}" title="Ouvrir « ${CardRenderer._esc(run.name)} » dans la bibliothèque">${CardRenderer._esc(run.name)}</button>
        <span class="play-command-actions">
          <button class="btn-secondary btn-small" data-action="play-notes" data-dossier="${run.id}" title="Ouvrir le carnet de cette run">✎ Notes</button>
          ${resumeBtn}
        </span>
      </div>
      ${scene}
      ${this._matrixClockHtml()}
      ${this._toposGlanceHtml(run.id)}
      ${this._castHtml(run.id)}
    </div>`;
  },

  /** Horloge d'intrusion (V4-b · b) : projette le moteur Matrice de la scène —
      un serveur en jeu affiche son état de pression (alerte, tour, CI déployées)
      d'un coup d'œil, sans ouvrir le tiroir. Champs NEUTRES uniquement
      (`Encounter.matrixMotorSummary`) ; le détail par édition (Surveillance/DIEU)
      reste au tiroir. Tap = ouvrir le tiroir Matrice. Vide hors intrusion. */
  _matrixClockHtml() {
    const servers = Encounter.matrixMotorSummary();
    if (!servers.length) return "";
    const lines = servers
      .map((s) => {
        // Même grammaire que la ligne Combat : GAUCHE = moteur (⚡ serveur),
        // DROITE = pendule (alerte · tour · CI). Classes `.play-motor-*` partagées.
        const bits = [
          s.alerted
            ? `<span class="play-mx-alert">⚠ Alerte</span>`
            : `<span class="play-motor-clock">Lié</span>`,
        ];
        if (s.turn > 0) bits.push(`<span class="play-motor-clock">Tour ${s.turn}</span>`);
        if (s.activeIC > 0)
          bits.push(`<span class="play-motor-clock">${s.activeIC} CI</span>`);
        return `<button class="play-motor-line play-mx-row" data-action="play-matrix" title="Ouvrir le tiroir Matrice (Surveillance, CI, marks)">
          <span class="play-motor-name">⚡ ${CardRenderer._esc(s.name)}</span>
          <span class="play-motor-bits">${bits.join("")}</span>
        </button>`;
      })
      .join("");
    return `<div class="play-matrix">${lines}</div>`;
  },

  /** Topos condensé (lu de `RunGen.forDossier`, jamais recopié) : l'essentiel
      « pourquoi on est là / ce qui peut mal tourner » sans ouvrir le panneau
      Topos. Le `type` du topos EST l'objectif principal ; `client` le mandant.
      Vide si la run n'a pas de topos rattaché. */
  _toposGlanceHtml(runId) {
    const topoi = typeof RunGen !== "undefined" ? RunGen.forDossier(runId) : [];
    if (!topoi.length) return "";
    const t = topoi[0];
    const rows = [
      ["Objectif", t.type],
      ["Complication", t.complication],
      ["Mandant", t.client],
      ["Lieu", t.lieu],
    ].filter(([, v]) => v);
    if (!rows.length) return "";
    const pay = t.payment
      ? `<div class="play-topos-pay">${CardRenderer._esc(t.payment)}${t.difficulte ? ` · ${CardRenderer._esc(t.difficulte)}` : ""}</div>`
      : "";
    return `<div class="play-topos">
      ${rows.map(([k, v]) => `<div class="play-topos-row"><span class="play-topos-k">${k}</span><span class="play-topos-v">${CardRenderer._esc(v)}</span></div>`).join("")}
      ${pay}
    </div>`;
  },

  /** Casting préparé : les entités rangées DANS cette run (DossierBar.memberIds
      scopé sur la run, pas sur le dossier ouvert). Chaque puce : tap = consulter
      (Palette.reveal) ; les PNJ/PJ portent un ⚔ « envoyer en scène »
      (Encounter.add) — le geste-roi du MJ. Contacts/serveurs = consultation
      seule (un contact n'est pas un combattant ; un serveur rejoint la scène par
      le moteur Matrice, hors de ce geste). Vide si la run n'a rien de rangé. */
  _castHtml(runId) {
    // `mode` : "scene" → PNJ/PJ, ⚔ envoyer au combat · "server" → serveur, ⚡ mettre
    // en jeu (moteur Matrice) · null → contact (consultation seule, pas un
    // combattant). Résolution GÉNÉRIQUE via `col.data.all` : un serveur/contact ne
    // résout pas dans `PnjLookup` (réservé aux combattants), mais chaque membre est
    // par construction dans la collection qui le porte.
    const typed = [
      { col: Shadows, mode: "scene" },
      { col: Characters, mode: "scene" },
      { col: ContactsBook, mode: null },
      { col: Servers, mode: "server" },
    ];
    const inScene = new Set(
      ((Encounter.state && Encounter.state.combatants) || []).map((c) => c.pnjId),
    );
    const inMatrix = new Set(Encounter.activeMatrixServerIds());
    let chips = "";
    for (const { col, mode } of typed) {
      if (!col || !col.data) continue;
      for (const id of DossierBar.memberIds(col, runId)) {
        const e = (col.data.all || []).find((x) => x.id === id);
        if (!e) continue;
        const name = CardRenderer._esc(e.name || "Sans nom");
        let action = "";
        if (mode === "scene") {
          action = inScene.has(id)
            ? `<span class="play-cast-in" title="Déjà en scène">en scène</span>`
            : `<button class="play-cast-add" data-action="play-cast-toscene" data-id="${id}" title="Envoyer « ${name} » en scène" aria-label="Envoyer en scène">⚔</button>`;
        } else if (mode === "server") {
          action = inMatrix.has(id)
            ? `<span class="play-cast-in" title="Serveur en jeu dans la scène">⚡ en jeu</span>`
            : `<button class="play-cast-add" data-action="play-cast-server" data-id="${id}" title="Mettre « ${name} » en jeu (moteur Matrice)" aria-label="Mettre en jeu (Matrice)">⚡</button>`;
        }
        chips += `<span class="play-cast-chip"><button class="play-cast-name" data-action="play-cast-consult" data-id="${id}" title="Consulter « ${name} »">${name}</button>${action}</span>`;
      }
    }
    if (!chips) return "";
    return `<div class="play-cast">
      <div class="play-cast-label">Casting préparé</div>
      <div class="play-cast-chips">${chips}</div>
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
