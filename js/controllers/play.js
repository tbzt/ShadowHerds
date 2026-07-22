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
import { CardPeek } from "../widgets/card/cardpeek.js";
import { Debrief } from "./debrief.js";
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
          // Rouvre la scène de ce run (restaure + focus + tracker) — un seul
          // geste, réutilise la mécanique de la barre de dossiers (R4).
          DossierBar.openRencontre(id);
          break;
        case "play-first-run":
          // VIS-3 — crée le premier run (dossier typé « run ») et le pose EN
          // CONTEXTE : DossierBar.select rend le run destination de rangement
          // (currentGroup) + focus (App.context) + fil d'Ariane. render() fait
          // alors apparaître son poste de commandement. Aucune donnée de jeu
          // n'est fabriquée — juste la maille où ranger la prep.
          this._createFirstRun();
          break;
        case "play-focus":
          DossierBar.select(id);
          App.showPanel("shadows");
          break;
        case "play-relations-graph":
          // VIS-15 B4 — le graphe scopé au run (convenedIds), même lentille que le Hub.
          GraphView.open({
            memberIds: DossierBar.convenedIds(id),
            title: `Liens — ${(Dossiers.get(id) || {}).name || "run"}`,
          });
          break;
        case "play-notes":
          // Notes de CE run : poser le contexte sur le run (App.context.dossier
          // = carnet courant) puis DÉLÉGUER au Notepad — le poste de commandement
          // n'édite jamais les notes lui-même (source unique Notebooks).
          DossierBar.select(id);
          Notepad.open();
          break;
        case "play-add-scene": {
          // VIS-16 étape 2 — ajouter une scène à CE run depuis Jouer, sans
          // quitter le run (pas de select). Création déléguée à Dossiers ; les
          // noms de scène ne sont PLUS uniques (appartenance par id, 1-bis).
          // Re-rend la barre + Jouer pour faire apparaître la scène.
          const runId = id;
          Dialog.prompt({
            title: "Nouvelle scène",
            label: "Nom de la scène",
            placeholder: "ex. La rencontre au marché…",
            confirmLabel: "Créer",
          }).then((name) => {
            if (!name || !name.trim()) return;
            if (Dossiers.add(name.trim(), runId, "scene")) {
              if (typeof DossierBar !== "undefined") DossierBar.render();
              this.render();
            }
          });
          break;
        }
        case "play-debrief":
          // VIS-7 — clore la boucle : « qu'est-ce que ce run a laissé ? ».
          // Délégué à Debrief (paie/karma/réputation → Campaign, retombées →
          // Notebooks). Jouer ne possède aucune de ces données.
          Debrief.open(id);
          break;
        case "play-topos-edit":
          // VIS-8 étape 3 — éditer le topos SANS quitter Jouer. Délégué à
          // ToposEdit (propriétaire du formulaire de topos). `data-id` = topos.
          ToposEdit.open(el.dataset.id);
          break;
        case "play-cast-generate":
          // VIS-8 étape 3 — générer le casting d'opposition. Délégué à RunGen
          // (génère + range dans Shadows) ; re-rendu pour faire apparaître les
          // puces et retirer le bouton (offre non répétée — pas de doublon).
          RunGen.castForRun(el.dataset.id);
          this.render();
          break;
        case "play-map":
          // VIS-8 étape 3 — plan tactique procédural (gratuit). Délégué à
          // RunGen.showMap (MapGen → lightbox Portrait). Aucune donnée ici.
          RunGen.showMap(el.dataset.id);
          break;
        case "play-scene-map":
          // VIS-16 étape 2b — plan de lieu PROCÉDURAL de la scène (lu/écrit sur
          // le nœud scène, verrou B). Délégué à RunGen.showSceneMap.
          RunGen.showSceneMap(el.dataset.id);
          break;
        case "play-plan":
          // VIS-8 étape 3 — ambiance IA (opt-in). Délégué à RunGen.generatePlan ;
          // le bouton `el` sert de cible de spinner (géré par Pollinations).
          RunGen.generatePlan(el.dataset.id, el);
          break;
        case "play-cast-consult": {
          // VIS-14 — coup d'œil intra-Jouer : PNJ/PJ/contact s'ouvrent en
          // OVERLAY (CardPeek, que CardRenderer sait rendre) SANS quitter Jouer,
          // et prev/next feuillette le casting consultable. Le serveur, hors
          // CardRenderer, garde la révélation Hub classique (Palette.reveal) —
          // on ne touche que le chemin des fiches. Les frères = les fiches
          // consultables rendues, dans leur ordre d'affichage (serveurs exclus).
          const cid = el.dataset.id;
          const loc = PnjLookup.locate(cid);
          if (loc && loc.type !== "server") {
            const siblings = [
              ...document
                .getElementById("play-content")
                .querySelectorAll('[data-action="play-cast-consult"]'),
            ]
              .map((b) => b.dataset.id)
              .filter((sid) => {
                const l = PnjLookup.locate(sid);
                return l && l.type !== "server";
              });
            CardPeek.open(cid, { siblings });
          } else {
            Palette.reveal(cid);
          }
          break;
        }
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
    const roots = Dossiers.roots();
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

    // Poste de commandement (V4-b) : le run COURANT (contexte, cf. doctrine
    // « le vivant a une perche privilégiée ») est sorti en tête, en grand ;
    // les autres restent l'index. `null` si le MJ n'a aucun run en contexte.
    const heroId = this._currentRunId();
    const hero = heroId ? Dossiers.get(heroId) : null;

    let html = "";
    if (hero && hero.kind === "run") html += this._runCommandHtml(hero);

    for (const camp of campaigns) {
      const runs = Dossiers.children(camp.id).filter((d) => d.kind === "run");
      const others = runs.filter((r) => r.id !== heroId);
      html += this._bridgeHtml(camp, runs, others);
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

  /** Le run « courant » qui mérite le poste de commandement : le contexte
      choisi par le MJ d'abord (`App.context.dossier` s'il pointe un run),
      sinon le run qui porte la scène vivante (`App.context.scene`). `null` si
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

  /** B1 — Le Pont : la campagne rendue en POSTE D'AIGUILLAGE de runs (peau
      froide, niveau timeline « campagne » de la maquette « Cockpit vivant »).
      C'est le pendant froid du Cockpit chaud : mêmes rangées `_runRow`, mais la
      campagne devient un tableau d'aiguillage où le run vivant est SURÉLEVÉ +
      pulsant (classe `is-live`/`is-stashed` portée par `_runRow`). Aucune donnée,
      aucune branche d'édition : projection de `Dossiers.children` + état vivant.
      `others` = les runs hors poste de commandement (celui-ci reste en tête). */
  _bridgeHtml(camp, runs, others) {
    const inner = others.length
      ? others.map((r) => this._runRow(r)).join("")
      : runs.length
        ? `<div class="play-empty-note">Run en cours affiché ci-dessus ↑</div>`
        : `<div class="play-empty-note">Aucun run — « Faire un run » depuis un topos le rangera ici.</div>`;
    const count = `${runs.length} run${runs.length > 1 ? "s" : ""}`;
    return `<div class="play-bridge">
      <div class="play-bridge-head">
        <span class="play-bridge-icon" aria-hidden="true">❖</span>
        <span class="play-bridge-title">${CardRenderer._esc(camp.name)}</span>
        <span class="play-bridge-count">${count}</span>
        <span class="play-bridge-hint">aiguillage</span>
      </div>
      <div class="play-bridge-runs">${inner}</div>
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
    // rangé ; sinon rien (run préparé sans scène encore jouée).
    const body = live ? this._liveSceneHtml() : stashed ? this._stashSummaryHtml(run.id) : "";

    return `<div class="play-run${live ? " is-live" : stashed ? " is-stashed" : ""}">
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

  /** V4-b — Poste de commandement du run COURANT : un seul lieu pour la
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
    // Briefing (§4.2) — décision utilisateur : le CTA de lancement CHAUFFE en
    // accent même dans une coquille FROIDE (il fait basculer vers le chaud). En
    // live, le shell est déjà chaud → le « Reprendre » reste secondaire (pas de
    // redondance criée). Un seul CTA primaire par poste de commandement.
    const launchClass = live ? "btn-secondary" : "btn-primary";
    const resumeBtn = `<button class="${launchClass} btn-small" data-action="play-resume" data-dossier="${run.id}">${resumeLabel}</button>`;
    // Corps de scène : vivante (projection) · rangée (résumé) · aucune (invite).
    const scene = live
      ? this._liveSceneHtml()
      : stashed
        ? this._stashSummaryHtml(run.id)
        : `<div class="play-scene is-idle"><span class="play-stash-note">Aucune scène en cours — préparez, puis lancez le combat.</span></div>`;

    // VIS-8 étape 2 — les trois MOMENTS DE JEU. Les zones existaient déjà ; on
    // les NOMME et on les ordonne, sans rien inventer (topos+casting = Avant ;
    // scène+intrusion = Pendant ; débrief = Après). Le vivant garde sa perche
    // privilégiée (doctrine Campagne›Run›Scène) : quand une scène tourne,
    // « Pendant » passe en tête ; à l'arrêt, « Avant » (la prépa) ouvre la lecture.
    const avant = this._toposGlanceHtml(run.id) + this._castHtml(run.id) + this._scenesHtml(run.id);
    const avantZone = avant ? this._momentHtml("Avant", "la prépa", avant) : "";
    const pendantZone = this._momentHtml("Pendant", "la scène", scene + this._matrixClockHtml());
    const apresZone = this._momentHtml("Après", "la clôture", this._clotureHtml(run.id));
    const moments = live
      ? pendantZone + avantZone + apresZone
      : avantZone + pendantZone + apresZone;

    // B1 — la peau Cockpit : une coquille dont la COULEUR D'ÉTAT informe avant la
    // lecture (froid au repos · accent d'édition en combat · vert en Matrice). La
    // classe d'état pilote un seul token `--state` en CSS (aucune couleur en dur,
    // aucune branche d'édition) ; la barre d'état la met en mots.
    const state = this._cockpitState(run);

    return `<div class="play-command is-${state}">
      ${this._cockpitStatusHtml(run, state)}
      <div class="play-command-head">
        <span class="play-run-icon" aria-hidden="true">◆</span>
        <button class="play-command-name" data-action="play-focus" data-dossier="${run.id}" title="Ouvrir « ${CardRenderer._esc(run.name)} » dans la bibliothèque">${CardRenderer._esc(run.name)}</button>
        <span class="play-command-actions">
          <button class="btn-secondary btn-small" data-action="play-notes" data-dossier="${run.id}" title="Ouvrir le carnet de ce run">✎ Notes</button>
          ${resumeBtn}
        </span>
      </div>
      ${moments}
    </div>`;
  },

  /** B1 — l'ÉTAT de la coquille Cockpit, dérivé de champs NEUTRES (aucune
      branche d'édition) : `cold` au repos · `combat` quand une scène de ce run
      tourne avec un moteur de combat · `matrix` quand la scène est pilotée par
      la Matrice (preset sans combat, ou serveur en jeu). Précédence combat >
      Matrice : quand le roster ET une intrusion tournent, la coquille reste
      chaude (le combat prend l'écran, maquette « Cockpit — Combat »). */
  _cockpitState(run) {
    const live = App.context && App.context.scene === run.id;
    if (!live) return "cold";
    const motors = (Encounter.state && Encounter.state.motors) || ["combat"];
    if (motors.includes("combat")) return "combat";
    if (motors.includes("matrix") || Encounter.matrixMotorSummary().length) return "matrix";
    return "combat";
  },

  /** B1 — la barre d'état de la coquille : une pastille (pulse en live, piloté
      CSS) + un libellé qui dit le moment d'un coup d'œil. Lecture seule, projetée
      d'`Encounter`/`App.context` — Jouer ne possède rien. */
  _cockpitStatusHtml(run, state) {
    const st = Encounter.state;
    let dot, label;
    if (state === "combat") {
      const pass = st && st.pass > 1 ? ` · P${st.pass}` : "";
      dot = "●";
      label = `En combat — Round ${st ? st.round : 1}${pass}`;
    } else if (state === "matrix") {
      const n = Encounter.matrixMotorSummary().length;
      dot = "◐";
      label = n ? `Matrice active — ${n} serveur${n > 1 ? "s" : ""} en jeu` : "Matrice active";
    } else {
      dot = "○";
      label = Encounter.hasStash(run.id)
        ? "Rencontre rangée — prête à rouvrir"
        : "En préparation";
    }
    return `<div class="play-cockpit-status">
      <span class="play-cockpit-dot" aria-hidden="true">${dot}</span>
      <span class="play-cockpit-label">${label}</span>
    </div>`;
  },

  /** VIS-8 étape 2 — enveloppe une zone du poste de commandement d'un
      « sourcil » discret qui NOMME le moment de jeu (Avant / Pendant / Après).
      `when` = le moment, `hint` = ce qu'on y fait. Pur habillage : aucune
      donnée, aucune logique — le contenu reste projeté/délégué par l'appelant. */
  _momentHtml(when, hint, inner) {
    return `<div class="play-moment">
      <div class="play-moment-label"><span class="play-moment-when">${when}</span><span class="play-moment-hint">${hint}</span></div>
      ${inner}
    </div>`;
  },

  /** Clôture (§4.2) — le débrief comme un BILAN qui fait plaisir (couleur d'état
      OR). Peau pure : le détail (paie/karma/réputation/retombées → `Campaign` +
      `Notebooks`) reste la propriété de `Debrief` (VIS-7) ; ici on invite au
      bilan, on NOMME ses axes en pastilles et on rappelle qu'il se verse au
      carnet. Aucune donnée, aucune branche d'édition — labels statiques + un CTA
      délégué. Toujours présent (comme l'ancien bouton) : clore est le geste de
      fin de run, même sur un run peu joué (Debrief gère l'équipe vide). */
  _clotureHtml(runId) {
    const facets = ["Paie", "Karma", "Réputation", "Retombées"]
      .map((f) => `<span class="play-cloture-facet">${f}</span>`)
      .join("");
    return `<div class="play-cloture">
      <div class="play-cloture-head">Ce que ce run a laissé</div>
      <div class="play-cloture-facets">${facets}</div>
      <div class="play-cloture-cta">
        <button class="btn-secondary btn-small play-cloture-btn" data-action="play-debrief" data-dossier="${runId}" title="Débrief : ce que ce run a laissé (paie, karma, réputation, retombées)">✓ Faire le débrief</button>
        <span class="play-cloture-note">Versé au carnet et au registre.</span>
      </div>
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
      Vide si le run n'a pas de topos rattaché. */
  _toposGlanceHtml(runId) {
    const topoi = typeof RunGen !== "undefined" ? RunGen.forDossier(runId) : [];
    if (!topoi.length) return "";
    const t = topoi[0];
    const esc = CardRenderer._esc;
    // Briefing (§4.2) — le topos rendu comme un VRAI briefing, pas une table
    // plate : l'Objectif (`t.type`) mène en titre, le Mandant · Lieu donnent le
    // contexte, la Complication (« ce qui peut mal tourner ») est mise en garde,
    // la paie ferme. Froid, tabulaire. 0 donnée neuve — même topos projeté.
    const obj = t.type ? `<div class="play-brief-obj">${esc(t.type)}</div>` : "";
    const metaBits = [t.client, t.lieu].filter(Boolean).map((v) => esc(v));
    const meta = metaBits.length
      ? `<div class="play-brief-meta">${metaBits.join(" · ")}</div>`
      : "";
    // Rien de briefing à montrer (topos sans objectif/mandant/lieu/complication) :
    // repli sur l'ancien silence (mais on garde les verbes de prépa si le topos
    // existe — éditer reste utile). On n'affiche le cadre que s'il porte du sens.
    const compl = t.complication
      ? `<div class="play-brief-compl"><span class="play-brief-compl-k">Complication</span> ${esc(t.complication)}</div>`
      : "";
    if (!obj && !meta && !compl) return "";
    const pay = t.payment
      ? `<div class="play-topos-pay">${esc(t.payment)}${t.difficulte ? ` · ${esc(t.difficulte)}` : ""}</div>`
      : "";
    return `<div class="play-topos play-briefing">
      <div class="play-brief-head">
        <span class="play-brief-label">◈ Briefing</span>
        ${obj}
        ${meta}
      </div>
      ${compl}
      ${pay}
      ${this._prepActionsHtml(t, runId)}
    </div>`;
  },

  /** VIS-8 étape 3 — verbes de PRÉPA du run, inline dans Avant, PAR DÉLÉGATION :
      Jouer ne gagne aucune logique, il appelle les modules propriétaires du
      panneau `run` (édition, casting, plan) pour éviter d'avoir à le quitter.
      Éditer (→ ToposEdit) · Générer le casting (→ RunGen, seulement si le topos
      porte un profil de sécurité ET qu'aucun casting n'est encore rangé — le
      castForRun ne déduplique pas) · Plan tactique / Ambiance : miroir exact du
      gating de `RunRenderer._planButtons` (site `planUtile` ; Ambiance opt-in IA
      via Settings ; vue directe si `planUrl` déjà généré, sinon génération). */
  _prepActionsHtml(t, runId) {
    const btns = [
      `<button class="btn-secondary btn-small" data-action="play-topos-edit" data-id="${t.id}" title="Éditer le topos (objectif, complication, mandant, lieu, paie)">✎ Éditer</button>`,
    ];
    if (t.securityProfile && !this._runHasCast(runId))
      btns.push(
        `<button class="btn-secondary btn-small" data-action="play-cast-generate" data-id="${t.id}" title="Générer les PNJ d'opposition cohérents avec le topos">⚔ Générer le casting</button>`,
      );
    if (t.planUtile) {
      btns.push(
        `<button class="btn-secondary btn-small" data-action="play-map" data-id="${t.id}" title="Plan tactique du lieu (généré, gratuit)">🗺 Plan tactique</button>`,
      );
      const iaOn = typeof Settings !== "undefined" && Settings.getPortraitSettings().enabled;
      if (iaOn)
        btns.push(
          t.planUrl
            ? `<button class="btn-secondary btn-small" data-portrait-preview="${CardRenderer._esc(t.planUrl)}" data-portrait-caption="${CardRenderer._esc(`Ambiance — ${t.lieu || "lieu inconnu"}`)}" title="Voir l'ambiance générée">✨ Ambiance</button>`
            : `<button class="btn-secondary btn-small" data-action="play-plan" data-id="${t.id}" title="Générer une ambiance du lieu (IA)">✨ Ambiance</button>`,
        );
    }
    return `<div class="play-prep-actions">${btns.join("")}</div>`;
  },

  /** Le run a-t-il déjà un casting rangé ? (mêmes collections typées que
      `_castHtml`). Sert à n'offrir « Générer le casting » que sur un run vierge
      de PNJ — `RunGen.castForRun` régénère sinon en doublon. */
  _runHasCast(runId) {
    for (const col of [Shadows, Characters, ContactsBook, Servers])
      if (col && col.data && DossierBar.memberIds(col, runId).length) return true;
    return false;
  },

  /** Casting préparé : les entités rangées DANS ce run (DossierBar.memberIds
      scopé sur le run, pas sur le dossier ouvert). Chaque puce : tap = consulter
      (Palette.reveal) ; les PNJ/PJ portent un ⚔ « envoyer en scène »
      (Encounter.add) — le geste-roi du MJ. Contacts/serveurs = consultation
      seule (un contact n'est pas un combattant ; un serveur rejoint la scène par
      le moteur Matrice, hors de ce geste). Vide si le run n'a rien de rangé. */
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
    // VIS-15 B4 — « ◈ Liens » : le graphe des relations scopé à ce run (son
    // casting + les voisins en halo). Même lentille que le Hub, portée du run.
    return `<div class="play-cast">
      <div class="play-cast-label">Casting préparé
        <button class="btn-secondary btn-small" data-action="play-relations-graph" data-dossier="${runId}" title="Voir les liens du casting en graphe">◈ Liens</button>
      </div>
      <div class="play-cast-chips">${chips}</div>
    </div>`;
  },

  /** VIS-16 étape 2 — les SCÈNES d'un run, dans « Avant ». La scène est la
      cellule de jeu : son casting = les entités rangées DEDANS (`_castHtml`
      scopé sur l'id de scène — l'appartenance est par id depuis 1-bis) et son
      carnet (✎ = `play-notes` sur l'id de scène, `Notebooks` étant par dossier).
      « ▷ Nouvelle scène » délègue la création. Aucune donnée ici : tout est
      projeté/délégué (une vérité, des lentilles). */
  _scenesHtml(runId) {
    const scenes = typeof Dossiers !== "undefined" ? Dossiers.scenesOf(runId) : [];
    const rows = scenes
      .map((s) => {
        const name = CardRenderer._esc(s.name);
        const cast = this._castHtml(s.id);
        // VIS-16 étape 3 — la scène est JOUABLE : son moteur (Encounter) tourne
        // au niveau de la scène, keyé par son id. Réutilise `play-resume` →
        // DossierBar.openRencontre (le stash est déjà générique par id de
        // dossier) : aucune migration, l'encounter run-level (rétro-compat)
        // et scène-level coexistent.
        const live = App.context && App.context.scene === s.id;
        const stashed = typeof Encounter !== "undefined" && Encounter.hasStash(s.id);
        const playLabel = live ? "Reprendre" : stashed ? "Rouvrir" : "▶ Jouer";
        const playTitle = live
          ? `Reprendre la scène « ${name} »`
          : stashed
            ? `Rouvrir la rencontre de « ${name} »`
            : `Lancer la scène « ${name} »`;
        return `<div class="play-scene-row${live ? " is-live" : ""}">
          <div class="play-scene-head">
            <span class="play-scene-icon" aria-hidden="true">▷</span>
            <span class="play-scene-name">${name}</span>
            <button class="btn-icon-tiny" data-action="play-scene-map" data-id="${s.id}" title="Plan de lieu de « ${name} »">▦</button>
            <button class="btn-icon-tiny" data-action="play-notes" data-dossier="${s.id}" title="Carnet de « ${name} »">✎</button>
            <button class="btn-secondary btn-small" data-action="play-resume" data-dossier="${s.id}" title="${playTitle}">${playLabel}</button>
          </div>
          ${cast || `<div class="play-scene-castempty">Personne de rangé — glissez une fiche ou utilisez 🏷 sur une carte.</div>`}
        </div>`;
      })
      .join("");
    return `<div class="play-scenes">
      <div class="play-scenes-label">Scènes</div>
      ${rows}
      <button class="btn-secondary btn-small" data-action="play-add-scene" data-dossier="${runId}" title="Ajouter une scène à ce run">▷ Nouvelle scène</button>
    </div>`;
  },

  /** VIS-3 — état vide GUIDÉ : au lieu de constater le vide, il enseigne la
      spine une fois. Le run est la maille où tout se range ; le créer d'un
      geste (nommer) le pose EN CONTEXTE (DossierBar.select → destination de
      classement + fil d'Ariane), et le poste de commandement du run vide prend
      alors le relais (invite « Lancer la scène »). Les deux anciens chemins
      (topos / bibliothèque) restent offerts, en second. */
  /** VIS-3 — crée le run guidé depuis l'état vide : demande le nom, crée le
      dossier typé « run », le focalise (destination + contexte), re-rend le
      poste de commandement. Ne fabrique aucune fiche ni scène — la maille
      seulement. */
  async _createFirstRun() {
    const input = await Dialog.prompt({
      title: "Créer un run",
      label: "Nom du run",
      value: "",
      confirmLabel: "Créer le run",
    });
    if (input === null || !input.trim()) return;
    const name = input.trim();
    const dossier = Dossiers.add(name, null, "run");
    if (!dossier) return;
    DossierBar.select(dossier.id);
    this.render();
    toast(`Run « ${name} » créé — ce que vous rangez ou générez ira dedans.`);
  },

  _emptyHtml() {
    return `<div class="play-onboard">
      <p class="play-onboard-lead">Votre première séance commence par un run.</p>
      <p>Créons-le — <strong>nommez-le</strong>, et tout ce que vous préparez (PNJ, contacts, notes) s'y rangera. C'est la maille <strong>Campagne › Run › Scène</strong> autour de laquelle tourne la table.</p>
      <div class="play-onboard-cta">
        <button class="btn-primary btn-small" data-action="play-first-run">＋ Créer mon premier run</button>
      </div>
      <p class="play-onboard-alt">Vous préférez partir d'une amorce ? <button class="linklike" data-action="show-panel" data-panel="run">Générer un topos</button> · <button class="linklike" data-action="show-panel" data-panel="shadows">Ouvrir la bibliothèque</button></p>
    </div>`;
  },
};

// Pont couche 5 (migration modules ES) — retiré en fin de migration.
window.Play = Play;
