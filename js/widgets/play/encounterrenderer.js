"use strict";

/* ============================================================
   ENCOUNTER RENDERER — rendu pur du suivi de combat (round,
   passe, liste ordonnée de combattants, panneau d'ajout). Ne
   modifie rien, ne persiste rien : reçoit l'état + les PNJ déjà
   résolus + le modèle de combat de l'édition, retourne du HTML.
   Toutes les interactions sont câblées par Encounter (contrôleur),
   jamais ici.
   ============================================================ */
import { Actions } from "../../rules/actions.js";
import { Ammo } from "../../rules/ammo.js";
import { AnarchyAtouts } from "../../rules/anarchyatouts.js";
import { CardRenderer } from "../card/cardrenderer.js";
import { Chase } from "../../rules/chase.js";
import { EdgeActions } from "../../rules/edgeactions.js";
// Lecture SEULE (contextes/rôle de scène) — le rendu ne mute jamais la scène.
import { Encounter } from "../../controllers/encounter.js";
import { Cyberdeck } from "../../rules/cyberdeck.js";
import { DiceRoller } from "../dice/diceroller.js";
import { ItemResolver } from "../../rules/itemresolver.js";
import { Matrix } from "../../rules/matrix.js";
import { ServerRenderer } from "./serverrenderer.js";
import { Sheets } from "../kit/sheets.js";
import { TopologyGen } from "../../rules/topologygen.js";
import { Utils } from "../../core/utils.js";
import { WeaponRoll } from "../../rules/weaponroll.js";

export const EncounterRenderer = {
  /** rows: [{ pnjId, init, hasActed, note, kind?, pnj }] — pnj peut être null
      (entité disparue depuis, ex. supprimée des Ombres) : la ligne est
      alors ignorée plutôt que de planter le rendu. Un PJ ad-hoc porte
      pnj._adhoc (pas de fiche à ouvrir).
      model: { rerollEachRound, passDecrement } de l'édition active. */
  render(state, rows, model) {
    model = model || { passDecrement: 0 };

    const roundEl = document.getElementById("encounter-round");
    if (roundEl) roundEl.textContent = state.round;

    // Indicateur de passe : seulement pour les éditions à passes (SR5).
    const passEl = document.getElementById("encounter-pass");
    if (passEl) passEl.textContent = this._passSuffix(state, model);

    // CH combat (Vague N) : mode narratif (Anarchy) — pas d'initiative ni d'ordre,
    // juste un pool qu'on éteint. Piloté par la CAPACITÉ combatModel.narrative
    // déclarée dans le module d'édition (jamais une branche App.edition ici) ;
    // bascule la présentation du modal (boutons chiffrés masqués, cf. CSS).
    const narrative = !!model.narrative;
    const modal = document.querySelector(".encounter-modal");
    if (modal) modal.classList.toggle("is-narrative", narrative);

    // Scène Matrice seule (state.motors sans "combat") — pas de
    // réglette d'init ni de liste vide à afficher, le tiroir Matrice
    // (toujours ouvert dans ce mode) est la surface principale.
    const matrixOnly = !(state.motors || []).includes("combat");
    if (modal) modal.classList.toggle("is-matrix-only", matrixOnly);
    const toggleBtn = document.getElementById("encounter-scene-type-toggle");
    if (toggleBtn) {
      toggleBtn.textContent = matrixOnly ? "⚔ Scène Combat" : "⚡ Scène Matrice";
      toggleBtn.setAttribute("aria-pressed", String(matrixOnly));
    }
    const matrixNote = document.getElementById("encounter-matrix-only-note");
    if (matrixNote) matrixNote.hidden = !matrixOnly;

    // Volet B : en narratif (pas de tour d'initiative), la fiche active suit un
    // combattant « en focus » (tap sur une ligne, cf. focus-active). On résout
    // ici l'id effectif — le tap mémorisé s'il est encore vivant, sinon le
    // premier « à jouer » — pour que la ligne surlignée et la fiche active
    // montrent le MÊME combattant. État de vue éphémère, aucune clé Storage.
    this._narrativeFocusId = narrative ? (this._narrativeFocus(rows) || {}).pnjId || null : null;

    // Miroir de la Réserve de menace dans l'en-tête (Anarchy) — visibilité
    // pilotée par combatModel.threatReserve, valeur lue sur DiceRoller (source
    // unique). Pas de branche d'édition ici.
    const threatEl = document.getElementById("encounter-threat");
    if (threatEl) {
      threatEl.hidden = !model.threatReserve;
      if (model.threatReserve) {
        const val = document.getElementById("encounter-threat-val");
        if (val) val.textContent = DiceRoller.threatValue();
      }
    }
    // Bruit rejoint la Menace dans l'en-tête (ressources de scène, même
    // patron id-driven) — un seul point d'affichage pour la fiche active
    // (SR5) et le narratif (A2), qui se partageaient jusqu'ici deux rendus.
    const noiseEl = document.getElementById("encounter-noise");
    if (noiseEl) {
      const noiseActive = this._matrixSceneActive(state);
      noiseEl.hidden = !noiseActive;
      if (noiseActive) {
        const val = document.getElementById("encounter-noise-val");
        if (val) val.textContent = state.noise || 0;
      }
    }

    const list = document.getElementById("encounter-list");
    if (!list) return;

    // rows est 1:1 avec state.combatants (même ordre init) : l'index brut vaut
    // le turnIndex — conservé pour repérer l'actif. Les hors-combat (r.down)
    // restent poussés en bas, sous un séparateur, sans initiative.
    const visible = rows.map((r, i) => ({ r, i })).filter((x) => x.r.pnj);
    const liveList = visible.filter((x) => !x.r.down);
    const downList = visible.filter((x) => x.r.down);

    // Ordre d'AFFICHAGE (option B — décision D1) : en mode ordonné, l'effectif
    // est une FILE — l'actif en tête, puis la suite du tour (rotation à partir
    // du turnIndex, avec bouclage). C'est un pur réordonnancement de VUE :
    // state.combatants et turnIndex sont INTACTS (les data-id restent valides),
    // la file se recompose seule au « Tour suivant ». Une seule règle d'ordre
    // pour mobile ET desktop. En narratif (Anarchy, sans initiative), l'ordre
    // reste manuel (glisser) — pas de rotation.
    let liveQueue = liveList;
    if (!narrative) {
      const startPos = Math.max(0, liveList.findIndex((x) => x.i === state.turnIndex));
      liveQueue = liveList.slice(startPos).concat(liveList.slice(0, startPos));
    }

    // ---- File : la ligne de l'ACTIF (leadHtml) est isolée du RESTE (restHtml =
    // file d'attente + hors-combat) pour que la console puisse s'intercaler
    // entre les deux sur mobile ([actif][console][attente], cf. maquette). En
    // ordonné : l'actif en pleine ligne, la file en attente en COMPACT sous un
    // séparateur « ordre du tour ». En narratif : pas d'actif isolé (ordre
    // manuel) — tout va dans le reste.
    let leadHtml = "";
    let waitingHtml;
    if (narrative) {
      waitingHtml = liveQueue.map((x) => this._rowNarrative(x.r)).join("");
    } else {
      const active = liveQueue[0];
      leadHtml = active
        ? this._row(active.r, true, this._outOfPass(active.r, state, model), this._effectiveInit(active.r, state, model), false)
        : "";
      const waiting = liveQueue.slice(1);
      waitingHtml = waiting.length
        ? `<div class="cluster encounter-queue-sep">En attente · ordre du tour<span class="encounter-queue-count">${waiting.length}</span></div>` +
          waiting
            .map((x) => this._row(x.r, false, this._outOfPass(x.r, state, model), this._effectiveInit(x.r, state, model), true))
            .join("")
        : "";
    }
    const downHtml = downList.length
      ? `<div class="encounter-downsep">Hors de combat · sans initiative</div>` +
        downList
          .map((x) =>
            narrative
              ? this._rowNarrative(x.r)
              : this._row(x.r, false, this._outOfPass(x.r, state, model), this._effectiveInit(x.r, state, model), false),
          )
          .join("")
      : "";
    const restHtml = waitingHtml + downHtml;
    const html = leadHtml + restHtml;

    // Réglette compacte (rail de jetons, sœur de la liste complète —
    // jamais reconstruite depuis elle, mêmes rows). Toujours rendue (même
    // vide), la visibilité rail/liste est purement CSS. Ordonné : MÊME file
    // que la liste (rotation comprise), les hors-combat en fin.
    const rail = document.getElementById("encounter-rail");
    if (rail) {
      const railHtml = narrative
        ? visible.map((x) => this._tokenNarrative(x.r)).join("")
        : liveQueue
            .concat(downList)
            .map((x) => this._token(x.r, x.i === state.turnIndex, this._outOfPass(x.r, state, model)))
            .join("");
      rail.innerHTML =
        railHtml || `<div class="encounter-rail-empty">Aucun combattant</div>`;
    }

    const activeLead = document.getElementById("encounter-active-lead");
    if (!html) {
      if (activeLead) activeLead.innerHTML = "";
      list.innerHTML = `<div class="empty-state">
        <span class="empty-state-title">Aucun combattant</span>
        Ajoutez des combattants avec « ➕ Ajouter » ou depuis leur carte (bouton « ⚔ Combat »).
      </div>`;
      return;
    }
    // En narratif : compteur « X / N ont joué » + ligne expliquant le silence
    // des actions chiffrées (sans elle, l'absence d'init/tri
    // est lue comme une panne plutôt qu'une règle appliquée à la lettre).
    const progressHtml = narrative ? this._narrativeNote() + this._narrativeProgress(rows) : "";
    // En narratif (Anarchy 2), le brickage n'a pas de fiche active où loger
    // — une bande dédiée en pied de liste (gate scène Matrice), avant l'action
    // de fin de scène. Vide (donc invisible) hors scène Matrice.
    const devicesHtml = narrative ? this._narrativeDevices(rows, state) : "";
    // Action de fin de scène rendue en pied de liste (le tracker n'a pas de
    // barre d'outils modifiable ici) : réinitialise tous les moniteurs.
    // Lot 6 (feel) : on capture les positions des lignes AVANT le re-render, et
    // on rejoue leur glissement APRÈS (FLIP) — le réordonnancement de la file
    // au « Tour suivant » devient un MOUVEMENT lisible, pas un saut (contrepartie
    // assumée de la décision B).
    // FLIP capturé sur le PARENT (main-col) : il couvre à la fois la ligne de
    // l'actif (#encounter-active-lead) et la file (#encounter-list), donc une
    // ligne qui passe de l'une à l'autre au « Tour suivant » glisse au lieu de
    // sauter, même à travers les deux conteneurs.
    // B2.1 — le FLIP ne se paie QUE s'il y a un glissement à jouer. Mesuré à 10
    // combattants : la capture coûte ~86ms à elle seule (un layout synchrone
    // forcé), et `_render` passait 185ms sur 189 dans le FLIP — la construction
    // du HTML, elle, coûte 0,5ms. Or la plupart des commits ne réordonnent RIEN
    // (dégâts, état posé, note, coche) : ils payaient deux layouts pour animer
    // zéro ligne. Comparer les identités d'abord — lire un attribut ne force
    // aucun layout, lire un rect en force un. L'ordre rendu est exactement celui
    // de la réglette ci-dessus (`liveQueue` puis `downList`), actif compris.
    const flipRoot = list.parentElement || list;
    const nouvelOrdre = liveQueue.concat(downList).map((x) => x.r.pnjId);
    const ancienOrdre = [...flipRoot.querySelectorAll(".encounter-row[data-id], .encounter-nrow[data-id]")].map(
      (el) => el.dataset.id,
    );
    const reordonne =
      ancienOrdre.length !== nouvelOrdre.length || ancienOrdre.some((id, i) => id !== nouvelOrdre[i]);
    const flipPrev = reordonne ? this._captureRowPositions(flipRoot) : null;
    if (activeLead) activeLead.innerHTML = leadHtml;
    list.innerHTML =
      progressHtml +
      restHtml +
      devicesHtml +
      `<div class="encounter-scene-actions">
        ${Encounter.groupStatusAvailable() ? `<button class="btn-secondary btn-small" data-action="group-status" title="Poser le même état sur plusieurs combattants — une fumigène, un gaz, une zone d'effet">⊘ État de groupe</button>` : ""}
        <button class="btn-secondary btn-small" data-action="heal-all" title="Réinitialiser les moniteurs de tous les combattants">⛨ Fin de scène — tout soigner</button>
      </div>`;
    this._playFlip(flipRoot, flipPrev);
  },

  /** FLIP (First-Last-Invert-Play) du réordonnancement de la file (Lot 6) : le
      glissement des lignes EST le retour visuel de l'avancement du tour. Capture
      les positions AVANT le re-render (par data-id) ; _playFlip mesure APRÈS,
      inverse l'écart en transform puis le relâche en transition. Seules les
      lignes qui ont BOUGÉ s'animent (dy≈0 → rien) : un refresh sans réordre
      (note, coche) ne déclenche aucun mouvement. transform/opacity seuls,
      ≤ --dur-base, coupé sous prefers-reduced-motion. */
  _captureRowPositions(list) {
    const map = new Map();
    if (!list) return map;
    list
      .querySelectorAll(".encounter-row[data-id], .encounter-nrow[data-id]")
      .forEach((el) => map.set(el.dataset.id, el.getBoundingClientRect().top));
    return map;
  },
  _playFlip(list, prev) {
    if (!list || !prev || !prev.size) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // B2.1 — DEUX phases, jamais entrelacées. Lire un rect après avoir écrit un
    // style force le navigateur à refaire la mise en page sur-le-champ : la
    // boucle d'origine lisait puis écrivait ligne par ligne, soit N layouts
    // synchrones pour N lignes. Mesuré à 10 combattants : médiane 320 → 174ms,
    // et surtout pic 2463 → 194ms — les pointes à 2,2s de l'audit ÉTAIENT ce
    // thrashing, pas la taille de la scène.
    const lus = [];
    for (const el of list.querySelectorAll(".encounter-row[data-id], .encounter-nrow[data-id]")) {
      const oldTop = prev.get(el.dataset.id);
      if (oldTop == null) continue;
      lus.push([el, oldTop - el.getBoundingClientRect().top]); // LECTURES seules
    }
    const moved = [];
    for (const [el, dy] of lus) {
      if (Math.abs(dy) < 1) continue;
      // Invert : replace la ligne à son ancienne position, sans transition.
      el.style.transition = "none"; // ÉCRITURES seules
      el.style.transform = `translateY(${dy}px)`;
      moved.push(el);
    }
    if (!moved.length) return;
    void list.offsetHeight; // ancre l'état inversé avant de relâcher
    requestAnimationFrame(() => {
      moved.forEach((el) => {
        el.style.transition = "transform var(--dur-base) var(--ease-standard)";
        el.style.transform = "";
        const clear = () => {
          el.style.transition = "";
          el.style.transform = "";
          el.removeEventListener("transitionend", clear);
        };
        el.addEventListener("transitionend", clear);
      });
    });
  },

  /** B2.5 (C-018) — les états POSÉS, lisibles depuis la piste elle-même.
      Mesuré avant : 3 PNJ Enflammés, le mot « enflamm » sortait **0 fois** de tout
      le cockpit dès que l'actif n'était pas l'un d'eux. Les pastilles n'existaient
      que dans la console Réagir, donc uniquement quand un PJ est l'acteur actif :
      au tour d'un PNJ, rien ne disait qui brûle.

      **En LECTURE seule**, et c'est le point de conception. Les pastilles de la
      carte (`CardRenderer._statusTag`) portent deux verbes — monter d'un cran, et
      ✕ retirer. Les monter ici mettrait des gestes destructifs dans la surface
      qu'on BALAIE, et donnerait un troisième endroit où poser un état alors que
      la Suite A vient d'en unifier la discipline. La piste répond à « qui brûle ? »,
      pas à « soigne-le ».

      Source unique : `Statuses.active`, celle des cartes, atteinte par
      `CardRenderer.liveDeps()` — pas de second catalogue, pas d'import de plus.
      Borné à 3 + un reliquat « +N » (leçon A3 : une ligne ne doit pas pousser le
      reste hors du champ ; un PNJ peut porter 28 états). Le niveau s'écrit en
      chiffre arabe et non en romain comme sur la carte : la piste est une surface
      de balayage, pas la notation du livre — le détail complet est dans le title. */
  _rowStatuses(pnj) {
    if (!pnj || pnj._adhoc) return "";
    const deps = CardRenderer.liveDeps();
    if (!deps || !deps.Statuses) return "";
    let actifs = [];
    try {
      actifs = deps.Statuses.active(pnj) || [];
    } catch {
      return "";
    }
    if (!actifs.length) return "";
    const MAX = 3;
    // Pas de référence de page dans le title : le MJ n'en a jamais besoin, et
    // cette surface-ci est neuve — on n'y en introduit pas. (Les `page` déjà
    // affichés ailleurs, ex. `CardRenderer._statusTag`, restent tels quels.)
    const puce = (s) => {
      const niveau = s.level > 1 ? ` ${s.level}` : "";
      return `<span class="encounter-kind encounter-state" title="${Utils.escHtml(`${s.name}${niveau}`)}">${Utils.escHtml(s.name)}${niveau}</span>`;
    };
    const montrees = actifs.slice(0, MAX).map(puce).join("");
    const reste = actifs.length - MAX;
    const plus =
      reste > 0
        ? `<span class="encounter-kind encounter-state is-more" title="${Utils.escHtml(actifs.slice(MAX).map((s) => s.name).join(", "))}">+${reste}</span>`
        : "";
    return montrees + plus;
  },

  /** Ligne statique : Anarchy n'a pas d'initiative chiffrée, l'ordre est
      décidé à la table et réordonné à la main (glisser-déposer, cf.
      dragHandle de _rowNarrative) — sans ce rappel, le silence de « Lancer &
      classer »/« Trier » (masqués en narratif, cf. CSS .is-narrative) est pris
      pour une panne plutôt qu'une règle appliquée à la lettre.

      B4.2 — le rappel disait « la ligne pour voir ses actions ». Vrai d'un PNJ,
      FAUX d'un PJ : taper sa ligne bascule le cockpit en RÉAGIR et ouvre le rack
      de réaction des PNJ (le mode suit le combattant en FOCUS en narratif, cf.
      renderActiveCard). C'est le seul chemin vers cette console en Anarchy — il
      n'y a pas d'ordre de tour pour l'ouvrir tout seul — et rien ne l'annonçait :
      l'audit du cockpit, instrumenté, est passé entièrement à côté et a conclu que
      la console « n'existait pas dans les éditions narratives ». Elle existe dans
      les deux, avec ses 4 lignes de réaction ; c'est le libellé qui mentait. */
  _narrativeNote() {
    return `<div class="encounter-narrative-note">Anarchy : ordre narratif — <b>touchez ✓</b> pour marquer « joué », <b>la ligne d'un PNJ</b> pour ses actions, <b>celle d'un PJ</b> pour faire réagir les PNJ · glissez ⠿ pour réordonner</div>`;
  },

  /** Compteur de progression du round narratif : combien de combattants ont
      déjà joué sur le total présent. */
  _narrativeProgress(rows) {
    const present = rows.filter((r) => r.pnj);
    const played = present.filter((r) => r.hasActed).length;
    return `<div class="encounter-progress">${played} / ${present.length} ont joué</div>`;
  },

  /** Nom compact partagé par toutes les surfaces du tracker (file, carte
      active, console de réaction) : alias de rue s'il existe, sinon le dernier
      mot du nom civil (cf. Utils.parseName). Échappé pour insertion HTML —
      même règle partout, jamais l'id ni le nom complet en clair dans le rack. */
  _compactName(raw) {
    const { alias, family, full } = Utils.parseName(raw);
    return Utils.escHtml(alias || family || full);
  },

  /** Ligne narrative (Anarchy) — Volet B : la LIGNE ENTIÈRE met le combattant
      « en focus » (data-action="focus-active" → sa fiche + budget d'actions,
      ou la console de réaction si c'est un PJ, s'affichent dans #encounter-
      active-card, comme le tour actif en ordonné). Marquer « joué » migre sur
      deux affordances DÉDIÉES, toutes deux data-action="narrative-toggle" :
      (1) l'ANNEAU-check à gauche (vide avec ✓ fantôme = à jouer ; plein vert =
      joué — il ressemble déjà à une case à cocher) ; (2) la PASTILLE d'état à
      droite (« À jouer » → « Joué »). Séparer focus (grande cible) et « joué »
      (contrôles dédiés) évite le double-sens du tap. Le nom + type/combativité
      sont empilés. Pas de jeton d'init, ⚄ ni tri — l'ordre se réordonne à la
      main via ⠿ (câblé par Encounter._initDrag). Le ✕ (retirer) et « voir la
      fiche » (panneau complet) restent derrière ⋯. */
  _rowNarrative(r) {
    const { pnjId, hasActed, pnj } = r;
    const isFocused = pnjId === this._narrativeFocusId;
    const { alias, family, full } = Utils.parseName(pnj.name);
    const name = Utils.escHtml(alias || family || full);
    const fullName = Utils.escHtml(full);
    const kind = this._kindLabel(r);
    // Combativité (Anarchy 2.0, champ threatLevel) affichée en pastille — c'est
    // l'info qui guide « qui décroche quand » (cf. Vague D).
    const comb = pnj.threatLevel
      ? `<span class="encounter-kind encounter-comb">${Utils.escHtml(pnj.threatLevel)}</span>`
      : "";
    const canFocus = !pnj._adhoc;
    const colorDot = r.isPJ ? CardRenderer._pcAvatar(pnj) : "";
    // Pas de poignée sur les lignes hors de combat (épinglées en bas, non
    // réordonnables) — même garde que _row.
    const dragHandle = r.down
      ? ""
      : `<span class="encounter-drag-handle" title="Glisser pour réordonner" aria-hidden="true">⠿</span>`;
    // Pastille d'état à droite : seconde lecture de « a joué », et invite au
    // tap (« À jouer » = action en attente). Remplacée par le badge ☠ quand
    // le combattant est hors de combat (il ne joue plus — pas de bascule utile).
    const status = r.down
      ? this._downBadge()
      : `<button type="button" class="encounter-nrow-status${hasActed ? " is-done" : ""}" data-action="narrative-toggle" data-id="${pnjId}" aria-pressed="${hasActed}" title="Marquer « joué »">${hasActed ? "Joué" : "À jouer"}</button>`;
    // Les actions rares (voir la fiche / hors de combat / réinitialiser /
    // retirer) vivent derrière le menu ⋯ canonique (.card-kebab/.card-menu,
    // CardMenu.bindDelegation() déjà bindé au boot — aucun câblage neuf ici).
    // Pas de chips inline en narratif : le tap pleine-ligne reste le geste
    // dominant.
    const menuItems = [
      canFocus
        ? { attrs: `data-action="focus-combatant" data-id="${pnjId}"`, label: "Voir la fiche" }
        : null,
      pnj._adhoc || r.down
        ? null
        : { attrs: `data-action="knockout-combatant" data-id="${pnjId}"`, label: "Hors de combat" },
      pnj._adhoc
        ? null
        : { attrs: `data-action="heal-combatant" data-id="${pnjId}"`, label: "Réinitialiser les moniteurs" },
      this._dismissMenuItem(r),
      { attrs: `data-action="remove-combatant" data-id="${pnjId}"`, label: "Retirer du combat", danger: true },
    ].filter(Boolean);
    return `<div class="cluster encounter-nrow${hasActed ? " has-acted" : ""}${r.down ? " down" : ""}${isFocused ? " is-focused" : ""}" data-action="focus-active" data-id="${pnjId}" role="button" tabindex="0" aria-current="${isFocused ? "true" : "false"}" title="Toucher pour voir ses actions">
      ${dragHandle}
      ${r.down ? `<span class="encounter-nrow-check" aria-hidden="true">✓</span>` : `<button type="button" class="encounter-nrow-check" data-action="narrative-toggle" data-id="${pnjId}" aria-pressed="${hasActed}" title="Marquer « joué »" aria-label="Marquer joué — ${fullName}">✓</button>`}
      <div class="stack encounter-nrow-body">
        <span class="encounter-nrow-name">${colorDot}${name}</span>
        <span class="cluster"><span class="encounter-kind">${kind}</span>${comb}${this._rowStatuses(pnj)}</span>
      </div>
      ${status}
      ${this._lifeGauge(r)}
      <span class="cluster encounter-controls">${this._rowMenu(menuItems)}</span>
      ${this._moraleBanner(r)}
    </div>`;
  },

  /** Menu de débordement ⋯ générique d'une ligne (ordonné + narratif) —
      réutilise le patron canonique .card-kebab/.card-menu (cardfooter.js) :
      libellés lisibles, ouverture/fermeture déjà gérées par
      CardMenu.bindDelegation() (clic-dehors, Échap, un seul ouvert,
      aria-expanded). Items = simples data-action, câblés par la délégation
      d'Encounter existante — ce helper ne décide d'aucune action métier. */
  _rowMenu(items) {
    const esc = Utils.escHtml;
    return `<button type="button" class="card-kebab" data-card-menu-toggle aria-haspopup="true" aria-expanded="false" aria-label="Plus d'actions">⋯</button>
      <div class="stack card-menu" role="menu" hidden>${items
        .map(
          (a) =>
            `<button type="button" role="menuitem" class="card-menu-item${a.danger ? " danger" : ""}" ${a.attrs}>${esc(a.label)}</button>`,
        )
        .join("")}</div>`;
  },

  /** Barre d'actions DÉPLIÉE de la ligne de l'actif (V7) : les mêmes items que
      le menu ⋯ (mêmes `data-action` → délégation d'Encounter inchangée), mais
      en boutons VISIBLES, pour occuper l'espace vide sous la jauge de vie du
      combattant en focus. Rendu seulement pour la ligne pleine de l'actif
      (_row, isLead) ; les lignes en attente/hors-combat gardent le ⋯. */
  _leadActionBar(items) {
    if (!items || !items.length) return "";
    const esc = Utils.escHtml;
    // Icônes monochromes rendues DIRECTEMENT dans .encounter-controls, à la suite
    // des chips ✓/⚄/⏸ (mêmes carrés 32px) → une seule rangée alignée. Le libellé
    // complet reste en title + aria-label (découvrabilité + accessibilité). Une
    // fine séparation visuelle (première icône) distingue « verbes fréquents »
    // (chips) et « actions dépliées ». Pas de wrapper : alignement flex direct.
    return items
      .map(
        (a, i) =>
          `<button type="button" class="encounter-lead-action${a.danger ? " is-danger" : ""}${i === 0 ? " is-first" : ""}" ${a.attrs} title="${esc(a.label)}" aria-label="${esc(a.label)}">${a.glyph || "•"}</button>`,
      )
      .join("");
  },

  /** Suffixe « · Passe N » (SR5 uniquement) — partagé entre le titre du
      modal et le résumé sidebar pour ne pas dupliquer la condition. */
  _passSuffix(state, model) {
    return model.passDecrement ? " · Passe " + state.pass : "";
  },

  /** Combattant retombé sous le seuil de la passe courante (SR5) : grisé,
      il ne rejoue pas cette passe. Faux hors éditions à passes. */
  _outOfPass(r, state, model) {
    if (!model.passDecrement) return false;
    return r.init == null || r.init - (state.pass - 1) * model.passDecrement <= 0;
  },

  /** Score d'initiative effectif de la passe courante (SR5 : base −
      décrément×(passe−1)), affiché à côté du score de base pour que le
      décrément soit visible à l'écran, pas seulement déduit du grisé
      out-of-pass. Null en passe 1 (rien à montrer, pas encore décrémenté)
      ou hors éditions à passes. */
  _effectiveInit(r, state, model) {
    if (!model.passDecrement || state.pass <= 1 || r.init == null) return null;
    return r.init - (state.pass - 1) * model.passDecrement;
  },

  /** Libellé de type affiché en badge. Réutilise les discriminants déjà
      posés par les catalogues : combatant.kind (pj), pnj.kind (drone/
      véhicule liés), pnj.type (spirit/creature) ; PNJ par défaut. */
  _kindLabel(r) {
    if (r.kind === "pj") return "PJ";
    if (r.kind === "matrix") return "CI"; // combattant matriciel (Matrice)
    const p = r.pnj;
    if (p.kind === "drone") return "Drone";
    if (p.kind === "vehicule") return "Véhicule";
    if (p.type === "spirit") return "Esprit";
    if (p.type === "sprite") return "Sprite"; // entité matricielle (technomancien)
    if (p.type === "creature") return "Créature";
    // Un PJ (léger ou complet) ajouté depuis la bibliothèque `Characters`
    // n'a ni `kind:"pj"` (réservé au PJ ad-hoc historique) ni `type` distinctif
    // — sans ce test il retombait sur « PNJ », mislabeling visible partout où
    // ce badge est réutilisé (picker, carte active, ligne du tracker).
    if (Characters.data.all.some((c) => c.id === p.id)) return "PJ";
    return "PNJ";
  },

  /** Mini-jauge de vie : résumé du moniteur en barre fine, non
      interactive (les cases se cochent sur la fiche), visible en posture
      dock ≥641px (cf. CSS). Délègue au rendu partagé `CardRenderer.lifeBar`
      qui peint largeur+teinte depuis le descripteur `conditionMonitor.gauge`
      (l'édition a tranché la gravité). Rien sans moniteur (gauge null : PJ
      ad-hoc, CI matricielle) ni hors de combat (badge ☠ déjà présent). */
  _lifeGauge(r) {
    if (r.down) return "";
    return CardRenderer.lifeBar(r.gauge);
  },

  /** Item de menu ⋯ « Renvoyer » (T6b) pour un combattant esprit/sprite : la
      cible est connue (cette ligne), le lanceur est choisi via SummonPanel.
      Gated sur le verbe motorisé de l'édition (banishSkill / decompileSkill) —
      `null` sinon (ligne chair, PJ ad-hoc, hors de combat, édition narrative). */
  _dismissMenuItem(r) {
    const p = r.pnj;
    if (!p || p._adhoc || r.down) return null;
    const ed = App.getEditionModule(p.edition);
    if (p.type === "spirit" && ed && ed.banishSkill)
      return { attrs: `data-action="banish-combatant" data-id="${r.pnjId}"`, label: "Bannir (esprit adverse)", glyph: "✦" };
    if (p.type === "sprite" && ed && ed.spriteModel && ed.spriteModel.decompileSkill)
      return { attrs: `data-action="decompile-combatant" data-id="${r.pnjId}"`, label: "Décompiler (sprite adverse)", glyph: "◈" };
    return null;
  },

  /** Badge « hors de combat » (Vague D), partagé ordonné/narratif. */
  _downBadge() {
    return `<span class="encounter-down-badge status is-danger is-filled" title="Moniteur plein — hors de combat">☠ Hors de combat</span>`;
  },

  /** Badge « action retardée » (Vague C) : le combattant tient son tour. */
  _delayedBadge() {
    return `<span class="encounter-delayed-badge status is-info is-filled" title="Action retardée — tient son tour">⏸ En attente</span>`;
  },

  /** Bandeau de moral (Vague D) : ⚑ « Devrait fuir » (règle de l'édition) ou
      « Moral fragile — à tester » (SR6, cases > Professionnalisme), avec le
      raccourci facultatif « Faire fuir ». Rien si hors combat, moral stable ou
      absent (ex. PJ, Anarchy 1). Partagé ordonné/narratif. */
  _moraleBanner(r) {
    if (r.down || !r.morale || r.morale === "steady") return "";
    const shaky = r.morale === "shaky";
    const label = shaky ? "Moral fragile — à tester" : "Devrait fuir";
    return `<div class="cluster encounter-flee">
      <span class="encounter-flee-tag status ${shaky ? "is-info" : "is-warning"} is-filled" title="Selon la règle de moral de l'édition">⚑ ${label}</span>
      <button class="btn-small encounter-flee-act" data-action="flee-combatant" data-id="${r.pnjId}" title="Retirer ce combattant (fuite)">Faire fuir</button>
    </div>`;
  },

  _row(r, isActive, outOfPass, effectiveInit, compact) {
    const { pnjId, init, hasActed, note, pnj } = r;
    const isMatrix = r.kind === "matrix";
    const initVal = init == null ? "" : String(init);
    // Vague B : la note ne s'affiche en 2ᵉ ligne que si remplie ; sinon elle est
    // masquée (déclutter) et révélée à la demande via « ✎ Note » du menu ⋯.
    const hasNote = !!(note && note.trim());
    // Même calcul générique que sur la fiche (Utils.woundMalus),
    // affiché ici pour que le malus soit visible sans rouvrir la carte. Une CI
    // n'a pas de moniteur chair → pas de malus de blessure.
    const malus = isMatrix ? 0 : Utils.woundMalus(pnj, pnj.edition);
    const malusHtml =
      malus > 0
        ? `<span class="wound-malus-badge status is-danger" title="Malus de blessure automatique (déjà appliqué à l'initiative)">−${malus}D</span>`
        : "";
    const { alias, family, full } = Utils.parseName(pnj.name);
    const name = Utils.escHtml(alias || family || full);
    // PJ : avatar constant avant le nom — couleur + anneau + initiale du
    // joueur (CardRenderer._pcAvatar), jamais un indice isolé.
    const colorDot = r.isPJ ? CardRenderer._pcAvatar(pnj) : "";
    // Nom : bouton « voir la fiche » pour une entité résolvable ou une CI (qui
    // ouvre le tiroir Matrice) ; span inerte pour un PJ ad-hoc (pas de fiche).
    // Nom compact affiché (alias/famille) ; le span inerte (pas d'autre
    // affordance) porte le nom complet en title, le bouton garde son intitulé
    // d'action existant (title = geste, pas le nom).
    const nameHtml =
      pnj._adhoc && !isMatrix
        ? `<span class="encounter-name is-pj" title="${Utils.escHtml(full)}">${colorDot}${name}</span>`
        : `<button class="encounter-name" data-action="focus-combatant" data-id="${pnjId}" title="${isMatrix ? "Ouvrir la Matrice" : "Voir la fiche"}">${colorDot}${name}</button>`;
    // Score effectif de la passe (SR5, à partir de la passe 2) : le champ de
    // saisie reste sur la base (c'est elle que set-init modifie), le décrément
    // est affiché à côté plutôt qu'en remplacement.
    const effHtml =
      effectiveInit != null
        ? `<span class="encounter-init-eff${effectiveInit <= 0 ? " spent" : ""}" title="Score effectif en passe courante (base − décrément)">→ ${effectiveInit}</span>`
        : "";

    // CH combat (Vague A) : ligne 2 étages responsive. Le jeton d'init ne porte
    // plus que le score (base + malus + score effectif de passe) ; les verbes
    // fréquents (✓/↩ ⚄ ⏸/▶) restent en chips inline, la gestion rare (▲▼✎☠✚✕)
    // vit derrière le menu ⋯ canonique .card-menu (_rowMenu).
    // Vague D : hors de combat → jeton d'init remplacé par « — » (init retirée)
    // + badge ; « devrait fuir » → bandeau de moral avec action « Faire fuir ».
    // Vague B : steppers ±1 autour du champ (ajuster une init lancée sans
    // convoquer le clavier). Pas de re-tri → la ligne ne saute pas.
    const initZone = r.down
      ? `<div class="stack encounter-init is-out"><span class="encounter-init-out" title="Hors de combat — sans initiative">—</span></div>`
      : `<div class="stack encounter-init">
        <div class="cluster encounter-init-main">
          <button class="encounter-init-step" data-action="init-step" data-delta="-1" data-id="${pnjId}" title="Initiative −1" aria-label="Diminuer l'initiative">−</button>
          <input class="encounter-init-val" type="text" inputmode="numeric" data-action="set-init" data-id="${pnjId}"
            ${r.isPJ ? 'data-pj="1"' : ""}
            value="${initVal}" placeholder="—" title="Initiative (base) — saisie directe" aria-label="Initiative">
          <button class="encounter-init-step" data-action="init-step" data-delta="1" data-id="${pnjId}" title="Initiative +1" aria-label="Augmenter l'initiative">+</button>
        </div>
        ${malusHtml}
        ${effHtml}
      </div>`;
    // Verbes du tour (fréquents) en chips inline lisibles à toutes tailles
    // de pointeur ; le reste (réordre, note, hors de combat, réinitialiser,
    // retirer) derrière le menu ⋯ canonique.
    const actedChip = `<button class="chip encounter-chip encounter-acted-toggle${hasActed ? " is-done" : ""}" data-action="toggle-acted" data-id="${pnjId}" title="${hasActed ? "Marquer « pas encore joué »" : "Marquer « a joué »"}" aria-label="${hasActed ? "Marquer comme pas encore joué" : "Marquer comme a joué"}">${hasActed ? "↩" : "✓"}</button>`;
    const rollChip = `<button class="chip encounter-chip" data-action="roll-init" data-id="${pnjId}" title="Lancer l'initiative" aria-label="Lancer l'initiative">⚄</button>`;
    const delayChip = r.down
      ? ""
      : r.delayed
        ? `<button class="chip encounter-chip" data-action="act-now-combatant" data-id="${pnjId}" title="Agir maintenant" aria-label="Agir maintenant">▶</button>`
        : `<button class="chip encounter-chip" data-action="delay-combatant" data-id="${pnjId}" title="Retarder l'action (tenir son tour)" aria-label="Retarder l'action">⏸</button>`;
    // `glyph` : icône monochrome pour la barre dépliée de l'actif (_leadAction
    // Bar, une seule ligne comme les chips) ; `label` reste le texte du menu ⋯
    // (lignes en attente/hors-combat) et le title/aria-label de l'icône.
    const menuItems = [
      { attrs: `data-action="move-up" data-id="${pnjId}"`, label: "Monter dans l'ordre", glyph: "↑" },
      { attrs: `data-action="move-down" data-id="${pnjId}"`, label: "Descendre dans l'ordre", glyph: "↓" },
      hasNote ? null : { attrs: `data-action="note-toggle" data-id="${pnjId}"`, label: "Ajouter une note", glyph: "✎" },
      pnj._adhoc || r.down
        ? null
        : { attrs: `data-action="knockout-combatant" data-id="${pnjId}"`, label: "Hors de combat", glyph: "☠" },
      pnj._adhoc
        ? null
        : { attrs: `data-action="heal-combatant" data-id="${pnjId}"`, label: "Réinitialiser les moniteurs", glyph: "⛨" },
      this._dismissMenuItem(r),
      { attrs: `data-action="remove-combatant" data-id="${pnjId}"`, label: "Retirer du combat", danger: true, glyph: "✕" },
    ].filter(Boolean);
    // La ligne PLEINE de l'actif (isActive, pas hors-combat) est le combattant
    // EN FOCUS : elle a de la place sous sa jauge de vie → ses actions rares
    // (celles derrière le ⋯ des lignes en attente) y sont DÉPLIÉES en un petit
    // tableau de bord, et le ⋯ disparaît de cette ligne. Les lignes compactes
    // (en attente) et hors-combat gardent le menu ⋯.
    const isLead = isActive && !r.down;
    return `<div class="cluster encounter-row${isMatrix ? " is-matrix" : ""}${isActive ? " active-turn" : ""}${compact ? " compact" : ""}${hasActed ? " has-acted" : ""}${outOfPass ? " out-of-pass" : ""}${r.down ? " down" : ""}${r.delayed && !r.down ? " delayed" : ""}" data-id="${pnjId}">
      ${initZone}
      <div class="stack encounter-main">
        <div class="cluster encounter-name-row">
          ${isActive ? `<span class="encounter-active-flag" title="Tour actif" aria-label="Tour actif"><svg class="icon icon-sm" aria-hidden="true"><use href="#ic-chevron"></use></svg></span>` : ""}
          <span class="encounter-kind">${this._kindLabel(r)}</span>
          ${nameHtml}
          ${r.down ? this._downBadge() : ""}
          ${!r.down && r.delayed ? this._delayedBadge() : ""}
          ${this._rowStatuses(pnj)}
        </div>
        ${this._lifeGauge(r)}
        ${this._moraleBanner(r)}
        <input type="text" class="encounter-note${hasNote ? "" : " is-empty"}" placeholder="Note…" value="${Utils.escHtml(note || "")}"
          data-action="set-note" data-id="${pnjId}">
      </div>
      <div class="cluster encounter-controls">
        ${actedChip}
        ${rollChip}
        ${delayChip}
        ${isLead
          ? this._leadActionBar(menuItems.filter((a) => !/data-action="move-(up|down)"/.test(a.attrs)))
          : this._rowMenu(menuItems)}
      </div>
    </div>`;
  },

  /** Jeton compact de la réglette (ordonné) : init + nom tronqué, mêmes
      classes d'état que la ligne complète, mêmes tap-actions (focus-combatant,
      comme le nom de la ligne) — rien de nouveau côté contrôleur. */
  _token(r, isActive, outOfPass) {
    const { pnjId, init, pnj } = r;
    const isMatrix = r.kind === "matrix";
    const { alias, family, full } = Utils.parseName(pnj.name);
    const name = Utils.escHtml(alias || family || full);
    const fullName = Utils.escHtml(full);
    const avatar = r.isPJ ? CardRenderer._pcAvatar(pnj) : "";
    const initLabel = r.down ? "—" : r.delayed ? "⏸" : init == null ? "·" : String(init);
    const cls = [
      "stack",
      "encounter-token",
      isMatrix && "is-matrix", // canal --accent2 (jeton CI)
      isActive && "active-turn",
      r.hasActed && "has-acted",
      outOfPass && "out-of-pass",
      r.down && "down",
      r.delayed && !r.down && "delayed",
    ]
      .filter(Boolean)
      .join(" ");
    // Une CI matricielle est _adhoc mais reste tappable (focusCombatant
    // ouvre le tiroir Matrice, pas une fiche de pool).
    const tappable = isMatrix || !pnj._adhoc;
    const action = tappable ? ` data-action="focus-combatant" data-id="${pnjId}"` : "";
    const tag = tappable ? "button" : "div";
    return `<${tag} class="${cls}"${action} title="${fullName}">
      <span class="encounter-token-init">${initLabel}</span>
      <span class="encounter-token-name">${avatar}${name}</span>
    </${tag}>`;
  },

  /** Jeton narratif (Anarchy) : puce/✓ au lieu d'une init. Le jeton ENTIER
      met le combattant en focus (data-action="focus-active", même geste
      dominant que _rowNarrative) — la puce ✓/• est un contrôle dédié imbriqué
      (data-action="narrative-toggle", gagne via closest() sur le tap précis)
      pour marquer « joué » sans changer le focus. Avant ce split, la réglette
      compacte (seule vue dispo sous 640px en mode rail) ne posait QUE
      narrative-toggle : aucune affordance mobile pour choisir le PNJ actif. */
  _tokenNarrative(r) {
    const { pnjId, hasActed, pnj } = r;
    const { alias, family, full } = Utils.parseName(pnj.name);
    const name = Utils.escHtml(alias || family || full);
    const fullName = Utils.escHtml(full);
    const avatar = r.isPJ ? CardRenderer._pcAvatar(pnj) : "";
    const isFocused = pnjId === this._narrativeFocusId;
    const cls = [
      "stack",
      "encounter-token",
      hasActed && "has-acted",
      r.down && "down",
      isFocused && "active-turn",
    ]
      .filter(Boolean)
      .join(" ");
    return `<div class="${cls}" data-action="focus-active" data-id="${pnjId}" role="button" tabindex="0" aria-current="${isFocused ? "true" : "false"}" title="Toucher pour voir ses actions">
      <button type="button" class="encounter-token-init" data-action="narrative-toggle" data-id="${pnjId}" aria-pressed="${hasActed}" title="Marquer « joué »">${hasActed ? "✓" : "•"}</button>
      <span class="encounter-token-name">${avatar}${name}</span>
    </div>`;
  },

  /** Filtre de recherche du picker. Conservé côté renderer, comme
      _activeCardId : c'est de l'état de vue éphémère (le texte tapé dans le
      champ du picker), pas une préférence du contrôleur. Ré-appliqué après
      chaque reconstruction du panneau pour survivre aux _commit (ajout/
      retrait d'un combattant). */
  _pickerQuery: "",

  /** Panneau d'ajout : PJ manuel + champ de filtre + entités résolvables non
      encore en scène (générées, Ombres, spiders) + serveurs (porte 1 de
      liaison Matrice — même panneau, destination différente : state.serverId
      plutôt qu'un combattant). candidates: [pnj], servers: [srv]. */
  renderPicker(candidates, servers) {
    const panel = document.getElementById("encounter-add-panel");
    if (!panel) return;

    const rows = candidates
      .map((p) => {
        const kind = this._kindLabel({ pnj: p });
        // data-name = clé de recherche normalisée (jamais affichée).
        const norm = Utils.escHtml(Utils.searchNorm((p.name || "") + " " + kind));
        return `<button class="cluster encounter-candidate" data-action="add-candidate" data-id="${p.id}" data-name="${norm}">
          <span class="encounter-kind">${kind}</span>
          <span class="encounter-candidate-name">${Utils.escHtml(p.name || "Sans nom")}</span>
          <span class="encounter-candidate-add">＋</span>
        </button>`;
      })
      .join("");

    const serverRows = (servers || [])
      .map((s) => {
        const norm = Utils.escHtml(Utils.searchNorm((s.name || "") + " serveur"));
        return `<button class="cluster encounter-candidate" data-action="link-server" data-id="${s.id}" data-name="${norm}">
          <span class="encounter-kind">Serveur</span>
          <span class="encounter-candidate-name">${Utils.escHtml(s.name || "Sans nom")}</span>
          <span class="encounter-candidate-add">⚡</span>
        </button>`;
      })
      .join("");

    panel.innerHTML = `<div class="encounter-add-actions">
        <button class="btn-secondary btn-small" data-action="add-team" title="Toute l'équipe active (désignée dans Personnages), moins ceux déjà en scène">＋ Équipe</button>
        <button class="btn-secondary btn-small" data-action="add-pj">＋ Ajouter un PJ</button>
        <button class="btn-secondary btn-small" data-action="add-adhoc" title="Ligne jetable : nom + compteur libre (ALARME, la bombe, renforts…) — non enregistrée dans les personnages">＋ Ligne libre</button>
        <button class="btn-secondary btn-small" data-action="add-ic" title="Ajouter une CI comme combattante (initiative du livre, moniteur, jets) — sans monter de serveur">＋ CI</button>
        <input type="search" class="encounter-picker-search" data-action="filter-candidates"
          placeholder="Filtrer par nom ou type…" value="${Utils.escHtml(this._pickerQuery || "")}"
          aria-label="Filtrer les combattants à ajouter">
      </div>
      <div class="stack encounter-candidates">
        ${rows}${serverRows}
        ${
          rows || serverRows
            ? ""
            : `<div class="empty-state"><span class="empty-state-title">Aucune entité disponible</span>Générez ou sauvegardez des PNJ, créatures ou esprits pour les ajouter ici.</div>`
        }
        <div class="encounter-picker-empty empty-state" style="display:none"><span class="empty-state-title">Aucun résultat</span>Aucune entité ne correspond à ce filtre.
          <button type="button" class="btn-secondary btn-small empty-state-cta" data-action="clear-picker-filter">Effacer les filtres</button>
        </div>
      </div>`;

    if (this._pickerQuery) this._applyPickerFilter();
  },

  /** Rafale d'init après « + Équipe » — focus le premier champ d'init PJ
      encore vide (`:placeholder-shown` ⇔ valeur vide, pas de calcul JS pour
      le détecter). Mode narratif Anarchy : aucun `[data-pj]` n'existe (pas
      d'init), le sélecteur ne trouve rien → no-op silencieux. */
  focusNextPJInit() {
    const input = document.querySelector('.encounter-init-val[data-pj="1"]:placeholder-shown');
    if (input) input.focus();
  },

  /** Filtre le picker sans reconstruire le DOM (préserve le focus du champ).
      Appelé par Encounter sur l'event input du champ de recherche. */
  filterCandidates(query) {
    this._pickerQuery = query || "";
    this._applyPickerFilter();
  },

  /** Masque les candidats hors filtre via style.display inline — la règle
      auteur .encounter-candidate{display:flex} l'emporterait sur [hidden]. */
  _applyPickerFilter() {
    const panel = document.getElementById("encounter-add-panel");
    if (!panel) return;
    const words = Utils.searchNorm(this._pickerQuery).trim().split(/\s+/).filter(Boolean);
    let shown = 0;
    const cands = panel.querySelectorAll(".encounter-candidate");
    cands.forEach((btn) => {
      const hay = btn.dataset.name || "";
      const match = !words.length || words.every((w) => hay.includes(w));
      btn.style.display = match ? "" : "none";
      if (match) shown++;
    });
    const emptyEl = panel.querySelector(".encounter-picker-empty");
    if (emptyEl) emptyEl.style.display = cands.length && !shown ? "" : "none";
  },

  /** id du combattant dont la fiche est actuellement affichée à côté du
      tracker — permet de ne reconstruire la card qu'au changement de tour,
      pas à chaque commit (note éditée, coche « a joué », etc.). Les mises
      à jour de stats en cours de combat (jet, dégâts) restent gérées par
      le rafraîchissement global existant : CardRenderer.refresh(pnj),
      déjà appelé partout où un pnj est modifié (cf. DiceRoller onPnjChanged
      dans app.js), retrouve cette card via son data-id comme les autres. */
  _activeCardId: null,

  /** Polish DA « deux températures » : mode de la fiche active au dernier rendu
      (agir | react | matrix | null). Sert à n'animer la bascule fiche↔rack qu'au
      CHANGEMENT de mode, jamais aux refresh de même mode (sinon flicker). */
  _activeMode: null,

  resetActiveCard() {
    this._activeCardId = null;
    const box = document.getElementById("encounter-active-card");
    if (!box) return;
    box.hidden = true;
    box.innerHTML = "";
  },

  /** Contenu du wrapper live `.encounter-active-top` (rafraîchi à chaque
      `_render()`, indépendant du cache `_activeCardId`) : tout ce qui doit
      rester à jour au fil du tour sans re-rendre la fiche complète — bandeau
      d'état, pont decker→scène, appareils matriciels, duel
      decker↔decker. */
  _activeTop(r, state) {
    // V7 Lot 4 — le BRICKAGE a quitté Agir : une arme brickée, le PNJ la SUBIT
    // (le PJ decker l'attaque à SON tour) → le bloc 🔌 vit dans la console
    // Réagir (_reactDevices). Le duel decker↔decker RESTE ici : c'est l'offense
    // d'un PNJ decker à son propre tour.
    return (
      this._activeBandeau(r) +
      this._activeDeckerLink(r, state) +
      this._deckerDuel(r, state)
    );
  },

  /** Bandeau d'état au-dessus de la fiche active : hors de
      combat/retardé/devrait fuir — mêmes badges que la ligne (_downBadge,
      _delayedBadge, _moraleBanner), rien de nouveau. Vide si le combattant
      est dans un état stable (cas le plus fréquent). */
  _activeBandeau(r) {
    const shaky = r.morale && r.morale !== "steady" && !r.down;
    if (!r.down && !r.delayed && !shaky) return "";
    return `<div class="stack encounter-active-badges">
      ${r.down ? this._downBadge() : ""}
      ${!r.down && r.delayed ? this._delayedBadge() : ""}
      ${this._moraleBanner(r)}
    </div>`;
  },

  /** Pont entre le ciblage personnel d'un runner (DeckRun.target,
      cf. cyberdeckrenderer.js / personarenderer.js) et la Matrice
      contextuelle de la scène (Encounter.state.serverId). Le bloc
      matriciel du combattant actif affiche déjà sa cible (CardRenderer.render
      → Cyberdeck/PersonaRenderer.block) ; cette ligne ne fait qu'offrir de la
      promouvoir en un tap si elle diffère du serveur déjà lié — réutilise
      linkServer, aucune donnée neuve. Gate host-générique (DeckRun._host) : un
      technomancien ciblant un serveur (persona.run) le promeut comme un
      decker (T6a). */
  _activeDeckerLink(r, state) {
    if (!r.pnj || r.pnj._adhoc || !DeckRun._host(r.pnj)) return "";
    const targetId = DeckRun.target(r.pnj);
    if (!targetId || targetId === state.serverId) return "";
    const srv = Servers.find(targetId);
    if (!srv) return "";
    return `<div class="stack encounter-active-badges">
      <button class="btn-secondary btn-small" data-action="link-server" data-id="${srv.id}" title="Lier ${Utils.escHtml(srv.name)} à la scène">🔗 Lier ${Utils.escHtml(srv.name)} à la scène</button>
    </div>`;
  },

  /** « Appareils matriciels » — les armes du combattant deviennent des
      cibles brickables. Vit dans le wrapper live `.encounter-active-top` (posé
      par le pont decker), donc rafraîchi à chaque `_render()` (appliquer des dégâts au même
      tour se voit immédiatement). Trois garde-fous, dans l'ordre :
      1. régime d'édition via Matrix.deviceBricking() — "monitor" (SR5/SR6) /
         "narrative" (A2) / null (A1, rien) — jamais un `if (App.edition)` ;
      2. gate contexte Matrice (Silk) : rien hors d'une scène Matrice (serveur
         lié OU un decker présent) — un flingue n'est une cible que si la
         Matrice est en jeu ;
      3. au moins une arme (ItemResolver, même extraction que la carte).
      L'état vit sur l'entrée combattant `r.devices` (= `c.devices`, copié par
      `_rows`), scène-scopé — cf. Encounter.targetDevice. */
  /** V7 Lot 4 — appareils matriciels CIBLABLES dans la console Réagir : au tour
      d'un PJ (souvent le decker), les armes connectées des PNJ qui réagissent
      deviennent des cibles de brickage (le PNJ les SUBIT). Un bloc 🔌 unique,
      groupé par propriétaire, après les lignes de réaction. Reprend le régime
      d'édition (Matrix.deviceBricking()==="monitor", jamais un `if App.edition`),
      le gate contexte Matrice (Silk), l'exclusion des mains nues (deviceConnected)
      et l'état scène-scopé r.devices — exactement l'ancien _activeDevices, mais
      itéré sur les combattants qui réagissent au lieu de l'actif. */
  _reactDevices(targets, state) {
    if (!this._matrixSceneActive(state)) return "";
    const blocks = [];
    for (const r of targets) {
      const pnj = r.pnj;
      if (!pnj || pnj._adhoc) continue;
      if (Matrix.use(pnj.edition).deviceBricking() !== "monitor") continue;
      // R1d : mains nues exclues des cibles matricielles (Matrix.deviceConnected).
      const weapons = ItemResolver.splitEquip(pnj.equip).weapons.filter((w) => Matrix.deviceConnected(w));
      if (!weapons.length) continue;
      const devices = r.devices || {};
      const protectors = this._deckersInScene(state, pnj.id);
      const rows = weapons.map((w) => this._deviceRow(pnj, w, devices[w], protectors)).join("");
      blocks.push(`<div class="encounter-device-owner">${Utils.escHtml(pnj.name || "")}</div>${rows}`);
    }
    if (!blocks.length) return "";
    return `<div class="stack encounter-devices encounter-react-devices">
      <div class="encounter-devices-lbl">🔌 Appareils matriciels ciblables — le decker les brique</div>
      ${blocks.join("")}
    </div>`;
  },

  /** Deckers présents dans la scène (PNJ avec `cyberdeck`), hors un id
      donné — candidats « protecteur » (Firewall pour un allié) et cibles
      du duel decker↔decker. Partagé par les deux usages. */
  _deckersInScene(state, excludePnjId) {
    const out = [];
    for (const c of state.combatants) {
      if (c.pnjId === excludePnjId) continue;
      const p = PnjLookup.find(c.pnjId);
      if (p && p.cyberdeck) out.push(p);
    }
    return out;
  },

  /** Decker↔decker — attaquer un autre decker, c'est attaquer son propre
      `pnj.cyberdeck` (déjà modélisé, moniteur + toggle-deck-monitor déjà
      câblés sur sa carte). Zéro état neuf : un sélecteur éphémère (lu au clic,
      jamais persisté) + `⚔ Piratage` réutilisant Cyberdeck.rollAttack tel
      quel. Visible seulement si le combattant actif est lui-même decker ET
      qu'au moins un AUTRE decker CIBLABLE est présent dans la scène — combat
      uniquement (hors combat, « quel autre decker viser » n'a pas de sens).
      Cible filtrée sur `Cyberdeck.monitorSize` non nul (SR5/SR6) : Anarchy
      2.0 n'a pas de moniteur de deck propre (biofeedback → Volonté), donc
      rien où appliquer les dégâts — exclu explicitement, pas par accident (le
      combat A2 est de toute façon narratif, sans fiche active, mais ce garde
      reste correct si cette hypothèse change un jour). */
  _deckerDuel(r, state) {
    const pnj = r.pnj;
    if (!pnj || pnj._adhoc || !pnj.cyberdeck) return "";
    const targets = this._deckersInScene(state, pnj.id).filter(
      (t) => Cyberdeck.monitorSize(t.edition, t.cyberdeck) != null,
    );
    if (!targets.length) return "";
    const esc = Utils.escHtml;
    const options = targets.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join("");
    return `<div class="cluster encounter-duel">
      <span class="encounter-devices-lbl">Duel decker↔decker</span>
      <select class="encounter-duel-select" aria-label="Decker ciblé">${options}</select>
      <button class="react-btn" data-action="decker-attack" data-id="${pnj.id}" title="Piratage contre ce decker (dégâts : cases de son propre moniteur de deck)"><svg class="icon icon-sm" aria-hidden="true"><use href="#ic-combat"></use></svg> Piratage</button>
    </div>`;
  },

  /** Une scène est « Matrice active » (Silk : gate d'affichage du brickage) si
      un serveur est lié OU un decker (PNJ avec cyberdeck) est présent — hors de
      ce contexte, une arme n'est pas une cible matricielle. Partagé par la
      fiche active (SR5/SR6) et la bande narrative (A2). */
  _matrixSceneActive(state) {
    if (state.serverId) return true;
    return state.combatants.some((c) => {
      const p = PnjLookup.find(c.pnjId);
      return p && p.cyberdeck;
    });
  },

  /** Bande « Appareils matriciels » pour le tracker NARRATIF (Anarchy 2 :
      pas de fiche active où loger le brickage). Liste tous les combattants
      armés d'un coup (utile au MJ : « quel Smartgun est encore actif ? ») avec
      une bascule « hors service » en un tap par arme (régime narratif : ni
      moniteur, ni indice — le verbe est au livre A2 p.210, sans chiffre).
      Même gate contexte Matrice que la fiche active. Vide (donc masquée) hors
      scène Matrice ou si l'édition n'a pas le régime narratif. */
  _narrativeDevices(rows, state) {
    const mod = App.editionModule;
    if (!mod || !mod.matrixModel || mod.matrixModel.deviceBricking !== "narrative") return "";
    if (!this._matrixSceneActive(state)) return "";
    const esc = Utils.escHtml;
    const blocks = rows
      .filter((r) => r.pnj && !r.pnj._adhoc)
      .map((r) => {
        // R1d : mains nues exclues, même prédicat que _activeDevices.
        const weapons = ItemResolver.splitEquip(r.pnj.equip).weapons.filter((w) => Matrix.deviceConnected(w));
        if (!weapons.length) return "";
        const devices = r.devices || {};
        const protectors = this._deckersInScene(state, r.pnj.id);
        const chips = weapons
          .map((w) => {
            const bricked = !!(devices[w] && devices[w].bricked);
            const idAttrs = `data-id="${r.pnj.id}" data-label="${esc(w)}"`;
            const toggle = `<button class="react-btn${bricked ? " is-off" : ""}" data-action="device-narrative-toggle" ${idAttrs} title="${bricked ? "Réparer" : "Rendre hors service"}">${esc(w)}${bricked ? " — hors service" : ""}</button>`;
            // La protection peut être posée sur une arme jamais encore
            // ciblée (pas de bouton « Bricker » séparé en narratif) — d peut
            // être absent, _deviceProtection le traite comme non protégé.
            return `<span class="encounter-ndevice-chip">${toggle}${this._deviceProtection(r.pnj, w, devices[w] || {}, protectors)}</span>`;
          })
          .join("");
        return `<div class="cluster encounter-ndevice-row">
          <span class="encounter-ndevice-owner">${esc(r.pnj.name || "")}</span>
          <span class="cluster encounter-ndevice-chips">${chips}</span>
        </div>`;
      })
      .join("");
    if (!blocks) return "";
    return `<div class="stack encounter-devices encounter-ndevices">
      <div class="encounter-devices-lbl">Appareils matriciels — touchez une arme pour la rendre hors service</div>
      ${blocks}
    </div>`;
  },

  /** Une ligne « appareil » (arme) sur la fiche active (SR5/SR6, mode moniteur).
      Le régime narratif (Anarchy 2) ne passe jamais ici : sa combativité n'a
      pas de fiche active (renderActiveCard sort tôt) — il a sa propre bande,
      _narrativeDevices, dans la liste. `protectors` : deckers candidats
      pour protéger cet appareil de leur Firewall (liste déjà exclue de son
      propriétaire, cf. _deckersInScene) — vide si aucun protecteur possible. */
  _deviceRow(pnj, label, d, protectors) {
    const esc = Utils.escHtml;
    const el = esc(label);
    const idAttrs = `data-id="${pnj.id}" data-label="${el}"`;
    if (!d) {
      return `<div class="cluster encounter-device-row">
        <span class="encounter-device-name">${el}</span>
        <button class="react-btn" data-action="target-device" ${idAttrs}>Bricker</button>
      </div>`;
    }
    // R1d : geste explicite pour sortir du brickage sans retirer le suivi de
    // l'appareil (untarget-device fait ça, mais oublie l'indice réglé) —
    // Encounter.reenableDevice remet le moniteur à zéro.
    const brickedBadge = d.bricked
      ? `<span class="encounter-device-bricked">hors service</span>
      <button class="react-btn" data-action="reenable-device" ${idAttrs} title="Remettre en marche">Remettre en marche</button>`
      : "";
    const untarget = `<button class="react-btn" data-action="untarget-device" ${idAttrs} title="Retirer la cible" aria-label="Retirer la cible">✕</button>`;
    const size = Matrix.use(pnj.edition).icMonitorSize(d.indice);
    const boxes = Array.from({ length: size }, (_, i) => {
      const filled = i < (d.filled || 0);
      const penalty = (i + 1) % 3 === 0;
      return `<div class="monitor-box${filled ? " filled" : ""}${penalty ? " penalty" : ""}" data-action="device-box" ${idAttrs} data-idx="${i}"></div>`;
    }).join("");
    const rating = `<span class="encounter-device-rating" title="Indice d'appareil (défaut 2 « Moyen »)">
      <button class="btn-icon-tiny" data-action="device-rating-step" data-delta="-1" ${idAttrs} aria-label="Indice −1">−</button>
      Ind. ${d.indice}
      <button class="btn-icon-tiny" data-action="device-rating-step" data-delta="1" ${idAttrs} aria-label="Indice +1">＋</button>
    </span>`;
    return `<div class="cluster encounter-device-row${d.bricked ? " is-bricked" : ""}">
      <span class="encounter-device-name">${el}</span>
      ${rating}
      <div class="cluster monitor-boxes">${boxes}</div>
      ${brickedBadge}${untarget}
      ${this._deviceProtection(pnj, label, d, protectors)}
    </div>`;
  },

  /** Firewall pour un allié — badge + jet de défense une fois protégé,
      sinon picker « Protéger » (SR5 p.236 PAN/esclave, SR6 approximé). Rien
      si aucun autre decker n'est présent dans la scène pour protéger. */
  _deviceProtection(pnj, label, d, protectors) {
    if (!protectors || !protectors.length) return "";
    const esc = Utils.escHtml;
    const idAttrs = `data-id="${pnj.id}" data-label="${esc(label)}"`;
    if (!d.protectorId) {
      const options = protectors.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("");
      return `<span class="encounter-device-protect">
        <select class="encounter-device-protector-select" aria-label="Decker protecteur">${options}</select>
        <button class="react-btn" data-action="device-protect" ${idAttrs} title="Ce decker protège l'appareil de son Firewall">🛡️ Protéger</button>
      </span>`;
    }
    const protector = PnjLookup.find(d.protectorId);
    const protectorName = protector ? esc(protector.name) : "?";
    return `<span class="encounter-device-protect">
      <span class="encounter-device-protector-badge status is-accent">🛡️ ${protectorName}</span>
      <button class="react-btn" data-action="device-defense" ${idAttrs}>Défense</button>
      <button class="react-btn" data-action="device-unprotect" ${idAttrs} title="Retirer la protection" aria-label="Retirer la protection">✕</button>
    </span>`;
  },

  /** Bandeau « économie du tour » — regroupe Atout (SR6) et budget
      d'actions, les deux organes de portée « tour » (par opposition aux
      ressources de scène, Bruit/Menace). Posé dans le wrapper live
      `.encounter-active-economy` (voir renderActiveCard), rafraîchi à chaque
      `_render()` comme `.encounter-active-top` — corrige le bug où un tap sur
      un jeton ne se voyait qu'au tour suivant (jetons hors du wrapper live
      auparavant). Ancrage futur : nature « +1 action » des Points d'Anarchy
      (Pass C, différée). */
  _activeEconomy(r, model) {
    const edgeHtml = model && model.edgeTracker ? this._activeEdge(r) : "";
    const anarchyHtml = model && model.anarchyPoints ? this._activeAnarchy(r) : "";
    const actionsHtml = App.editionModule && App.editionModule.actionBudget ? this._activeActions(r) : "";
    // ⚠ F5c — la rangée de munitions a QUITTÉ le cockpit. Elle dupliquait
    // l'arme sous les actions et multipliait les points d'entrée : le mode de
    // tir se choisissait ici, le jet partait des blocs d'offense, l'Atout d'un
    // troisième endroit. Tout cela vit maintenant dans le panneau pré-jet,
    // ouvert par le tap sur l'arme elle-même — un geste, un écran, un débit.
    if (!edgeHtml && !anarchyHtml && !actionsHtml) return "";
    return `<div class="encounter-economy">${edgeHtml}${anarchyHtml}${actionsHtml}</div>`;
  },

  /** Rangée Points d'Anarchy (Anarchy 2.0) : compteur de scène par combattant,
      stocké dans l'entrée de scène (c.anarchyPoints) — pas sur le PNJ (propre
      à la scène, repart à zéro à la scène suivante). Jumelle de _activeEdge.
      « ⟳ Crédit de scène » ajoute d'un coup le montant octroyé par les atouts/
      drogues actives (AnarchyAtouts), une seule fois (c.anarchyCredited). Le
      bouton « +1 action/narration » (quand un atout l'octroie) BASCULE le
      bonus de tour (c.narrationBonus, Encounter.grantNarrationAction) — lu par
      _activeActions pour ajouter un jeton d'action réel, remis à zéro au tour
      suivant (geste MANUEL : le MJ seul sait quand une narration le mérite). */
  _activeAnarchy(r) {
    const ap = r.anarchyPoints || 0;
    const atouts = r.pnj ? AnarchyAtouts.collect(r.pnj) : null;
    const grant = atouts ? atouts.anarchyPerScene : 0;
    const credited = !!r.anarchyCredited;
    const creditBtn =
      grant > 0
        ? `<button class="btn-icon-tiny encounter-anarchy-credit" data-action="anarchy-credit" data-id="${r.pnjId}"${credited ? " disabled" : ""} title="${credited ? "Points de scène déjà crédités" : `Créditer +${grant} (atouts/drogues actives) pour cette scène`}" aria-label="Créditer les Points d'Anarchy de scène">⟳ +${grant}</button>`
        : "";
    const narrationActive = !!r.narrationBonus;
    const narration =
      atouts && atouts.narrationAction
        ? `<button class="encounter-anarchy-narration${narrationActive ? " is-active" : ""}" data-action="narration-bonus" data-id="${r.pnjId}" title="Un atout octroie +1 action par narration — active le bonus pour ce tour" aria-pressed="${narrationActive}">+1 action/narration</button>`
        : "";
    return `<div class="cluster encounter-anarchy" title="Points d'Anarchy de scène (Anarchy 2.0 — atouts p.77, drogues p.159)">
      <span class="encounter-anarchy-lbl">Points d'Anarchy</span>
      <button class="btn-icon-tiny" data-action="anarchy-step" data-delta="-1" data-id="${r.pnjId}" aria-label="Points d'Anarchy −1">−</button>
      <span class="encounter-anarchy-val">${ap}</span>
      <button class="btn-icon-tiny" data-action="anarchy-step" data-delta="1" data-id="${r.pnjId}" aria-label="Points d'Anarchy +1">＋</button>
      ${creditBtn}${narration}
    </div>`;
  },

  /** Rangée Atout (SR6) : compteur de combat 0-7 par combattant, stocké
      dans l'entrée de scène (c.edge) — pas sur le PNJ (l'Atout dépensé/gagné
      est propre à la rencontre). ± via edge-step ; le plafond +2/tour est un
      avertissement non bloquant (Encounter.adjustEdge). */
  _activeEdge(r) {
    const edge = r.edge || 0;
    const tokens = Array.from({ length: 7 }, (_, i) => `<span class="edge-token${i < edge ? " filled" : ""}"></span>`).join("");
    return `<div class="cluster encounter-edge" title="Atout SR6 (max 7, gain +2/tour de personnage — p.50)">
      <span class="encounter-edge-lbl">Atout</span>
      <button class="btn-icon-tiny" data-action="edge-step" data-delta="-1" data-id="${r.pnjId}" aria-label="Atout −1">−</button>
      <span class="cluster edge-tokens" aria-hidden="true">${tokens}</span>
      <span class="encounter-edge-val">${edge}/7</span>
      <button class="btn-icon-tiny" data-action="edge-step" data-delta="1" data-id="${r.pnjId}" aria-label="Atout +1">＋</button>
    </div>`;
  },

  /** Rangée budget d'actions du combattant actif : un groupe par type
      d'action de l'édition (majeure/mineure SR6, simple/complexe/gratuite SR5,
      action Anarchy). Jetons tappables façon moniteur (taper = consommer
      jusque-là ; re-taper le dernier = rendre). Le budget vient d'App.
      editionModule.actionBudget(pnj) ; l'usage est stocké c.actionsUsed.
      Si le MJ a activé le bonus « +1 action/narration » (r.narrationBonus,
      cf. _activeAnarchy), le dernier groupe du budget gagne un jeton
      supplémentaire — extension par état (jamais un `if App.edition`, le
      flag ne s'active que sur les PNJ Anarchy 2.0 dotés de l'atout). */
  _activeActions(r) {
    // E5 — le budget affiché intègre les ÉCHANGES du tour (SR6 p.42) et le
    // bonus de narration. Le calcul vit dans `Encounter.effectiveBudget` et
    // NULLE PART AILLEURS : au lot F1, le contrôleur en a besoin pour dire si
    // une action nommée dépasse le budget, et deux calculs jumeaux auraient
    // fini par diverger (la leçon d'E0).
    const budget = Encounter.effectiveBudget(r.pnjId);
    if (!budget || !budget.length) return "";
    const used = r.actionsUsed || {};
    const groups = budget
      .map((g) => {
        const u = used[g.key] || 0;
        const tokens = Array.from({ length: g.total }, (_, i) => `<span class="action-token${i < u ? " used" : ""}" data-action="action-set" data-key="${g.key}" data-idx="${i}" data-id="${r.pnjId}" title="${Utils.escHtml(g.label)} ${i + 1}"></span>`).join("");
        return `<span class="action-group">
          <span class="action-group-lbl">${Utils.escHtml(g.label)}</span>
          <span class="action-tokens">${tokens}</span>
        </span>`;
      })
      .join("");
    return `<div class="cluster encounter-actions" title="Actions du tour (économie de l'édition — taper pour consommer)">${groups}${this._attackTally(r)}${this._actionTrades(r, budget)}${this._actionPick(r, budget)}${this._activeGrafts(r)}</div>`;
  },

  /* ========================================================
     ATTAQUE PORTÉE (lot G4) — le compte que le livre limite.

     Les deux éditions n'autorisent qu'UNE attaque, pour des raisons qui ne se
     ressemblent pas, et l'app doit dire laquelle :

     · SR5 p.178 — une INTERDICTION explicite, répétée sous chaque action
       d'attaque : « aucune autre action d'attaque durant la même PHASE
       D'ACTION ». L'unité est la phase, donc un combattant à trois passes
       attaque trois fois dans le tour et c'est réglementaire.
     · SR6 p.42 — pas d'interdiction du tout : une ÉCONOMIE. Attaquer coûte la
       majeure, il y en a une. Et le livre nomme lui-même la porte de sortie —
       « 4 actions mineures pour effectuer 1 action majeure (pouvant permettre
       d'effectuer une seconde attaque au cours du même tour) ». C'est même le
       seul exemple qu'il donne de l'échange.

     D'où un repère qui NOMME sa règle au lieu d'asséner « une seule attaque ».
     Et qui ne verrouille rien : le contrôle d'attaque reste tapable, comme la
     puce d'une action au-delà du budget. Le MJ a le droit de savoir qu'il
     déborde et de déborder — garde-fou (e), « informer, jamais décider ».

     ── DEUX ÉTATS, DÉCIDÉS PAR `counted` ───────────────────────────────────
     · `counted: true` (SR5, SR6) — un CATALOGUE d'actions existe, `useAction`
       est l'entonnoir unique du tir comme de la mêlée, donc l'app sait compter.
       Le repère n'apparaît qu'une fois la première attaque portée : c'est un
       fait, et un fait ne s'annonce pas avant d'avoir eu lieu.
     · `counted: false` (Anarchy 1 et 2) — pas de catalogue d'actions, et les
       armes y passent par le panneau de RISQUE, qui ne débite rien. L'app ne
       peut donc PAS compter, et les deux livres définissent en plus l'action
       offensive bien plus largement qu'« un coup de feu » : lancer un sort
       d'effet, engager un cybercombat en sont. Compter ce qu'on voit reviendrait
       à annoncer « 1/1 » à un magicien qui en est à sa troisième action
       offensive. Le cockpit affiche donc la RÈGLE, en permanence et sans
       chiffre — même discipline que les arrêts larges (`halts`), annoncés et
       jamais appliqués.

     Dans les deux cas le repère informe et ne verrouille rien.

     Rien du tout si l'édition ne déclare pas de limite. */
  _attackTally(r) {
    const lim = App.editionModule && App.editionModule.attackLimit;
    if (!lim) return "";
    const regle = [
      `Le livre en autorise ${lim.n} par ${lim.scopeLabel.replace(/^(cette|sa|ce) /, "")} — ${lim.why} (${lim.page})`,
      lim.broad ? `Ce que ça couvre : ${lim.broad}` : "",
      lim.buys ? `Pour en porter une de plus : ${lim.buys}` : "",
    ].filter(Boolean);

    // Éditions qui ne peuvent pas compter : la règle, en clair et en continu.
    if (lim.counted === false) {
      const info = ["Limite d'attaques", ...regle, "L'app ne compte pas : les actions offensives d'Anarchy ne passent pas toutes par le budget. Le suivi vous revient."].join("\n• ");
      return `<span class="attack-tally is-rule" title="${Utils.escHtml(info)}"><span aria-hidden="true">⚔</span> ${lim.n} offensive${lim.n > 1 ? "s" : ""}</span>`;
    }

    const n = r.attacks || 0;
    if (!n) return "";
    const trop = n > lim.n;
    const info = [
      `${n} attaque${n > 1 ? "s" : ""} portée${n > 1 ? "s" : ""} ${lim.scopeLabel}`,
      ...regle,
      trop ? "L'app ne bloque rien : l'arbitrage vous revient." : "",
    ]
      .filter(Boolean)
      .join("\n• ");
    return `<span class="attack-tally${trop ? " is-over" : ""}" title="${Utils.escHtml(info)}"><span aria-hidden="true">⚔</span> ${n}/${lim.n}</span>`;
  },

  /* ========================================================
     RANGÉE DE GREFFONS D'ATOUT (lot F5, restée à brancher jusqu'ici).

     Le lot F5 avait livré les 82 actions d'Atout, leur filtre à trois axes, le
     débit (`edge-use`, déjà dans la délégation) et **le style** de cette
     rangée (`.encounter-grafts`, `.graft-lbl`). Il n'avait jamais livré le
     rendu : les deux classes CSS étaient mortes, et le commentaire qui les
     accompagne décrivait une surface qui n'existait pas. L'audit d'attention
     l'a chiffré — **19 entrées sur 82 atteignables**, toutes par le panneau
     d'attaque.

     ── Ce que cette rangée branche, exactement ──────────────────────────────
     MESURÉ sur le catalogue SR6 : **45 des 82 entrées n'ont AUCUN hôte** (ce
     sont des greffons de compétence, de nature ou de situation — leur place
     est le panneau pré-jet, pas une action). Sur les 37 restantes, 23 sont
     hébergées par « Attaquer », **qui a déjà sa surface** : le panneau
     d'attaque, seul endroit où l'ARME tranche entre mêlée et distance
     (`Actions.hostKeys`). Les rejouer ici serait un doublon, et un doublon qui
     mentirait — sans arme choisie, on ne peut afficher que les deux familles à
     la fois.

     Restent **14 entrées sur 9 hôtes** — Bloquer (4), Intercepter (2),
     Sprinter (2), Se jeter par terre, Esquiver, Dégainer rapidement, Se
     déplacer, Éviter, Faire trébucher — qui n'avaient **aucune** surface.
     C'est ce que ce lot rend joignable, et rien de plus : annoncer « les 82 »
     serait faux.

     ── Pourquoi une rangée et pas une feuille ──────────────────────────────
     Décision A n°8 (arbitrage Bertrand) : une action d'Atout est un GREFFON,
     elle vit sur son hôte et n'aura jamais de feuille à elle. La rangée
     n'a donc ni bouton d'ouverture ni navigation — **elle arrive avec
     l'action** que le MJ vient de jouer (`c.lastAction`, que `useAction`
     écrivait déjà), et repart avec la suivante. Le cockpit reste à deux
     surfaces dépliables.

     ── La porte (A2) ───────────────────────────────────────────────────────
     La rangée ne s'affiche que si **au moins un greffon est abordable** —
     même prédicat que `arbitrable` dans le panneau d'attaque : à 0 Atout, les
     19 greffons de mêlée sont tous morts et une rangée entièrement grisée est
     un reçu à signer. Une fois la rangée là, un greffon trop cher s'y montre
     TERNI et reste tapable : le MJ a le droit de déborder, et `useEdgeAction`
     le dit déjà quand il le fait (« Atout insuffisant — »).
     ======================================================== */
  _activeGrafts(r) {
    const pnj = r.pnj;
    if (!pnj || pnj._adhoc || !r.lastAction) return "";
    // « Attaquer » est exclu : son panneau le fait déjà, et mieux (il connaît
    // l'arme, donc la famille). Cf. l'en-tête.
    if (r.lastAction === "attaquer") return "";
    const greffons = Actions.grafts(pnj, r.lastAction, {
      // Contextes DÉCLARÉS + ceux que la scène rend évidents (la poursuite en
      // cours), et le camp du combattant : cf. Encounter.edgeContextsFor.
      declared: Encounter.edgeContextsFor(r),
      role: Encounter.chaseRoleFor(r.pnjId),
      withOptional: !!r.edgeOptional,
    });
    const edge = r.edge || 0;
    if (!greffons.some((g) => g.cost <= edge)) return "";
    const hote = Actions.find(pnj, r.lastAction);
    const puces = greffons
      .map((g) => {
        const cher = g.cost > edge ? " is-over" : "";
        const info = [
          `${g.name} — ${EdgeActions.costLabel(g)}${g.actionCost ? " + 1 action majeure" : ""}`,
          ...(g.lines || []),
          g.page ? g.page : "",
        ]
          .filter(Boolean)
          .join("\n• ");
        return `<button type="button" class="tag status-pick${cher}" data-action="edge-use" data-id="${r.pnjId}" data-key="${g.key}" title="${Utils.escHtml(info)}">${Utils.escHtml(g.name)}<span class="edge-cost">${g.cost}</span></button>`;
      })
      .join("");
    return `<div class="cluster encounter-grafts">
      <span class="graft-lbl">Atout sur ${Utils.escHtml(hote ? hote.name : r.lastAction)}</span>${puces}
    </div>`;
  },

  /* ========================================================
     FEUILLE D'ACTIONS (lot F1) — le catalogue rejoint le compteur.

     ANCRAGE. La rangée de jetons, pas la console de réaction. Le critère était
     déjà posé par E4 et il ne bouge pas : la console porte ce qui NE COÛTE PAS
     DE JETON (défense, encaissement, interruptions SR5, qui se paient en score
     d'initiative) ; la rangée porte le budget. Une action qui se paie en jetons
     va là où le budget se manipule — y compris les onze actions SR6 `timing:"L"`,
     déclarables hors de son tour mais payées en mineures/majeures.

     FORME. Copie conforme de `.status-sheet` (CardRenderer._statusSheet) : deux
     étages (accès direct, puis « tous… »), mêmes `.tag`, une seule feuille
     ouverte à la fois. Aucun composant neuf — le geste est déjà dans les doigts
     du MJ depuis le lot E1.

     COULEUR. Aucune, même arbitrage que les états : le cockpit a dépensé ses
     quatre rôles. Une action se lit par son nom et son coût.
     ======================================================== */

  /** Le « ＋ » et la feuille dépliable. Rien si l'édition n'a pas de catalogue
      (Anarchy : `actionModel` absent → la surface disparaît d'elle-même, comme
      la ligne d'états).

      ⚠ DEUX DÉFAUTS CORRIGÉS AU LOT F5n, tous deux signalés par l'utilisateur
      (« il semble mort et prend une ligne ») :

      · Il MESURAIT 26×10 px — une hauteur de DIX pixels, moins de la moitié du
        plancher WCAG que `--hit-min` fixe à 24 — parce qu'il empruntait
        `.action-trade`, taillé pour les boutons d'échange 4↔1 de SR6, qui
        écrase le gabarit de `.btn-icon-tiny` (`padding: 0`, aucun
        `min-height`). Cette classe lui est retirée.
      · Il gardait son « ＋ » une fois la feuille OUVERTE : rien ne disait
        qu'on pouvait la refermer, d'où l'impression de bouton mort. Le glyphe
        est désormais posé par le CSS d'après `aria-expanded` (`.toggle-glyph`)
        — donc « − » à l'ouverture, sans une ligne de JS. */
  _actionPick(r, budget) {
    const cat = Actions.catalog(r.pnj);
    if (!cat.length) return "";
    const ouverte = Sheets.isOpen("action", r.pnjId);
    const plus = `<button type="button" class="btn-icon-tiny action-add toggle-glyph" data-action="action-sheet" data-id="${r.pnjId}" aria-expanded="${ouverte}" title="Jouer une action nommée — elle débite son propre coût" aria-label="Jouer une action"></button>`;
    return `${plus}${this._actionSheet(r, budget)}`;
  },

  _actionSheet(r, budget) {
    const used = r.actionsUsed || {};
    const puce = (a) => {
      // « Payable avec ce qui reste ? » est une INFORMATION, pas un verrou : la
      // puce se ternit, elle ne se désactive pas. `_consumeAction` débite
      // au-delà du budget et le dit — le MJ a le droit de savoir qu'il déborde
      // et de déborder quand même (garde-fou (e)).
      // F3 — le coût affiché est le coût RÉEL, surtaxes d'état comprises, et
      // il ne monte jamais sans nom (patron `globalDiceSources`). Les surtaxes
      // que le MJ doit trancher lui-même (`warnings`) ne sont PAS ajoutées :
      // elles marquent la puce d'un ⚠ et s'expliquent en infobulle.
      const res = Actions.costWith(r.pnj, a, Encounter.edgeCancels(r.pnjId));
      const cher = !Actions.affordable({ cost: res.cost }, budget, used);
      const hors = a.timing === "L" ? " · hors tour" : "";
      const avec = a.combine ? [`À combiner avec : ${a.combine}`] : [];
      // F4 — ce que l'action fait aux états, dit sur la puce avant le tap.
      const poses = Actions.sets(a)
        .map((st) => {
          const nom = Actions.statusName(r.pnj, st.status);
          return nom ? `${st.level ? "Pose" : "Retire"} ${nom}${st.note ? ` — ${st.note}` : ""}` : null;
        })
        .filter(Boolean);
      const peut = Actions.maySet(a)
        .map((m) => {
          const nom = Actions.statusName(r.pnj, m.status);
          return nom ? `⚠ ${m.level ? "Peut poser" : "Peut retirer"} ${nom} ${m.when} — à vous de trancher` : null;
        })
        .filter(Boolean);
      const surtaxes = res.sources.map((s) => `Surtaxe ${s.name} : +${Actions.costLabel(r.pnj, a, s.cost)} (${s.why})`);
      const doutes = res.warnings.map((w) => `⚠ ${w.name} : +${Actions.costLabel(r.pnj, a, w.cost)} pour ${w.why}. À vous de trancher : l'app ne l'ajoute pas.`);
      const info = [
        `${a.name} — ${Actions.costLabel(r.pnj, a, res.cost)}${hors}`,
        ...poses,
        ...peut,
        ...surtaxes,
        ...doutes,
        ...avec,
        ...(a.lines || []),
      ].join("\n• ");
      // F3b — interdiction NOMMÉE par le livre : la puce est refusée et dit
      // pourquoi, comme un bouton d'interruption qu'une initiative trop basse
      // ne peut pas payer (E4). C'est la seule chose que la feuille désactive,
      // et c'est parce qu'il n'y a rien à arbitrer.
      const interdits = Actions.forbidden(r.pnj, a);
      if (interdits.length) {
        const raison = `${a.name} impossible — ${interdits.map((i) => `${i.name} : ${i.why}`).join(" · ")}`;
        return `<span class="tag status-pick action-pick is-forbidden" title="${Utils.escHtml(raison)}" aria-disabled="true">${Utils.escHtml(a.name)}<span class="action-doubt" aria-hidden="true">⊘</span></span>`;
      }
      const marque = res.sources.length ? " is-surcharged" : "";
      // ⚠ sur la puce UNIQUEMENT pour une surtaxe qui nomme sa cible. Une règle
      // qui frappe toute une nature d'action (Estropié) se dit une fois
      // au-dessus de la feuille : 75 ⚠ sur 76 puces n'avertissent de rien.
      const cible = res.warnings.some((w) => w.targeted);
      const doute = cible ? " is-doubtful" : "";
      // « Ça reste cliqué » : la dernière action jouée garde sa marque. Une
      // action one-shot n'a rien à porter d'autre — elle agit et la feuille se
      // re-rend —, or `c.lastAction` était écrit à chaque `useAction` sans que
      // personne ne le lise. La trace ne verrouille rien : la puce reste
      // tapable, et retapée elle repaie (le livre n'interdit pas de recommencer).
      const dernier = r.lastAction === a.key ? " is-last" : "";
      // G3 — la teinte de domaine est portée par LA PUCE, pas par sa rubrique.
      // Elle l'était d'abord par la bande, ce qui suffisait tant que rubrique
      // et domaine se confondaient. La rubrique « Hors tour » les sépare : elle
      // rassemble des puces de trois domaines (Contrer un sort est magique,
      // Défense matricielle totale est matricielle, Bloquer est de combat), et
      // une teinte de bande les aurait toutes repeintes de la même couleur.
      // Sur la puce, chacune garde la sienne où qu'elle soit rangée.
      const dom = ` dom-${Actions.domain(a)}`;
      return `<button type="button" class="tag status-pick action-pick${dom}${cher ? " is-over" : ""}${a.timing === "L" ? " is-free" : ""}${marque}${doute}${dernier}" data-action="action-use" data-id="${r.pnjId}" data-key="${a.key}" title="${Utils.escHtml(info)}">${Utils.escHtml(a.name)}${cible ? "<span class=\"action-doubt\" aria-hidden=\"true\">⚠</span>" : ""}</button>`;
    };
    // Les rappels dits UNE FOIS, en tête de feuille. Absents quand il n'y a
    // rien à dire — l'écrasante majorité des tours.
    //   · F3b, les ARRÊTS LARGES en premier : « aucune action possible » prime
    //     sur une surtaxe, et le MJ doit le lire avant de choisir.
    //   · F3, les surtaxes conditionnelles ensuite.
    // F5b — les domaines fermés à ce PNJ (ni Magie, ni Matrice) : dits une
    // fois, jamais masqués en silence.
    const fermes = Actions.closedDomains(r.pnj).filter((d) => d.n);
    const fermesHtml = fermes.length
      ? `<span class="action-notice">${fermes.map((d) => `${d.n} ${Utils.escHtml(d.label.toLowerCase())} masquée${d.n > 1 ? "s" : ""} — ${Utils.escHtml(d.why)}`).join(" · ")}</span>`
      : "";
    const arrets = Actions.halts(r.pnj);
    const stopHtml = arrets.length
      ? `<span class="action-notice is-halt">⊘ ${arrets
          .map((h) => `${Utils.escHtml(h.name)} : ${Utils.escHtml(h.why)}${h.except ? ` — sauf ${Utils.escHtml(h.except)}` : ""}`)
          .join(" · ")}. L'app n'en bloque aucune : le tri vous revient.</span>`
      : "";
    // G2 — les actions qui se jouent AILLEURS. Même discipline que les domaines
    // fermés, et pour la même raison : une puce qui disparaît doit dire où elle
    // est partie, sinon le MJ la croit perdue. Le rappel nomme un endroit de
    // l'écran (« le bloc Sorts », « le râtelier Matrice »), jamais un concept.
    const portes = Actions.doorGroups(r.pnj);
    const portesHtml = portes.length
      ? `<span class="action-notice">${portes
          .map((p) => `${p.n} action${p.n > 1 ? "s" : ""} se joue${p.n > 1 ? "nt" : ""} depuis ${Utils.escHtml(p.where)}`)
          .join(" · ")}</span>`
      : "";
    const rappels = Actions.conditionalNotices(r.pnj);
    const notice = fermesHtml + portesHtml + stopHtml + (rappels.length
      ? `<span class="action-notice">⚠ ${rappels
          .map((w) => `${Utils.escHtml(w.name)} : +${Utils.escHtml(Actions.costLabel(r.pnj, null, w.cost))} pour ${Utils.escHtml(w.why)}`)
          .join(" · ")} — à vous de trancher, l'app ne l'ajoute pas.</span>`
      : "");
    const rapides = Actions.quick(r.pnj).map(puce).join("");
    // F1b — le reste se range par DOMAINE (combat, magie, Matrice ; pilotage
    // depuis G1). SR6 est passé de 32 à 78 actions et SR5 de 36 à 76 : une
    // seule liste serait un mur de puces. Une rubrique vide ne s'imprime pas —
    // un PNJ sans magie, ni Matrice, ni drone retrouve une liste plate.
    // G3 — deux axes de rangement, pas un : le DOMAINE (ce que c'est) puis le
    // MOMENT (quand ça se joue). `restGroups` rend les domaines ouverts d'abord
    // — ce qui se joue à son tour — puis « Hors tour », qui rassemble les
    // actions `timing:"L"` de tous les domaines. Le raisonnement est en tête
    // d'`actions.js` ; l'essentiel : le PNJ actif ne Bloque ni n'Esquive jamais
    // à son tour, et les voir mélangées aux dix-huit actions du tour faisait
    // retrier l'œil à chaque ouverture.
    const domaines = Actions.restGroups(r.pnj);
    // ⚠ G1 — LE FILTRE PAR DOMAINE NE S'APPLIQUAIT PAS À UN SEUL DOMAINE.
    //
    // Ces deux lignes lisaient `Actions.rest(r.pnj)` — le catalogue ENTIER,
    // sans filtre — et la branche « une seule rubrique » ci-dessous le rendait
    // tel quel. Or « une seule rubrique » est le cas de l'écrasante majorité
    // des PNJ : c'est précisément la population que F5b visait. Le prédicat de
    // domaine ne servait donc QUE chez les mages et les deckers, c'est-à-dire
    // exactement là où il n'était pas nécessaire.
    //
    // MESURÉ, sur un ganger sans une once de Magie ni de Matrice :
    //   · SR6 — 69 puces affichées au lieu de 21 · SR5 — 63 au lieu de 10,
    // avec, JUSTE AU-DESSUS, le rappel « 11 magie masquées · 33 matrice
    // masquées » posé par `closedDomains`. La ligne qui promet que rien ne se
    // masque en silence surplombait 44 puces qui ne se masquaient pas du tout.
    //
    // Le correctif est le nom de la variable : on rend ce que le groupeur a
    // retenu, jamais le catalogue brut. `rest()` garde son appelant — c'est
    // `closedDomains` qui COMPTE les masquées, et lui a besoin du catalogue
    // entier pour les compter.
    const visibles = domaines.flatMap((d) => d.entries);
    // ⚠ L'ouverture SURVIT au re-rendu, contrairement à la feuille d'états.
    // Raison : jouer une action débite le budget, donc `_commit()` re-rend la
    // fiche — une feuille qui se referme à chaque tap obligerait à la rouvrir
    // entre chaque action, et un tour SR6 en compte couramment trois (Se
    // déplacer, Ajuster, Attaquer). Six taps au lieu de quatre.
    const ouverte = Sheets.isOpen("action", r.pnjId);
    const restOuvert = Sheets.isRestOpen("action", r.pnjId);
    // Une seule rubrique → pas d'en-tête : un titre « Combat » au-dessus d'une
    // liste qui n'a rien à côté ne dit rien.
    //
    // G3 — la rubrique porte sa CLÉ en classe (`is-magie`, `is-horsTour`…),
    // pour son liseré et son libellé. La TEINTE, elle, est sur la puce (cf.
    // `puce` plus haut) : « Hors tour » est une rubrique multicolore, et une
    // teinte de bande y aurait menti. Le CSS n'invente aucun rôle chromatique —
    // il redéfinit `--accent`/`--glow`, exactement comme `.matrix-block` et
    // `.spell-block` le font depuis CP4 sur les blocs d'offense (le référentiel
    // classe `--accent-matrix`/`--accent-magic` en « canaux de calque
    // transverses », pas en rôle d'accent).
    const corps =
      domaines.length > 1
        ? domaines
            .map(
              (d) =>
                `<span class="cluster action-domain is-${d.key}"><span class="action-domain-lbl">${Utils.escHtml(d.label)}</span>${d.entries.map(puce).join("")}</span>`,
            )
            .join("")
        : visibles.map(puce).join("");
    const tous = visibles.length
      ? `<button type="button" class="tag status-more" data-action="action-more" aria-expanded="${restOuvert}">tous…</button>
         <span class="cluster action-rest"${restOuvert ? "" : " hidden"}>${corps}</span>`
      : "";
    return `<div class="cluster status-sheet action-sheet" data-action-sheet="${r.pnjId}"${ouverte ? "" : " hidden"}>${notice}${rapides}${tous}</div>`;
  },

  /** Déplie/replie la feuille. Toute la mécanique vit dans `Sheets` depuis le
      lot A1 — y compris ce que cette fonction avait raison de faire seule et
      que les feuilles de la console de réaction ne faisaient pas : fermer les
      AUTRES familles, et mémoriser l'ouverture pour qu'un débit ne la referme
      pas (trois actions dans un tour SR6, c'était deux réouvertures de trop). */
  toggleActionSheet(pnjId, btn) {
    Sheets.toggle("action", pnjId, btn);
  },

  /** Révèle le reste du catalogue (« tous… »), en place — mémorisé lui aussi :
      le MJ qui a déplié « tous… » pour jouer Sprinter ne veut pas le redéplier
      pour jouer Bannir un esprit juste après. */
  toggleActionRest(btn) {
    Sheets.toggleRest(btn, ".action-rest");
  },


  /** Boutons d'ÉCHANGE d'actions (lot E5) — n'existent que si l'édition en
      déclare (`actionExchange` : SR6 seul aujourd'hui). Rien de neuf dans la
      ligne : ils prolongent la rangée de jetons, qui est déjà l'endroit où le
      budget se manipule.

      Un échange n'est proposé que s'il est PAYABLE avec ce qui reste — un
      bouton qui échouerait au clic ne dit rien d'utile au MJ. Le ↺ n'apparaît
      qu'après un échange : l'aller-retour étant à perte (4 mineures pour 1
      majeure, p.42), la correction d'un mé-tap doit RENDRE les jetons, pas
      re-troquer. */
  _actionTrades(r, budget) {
    const specs = (App.editionModule && App.editionModule.actionExchange) || null;
    if (!specs || !specs.length) return "";
    const used = r.actionsUsed || {};
    const dispo = (k) => {
      const g = budget.find((b) => b.key === k);
      return (g ? g.total : 0) - (used[k] || 0);
    };
    const btns = specs
      .filter((e) => dispo(e.from.key) >= e.from.n)
      .map(
        (e) =>
          `<button class="btn-icon-tiny action-trade" data-action="trade-action" data-key="${e.key}" data-id="${r.pnjId}" title="${Utils.escHtml(e.label)} (p.42)">${Utils.escHtml(e.label)}</button>`,
      )
      .join("");
    const annuler = r.actionsTraded
      ? `<button class="btn-icon-tiny action-trade" data-action="reset-trades" data-id="${r.pnjId}" title="Annuler les échanges de ce tour (l'échange est à perte : on rend, on ne re-troque pas)" aria-label="Annuler les échanges">↺</button>`
      : "";
    if (!btns && !annuler) return "";
    return `<span class="action-trades">${btns}${annuler}</span>`;
  },

  /** Note de scène éditable sous la fiche active : même champ que
      c.note (déjà persisté par ligne), même action `set-note` — la
      délégation d'Encounter la reçoit qu'elle vienne de la ligne ou d'ici.
      Toujours visible (pas de masquage « vide » comme sur la ligne : c'est
      un besoin de premier plan en combat, pas un détail à révéler). */
  _activeNote(r) {
    return `<div class="encounter-active-note">
      <input type="text" class="encounter-note" placeholder="Note de scène…"
        value="${Utils.escHtml(r.note || "")}" data-action="set-note" data-id="${r.pnjId}">
    </div>`;
  },

  /** Fiche complète (CardRenderer) du combattant dont c'est le tour, affichée
      à côté de la liste. Rien pour un PJ ad-hoc (pas de fiche) ni une scène
      vide. actions=[] : pas de boutons sauvegarder/éditer/virer, la card
      reste malgré tout pleinement interactive (jets, moniteur, drogues…).
      Chaque combattant entre en scène avec la zone Détails repliée
      (attributs/réserves/équipement) pour ne pas noyer le tour sous 65
      chiffres — Combat et Capacités restent à leur défaut (c'est justement ce
      qu'on regarde en combat). Levier per-carte, per-zone exposé (_zoneIsOpen
      lit pnj._zoneOpen en priorité). Le MJ garde le .zone-toggle de la
      carte pour déplier au besoin ; l'effet ne touche la carte du pool qu'à
      son prochain rendu (compact = défaut). */
  /** Combattant « en focus » en narratif : le tap mémorisé (_narrativeFocusId,
      posé par render() tant qu'il est vivant) ou, par défaut, le premier
      « à jouer » (sinon le premier vivant). Null si aucun combattant vivant.
      C'est la source de focus que renderActiveCard partage avec le tour actif
      du mode ordonné (un seul chemin d'aval — Kernel/CODIR). */
  _narrativeFocusId: null,
  _narrativeFocus(rows) {
    const live = rows.filter((r) => r.pnj && !r.down);
    if (!live.length) return null;
    const found = this._narrativeFocusId && live.find((r) => r.pnjId === this._narrativeFocusId);
    return found || live.find((r) => !r.hasActed) || live[0];
  },

  renderActiveCard(rows, state, model) {
    const box = document.getElementById("encounter-active-card");
    if (!box) return;

    // En narratif (pas de tour d'initiative), la fiche suit le combattant EN
    // FOCUS (tap sur une ligne, focus-active) ; en ordonné, le combattant dont
    // c'est le tour. Un seul chemin d'aval ensuite — fiche « vue combat » +
    // budget d'actions, ou console de réaction si le focus est un PJ.
    const active = model && model.narrative ? this._narrativeFocus(rows) : rows[state.turnIndex];

    // Polish DA « deux températures » : le mode est piloté par le tour (jamais
    // un réglage manuel) — Agir (fiche chaude) au tour d'un PNJ, Réagir (rack
    // froid) au tour d'un PJ, CI au tour d'une glace. On ne s'en sert que pour
    // n'animer la bascule fiche↔rack qu'au CHANGEMENT de mode (pas aux refresh).
    const mode = !active ? null : active.kind === "matrix" ? "matrix" : active.isPJ ? "react" : "agir";
    const modeEnter = mode !== this._activeMode;
    this._activeMode = mode;

    // Combattant matriciel (CI) — fiche minimale, pas de fiche de pool.
    // Toujours re-rendue (le moniteur matriciel vit sur le serveur et change
    // au fil du combat) : on ne met pas en cache via _activeCardId.
    if (active && active.kind === "matrix") {
      this._activeCardId = null;
      this._renderMatrixActiveCard(box, active);
      return;
    }

    // Tour d'un PJ (piloté par un joueur) — au lieu d'une fiche vide,
    // une console de réaction pour faire réagir les PNJ non actifs (défense,
    // encaissement) vite et sans aller chercher leur carte. Toujours re-rendue
    // (l'état des PNJ change au fil du tour) : pas de cache _activeCardId.
    if (active && active.isPJ) {
      this._activeCardId = null;
      this._renderReactionConsole(box, rows, active, modeEnter, state);
      return;
    }

    const pnj = active && active.pnj && !active.pnj._adhoc ? active.pnj : null;
    const id = pnj ? pnj.id : null;
    // Le bandeau (badges + pont decker→scène) doit rester à jour même
    // sans changement de combattant actif (ex. lier un serveur alors que
    // c'est toujours le tour du même decker) — recalculé à chaque appel, à
    // l'inverse de la fiche complète ci-dessous (coûteuse, gardée en cache
    // par id). Trouvé en vérifiant ce pont : sans ce fractionnement, le
    // bouton « Lier à la scène » restait affiché après un clic jusqu'au tour
    // suivant (linkServer réussissait bel et bien, seul l'affichage mentait).
    if (pnj) {
      const top = box.querySelector(":scope > .encounter-active-top");
      // Les appareils matriciels (armes brickables) vivent aussi dans ce
      // wrapper live — appliquer des dégâts au même tour se voit sans attendre
      // le tour suivant (même raison que le pont decker ci-dessus).
      if (top) top.innerHTML = this._activeTop(active, state);
      // Bandeau économie (Atout + Actions) — même traitement live que
      // .encounter-active-top, hors du cache _activeCardId ci-dessous. Corrige
      // le bug où consommer un jeton ne se voyait qu'au tour suivant.
      const econ = box.querySelector(":scope > .encounter-active-economy");
      if (econ) econ.innerHTML = this._activeEconomy(active, model);
    }
    // ⚠ LA CLÉ DE CACHE EST « QUI + QUELLE VERSION », plus « qui » seul.
    //
    // Elle n'était qu'un identifiant de combattant : elle répondait « est-ce le
    // même PNJ ? » alors que la vraie question est « quelque chose a-t-il
    // changé ? ». Conséquence, mesurée : retirer un état par son ✕ mettait bien
    // le modèle à jour ({couvert, course, melee} → {course, melee}) et laissait
    // le cockpit afficher ses TROIS puces — le geste semblait mort. Idem pour
    // tout ce qui vient d'en dehors de la scène (états, moniteurs, drogues),
    // qui passe par `Encounter.notifyPnjChanged`.
    //
    // Le contournement en place était 19 `_activeCardId = null` disséminés dans
    // les mutations d'`Encounter` : chaque nouveau geste devait penser à vider
    // le cache, et le seul qui l'oubliait faisait mentir l'écran. La révision
    // (`Encounter._rev`, incrémentée par `_commit` et `notifyPnjChanged`)
    // supprime la question : le cache tombe exactement quand l'état change, et
    // jamais autrement. Les 19 invalidations manuelles deviennent redondantes —
    // laissées en place, elles restent inoffensives (`null` ≠ toute clé).
    const rev = typeof Encounter !== "undefined" ? Encounter._rev || 0 : 0;
    const cle = `${id}:${rev}`;
    if (cle === this._activeCardId) return; // rien n'a bougé depuis le dernier rendu
    this._activeCardId = cle;

    box.innerHTML = "";
    box.hidden = !pnj;
    if (pnj) {
      // V7 — « Agir produit » : la console montre l'OFFENSE (② Armes → ③ Sorts·
      // Matrice·Pouvoirs → ④ Compétences, cf. CardRenderer.offenseBlocks), PAS
      // la fiche complète ni le bloc moniteur (il ne subit rien à son tour ; le
      // malus est cuit dans les réserves, la vie est dans l'effectif). ① Actions
      // = _activeEconomy (posé juste au-dessus). L'état maintenu ⟳ / les drogues
      // (R1) sont réémis en tête des blocs par offenseBlocks. Rollables câblés
      // par la délégation document-level (DiceRoller), inchangée.
      box.innerHTML = `<div class="cluster encounter-mode-head is-agir${modeEnter ? " mode-enter" : ""}">Agir · ${this._compactName(pnj.name)}</div>
        <div class="encounter-active-top">${this._activeTop(active, state)}</div>
        <div class="encounter-active-economy">${this._activeEconomy(active, model)}</div>`;
      const deps = CardRenderer.liveDeps();
      const offense = CardRenderer.offenseBlocks(pnj, deps);
      if (offense != null) {
        // B3.1 (C-011) — ✦ Esprit / ✦ Bannir rejoignent le bloc SORTS.
        //
        // Mesuré : l'invocateur étant l'acteur ACTIF (mode « AGIR · HANGMAN »),
        // `open-summon` sortait **0 fois** de tout l'overlay — alors qu'il
        // apparaissait 3 fois ailleurs dans la page, sur les cartes du Hub. Pour
        // invoquer, le MJ devait taper le nom dans la piste, ce qui appelle
        // `focusCombatant` → `this.close()` : le cockpit se FERME, et il perd sa
        // piste d'initiative des yeux. Bannir depuis la ligne coûte 2 gestes ; les
        // deux verbes sont symétriques, leur coût allait de 1 à 4,5.
        //
        // ⚠️ Le commentaire de `_spiritChipRow` affirmait que ces affordances
        // vivaient « aussi dans l'Agir du tracker (même renderer) ». C'était FAUX :
        // les éditions l'ajoutent à `combatBody`, or la console ne monte pas la
        // carte entière — elle compose `offenseBlocks`, qui ne la contient pas.
        //
        // On monte la primitive existante, sans la dupliquer et sans toucher un
        // contrôleur : `open-summon` et `open-dismiss` sont déjà délégués sur
        // `document`, donc ils tirent depuis l'overlay comme depuis le Hub.
        const esprits = CardRenderer._spiritChipRow ? CardRenderer._spiritChipRow(pnj, deps) : "";
        box.insertAdjacentHTML(
          "beforeend",
          `<div class="stack stack--tight encounter-offense">${offense}${esprits}</div>`,
        );
      } else {
        // Le repli ci-dessous rend la fiche COMPLÈTE, qui porte déjà la rangée
        // d'esprits : ne pas l'ajouter ici, ce serait un doublon.
        // anarchy2 (offense sur mesure, pas encore recomposée) : repli sur la
        // fiche complète en vue Combat, comme avant V7 — sur un CLONE (applyView
        // écrit le pli, on ne veut pas polluer la carte bibliothèque).
        const combatPnj = { ...pnj, _zoneOpen: { ...pnj._zoneOpen } };
        CardRenderer.applyView(combatPnj, "combat");
        box.appendChild(CardRenderer.render(combatPnj, [], CardRenderer.liveDeps()));
      }
      box.insertAdjacentHTML("beforeend", this._activeNote(active));
    }
  },

  /** Fiche CI minimale : ce que le MJ regarde au tour d'une CI — A/S/T/F (si
      le serveur a des attributs), moniteur matriciel CLIQUABLE (tap = dégâts,
      ic-box), pouvoir, jets. CI liée à un serveur : lien vers le tiroir, l'état
      vivant est lu sur la scène (state.matrix), jamais copié. CI AUTONOME
      (VIS-10, `serverId` null) : indice + moniteur portés par le combattant
      (`m.indice`/`m.dmg`), hôte synthétique pour les textes de pouvoir/jets. */
  _renderMatrixActiveCard(box, r) {
    const m = r.matrix || {};
    const bare = !m.serverId;
    const srv = bare ? null : Servers.find(m.serverId);
    // Serveur lié disparu (supprimé pendant la scène) : garde défensive.
    if (!bare && !srv) {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }
    const edition = srv ? srv.edition : m.edition;
    const indice = srv ? srv.indice : m.indice;
    const M = Matrix.use(edition);
    const host = srv || M.bareHost(indice);
    const ic = M.icCatalog()[m.icKey] || { label: r.name };
    // État vivant : intrusion de serveur (state.matrix) OU, autonome, le
    // combattant lui-même (mêmes clés dmg/down).
    const intr = srv && Encounter.state.matrix && Encounter.state.matrix[srv.id];
    const st = bare ? { dmg: m.dmg || 0, down: !!m.down } : (intr && intr.ics[m.icKey]) || { dmg: 0, down: false };
    const size = M.icMonitorSize(indice);
    const label = (ic.label || r.name).replace(/^CI /, "");
    const eff = typeof ic.effect === "function" ? ic.effect(host) : "";
    // Attributs ASDF : seulement pour un vrai serveur (une CI autonome n'a
    // qu'un indice — pas de fiche de serveur à afficher case par case).
    const attrsHtml = M.hasAttrs() && srv
      ? `<div class="attr-grid">${Matrix.ATTR_KEYS.map((ak) => {
          const v = (srv.attrs || {})[ak.key];
          return `<div class="attr-cell"><span class="attr-label">${ak.badge}</span><span class="attr-value">${v ?? "—"}</span></div>`;
        }).join("")}</div>`
      : "";
    const boxes = Array.from({ length: size }, (_, i) => {
      const isPenalty = (i + 1) % 3 === 0;
      return `<div class="monitor-box${i < st.dmg ? " filled" : ""}${isPenalty ? " penalty" : ""}" data-action="ic-box" data-id="${r.pnjId}" data-n="${i + 1}" role="button" tabindex="0" aria-label="Case ${i + 1} du moniteur — ${Utils.escHtml(label)}"></div>`;
    }).join("");
    // Combat de la CI directement sur la fiche active, via Matrix.icCombat
    // (_icCombatChips) : pastilles de jet (SR5/SR6/Anarchy 1re) ou pastilles de
    // VALEUR à succès fixes (Anarchy 2.0). data-action="roll-ic" câblé dans
    // Encounter.init (overlay). CI autonome : data-id = id du combattant (jet
    // local) ; CI liée : data-id = id du serveur.
    const rollId = srv ? srv.id : r.pnjId;
    const combatHtml = this._icCombatChips(M, host, ic, m.icKey, rollId, label, [
      ["atk", "⚔", "Attaque"],
      ["def", "⛉", "Défense"],
      ["soak", "⛊", "Encaisser"],
      ["per", "◎", "Perception"],
    ]);
    const rollsHtml = combatHtml ? `<div class="cluster encounter-ic-rolls">${combatHtml}</div>` : "";
    const originLine = srv
      ? `${Utils.escHtml(srv.name)} · indice ${srv.indice}`
      : `CI autonome · indice ${indice}`;
    const drawerBtn = srv
      ? `<button class="btn-secondary btn-small encounter-ic-open" data-action="toggle-matrix-drawer" title="Ouvrir le tiroir Matrice (jets, moniteur, surveillance)">⚡ Ouvrir la Matrice</button>`
      : "";
    box.hidden = false;
    box.innerHTML =
      this._activeBandeau(r) +
      `<div class="stack stack--tight encounter-ic-card">
        <div class="cluster encounter-ic-head">
          <span class="encounter-kind is-matrix">CI</span>
          <span class="encounter-ic-name">${Utils.escHtml(label)}</span>
        </div>
        <div class="encounter-ic-server">${originLine}</div>
        ${attrsHtml}
        <div class="cluster monitor-row"><span class="monitor-label">Moniteur</span><div class="cluster monitor-boxes">${boxes}</div></div>
        ${eff ? `<div class="encounter-ic-power">${Utils.escHtml(eff)}</div>` : ""}
        ${rollsHtml}
        ${drawerBtn}
      </div>` +
      this._activeNote(r);
  },

  /** Console de réaction : quand l'actif est un PJ, une ligne par PNJ vivant
      (hors PJ, hors de combat) pour le faire réagir. S'affiche AUSSI en mode
      narratif (Anarchy) : `active` y est le combattant EN FOCUS (renderActiveCard
      l'établit via _narrativeFocus), donc taper la ligne d'un PJ ouvre bien la
      console — c'est là qu'on lit les fiches, applique des blessures et retire
      des points. Chaque ligne (`_reactPnjRow`) porte les gestes que l'ÉDITION
      expose (⛉ Défense, ⛨ Défense totale si `fullDefenseFor`, ⛊ Encaisser si
      `combatModel.hasSoak`, ✸ Dégâts), lus à l'aveugle — jamais branchés ici.
      Les réserves (`data-roll`) passent par le handler global de DiceRoller. */
  _renderReactionConsole(box, rows, active, modeEnter, state) {
    // PNJ chair ET CI matricielles actives (une CI attaquée par un
    // PJ doit pouvoir défendre/encaisser). PJ et combattants « down » exclus.
    const targets = rows.filter((r) => r.pnj && !r.isPJ && !r.down);
    if (!targets.length) {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }
    const st = state || Encounter.state || {};
    const rowsHtml = targets
      .map((r) => (r.kind === "matrix" ? this._reactMatrixRow(r) : this._reactPnjRow(r, st)))
      .join("");
    // V7 Lot 4 — bloc 🔌 des appareils brickables (le decker attaque le matos
    // PNJ à son tour), après les lignes de réaction. Vide hors scène Matrice.
    const devicesHtml = this._reactDevices(targets, state || Encounter.state || {});
    // Polish DA : bandeau de mode FROID nommant le PJ actif (tue l'erreur de
    // mode — persona Tom : « à qui c'est le tour »). Édition-neutre : lit le nom
    // du combattant, aucun App.edition.
    const pjName = active
      ? this._compactName((active.pnj && active.pnj.name) || active.name || "un PJ")
      : "un PJ";
    box.hidden = false;
    box.innerHTML = `<div class="encounter-react${modeEnter ? " mode-enter" : ""}">
      <div class="cluster encounter-mode-head is-react">Réagir · ${pjName} agit — faites réagir les PNJ</div>
      ${rowsHtml}
      ${devicesHtml}
    </div>`;
  },

  /** Ligne de réaction d'un PNJ chair : ⛉ Défense [· ⛨ Défense totale] [· ⛊
      Encaisser] · ✸ Dégâts (réserves portées par la carte, via data-roll →
      DiceRoller) + ⛶ qui ouvre la fiche en coup d'œil (CardPeek, swipe). Les
      gestes présents sont lus sur le module (`combatModel.hasSoak`,
      `fullDefenseFor`), jamais branchés par édition. DA : glyphes Unicode
      monochromes (couleur du thème), jamais d'émoji couleur. */
  _reactPnjRow(r, state) {
    const pnj = r.pnj;
    const mod = App.editionModule;
    const cm = mod && mod.combatModel;
    // Nom compact — même règle que la file (alias, sinon dernier mot du civil).
    const name = this._compactName(pnj.name);
    // Défense totale (SR5/SR6) : déclarée pour le round → +Volonté à la réserve
    // affichée. fullDefenseFor renvoie null hors SR5/SR6 (Anarchy narratif).
    const fd = !pnj._adhoc && mod && mod.fullDefenseFor ? mod.fullDefenseFor(pnj) : null;
    const fdActive = !!(fd && r.fullDefenseRound === (state && state.round));
    // E0 — la réserve vient du POINT UNIQUE, partagé avec la carte : cette
    // ligne et le ⛶ posé à trois boutons d'ici ouvrent le même PNJ, ils ne
    // peuvent pas afficher deux Défenses différentes (et `data-roll` porte le
    // nombre affiché : l'écart devenait un mauvais jet, pas un mauvais pixel).
    const def = CardRenderer.defensePool(pnj);
    // E4 — défenses multiples (SR5 p.189) : le bouton porte AUSSI un
    // `data-action`, capté par la délégation d'Encounter (le ⛉ est dans
    // l'overlay). Les deux écouteurs tirent : DiceRoller lance, Encounter
    // compte. Le malus de la défense SUIVANTE est déjà dans `def` au prochain
    // rendu, et le title dit combien de défenses ont déjà été faites — sinon le
    // chiffre baisserait sans nom, ce que le chantier s'interdit.
    const dejaDef = CardRenderer.multiDefenseMalus(pnj);
    // ⚠ Le title disait la défense totale et les défenses multiples, mais PAS
    // les états : poser Étendu puis Couvert II faisait passer le ⛉ de 11 à 9
    // puis à 13 sans que rien ne le nomme (mesuré). `defenseBreakdown` est le
    // point unique qui décompose déjà la réserve pour la carte — il porte les
    // trois sources, y compris les états (`Statuses.defenseSources`). On le
    // lit plutôt que de rejouer sa moitié ici : « le chiffre ne bouge jamais
    // sans nom » ne vaut pas que sur la fiche.
    // Il porte les TROIS corrections (défense totale, états, défenses
    // multiples) : les deux fragments que cette ligne composait à la main en
    // doublaient déjà deux, et en oubliaient une.
    const detailDef = CardRenderer.defenseBreakdown(pnj);
    const defTitle = `Test de défense (${def} dés)${detailDef ? ` · ${detailDef}` : ""}`;
    const defBtn = def >= 1
      ? `<button class="react-btn" data-roll="${def}" data-roll-label="Défense — ${name}" data-roll-pnj="${pnj.id}" data-action="count-defense" data-id="${pnj.id}" title="${Utils.escHtml(defTitle)}" aria-label="Défense — ${name} (${def} dés)"><span class="react-glyph" aria-hidden="true">⛉</span> ${def}${dejaDef ? `<span class="react-multidef">−${dejaDef}</span>` : ""}</button>`
      : `<span class="react-btn is-off" title="Pas de réserve de défense"><span class="react-glyph" aria-hidden="true">⛉</span> —</span>`;
    // Défense totale : bouton ⛨ (SR5/SR6 seulement — fd non null). Déclaration à
    // sens unique par round (le contrôleur ne décrémente l'init qu'une fois) ;
    // le coût d'initiative −10 (SR5) est motorisé côté Encounter via adjustInit.
    // E4 — quand l'édition a PLUSIEURS interruptions (SR5 en a 8), le ⛨ cesse
    // d'être un interrupteur et devient l'affordance de la 4ᵉ CATÉGORIE : il
    // déplie la feuille des interruptions, dont la Défense totale n'est plus
    // qu'une entrée. Ce n'est pas un contrôle de plus dans la ligne — c'est le
    // même, qui a récupéré ses frères (garde-fou (c), et la boucle de réaction
    // reste à trois temps). En SR6 (une seule interruption) le geste ne change
    // pas d'un pixel : tap = bascule directe.
    const interrupts = !pnj._adhoc && mod && mod.interruptActions ? mod.interruptActions(pnj) : [];
    const plusieurs = interrupts.length > 1;
    // A2 — LA PORTE D'ARBITRAGE. Le livre INTERDIT une interruption dont le
    // coût n'est pas strictement couvert par le score de la passe (p.170), et
    // `_porteInterruption` la refuse déjà — mais elle la refusait APRÈS le tap,
    // par un toast. Résultat mesuré : à partir de la 2ᵉ passe (chaque passe
    // retranche 10, la moins chère des neuf en coûte 5), le ⛨ ouvrait une
    // feuille de NEUF puces toutes désactivées. C'est exactement ce que la
    // règle de `_maybePreRoll` interdit : « le panneau s'ouvre quand il y a un
    // ARBITRAGE, jamais pour faire signer un reçu ».
    //
    // Le contrôle se TERNIT et dit pourquoi — il ne disparaît pas : le MJ doit
    // voir ce qu'il ne peut pas payer autant que le reste (« informer, jamais
    // décider »), et c'est déjà le traitement du ⛉/⛊ sans réserve, deux
    // boutons plus loin. La porte lit `Encounter.interruptOptions`, qui est le
    // point unique — même prédicat que l'exécution, pas une copie.
    const interruptOpts = plusieurs ? Encounter.interruptOptions(pnj.id) : [];
    const ouvrable = interruptOpts.some((o) => o.abordable);
    const fdOff = plusieurs && !ouvrable;
    const raisonOff = !fdOff
      ? ""
      : interruptOpts[0] && interruptOpts[0].surpris
        ? "Surpris : aucune interruption avant sa première phase d'action (p.169)"
        : `${interruptOpts[0] ? interruptOpts[0].score : 0} en initiative — la moins chère des ${interruptOpts.length} en coûte ${Math.min(...interruptOpts.map((o) => o.initCost))}`;
    const fdBtn = !fd
      ? ""
      : fdOff
        ? `<span class="react-btn is-off" title="${Utils.escHtml(`Aucune interruption payable — ${raisonOff}`)}" aria-label="${Utils.escHtml(`Actions d'interruption — ${name} : aucune payable`)}"><span class="react-glyph" aria-hidden="true">⛨</span></span>`
        : `<button class="react-btn react-fulldef-btn${fdActive ? " is-on" : ""}" data-action="${plusieurs ? "react-interrupt-toggle" : "full-defense"}" data-id="${pnj.id}"${fdActive ? ' aria-pressed="true"' : ""} title="${plusieurs ? `Actions d'interruption (${interrupts.length}) — se paient en score d'initiative` : `${Utils.escHtml(fd.label)} (+${fd.bonus} déf · ${Utils.escHtml(fd.note || "")})`}" aria-label="${plusieurs ? `Actions d'interruption — ${name}` : `${Utils.escHtml(fd.label)} — ${name}`}"><span class="react-glyph" aria-hidden="true">⛨</span></button>`;
    // G4 — CONTRER UN SORT, la réaction du magicien. Elle vivait dans la
    // feuille d'actions du combattant ACTIF, où elle ne pouvait pas servir : le
    // livre la note `(L)`, on contre le sort de quelqu'un d'AUTRE. Sa place est
    // ici, entre ⛨ Défense totale et ⛊ Encaissement — l'ordre de la séquence
    // que le MJ joue déjà (le PJ lance, le magicien contre, le PNJ défend,
    // encaisse). Absente pour qui n'a pas la compétence de l'édition, absente
    // dans les éditions qui n'en déclarent pas (SR5 : sa « Défense contre
    // sorts » est une INTERRUPTION, elle vit dans la feuille du ⛨ et se paie en
    // score d'initiative).
    //
    // ✦ est le glyphe magie déjà établi dans l'app (badge Éveillé, esprit
    // mentor, chips d'invocation) — réutilisé, pas inventé. Le bouton porte
    // `data-roll` ET `data-action` : DiceRoller lance, Encounter débite, comme
    // le ⛉ de défense depuis E4.
    const cs = !pnj._adhoc && mod && mod.counterspellFor ? mod.counterspellFor(pnj) : null;
    const csOuvert = Sheets.isOpen("counterspell", pnj.id);
    // La ligne ENTIÈRE est le déclencheur (plus de bouton ✦ à part) — même
    // idiome que `.encounter-nrow` (div role="button" qui enveloppe des
    // boutons enfants sans leur voler le tap, `closest` les départage). Gain :
    // une cible plus grande et plus « affordante » qu'une puce de 40px perdue
    // dans la grappe, et une puce de moins à caser dans une ligne déjà dense.
    const csTitle = cs
      ? `${cs.label} (${cs.skill}, ${cs.page}) — ${cs.uses.length} usages : ${cs.uses.map((u) => u.label).join(", ")}. ${cs.cost}`
      : "";
    const csRowAttrs = cs
      ? ` data-action="react-counterspell-toggle" data-id="${pnj.id}" role="button" tabindex="0" aria-expanded="${csOuvert}" title="${Utils.escHtml(csTitle)}" aria-label="${Utils.escHtml(`${cs.label} — ${name}`)}"`
      : "";
    // Marque décorative (pas un contrôle) : le glyphe qui annonçait Contresort
    // sur le bouton disparu vit désormais dans le nom, pour que « ce PNJ
    // contre les sorts » reste visible sans redépendre du tap.
    const csMark = cs ? `<span class="react-glyph react-cs-mark" aria-hidden="true">✦</span> ` : "";
    // Encaissement : uniquement si l'édition résout les dommages par un JET
    // (SR5/SR6). Anarchy compare la VD à un seuil (p.68) → pas de jet, bouton omis.
    const soak = pnj.damageResist || 0;
    const soakBtn = !(cm && cm.hasSoak)
      ? ""
      : soak >= 1
        ? `<button class="react-btn" data-roll="${soak}" data-roll-label="Encaissement — ${name}" data-roll-pnj="${pnj.id}" title="Résistance aux dommages (${soak} dés)" aria-label="Encaissement — ${name} (${soak} dés)"><span class="react-glyph" aria-hidden="true">⛊</span> ${soak}</button>`
        : `<span class="react-btn is-off" title="Pas de réserve d'encaissement"><span class="react-glyph" aria-hidden="true">⛊</span> —</span>`;
    // « Dégâts » : un résultat NET (déjà résisté), jamais un brut recalculé.
    // damageUI() lu sur le module (jamais une branche) : chips numériques P/S
    // (SR5/SR6) ou crans de gravité colorés (Anarchy, cf. _reactDamageChips).
    const damageBtn = !pnj._adhoc && mod && mod.conditionMonitor
      ? `<button class="react-btn react-damage-btn" data-action="react-damage-toggle" data-id="${pnj.id}" title="Appliquer des dégâts nets" aria-label="Dégâts — ${name}"><span class="react-glyph react-glyph-danger" aria-hidden="true">✸</span> Dégâts</button>`
      : "";
    // Coup d'œil : ouvre la fiche complète en overlay (swipe/prev-next, comme
    // dans Jouer) plutôt qu'un accordéon vers le bas — même geste partout.
    const peek = !pnj._adhoc
      ? `<button class="react-expand-btn" data-action="react-expand" data-id="${pnj.id}" aria-label="Voir la fiche de ${name}" title="Voir la fiche (feuilleter)"><span class="react-peek-glyph" aria-hidden="true">⛶</span></button>`
      : "";
    const chipsBody = damageBtn ? this._reactDamageChips(pnj) : "";
    // A2 — porte fermée : pas de feuille du tout. Neuf puces désactivées dans
    // le DOM d'une ligne qu'aucun geste n'ouvre, c'est du poids sans lecteur.
    const interruptBody = plusieurs && ouvrable ? this._reactInterruptChips(pnj) : "";
    // G4 — les usages du Contresort, repliés comme les deux rangées voisines.
    const csBody = cs ? this._reactCounterspellChips(pnj) : "";
    // États de combat (E1) — MÊMES pièces que la zone Combat de la carte
    // (CardRenderer.statusParts), montées ici parce que la séquence du MJ ne
    // s'arrête pas aux dégâts : « le PJ lance sa Boule de feu, le PNJ défend,
    // encaisse, prend 5 — et il est Enflammé 5 ». Le ＋ prend sa place DANS la
    // grappe, après ✸ : c'est l'ordre de la séquence (on encaisse, puis on
    // brûle), et poser un état est un geste comme les autres. Les pastilles
    // posées n'occupent un rang que s'il y en a — une ligne vide sous chaque
    // PNJ, c'est le mur que ce cockpit s'interdit. La feuille, elle, est
    // toujours dans le DOM mais `hidden` (donc sans rang) : `_toggleStatusSheet`
    // la cherche autour du bouton (Utils.nearest), il lui faut ce voisin.
    // `null` là où l'édition n'a pas d'états — aucun `if App.edition` ici.
    // A3 n°5 — `quickOnly` : le rack froid porte les accès direct et RIEN de
    // plus (8 états en SR6, 6 en SR5/A1, 3 en A2) ; le second étage vit sur la
    // carte, à trois boutons de là par le ⛶. Une posture, une densité.
    const st = CardRenderer.statusParts(pnj, undefined, {
      plusClass: "react-btn react-status-btn",
      quickOnly: true,
    });
    const statusBtn = st ? st.plus : "";
    const statusChips = st && st.chips ? `<span class="cluster react-states">${st.chips}</span>` : "";
    const statusSheet = st ? st.sheet : "";
    return `<div class="cluster react-row${cs ? " has-counterspell" : ""}"${csRowAttrs}>
        <span class="react-name">${csMark}${name}</span>
        <span class="cluster cluster--end react-buttons">${defBtn}${fdBtn}${soakBtn}${damageBtn}${statusBtn}${peek}</span>
        ${statusChips}${statusSheet}
      </div>${interruptBody}${csBody}${chipsBody}`;
  },

  /** Feuille des actions d'INTERRUPTION (lot E4) — jumelle exacte de
      `_reactDamageChips` : repliée par défaut, une seule ouverte à la fois,
      un tap déclare et referme. Aucun composant neuf.

      Chaque puce porte son COÛT, parce que c'est lui qui décide : « Bloquer
      −5 ». Les inabordables restent VISIBLES mais désactivées, avec la raison
      dans le title — les masquer ferait croire que SR5 n'a que trois
      interruptions, et le MJ doit voir ce qu'il ne peut pas payer autant que
      le reste (« informer, jamais décider »). */
  _reactInterruptChips(pnj) {
    const opts = Encounter.interruptOptions(pnj.id);
    if (!opts.length) return "";
    const chips = opts
      .map((o) => {
        const raison = o.surpris
          ? "Surpris : aucune interruption avant sa première phase d'action (p.169)"
          : `${o.score} en initiative — il en faut plus de ${o.initCost}`;
        return `<button class="react-btn${o.abordable ? "" : " is-off"}" ${o.abordable ? `data-action="react-interrupt" data-id="${pnj.id}" data-key="${o.key}"` : "disabled"} title="${Utils.escHtml(o.abordable ? `${o.note || ""} · ${o.page}` : raison)}">${Utils.escHtml(o.label)} <span class="react-multidef">−${o.initCost}</span></button>`;
      })
      .join("");
    return `<div class="cluster react-interrupt-chips" data-interrupt-for="${pnj.id}"${Sheets.hiddenAttr("interrupt", pnj.id)}>${chips}</div>`;
  },

  /** Déplie/replie la feuille d'interruptions. `close=true` force la fermeture
      (après une interruption déclarée, cf. Encounter). A1 : elle ne fermait que
      sa sœur les Dégâts et ignorait les feuilles d'états et d'actions — c'est
      `Sheets` qui tient désormais la seule discipline. */
  toggleReactInterrupt(pnjId, close) {
    Sheets.toggle("interrupt", pnjId, this._reactTrigger("react-interrupt-toggle", pnjId), { close });
  },

  /** Les USAGES du Contresort, dépliés par le ✦ (lot G4).

      Une rangée et pas un bouton, parce que le livre en décrit DEUX et qu'ils
      ne se jouent pas pareil — c'est la correction apportée par l'utilisateur
      (« ça peut nécessiter des jets différents en fonction du type du sort ») et
      elle est exacte dans les deux éditions :

      · SR6 p.146 — Défense augmentée (aucun seuil, les succès nets deviennent
        un bonus de défense en sphère) et Dissipation (contre la Valeur de Drain
        du sort × 2). Même réserve, deux cibles.
      · SR5 p.297 — Défense contre sorts (une RÉSERVE de dés qui se dépense par
        portions, pas un jet) et Dissipation (test opposé + Drain encaissé).

      D'où deux formes de puce, décidées par la DONNÉE du contrat et non par une
      branche d'édition : `pool` → une rollable ; `reserve` → un compteur avec
      ses ± , comme l'Atout. Une édition qui ne déclarerait qu'un seul usage
      n'aurait qu'une puce, sans une ligne de plus ici. */
  _reactCounterspellChips(pnj) {
    const mod = App.editionModule;
    const cs = !pnj._adhoc && mod && mod.counterspellFor ? mod.counterspellFor(pnj) : null;
    if (!cs) return "";
    const name = this._compactName(pnj.name);
    const puces = cs.uses
      .map((u) => {
        const info = [
          `${u.label}${u.roll ? ` — ${u.roll}` : ""}`,
          u.vs ? `Opposé à : ${u.vs}` : "",
          u.note,
        ]
          .filter(Boolean)
          .join("\n• ");
        // Usage à RÉSERVE (SR5, défense contre sorts) : un compteur, pas un jet.
        // Les dés ne se lancent pas — ils s'ajoutent au test de défense d'un
        // AUTRE. Lancer ici serait inventer un jet que le livre ne demande pas.
        if (u.reserve != null) {
          const reste = Encounter.counterspellLeft(pnj.id, u.reserve);
          return `<span class="cluster react-cs-reserve" title="${Utils.escHtml(info)}">
            <span class="react-cs-lbl">${Utils.escHtml(u.label)}</span>
            <button class="btn-icon-tiny" data-action="counterspell-step" data-delta="-1" data-id="${pnj.id}" data-max="${u.reserve}" aria-label="Allouer un dé de ${Utils.escHtml(u.label)}">−</button>
            <span class="react-cs-val">${reste}/${u.reserve}</span>
            <button class="btn-icon-tiny" data-action="counterspell-step" data-delta="1" data-id="${pnj.id}" data-max="${u.reserve}" aria-label="Rendre un dé de ${Utils.escHtml(u.label)}">＋</button>
          </span>`;
        }
        // Usage à JET (Dissipation dans les deux éditions, Défense augmentée en
        // SR6) : une rollable ordinaire. `react-counterspell` débite l'action
        // majeure quand l'édition en facture une — SR5 n'en facture aucune, sa
        // déclaration est gratuite, et `actionKey: null` le dit.
        if (!u.pool) return "";
        return `<button class="react-btn react-cs-use" data-action="react-counterspell" data-id="${pnj.id}" data-roll="${u.pool}" data-roll-label="${Utils.escHtml(`${u.label} — ${name}`)}" data-roll-pnj="${pnj.id}" title="${Utils.escHtml(info)}">✦ ${Utils.escHtml(u.label)} ${u.pool}</button>`;
      })
      .join("");
    const pied = `<span class="react-cs-note">${Utils.escHtml(`${cs.skill} · ${cs.cost} · ${cs.page}`)}</span>`;
    return `<div class="cluster react-cs-chips" data-counterspell-for="${pnj.id}"${Sheets.hiddenAttr("counterspell", pnj.id)}>${puces}${pied}</div>`;
  },

  /** Déplie/replie la rangée des usages du Contresort — même primitive que le
      ⛨ des interruptions et le ✸ des dégâts, aucun mécanisme neuf. */
  toggleReactCounterspell(pnjId, close) {
    const btn = this._reactTrigger("react-counterspell-toggle", pnjId);
    if (Sheets.toggle("counterspell", pnjId, btn, { close }) && btn) btn.classList.add("is-open");
  },

  /** Panneau de chips de dégâts d'un PNJ, replié par défaut (déplié par
      toggleReactDamage). Édition-neutre : lit damageUI() sur le module. */
  _reactDamageChips(pnj) {
    const cm = App.editionModule && App.editionModule.conditionMonitor;
    const ui = cm && cm.damageUI ? cm.damageUI(pnj) : null;
    if (!ui) return "";
    if (ui.kind === "wound") {
      const btns = (ui.levels || [])
        .map(
          (lv) =>
            `<button class="react-btn react-btn-danger sev-${lv.sev}" data-action="react-wound" data-id="${pnj.id}" data-sev="${lv.sev}">✸ ${Utils.escHtml(lv.label)}</button>`,
        )
        .join("");
      return `<div class="cluster react-damage-chips" data-damage-for="${pnj.id}"${Sheets.hiddenAttr("damage", pnj.id)}>${btns}</div>`;
    }
    const type = this.reactDamageType(pnj.id) || ui.defaultType || "phys";
    const typeToggle = ui.hasType
      ? `<button class="react-btn" data-action="damage-type-toggle" data-id="${pnj.id}" title="Basculer Physique/Étourdissant">${type === "stun" ? "Étourd." : "Phys."} <svg class="icon icon-sm" aria-hidden="true"><use href="#ic-swap"></use></svg></button>`
      : "";
    const chips = (ui.chips || [1, 2, 3, 5])
      .map(
        (n) =>
          `<button class="react-btn react-btn-danger" data-action="react-damage" data-id="${pnj.id}" data-n="${n}">✸ ${n}</button>`,
      )
      .join("");
    return `<div class="cluster react-damage-chips" data-damage-for="${pnj.id}"${Sheets.hiddenAttr("damage", pnj.id)}>${typeToggle}${chips}</div>`;
  },

  /** État de vue éphémère (aucune clé Storage) — type Phys/Étourd.
      sélectionné par PNJ pour le prochain chip appliqué. Purement transitoire
      (comme _activeCardId), reconstruit/oublié au fil des rendus. */
  _reactDamageTypes: {},

  reactDamageType(pnjId) {
    return this._reactDamageTypes[pnjId];
  },

  /** Déplie/replie le panneau de chips ; `close=true` force la fermeture (après
      application d'un dégât, cf. Encounter). La marque `.is-open` du bouton
      Dégâts est posée ici et retirée par `Sheets.closeAll` : c'est le seul
      retour visuel de la famille qui ne passe pas par `aria-expanded` (le
      bouton porte un libellé, pas un glyphe ＋/−). */
  toggleReactDamage(pnjId, close) {
    const btn = this._reactTrigger("react-damage-toggle", pnjId);
    if (Sheets.toggle("damage", pnjId, btn, { close }) && btn) btn.classList.add("is-open");
  },

  /** Le déclencheur d'une feuille de la console, par son `data-action` et son
      combattant — `Sheets.toggle` cherche la feuille AUTOUR de lui (le cockpit
      et la carte rendent le même PNJ, cf. `Utils.nearest`). Les deux feuilles
      de la console sont pilotées par le contrôleur, qui n'a que l'id sous la
      main : c'est ici qu'on retrouve le bouton, pas dans `Sheets`. */
  _reactTrigger(action, pnjId) {
    const esc = window.CSS && CSS.escape ? CSS.escape(String(pnjId)) : pnjId;
    return document.querySelector(`.encounter-react [data-action="${action}"][data-id="${esc}"]`);
  },

  /** Bascule Physique/Étourdissant avant d'appliquer un chip (SR5/SR6 séparé
      uniquement — vue seulement, aucune mutation du PNJ). Rouvre le panneau
      pour ne pas perdre le fil du geste. */
  toggleDamageType(pnjId) {
    this._reactDamageTypes[pnjId] = this._reactDamageTypes[pnjId] === "stun" ? "phys" : "stun";
    const react = document.querySelector(".encounter-react");
    if (!react) return;
    const esc = window.CSS && CSS.escape ? CSS.escape(pnjId) : pnjId;
    const body = react.querySelector(`.react-damage-chips[data-damage-for="${esc}"]`);
    const btn = body && body.querySelector('[data-action="damage-type-toggle"]');
    if (btn)
      btn.innerHTML = `${this._reactDamageTypes[pnjId] === "stun" ? "Étourd." : "Phys."} <svg class="icon icon-sm" aria-hidden="true"><use href="#ic-swap"></use></svg>`;
  },

  /** Pastilles de combat d'une CI (fiche active ET console Réagir), pilotées par
      Matrix.icCombat (source unique par édition, prohibition n°1) :
        • geste à dés (SR5/SR6, Anarchy 1re statblock) → bouton cliquable
          data-action="roll-ic" (→ Intrusion.rollIC / Encounter._rollBareIC) ;
        • succès fixes (Anarchy 2.0) → pastille de VALEUR statique (`is-value`,
          le nombre EST l'info : succès fixes ou Firewall) ;
        • geste absent (Anarchy n'a pas de jet d'encaissement) → omis.
      `kinds` = liste [kind, glyph, libellé]. `name` brut (échappé ici). */
  _icCombatChips(M, host, ic, icKey, rollId, name, kinds) {
    const esc = Utils.escHtml(name || "CI");
    return kinds
      .map(([kind, glyph, lbl]) => {
        const cv = M && host ? M.icCombat(kind, host, ic) : null;
        if (!cv) return "";
        const g = `<span class="react-glyph" aria-hidden="true">${glyph}</span>`;
        if (cv.roll) {
          const vd = cv.dmg ? ` · VD ${Utils.escHtml(cv.dmg)}` : "";
          return `<button class="react-btn" data-action="roll-ic" data-id="${rollId}" data-k="${icKey}" data-kind="${kind}" title="${lbl} — ${esc}${vd}" aria-label="${lbl} — ${esc}">${g} ${lbl}</button>`;
        }
        return `<span class="react-btn is-value" title="${lbl} : ${cv.value} — ${Utils.escHtml(cv.suffix || "")}" aria-label="${lbl} ${cv.value} — ${esc}">${g} ${cv.value}</span>`;
      })
      .join("");
  },

  /** Ligne de réaction d'une CI : au tour d'un PJ, la CI montre sa Défense (et
      son Encaissement si l'édition en a un) — bouton de jet (SR5/SR6/Anarchy 1re)
      ou pastille de valeur à succès fixes (Anarchy 2.0). Délègue tout à
      `_icCombatChips`. Pas de chevron (la CI a sa fiche + le tiroir). */
  _reactMatrixRow(r) {
    const m = r.matrix || {};
    // CI autonome (VIS-10) : pas de serveur — édition/jets portés par le
    // combattant, data-id = son id (jet local). CI liée : data-id = serveur.
    const srv = m.serverId ? Servers.find(m.serverId) : null;
    const edition = srv ? srv.edition : m.edition;
    const M = edition ? Matrix.use(edition) : null;
    const host = srv || (M && M.bareHost(m.indice));
    const ic = M ? M.icCatalog()[m.icKey] : null;
    const rollId = srv ? srv.id : r.pnjId;
    const rawName = r.name || (r.pnj && r.pnj.name) || "CI";
    const chips = this._icCombatChips(M, host, ic, m.icKey, rollId, rawName, [
      ["def", "⛉", "Défense"],
      ["soak", "⛊", "Encaisser"],
    ]);
    // Repli défensif si l'édition n'expose pas de régime de combat de CI.
    const buttons =
      chips ||
      `<span class="react-btn is-off" title="Pas de réserve de défense"><span class="react-glyph" aria-hidden="true">⛉</span> —</span>`;
    return `<div class="cluster react-row">
        <span class="react-name">${Utils.escHtml(rawName)} <span class="encounter-kind is-matrix">CI</span></span>
        <span class="cluster cluster--end react-buttons">${buttons}</span>
      </div>`;
  },


  /* ========================================================
     POSE DE GROUPE (lot E6) — un état, plusieurs PNJ.

     Ancrage assumé : la SCÈNE, pas la fiche. Une fumigène est un acte de
     scène ; le geste vit donc dans `.encounter-scene-actions`, à côté du ⛨
     « tout soigner », et la fiche garde son geste unitaire INCHANGÉ. Pas de
     « mode groupe » sur la carte, donc pas d'erreur de mode (le risque n°1
     du panel MJ) : deux endroits, deux portées, aucune ambiguïté.

     Panneau réutilisant `.risk-panel` comme le bilan de round — aucun
     composant neuf, et les puces d'état sont les mêmes `.tag` que la feuille
     de pose unitaire, donc déjà dans les doigts.
     ======================================================== */

  /** Ouvre la pose de groupe. `state` = l'état de scène d'Encounter.
      `preselection` = les combattants qui viennent d'encaisser (B3.3), résolus
      par le contrôleur — ce rendu ne lit jamais l'état de scène lui-même. */
  openGroupStatusPanel(cibles, catalogue, preselection = []) {
    this._ensureGroupStatusPanel();
    this._groupCibles = cibles;
    this._groupCatalogue = catalogue;
    this._groupChoix = null;
    // B3.3 — la règle d'origine était : « par défaut AUCUNE cible cochée, cocher
    // est un acte, décocher une corvée — poser un état sur toute la scène par
    // inadvertance coûte plus cher que deux taps ». Elle reste vraie, et c'est
    // pourquoi on ne coche PAS tout : on ne coche que ceux qui viennent
    // d'encaisser CE round. La crainte visait la scène entière ; ici la
    // proposition est étroite, motivée (une zone d'effet touche ceux qu'on vient
    // de faire encaisser) et VISIBLE avant validation — le bouton dit sur combien
    // de PNJ on pose, et décocher reste un tap. Sans encaissement récent, le
    // panneau s'ouvre vide comme avant : la règle d'origine s'applique par défaut.
    this._groupSel = new Set(preselection);
    this._renderGroupStatus();
    const p = document.getElementById("group-status-panel");
    p.removeAttribute("hidden");
    void p.offsetWidth;
    p.classList.add("show");
  },

  _renderGroupStatus() {
    const etats = this._groupCatalogue
      .map(
        (s) =>
          `<button type="button" class="tag status-pick${this._groupChoix === s.key ? " is-on" : ""}" data-group-status="${s.key}" title="${Utils.escHtml([`${s.name} — ${s.page}`, ...(s.lines || [])].join("\n• "))}">${Utils.escHtml(s.name)}</button>`,
      )
      .join("");
    // Une cible dont l'édition ignore l'état choisi est DÉSACTIVÉE et le dit —
    // une scène peut mêler des éditions, et un PNJ Anarchy n'a pas « Aveuglé ».
    const lignes = this._groupCibles
      .map((t) => {
        const hors = this._groupChoix && !t.keys.includes(this._groupChoix);
        return `<label class="cluster group-target${hors ? " is-off" : ""}">
          <input type="checkbox" data-group-target="${t.pnjId}"${this._groupSel.has(t.pnjId) ? " checked" : ""}${hors ? " disabled" : ""}>
          <span>${this._compactName(t.name)}</span>
          ${hors ? `<span class="group-target-note">état absent de son édition</span>` : ""}
        </label>`;
      })
      .join("");
    document.getElementById("group-status-etats").innerHTML = etats;
    document.getElementById("group-status-cibles").innerHTML = lignes;
    const n = [...this._groupSel].filter((id) => {
      const t = this._groupCibles.find((x) => x.pnjId === id);
      return t && (!this._groupChoix || t.keys.includes(this._groupChoix));
    }).length;
    const nom = (this._groupCatalogue.find((s) => s.key === this._groupChoix) || {}).name;
    const ok = document.getElementById("group-status-apply");
    ok.disabled = !this._groupChoix || !n;
    ok.textContent = this._groupChoix
      ? n
        ? `Poser ${nom} sur ${n} PNJ`
        : `Choisir au moins une cible`
      : "Choisir un état";
  },

  _ensureGroupStatusPanel() {
    if (document.getElementById("group-status-panel")) return;
    const p = document.createElement("div");
    p.id = "group-status-panel";
    p.className = "risk-panel-overlay";
    p.setAttribute("hidden", "");
    p.innerHTML = `
      <div class="stack risk-panel" role="dialog" aria-label="Poser un état sur plusieurs PNJ">
        <div class="cluster cluster--between risk-panel-head">
          <span class="risk-panel-title">Poser un état sur plusieurs</span>
          <button class="risk-panel-close" id="group-status-close" aria-label="Fermer">✕</button>
        </div>
        <div class="cluster status-sheet" id="group-status-etats"></div>
        <div class="stack group-targets" id="group-status-cibles"></div>
        <div class="cluster group-target-tools">
          <button class="btn-icon-tiny action-trade" id="group-status-all">Tout cocher</button>
          <button class="btn-icon-tiny action-trade" id="group-status-none">Rien</button>
        </div>
        <button class="risk-roll-btn" id="group-status-apply" disabled></button>
      </div>`;
    document.body.appendChild(p);
    const close = () => this.closeGroupStatusPanel();
    p.addEventListener("click", (e) => {
      if (e.target === p) close();
    });
    document.getElementById("group-status-close").addEventListener("click", close);
    document.getElementById("group-status-etats").addEventListener("click", (e) => {
      const b = e.target.closest("[data-group-status]");
      if (!b) return;
      this._groupChoix = b.getAttribute("data-group-status");
      this._renderGroupStatus();
    });
    document.getElementById("group-status-cibles").addEventListener("change", (e) => {
      const i = e.target.closest("[data-group-target]");
      if (!i) return;
      const id = i.getAttribute("data-group-target");
      if (i.checked) this._groupSel.add(id);
      else this._groupSel.delete(id);
      this._renderGroupStatus();
    });
    document.getElementById("group-status-all").addEventListener("click", () => {
      this._groupCibles.forEach((t) => {
        if (!this._groupChoix || t.keys.includes(this._groupChoix)) this._groupSel.add(t.pnjId);
      });
      this._renderGroupStatus();
    });
    document.getElementById("group-status-none").addEventListener("click", () => {
      this._groupSel.clear();
      this._renderGroupStatus();
    });
    document.getElementById("group-status-apply").addEventListener("click", () => {
      // Pont `window.Encounter` — le panneau vit sur `document.body`, hors de
      // la délégation bornée à l'overlay (même situation que le bilan de round).
      Encounter.applyGroupStatus(this._groupChoix, [...this._groupSel]);
      close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !document.getElementById("group-status-panel").hasAttribute("hidden")) close();
    });
  },

  closeGroupStatusPanel() {
    const p = document.getElementById("group-status-panel");
    if (!p) return;
    p.classList.remove("show");
    p.setAttribute("hidden", "");
    this._groupCibles = null;
    this._groupSel = null;
  },

  /* ========================================================
     BILAN DE ROUND (lot E3b) — le panneau qui dit ce que le round réclame.

     Il n'apparaît QUE s'il a quelque chose à dire : sans état périodique ni
     test ni durée échue, le changement de round reste ce qu'il était, un tap.
     C'est la condition pour qu'il ne devienne pas un péage entre deux tours.

     Il PROPOSE et n'exécute rien : chaque ligne tend un bouton, le MJ appuie
     ou ferme. Les jets partent par `data-roll`, capté par la délégation
     document de DiceRoller — aucun chemin de jet neuf. Réutilise le gabarit
     `.risk-panel-overlay` du panneau pré-jet, aucun composant neuf.
     ======================================================== */

  /** Ouvre le bilan pour un jeu de lignes ({kind, when, pnj, …}). */
  openRoundPanel(lignes, round) {
    this._ensureRoundPanel();
    this._roundLignes = lignes;
    const p = document.getElementById("round-panel");
    document.getElementById("round-panel-title").textContent = `Fin du round ${round}`;
    document.getElementById("round-panel-body").innerHTML = lignes
      .map((l, i) => this._roundLigne(l, i))
      .join("");
    this._roundProgress();
    // Le bouton de purge n'existe que s'il y a quelque chose à purger.
    const echus = lignes.filter((l) => l.kind === "echu");
    const purge = document.getElementById("round-panel-purge");
    purge.hidden = !echus.length;
    purge.textContent = `Retirer ${echus.length} état${echus.length > 1 ? "s" : ""} échu${echus.length > 1 ? "s" : ""}`;
    p.removeAttribute("hidden");
    void p.offsetWidth;
    p.classList.add("show");
  },

  /** Une ligne du bilan. Trois natures, trois verbes :
      · dégât résisté   → ⛊ le jet d'encaissement, réserve du PNJ
      · dégât net       → ✸ l'application directe (le livre dit « non résisté »)
      · test de round   → ⚄ le jet, avec son seuil du moment
      · durée échue     → aucun bouton propre, la purge groupée s'en charge */
  _roundLigne(l, i) {
    const nom = this._compactName(l.pnj.name);
    const quand = l.when === "startOfRound" ? "début" : "fin";
    if (l.kind === "degat") {
      const type = l.type === "stun" ? "E" : l.type === "choice" ? "P ou E" : "P";
      const soak = l.pnj.damageResist || 0;
      const geste = l.resisted
        ? `<button class="react-btn" data-roll="${soak}" data-roll-label="Encaissement — ${nom}" data-roll-pnj="${l.pnj.id}" title="Résister à ${l.vd}${type}"><span class="react-glyph" aria-hidden="true">⛊</span> ${soak}</button>`
        : `<button class="react-btn react-btn-danger" data-action="round-apply" data-idx="${i}" title="Dégâts déjà nets — le livre dit « non résisté »"><span class="react-glyph react-glyph-danger" aria-hidden="true">✸</span> ${l.vd}${type}</button>`;
      return `<div class="cluster round-line" data-todo>
        <span class="round-line-who">${nom}</span>
        <span class="round-line-what">${Utils.escHtml(l.name)}${l.level > 1 ? ` ${l.level}` : ""} · VD ${l.vd}${type}${l.resisted ? "" : " non résisté"}</span>
        ${geste}
      </div>`;
    }
    if (l.kind === "test") {
      const pool = (l.pool || []).reduce((n, k) => n + (Actor.attr(l.pnj, k) || 0), 0);
      // Ordinal français : « 1er tour », puis « 2e », « 3e »… (le livre A1
      // compte à partir du premier Tour, d'où le +1 sur l'âge, qui vaut 0 au
      // tour de la pose).
      const rang = l.age + 1;
      const esc = l.escalates ? ` · ${rang}${rang === 1 ? "er" : "e"} tour` : "";
      return `<div class="cluster round-line" data-todo>
        <span class="round-line-who">${nom}</span>
        <span class="round-line-what">${Utils.escHtml(l.name)} · ${(l.pool || []).join(" + ")} (${l.threshold})${esc}</span>
        <button class="react-btn" data-roll="${pool}" data-roll-label="${Utils.escHtml(l.name)} — ${nom}" data-roll-pnj="${l.pnj.id}" title="Seuil ${l.threshold}"><span class="react-glyph" aria-hidden="true">⚄</span> ${pool}</button>
      </div>`;
    }
    return `<div class="cluster round-line is-echu">
      <span class="round-line-who">${nom}</span>
      <span class="round-line-what">${Utils.escHtml(l.name)} · durée échue (${quand} de round)</span>
    </div>`;
  },

  /* ── SURVEILLANCE DU BILAN ────────────────────────────────────────────────
     Le panneau tient géométriquement — MESURÉ à 10 PNJ Enflammés ET
     Empoisonnés : 20 lignes, 1155px de corps bornés à 480, il défile, et
     « Continuer » reste atteignable. Ce n'est donc PAS la géométrie qui casse
     à l'échelle, c'est la TÂCHE : vingt gestes à faire un par un, chacun
     ouvrant l'overlay de dés PAR-DESSUS le panneau. Le MJ le referme, revient,
     et rien ne lui dit où il en était — les vingt lignes sont identiques,
     avant comme après. À la quatrième, il compte sur ses doigts ; à la
     douzième, il en saute une ou il en refait une.

     La réponse est une TRACE, pas un verrou (patron `.action-pick.is-last`,
     qui marque la dernière action jouée sans la désactiver) : la ligne se
     ternit et prend un ✓, son bouton reste vivant. Un jet raté, un mis-tap, un
     MJ qui veut relancer : c'est son arbitrage, pas celui de l'app
     (garde-fou « informer, jamais décider »). Seul ✸ garde son verrou — un
     dégât NET appliqué deux fois est une erreur de fait, pas un arbitrage, et
     ce verrou-là existait déjà.

     Et le compteur en tête dit ce que le défilement cache : « 3/20 traités »
     se lit sans faire défiler, parce que la tête du panneau, elle, ne défile
     pas. */

  /** Marque une ligne comme traitée. Idempotent — retaper un jet ne compte pas
      deux fois, et ne DÉ-marque pas non plus : la trace dit « vous êtes passé
      par là », pas « c'est réglé ». */
  _roundDone(ligne) {
    if (!ligne || !ligne.hasAttribute("data-todo")) return;
    ligne.classList.add("is-done");
    this._roundProgress();
  },

  /** « N/T traités » en tête — T ne compte que les lignes qui PORTENT un
      geste : les durées échues n'en ont pas (la purge groupée s'en charge en
      pied), les compter gonflerait un dénominateur que le MJ ne peut pas
      faire baisser une ligne à la fois. Muet quand il n'y a qu'un geste : un
      compteur « 0/1 » n'apprend rien. */
  _roundProgress() {
    const body = document.getElementById("round-panel-body");
    const el = document.getElementById("round-panel-count");
    if (!body || !el) return;
    const total = body.querySelectorAll(".round-line[data-todo]").length;
    const faits = body.querySelectorAll(".round-line[data-todo].is-done").length;
    el.textContent = total > 1 ? `${faits}/${total} traités` : "";
  },

  _ensureRoundPanel() {
    if (document.getElementById("round-panel")) return;
    const p = document.createElement("div");
    p.id = "round-panel";
    p.className = "risk-panel-overlay";
    p.setAttribute("hidden", "");
    p.innerHTML = `
      <div class="stack risk-panel" role="dialog" aria-label="Bilan de fin de round">
        <div class="cluster cluster--between risk-panel-head">
          <span class="risk-panel-title" id="round-panel-title">Fin de round</span>
          <span class="round-progress" id="round-panel-count" aria-live="polite"></span>
          <button class="risk-panel-close" id="round-panel-close" aria-label="Fermer">✕</button>
        </div>
        <div id="round-panel-body"></div>
        <button class="react-btn" id="round-panel-purge" data-action="round-purge" hidden></button>
        <button class="risk-roll-btn" id="round-panel-ok">Continuer</button>
      </div>`;
    document.body.appendChild(p);
    const close = () => this.closeRoundPanel();
    p.addEventListener("click", (e) => {
      if (e.target === p) close();
    });
    document.getElementById("round-panel-close").addEventListener("click", close);
    document.getElementById("round-panel-ok").addEventListener("click", close);
    // Le panneau vit sur `document.body` (il doit flotter au-dessus du
    // tracker), donc HORS de la délégation d'Encounter, qui est bornée à
    // l'overlay. Il porte donc ses propres écouteurs et appelle le contrôleur
    // par `window.Encounter` — le même pont assumé que cardrenderer↔DiceRoller
    // (cf. diceroller.js « un import inverse créerait un cycle »).
    p.addEventListener("click", (e) => {
      // La TRACE, avant tout aiguillage : elle vaut pour les deux gestes du
      // bilan, le jet (`data-roll`, tiré par la délégation document de
      // DiceRoller — ce panneau ne le voit jamais autrement) et l'application
      // directe (`round-apply`, traité juste en dessous). Un seul endroit, donc
      // aucune des deux branches ne peut l'oublier. Le `closest(".round-line")`
      // est aussi le filtre : la purge groupée et « Continuer » vivent en pied
      // de panneau, hors de toute ligne, et ne marquent donc rien.
      const geste = e.target.closest("[data-roll], [data-action]");
      if (geste) this._roundDone(geste.closest(".round-line"));

      const b = e.target.closest("[data-action]");
      if (!b) return;
      if (b.dataset.action === "round-purge") {
        Encounter.purgeEtatsEchus(
          (this._roundLignes || [])
            .filter((l) => l.kind === "echu")
            .map((l) => ({ pnjId: l.pnj.id, key: l.key })),
        );
        close();
      }
      if (b.dataset.action === "round-apply") {
        const l = (this._roundLignes || [])[parseInt(b.dataset.idx, 10)];
        if (l) {
          Encounter.damageCombatant(l.pnj.id, l.vd, { type: l.type === "stun" ? "stun" : "phys" });
          b.disabled = true; // un dégât net ne s'applique qu'une fois par round
        }
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !document.getElementById("round-panel").hasAttribute("hidden")) close();
    });
  },

  closeRoundPanel() {
    const p = document.getElementById("round-panel");
    if (!p) return;
    p.classList.remove("show");
    p.setAttribute("hidden", "");
    this._roundLignes = null;
  },

  /** Légende commune (trans-édition) des glyphes du cockpit de combat, ajoutée
      à l'Aide « ? » à la suite de la légende d'édition (App._renderHelpLegend).
      Vit ici, avec le cockpit qui possède ces glyphes, plutôt que dupliquée
      dans les 4 helpLegend d'édition. */
  cockpitLegend() {
    return [
      { keys: "⛉", html: "<strong>Défense</strong> — le PNJ (ou la CI) esquive/pare un test." },
      { keys: "⛨", html: "<strong>Défense totale</strong> — +Volonté à la défense pour le round (SR5 : −10 init)." },
      { keys: "⛊", html: "<strong>Encaisser</strong> — résistance aux dommages (SR5/SR6 ; Anarchy n'a pas de jet)." },
      { keys: "✸", html: "<strong>Dégâts</strong> — applique un résultat déjà résisté (net) au moniteur." },
      { keys: "＋", html: "<strong>Poser un état</strong> — Enflammé, Aveuglé… le catalogue de l'édition ; le tap sur un état posé monte d'un cran, le ✕ le retire." },
      { keys: "⚔", html: "Envoyer au <strong>combat</strong> / rejoindre l'initiative." },
      { keys: "◎", html: "<strong>Perception matricielle</strong> d'une CI." },
      { keys: "⚡", html: "Ouvrir le <strong>tiroir Matrice</strong> (jets, moniteur, surveillance)." },
      { keys: "⛶", html: "<strong>Voir la fiche</strong> d'un PNJ en réaction (coup d'œil, feuilletable)." },
      { keys: "CI", html: "<strong>Contre-mesure d'Intrusion</strong> engagée dans l'initiative." },
      { keys: "🔗", html: "<strong>Lier</strong> un serveur (ou la cible d'un decker) à la scène." },
      { keys: "🛡️", html: "<strong>Protéger</strong> un appareil ciblé avec le Firewall d'un decker allié." },
    ];
  },

  /** Résumé persistant dans la sidebar (round/passe + combattant actif),
      visible même le tracker fermé. Masqué si la scène est vide. */
  renderSidebar(state, rows, model) {
    const box = document.getElementById("sidebar-encounter");
    if (!box) return;

    // « Vivante » ne se limite pas aux combattants — une scène Matrice
    // seule (decker en intrusion, aucune CI déployée) est tout aussi vivante
    // (doctrine « moteurs de scène »). Rendu pur : dérive uniquement de
    // `state`/`rows` déjà reçus, ne touche jamais App/Storage.
    const hasMatrix = !!(state.serverId || (state.matrix && Object.keys(state.matrix).length));
    // Idem pour une poursuite : le 3ᵉ moteur rend la scène vivante, même sans
    // un seul combattant résolu (une piste ouverte, c'est une scène en cours).
    const hasChase = !!state.chase;
    const visible = rows.some((r) => r.pnj) || hasMatrix || hasChase;
    box.hidden = !visible;
    // Perche « Reprendre » : allumée partout où la scène peut se
    // rouvrir en un geste — topbar (desktop+mobile), sidebar, bottom-nav
    // mobile. Un même badge pulsé (`.tb-crumb-live`, déjà établi) posé
    // dans les 3 boutons `data-action="encounter-open"` correspondants.
    const combatBtn = document.getElementById("topbar-combat-btn");
    if (combatBtn) combatBtn.classList.toggle("is-active", visible);
    this._toggleLiveBadge("nav-combat-btn", visible);
    this._toggleLiveBadge("bnav-combat-btn", visible);
    if (!visible) return;

    const roundEl = document.getElementById("sidebar-encounter-round");
    // En poursuite, c'est le compteur de la PISTE qui fait autorité (Round,
    // Tour ou Phase selon le mode) : afficher « Round 1 » pendant une filature
    // à la phase 3 serait faux.
    const ch = state.chase;
    if (roundEl) {
      roundEl.textContent = ch
        ? `${(Chase.mode(App.edition, ch.mode) || {}).counter || "Round"} ${ch.round}${ch.total ? ` / ${ch.total}` : ""}`
        : "Round " + state.round + this._passSuffix(state, model);
    }

    const nameEl = document.getElementById("sidebar-encounter-name");
    const kindEl = document.getElementById("sidebar-encounter-kind");
    // Narratif : pas de combattant actif → on résume la progression du round.
    if (model && model.narrative) {
      const present = rows.filter((r) => r.pnj);
      const played = present.filter((r) => r.hasActed).length;
      if (nameEl) nameEl.textContent = `${played} / ${present.length} ont joué`;
      if (kindEl) kindEl.textContent = "";
      return;
    }

    // Poursuite en cours : le résumé dit l'ÉCART, la seule chose qu'on veut
    // savoir d'un coup d'œil depuis la sidebar (« qui me colle au train »).
    if (ch) {
      const enPiste = Object.keys(ch.lanes || {}).filter((id) => !(ch.out || {})[id]).length;
      const bandes = Chase.lanes(App.edition, ch.terrain);
      const plusProche = Object.keys(ch.lanes || {})
        .filter((id) => !(ch.out || {})[id])
        .map((id) => bandes.findIndex((b) => b.key === ch.lanes[id]))
        .filter((i) => i >= 0)
        .sort((a, b) => a - b)[0];
      if (nameEl) nameEl.textContent = enPiste ? `${enPiste} en piste` : "piste vide";
      if (kindEl)
        kindEl.textContent = plusProche != null ? `au plus près : ${(bandes[plusProche] || {}).label || "?"}` : "⇉";
      return;
    }

    const active = rows[state.turnIndex];
    if (active && active.pnj) {
      if (nameEl) nameEl.textContent = active.pnj.name || "—";
      if (kindEl) kindEl.textContent = this._kindLabel(active);
    }
  },

  /** Bascule le badge de vie (`.tb-crumb-live`, pastille pulsée déjà
      établie au fil d'Ariane) dans le bouton `id` s'il en porte un. */
  _toggleLiveBadge(id, on) {
    const btn = document.getElementById(id);
    const badge = btn && btn.querySelector(".tb-crumb-live");
    if (badge) badge.hidden = !on;
  },

  /** Bouton Matrice (barre pouce) + tiroir. srv : serveur déjà résolu
      par Encounter (jamais lu ici — rendu pur), ou null si aucun lien.
      level : état dérivé 0-3 (Encounter.matrixState). activeCount : nombre
      de CI actives (Encounter._activeICCount — l'état vivant vit dans
      la scène, pas sur srv). Le contenu du tiroir réutilise verbatim
      ServerRenderer.intrusionPanel/matrixDrawerHeader — rien n'est recalculé
      ici (cf. audit intrusion.js). */
  renderMatrix(srv, level, launchedKeys, activeCount, activeServers) {
    const btn = document.getElementById("encounter-matrix-btn");
    if (btn) {
      btn.hidden = level === 0;
      btn.classList.toggle("is-alert", level === 2);
      btn.classList.toggle("is-ic", level === 3);
      if (srv) {
        const initial = Utils.escHtml((srv.name || "?").slice(0, 1));
        btn.innerHTML =
          level === 3
            ? `⚡ Matrice <span class="matrix-ic-count">×${activeCount}</span>`
            : level === 2
              ? `⚡ Matrice <span class="matrix-dot" aria-hidden="true"></span>`
              : `⚡ ${initial}`;
        btn.title = "Matrice — " + srv.name;
      }
    }

    const drawerTitle = document.getElementById("matrix-drawer-title");
    if (drawerTitle) drawerTitle.textContent = srv ? "Matrice — " + srv.name : "Matrice";
    // Titre de la colonne dockée — même texte, second montage.
    const dockTitle = document.getElementById("matrix-dock-title");
    if (dockTitle) dockTitle.textContent = srv ? "Matrice — " + srv.name : "Matrice";

    // Plusieurs serveurs peuvent tourner en parallèle dans la scène
    // (state.matrix) : une MINI-CARTE navigable (A5) n'apparaît que s'il y en
    // a plus d'un (sinon le titre suffit). Nœuds cliquables/focusables
    // (data-node → Encounter.linkServer, cf. drawerActions), serveur affiché
    // surligné, nœud-cible marqué. Rendu FLUID (épouse la largeur du tiroir).
    // TopologyGen reste pur : `data-node` est un marqueur, le tiroir décide de
    // l'action (jamais de logique d'app dans le leaf).
    const strip =
      srv && activeServers && activeServers.length > 1
        ? `<div class="matrix-topo-strip" role="group" aria-label="Plan des serveurs de la scène — activer un nœud pour l'afficher">${TopologyGen.build({
            archetype: "chain",
            nodes: activeServers.map((s) => ({ id: s.id, name: s.name, badge: s.badge, isTarget: s.isTarget })),
            activeId: srv.id,
            interactive: true,
            fluid: true,
            seed: "scene",
            accent: (App.editionModule && App.editionModule.mapAccent) || "#35e0e6",
            entryMode: null,
          })}</div>`
        : "";
    // inEncounter + launchedKeys : ServerRenderer ajoute « ⚔ Init » sur chaque
    // CI active pas encore dans l'ordre. Le reste du contenu est le panneau
    // d'intrusion réutilisé verbatim. Calculé une fois, posé dans les deux
    // montages (tiroir mobile/dock ≥1100px) — jamais recalculé deux fois.
    const html = srv
      ? strip +
        ServerRenderer.matrixDrawerHeader(srv) +
        ServerRenderer.intrusionPanel(srv, { inEncounter: true, launchedKeys: launchedKeys || [] })
      : "";
    const body = document.getElementById("matrix-drawer-body");
    if (body) body.innerHTML = html;
    const dockBody = document.getElementById("matrix-dock-body");
    if (dockBody) dockBody.innerHTML = html;

    // Colonne dockée visible seulement ≥1100px ET état ≥1 (état 0 = 2
    // colonnes, cf. CSS .encounter-modal.has-matrix-dock) — classe posée sur
    // le modal, jamais une media query seule (l'état prime sur la largeur).
    const modal = document.querySelector(".encounter-modal");
    if (modal) modal.classList.toggle("has-matrix-dock", level > 0);
    const dock = document.getElementById("encounter-matrix-dock");
    if (dock) dock.hidden = level === 0;
  },
};

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.EncounterRenderer = EncounterRenderer;
