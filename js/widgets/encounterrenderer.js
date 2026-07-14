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

    // K5 : miroir de la Réserve de menace dans l'en-tête (Anarchy) — visibilité
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
    // M4 : en narratif (Anarchy 2), le brickage n'a pas de fiche active où loger
    // — une bande dédiée en pied de liste (gate scène Matrice), avant l'action
    // de fin de scène. Vide (donc invisible) hors scène Matrice.
    const devicesHtml = narrative ? this._narrativeDevices(rows, state) : "";
    // M6 : Bruit visible aussi en narratif (A2) — deck-attack (M3, Piratage
    // vs serveur) et device-defense (M5b, Protection active) y tournent tous
    // les deux, même hors fiche active.
    const noiseHtml = narrative ? this._matrixNoiseRow(state) : "";
    // Action de fin de scène rendue en pied de liste (le tracker n'a pas de
    // barre d'outils modifiable ici) : réinitialise tous les moniteurs.
    list.innerHTML =
      progressHtml +
      html +
      devicesHtml +
      noiseHtml +
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
    return `<div class="encounter-narrative-note">Anarchy : ordre narratif — <b>touchez une ligne</b> pour la marquer « jouée » · glissez ⠿ pour réordonner</div>`;
  },

  /** Compteur de progression du round narratif : combien de combattants ont
      déjà joué sur le total présent. */
  _narrativeProgress(rows) {
    const present = rows.filter((r) => r.pnj);
    const played = present.filter((r) => r.hasActed).length;
    return `<div class="encounter-progress">${played} / ${present.length} ont joué</div>`;
  },

  /** Ligne narrative (Anarchy) — refonte « tap-to-jouer » lisible : la ligne
      entière reste le bouton (data-action="narrative-toggle"), mais l'état
      « a joué » n'est plus une puce muette. Deux affordances redondantes
      l'annoncent : (1) un ANNEAU-check à gauche (vide = cible évidente avec ✓
      fantôme + feedback pressé ; plein vert = joué) ; (2) une PASTILLE d'état
      à droite (« À jouer » → « Joué »). Le nom + type/combativité sont
      empilés (hiérarchie claire). Pas de jeton d'init, ⚄ ni tri — l'ordre se
      réordonne à la main via ⠿ (câblé par Encounter._initDrag comme .encounter-row).
      Le ✕ (retirer) et « voir la fiche » restent derrière ⋯ pour ne pas
      retirer par mégarde en tapant pour marquer « a joué ». */
  _rowNarrative(r) {
    const { pnjId, hasActed, pnj } = r;
    const name = Utils.escHtml(pnj.name || "");
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
      : `<span class="encounter-nrow-status${hasActed ? " is-done" : ""}">${hasActed ? "Joué" : "À jouer"}</span>`;
    // K10 : les actions rares (voir la fiche / hors de combat / réinitialiser /
    // retirer) vivent derrière le menu ⋯ canonique (.card-kebab/.card-menu,
    // CardMenu.bindDelegation() déjà bindé au boot — aucun câblage neuf ici).
    // Pas de chips inline en narratif : le tap pleine-ligne reste le geste
    // dominant (cf. décision C, PLAN_COCKPIT_COMBAT § K10).
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
      { attrs: `data-action="remove-combatant" data-id="${pnjId}"`, label: "Retirer du combat", danger: true },
    ].filter(Boolean);
    return `<div class="encounter-nrow${hasActed ? " has-acted" : ""}${r.down ? " down" : ""}" data-action="narrative-toggle" data-id="${pnjId}" role="button" tabindex="0" aria-pressed="${hasActed}" title="Toucher pour basculer « a joué »">
      ${dragHandle}
      <span class="encounter-nrow-check" aria-hidden="true">✓</span>
      <div class="encounter-nrow-body">
        <span class="encounter-nrow-name">${colorDot}${name}</span>
        <span class="encounter-nrow-sub"><span class="encounter-kind">${kind}</span>${comb}</span>
      </div>
      ${status}
      ${this._lifeGauge(r)}
      <span class="encounter-controls">${this._rowMenu(menuItems)}</span>
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
      <div class="card-menu" role="menu" hidden>${items
        .map(
          (a) =>
            `<button type="button" role="menuitem" class="card-menu-item${a.danger ? " danger" : ""}" ${a.attrs}>${esc(a.label)}</button>`,
        )
        .join("")}</div>`;
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
    if (r.kind === "matrix") return "CI"; // K4 : combattant matriciel (Matrice)
    const p = r.pnj;
    if (p.kind === "drone") return "Drone";
    if (p.kind === "vehicule") return "Véhicule";
    if (p.type === "spirit") return "Esprit";
    if (p.type === "creature") return "Créature";
    // E1 : un PJ (léger ou complet) ajouté depuis la bibliothèque `Characters`
    // n'a ni `kind:"pj"` (réservé au PJ ad-hoc historique) ni `type` distinctif
    // — sans ce test il retombait sur « PNJ », mislabeling visible partout où
    // ce badge est réutilisé (picker, carte active, ligne du tracker).
    if (Characters.data.all.some((c) => c.id === p.id)) return "PJ";
    return "PNJ";
  },

  /** Mini-jauge de vie (K6) : résumé du moniteur en barre fine, non
      interactive (les cases se cochent sur la fiche), visible en posture
      dock ≥641px (cf. CSS). Fraction remplie = dégâts encaissés, teinte
      --warning/--danger aux seuils ½ et ¾. Rien sans moniteur (gauge
      absente ou total 0 : PJ ad-hoc, CI matricielle) ni hors de combat
      (la ligne porte déjà le badge ☠). */
  _lifeGauge(r) {
    const g = r.gauge;
    if (r.down || !g || !g.total) return "";
    const frac = Math.min(1, g.filled / g.total);
    const tone = frac >= 0.75 ? " is-crit" : frac >= 0.5 ? " is-warn" : "";
    return `<div class="encounter-life" title="Moniteur : ${g.filled}/${g.total}" aria-hidden="true"><span class="encounter-life-fill${tone}" style="width:${Math.round(frac * 100)}%"></span></div>`;
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
    const isMatrix = r.kind === "matrix";
    const initVal = init == null ? "" : String(init);
    // Vague B : la note ne s'affiche en 2ᵉ ligne que si remplie ; sinon elle est
    // masquée (déclutter) et révélée à la demande via « ✎ Note » du menu ⋯.
    const hasNote = !!(note && note.trim());
    // CH-M5 : même calcul générique que sur la fiche (Utils.woundMalus),
    // affiché ici pour que le malus soit visible sans rouvrir la carte. Une CI
    // n'a pas de moniteur chair → pas de malus de blessure.
    const malus = isMatrix ? 0 : Utils.woundMalus(pnj, pnj.edition);
    const malusHtml =
      malus > 0
        ? `<span class="wound-malus-badge" title="Malus de blessure automatique (déjà appliqué à l'initiative)">−${malus}D</span>`
        : "";
    const name = Utils.escHtml(pnj.name || "");
    // PJ : avatar constant avant le nom — couleur + anneau + initiale du
    // joueur (E6, CardRenderer._pcAvatar), jamais un indice isolé.
    const colorDot = r.isPJ ? CardRenderer._pcAvatar(pnj) : "";
    // Nom : bouton « voir la fiche » pour une entité résolvable ou une CI (qui
    // ouvre le tiroir Matrice) ; span inerte pour un PJ ad-hoc (pas de fiche).
    const nameHtml =
      pnj._adhoc && !isMatrix
        ? `<span class="encounter-name is-pj">${colorDot}${name}</span>`
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
    // vit derrière le menu ⋯ canonique .card-menu (K10, _rowMenu).
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
            ${r.isPJ ? 'data-pj="1"' : ""}
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
    // K10 : verbes du tour (fréquents) en chips inline lisibles à toutes tailles
    // de pointeur ; le reste (réordre, note, hors de combat, réinitialiser,
    // retirer) derrière le menu ⋯ canonique (décision C, PLAN_COCKPIT_COMBAT § K10).
    const actedChip = `<button class="encounter-chip encounter-acted-toggle${hasActed ? " is-done" : ""}" data-action="toggle-acted" data-id="${pnjId}" title="${hasActed ? "Marquer « pas encore joué »" : "Marquer « a joué »"}" aria-label="${hasActed ? "Marquer comme pas encore joué" : "Marquer comme a joué"}">${hasActed ? "↩" : "✓"}</button>`;
    const rollChip = `<button class="encounter-chip" data-action="roll-init" data-id="${pnjId}" title="Lancer l'initiative" aria-label="Lancer l'initiative">⚄</button>`;
    const delayChip = r.down
      ? ""
      : r.delayed
        ? `<button class="encounter-chip" data-action="act-now-combatant" data-id="${pnjId}" title="Agir maintenant" aria-label="Agir maintenant">▶</button>`
        : `<button class="encounter-chip" data-action="delay-combatant" data-id="${pnjId}" title="Retarder l'action (tenir son tour)" aria-label="Retarder l'action">⏸</button>`;
    const menuItems = [
      { attrs: `data-action="move-up" data-id="${pnjId}"`, label: "Monter dans l'ordre" },
      { attrs: `data-action="move-down" data-id="${pnjId}"`, label: "Descendre dans l'ordre" },
      hasNote ? null : { attrs: `data-action="note-toggle" data-id="${pnjId}"`, label: "Ajouter une note" },
      pnj._adhoc || r.down
        ? null
        : { attrs: `data-action="knockout-combatant" data-id="${pnjId}"`, label: "Hors de combat" },
      pnj._adhoc
        ? null
        : { attrs: `data-action="heal-combatant" data-id="${pnjId}"`, label: "Réinitialiser les moniteurs" },
      { attrs: `data-action="remove-combatant" data-id="${pnjId}"`, label: "Retirer du combat", danger: true },
    ].filter(Boolean);
    return `<div class="encounter-row${isMatrix ? " is-matrix" : ""}${isActive ? " active-turn" : ""}${hasActed ? " has-acted" : ""}${outOfPass ? " out-of-pass" : ""}${r.down ? " down" : ""}${r.delayed && !r.down ? " delayed" : ""}" data-id="${pnjId}">
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
        ${this._lifeGauge(r)}
        ${this._moraleBanner(r)}
        <input type="text" class="encounter-note${hasNote ? "" : " is-empty"}" placeholder="Note…" value="${Utils.escHtml(note || "")}"
          data-action="set-note" data-id="${pnjId}">
      </div>
      <div class="encounter-controls">
        ${actedChip}
        ${rollChip}
        ${delayChip}
        ${this._rowMenu(menuItems)}
      </div>
    </div>`;
  },

  /** Jeton compact de la réglette K1 (ordonné) : init + nom tronqué, mêmes
      classes d'état que la ligne complète, mêmes tap-actions (focus-combatant,
      comme le nom de la ligne) — rien de nouveau côté contrôleur. */
  _token(r, isActive, outOfPass) {
    const { pnjId, init, pnj } = r;
    const isMatrix = r.kind === "matrix";
    const name = Utils.escHtml(pnj.name || "");
    const avatar = r.isPJ ? CardRenderer._pcAvatar(pnj) : "";
    const initLabel = r.down ? "—" : r.delayed ? "⏸" : init == null ? "·" : String(init);
    const cls = [
      "encounter-token",
      isMatrix && "is-matrix", // K4 : canal --accent2 (jeton CI)
      isActive && "active-turn",
      r.hasActed && "has-acted",
      outOfPass && "out-of-pass",
      r.down && "down",
      r.delayed && !r.down && "delayed",
    ]
      .filter(Boolean)
      .join(" ");
    // K4 : une CI matricielle est _adhoc mais reste tappable (focusCombatant
    // ouvre le tiroir Matrice, pas une fiche de pool).
    const tappable = isMatrix || !pnj._adhoc;
    const action = tappable ? ` data-action="focus-combatant" data-id="${pnjId}"` : "";
    const tag = tappable ? "button" : "div";
    return `<${tag} class="${cls}"${action} title="${name}">
      <span class="encounter-token-init">${initLabel}</span>
      <span class="encounter-token-name">${avatar}${name}</span>
    </${tag}>`;
  },

  /** Jeton narratif (Anarchy) : puce/✓ au lieu d'une init, tap = bascule « a
      joué » (même action que la ligne narrative). */
  _tokenNarrative(r) {
    const { pnjId, hasActed, pnj } = r;
    const name = Utils.escHtml(pnj.name || "");
    const avatar = r.isPJ ? CardRenderer._pcAvatar(pnj) : "";
    const cls = ["encounter-token", hasActed && "has-acted", r.down && "down"].filter(Boolean).join(" ");
    return `<button class="${cls}" data-action="narrative-toggle" data-id="${pnjId}" title="${name}">
      <span class="encounter-token-init">${hasActed ? "✓" : "•"}</span>
      <span class="encounter-token-name">${avatar}${name}</span>
    </button>`;
  },

  /** Filtre de recherche du picker (CH-Q4). Conservé côté renderer, comme
      _activeCardId : c'est de l'état de vue éphémère (le texte tapé dans le
      champ du picker), pas une préférence du contrôleur. Ré-appliqué après
      chaque reconstruction du panneau pour survivre aux _commit (ajout/
      retrait d'un combattant). */
  _pickerQuery: "",

  /** Panneau d'ajout : PJ manuel + champ de filtre + entités résolvables non
      encore en scène (générées, Ombres, spiders) + serveurs (K3, porte 1 de
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
        return `<button class="encounter-candidate" data-action="add-candidate" data-id="${p.id}" data-name="${norm}">
          <span class="encounter-kind">${kind}</span>
          <span class="encounter-candidate-name">${Utils.escHtml(p.name || "Sans nom")}</span>
          <span class="encounter-candidate-add">＋</span>
        </button>`;
      })
      .join("");

    const serverRows = (servers || [])
      .map((s) => {
        const norm = Utils.escHtml(Utils.searchNorm((s.name || "") + " serveur"));
        return `<button class="encounter-candidate" data-action="link-server" data-id="${s.id}" data-name="${norm}">
          <span class="encounter-kind">Serveur</span>
          <span class="encounter-candidate-name">${Utils.escHtml(s.name || "Sans nom")}</span>
          <span class="encounter-candidate-add">⚡</span>
        </button>`;
      })
      .join("");

    panel.innerHTML = `<div class="encounter-add-actions">
        <button class="btn-secondary btn-small" data-action="add-team" title="Toute l'équipe active (désignée dans Personnages), moins ceux déjà en scène">＋ Équipe</button>
        <button class="btn-secondary btn-small" data-action="add-pj">＋ Ajouter un PJ</button>
        <input type="search" class="encounter-picker-search" data-action="filter-candidates"
          placeholder="Filtrer par nom ou type…" value="${Utils.escHtml(this._pickerQuery || "")}"
          aria-label="Filtrer les combattants à ajouter">
      </div>
      <div class="encounter-candidates">
        ${rows}${serverRows}
        ${
          rows || serverRows
            ? ""
            : `<div class="empty-state"><span class="empty-state-title">Aucune entité disponible</span>Générez ou sauvegardez des PNJ, créatures ou esprits pour les ajouter ici.</div>`
        }
        <div class="encounter-picker-empty empty-state" style="display:none"><span class="empty-state-title">Aucun résultat</span>Aucune entité ne correspond à ce filtre.</div>
      </div>`;

    if (this._pickerQuery) this._applyPickerFilter();
  },

  /** E2 : rafale d'init après « + Équipe » — focus le premier champ d'init PJ
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
      d'état (K2), pont decker→scène (M3), appareils matriciels (M4), duel
      decker↔decker (M5a). */
  _activeTop(r, state) {
    return (
      this._activeBandeau(r) +
      this._activeDeckerLink(r, state) +
      this._activeDevices(r, state) +
      this._deckerDuel(r, state) +
      this._matrixNoiseRow(state)
    );
  },

  /** M6 : Bruit de scène (SR5 p.232) — un seul réglage ± partagé par tous les
      jets Matrice du decker (Piratage M3, duel M5a, défense protégée M5b),
      visible dès qu'une scène Matrice est active (même gate que le reste,
      _matrixSceneActive). Scène-scopée (`state.noise`), jamais sur un PNJ. */
  _matrixNoiseRow(state) {
    if (!this._matrixSceneActive(state)) return "";
    const noise = state.noise || 0;
    return `<div class="encounter-noise" title="Bruit matriciel (SR5 p.232) — retranché des jets du decker">
      <span class="encounter-devices-lbl">Bruit</span>
      <button class="btn-icon-tiny" data-action="noise-step" data-delta="-1" aria-label="Bruit −1">−</button>
      <span class="encounter-noise-val">${noise}</span>
      <button class="btn-icon-tiny" data-action="noise-step" data-delta="1" aria-label="Bruit +1">＋</button>
    </div>`;
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

  /** M3 : pont entre le ciblage personnel d'un decker (DeckRun.target,
      cf. cyberdeckrenderer.js) et la Matrice contextuelle de la scène
      (Encounter.state.serverId, K3). Le bloc deck du combattant actif
      affiche déjà sa cible (CardRenderer.render → CyberdeckRenderer.block) ;
      cette ligne ne fait qu'offrir de la promouvoir en un tap si elle
      diffère du serveur déjà lié — réutilise linkServer, aucune donnée neuve. */
  _activeDeckerLink(r, state) {
    if (!r.pnj || r.pnj._adhoc || !r.pnj.cyberdeck) return "";
    const targetId = DeckRun.target(r.pnj);
    if (!targetId || targetId === state.serverId) return "";
    const srv = Servers.find(targetId);
    if (!srv) return "";
    return `<div class="encounter-active-badges">
      <button class="btn-secondary btn-small" data-action="link-server" data-id="${srv.id}" title="Lier ${Utils.escHtml(srv.name)} à la scène">🔗 Lier ${Utils.escHtml(srv.name)} à la scène</button>
    </div>`;
  },

  /** M4 : « Appareils matriciels » — les armes du combattant deviennent des
      cibles brickables. Vit dans le wrapper live `.encounter-active-top` (posé
      par M3), donc rafraîchi à chaque `_render()` (appliquer des dégâts au même
      tour se voit immédiatement). Trois garde-fous, dans l'ordre :
      1. régime d'édition via Matrix.deviceBricking() — "monitor" (SR5/SR6) /
         "narrative" (A2) / null (A1, rien) — jamais un `if (App.edition)` ;
      2. gate contexte Matrice (Silk) : rien hors d'une scène Matrice (serveur
         lié OU un decker présent) — un flingue n'est une cible que si la
         Matrice est en jeu ;
      3. au moins une arme (ItemResolver, même extraction que la carte).
      L'état vit sur l'entrée combattant `r.devices` (= `c.devices`, copié par
      `_rows`), scène-scopé — cf. Encounter.targetDevice. */
  _activeDevices(r, state) {
    const pnj = r.pnj;
    if (!pnj || pnj._adhoc) return "";
    // Fiche active = éditions à tour actif (SR5/SR6) → seul le régime "monitor"
    // s'y affiche. Le narratif (A2) passe par _narrativeDevices (pas de fiche).
    if (Matrix.use(pnj.edition).deviceBricking() !== "monitor") return "";
    if (!this._matrixSceneActive(state)) return "";
    const weapons = ItemResolver.splitEquip(pnj.equip).weapons;
    if (!weapons.length) return "";
    const devices = r.devices || {};
    const protectors = this._deckersInScene(state, pnj.id);
    const rows = weapons.map((w) => this._deviceRow(pnj, w, devices[w], protectors)).join("");
    return `<div class="encounter-devices">
      <div class="encounter-devices-lbl">Appareils matriciels</div>
      ${rows}
    </div>`;
  },

  /** M5 : deckers présents dans la scène (PNJ avec `cyberdeck`), hors un id
      donné — candidats « protecteur » (M5b, Firewall pour un allié) et cibles
      du duel decker↔decker (M5a). Partagé par les deux usages. */
  _deckersInScene(state, excludePnjId) {
    const out = [];
    for (const c of state.combatants) {
      if (c.pnjId === excludePnjId) continue;
      const p = PnjLookup.find(c.pnjId);
      if (p && p.cyberdeck) out.push(p);
    }
    return out;
  },

  /** M5a : decker↔decker — attaquer un autre decker, c'est attaquer son propre
      `pnj.cyberdeck` (déjà modélisé M2, moniteur + toggle-deck-monitor déjà
      câblés sur sa carte). Zéro état neuf : un sélecteur éphémère (lu au clic,
      jamais persisté) + `⚔ Piratage` réutilisant Cyberdeck.rollAttack tel
      quel. Visible seulement si le combattant actif est lui-même decker ET
      qu'au moins un AUTRE decker CIBLABLE est présent dans la scène — combat
      uniquement (hors combat, « quel autre decker viser » n'a pas de sens).
      Cible filtrée sur `Cyberdeck.monitorSize` non nul (SR5/SR6) : Anarchy
      2.0 n'a pas de moniteur de deck propre (M2, biofeedback → Volonté), donc
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
    return `<div class="encounter-duel">
      <span class="encounter-devices-lbl">Duel decker↔decker</span>
      <select class="encounter-duel-select" aria-label="Decker ciblé">${options}</select>
      <button class="react-btn" data-action="decker-attack" data-id="${pnj.id}" title="Piratage contre ce decker (dégâts : cases de son propre moniteur de deck)">⚔ Piratage</button>
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

  /** M4 — bande « Appareils matriciels » pour le tracker NARRATIF (Anarchy 2 :
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
        const weapons = ItemResolver.splitEquip(r.pnj.equip).weapons;
        if (!weapons.length) return "";
        const devices = r.devices || {};
        const protectors = this._deckersInScene(state, r.pnj.id);
        const chips = weapons
          .map((w) => {
            const bricked = !!(devices[w] && devices[w].bricked);
            const idAttrs = `data-id="${r.pnj.id}" data-label="${esc(w)}"`;
            const toggle = `<button class="react-btn${bricked ? " is-off" : ""}" data-action="device-narrative-toggle" ${idAttrs} title="${bricked ? "Réparer" : "Rendre hors service"}">${esc(w)}${bricked ? " — hors service" : ""}</button>`;
            // M5b : la protection peut être posée sur une arme jamais encore
            // ciblée (pas de bouton « Bricker » séparé en narratif) — d peut
            // être absent, _deviceProtection le traite comme non protégé.
            return `<span class="encounter-ndevice-chip">${toggle}${this._deviceProtection(r.pnj, w, devices[w] || {}, protectors)}</span>`;
          })
          .join("");
        return `<div class="encounter-ndevice-row">
          <span class="encounter-ndevice-owner">${esc(r.pnj.name || "")}</span>
          <span class="encounter-ndevice-chips">${chips}</span>
        </div>`;
      })
      .join("");
    if (!blocks) return "";
    return `<div class="encounter-devices encounter-ndevices">
      <div class="encounter-devices-lbl">Appareils matriciels — touchez une arme pour la rendre hors service</div>
      ${blocks}
    </div>`;
  },

  /** Une ligne « appareil » (arme) sur la fiche active (SR5/SR6, mode moniteur).
      Le régime narratif (Anarchy 2) ne passe jamais ici : sa combativité n'a
      pas de fiche active (renderActiveCard sort tôt) — il a sa propre bande,
      _narrativeDevices, dans la liste. `protectors` (M5b) : deckers candidats
      pour protéger cet appareil de leur Firewall (liste déjà exclue de son
      propriétaire, cf. _deckersInScene) — vide si aucun protecteur possible. */
  _deviceRow(pnj, label, d, protectors) {
    const esc = Utils.escHtml;
    const el = esc(label);
    const idAttrs = `data-id="${pnj.id}" data-label="${el}"`;
    if (!d) {
      return `<div class="encounter-device-row">
        <span class="encounter-device-name">${el}</span>
        <button class="react-btn" data-action="target-device" ${idAttrs}>Bricker</button>
      </div>`;
    }
    const brickedBadge = d.bricked
      ? `<span class="encounter-device-bricked">hors service</span>`
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
    return `<div class="encounter-device-row${d.bricked ? " is-bricked" : ""}">
      <span class="encounter-device-name">${el}</span>
      ${rating}
      <div class="monitor-boxes">${boxes}</div>
      ${brickedBadge}${untarget}
      ${this._deviceProtection(pnj, label, d, protectors)}
    </div>`;
  },

  /** M5b : Firewall pour un allié — badge + jet de défense une fois protégé,
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
    return `<span class="encounter-device-protect is-protected">
      <span class="encounter-device-protector-badge">🛡️ ${protectorName}</span>
      <button class="react-btn" data-action="device-defense" ${idAttrs}>Défense</button>
      <button class="react-btn" data-action="device-unprotect" ${idAttrs} title="Retirer la protection" aria-label="Retirer la protection">✕</button>
    </span>`;
  },

  /** Rangée Atout (K5, SR6) : compteur de combat 0-7 par combattant, stocké
      dans l'entrée de scène (c.edge) — pas sur le PNJ (l'Atout dépensé/gagné
      est propre à la rencontre). ± via edge-step ; le plafond +2/tour est un
      avertissement non bloquant (Encounter.adjustEdge). */
  _activeEdge(r) {
    const edge = r.edge || 0;
    const tokens = Array.from({ length: 7 }, (_, i) => `<span class="edge-token${i < edge ? " filled" : ""}"></span>`).join("");
    return `<div class="encounter-edge" title="Atout SR6 (max 7, gain +2/tour de personnage — p.50)">
      <span class="encounter-edge-lbl">Atout</span>
      <button class="btn-icon-tiny" data-action="edge-step" data-delta="-1" data-id="${r.pnjId}" aria-label="Atout −1">−</button>
      <span class="edge-tokens" aria-hidden="true">${tokens}</span>
      <span class="encounter-edge-val">${edge}/7</span>
      <button class="btn-icon-tiny" data-action="edge-step" data-delta="1" data-id="${r.pnjId}" aria-label="Atout +1">＋</button>
    </div>`;
  },

  /** Rangée budget d'actions (K7) du combattant actif : un groupe par type
      d'action de l'édition (majeure/mineure SR6, simple/complexe/gratuite SR5,
      action Anarchy). Jetons tappables façon moniteur (taper = consommer
      jusque-là ; re-taper le dernier = rendre). Le budget vient d'App.
      editionModule.actionBudget(pnj) ; l'usage est stocké c.actionsUsed. */
  _activeActions(r) {
    const budget = App.editionModule.actionBudget(r.pnj);
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
    return `<div class="encounter-actions" title="Actions du tour (économie de l'édition — taper pour consommer)">${groups}</div>`;
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
      CH-C5 : chaque combattant entre en scène avec la zone Détails repliée
      (attributs/réserves/équipement) pour ne pas noyer le tour sous 65
      chiffres — Combat et Capacités restent à leur défaut (c'est justement ce
      qu'on regarde en combat). Levier per-carte, per-zone exposé (_zoneIsOpen
      lit pnj._zoneOpen en priorité, CP1). Le MJ garde le .zone-toggle de la
      carte pour déplier au besoin ; l'effet ne touche la carte du pool qu'à
      son prochain rendu (compact = défaut CH-C1). */
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

    // K4 : combattant matriciel (CI) — fiche minimale, pas de fiche de pool.
    // Toujours re-rendue (le moniteur matriciel vit sur le serveur et change
    // au fil du combat) : on ne met pas en cache via _activeCardId.
    if (active && active.kind === "matrix") {
      this._activeCardId = null;
      this._renderMatrixActiveCard(box, active);
      return;
    }

    // K7-B : tour d'un PJ (piloté par un joueur) — au lieu d'une fiche vide,
    // une console de réaction pour faire réagir les PNJ non actifs (défense,
    // encaissement) vite et sans aller chercher leur carte. Toujours re-rendue
    // (l'état des PNJ change au fil du tour) : pas de cache _activeCardId.
    if (active && active.isPJ) {
      this._activeCardId = null;
      this._renderReactionConsole(box, rows);
      return;
    }

    const pnj = active && active.pnj && !active.pnj._adhoc ? active.pnj : null;
    const id = pnj ? pnj.id : null;
    // M3 : le bandeau (badges + pont decker→scène) doit rester à jour même
    // sans changement de combattant actif (ex. lier un serveur alors que
    // c'est toujours le tour du même decker) — recalculé à chaque appel, à
    // l'inverse de la fiche complète ci-dessous (coûteuse, gardée en cache
    // par id). Trouvé en vérifiant ce pont : sans ce fractionnement, le
    // bouton « Lier à la scène » restait affiché après un clic jusqu'au tour
    // suivant (linkServer réussissait bel et bien, seul l'affichage mentait).
    if (pnj) {
      const top = box.querySelector(":scope > .encounter-active-top");
      // M4 : les appareils matriciels (armes brickables) vivent aussi dans ce
      // wrapper live — appliquer des dégâts au même tour se voit sans attendre
      // le tour suivant (même raison que le pont decker ci-dessus).
      if (top) top.innerHTML = this._activeTop(active, state);
    }
    if (id === this._activeCardId) return; // déjà affiché, laissé au rafraîchissement global
    this._activeCardId = id;

    box.innerHTML = "";
    box.hidden = !pnj;
    if (pnj) {
      pnj._zoneOpen = { ...pnj._zoneOpen, details: false };
      // K2 : bandeau d'état (hors de combat/retardé/devrait fuir, réutilise
      // les badges de la ligne) au-dessus de la carte, note de scène éditable
      // en dessous — la fiche « vue combat » n'affiche que ce que le MJ
      // regarde à chaque tour (l'init est masquée en CSS, les attributs sont
      // déjà repliés par pnj._zoneOpen ci-dessus).
      box.innerHTML = `<div class="encounter-active-top">${this._activeTop(active, state)}</div>`;
      box.appendChild(CardRenderer.render(pnj, [], CardRenderer.liveDeps()));
      // K5 : rangée Atout (SR6, combatModel.edgeTracker) — organe d'édition
      // sur la fiche active. Absente en SR5/Anarchy (drapeau non posé).
      if (model && model.edgeTracker) box.insertAdjacentHTML("beforeend", this._activeEdge(active));
      // K7 : rangée budget d'actions du tour (lue via l'API neutre d'édition
      // actionBudget — jamais une branche App.edition ici).
      if (App.editionModule && App.editionModule.actionBudget) {
        box.insertAdjacentHTML("beforeend", this._activeActions(active));
      }
      box.insertAdjacentHTML("beforeend", this._activeNote(active));
    }
  },

  /** Fiche CI minimale (K4) : ce que le MJ regarde au tour d'une CI —
      A/S/T/F (si le serveur a des attributs), moniteur matriciel (lecture
      seule : la saisie de dégâts se fait dans le tiroir, où ic-box est
      câblé), pouvoir, lien vers le serveur parent (ouvre le tiroir). Pas
      de fausse fiche chair. L'état vivant est lu sur le serveur, jamais copié. */
  _renderMatrixActiveCard(box, r) {
    const m = r.matrix || {};
    const srv = Servers.find(m.serverId);
    if (!srv) {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }
    const M = Matrix.use(srv.edition);
    const ic = M.icCatalog()[m.icKey] || { label: r.name };
    const st = (srv.intrusion && srv.intrusion.ics[m.icKey]) || { dmg: 0, down: false };
    const size = M.icMonitorSize(srv.indice);
    const label = (ic.label || r.name).replace(/^CI /, "");
    const eff = typeof ic.effect === "function" ? ic.effect(srv) : "";
    const attrsHtml = M.hasAttrs()
      ? `<div class="attr-grid">${Matrix.ATTR_KEYS.map((ak) => {
          const v = (srv.attrs || {})[ak.key];
          return `<div class="attr-cell"><span class="attr-label">${ak.badge}</span><span class="attr-value">${v ?? "—"}</span></div>`;
        }).join("")}</div>`
      : "";
    const boxes = Array.from({ length: size }, (_, i) => {
      const isPenalty = (i + 1) % 3 === 0;
      return `<div class="monitor-box${i < st.dmg ? " filled" : ""}${isPenalty ? " penalty" : ""}"></div>`;
    }).join("");
    // K9 : jets de la CI directement sur la fiche active (avant, seul le tiroir
    // les portait). Réutilise Intrusion.rollIC (aucun calcul de réserve dupliqué)
    // via data-action="roll-ic", câblé dans Encounter.init (overlay). Les glaces
    // Anarchy ont des succès fixes (hasAttrs=false) → pas de pastilles de jet.
    const rollsHtml = M.hasAttrs()
      ? `<div class="encounter-ic-rolls">${[
          ["atk", "⚔", "Attaque"],
          ["def", "⛉", "Défense"],
          ["soak", "⛊", "Encaisser"],
          ["per", "◎", "Perception"],
        ]
          .map(
            ([kind, glyph, lbl]) =>
              `<button class="react-btn" data-action="roll-ic" data-id="${srv.id}" data-k="${m.icKey}" data-kind="${kind}" title="${lbl} — ${Utils.escHtml(label)}" aria-label="${lbl} — ${Utils.escHtml(label)}"><span class="react-glyph" aria-hidden="true">${glyph}</span> ${lbl}</button>`
          )
          .join("")}</div>`
      : "";
    box.hidden = false;
    box.innerHTML =
      this._activeBandeau(r) +
      `<div class="encounter-ic-card">
        <div class="encounter-ic-head">
          <span class="encounter-kind is-matrix">CI</span>
          <span class="encounter-ic-name">${Utils.escHtml(label)}</span>
        </div>
        <div class="encounter-ic-server">${Utils.escHtml(srv.name)} · indice ${srv.indice}</div>
        ${attrsHtml}
        <div class="monitor-row"><span class="monitor-label">Moniteur</span><div class="monitor-boxes">${boxes}</div></div>
        ${eff ? `<div class="encounter-ic-power">${Utils.escHtml(eff)}</div>` : ""}
        ${rollsHtml}
        <button class="btn-secondary btn-small encounter-ic-open" data-action="toggle-matrix-drawer" title="Ouvrir le tiroir Matrice (jets, moniteur, surveillance)">⚡ Ouvrir la Matrice</button>
      </div>` +
      this._activeNote(r);
  },

  /** Console de réaction (K7-B) : au tour d'un PJ, une ligne par PNJ vivant
      (hors PJ, hors CI matricielle, hors de combat) avec deux gros boutons —
      ⛉ Défense · ⛊ Encaisser. Les boutons portent `data-roll` (comme les
      pastilles des cartes) : le lancer passe par le handler global de
      DiceRoller, aucune logique de jet nouvelle. Les pools sont ceux déjà
      portés par les cartes (pnj.defense − malus de blessure ; pnj.damageResist
      non réduit, cf. carte). Édition-neutre. En mode narratif (Anarchy) il n'y
      a pas de tour actif → cette console ne s'affiche pas (renderActiveCard
      sort avant). */
  _renderReactionConsole(box, rows) {
    // K7-B + K9 : PNJ chair ET CI matricielles actives (une CI attaquée par un
    // PJ doit pouvoir défendre/encaisser). PJ et combattants « down » exclus.
    const targets = rows.filter((r) => r.pnj && !r.isPJ && !r.down);
    if (!targets.length) {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }
    const rowsHtml = targets
      .map((r) => (r.kind === "matrix" ? this._reactMatrixRow(r) : this._reactPnjRow(r)))
      .join("");
    box.hidden = false;
    box.innerHTML = `<div class="encounter-react">
      <div class="encounter-react-head">Tour d'un PJ — faites réagir les PNJ</div>
      ${rowsHtml}
    </div>`;
  },

  /** Ligne de réaction d'un PNJ chair : ⛉ Défense · ⛊ Encaisser (pools portés
      par la carte, via data-roll → DiceRoller) + chevron ▾ qui déplie la fiche
      complète (K9). DA : glyphes Unicode monochromes (couleur du thème), jamais
      d'émoji couleur — même bloc que le ⛨ déjà en service. */
  _reactPnjRow(r) {
    const pnj = r.pnj;
    const name = Utils.escHtml(pnj.name || "");
    const malus = Utils.woundMalus(pnj, pnj.edition);
    const def = Math.max(0, (pnj.defense || 0) - malus);
    const soak = pnj.damageResist || 0;
    const defBtn = def >= 1
      ? `<button class="react-btn" data-roll="${def}" data-roll-label="Défense — ${name}" data-roll-pnj="${pnj.id}" title="Test de défense (${def} dés)" aria-label="Défense — ${name} (${def} dés)"><span class="react-glyph" aria-hidden="true">⛉</span> ${def}</button>`
      : `<span class="react-btn is-off" title="Pas de réserve de défense"><span class="react-glyph" aria-hidden="true">⛉</span> —</span>`;
    const soakBtn = soak >= 1
      ? `<button class="react-btn" data-roll="${soak}" data-roll-label="Encaissement — ${name}" data-roll-pnj="${pnj.id}" title="Résistance aux dommages (${soak} dés)" aria-label="Encaissement — ${name} (${soak} dés)"><span class="react-glyph" aria-hidden="true">⛊</span> ${soak}</button>`
      : `<span class="react-btn is-off" title="Pas de réserve d'encaissement"><span class="react-glyph" aria-hidden="true">⛊</span> —</span>`;
    // K8 : « Dégâts » ferme la boucle ⛉→⛊→✸ — un résultat NET (déjà résisté),
    // jamais un brut recalculé. damageUI() est lu sur le module d'édition
    // (jamais une branche ici) : chips numériques P/S (SR5/SR6) ou crans de
    // gravité (Anarchy 2, cf. _reactDamageChips).
    const damageBtn = !pnj._adhoc && App.editionModule && App.editionModule.conditionMonitor
      ? `<button class="react-btn react-damage-btn" data-action="react-damage-toggle" data-id="${pnj.id}" title="Appliquer des dégâts nets" aria-label="Dégâts — ${name}"><span class="react-glyph react-glyph-danger" aria-hidden="true">✸</span> Dégâts</button>`
      : "";
    // Chevron réservé aux PNJ résolus (une carte réelle à monter) — pas sur un
    // combattant ad-hoc sans fiche. Le déplié (accordéon, board) est un état de
    // vue éphémère monté à la demande par toggleReactExpand — aucune clé Storage.
    const expand = !pnj._adhoc
      ? `<button class="react-expand-btn" data-action="react-expand" data-id="${pnj.id}" aria-label="Déplier la fiche de ${name}" title="Voir la fiche complète"><span class="react-chevron" aria-hidden="true">▾</span></button>`
      : "";
    const chipsBody = damageBtn ? this._reactDamageChips(pnj) : "";
    return `<div class="react-row">
        <span class="react-name">${name}</span>
        <span class="react-buttons">${defBtn}${soakBtn}${damageBtn}${expand}</span>
      </div>${chipsBody}${expand ? `<div class="react-expand-body" data-expand-for="${pnj.id}" hidden></div>` : ""}`;
  },

  /** K8 : panneau de chips de dégâts d'un PNJ, replié par défaut (déplié par
      toggleReactDamage). Édition-neutre : lit damageUI() sur le module. */
  _reactDamageChips(pnj) {
    const cm = App.editionModule && App.editionModule.conditionMonitor;
    const ui = cm && cm.damageUI ? cm.damageUI(pnj) : null;
    if (!ui) return "";
    if (ui.kind === "wound") {
      const btns = (ui.levels || [])
        .map(
          (lv) =>
            `<button class="react-btn react-btn-danger" data-action="react-wound" data-id="${pnj.id}" data-sev="${lv.sev}">✸ ${Utils.escHtml(lv.label)}</button>`,
        )
        .join("");
      return `<div class="react-damage-chips" data-damage-for="${pnj.id}" hidden>${btns}</div>`;
    }
    const type = this.reactDamageType(pnj.id) || ui.defaultType || "phys";
    const typeToggle = ui.hasType
      ? `<button class="react-btn" data-action="damage-type-toggle" data-id="${pnj.id}" title="Basculer Physique/Étourdissant">${type === "stun" ? "Étourd." : "Phys."} ⇄</button>`
      : "";
    const chips = (ui.chips || [1, 2, 3, 5])
      .map(
        (n) =>
          `<button class="react-btn react-btn-danger" data-action="react-damage" data-id="${pnj.id}" data-n="${n}">✸ ${n}</button>`,
      )
      .join("");
    return `<div class="react-damage-chips" data-damage-for="${pnj.id}" hidden>${typeToggle}${chips}</div>`;
  },

  /** K8 : état de vue éphémère (aucune clé Storage) — type Phys/Étourd.
      sélectionné par PNJ pour le prochain chip appliqué. Purement transitoire
      (comme _activeCardId), reconstruit/oublié au fil des rendus. */
  _reactDamageTypes: {},

  reactDamageType(pnjId) {
    return this._reactDamageTypes[pnjId];
  },

  /** Déplie/replie le panneau de chips (un seul ouvert à la fois, comme
      toggleReactExpand) ; `close=true` force la fermeture (après application
      d'un dégât, cf. Encounter). */
  toggleReactDamage(pnjId, close) {
    const react = document.querySelector(".encounter-react");
    if (!react) return;
    const esc = window.CSS && CSS.escape ? CSS.escape(pnjId) : pnjId;
    const body = react.querySelector(`.react-damage-chips[data-damage-for="${esc}"]`);
    if (!body) return;
    const shouldOpen = close ? false : body.hidden;
    react.querySelectorAll(".react-damage-chips").forEach((b) => (b.hidden = true));
    react.querySelectorAll(".react-damage-btn").forEach((b) => b.classList.remove("is-open"));
    if (shouldOpen) {
      body.hidden = false;
      const btn = react.querySelector(`.react-damage-btn[data-id="${esc}"]`);
      if (btn) btn.classList.add("is-open");
    }
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
    if (btn) btn.textContent = this._reactDamageTypes[pnjId] === "stun" ? "Étourd. ⇄" : "Phys. ⇄";
  },

  /** Ligne de réaction d'une CI (K9) : mêmes glyphes ⛉/⛊, mais la réserve d'une
      CI est dérivée (indice×2, +Firewall à l'encaissement) → data-action
      "roll-ic" vers Intrusion.rollIC, jamais data-roll. Glaces Anarchy (succès
      fixes) : boutons inactifs. Pas de chevron (la CI a sa fiche + le tiroir). */
  _reactMatrixRow(r) {
    const m = r.matrix || {};
    const srv = Servers.find(m.serverId);
    const canRoll = !!(srv && Matrix.use(srv.edition).hasAttrs());
    const name = Utils.escHtml(r.name || (r.pnj && r.pnj.name) || "CI");
    const mk = (kind, glyph, lbl) =>
      canRoll
        ? `<button class="react-btn" data-action="roll-ic" data-id="${m.serverId}" data-k="${m.icKey}" data-kind="${kind}" title="${lbl} — ${name}" aria-label="${lbl} — ${name}"><span class="react-glyph" aria-hidden="true">${glyph}</span> ${lbl}</button>`
        : `<span class="react-btn is-off" title="Glace à succès fixes (ne lance pas les dés)"><span class="react-glyph" aria-hidden="true">${glyph}</span> —</span>`;
    return `<div class="react-row">
        <span class="react-name">${name} <span class="encounter-kind is-matrix">CI</span></span>
        <span class="react-buttons">${mk("def", "⛉", "Défense")}${mk("soak", "⛊", "Encaisser")}</span>
      </div>`;
  },

  /** K9 : déplie/replie la fiche complète d'un PNJ sous sa ligne de réaction.
      Accordéon (board : un seul ouvert — perf mobile + charge cognitive) : on
      replie tout, puis on monte la carte demandée à la volée. Éphémère : aucun
      état persisté, reconstruit au prochain _render. La règle « le nom n'est
      jamais recouvert » (chrome de carte) garantit la contrainte MJ par
      construction. */
  toggleReactExpand(pnjId) {
    const react = document.querySelector(".encounter-react");
    if (!react) return;
    const esc = window.CSS && CSS.escape ? CSS.escape(pnjId) : pnjId;
    const body = react.querySelector(`.react-expand-body[data-expand-for="${esc}"]`);
    if (!body) return;
    const wasOpen = !body.hidden;
    react.querySelectorAll(".react-expand-body").forEach((b) => {
      b.hidden = true;
      b.innerHTML = "";
    });
    react.querySelectorAll(".react-expand-btn").forEach((b) => b.classList.remove("is-open"));
    if (!wasOpen) {
      const pnj = PnjLookup.find(pnjId);
      if (!pnj) return;
      body.appendChild(CardRenderer.render(pnj, [], CardRenderer.liveDeps()));
      body.hidden = false;
      const btn = react.querySelector(`.react-expand-btn[data-id="${esc}"]`);
      if (btn) btn.classList.add("is-open");
    }
  },

  /** Légende commune (trans-édition) des glyphes du cockpit de combat, ajoutée
      à l'Aide « ? » à la suite de la légende d'édition (App._renderHelpLegend).
      Vit ici, avec le cockpit qui possède ces glyphes, plutôt que dupliquée
      dans les 4 helpLegend d'édition. */
  cockpitLegend() {
    return [
      { keys: "⛉", html: "<strong>Défense</strong> — le PNJ (ou la CI) esquive/pare un test." },
      { keys: "⛊", html: "<strong>Encaisser</strong> — résistance aux dommages." },
      { keys: "✸", html: "<strong>Dégâts</strong> — applique un résultat déjà résisté (net) au moniteur." },
      { keys: "⚔", html: "Envoyer au <strong>combat</strong> / rejoindre l'initiative." },
      { keys: "◎", html: "<strong>Perception matricielle</strong> d'une CI." },
      { keys: "⚡", html: "Ouvrir le <strong>tiroir Matrice</strong> (jets, moniteur, surveillance)." },
      { keys: "▾", html: "<strong>Déplier</strong> la fiche complète d'un PNJ en réaction." },
      { keys: "CI", html: "<strong>Contre-mesure d'Intrusion</strong> engagée dans l'initiative." },
      { keys: "🔗", html: "<strong>Lier</strong> un serveur (ou la cible d'un decker) à la scène." },
      { keys: "🛡️", html: "<strong>Protéger</strong> un appareil ciblé avec le Firewall d'un decker allié (M5)." },
    ];
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

  /** Bouton Matrice (barre pouce) + tiroir (K3). srv : serveur déjà résolu
      par Encounter (jamais lu ici — rendu pur), ou null si aucun lien.
      level : état dérivé 0-3 (Encounter.matrixState). Le contenu du tiroir
      réutilise verbatim ServerRenderer.intrusionPanel/matrixDrawerHeader —
      rien n'est recalculé ici (cf. audit intrusion.js pré-K3). */
  renderMatrix(srv, level, launchedKeys) {
    const btn = document.getElementById("encounter-matrix-btn");
    if (btn) {
      btn.hidden = level === 0;
      btn.classList.toggle("is-alert", level === 2);
      btn.classList.toggle("is-ic", level === 3);
      if (srv) {
        const activeCount = srv.intrusion
          ? Object.values(srv.intrusion.ics || {}).filter((s) => s.active && !s.down).length
          : 0;
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
    // K6 : titre de la colonne dockée — même texte, second montage.
    const dockTitle = document.getElementById("matrix-dock-title");
    if (dockTitle) dockTitle.textContent = srv ? "Matrice — " + srv.name : "Matrice";

    // inEncounter + launchedKeys : ServerRenderer ajoute « ⚔ Init » sur chaque
    // CI active pas encore dans l'ordre (K4). Le reste du contenu est le panneau
    // d'intrusion réutilisé verbatim (K3). Calculé une fois, posé dans les deux
    // montages (tiroir mobile/dock ≥1100px) — jamais recalculé deux fois.
    const html = srv
      ? ServerRenderer.matrixDrawerHeader(srv) +
        ServerRenderer.intrusionPanel(srv, { inEncounter: true, launchedKeys: launchedKeys || [] })
      : "";
    const body = document.getElementById("matrix-drawer-body");
    if (body) body.innerHTML = html;
    const dockBody = document.getElementById("matrix-dock-body");
    if (dockBody) dockBody.innerHTML = html;

    // K6 : colonne dockée visible seulement ≥1100px ET état ≥1 (état 0 = 2
    // colonnes, cf. CSS .encounter-modal.has-matrix-dock) — classe posée sur
    // le modal, jamais une media query seule (l'état prime sur la largeur).
    const modal = document.querySelector(".encounter-modal");
    if (modal) modal.classList.toggle("has-matrix-dock", level > 0);
    const dock = document.getElementById("encounter-matrix-dock");
    if (dock) dock.hidden = level === 0;
  },
};
