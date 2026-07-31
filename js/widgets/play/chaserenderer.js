"use strict";

/* ============================================================
   CHASE RENDERER — la PISTE de course-poursuite (moteur ⇉).

   Rendu PUR, comme `EncounterRenderer` : reçoit un paquet déjà résolu
   (`Pursuit.viewModel()`), retourne du HTML, ne persiste rien, ne lit
   aucune fiche. Toutes les interactions sont câblées par `Encounter`
   (délégation sur #encounter-overlay), jamais ici.

   ── La forme, et pourquoi elle est celle-là (CODIR, 20 décisions) ──
   Une COLONNE : l'ancre — la cible de la poursuite — en haut et collante,
   l'écart qui croît vers le bas, une ISSUE NOMMÉE à chaque bout
   (« rattrapé » / « semé ») avec sa condition du livre. Verticale à
   toutes les tailles : le tracker est fait de colonnes, et le vertical
   rend les noms lisibles en entier là où l'horizontal les tronquait à
   cinq caractères.

   Trois canaux par jeton, jamais quatre : la position (sa bande),
   l'attribut décisif du round, l'état de son test — plus la tendance et
   l'avantage positionnel. L'initiative reste dans la file, en dessous.

   ── Deux règles d'affichage non négociables ──
   1. **Le sens du chiffre est écrit.** Le même attribut ne dit pas la
      même chose d'un livre à l'autre (SR6 « +1 Atout » · SR5 « limite » ·
      A2 « avantage » · A1 « option ») : la barre le porte, sinon le
      chiffre ment.
   2. **Ce qu'on ne tient pas du livre s'affiche « — »**, avec la saisie à
      un tap. Aucune dérivation inventée.

   Le DOMINANT n'a pas de glyphe : il porte l'accent d'édition, seul objet
   accentué de la piste (le design system dit que l'accent signale l'état
   actif — un glyphe de plus aurait fait doublon, et ◆ est déjà le glyphe
   de Run).
   ============================================================ */
import { CardRenderer } from "../card/cardrenderer.js";
import { EdgeActions } from "../../rules/edgeactions.js";
import { Utils } from "../../core/utils.js";

export const ChaseRenderer = {
  /** DEUX MONTAGES du même rendu, comme le tiroir et le dock Matrice :
      une COLONNE à droite au-dessus de 1000px (`#encounter-chase-dock`), et
      un bloc en tête de la colonne principale en dessous
      (`#encounter-chase-inline`). Le CSS n'en montre qu'un à la fois.

      Pourquoi pas un seul nœud déplacé : entre 641 et 1000px le corps du
      tracker est en `nowrap` — une 3ᵉ colonne y écraserait les deux autres.
      Deux hôtes, un seul HTML : c'est le patron déjà en service, et il évite
      de faire voyager un nœud (qui perdrait focus et défilement). */
  render(vm) {
    const modal = document.querySelector(".encounter-modal");
    if (modal) modal.classList.toggle("has-chase", !!vm);
    // L'entrée du menu ⋯ dit l'état plutôt que l'action seule : ouvrir et
    // fermer au même endroit, comme « ⚡ Scène Matrice » à côté (loi 3 de la
    // grammaire — un verbe, un geste, au même endroit).
    const entry = document.getElementById("encounter-chase-toggle");
    if (entry) {
      entry.textContent = vm ? `${vm.glyph} Fermer la poursuite` : "⇉ Scène Poursuite";
      entry.dataset.action = vm ? "chase-close" : "chase-open";
    }
    const html = vm ? this._panel(vm) : "";
    for (const id of ["encounter-chase-dock", "encounter-chase-inline"]) {
      const host = document.getElementById(id);
      if (!host) continue;
      host.hidden = !vm;
      host.innerHTML = html;
    }
  },

  _panel(vm) {
    return `
      ${this._head(vm)}
      ${this._attrBar(vm)}
      ${this._stateBar(vm)}
      ${this._amorce(vm)}
      <div class="chase-track">
        ${this._outcome("caught", vm.outcomes.caught)}
        ${this._anchor(vm)}
        ${vm.lanes.map((l) => this._band(l, vm)).join("")}
        ${this._outcome("lost", vm.outcomes.lost)}
      </div>
      ${this._unplaced(vm)}
      ${this._dropped(vm)}
      ${this._trailing(vm)}
      ${this._sheet(vm)}
      ${this._recap(vm)}
      ${this._foot(vm)}`;
  },

  /* ---- En-tête : le moteur, le terrain, l'environnement, le round ---- */
  _head(vm) {
    const terr = vm.terrains
      .map(
        (t) =>
          `<button class="chase-chip${t.key === vm.terrain ? " is-on" : ""}" data-action="chase-terrain" data-key="${t.key}"${
            t.unruled ? ' title="Ce terrain n\'est pas réglé par cette édition — arbitrage MJ"' : ""
          }>${Utils.escHtml(t.label)}${t.unruled ? " ⚠" : ""}</button>`,
      )
      .join("");
    // Anarchy ne liste AUCUN environnement : la rangée disparaît d'elle-même
    // plutôt que d'afficher un décor que le livre n'a pas écrit.
    const envs = vm.envs
      .map(
        (e) =>
          `<button class="chase-chip${e.key === vm.env ? " is-on" : ""}" data-action="chase-env" data-key="${e.key}" title="${Utils.escHtml(e.examples)}">${Utils.escHtml(e.label)}</button>`,
      )
      .join("");
    // La rangée de modes n'apparaît que si l'édition en déclare plusieurs :
    // SR6 a la course et la filature, les trois autres livres n'en ont pas.
    const modes =
      vm.modes.length > 1
        ? vm.modes
            .map(
              (m) =>
                `<button class="chase-chip${m.key === vm.mode ? " is-on" : ""}" data-action="chase-mode" data-key="${m.key}">${Utils.escHtml(m.label)}</button>`,
            )
            .join("")
        : "";
    // Compteur : « Round 3 » en poursuite, « Tour 3 / 8 » en course,
    // « Phase 2 / 3 » en filature — le mode dit son unité, et le total se
    // règle ici (le livre laisse ce choix au MJ).
    const compteur = `<span class="chase-round">${Utils.escHtml(vm.modeSpec.counter || "Round")} ${vm.round}${
      vm.modeSpec.hasTotal ? ` / ${vm.total || "?"}` : ""
    }</span>${
      vm.modeSpec.hasTotal
        ? `<span class="chase-total"><button data-action="chase-total" data-delta="-1" aria-label="Un de moins">−</button><button data-action="chase-total" data-delta="1" aria-label="Un de plus">＋</button></span>`
        : ""
    }`;
    // ── Hiérarchie mobile (1.138.1) ──────────────────────────────────
    // Mode, terrain et environnement sont des réglages de DÉBUT de scène :
    // on les touche une fois, puis plus jamais. Les laisser en permanence
    // coûtait 8 chips et 89px de haut sur 375px — presque autant que le
    // ruban lui-même. Ils se replient donc derrière un bouton qui RÉSUME
    // l'état courant ; au-dessus de 640px, où la place existe, ils restent
    // dépliés (le CSS s'en charge, le HTML est le même).
    const resume = [vm.terrains.find((t) => t.key === vm.terrain)?.label, vm.envLabel]
      .filter(Boolean)
      .join(" · ");
    return `<div class="cluster chase-head">
      <span class="chase-title"><span class="chase-glyph" aria-hidden="true">${vm.glyph}</span> ${Utils.escHtml(vm.modeSpec.label)}</span>
      <button class="chase-chip chase-settings-toggle${vm.settingsOpen ? " is-on" : ""}" data-action="chase-settings" aria-expanded="${!!vm.settingsOpen}">⚙ ${Utils.escHtml(resume || "Réglages")}</button>
      <span class="chase-settings${vm.settingsOpen ? " is-open" : ""}">${modes}${terr}${envs}</span>
      ${compteur}
      <button class="btn-icon-tiny" data-action="chase-close" title="Fermer la poursuite" aria-label="Fermer la poursuite">✕</button>
    </div>`;
  },

  /** La barre qui NOMME l'attribut du round et sa cause. C'est elle qui
      empêche le chiffre des jetons de mentir. */
  _attrBar(vm) {
    // Piste MIXTE (lot P6) : des coureurs et des engins sur le même ruban. La
    // barre ne peut plus annoncer UN attribut — chaque jeton porte le sien —,
    // et surtout aucun livre du corpus ne compare une Force à un Intervalle
    // de vitesse. On le dit, et le point d'Atout du round n'est plus proposé.
    const mixte = vm.mixte
      ? `<span class="chase-attr-mixed">Piste mixte — chaque jeton porte son attribut ; le livre ne les compare pas, le point d'Atout du round est à votre main.</span>`
      : "";
    if (!vm.attr) {
      const note = vm.unruled
        ? `<p class="chase-unruled">⚠ ${Utils.escHtml(vm.terrainNote || "Cette édition ne règle pas ce terrain — l'app tient les positions, vous tenez l'arbitrage.")}</p>`
        : "";
      return mixte ? `${note}<div class="cluster chase-attr-bar">${mixte}</div>` : note;
    }
    const cause = vm.envLabel ? `${Utils.escHtml(vm.envLabel)} ⇒` : "Attribut du round ⇒";
    return `<div class="cluster chase-attr-bar">
      <span class="chase-attr-cause">${cause}</span>
      <span class="chase-attr-what">${Utils.escHtml(vm.attr.label)}</span>
      <span class="chase-attr-means">${Utils.escHtml(vm.attr.meaning)}${vm.attr.optional ? " · règle optionnelle" : ""}</span>
      ${vm.failCost ? `<span class="chase-fail">échec ⇒ ${Utils.escHtml(vm.failCost)}</span>` : ""}
      ${mixte}
    </div>`;
  },

  /** Bandeau d'état : une phrase CALCULÉE (jamais rédigée) — ce que le MJ
      doit lire à un mètre, et rien de plus. */
  _stateBar(vm) {
    const s = vm.summary;
    if (!s) return "";
    if (s.empty)
      return `<p class="chase-state is-empty">Personne sur la piste. <button class="chase-link" data-action="chase-fill" data-key="">Faire entrer les combattants</button></p>`;
    // ── Ce que le MJ lit EN PREMIER (1.138.1) ────────────────────────
    // La v1 écrivait « Plus proche : Proche · plus loin : Moyenne · 3 sans
    // test » en 10px, noyé entre deux barres de réglage. Retour d'usage sans
    // appel : « j'ai ouvert, regardé, et je suis parti en me disant que
    // c'était trop compliqué ». Une piste doit se lire, pas se déchiffrer :
    // la phrase passe donc en tête, en taille de lecture, et en français —
    // c'est le nom du plus proche qui compte, pas le libellé de sa bande.
    const nomProche = vm.nameOf(s.nearest.pnjId);
    const phrase = s.nearest.atAnchor
      ? `<b class="is-danger">${CardRenderer._esc(nomProche)}</b> est au contact`
      : `<b>${CardRenderer._esc(nomProche)}</b> est le plus proche — ${Utils.escHtml(s.nearest.lane.toLowerCase())}`;
    const suite = [];
    if (s.farthest.atEdge)
      suite.push(`<b class="is-good">${CardRenderer._esc(vm.nameOf(s.farthest.pnjId))}</b> décroche`);
    if (s.untested) suite.push(`<b class="is-warn">${s.untested}</b> n'ont pas encore testé`);
    if (s.dropped) suite.push(`${s.dropped} hors course`);
    return `<p class="chase-state">${phrase}${suite.length ? ` · ${suite.join(" · ")}` : ""}</p>`;
  },

  /** Amorce : tant que le MJ n'a rien déplacé, la piste DIT ce qu'on y fait.
      Elle disparaît au premier geste — une aide qui reste devient du bruit
      (même arbitrage que les nudges du projet). */
  _amorce(vm) {
    if (!vm.vierge) return "";
    return `<p class="chase-amorce">▲▼ rapproche ou éloigne de la cible ·
      ⚄ joue le test du round · un tap sur un <b>nom</b> ouvre sa fiche
      ${vm.hasEdgeActions ? "et ses actions d'Atout" : ""}.</p>`;
  },

  /** Les deux bouts de la piste : une issue nommée, avec sa condition du
      livre. Une poursuite sans ses deux fins n'a pas d'enjeu lisible. */
  _outcome(kind, o) {
    if (!o) return "";
    return `<div class="chase-outcome is-${kind}">
      <span class="chase-outcome-word">${Utils.escHtml(o.label)}</span>
      <span class="chase-outcome-cond">${Utils.escHtml(o.cond)}</span>
    </div>`;
  },

  /** L'ancre : la cible de la poursuite, origine du repère (le livre dit
      que toutes les positions se définissent selon la sienne). Collante en
      haut de la piste — elle reste visible quand on fait défiler. */
  _anchor(vm) {
    const t = vm.target;
    if (!t)
      return `<div class="chase-anchor is-empty">
        <span class="chase-anchor-lbl">Cible</span>
        <span class="chase-anchor-hint">tapez ▣ sur un combattant pour l'ancrer</span>
      </div>`;
    return `<div class="chase-anchor">
      <span class="chase-anchor-lbl">${Utils.escHtml(vm.modeSpec.anchorLabel || "Cible")}</span>
      ${this._token(t, vm, { anchor: true })}
      <button class="btn-icon-tiny" data-action="chase-target" data-id="${t.key}" title="Retirer l'ancre" aria-label="Retirer l'ancre">⏏</button>
    </div>`;
  },

  _band(lane, vm) {
    const empty = !lane.rows.length;
    return `<div class="chase-band${empty ? " is-empty" : ""}">
      <span class="chase-band-key">
        <span class="chase-band-name">${Utils.escHtml(lane.label)}</span>
        ${lane.hint ? `<span class="chase-band-dist">${Utils.escHtml(lane.hint)}</span>` : ""}
      </span>
      <span class="chase-band-slots">
        ${empty ? '<span class="chase-band-dot" aria-hidden="true">·</span>' : lane.rows.map((r) => this._token(r, vm)).join("")}
      </span>
    </div>`;
  },

  /* ---- Le jeton ----
     Position (sa bande) · attribut · état du test. Plus la tendance et ⊙
     l'avantage positionnel. Le geste principal est la paire de chevrons
     ▲▼ : visible au repos (le tactile n'a pas de survol) et sans conflit
     avec le défilement, contrairement au glisser. */
  _token(r, vm, opts = {}) {
    const dom = vm.dominantId && r.key === vm.dominantId;
    // L'attribut de la LIGNE, pas celui de la piste : depuis qu'on peut sauter
    // dans une bagnole en pleine poursuite à pied, le même ruban porte des
    // « FOR 5 » et des « IdV 20 ». Le jeton dit lequel, sinon le chiffre ment
    // (règle d'affichage n°1 du composant).
    const attr = r.attr || vm.attr;
    const val = Number.isFinite(r.value)
      ? `<span class="chase-tok-val">${r.value}</span>`
      : `<button class="chase-tok-val is-void" data-action="chase-attr" data-id="${r.key}" title="Valeur inconnue de l'app — l'annoncer">—</button>`;
    const marks = [];
    if (!opts.anchor) {
      const t = r.test;
      // Le ⚄ LANCE quand l'app tient la réserve (elle tient les PNJ) et
      // affiche son compte, comme toutes les pastilles de jet de l'app ; sur
      // un PJ, il POINTE ce que le joueur annonce. Un test déjà posé se
      // corrige au même endroit.
      const dés = r.roll && !t ? ` ${r.roll.pool}` : "";
      const titre = t
        ? "Corriger le test du round"
        : r.roll
          ? `Lancer ${r.roll.label}${r.roll.threshold != null ? `, seuil ${r.roll.threshold}` : ""}`
          : "Le joueur annonce — taper pour poser ✓ ou ✗";
      marks.push(
        `<button class="chase-mark chase-roll ${t === "ok" ? "is-ok" : t === "ko" ? "is-ko" : "is-todo"}${dés ? " has-pool" : ""}" data-action="chase-roll" data-id="${r.key}" title="${Utils.escHtml(titre)}">${t === "ok" ? "✓" : t === "ko" ? "✗" : `⚄${dés}`}</button>`,
      );
      // Ce que l'échec coûte ICI : proposé au bon moment, jamais appliqué.
      if (t === "ko" && vm.failCostLabel)
        marks.push(
          `<button class="chase-mark is-fail" data-action="chase-fail" data-id="${r.key}" title="${Utils.escHtml(vm.failCostLabel)} — proposé, jamais appliqué">!</button>`,
        );
      // L'avantage positionnel se LIT toujours, mais il ne se règle plus
      // depuis le jeton sur écran étroit : le geste vit dans la fiche.
      marks.push(
        `<button class="chase-mark is-edge is-secondary${r.edgeUp ? " is-on" : ""}" data-action="chase-edge" data-id="${r.key}" title="Avantage positionnel — remise d'Atout de 1 sur ceux qui ont échoué">⊙</button>`,
      );
    }
    const trend =
      !opts.anchor && Number.isFinite(r.trend)
        ? `<span class="chase-trend ${r.trend < 0 ? "is-up" : r.trend > 0 ? "is-down" : ""}">${r.trend === 0 ? "=" : r.trend > 0 ? `+${r.trend}` : r.trend}</span>`
        : "";
    const pool = vm.poolOn
      ? `<span class="chase-pool is-secondary" title="${Utils.escHtml(vm.poolLabel)} — la réserve revient à zéro en fin de poursuite">
          <button data-action="chase-pool" data-id="${r.key}" data-delta="-1" aria-label="Réserve −1">−</button>
          <b>${vm.glyph}${r.pool || 0}</b>
          <button data-action="chase-pool" data-id="${r.key}" data-delta="1" aria-label="Réserve +1">＋</button>
        </span>`
      : "";
    // Le gain d'Atout du round (SR6) : un point automatique que les tables
    // oublient tous les rounds. Proposé au dominant, jamais appliqué seul.
    const grant =
      dom && vm.edgeCompare
        ? `<button class="chase-grant" data-action="chase-grant" data-id="${r.key}" title="Attribuer le point d'Atout du round (attribut le plus élevé)">+1 Atout</button>`
        : "";
    const moves = opts.anchor
      ? ""
      : `<span class="chase-move">
          <button data-action="chase-move" data-id="${r.key}" data-delta="-1" aria-label="Rapprocher de la cible">▲</button>
          <button data-action="chase-move" data-id="${r.key}" data-delta="1" aria-label="Éloigner de la cible">▼</button>
        </span>`;
    // ── L'ÉQUIPAGE (lot P6) ──────────────────────────────────────────
    // Une monture porte le nom de l'ENGIN — c'est lui qui a une position — et
    // dit qui tient le volant. L'équipage n'est pas un quatrième canal : c'est
    // l'IDENTITÉ du jeton, au même titre qu'un nom de PNJ. Au-delà du
    // conducteur, on compte au lieu d'énumérer (la piste se lit à un mètre).
    const crew = r.crew
      ? `<span class="chase-tok-crew" title="${Utils.escHtml(r.crew.map((c) => c.name).join(" · "))}">${
          CardRenderer._esc((r.crew.find((c) => c.driver) || r.crew[0] || {}).name || "sans conducteur")
        }${r.crew.length > 1 ? ` +${r.crew.length - 1}` : ""}</span>`
      : "";
    return `<span class="chase-tok${dom ? " is-top" : ""}${opts.anchor ? " is-anchor" : ""}${r.crew ? " is-ride" : ""}" data-id="${r.key}">
      ${attr ? `<span class="chase-tok-lbl">${Utils.escHtml(attr.short)}</span>` : ""}
      ${attr ? val : ""}
      ${
        opts.anchor
          ? `<span class="chase-tok-name">${CardRenderer._esc(r.name)}</span>`
          : `<button class="chase-tok-name" data-action="chase-sheet" data-id="${r.key}" title="${Utils.escHtml(
              r.crew
                ? "Fiche de la monture — équipage, volant, position"
                : [r.move ? vm.moveDetail(r.move) : "", "Fiche du participant — ancrer, avantage, réserve, sortie, actions d'Atout"]
                    .filter(Boolean)
                    .join("\n\n"),
            )}">${CardRenderer._esc(r.name)}</button>`
      }
      ${crew}${trend}${grant}${pool}${marks.join("")}${moves}
      ${opts.anchor ? "" : `<button class="chase-mark is-anchor-set is-secondary" data-action="chase-target" data-id="${r.key}" title="Ancrer : faire de ce participant la cible de la poursuite">▣</button>`}
      ${
        vm.hasEdgeActions
          ? `<button class="chase-mark is-sheet is-secondary${vm.sheetFor === r.key ? " is-on" : ""}" data-action="chase-sheet" data-id="${r.key}" title="Actions d'Atout de course-poursuite">${vm.glyph}</button>`
          : ""
      }
    </span>`;
  },

  /** Les combattants de la scène qui ne sont pas encore sur la piste : un
      geste pour les y faire entrer tous (un début de poursuite, c'est N
      taps sinon). */
  _unplaced(vm) {
    if (!vm.unplaced.length) return "";
    const noms = vm.unplaced.map((r) => CardRenderer._esc(r.name)).join(", ");
    return `<p class="chase-unplaced">Hors piste : ${noms}
      <button class="chase-link" data-action="chase-fill" data-key="">Tous à la première bande</button></p>`;
  },

  /** Hors course — même patron que les hors-combat du tracker : on sort
      sans disparaître, et on peut revenir (SR5 laisse le MJ décider si un
      poursuivant retrouve la trace). */
  _dropped(vm) {
    if (!vm.dropped.length) return "";
    return `<p class="chase-dropped"><span class="chase-dropped-lbl">Hors course</span>
      ${vm.dropped
        .map(
          (r) =>
            `<span class="chase-out">${CardRenderer._esc(r.name)} <em>${r.out === "accident" ? "accident" : "semé"}</em>
              <button data-action="chase-restore" data-id="${r.key}" title="Remettre en course" aria-label="Remettre en course">↩</button></span>`,
        )
        .join("")}</p>`;
  },

  /** FILATURE — le sous-système que « À tombeau ouvert » écrit à part :
      deux tests par phase, un Atout qui change de camp selon
      l'environnement, et un dé libre qui suit la distance. Rien de tout ça
      ne se devine : c'est déclaré dans `chaseModel.modes.filature`. */
  _trailing(vm) {
    const t = vm.trailing;
    if (!t) return "";
    const tests = t.tests
      .map(
        (x) => `<li><b>${Utils.escHtml(x.label)}</b> — ${Utils.escHtml(x.threshold)}
          <em>échec : ${Utils.escHtml(x.fail)}</em></li>`,
      )
      .join("");
    const edge = t.edge
      ? `<p class="chase-trail-edge">Atout de l'environnement — Perception : ${Utils.escHtml(t.edge.perception)} · Furtivité : ${Utils.escHtml(t.edge.furtivite)}</p>`
      : "";
    const dé = t.freeDie
      ? `<p class="chase-trail-die">Dé libre : <b>${t.freeDie === "cible" ? "la cible" : "les traqueurs"}</b> — il suit la distance et change de camp.</p>`
      : "";
    return `<div class="chase-trail">
      <ul class="chase-trail-tests">${tests}</ul>
      ${edge}${dé}
    </div>`;
  },

  /** Les actions d'Atout de course-poursuite du participant choisi.

      Elles n'avaient jusqu'ici aucune surface : leur hôte, au livre, est
      « l'action majeure nécessaire au test requis chaque round » — donc la
      piste. Le filtre informe, il n'arbitre pas : une action écartée est
      retirée EN LE DISANT, et une action trop chère se ternit au lieu de
      disparaître (le livre écrit un prix, pas une interdiction). */
  _sheet(vm) {
    // Depuis le lot P6 la feuille s'ouvre aussi sur une MONTURE, qui n'a ni
    // Atout ni actions : le garde n'est donc plus `vm.sheet` mais la présence
    // d'une cible de feuille.
    if (!vm.sheetFor) return "";
    const { visibles = [], ecartees = [], edge = 0 } = vm.sheet || {};
    const puces = visibles
      .map((e) => {
        const cher = e.cost > edge ? " is-over" : "";
        const info = [`${e.name} — ${EdgeActions.costLabel(e)}`, ...(e.lines || [])].join("\n");
        return `<button class="chase-act${cher}" data-action="chase-use" data-id="${vm.sheetFor}" data-key="${e.key}" title="${Utils.escHtml(info)}">
          <b>${Utils.escHtml(EdgeActions.costLabel(e).replace(/ points?$/, ""))}</b> ${Utils.escHtml(e.name)}
        </button>`;
      })
      .join("");
    const reste = ecartees.length
      ? `<p class="chase-act-out">${ecartees.length} écartée${ecartees.length > 1 ? "s" : ""} — ${Utils.escHtml(
          [...new Set(ecartees.map((x) => x.raison))].join(" · "),
        )}</p>`
      : "";
    // Les gestes que le jeton ne montre plus sous 640px vivent ICI : ancrer,
    // avantage positionnel, réserve, sortie de course, saisie de la valeur.
    // C'est la contrepartie du dégraissage du jeton — un geste déplacé, pas
    // un geste perdu.
    const r = vm.sheetRow;
    const gestes = r
      ? `<div class="chase-sheet-acts">
          <button data-action="chase-target" data-id="${r.key}" class="${vm.sheetIsTarget ? "is-on" : ""}">▣ ${vm.sheetIsTarget ? "Retirer l'ancre" : "Ancrer comme cible"}</button>
          <button data-action="chase-edge" data-id="${r.key}" class="${r.edgeUp ? "is-on" : ""}">⊙ Avantage positionnel</button>
          ${
            vm.poolOn
              ? `<span class="chase-sheet-pool">${Utils.escHtml(vm.poolLabel)}
                  <button data-action="chase-pool" data-id="${r.key}" data-delta="-1" aria-label="−1">−</button>
                  <b>${r.pool || 0}</b>
                  <button data-action="chase-pool" data-id="${r.key}" data-delta="1" aria-label="+1">＋</button></span>`
              : ""
          }
          <button data-action="chase-attr" data-id="${r.key}">${Number.isFinite(r.value) ? `Valeur : ${r.value}` : "Saisir la valeur"}</button>
          <button data-action="chase-drop" data-id="${r.key}" data-reason="seme">Semé</button>
          <button data-action="chase-drop" data-id="${r.key}" data-reason="accident">Accident</button>
        </div>`
      : "";
    // Une carrosserie ne dépense pas d'Atout : la pastille de ressource ne
    // s'affiche que sur la feuille d'une PERSONNE.
    const ressource = vm.sheet
      ? `<span class="chase-sheet-edge">${Utils.escHtml(vm.resourceLabel)} ${edge}</span>`
      : "";
    const actions = vm.sheet
      ? visibles.length
        ? `<div class="chase-acts">${puces}</div>`
        : `<p class="chase-act-out">Aucune action de poursuite ouverte à ce participant.</p>`
      : "";
    return `<div class="chase-sheet">
      <p class="chase-sheet-head">${vm.sheetVehicle && vm.sheetVehicle.kind === "drone" ? "◇" : vm.sheetVehicle ? "▣" : vm.glyph} ${CardRenderer._esc(vm.sheetName)}
        ${ressource}
        <button data-action="chase-sheet" data-id="${vm.sheetFor}" aria-label="Fermer">✕</button></p>
      ${this._crew(vm)}
      ${this._legs(vm)}
      ${this._board(vm)}
      ${gestes}
      ${actions}
      ${reste}
    </div>`;
  },

  /** L'ÉQUIPAGE d'une monture (lot P6) : la ligne de caractéristiques de
      l'engin, puis ses occupants. Un nom d'équipier ouvre SA fiche — parce
      que l'Atout et ses 14 actions appartiennent à une personne, jamais à une
      voiture. Le conducteur porte l'accent, pas un glyphe de plus : le
      design system réserve l'accent à l'état actif, et un signe neuf aurait
      fait doublon avec le ⊙ de l'avantage positionnel. */
  _crew(vm) {
    const v = vm.sheetVehicle;
    if (!v) return "";
    const membres = ((vm.sheetRow && vm.sheetRow.crew) || [])
      .map(
        (c) =>
          `<button class="chase-crew${c.driver ? " is-driver" : ""}" data-action="chase-sheet" data-id="${c.pnjId}" title="${c.driver ? "Au volant" : "Passager"} — ouvrir sa fiche et ses actions d'Atout">${CardRenderer._esc(c.name)}${c.driver ? " <em>volant</em>" : ""}</button>`,
      )
      .join("");
    return `<div class="chase-sheet-ride">
      <p class="chase-ride-stats">${
        v.stats.length
          ? Utils.escHtml(v.stats.join(" · "))
          : "Aucune caractéristique de course au catalogue — la valeur du round se saisit ci-dessous."
      }</p>
      <div class="cluster chase-crew-row">${membres || "<em>Personne à bord.</em>"}</div>
    </div>`;
  },

  /** LES JAMBES (lot P7) — le pendant exact de la ligne de stats d'une
      monture : ce qui vous porte, et jusqu'où.

      Elle vit dans la fiche et pas sur le jeton parce que le §6.10 du design
      system n'autorise que trois canaux par jeton (position · valeur qui
      décide · état du test) : un quatrième les aurait tous rendus illisibles.
      Le jeton la porte donc en infobulle, la fiche en clair.

      Anarchy n'a pas de mètres — des portées et des Narrations : on écrit ce
      que le livre dit, plutôt qu'un chiffre qu'il n'a pas donné. */
  _legs(vm) {
    if (vm.sheetVehicle || !vm.sheetRow || vm.sheetRow.crew) return "";
    const m = vm.sheetRow.move;
    if (!m) {
      return vm.moveNote ? `<p class="chase-legs is-narrative">${Utils.escHtml(vm.moveNote)}</p>` : "";
    }
    const paliers = m.steps
      .map(
        (s) =>
          `<span class="chase-legs-step"><b>${vm.moveNum(s.value)}</b> ${Utils.escHtml(s.label.toLowerCase())}${
            s.note ? ` <em>${Utils.escHtml(s.note)}</em>` : ""
          }</span>`,
      )
      .join("");
    const alt = m.alt
      ? `<span class="chase-legs-alt">${Utils.escHtml(m.alt.mode)} ${m.alt.steps.map((s) => vm.moveNum(s.value)).join(" / ")} ${Utils.escHtml(m.unit)} · +${vm.moveNum(m.alt.perHit)}/succès</span>`
      : "";
    return `<p class="chase-legs${m.capped ? " is-capped" : ""}" title="${Utils.escHtml(vm.moveDetail(m))}">
      ${paliers}${m.sprint ? `<span class="chase-legs-step"><b>+${vm.moveNum(m.sprint.perHit)}</b> ${Utils.escHtml(m.unit)}/succès</span>` : ""}${alt}
      ${m.capped ? `<span class="chase-legs-cap">${Utils.escHtml(m.capped)}</span>` : ""}
    </p>`;
  },

  /** Monter, prendre le volant, descendre. C'est ici que se règle « ils
      sautent tous dans le même taxi » : le geste vit sur la fiche du
      PARTICIPANT, là où le MJ le cherche — pas dans un écran de plus. */
  _board(vm) {
    if (vm.sheetVehicle) return "";
    const r = vm.sheetRide;
    const nom = r && r.vehicle ? r.vehicle.name : "la monture";
    return `<div class="chase-sheet-acts">
      <button data-action="chase-board" data-id="${vm.sheetFor}">▣ ${r ? "Changer de monture…" : "Monter dans…"}</button>
      ${
        r
          ? `<button data-action="chase-wheel" data-id="${vm.sheetFor}">Prendre le volant</button>
             <button data-action="chase-leave" data-id="${vm.sheetFor}">Descendre — ${CardRenderer._esc(nom)}</button>`
          : ""
      }
    </div>`;
  },

  /** Le round qui vient de se terminer, en une ligne — et son annulation.
      Le toast s'efface au bout de quelques secondes ; le MJ, lui, s'aperçoit
      de son mé-tap deux minutes plus tard. */
  _recap(vm) {
    const r = vm.recap;
    if (!r) return "";
    const bits = r.moves.map((m) => `${CardRenderer._esc(m.name)} ${m.delta > 0 ? "+" : ""}${m.delta}`);
    if (r.untested.length) bits.push(`${r.untested.length} sans test`);
    return `<p class="chase-recap"><span class="chase-recap-k">R${r.round} →</span>
      ${bits.length ? bits.join(" · ") : "rien n'a bougé"}
      <button data-action="chase-undo-round" title="Annuler la fin de round">↩</button></p>`;
  },

  /** Pied : le rappel du test (ou, en SR5, les quatre actions qui le
      remplacent) et l'action primaire de la boucle. */
  _foot(vm) {
    // En filature, ce sont les deux tests de la phase qui font foi (bloc
    // ci-dessus) : répéter « ⚄ Pilotage + RÉA » ici serait faux.
    // Piste mixte : le rappel ne vaut que pour la moitié des jetons — celui
    // qui roule ne fait pas de test d'Athlétisme. On nomme les deux régimes.
    const alt = vm.testAlt
      ? ` · ${Utils.escHtml(vm.testAlt.terrainLabel.toLowerCase())} : ${Utils.escHtml(vm.testAlt.label)}`
      : "";
    const rappel = vm.trailing
      ? Utils.escHtml(vm.modeSpec.note || "")
      : vm.testRequired
        ? `⚄ ${Utils.escHtml(vm.testLabel)}${vm.testCost ? ` · ${Utils.escHtml(vm.testCost)}` : ""}${vm.opposed ? " · test opposé" : ""}${alt}`
        : vm.actions.length
          ? `Actions : ${vm.actions.map((a) => Utils.escHtml(a.label)).join(" · ")}${alt}`
          : `Pas de test imposé — ${Utils.escHtml(vm.testLabel || "arbitrage MJ")}${alt}`;
    return `<div class="cluster chase-foot">
      <span class="chase-recall">${rappel}</span>
      <button class="btn-primary chase-end" data-action="chase-end-round">▶ ${Utils.escHtml(vm.modeSpec.next || "Round suivant")}</button>
    </div>`;
  },
};

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.ChaseRenderer = ChaseRenderer;
