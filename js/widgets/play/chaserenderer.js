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
      <div class="chase-track">
        ${this._outcome("caught", vm.outcomes.caught)}
        ${this._anchor(vm)}
        ${vm.lanes.map((l) => this._band(l, vm)).join("")}
        ${this._outcome("lost", vm.outcomes.lost)}
      </div>
      ${this._unplaced(vm)}
      ${this._dropped(vm)}
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
    return `<div class="cluster chase-head">
      <span class="chase-title"><span class="chase-glyph" aria-hidden="true">${vm.glyph}</span> ${vm.mode === "course" ? "Course" : "Poursuite"}</span>
      ${terr}${envs}
      <span class="chase-round">R${vm.round}</span>
      <button class="btn-icon-tiny" data-action="chase-close" title="Fermer la poursuite" aria-label="Fermer la poursuite">✕</button>
    </div>`;
  },

  /** La barre qui NOMME l'attribut du round et sa cause. C'est elle qui
      empêche le chiffre des jetons de mentir. */
  _attrBar(vm) {
    if (!vm.attr) {
      return vm.unruled
        ? `<p class="chase-unruled">⚠ ${Utils.escHtml(vm.terrainNote || "Cette édition ne règle pas ce terrain — l'app tient les positions, vous tenez l'arbitrage.")}</p>`
        : "";
    }
    const cause = vm.envLabel ? `${Utils.escHtml(vm.envLabel)} ⇒` : "Attribut du round ⇒";
    return `<div class="cluster chase-attr-bar">
      <span class="chase-attr-cause">${cause}</span>
      <span class="chase-attr-what">${Utils.escHtml(vm.attr.label)}</span>
      <span class="chase-attr-means">${Utils.escHtml(vm.attr.meaning)}${vm.attr.optional ? " · règle optionnelle" : ""}</span>
      ${vm.failCost ? `<span class="chase-fail">échec ⇒ ${Utils.escHtml(vm.failCost)}</span>` : ""}
    </div>`;
  },

  /** Bandeau d'état : une phrase CALCULÉE (jamais rédigée) — ce que le MJ
      doit lire à un mètre, et rien de plus. */
  _stateBar(vm) {
    const s = vm.summary;
    if (!s) return "";
    if (s.empty)
      return `<p class="chase-state is-empty">Personne sur la piste. <button class="chase-link" data-action="chase-fill" data-key="">Faire entrer les combattants</button></p>`;
    const parts = [
      `Plus proche : <b class="${s.nearest.atAnchor ? "is-danger" : ""}">${Utils.escHtml(s.nearest.lane)}</b>`,
      `plus loin : <b class="${s.farthest.atEdge ? "is-good" : ""}">${Utils.escHtml(s.farthest.lane)}</b>`,
    ];
    if (s.untested) parts.push(`<b class="is-warn">${s.untested} sans test</b>`);
    if (s.dropped) parts.push(`${s.dropped} hors course`);
    return `<p class="chase-state">${parts.join(" · ")}</p>`;
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
      <span class="chase-anchor-lbl">${vm.mode === "course" ? "Meneur" : "Cible"}</span>
      ${this._token(t, vm, { anchor: true })}
      <button class="btn-icon-tiny" data-action="chase-target" data-id="${t.pnjId}" title="Retirer l'ancre" aria-label="Retirer l'ancre">⏏</button>
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
    const dom = vm.dominantId && r.pnjId === vm.dominantId;
    const val = Number.isFinite(r.value)
      ? `<span class="chase-tok-val">${r.value}</span>`
      : `<button class="chase-tok-val is-void" data-action="chase-attr" data-id="${r.pnjId}" title="Valeur inconnue de l'app — l'annoncer">—</button>`;
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
        `<button class="chase-mark chase-roll ${t === "ok" ? "is-ok" : t === "ko" ? "is-ko" : "is-todo"}${dés ? " has-pool" : ""}" data-action="chase-roll" data-id="${r.pnjId}" title="${Utils.escHtml(titre)}">${t === "ok" ? "✓" : t === "ko" ? "✗" : `⚄${dés}`}</button>`,
      );
      // Ce que l'échec coûte ICI : proposé au bon moment, jamais appliqué.
      if (t === "ko" && vm.failCostLabel)
        marks.push(
          `<button class="chase-mark is-fail" data-action="chase-fail" data-id="${r.pnjId}" title="${Utils.escHtml(vm.failCostLabel)} — proposé, jamais appliqué">!</button>`,
        );
      marks.push(
        `<button class="chase-mark is-edge${r.edgeUp ? " is-on" : ""}" data-action="chase-edge" data-id="${r.pnjId}" title="Avantage positionnel — remise d'Atout de 1 sur ceux qui ont échoué">⊙</button>`,
      );
    }
    const trend =
      !opts.anchor && Number.isFinite(r.trend)
        ? `<span class="chase-trend ${r.trend < 0 ? "is-up" : r.trend > 0 ? "is-down" : ""}">${r.trend === 0 ? "=" : r.trend > 0 ? `+${r.trend}` : r.trend}</span>`
        : "";
    const pool = vm.poolOn
      ? `<span class="chase-pool" title="${Utils.escHtml(vm.poolLabel)} — la réserve revient à zéro en fin de poursuite">
          <button data-action="chase-pool" data-id="${r.pnjId}" data-delta="-1" aria-label="Réserve −1">−</button>
          <b>${vm.glyph}${r.pool || 0}</b>
          <button data-action="chase-pool" data-id="${r.pnjId}" data-delta="1" aria-label="Réserve +1">＋</button>
        </span>`
      : "";
    // Le gain d'Atout du round (SR6) : un point automatique que les tables
    // oublient tous les rounds. Proposé au dominant, jamais appliqué seul.
    const grant =
      dom && vm.edgeCompare
        ? `<button class="chase-grant" data-action="chase-grant" data-id="${r.pnjId}" title="Attribuer le point d'Atout du round (attribut le plus élevé)">+1 Atout</button>`
        : "";
    const moves = opts.anchor
      ? ""
      : `<span class="chase-move">
          <button data-action="chase-move" data-id="${r.pnjId}" data-delta="-1" aria-label="Rapprocher de la cible">▲</button>
          <button data-action="chase-move" data-id="${r.pnjId}" data-delta="1" aria-label="Éloigner de la cible">▼</button>
        </span>`;
    return `<span class="chase-tok${dom ? " is-top" : ""}${opts.anchor ? " is-anchor" : ""}" data-id="${r.pnjId}">
      ${vm.attr ? `<span class="chase-tok-lbl">${Utils.escHtml(vm.attr.short)}</span>` : ""}
      ${vm.attr ? val : ""}
      <span class="chase-tok-name">${CardRenderer._esc(r.name)}</span>
      ${trend}${grant}${pool}${marks.join("")}${moves}
      ${opts.anchor ? "" : `<button class="chase-mark is-anchor-set" data-action="chase-target" data-id="${r.pnjId}" title="Ancrer : faire de ce participant la cible de la poursuite">▣</button>`}
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
              <button data-action="chase-restore" data-id="${r.pnjId}" title="Remettre en course" aria-label="Remettre en course">↩</button></span>`,
        )
        .join("")}</p>`;
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
    const rappel = vm.testRequired
      ? `⚄ ${Utils.escHtml(vm.testLabel)}${vm.testCost ? ` · ${Utils.escHtml(vm.testCost)}` : ""}${vm.opposed ? " · test opposé" : ""}`
      : vm.actions.length
        ? `Actions : ${vm.actions.map((a) => Utils.escHtml(a.label)).join(" · ")}`
        : `Pas de test imposé — ${Utils.escHtml(vm.testLabel || "arbitrage MJ")}`;
    return `<div class="cluster chase-foot">
      <span class="chase-recall">${rappel}</span>
      <button class="btn-primary chase-end" data-action="chase-end-round">▶ Fin de round</button>
    </div>`;
  },
};

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.ChaseRenderer = ChaseRenderer;
