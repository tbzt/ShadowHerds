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

    // CH combat (Vague N) : mode narratif (Anarchy) — pas d'initiative ni d'ordre,
    // juste un pool qu'on éteint. Piloté par la CAPACITÉ combatModel.narrative
    // déclarée dans le module d'édition (jamais une branche App.edition ici) ;
    // bascule la présentation du modal (boutons chiffrés masqués, cf. CSS).
    const narrative = !!model.narrative;
    const modal = document.querySelector(".encounter-modal");
    if (modal) modal.classList.toggle("is-narrative", narrative);

    const list = document.getElementById("encounter-list");
    if (!list) return;

    // rows est 1:1 avec state.combatants (même ordre) : l'index brut vaut le
    // turnIndex. On rend chaque ligne visible en conservant cet index réel.
    // Vague D : les combattants hors de combat (r.down) sont poussés en fond de
    // liste, sous un séparateur, sans initiative — ils ne rejouent plus.
    const renderOne = (r, i) =>
      narrative
        ? this._rowNarrative(r)
        : this._row(r, i === state.turnIndex, this._outOfPass(r, state, model), this._effectiveInit(r, state, model));
    const visible = rows.map((r, i) => ({ r, i })).filter((x) => x.r.pnj);
    const liveHtml = visible.filter((x) => !x.r.down).map((x) => renderOne(x.r, x.i)).join("");
    const downList = visible.filter((x) => x.r.down);
    const downHtml = downList.length
      ? `<div class="encounter-downsep">Hors de combat · sans initiative</div>` +
        downList.map((x) => renderOne(x.r, x.i)).join("")
      : "";
    const html = liveHtml + downHtml;

    // K1 : réglette compacte (rail de jetons, sœur de la liste complète —
    // jamais reconstruite depuis elle, mêmes rows). Toujours rendue (même
    // vide), la visibilité rail/liste est purement CSS (cf. .rail-expanded).
    const rail = document.getElementById("encounter-rail");
    if (rail) {
      const railHtml = narrative
        ? visible.map((x) => this._tokenNarrative(x.r)).join("")
        : visible
            .map((x) => this._token(x.r, x.i === state.turnIndex, this._outOfPass(x.r, state, model)))
            .join("");
      rail.innerHTML =
        railHtml || `<div class="encounter-rail-empty">Aucun combattant</div>`;
    }

    if (!html) {
      list.innerHTML = `<div class="empty-state">
        <span class="empty-state-title">Aucun combattant</span>
        Ajoutez des combattants avec « ➕ Ajouter » ou depuis leur carte (bouton « ⚔ Combat »).
      </div>`;
      return;
    }
    // En narratif : compteur « X / N ont joué » + ligne expliquant le silence
    // des actions chiffrées (REC-6 FIELD_STUDY — sans elle, l'absence d'init/tri
    // est lue comme une panne plutôt qu'une règle appliquée à la lettre).
    const progressHtml = narrative ? this._narrativeNote() + this._narrativeProgress(rows) : "";
    // Action de fin de scène rendue en pied de liste (le tracker n'a pas de
    // barre d'outils modifiable ici) : réinitialise tous les moniteurs.
    list.innerHTML =
      progressHtml +
      html +
      `<div class="encounter-scene-actions">
        <button class="btn-secondary btn-small" data-action="heal-all" title="Réinitialiser les moniteurs de tous les combattants">⛨ Fin de scène — tout soigner</button>
      </div>`;
  },

  /** Ligne statique : Anarchy n'a pas d'initiative chiffrée, l'ordre est
      décidé à la table et réordonné à la main (glisser-déposer, cf.
      dragHandle de _rowNarrative) — sans ce rappel, le silence de « Lancer &
      classer »/« Trier » (masqués en narratif, cf. CSS .is-narrative) est pris
      pour une panne plutôt qu'une règle appliquée à la lettre. */
  _narrativeNote() {
    return `<div class="encounter-narrative-note">Anarchy : ordre narratif — glissez ⠿ pour réordonner</div>`;
  },

  /** Compteur de progression du round narratif : combien de combattants ont
      déjà joué sur le total présent. */
  _narrativeProgress(rows) {
    const present = rows.filter((r) => r.pnj);
    const played = present.filter((r) => r.hasActed).length;
    return `<div class="encounter-progress">${played} / ${present.length} ont joué</div>`;
  },

  /** Ligne narrative (Anarchy) : la ligne entière est un bouton tap-to-grise
      (data-action="narrative-toggle") ; pas de jeton d'init, ⚄ ni tri — l'ordre
      se réordonne à la main via la poignée de glisse (⠿, comme _row), câblée
      par Encounter._initDrag sur .encounter-nrow au même titre que .encounter-row.
      Le ✕ (retirer) et « voir la fiche » restent derrière le menu ⋯ pour ne
      pas retirer par mégarde en tapant pour marquer « a joué ». */
  _rowNarrative(r) {
    const { pnjId, hasActed, pnj } = r;
    const name = Utils.escHtml(pnj.name || "");
    const kind = this._kindLabel(r);
    // Combativité (Anarchy 2.0, champ threatLevel) affichée en pastille — c'est
    // l'info qui guide « qui décroche quand » (cf. Vague D).
    const comb = pnj.threatLevel
      ? `<span class="encounter-kind encounter-comb">${Utils.escHtml(pnj.threatLevel)}</span>`
      : "";
    const focusItem = pnj._adhoc
      ? ""
      : `<button class="btn-icon-tiny" data-action="focus-combatant" data-id="${pnjId}" title="Voir la fiche" aria-label="Voir la fiche">☰</button>`;
    // Pas de poignée sur les lignes hors de combat (épinglées en bas, non
    // réordonnables) — même garde que _row.
    const dragHandle = r.down
      ? ""
      : `<span class="encounter-drag-handle" title="Glisser pour réordonner" aria-hidden="true">⠿</span>`;
    return `<div class="encounter-nrow${hasActed ? " has-acted" : ""}${r.down ? " down" : ""}" data-action="narrative-toggle" data-id="${pnjId}" role="button" tabindex="0" aria-pressed="${hasActed}" title="A joué — toucher pour basculer">
      ${dragHandle}
      <span class="encounter-nrow-check" aria-hidden="true">✓</span>
      <span class="encounter-nrow-name">${name}</span>
      <span class="encounter-kind">${kind}</span>
      ${comb}
      ${r.down ? this._downBadge() : ""}
      <button class="btn-icon-tiny encounter-row-menu" data-action="row-menu" title="Plus d'actions" aria-label="Plus d'actions">⋯</button>
      <span class="encounter-controls-secondary">
        ${focusItem}
        ${pnj._adhoc || r.down ? "" : `<button class="btn-icon-tiny" data-action="knockout-combatant" data-id="${pnjId}" title="Mettre hors de combat" aria-label="Mettre hors de combat">☠</button>`}
        ${pnj._adhoc ? "" : `<button class="btn-icon-tiny" data-action="heal-combatant" data-id="${pnjId}" title="Réinitialiser les moniteurs (réanimer)" aria-label="Réinitialiser les moniteurs">✚</button>`}
        <button class="btn-icon-tiny danger" data-action="remove-combatant" data-id="${pnjId}" title="Retirer" aria-label="Retirer">✕</button>
      </span>
      ${this._moraleBanner(r)}
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

  /** Badge « hors de combat » (Vague D), partagé ordonné/narratif. */
  _downBadge() {
    return `<span class="encounter-down-badge" title="Moniteur plein — hors de combat">☠ Hors de combat</span>`;
  },

  /** Badge « action retardée » (Vague C) : le combattant tient son tour. */
  _delayedBadge() {
    return `<span class="encounter-delayed-badge" title="Action retardée — tient son tour">⏸ En attente</span>`;
  },

  /** Bandeau de moral (Vague D) : ⚑ « Devrait fuir » (règle de l'édition) ou
      « Moral fragile — à tester » (SR6, cases > Professionnalisme), avec le
      raccourci facultatif « Faire fuir ». Rien si hors combat, moral stable ou
      absent (ex. PJ, Anarchy 1). Partagé ordonné/narratif. */
  _moraleBanner(r) {
    if (r.down || !r.morale || r.morale === "steady") return "";
    const shaky = r.morale === "shaky";
    const label = shaky ? "Moral fragile — à tester" : "Devrait fuir";
    return `<div class="encounter-flee${shaky ? " is-shaky" : ""}">
      <span class="encounter-flee-tag" title="Selon la règle de moral de l'édition">⚑ ${label}</span>
      <button class="btn-small encounter-flee-act" data-action="flee-combatant" data-id="${r.pnjId}" title="Retirer ce combattant (fuite)">Faire fuir</button>
    </div>`;
  },

  _row(r, isActive, outOfPass, effectiveInit) {
    const { pnjId, init, hasActed, note, pnj } = r;
    const initVal = init == null ? "" : String(init);
    // Vague B : la note ne s'affiche en 2ᵉ ligne que si remplie ; sinon elle est
    // masquée (déclutter) et révélée à la demande via « ✎ Note » du menu ⋯.
    const hasNote = !!(note && note.trim());
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

    // CH combat (Vague A) : ligne 2 étages responsive. Le jeton d'init ne porte
    // plus que le score (base + malus + score effectif de passe) ; le lancer ⚄
    // par ligne et la gestion (▲▼✚✕) sont regroupés derrière un menu ⋯ (déplié
    // par data-action="row-menu", cf. Encounter) pour dégager la ligne sur mobile.
    // Vague D : hors de combat → jeton d'init remplacé par « — » (init retirée)
    // + badge ; « devrait fuir » → bandeau de moral avec action « Faire fuir ».
    // Vague B : steppers ±1 autour du champ (ajuster une init lancée sans
    // convoquer le clavier). Pas de re-tri → la ligne ne saute pas.
    const initZone = r.down
      ? `<div class="encounter-init is-out"><span class="encounter-init-out" title="Hors de combat — sans initiative">—</span></div>`
      : `<div class="encounter-init">
        <div class="encounter-init-main">
          <button class="encounter-init-step" data-action="init-step" data-delta="-1" data-id="${pnjId}" title="Initiative −1" aria-label="Diminuer l'initiative">−</button>
          <input class="encounter-init-val" type="text" inputmode="numeric" data-action="set-init" data-id="${pnjId}"
            value="${initVal}" placeholder="—" title="Initiative (base) — saisie directe" aria-label="Initiative">
          <button class="encounter-init-step" data-action="init-step" data-delta="1" data-id="${pnjId}" title="Initiative +1" aria-label="Augmenter l'initiative">+</button>
        </div>
        ${malusHtml}
        ${effHtml}
      </div>`;
    // Vague C1 : poignée de glisse (Pointer Events, souris + tactile) pour
    // réordonner à la main. Pas sur les lignes hors de combat (épinglées en bas).
    const dragHandle = r.down
      ? ""
      : `<span class="encounter-drag-handle" title="Glisser pour réordonner" aria-hidden="true">⠿</span>`;
    return `<div class="encounter-row${isActive ? " active-turn" : ""}${hasActed ? " has-acted" : ""}${outOfPass ? " out-of-pass" : ""}${r.down ? " down" : ""}${r.delayed && !r.down ? " delayed" : ""}" data-id="${pnjId}">
      ${dragHandle}
      ${initZone}
      <div class="encounter-main">
        <div class="encounter-name-row">
          ${isActive ? `<span class="encounter-active-flag" title="Tour actif" aria-label="Tour actif">▸</span>` : ""}
          <span class="encounter-kind">${this._kindLabel(r)}</span>
          ${nameHtml}
          ${r.down ? this._downBadge() : ""}
          ${!r.down && r.delayed ? this._delayedBadge() : ""}
        </div>
        ${this._moraleBanner(r)}
        <input type="text" class="encounter-note${hasNote ? "" : " is-empty"}" placeholder="Note…" value="${Utils.escHtml(note || "")}"
          data-action="set-note" data-id="${pnjId}">
      </div>
      <div class="encounter-controls">
        <label class="encounter-acted" title="A joué ce tour">
          <input type="checkbox" ${hasActed ? "checked" : ""} data-action="toggle-acted" data-id="${pnjId}">
        </label>
        <button class="btn-icon-tiny encounter-row-menu" data-action="row-menu" title="Plus d'actions" aria-label="Plus d'actions">⋯</button>
        <span class="encounter-controls-secondary">
          <button class="btn-icon-tiny" data-action="roll-init" data-id="${pnjId}" title="Lancer l'initiative" aria-label="Lancer l'initiative">⚄</button>
          <button class="btn-icon-tiny" data-action="move-up" data-id="${pnjId}" title="Monter" aria-label="Monter">▲</button>
          <button class="btn-icon-tiny" data-action="move-down" data-id="${pnjId}" title="Descendre" aria-label="Descendre">▼</button>
          ${
            r.down
              ? ""
              : r.delayed
                ? `<button class="btn-icon-tiny" data-action="act-now-combatant" data-id="${pnjId}" title="Agir maintenant" aria-label="Agir maintenant">▶</button>`
                : `<button class="btn-icon-tiny" data-action="delay-combatant" data-id="${pnjId}" title="Retarder l'action (tenir son tour)" aria-label="Retarder l'action">⏸</button>`
          }
          ${hasNote ? "" : `<button class="btn-icon-tiny" data-action="note-toggle" data-id="${pnjId}" title="Ajouter une note" aria-label="Ajouter une note">✎</button>`}
          ${pnj._adhoc || r.down ? "" : `<button class="btn-icon-tiny" data-action="knockout-combatant" data-id="${pnjId}" title="Mettre hors de combat" aria-label="Mettre hors de combat">☠</button>`}
          ${pnj._adhoc ? "" : `<button class="btn-icon-tiny" data-action="heal-combatant" data-id="${pnjId}" title="Réinitialiser les moniteurs (réanimer)" aria-label="Réinitialiser les moniteurs">✚</button>`}
          <button class="btn-icon-tiny danger" data-action="remove-combatant" data-id="${pnjId}" title="Retirer" aria-label="Retirer">✕</button>
        </span>
      </div>
    </div>`;
  },

  /** Jeton compact de la réglette K1 (ordonné) : init + nom tronqué, mêmes
      classes d'état que la ligne complète, mêmes tap-actions (focus-combatant,
      comme le nom de la ligne) — rien de nouveau côté contrôleur. */
  _token(r, isActive, outOfPass) {
    const { pnjId, init, pnj } = r;
    const name = Utils.escHtml(pnj.name || "");
    const initLabel = r.down ? "—" : r.delayed ? "⏸" : init == null ? "·" : String(init);
    const cls = [
      "encounter-token",
      isActive && "active-turn",
      r.hasActed && "has-acted",
      outOfPass && "out-of-pass",
      r.down && "down",
      r.delayed && !r.down && "delayed",
    ]
      .filter(Boolean)
      .join(" ");
    const action = pnj._adhoc ? "" : ` data-action="focus-combatant" data-id="${pnjId}"`;
    const tag = pnj._adhoc ? "div" : "button";
    return `<${tag} class="${cls}"${action} title="${name}">
      <span class="encounter-token-init">${initLabel}</span>
      <span class="encounter-token-name">${name}</span>
    </${tag}>`;
  },

  /** Jeton narratif (Anarchy) : puce/✓ au lieu d'une init, tap = bascule « a
      joué » (même action que la ligne narrative). */
  _tokenNarrative(r) {
    const { pnjId, hasActed, pnj } = r;
    const name = Utils.escHtml(pnj.name || "");
    const cls = ["encounter-token", hasActed && "has-acted", r.down && "down"].filter(Boolean).join(" ");
    return `<button class="${cls}" data-action="narrative-toggle" data-id="${pnjId}" title="${name}">
      <span class="encounter-token-init">${hasActed ? "✓" : "•"}</span>
      <span class="encounter-token-name">${name}</span>
    </button>`;
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
        // data-name = clé de recherche normalisée (jamais affichée).
        const norm = Utils.escHtml(Utils.searchNorm((p.name || "") + " " + kind));
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

  /** Bandeau d'état au-dessus de la fiche active (K2) : hors de
      combat/retardé/devrait fuir — mêmes badges que la ligne (_downBadge,
      _delayedBadge, _moraleBanner), rien de nouveau. Vide si le combattant
      est dans un état stable (cas le plus fréquent). */
  _activeBandeau(r) {
    const shaky = r.morale && r.morale !== "steady" && !r.down;
    if (!r.down && !r.delayed && !shaky) return "";
    return `<div class="encounter-active-badges">
      ${r.down ? this._downBadge() : ""}
      ${!r.down && r.delayed ? this._delayedBadge() : ""}
      ${this._moraleBanner(r)}
    </div>`;
  },

  /** Note de scène éditable sous la fiche active (K2) : même champ que
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
      CH-C5 : chaque combattant entre en scène en fiche COMPACTE (référence
      repliée) pour ne pas noyer le tour sous 65 chiffres — on pose le seul
      levier per-carte exposé (_refIsOpen lit pnj._refOpen en priorité). Le MJ
      garde la .ref-toggle de la carte pour déplier au besoin ; l'effet ne
      touche la carte du pool qu'à son prochain rendu (compact = défaut CH-C1). */
  renderActiveCard(rows, state, model) {
    const box = document.getElementById("encounter-active-card");
    if (!box) return;

    // En narratif il n'y a pas de « tour actif » : pas de fiche épinglée (elle
    // afficherait arbitrairement le 1er combattant). On la masque.
    if (model && model.narrative) {
      this._activeCardId = null;
      box.hidden = true;
      box.innerHTML = "";
      return;
    }

    const active = rows[state.turnIndex];
    const pnj = active && active.pnj && !active.pnj._adhoc ? active.pnj : null;
    const id = pnj ? pnj.id : null;
    if (id === this._activeCardId) return; // déjà affiché, laissé au rafraîchissement global
    this._activeCardId = id;

    box.innerHTML = "";
    box.hidden = !pnj;
    if (pnj) {
      pnj._refOpen = false;
      // K2 : bandeau d'état (hors de combat/retardé/devrait fuir, réutilise
      // les badges de la ligne) au-dessus de la carte, note de scène éditable
      // en dessous — la fiche « vue combat » n'affiche que ce que le MJ
      // regarde à chaque tour (l'init est masquée en CSS, les attributs sont
      // déjà repliés par pnj._refOpen ci-dessus).
      box.innerHTML = this._activeBandeau(active);
      box.appendChild(CardRenderer.render(pnj, [], CardRenderer.liveDeps()));
      box.insertAdjacentHTML("beforeend", this._activeNote(active));
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

    const active = rows[state.turnIndex];
    if (active && active.pnj) {
      if (nameEl) nameEl.textContent = active.pnj.name || "—";
      if (kindEl) kindEl.textContent = this._kindLabel(active);
    }
  },
};
