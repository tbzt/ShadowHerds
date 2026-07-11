"use strict";

/* ============================================================
   ENCOUNTER RENDERER — rendu pur du suivi de combat (round,
   passe, liste ordonnée de combattants, panneau d'ajout). Ne
   modifie rien, ne persiste rien : reçoit l'état + les PNJ déjà
   résolus + le modèle de combat de l'édition, retourne du HTML.
   Toutes les interactions sont câblées par Encounter (contrôleur),
   jamais ici.
   ============================================================ */
const EncounterRenderer = {
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

    const list = document.getElementById("encounter-list");
    if (!list) return;

    // rows est 1:1 avec state.combatants (même ordre) : l'index brut vaut le
    // turnIndex. On rend chaque ligne visible en conservant cet index réel.
    const html = rows
      .map((r, i) =>
        r.pnj
          ? this._row(r, i === state.turnIndex, this._outOfPass(r, state, model), this._effectiveInit(r, state, model))
          : ""
      )
      .join("");

    if (!html) {
      list.innerHTML = `<div class="empty-state">
        <span class="empty-state-title">Aucun combattant</span>
        Ajoutez des combattants avec « ➕ Ajouter » ou depuis leur carte (bouton « ⚔ Combat »).
      </div>`;
      return;
    }
    // Action de fin de scène rendue en pied de liste (le tracker n'a pas de
    // barre d'outils modifiable ici) : réinitialise tous les moniteurs.
    list.innerHTML =
      html +
      `<div class="encounter-scene-actions">
        <button class="btn-secondary btn-small" data-action="heal-all" title="Réinitialiser les moniteurs de tous les combattants">⛨ Fin de scène — tout soigner</button>
      </div>`;
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
    const p = r.pnj;
    if (p.kind === "drone") return "Drone";
    if (p.kind === "vehicule") return "Véhicule";
    if (p.type === "spirit") return "Esprit";
    if (p.type === "creature") return "Créature";
    return "PNJ";
  },

  _row(r, isActive, outOfPass, effectiveInit) {
    const { pnjId, init, hasActed, note, pnj } = r;
    const initVal = init == null ? "" : String(init);
    // CH-M5 : même calcul générique que sur la fiche (Utils.woundMalus),
    // affiché ici pour que le malus soit visible sans rouvrir la carte.
    const malus = Utils.woundMalus(pnj, pnj.edition);
    const malusHtml =
      malus > 0
        ? `<span class="wound-malus-badge" title="Malus de blessure automatique (déjà appliqué à l'initiative)">−${malus}D</span>`
        : "";
    const name = Utils.escHtml(pnj.name || "");
    // PJ ad-hoc : pas de fiche à ouvrir → nom en span inerte.
    const nameHtml = pnj._adhoc
      ? `<span class="encounter-name is-pj">${name}</span>`
      : `<button class="encounter-name" data-action="focus-combatant" data-id="${pnjId}" title="Voir la fiche">${name}</button>`;
    // Score effectif de la passe (SR5, à partir de la passe 2) : le champ de
    // saisie reste sur la base (c'est elle que set-init modifie), le décrément
    // est affiché à côté plutôt qu'en remplacement.
    const effHtml =
      effectiveInit != null
        ? `<span class="encounter-init-eff${effectiveInit <= 0 ? " spent" : ""}" title="Score effectif en passe courante (base − décrément)">→ ${effectiveInit}</span>`
        : "";

    return `<div class="encounter-row${isActive ? " active-turn" : ""}${hasActed ? " has-acted" : ""}${outOfPass ? " out-of-pass" : ""}" data-id="${pnjId}">
      <div class="encounter-init">
        <button class="btn-icon-tiny" data-action="roll-init" data-id="${pnjId}" title="Lancer l'initiative">⚄</button>
        <input class="encounter-init-val" type="text" inputmode="numeric" data-action="set-init" data-id="${pnjId}"
          value="${initVal}" placeholder="—" title="Initiative (base) — saisie directe" aria-label="Initiative">
        ${malusHtml}
        ${effHtml}
      </div>
      <div class="encounter-main">
        <div class="encounter-name-row">
          ${isActive ? `<span class="encounter-active-flag" title="Tour actif" aria-label="Tour actif">▸</span>` : ""}
          <span class="encounter-kind">${this._kindLabel(r)}</span>
          ${nameHtml}
        </div>
        <input type="text" class="encounter-note" placeholder="Note…" value="${Utils.escHtml(note || "")}"
          data-action="set-note" data-id="${pnjId}">
      </div>
      <div class="encounter-controls">
        <label class="encounter-acted" title="A joué ce tour">
          <input type="checkbox" ${hasActed ? "checked" : ""} data-action="toggle-acted" data-id="${pnjId}">
        </label>
        <span class="encounter-controls-secondary">
          <button class="btn-icon-tiny" data-action="move-up" data-id="${pnjId}" title="Monter" aria-label="Monter">▲</button>
          <button class="btn-icon-tiny" data-action="move-down" data-id="${pnjId}" title="Descendre" aria-label="Descendre">▼</button>
          ${pnj._adhoc ? "" : `<button class="btn-icon-tiny" data-action="heal-combatant" data-id="${pnjId}" title="Réinitialiser les moniteurs" aria-label="Réinitialiser les moniteurs">✚</button>`}
          <button class="btn-icon-tiny danger" data-action="remove-combatant" data-id="${pnjId}" title="Retirer">✕</button>
        </span>
      </div>
    </div>`;
  },

  /** Filtre de recherche du picker (CH-Q4). Conservé côté renderer, comme
      _activeCardId : c'est de l'état de vue éphémère (le texte tapé dans le
      champ du picker), pas une préférence du contrôleur. Ré-appliqué après
      chaque reconstruction du panneau pour survivre aux _commit (ajout/
      retrait d'un combattant). */
  _pickerQuery: "",

  /** Panneau d'ajout : PJ manuel + champ de filtre + entités résolvables non
      encore en scène (générées, Ombres, spiders). candidates: [pnj]. */
  renderPicker(candidates) {
    const panel = document.getElementById("encounter-add-panel");
    if (!panel) return;

    const rows = candidates
      .map((p) => {
        const kind = this._kindLabel({ pnj: p });
        // data-name = clé de recherche normalisée (jamais affichée). Les noms
        // générés contiennent souvent un surnom entre guillemets ("…") : on
        // remplace ces " par une espace (Utils.escHtml n'échappe pas le
        // guillemet) sinon l'attribut est tronqué et le filtre ne matche que
        // le premier mot. Frontière de mot préservée pour le filtre par token.
        const norm = Utils.escHtml(Utils.searchNorm((p.name || "") + " " + kind).replace(/"/g, " "));
        return `<button class="encounter-candidate" data-action="add-candidate" data-id="${p.id}" data-name="${norm}">
          <span class="encounter-kind">${kind}</span>
          <span class="encounter-candidate-name">${Utils.escHtml(p.name || "Sans nom")}</span>
          <span class="encounter-candidate-add">＋</span>
        </button>`;
      })
      .join("");

    panel.innerHTML = `<div class="encounter-add-actions">
        <button class="btn-secondary btn-small" data-action="add-pj">＋ Ajouter un PJ</button>
        <input type="search" class="encounter-picker-search" data-action="filter-candidates"
          placeholder="Filtrer par nom ou type…" value="${Utils.escHtml(this._pickerQuery || "")}"
          aria-label="Filtrer les combattants à ajouter">
      </div>
      <div class="encounter-candidates">
        ${rows || `<div class="empty-state"><span class="empty-state-title">Aucune entité disponible</span>Générez ou sauvegardez des PNJ, créatures ou esprits pour les ajouter ici.</div>`}
        <div class="encounter-picker-empty empty-state" style="display:none"><span class="empty-state-title">Aucun résultat</span>Aucune entité ne correspond à ce filtre.</div>
      </div>`;

    if (this._pickerQuery) this._applyPickerFilter();
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

  resetActiveCard() {
    this._activeCardId = null;
    const box = document.getElementById("encounter-active-card");
    if (!box) return;
    box.hidden = true;
    box.innerHTML = "";
  },

  /** Fiche complète (CardRenderer) du combattant dont c'est le tour, affichée
      à côté de la liste. Rien pour un PJ ad-hoc (pas de fiche) ni une scène
      vide. actions=[] : pas de boutons sauvegarder/éditer/virer, la card
      reste malgré tout pleinement interactive (jets, moniteur, drogues…).
      CH-C5 : chaque combattant entre en scène en fiche COMPACTE (référence
      repliée) pour ne pas noyer le tour sous 65 chiffres — on pose le seul
      levier per-carte exposé (_refIsOpen lit pnj._refOpen en priorité). Le MJ
      garde la .ref-toggle de la carte pour déplier au besoin ; l'effet ne
      touche la carte du pool qu'à son prochain rendu (compact = défaut CH-C1). */
  renderActiveCard(rows, state) {
    const box = document.getElementById("encounter-active-card");
    if (!box) return;

    const active = rows[state.turnIndex];
    const pnj = active && active.pnj && !active.pnj._adhoc ? active.pnj : null;
    const id = pnj ? pnj.id : null;
    if (id === this._activeCardId) return; // déjà affiché, laissé au rafraîchissement global
    this._activeCardId = id;

    box.innerHTML = "";
    box.hidden = !pnj;
    if (pnj) {
      pnj._refOpen = false;
      box.appendChild(CardRenderer.render(pnj, [], CardRenderer.liveDeps()));
    }
  },

  /** Résumé persistant dans la sidebar (round/passe + combattant actif),
      visible même le tracker fermé. Masqué si la scène est vide. */
  renderSidebar(state, rows, model) {
    const box = document.getElementById("sidebar-encounter");
    if (!box) return;

    const visible = rows.some((r) => r.pnj);
    box.hidden = !visible;
    // Bouton combat de la topbar : allumé tant qu'une scène est en cours.
    const combatBtn = document.getElementById("topbar-combat-btn");
    if (combatBtn) combatBtn.classList.toggle("is-active", visible);
    if (!visible) return;

    const roundEl = document.getElementById("sidebar-encounter-round");
    if (roundEl) roundEl.textContent = "Round " + state.round + this._passSuffix(state, model);

    const active = rows[state.turnIndex];
    const nameEl = document.getElementById("sidebar-encounter-name");
    const kindEl = document.getElementById("sidebar-encounter-kind");
    if (active && active.pnj) {
      if (nameEl) nameEl.textContent = active.pnj.name || "—";
      if (kindEl) kindEl.textContent = this._kindLabel(active);
    }
  },
};
