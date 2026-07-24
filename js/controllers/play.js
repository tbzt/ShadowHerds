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
    // S2a — live bidirectionnel : le cockpit reflète toute mutation de trame.
    if (typeof ScenarioStore !== "undefined") ScenarioStore.subscribe(() => this._onScenarioChange());
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
        case "play-enter":
          // Le Pont (maquette « Cockpit vivant ») — taper un run dans l'index
          // l'ENTRE ici : il devient le run courant (App.context via
          // DossierBar.select, SANS changer de panneau), donc `render()` le sort
          // en tête en poste de commandement (son Briefing). « On tape, on est au
          // briefing » — plus d'éjection vers Ombres portées.
          DossierBar.select(id);
          this.render();
          document
            .querySelector("#play-content .play-command")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
          break;
        case "play-focus":
          DossierBar.select(id);
          App.showPanel("shadows");
          break;
        case "play-cockpit-tab":
          // Onglets du cockpit (jalons) — bascule la partie affichée EN PLEIN.
          // État d'UI transitoire, scopé au run (pas de donnée de jeu, pas de
          // Storage) : re-rendu + scroll doux vers le poste.
          this._cockpitTab = { run: id, tab: el.dataset.tab };
          this.render();
          document
            .querySelector("#play-content .play-command")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
          break;
        case "play-relations-graph":
          // VIS-15 B4 — le graphe scopé au run (convenedIds), même lentille que le Hub.
          GraphView.open({
            memberIds: DossierBar.convenedIds(id),
            title: `Liens — ${(Dossiers.get(id) || {}).name || "run"}`,
          });
          break;
        case "play-trame-goto":
          // S2a — bifurquer/avancer : poser l'étape courante de la trame. Le
          // re-render vient de l'abonnement (patchRuntime émet). Pas de branche.
          if (typeof ScenarioStore !== "undefined" && el.dataset.scenario && el.dataset.node)
            ScenarioStore.patchRuntime(el.dataset.scenario, { currentSceneId: el.dataset.node });
          break;
        case "play-trame-clock":
          // S5a — monter/baisser une horloge en live. PATCH-IN-PLACE (feel JOUÉ,
          // pas écrit) : on peint la case dans le nœud DOM existant → la transition
          // de token joue et l'état ouvert des tiroirs survit. On ne re-rend tout
          // QUE si un effet de seuil a changé l'étape/les sorties.
          if (typeof ScenarioStore !== "undefined" && el.dataset.scenario && el.dataset.clock)
            this._patchClock(el, el.dataset.scenario, el.dataset.clock, parseInt(el.dataset.delta, 10) || 0);
          break;
        case "play-trame-portent":
          // S5b — avancer/reculer les présages. Patch-in-place (aucun effet de
          // seuil possible ici → jamais de re-render complet).
          if (typeof ScenarioStore !== "undefined" && el.dataset.scenario && el.dataset.danger)
            this._patchPortent(el, el.dataset.scenario, el.dataset.danger, parseInt(el.dataset.delta, 10) || 0);
          break;
        case "play-front-coach-ok":
          // Lot C — « Compris » : le MJ a vu l'explication du Front une fois.
          if (typeof Storage !== "undefined") Storage.setGlobal(this._FRONT_COACH_KEY, true);
          this.render();
          break;
        case "play-trame-link": {
          // Lier une trame existante au run ; aucune → ouvrir l'atelier pour créer.
          if (typeof ScenarioStore === "undefined") break;
          const trames = ScenarioStore.all();
          if (!trames.length) {
            if (typeof ScenarioGraph !== "undefined") ScenarioGraph.open();
            break;
          }
          Dialog.choose({
            title: "Lier une trame à ce run",
            message: "Choisissez la trame qui structure ce run.",
            options: trames.map((t) => ({ value: t.id, label: t.title })),
          }).then((scId) => {
            if (scId) ScenarioStore.setRunId(scId, id);
          });
          break;
        }
        case "play-trame-unlink":
          if (typeof ScenarioStore !== "undefined" && el.dataset.scenario)
            ScenarioStore.setRunId(el.dataset.scenario, null);
          break;
        case "play-trame-open":
          if (typeof ScenarioGraph !== "undefined") ScenarioGraph.open(el.dataset.scenario);
          break;
        case "play-trame-cast":
          // S2b — caster l'étape courante (picker mince → castIds ; le re-render
          // vient de l'abonnement quand une case est cochée).
          if (typeof ScenarioCastPicker !== "undefined" && el.dataset.scenario && el.dataset.node)
            ScenarioCastPicker.open(el.dataset.scenario, el.dataset.node, el);
          break;
        case "play-trame-toscene": {
          // S2b — envoyer le cast planifié de l'étape dans la scène JOUÉE (Encounter).
          if (typeof ScenarioStore === "undefined") break;
          const stc = ScenarioStore.get(el.dataset.scenario);
          const cnode = stc && stc.sceneNodes.find((n) => n.id === el.dataset.node);
          if (cnode && Array.isArray(cnode.castIds) && cnode.castIds.length) {
            for (const cid of cnode.castIds) Encounter.add(cid);
            this.render();
          }
          break;
        }
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
        case "play-trame-generate":
          // Générer une trame jouable depuis le topos (scènes, horloges, front,
          // faction + casting), liée au run. Délégué à RunGen ; re-rendu pour
          // faire apparaître la trame et retirer le bouton (pas de doublon —
          // `generateTrameForRun` propose d'ouvrir si une trame existe déjà).
          RunGen.generateTrameForRun(el.dataset.id);
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
        case "play-cast-convoke":
          // Fil B / Option C — convoquer une entité ou une faction sur ce run
          // depuis le Briefing, sans quitter Jouer. Délégué à ConvokePicker
          // (Dossiers.convoke/unconvoke) ; le picker re-rend Jouer après toggle.
          if (typeof ConvokePicker !== "undefined") ConvokePicker.open(id, el);
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
        <button class="play-run-name" data-action="play-enter" data-dossier="${run.id}" title="Ouvrir « ${CardRenderer._esc(run.name)} » ici — poste de commandement">
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
    const avant =
      this._toposGlanceHtml(run.id) +
      this._castHtml(run.id, { convokeCta: true }) +
      this._scenesHtml(run.id);
    // ONGLETS — les jalons Préparation · En jeu · Clôture deviennent la
    // NAVIGATION entre les 4 parties (Briefing / Combat|Matrice / Clôture),
    // chacune affichée EN PLEIN. L'état LIVE est l'onglet par défaut ; le MJ peut
    // prévisualiser les autres. `_cockpitTab` = état d'UI transitoire, scopé au
    // run (pas de la donnée de jeu, pas de Storage). Le header + sa couleur
    // d'état suivent l'onglet (prépa froid · combat accent · matrice vert ·
    // clôture or) — toujours 0 branche d'édition (tout via `--state`).
    const liveState = this._cockpitState(run); // cold|combat|matrix (réel)
    const enjeuMotor = liveState === "matrix" ? "matrix" : "combat";
    const defaultTab = liveState === "cold" ? "prep" : "enjeu";
    const saved = this._cockpitTab && this._cockpitTab.run === run.id ? this._cockpitTab.tab : null;
    const tab = ["prep", "enjeu", "close"].includes(saved) ? saved : defaultTab;
    const headState = tab === "prep" ? "prep" : tab === "close" ? "close" : enjeuMotor;

    const trame = typeof ScenarioStore !== "undefined" ? ScenarioStore.byRun(run.id) : null;
    let body;
    if (tab === "prep") {
      // Briefing : la trame (froide, structure honnête) mène, puis topos + casting + scènes.
      body =
        this._trameHtml(run) +
        (avant || `<div class="play-scene is-idle"><span class="play-stash-note">Rien de préparé — générez un topos, convoquez un casting.</span></div>`);
    } else if (tab === "close") {
      // Clôture : le bilan en plein.
      body = this._clotureHtml(run.id);
    } else {
      // En jeu : le roster (la star) d'abord + la barre de trame + Horloges/Fronts.
      const drawers = [];
      if (trame && (trame.clocks || []).length)
        drawers.push(this._drawerHtml("Horloges", this._pressionSummary(trame), this._pressionHtml(trame, { bare: true }), true));
      if (trame && (trame.fronts || []).length) {
        // Lot C — coachmark « C'est quoi un Front ? » PROACTIF une fois.
        const teach = !this._frontCoachSeen();
        const frontsBody = (teach ? this._frontCoachHtml() : "") + this._frontsHtml(trame, { bare: true });
        drawers.push(this._drawerHtml("Fronts", this._frontsSummary(trame), frontsBody, teach));
      }
      body =
        (trame ? this._trameBarHtml(run, trame) : "") +
        `<div class="play-hot-scene">${scene}${this._matrixClockHtml()}</div>` +
        (drawers.length ? `<div class="play-drawers">${drawers.join("")}</div>` : "");
    }

    return `<div class="play-command is-${headState}">
      ${this._cockpitHeadHtml(run, headState, resumeBtn)}
      ${this._cockpitJalonsHtml(run, tab)}
      ${body}
    </div>`;
  },

  /* ============================================================
     S2a — la bande « TRAME » : suivre et BIFURQUER en direct depuis Jouer.
     Même vérité que l'atelier (ScenarioStore) ; ici, lentille « partie en
     cours ». « Étape » = nœud de trame (planifié) ≠ « scène en cours »
     (Encounter, jouée). Aucune vérité détenue ; bifurquer = `patchRuntime`.
     ============================================================ */
  _TRAME_GLYPH: {
    accroche: "◎", "repérage": "⌕", action: "⚔", sociale: "❝", "décision": "⑂", "retombée": "⚑",
  },
  /* Peau calibrée — couleur par TYPE de scène (flair « trame McCarthy »),
     universelle (0 branche d'édition) : des tokens `--t-*` définis sur
     `.play-command` (accroche = accent d'édition ; les autres = tokens
     sémantiques + un cyan pour le repérage). */
  _TYPE_TINT: {
    accroche: "--t-accroche", "repérage": "--t-reperage", action: "--t-action",
    sociale: "--t-sociale", "décision": "--t-decision", "retombée": "--t-retombee",
  },
  _trameHtml(run) {
    if (typeof ScenarioStore === "undefined") return "";
    const esc = CardRenderer._esc;
    const trame = ScenarioStore.byRun(run.id);
    if (!trame) {
      const has = ScenarioStore.all().length;
      return `<div class="play-trame is-empty">
        <div class="play-trame-head"><span class="play-trame-word">Trame</span></div>
        <div class="play-trame-body">
          <span class="play-trame-note">Aucune trame liée à ce run.</span>
          <button class="btn-secondary btn-small" data-action="play-trame-link" data-dossier="${run.id}">${has ? "Lier une trame" : "Ouvrir l'atelier"}</button>
        </div>
      </div>`;
    }
    const sc = trame;
    const head = `<div class="play-trame-head">
      <span class="play-trame-word">Trame</span>
      <span class="play-trame-title">${esc(sc.title)}</span>
      <span class="play-trame-actions">
        <button class="btn-secondary btn-small" data-action="play-trame-open" data-scenario="${sc.id}" title="Ouvrir l'atelier de trame">Atelier</button>
        <button class="btn-secondary btn-small" data-action="play-trame-unlink" data-scenario="${sc.id}" title="Délier cette trame du run">Délier</button>
      </span>
    </div>`;
    const curId = sc.runtime && sc.runtime.currentSceneId;
    const cur = curId && sc.sceneNodes.find((n) => n.id === curId);
    if (!cur) {
      const start = sc.sceneNodes.find((n) => n.type === "accroche") || sc.sceneNodes[0];
      const body = start
        ? `<button class="btn-primary btn-small" data-action="play-trame-goto" data-scenario="${sc.id}" data-node="${start.id}">▶ Commencer : ${esc(start.title || "(sans titre)")}</button>`
        : `<span class="play-trame-note">Trame sans étape — ouvrez l'atelier pour en poser.</span>`;
      return `<div class="play-trame">${head}<div class="play-trame-body">${body}</div></div>`;
    }
    const g = this._TRAME_GLYPH[cur.type] || "●";
    // S5a — une sortie FERMÉE par une horloge disparaît des choix (runtime).
    const closedEdges = new Set((sc.runtime && sc.runtime.closedEdgeIds) || []);
    const exits = sc.sceneEdges.filter((e) => e.from === cur.id && !closedEdges.has(e.id));
    const exitBtns = exits.length
      ? exits
          .map((e) => {
            const to = sc.sceneNodes.find((n) => n.id === e.to);
            const lbl = to ? to.title || "(sans titre)" : "?";
            const hint = e.isEscapeHatch ? " ⚑" : e.gateway === "parallel" ? " ∥" : e.gateway === "exclusive" ? " ⋔" : "";
            const cls = e.isEscapeHatch ? "play-trame-exit is-hatch" : "play-trame-exit";
            return `<button class="${cls}" data-action="play-trame-goto" data-scenario="${sc.id}" data-node="${e.to}" title="${e.label ? esc(e.label) : "Aller à cette étape"}">→ ${esc(lbl)}${hint}</button>`;
          })
          .join("")
      : `<span class="play-trame-note">Fin de la trame (aucune suite).</span>`;
    const castChips = (cur.castIds || [])
      .map((cid) => {
        const loc = typeof PnjLookup !== "undefined" ? PnjLookup.locate(cid) : null;
        return loc ? `<span class="play-trame-cast-chip">${esc(loc.name)}</span>` : "";
      })
      .join("");
    const hasCast = (cur.castIds || []).length > 0;
    const castRow = `<div class="play-trame-cast">
      ${castChips}
      <button class="play-trame-cast-add" data-action="play-trame-cast" data-scenario="${sc.id}" data-node="${cur.id}" title="Caster cette étape">＋ Cast</button>
      ${hasCast ? `<button class="play-trame-toscene" data-action="play-trame-toscene" data-scenario="${sc.id}" data-node="${cur.id}" title="Ajouter ce cast à la scène en cours (combat)">Envoyer en scène</button>` : ""}
    </div>`;
    return `<div class="play-trame">${head}
      <div class="play-trame-current" data-t="${cur.type}">
        <span class="play-trame-cur-glyph" aria-hidden="true">${g}</span>
        <span class="play-trame-cur-title">${esc(cur.title || "(sans titre)")}</span>
      </div>
      ${cur.body ? `<p class="play-trame-cur-body">${esc(cur.body)}</p>` : ""}
      ${cur.bang ? `<p class="play-trame-bang" data-arrow="${cur.arrow || ""}"><span class="play-trame-bang-arrow" aria-hidden="true">${cur.arrow === "hope" ? "↑" : cur.arrow === "fear" ? "↓" : "◆"}</span> ${esc(cur.bang)}</p>` : ""}
      ${castRow}
      <div class="play-trame-exits">${exitBtns}</div>
      ${this._pressionHtml(sc)}
      ${this._frontsHtml(sc)}
    </div>`;
  },

  /** À CHAUD — la bande trame COMPACTE : fil PARCOURU (passé, linéaire) + étape
      courante + « La suite » (les sorties, en disclosure `<details>`) + le moment
      clé en vedette. Glanceable : le roster reste la star, juste dessous. */
  _trameBarHtml(run, sc) {
    if (!sc) return "";
    const esc = CardRenderer._esc;
    const head = `<div class="play-trame-head">
      <span class="play-trame-word">Trame</span>
      <span class="play-trame-title">${esc(sc.title)}</span>
      <span class="play-trame-actions"><button class="btn-secondary btn-small" data-action="play-trame-open" data-scenario="${sc.id}" title="Ouvrir l'atelier de trame">Atelier</button></span>
    </div>`;
    const curId = sc.runtime && sc.runtime.currentSceneId;
    const cur = curId && sc.sceneNodes.find((n) => n.id === curId);
    if (!cur) {
      const start = sc.sceneNodes.find((n) => n.type === "accroche") || sc.sceneNodes[0];
      return `<div class="play-trame">${head}<div class="play-trame-body">${
        start
          ? `<button class="btn-primary btn-small" data-action="play-trame-goto" data-scenario="${sc.id}" data-node="${start.id}">▶ Commencer : ${esc(start.title || "(sans titre)")}</button>`
          : `<span class="play-trame-note">Trame sans étape.</span>`
      }</div></div>`;
    }
    const g = this._TRAME_GLYPH[cur.type] || "●";
    const tint = this._TYPE_TINT[cur.type];
    const tintBar = tint ? ` style="--tint:var(${tint})"` : "";
    const tintG = tint ? ` style="color:var(${tint})"` : "";
    const closed = new Set((sc.runtime && sc.runtime.closedEdgeIds) || []);
    const exits = sc.sceneEdges.filter((e) => e.from === cur.id && !closed.has(e.id));
    const exitBtns = exits.length
      ? exits
          .map((e) => {
            const to = sc.sceneNodes.find((n) => n.id === e.to);
            const lbl = to ? to.title || "(sans titre)" : "?";
            const hint = e.isEscapeHatch ? " ⚑" : e.gateway === "parallel" ? " ∥" : e.gateway === "exclusive" ? " ⋔" : "";
            const cls = e.isEscapeHatch ? "play-trame-exit is-hatch" : "play-trame-exit";
            return `<button class="${cls}" data-action="play-trame-goto" data-scenario="${sc.id}" data-node="${e.to}" title="${e.label ? esc(e.label) : "Aller à cette étape"}">→ ${esc(lbl)}${hint}</button>`;
          })
          .join("")
      : `<span class="play-trame-note">Fin de la trame (aucune suite).</span>`;
    const suite = `<details class="play-suite"><summary>La suite${exits.length ? ` <span class="play-suite-n">${exits.length}</span>` : ""}</summary><div class="play-trame-exits">${exitBtns}</div></details>`;
    const bang = cur.bang
      ? `<p class="play-trame-bang" data-arrow="${cur.arrow || ""}"><span class="play-trame-bang-arrow" aria-hidden="true">${cur.arrow === "hope" ? "↑" : cur.arrow === "fear" ? "↓" : "◆"}</span> ${esc(cur.bang)}</p>`
      : "";
    return `<div class="play-trame is-bar"${tintBar}>${head}
      <div class="play-trame-bar">
        ${this._trailHtml(sc)}
        <span class="play-trame-cur-glyph" aria-hidden="true"${tintG}>${g}</span>
        <span class="play-trame-cur-title">${esc(cur.title || "(sans titre)")}</span>
        ${suite}
      </div>
      ${bang}
    </div>`;
  },

  /** Le fil PARCOURU (runtime `ScenarioStore.visited`) rendu en glyphes de type —
      linéaire par construction : le passé effectivement joué, pas le plan (qui
      est un graphe branché ; l'avenir vit dans « La suite »). */
  _trailHtml(sc) {
    const path = ScenarioStore.visited(sc);
    if (!path || path.length < 2) return "";
    const sep = '<span class="play-trail-sep" aria-hidden="true">›</span>';
    const parts = path
      .slice(0, -1)
      .map((nid) => {
        const n = sc.sceneNodes.find((x) => x.id === nid);
        if (!n) return "";
        const tint = this._TYPE_TINT[n.type];
        return `<span class="play-trail-g"${tint ? ` style="color:var(${tint})"` : ""}>${this._TRAME_GLYPH[n.type] || "●"}</span>`;
      })
      .filter(Boolean);
    return parts.length ? `<span class="play-trame-trail" title="Chemin parcouru">${parts.join(sep)}${sep}</span>` : "";
  },

  /** Un tiroir `<details>` — disclosure natif (affordance au repos + clavier ;
      son état ouvert survit aux ± grâce au patch-in-place). */
  _drawerHtml(word, sum, inner, open) {
    return `<details class="play-drawer"${open ? " open" : ""}>
      <summary><span class="play-drawer-word">${word}</span><span class="play-drawer-sum">${sum}</span><span class="play-drawer-chev" aria-hidden="true">▸</span></summary>
      <div class="play-drawer-body">${inner}</div>
    </details>`;
  },

  /** Résumé glanceable des Horloges (compte + la plus chaude) pour le sommaire du tiroir. */
  _pressionSummary(sc) {
    const clocks = sc.clocks || [];
    let top = null;
    for (const c of clocks) {
      const fill = ScenarioStore.clockFill(sc, c.id);
      const ratio = c.segments ? fill / c.segments : 0;
      if (!top || ratio > top.ratio) top = { title: c.title, fill, seg: c.segments, ratio };
    }
    return top ? `${clocks.length} · ${CardRenderer._esc(top.title || "horloge")} ${top.fill}/${top.seg}` : `${clocks.length}`;
  },

  /** Résumé glanceable des Fronts (compte + présages révélés) pour le sommaire. */
  _frontsSummary(sc) {
    const fronts = sc.fronts || [];
    let rev = 0;
    let tot = 0;
    for (const f of fronts)
      for (const d of f.dangers || []) {
        rev += ScenarioStore.frontPortent(sc, d.id);
        tot += (d.grimPortents || []).length;
      }
    return `${fronts.length} · présages ${rev}/${tot}`;
  },

  _FRONT_COACH_KEY: "cockpit_front_coach_seen",
  _frontCoachSeen() {
    return typeof Storage !== "undefined" && Storage.getGlobal(this._FRONT_COACH_KEY, false) === true;
  },
  /** Lot C — le coachmark première rencontre : enseigne « Front » sans jargon.
      « Compris » pose le drapeau global (via Storage — prohibition n°2) → il ne
      revient plus. Proactif « une fois » : le tiroir Fronts s'ouvre tant que non vu. */
  _frontCoachHtml() {
    return `<div class="play-front-coach">
      <span class="play-front-coach-i" aria-hidden="true">ⓘ</span>
      <div class="play-front-coach-txt"><b>Un Front</b>, c'est un danger organisé — souvent une faction — qui avance vers une catastrophe, étape par étape. À vous de le ralentir.
        <button class="btn-secondary btn-small" data-action="play-front-coach-ok">Compris</button></div>
    </div>`;
  },

  /** S5b — les FRONTS en cockpit : faction + dangers dont on avance les présages
      ordonnés en live (−/＋ → `setFrontPortent`). Tous présages révélés → échéance. */
  _frontsHtml(sc, { bare = false } = {}) {
    const esc = CardRenderer._esc;
    const fronts = sc.fronts || [];
    if (!fronts.length) return "";
    const facName = (id) => (typeof FactionStore !== "undefined" && id && FactionStore.get(id)) ? FactionStore.get(id).name : "";
    const rows = fronts.map((f) => {
      const fn = facName(f.factionId);
      // Chrome (board) : le Front s'identifie par la PASTILLE de sa faction —
      // plus de ⚑, réservé au type d'étape « retombée » (collision levée).
      const fcol = (typeof FactionStore !== "undefined" && f.factionId && FactionStore.get(f.factionId) || {}).color || "";
      const dangers = (f.dangers || []).map((d) => {
        const total = (d.grimPortents || []).length;
        const rev = ScenarioStore.frontPortent(sc, d.id);
        const portents = (d.grimPortents || []).map((p, i) => `<li class="play-portent${i < rev ? " revealed" : ""}">${i < rev ? esc(p) : "étape à venir"}</li>`).join("");
        const doom = total && rev >= total && d.impendingDoom ? `<div class="play-portent-doom">⚠ ${esc(d.impendingDoom)}</div>` : "";
        return `<div class="play-danger">
          <div class="play-danger-head">
            <span class="play-danger-impulse">${esc(d.impulse || "(danger)")}</span>
            <span class="play-portent-count">${rev}/${total}</span>
            <span class="play-clock-btns">
              <button class="play-clock-btn" data-action="play-trame-portent" data-scenario="${sc.id}" data-danger="${d.id}" data-delta="-1"${rev <= 0 ? " disabled" : ""} aria-label="Reculer d'une étape">−</button>
              <button class="play-clock-btn" data-action="play-trame-portent" data-scenario="${sc.id}" data-danger="${d.id}" data-delta="1"${rev >= total || !total ? " disabled" : ""} aria-label="Avancer d'une étape">＋</button>
            </span>
          </div>
          <ol class="play-portents">${portents}</ol>
          ${doom}
        </div>`;
      }).join("");
      return `<div class="play-front">
        <div class="play-front-head"><span class="play-front-dot" aria-hidden="true"${fcol ? ` style="background:${esc(fcol)}"` : ""}></span> <span class="play-front-title">${esc(f.title || "(front)")}</span>${fn ? `<span class="play-front-faction">${esc(fn)}</span>` : ""}</div>
        ${dangers}
      </div>`;
    }).join("");
    return `<div class="play-trame-fronts">${bare ? "" : '<span class="play-trame-word">Fronts</span>'}${rows}</div>`;
  },

  /** S5a — la PRESSION en cockpit : chaque horloge de la trame, remplissable en
      live (−/＋ → `setClockFill`, qui applique les effets et émet ; l'abonnement
      re-rend le poste). Anneau réutilisé de l'atelier (ScenarioGraph). */
  _pressionHtml(sc, { bare = false } = {}) {
    const esc = CardRenderer._esc;
    const clocks = sc.clocks || [];
    if (!clocks.length) return "";
    const TL = { alerte: "Alerte", menace: "Danger", objectif: "Objectif" };
    const rows = clocks
      .map((c) => {
        const fill = ScenarioStore.clockFill(sc, c.id);
        // Horloge SEGMENTÉE (flair « trame McCarthy »), couleur sémantique par
        // type (alerte/menace/objectif) : chaque case se remplit et rougeoie.
        let segs = "";
        for (let i = 0; i < c.segments; i++) segs += `<span class="play-seg${i < fill ? " on" : ""}"></span>`;
        return `<div class="play-clock t-${c.type}">
          <div class="play-clock-top">
            <span class="play-clock-title">${esc(c.title || "(horloge)")}<small>${TL[c.type] || esc(c.type)}</small></span>
            <span class="play-clock-count">${fill}/${c.segments}</span>
            <span class="play-clock-btns">
              <button class="play-clock-btn" data-action="play-trame-clock" data-scenario="${sc.id}" data-clock="${c.id}" data-delta="-1"${fill <= 0 ? " disabled" : ""} aria-label="Baisser l'horloge">−</button>
              <button class="play-clock-btn" data-action="play-trame-clock" data-scenario="${sc.id}" data-clock="${c.id}" data-delta="1"${fill >= c.segments ? " disabled" : ""} aria-label="Monter l'horloge">＋</button>
            </span>
          </div>
          <div class="play-segs">${segs}</div>
        </div>`;
      })
      .join("");
    return `<div class="play-trame-pression">${bare ? "" : '<span class="play-trame-word">Horloges</span>'}${rows}</div>`;
  },

  /** Abonnement live à ScenarioStore : quand Jouer est visible et qu'une trame
      change (bifurcation au cockpit OU édition à l'atelier), re-projeter le
      poste. Debounce léger : coalesce les salves (frappe de titre à l'atelier).
      Guardé sur le panneau actif → 0 travail quand Jouer est masqué. */
  _onScenarioChange() {
    // Un ± local peint le DOM en place (feel joué + état ouvert des tiroirs
    // préservé) et pose ce drapeau le temps de la mutation : on n'écrase pas son
    // travail par un re-render complet. Les changements EXTERNES (atelier) ne le
    // posent pas → re-render normal.
    if (this._patching) return;
    const panel = document.getElementById("panel-play");
    if (!panel || !panel.classList.contains("active")) return;
    clearTimeout(this._trameRenderT);
    this._trameRenderT = setTimeout(() => this.render(), 60);
  },

  /** Patch-in-place d'une horloge : mute le runtime, puis DÉTECTE un éventuel
      effet de seuil (étape activée / sortie fermée) — seul cas où l'on re-rend le
      poste ; sinon on peint la case dans le DOM existant (la transition de token
      joue et l'état ouvert des tiroirs survit). */
  _patchClock(btn, scId, ckId, delta) {
    const sc = ScenarioStore.get(scId);
    const clock = sc && (sc.clocks || []).find((c) => c && c.id === ckId);
    if (!clock) return;
    const before = ScenarioStore.clockFill(sc, ckId);
    const curBefore = sc.runtime && sc.runtime.currentSceneId;
    const closedBefore = ((sc.runtime && sc.runtime.closedEdgeIds) || []).join(",");
    this._patching = true;
    ScenarioStore.setClockFill(scId, ckId, before + delta);
    this._patching = false;
    const curAfter = sc.runtime && sc.runtime.currentSceneId;
    const closedAfter = ((sc.runtime && sc.runtime.closedEdgeIds) || []).join(",");
    if (curAfter !== curBefore || closedAfter !== closedBefore) return void this.render();
    this._paintClock(btn.closest(".play-clock"), ScenarioStore.clockFill(sc, ckId), clock.segments);
  },
  /** Peint le remplissage sur les cases EXISTANTES (la transition `fill` joue),
      le compteur et l'état des boutons. */
  _paintClock(row, fill, segments) {
    if (!row) return;
    row.querySelectorAll(".play-seg").forEach((sl, i) => sl.classList.toggle("on", i < fill));
    const count = row.querySelector(".play-clock-count");
    if (count) count.textContent = `${fill}/${segments}`;
    const minus = row.querySelector('[data-delta="-1"]');
    const plus = row.querySelector('[data-delta="1"]');
    if (minus) minus.disabled = fill <= 0;
    if (plus) plus.disabled = fill >= segments;
  },
  /** Patch-in-place d'un présage (aucun effet de seuil → jamais de re-render). */
  _patchPortent(btn, scId, dgId, delta) {
    const sc = ScenarioStore.get(scId);
    if (!sc) return;
    let danger = null;
    for (const f of sc.fronts || []) {
      const d = (f.dangers || []).find((x) => x && x.id === dgId);
      if (d) { danger = d; break; }
    }
    if (!danger) return;
    const before = ScenarioStore.frontPortent(sc, dgId);
    this._patching = true;
    ScenarioStore.setFrontPortent(scId, dgId, before + delta);
    this._patching = false;
    this._paintPortents(btn.closest(".play-danger"), danger, ScenarioStore.frontPortent(sc, dgId));
  },
  /** Peint la révélation sur les <li> EXISTANTS (transition + micro-glissé), le
      compteur, les boutons et l'échéance. */
  _paintPortents(box, danger, rev) {
    if (!box) return;
    const portents = danger.grimPortents || [];
    box.querySelectorAll(".play-portent").forEach((li, i) => {
      const on = i < rev;
      const was = li.classList.contains("revealed");
      li.classList.toggle("revealed", on);
      li.textContent = on ? portents[i] : "étape à venir";
      if (on && !was) { li.classList.remove("just"); void li.offsetWidth; li.classList.add("just"); }
    });
    const count = box.querySelector(".play-portent-count");
    if (count) count.textContent = `${rev}/${portents.length}`;
    const minus = box.querySelector('[data-delta="-1"]');
    const plus = box.querySelector('[data-delta="1"]');
    if (minus) minus.disabled = rev <= 0;
    if (plus) plus.disabled = rev >= portents.length || !portents.length;
    let doom = box.querySelector(".play-portent-doom");
    const show = portents.length && rev >= portents.length && danger.impendingDoom;
    if (show && !doom) {
      doom = document.createElement("div");
      doom.className = "play-portent-doom";
      doom.textContent = `⚠ ${danger.impendingDoom}`;
      box.appendChild(doom);
    } else if (!show && doom) {
      doom.remove();
    }
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
  /** Peau calibrée — le HEADER du cockpit : nom d'état en gros (display) teinté
      par l'accent d'édition + pastille (pulse à chaud) · le run + sa campagne +
      les outils (Notes / Reprendre) · les CELLULES D'HORLOGE (Round·Passe·En
      scène en combat ; Tour·CI·Serveurs en Matrice). Suivi du bandeau de JALONS.
      Lecture seule, projeté d'`Encounter`/`Dossiers` — 0 branche d'édition. */
  _cockpitHeadHtml(run, state, resumeBtn) {
    const esc = CardRenderer._esc;
    const glyph = { combat: "⚔", matrix: "⚡", close: "✓" }[state] || "◈";
    const name = { combat: "Combat", matrix: "Matrice", close: "Clôture" }[state] || "Préparation";
    const parent = run.parentId && typeof Dossiers !== "undefined" ? Dossiers.get(run.parentId) : null;
    const camp = parent && parent.kind === "campaign" ? `❖ ${esc(parent.name)}` : "◆ hors campagne";
    const cells = this._cockpitCells(run, state);
    return `<div class="play-cockpit-head">
      <div class="pch-line">
        <span class="pch-state"><span class="pch-dot" aria-hidden="true"></span><span class="pch-glyph" aria-hidden="true">${glyph}</span>${name}</span>
        <span class="pch-run">
          <span class="pch-idline"><button class="pch-name" data-action="play-focus" data-dossier="${run.id}" title="Ouvrir « ${esc(run.name)} » dans la bibliothèque">${esc(run.name)}</button><span class="pch-camp">${camp}</span></span>
          <span class="pch-tools"><button class="btn-secondary btn-small" data-action="play-notes" data-dossier="${run.id}" title="Ouvrir le carnet de ce run">✎ Notes</button>${resumeBtn}</span>
        </span>
      </div>
      ${cells ? `<div class="pch-cells">${cells}</div>` : ""}
    </div>`;
  },
  /** Cellules d'horloge de tête (gros chiffres), par partie active. */
  _cockpitCells(run, state) {
    const cell = (n, l) => `<div class="pch-cell"><span class="n">${n}</span><span class="l">${l}</span></div>`;
    const st = Encounter.state;
    if (state === "prep") {
      const trame = typeof ScenarioStore !== "undefined" ? ScenarioStore.byRun(run.id) : null;
      const etapes = trame ? (trame.sceneNodes || []).length : 0;
      const cast = typeof DossierBar !== "undefined" ? DossierBar.convenedIds(run.id).length : 0;
      const scenes = typeof Dossiers !== "undefined" ? Dossiers.scenesOf(run.id).length : 0;
      return (etapes ? cell(etapes, "Étapes") : "") + cell(cast, "Casting") + cell(scenes, "Scènes");
    }
    if (state === "combat") {
      return cell(st ? st.round : 1, "Round") + cell(st && st.pass ? st.pass : 1, "Passe") + cell(st ? st.combatants.length : 0, "En scène");
    }
    if (state === "matrix") {
      const s = Encounter.matrixMotorSummary();
      const turn = s.reduce((m, x) => Math.max(m, x.turn || 0), 0);
      const ic = s.reduce((a, x) => a + (x.activeIC || 0), 0);
      return cell(turn || 1, "Tour") + cell(ic, "CI") + cell(s.length, s.length > 1 ? "Serveurs" : "Serveur");
    }
    return "";
  },
  /** Les jalons = ONGLETS cliquables (Préparation · En jeu · Clôture) : taper
      bascule la partie affichée EN PLEIN (`play-cockpit-tab`) ; l'onglet actif
      est surligné. « En jeu » montre le moteur live (Combat ou Matrice). */
  _cockpitJalonsHtml(run, tab) {
    return `<div class="play-cockpit-jalons" role="tablist">${[["prep", "Préparation"], ["enjeu", "En jeu"], ["close", "Clôture"]]
      .map(([id, label]) => `<button class="play-jalon${id === tab ? " is-now" : ""}" role="tab" aria-selected="${id === tab}" data-action="play-cockpit-tab" data-dossier="${run.id}" data-tab="${id}">${label}</button>`)
      .join("")}</div>`;
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
      panneau `run` (édition, trame, plan) pour éviter d'avoir à le quitter.
      Éditer (→ ToposEdit) · Générer la trame (→ RunGen, seulement si le topos
      porte un profil de sécurité ET qu'aucune trame n'est encore liée au run) ·
      Plan tactique / Ambiance : miroir exact du gating de
      `RunRenderer._planButtons` (site `planUtile` ; Ambiance opt-in IA via
      Settings ; vue directe si `planUrl` déjà généré, sinon génération). */
  _prepActionsHtml(t, runId) {
    const btns = [
      `<button class="btn-secondary btn-small" data-action="play-topos-edit" data-id="${t.id}" title="Éditer le topos (objectif, complication, mandant, lieu, paie)">✎ Éditer</button>`,
    ];
    if (t.securityProfile && !this._runHasTrame(runId))
      btns.push(
        `<button class="btn-secondary btn-small" data-action="play-trame-generate" data-id="${t.id}" title="Générer une trame jouable (scènes, horloges, front, faction + casting) et la lier au run">◈ Générer la trame</button>`,
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

  /** Le run a-t-il déjà une trame liée ? (`ScenarioStore.byRun` sur le
      `dossierId`). Sert à n'offrir « Générer la trame » que là où aucune n'existe
      encore — `generateTrameForRun` ne duplique pas (il propose alors de l'ouvrir),
      ce garde évite juste d'afficher le bouton pour rien. */
  _runHasTrame(runId) {
    return typeof ScenarioStore !== "undefined" && !!ScenarioStore.byRun(runId);
  },

  /** Casting préparé, RENDU PAR RÉFÉRENCE (Fil B · §4.2). Le run/scène convoque
      le Monde (`node.convokes`) : une Faction reste UNE unité (chip dépliable,
      « convoquer ≠ recopier »), les entités directes sont des chips, et ce que la
      campagne parente convoque descend en « hérité » (grisé). Chaque membre : tap
      = consulter (CardPeek/Palette) ; PNJ/PJ portent ⚔ « envoyer en scène »
      (geste-roi), serveurs ⚡ « mettre en jeu », contacts = consultation seule.
      `convokeCta` (run/Briefing) montre toujours « ＋ convoquer », même à vide —
      invitation Silk ; une scène (défaut) reste muette tant qu'elle n'a rien. */
  _castHtml(scopeId, { convokeCta = false } = {}) {
    const direct = typeof Dossiers !== "undefined" ? Dossiers.convokesOf(scopeId) : [];
    const inherited = this._inheritedConvokes(scopeId);
    const inScene = new Set(
      ((Encounter.state && Encounter.state.combatants) || []).map((c) => c.pnjId),
    );
    const ctx = { inScene, inMatrix: new Set(Encounter.activeMatrixServerIds()) };
    // Ordre spec §4.2 : [hérité] [Factions directes] [entités directes] [＋ convoquer].
    const chips =
      inherited.map((c) => this._castRefChip(c, { ...ctx, inherited: true })).join("") +
      direct
        .filter((c) => c && c.ref === "faction")
        .map((c) => this._castRefChip(c, ctx))
        .join("") +
      direct
        .filter((c) => c && c.ref === "entity")
        .map((c) => this._castRefChip(c, ctx))
        .join("");
    if (!chips && !convokeCta) return "";
    // Option C — « ＋ convoquer » : bâtir le casting depuis le Briefing sans quitter
    // Jouer. Délégué à ConvokePicker (`Dossiers.convoke`/`unconvoke`).
    const convokeBtn = `<button class="play-cast-convoke" data-action="play-cast-convoke" data-dossier="${scopeId}" title="Convoquer une entité ou une faction sur ce run">＋ convoquer</button>`;
    // VIS-15 B4 — « ◈ Liens » : le graphe des relations scopé (casting + voisins en
    // halo). Sans casting, pas de graphe à montrer.
    const links = chips
      ? `<button class="btn-secondary btn-small" data-action="play-relations-graph" data-dossier="${scopeId}" title="Voir les liens du casting en graphe">◈ Liens</button>`
      : "";
    return `<div class="play-cast">
      <div class="play-cast-label">Casting préparé ${links}</div>
      <div class="play-cast-chips">${chips}${convokeBtn}</div>
    </div>`;
  },

  /** Les convokes HÉRITÉS d'un nœud : ceux de ses ancêtres (campagne au-dessus du
      run), dédupliqués contre les convokes directs (le direct l'emporte). Refs
      brutes (pas aplaties) pour rendre une Faction héritée comme telle. */
  _inheritedConvokes(scopeId) {
    if (typeof Dossiers === "undefined") return [];
    const seen = new Set((Dossiers.convokesOf(scopeId) || []).map((c) => `${c.ref}:${c.id}`));
    const out = [];
    let node = Dossiers.get(scopeId);
    node = node && node.parentId ? Dossiers.get(node.parentId) : null;
    for (let i = 0; node && i < 50; i++) {
      for (const c of Dossiers.convokesOf(node.id)) {
        if (!c) continue;
        const k = `${c.ref}:${c.id}`;
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(c);
      }
      node = node.parentId ? Dossiers.get(node.parentId) : null;
    }
    return out;
  },

  /** Une puce de casting depuis un convoke (ref entité → chip, ref faction →
      chip dépliable). Point d'entrée unique du rendu par référence. */
  _castRefChip(c, opts) {
    if (!c) return "";
    if (c.ref === "faction") return this._factionChipHtml(c.id, opts);
    if (c.ref === "entity") return this._entityChipHtml(c.id, opts);
    return "";
  },

  /** Une puce d'ENTITÉ (PNJ/PJ/contact/serveur). Résolution neutre par
      `PnjLookup.locate` (nom + type, 0 branche d'édition) ; l'action dépend du
      type : ⚔ scène (PNJ/PJ) · ⚡ Matrice (serveur) · rien (contact). Sert les
      entités directes ET les membres d'une Faction. `inherited` la grise. */
  _entityChipHtml(id, { inScene, inMatrix, inherited } = {}) {
    const loc = typeof PnjLookup !== "undefined" ? PnjLookup.locate(id) : null;
    if (!loc) return "";
    const mode = { pnj: "scene", pj: "scene", contact: null, server: "server" }[loc.type];
    const name = CardRenderer._esc(loc.name);
    let action = "";
    if (mode === "scene") {
      action =
        inScene && inScene.has(id)
          ? `<span class="play-cast-in" title="Déjà en scène">en scène</span>`
          : `<button class="play-cast-add" data-action="play-cast-toscene" data-id="${id}" title="Envoyer « ${name} » en scène" aria-label="Envoyer en scène">⚔</button>`;
    } else if (mode === "server") {
      action =
        inMatrix && inMatrix.has(id)
          ? `<span class="play-cast-in" title="Serveur en jeu dans la scène">⚡ en jeu</span>`
          : `<button class="play-cast-add" data-action="play-cast-server" data-id="${id}" title="Mettre « ${name} » en jeu (moteur Matrice)" aria-label="Mettre en jeu (Matrice)">⚡</button>`;
    }
    const cls = inherited ? "play-cast-chip is-inherited" : "play-cast-chip";
    const inhTitle = inherited ? ' title="Convoqué au niveau campagne"' : "";
    return `<span class="${cls}"${inhTitle}><button class="play-cast-name" data-action="play-cast-consult" data-id="${id}" title="Consulter « ${name} »">${name}</button>${action}</span>`;
  },

  /** Une puce de FACTION convoquée : `<details>` natif (0 handler inline, chevron
      piloté par `[open]` — patron `.wn-more` de VIS-6). Le résumé = pastille
      couleur + nom + compte de membres ; le corps déplie les membres (chips
      d'entité, avec leur ⚔/⚡). Restaure l'identité perdue par l'aplatissement. */
  _factionChipHtml(factionId, { inScene, inMatrix, inherited } = {}) {
    const f = typeof FactionStore !== "undefined" ? FactionStore.get(factionId) : null;
    if (!f) return "";
    const name = CardRenderer._esc(f.name || "Faction");
    const members = Array.isArray(f.members) ? f.members : [];
    const dot = `<span class="play-cast-fdot"${f.color ? ` style="background:${CardRenderer._esc(f.color)}"` : ""}></span>`;
    const inh = inherited ? `<span class="play-cast-inh">hérité</span>` : "";
    const body = members
      .map((id) => this._entityChipHtml(id, { inScene, inMatrix }))
      .filter(Boolean)
      .join("");
    const cls = inherited ? "play-cast-faction is-inherited" : "play-cast-faction";
    return `<details class="${cls}">
      <summary class="play-cast-fsum">${dot}<span class="play-cast-fname">${name}</span><span class="play-cast-fcount">${members.length}</span>${inh}<span class="play-cast-fchev" aria-hidden="true">▾</span></summary>
      <div class="play-cast-fmembers">${body || `<span class="play-cast-fempty">Faction vide</span>`}</div>
    </details>`;
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
