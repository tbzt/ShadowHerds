"use strict";

/* ============================================================
   CHARGEN — assistant de création de personnage jouable (PJ)
   ------------------------------------------------------------
   Édition-agnostique : lit App.editionModule.creation (présent
   uniquement pour Anarchy à ce stade — cf. js/editions/anarchy.
   creation.js). Aucune branche `App.edition === …` ici.

   Assistant par étapes avec budget en direct (mode tables de
   points par défaut, mode nuyens fins en option). Toute la
   composition/lecture du brouillon passe par `data-cg` (liaison
   scalaire générique) et `data-cg-action` (mutations de listes),
   délégation scopée à #chargen-overlay — même esprit que le
   pattern ContentModal/Collection, pas de onclick inline.
   ============================================================ */
const CharGen = {
  STEPS: ["concept", "attrs", "skills", "edges", "gear", "narrative", "contacts", "review"],
  STEP_LABELS: {
    concept: "Concept",
    attrs: "Attributs",
    skills: "Compétences",
    edges: "Atouts/Magie",
    gear: "Équipement",
    narrative: "Narratif",
    contacts: "Contacts",
    review: "Révision",
  },
  _DRAFT_KEY: "chargen_draft",

  _step: 0,
  _build: null,

  _creation() {
    return App.editionModule && App.editionModule.creation;
  },

  _esc(s) {
    return CardRenderer._esc(s);
  },

  /* ---- Ouverture / fermeture ---- */
  open() {
    const creation = this._creation();
    if (!creation) {
      toast("Création de personnage non disponible pour cette édition.");
      return;
    }
    this._build = this._loadDraft() || this._newBuild(creation);
    this._step = 0;
    document.getElementById("chargen-overlay").classList.add("open");
    this._renderAll();
  },

  close() {
    document.getElementById("chargen-overlay").classList.remove("open");
  },

  _newBuild(creation) {
    return {
      gameLevel: "runner",
      archetypeTable: "equilibre",
      advancedMode: false,
      meta: "Humain",
      gender: "NB",
      name: "",
      awakened: null,
      attrs: { FOR: 1, AGI: 1, VOL: 1, LOG: 1, CHA: 1 },
      skills: [],
      edges: [],
      weapons: [],
      gear: [],
      extraArmor: 0,
      spells: [],
      mentorSpirit: null,
      keywords: ["", "", "", "", ""],
      behaviors: ["", "", "", ""],
      quotes: ["", "", "", ""],
      lifestyle: "",
      contacts: [],
      notes: "",
    };
  },

  _saveDraft() {
    Storage.set(this._DRAFT_KEY, this._build);
  },
  _loadDraft() {
    return Storage.get(this._DRAFT_KEY, null);
  },
  _clearDraft() {
    Storage.remove(this._DRAFT_KEY);
  },

  /** Copie du brouillon avec les champs narratifs nettoyés (vides retirés). */
  _cleanBuild(b) {
    return {
      ...b,
      keywords: (b.keywords || []).map((s) => s.trim()).filter(Boolean),
      behaviors: (b.behaviors || []).map((s) => s.trim()).filter(Boolean),
      quotes: (b.quotes || []).map((s) => s.trim()).filter(Boolean),
      contacts: (b.contacts || []).filter((c) => c && c.name && c.name.trim()),
    };
  },

  _setPath(obj, path, val) {
    const parts = path.split(".");
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      cur = cur[parts[i]];
      if (cur == null) return;
    }
    cur[parts[parts.length - 1]] = val;
  },

  /* ---- Rendu ---- */
  _renderAll() {
    this._renderSteps();
    this._renderBudget();
    this._renderStep();
    this._renderFooter();
  },

  _renderSteps() {
    const el = document.getElementById("chargen-steps");
    if (!el) return;
    el.innerHTML = this.STEPS.map(
      (s, i) =>
        `<button class="cg-step-tab${i === this._step ? " active" : ""}" data-cg-action="goto" data-idx="${i}">${i + 1}. ${this.STEP_LABELS[s]}</button>`,
    ).join("");
  },

  _renderBudget() {
    const el = document.getElementById("chargen-budget");
    if (!el) return;
    const c = this._creation();
    const b = this._build;
    const level = c.gameLevels[b.gameLevel];
    const table = c.pointTables[b.gameLevel][b.archetypeTable];
    let html;
    if (b.advancedMode) {
      const spent = c.totalCost(b);
      const pct = Math.min(100, Math.round((spent / level.nuyen) * 100));
      html = `<div class="cg-budget-row">
        <span class="cg-budget-cell${spent > level.nuyen ? " over" : ""}">${spent.toLocaleString("fr-FR")} / ${level.nuyen.toLocaleString("fr-FR")} ¥</span>
        <div class="cg-budget-bar"><div class="cg-budget-fill${spent > level.nuyen ? " over" : ""}" style="width:${pct}%"></div></div>
      </div>`;
    } else {
      const attrPts = Object.values(b.attrs).reduce((a, v) => a + (v - 1), 0);
      const skillPts = b.skills.reduce((a, s) => a + (s.val || 0) + (s.spec ? 1 : 0), 0);
      const edgePts = b.edges.reduce((a, e) => a + (e.level || 0), 0);
      const cell = (label, used, total) =>
        `<span class="cg-budget-cell${used > total ? " over" : ""}">${label} ${used}/${total}</span>`;
      html = `<div class="cg-budget-row">
        ${cell("Attributs", attrPts, table.attrPoints)}
        ${cell("Compétences", skillPts, table.skillPoints)}
        ${cell("Atouts", edgePts, table.edgePoints)}
      </div>`;
    }
    el.innerHTML = html;
  },

  _renderStep() {
    const name = this.STEPS[this._step];
    const el = document.getElementById("chargen-body");
    if (!el) return;
    el.innerHTML = this[`_render_${name}`].call(this);
    if (name === "review") this._mountReview();
  },

  _renderFooter() {
    const el = document.getElementById("chargen-footer");
    if (!el) return;
    const isFirst = this._step === 0;
    const isLast = this._step === this.STEPS.length - 1;
    el.innerHTML = `
      <button class="btn-secondary" data-cg-action="discard">Abandonner</button>
      <button class="btn-secondary" data-cg-action="prev" ${isFirst ? "disabled" : ""}>← Précédent</button>
      ${isLast ? `<button class="btn-primary" data-cg-action="save">✓ Créer le personnage</button>` : `<button class="btn-primary" data-cg-action="next">Suivant →</button>`}
    `;
  },

  /* ---- Étape : Concept ---- */
  _render_concept() {
    const c = this._creation();
    const b = this._build;
    const opt = (v, label, sel) => `<option value="${v}" ${sel ? "selected" : ""}>${label}</option>`;
    const levelOpts = Object.entries(c.gameLevels)
      .map(([k, v]) => opt(k, `${this._esc(v.label)} (${v.nuyen.toLocaleString("fr-FR")} ¥)`, b.gameLevel === k))
      .join("");
    const tableOpts = Object.entries(c.pointTables[b.gameLevel])
      .map(([k, v]) => opt(k, this._esc(v.label), b.archetypeTable === k))
      .join("");
    const metaOpts = Object.keys(c.metatypes)
      .map((m) => opt(m, m, b.meta === m))
      .join("");
    const genderOpts = [
      ["M", "Masculin"],
      ["F", "Féminin"],
      ["NB", "Non-binaire"],
    ]
      .map(([v, l]) => opt(v, l, b.gender === v))
      .join("");
    const awakenedOpts = [
      ["", "Aucun"],
      ["hermétique", "Hermétique"],
      ["chamanique", "Chamanique"],
      ["adepte", "Adepte"],
    ]
      .map(([v, l]) => opt(v, l, (b.awakened || "") === v))
      .join("");

    return `<div class="cg-step">
      <div class="cg-field"><label>Nom</label>
        <input type="text" data-cg="name" data-cg-rerender="false" value="${this._esc(b.name)}" placeholder="Nom du personnage"></div>
      <div class="cg-field"><label>Niveau de jeu</label><select data-cg="gameLevel">${levelOpts}</select></div>
      <div class="cg-field"><label>Table de points</label><select data-cg="archetypeTable">${tableOpts}</select></div>
      <div class="cg-field"><label>Métatype</label><select data-cg="meta">${metaOpts}</select></div>
      <div class="cg-field"><label>Genre</label><select data-cg="gender">${genderOpts}</select></div>
      <div class="cg-field"><label>Éveil</label><select data-cg="awakened">${awakenedOpts}</select></div>
      <div class="cg-field"><label><input type="checkbox" data-cg="advancedMode" ${b.advancedMode ? "checked" : ""}> Mode avancé (nuyens fins, transferts libres entre catégories)</label></div>
    </div>`;
  },

  /* ---- Étape : Attributs ---- */
  _render_attrs() {
    const c = this._creation();
    const b = this._build;
    const range = c.metatypes[b.meta];
    const level = c.gameLevels[b.gameLevel];
    const table = c.pointTables[b.gameLevel][b.archetypeTable];
    const attrPtsUsed = Object.values(b.attrs).reduce((a, v) => a + (v - 1), 0);

    const rows = ["FOR", "AGI", "VOL", "LOG", "CHA"]
      .map((k) => {
        const [min, max] = range[k];
        const val = b.attrs[k];
        const atMax = val >= max;
        const outOfRange = val < min || val > max;
        return `<div class="cg-attr-row">
          <span class="cg-attr-label">${k}</span>
          <input type="number" min="${min}" max="${max}" data-cg="attrs.${k}" value="${val}">
          <span class="cg-attr-range">(${min}–${max})</span>
          ${atMax ? '<span class="tag">au max</span>' : ""}
          ${outOfRange ? '<span class="cg-error-text">hors bornes</span>' : ""}
        </div>`;
      })
      .join("");

    return `<div class="cg-step">
      <p class="cg-hint">Table « ${this._esc(table.label)} » : ${table.attrPoints} points d'attributs (base 1), ${level.attrsAtMax} au maximum du métatype pour le niveau ${level.label}.</p>
      ${rows}
      <p class="cg-hint">Points utilisés : ${attrPtsUsed} / ${table.attrPoints}</p>
    </div>`;
  },

  /* ---- Étape : Compétences ---- */
  _render_skills() {
    const c = this._creation();
    const b = this._build;
    const level = c.gameLevels[b.gameLevel];
    const table = c.pointTables[b.gameLevel][b.archetypeTable];
    const usedNames = new Set(b.skills.map((s) => s.name));
    const available = c.skills.filter((s) => !usedNames.has(s.name) && (!s.awakenedOnly || b.awakened));
    const skillPts = b.skills.reduce((a, s) => a + (s.val || 0) + (s.spec ? 1 : 0), 0);

    const rows = b.skills
      .map((s, i) => {
        const def = c.skills.find((d) => d.name === s.name);
        const specOpts =
          `<option value="">— aucune spécialisation —</option>` +
          (def?.specs || [])
            .map((sp) => `<option value="${this._esc(sp)}" ${s.spec === sp ? "selected" : ""}>${this._esc(sp)}</option>`)
            .join("");
        const overCap = (s.val || 0) > level.skillMax;
        return `<div class="cg-list-row">
          <strong>${this._esc(s.name)}</strong>
          <input type="number" min="0" max="${level.skillMax}" data-cg="skills.${i}.val" value="${s.val || 0}" style="width:3.5em">
          <select data-cg="skills.${i}.spec">${specOpts}</select>
          ${overCap ? '<span class="cg-error-text">&gt; plafond</span>' : ""}
          <button class="btn-icon-tiny danger" data-cg-action="remove-skill" data-idx="${i}" title="Retirer">✕</button>
        </div>`;
      })
      .join("");

    const addOpts = available.map((s) => `<option value="${this._esc(s.name)}">${this._esc(s.name)} (${s.attr})</option>`).join("");

    return `<div class="cg-step">
      <p class="cg-hint">Table : ${table.skillPoints} points de compétences${table.skillsAtCap ? `, ${table.skillsAtCap} au rang ${level.skillMax} maximum` : ""}. Plafond d'indice : ${level.skillMax}.</p>
      ${rows || '<p class="cg-hint">Aucune compétence choisie.</p>'}
      <div class="cg-add-row">
        <select id="cg-skill-pick">${addOpts || "<option>— toutes prises —</option>"}</select>
        <button class="btn-secondary btn-small" data-cg-action="add-skill" ${available.length ? "" : "disabled"}>＋ Ajouter</button>
      </div>
      <p class="cg-hint">Points utilisés : ${skillPts} / ${table.skillPoints}</p>
    </div>`;
  },

  /* ---- Étape : Atouts / Magie ---- */
  _render_edges() {
    const c = this._creation();
    const b = this._build;
    const table = c.pointTables[b.gameLevel][b.archetypeTable];
    const edgePts = b.edges.reduce((a, e) => a + (e.level || 0), 0);

    const edgeRows = b.edges
      .map(
        (e, i) =>
          `<div class="cg-list-row"><span>${this._esc(e.text)}</span><span class="tag">niv. ${e.level}</span>
          <button class="btn-icon-tiny danger" data-cg-action="remove-edge" data-idx="${i}" title="Retirer">✕</button></div>`,
      )
      .join("");

    const skillsWithSpec = b.skills.filter((s) => s.spec);
    const specOpts = skillsWithSpec
      .map((s, i) => `<option value="${b.skills.indexOf(s)}">${this._esc(s.name)} (${this._esc(s.spec)})</option>`)
      .join("");
    const skillOpts = b.skills.map((s, i) => `<option value="${i}">${this._esc(s.name)}</option>`).join("");

    let magicHtml = "";
    if (b.awakened) {
      const kitSpells = table.kit.sorts;
      const spellChecks = (Content.spells.anarchy2 || [])
        .map(
          (sp) =>
            `<label class="cg-check"><input type="checkbox" data-cg-action="toggle-spell" data-name="${this._esc(sp.name)}" ${b.spells.includes(sp.name) ? "checked" : ""}> ${this._esc(sp.name)}</label>`,
        )
        .join("");
      const mentorBlock = b.mentorSpirit
        ? `<span class="tag">✦ ${this._esc(b.mentorSpirit.name)}${b.mentorSpirit.desc ? ` — ${this._esc(b.mentorSpirit.desc)}` : ""}</span>
           <button class="btn-icon-tiny danger" data-cg-action="clear-mentor" title="Retirer">✕</button>`
        : `<button class="btn-secondary btn-small" data-cg-action="draw-mentor">✦ Tirer un esprit mentor</button>`;
      magicHtml = `<div class="cg-step-section">
        <div class="cg-section-label">Sorts (${b.spells.length}${kitSpells ? ` / ${kitSpells} au kit` : ""}, 5 000 ¥/sort hors kit)</div>
        <div class="cg-check-grid">${spellChecks}</div>
        <div class="cg-section-label">Esprit mentor</div>
        <div class="cg-add-row">${mentorBlock}</div>
      </div>`;
    }

    return `<div class="cg-step">
      <p class="cg-hint">Table : ${table.edgePoints} points d'atouts (5 000 ¥/niveau). Modèles RR pré-câblés (s'appliquent automatiquement) + atout personnalisé en texte libre pour le reste du système (cyberware/bioware/pouvoirs d'adepte…, p.58-63).</p>
      ${edgeRows || '<p class="cg-hint">Aucun atout.</p>'}
      <div class="cg-add-row">
        <select id="cg-edge-spec-pick">${specOpts || "<option value=\"\">— aucune spécialisation —</option>"}</select>
        <button class="btn-secondary btn-small" data-cg-action="add-edge-rrspec" ${skillsWithSpec.length ? "" : "disabled"}>＋ RR 1 (spé, niv. 2)</button>
      </div>
      <div class="cg-add-row">
        <select id="cg-edge-skill-pick">${skillOpts || "<option value=\"\">— aucune compétence —</option>"}</select>
        <button class="btn-secondary btn-small" data-cg-action="add-edge-rrskill" ${b.skills.length ? "" : "disabled"}>＋ RR 1 (compétence, niv. 5)</button>
      </div>
      <div class="cg-add-row">
        <input type="text" id="cg-edge-custom-label" placeholder="Atout personnalisé…">
        <input type="number" id="cg-edge-custom-level" min="1" value="1" style="width:4em">
        <button class="btn-secondary btn-small" data-cg-action="add-edge-custom">＋ Ajouter</button>
      </div>
      <p class="cg-hint">Points utilisés : ${edgePts} / ${table.edgePoints}</p>
      ${magicHtml}
    </div>`;
  },

  /* ---- Étape : Équipement ---- */
  _render_gear() {
    const c = this._creation();
    const b = this._build;
    const table = c.pointTables[b.gameLevel][b.archetypeTable];
    const weaponNames = Object.keys(EditionAnarchy2.WEAPON_CATALOG);
    const chosenNames = b.weapons.map((w) => w.name);
    const weaponChecks = weaponNames
      .map(
        (n) =>
          `<label class="cg-check"><input type="checkbox" data-cg-action="toggle-weapon" data-name="${this._esc(n)}" ${chosenNames.includes(n) ? "checked" : ""}> ${this._esc(n)}</label>`,
      )
      .join("");
    const gearRows = (b.gear || [])
      .map(
        (g, i) =>
          `<div class="cg-list-row"><span>${this._esc(g)}</span><button class="btn-icon-tiny danger" data-cg-action="remove-gear" data-idx="${i}" title="Retirer">✕</button></div>`,
      )
      .join("");

    return `<div class="cg-step">
      <p class="cg-hint">Kit gratuit (${this._esc(table.label)}) : ${table.kit.armesNormales} arme(s) normale(s), ${table.kit.armesSpe} arme(s) de spécialiste, ${table.kit.equipements} équipement(s) — plus commlink, faux SIN et armure 3 toujours fournis.</p>
      <div class="cg-section-label">Armes (${b.weapons.length} choisies)</div>
      <div class="cg-check-grid">${weaponChecks}</div>
      <div class="cg-section-label">Armure supplémentaire (au-delà des 3 points du kit, 2 500 ¥/point)</div>
      <input type="number" min="0" data-cg="extraArmor" value="${b.extraArmor || 0}" style="width:4em">
      <div class="cg-section-label">Équipement (${(b.gear || []).length})</div>
      ${gearRows}
      <div class="cg-add-row">
        <input type="text" id="cg-gear-text" placeholder="Nom de l'équipement…">
        <button class="btn-secondary btn-small" data-cg-action="add-gear">＋ Ajouter</button>
      </div>
    </div>`;
  },

  /* ---- Étape : Narratif (p.50-51) ---- */
  _render_narrative() {
    const b = this._build;
    const kwFields = b.keywords
      .map(
        (v, i) =>
          `<input type="text" data-cg="keywords.${i}" data-cg-rerender="false" value="${this._esc(v)}" placeholder="Mot-clé ${i + 1}">`,
      )
      .join("");
    const bhFields = b.behaviors
      .map(
        (v, i) =>
          `<input type="text" data-cg="behaviors.${i}" data-cg-rerender="false" value="${this._esc(v)}" placeholder="Comportement ${i + 1}">`,
      )
      .join("");
    const qFields = b.quotes
      .map(
        (v, i) =>
          `<input type="text" data-cg="quotes.${i}" data-cg-rerender="false" value="${this._esc(v)}" placeholder="Réplique ${i + 1}">`,
      )
      .join("");

    return `<div class="cg-step">
      <div class="cg-section-label">5 mots-clés (métatype, origine, rôle, train de vie, libre — p.50-51)</div>
      <div class="cg-narrative-grid">${kwFields}</div>
      <div class="cg-section-label">4 comportements</div>
      <div class="cg-narrative-grid">${bhFields}</div>
      <div class="cg-section-label">4 répliques</div>
      <div class="cg-narrative-grid">${qFields}</div>
      <div class="cg-section-label">Train de vie</div>
      <input type="text" data-cg="lifestyle" data-cg-rerender="false" value="${this._esc(b.lifestyle || "")}" placeholder="ex. Bas, Modeste, Confort, Élevé, Luxe">
    </div>`;
  },

  /* ---- Étape : Contacts ---- */
  _render_contacts() {
    const b = this._build;
    const rows = (b.contacts || [])
      .map(
        (c, i) =>
          `<div class="cg-list-row">
            <input type="text" data-cg="contacts.${i}.name" data-cg-rerender="false" value="${this._esc(c.name || "")}" placeholder="Nom">
            <input type="text" data-cg="contacts.${i}.description" data-cg-rerender="false" value="${this._esc(c.description || "")}" placeholder="Description (rôle, loyauté…)">
            <button class="btn-icon-tiny danger" data-cg-action="remove-contact" data-idx="${i}" title="Retirer">✕</button>
          </div>`,
      )
      .join("");
    return `<div class="cg-step">
      <p class="cg-hint">Contacts nommés du Réseau (niveau de base 0, p.61) — libre, narratif.</p>
      ${rows}
      <button class="btn-secondary btn-small" data-cg-action="add-contact">＋ Ajouter un contact</button>
    </div>`;
  },

  /* ---- Étape : Révision ---- */
  _render_review() {
    return `<div class="cg-step">
      <div id="cg-review-errors" class="cg-review-errors"></div>
      <div id="cg-review-card" class="cg-review-card"></div>
    </div>`;
  },

  _mountReview() {
    const c = this._creation();
    const clean = this._cleanBuild(this._build);
    const errors = c.validate(clean);
    const errBox = document.getElementById("cg-review-errors");
    if (errBox) {
      errBox.innerHTML = errors.length
        ? errors.map((e) => `<div class="cg-error">⚠ ${this._esc(e)}</div>`).join("")
        : '<div class="cg-ok">✓ Personnage valide.</div>';
    }
    const holder = document.getElementById("cg-review-card");
    if (holder) {
      holder.innerHTML = "";
      const preview = c.buildCharacter(clean);
      holder.appendChild(CardRenderer.render(preview, []));
    }
  },

  /* ---- Sauvegarde / abandon ---- */
  _save() {
    const c = this._creation();
    const clean = this._cleanBuild(this._build);
    const errors = c.validate(clean);
    if (errors.length) {
      toast("Corrigez les erreurs avant de créer le personnage.");
      return;
    }
    const pnj = c.buildCharacter(clean);
    Characters.add(pnj);
    this._clearDraft();
    this.close();
    App.showPanel("characters");
  },

  _discard() {
    Dialog.confirm({
      title: "Abandonner la création",
      message: "Abandonner ce personnage en cours de création ? Le brouillon sera perdu.",
      confirmLabel: "Abandonner",
      danger: true,
    }).then((ok) => {
      if (!ok) return;
      this._clearDraft();
      this.close();
    });
  },

  /* ---- Liaison générique des champs scalaires (data-cg) ---- */
  _applyField(el) {
    const path = el.dataset.cg;
    let val;
    if (el.type === "checkbox") val = el.checked;
    else if (el.type === "number") val = Number(el.value);
    else val = el.value;
    if (path === "awakened" && val === "") val = null;
    if (path.startsWith("attrs.")) {
      const key = path.split(".")[1];
      const range = this._creation().metatypes[this._build.meta][key];
      val = Utils.clamp(val, range[0], range[1]);
    }
    this._setPath(this._build, path, val);
    this._saveDraft();
    if (el.dataset.cgRerender === "false") this._renderBudget();
    else this._renderAll();
  },

  /* ---- Actions structurelles (data-cg-action) ---- */
  _handleAction(el) {
    const action = el.dataset.cgAction;
    const b = this._build;
    const c = this._creation();
    const afterMutate = () => {
      this._saveDraft();
      this._renderStep();
      this._renderBudget();
    };

    switch (action) {
      case "goto":
        this._step = Number(el.dataset.idx);
        this._renderAll();
        break;
      case "next":
        this._step = Math.min(this._step + 1, this.STEPS.length - 1);
        this._renderAll();
        break;
      case "prev":
        this._step = Math.max(this._step - 1, 0);
        this._renderAll();
        break;
      case "discard":
        this._discard();
        break;
      case "save":
        this._save();
        break;

      case "add-skill": {
        const sel = document.getElementById("cg-skill-pick");
        const def = c.skills.find((d) => d.name === sel?.value);
        if (def) {
          b.skills.push({ name: def.name, val: 1, attr: def.attr });
          afterMutate();
        }
        break;
      }
      case "remove-skill":
        b.skills.splice(Number(el.dataset.idx), 1);
        afterMutate();
        break;

      case "add-edge-rrspec": {
        const sel = document.getElementById("cg-edge-spec-pick");
        const s = b.skills[Number(sel?.value)];
        const tpl = c.edgeTemplates.find((t) => t.id === "rr-spec");
        if (s && s.spec && tpl) {
          b.edges.push({ level: tpl.level, text: tpl.text(s.name, s.spec) });
          afterMutate();
        }
        break;
      }
      case "add-edge-rrskill": {
        const sel = document.getElementById("cg-edge-skill-pick");
        const s = b.skills[Number(sel?.value)];
        const tpl = c.edgeTemplates.find((t) => t.id === "rr-skill");
        if (s && tpl) {
          b.edges.push({ level: tpl.level, text: tpl.text(s.name) });
          afterMutate();
        }
        break;
      }
      case "add-edge-custom": {
        const label = document.getElementById("cg-edge-custom-label")?.value?.trim();
        const lvl = Number(document.getElementById("cg-edge-custom-level")?.value) || 1;
        if (label) {
          b.edges.push({ level: lvl, text: label });
          afterMutate();
        }
        break;
      }
      case "remove-edge":
        b.edges.splice(Number(el.dataset.idx), 1);
        afterMutate();
        break;

      case "toggle-spell": {
        const name = el.dataset.name;
        b.spells = b.spells.includes(name) ? b.spells.filter((n) => n !== name) : [...b.spells, name];
        afterMutate();
        break;
      }
      case "draw-mentor": {
        const kindMap = { hermétique: "hermetic", chamanique: "shamanic", adepte: "adept" };
        const mentor = Magic.pickMentor("anarchy2", null, kindMap[b.awakened]);
        if (mentor) b.mentorSpirit = mentor;
        else toast("Aucun esprit mentor cette fois — retentez.");
        afterMutate();
        break;
      }
      case "clear-mentor":
        b.mentorSpirit = null;
        afterMutate();
        break;

      case "toggle-weapon": {
        const name = el.dataset.name;
        b.weapons = b.weapons.some((w) => w.name === name)
          ? b.weapons.filter((w) => w.name !== name)
          : [...b.weapons, { name }];
        afterMutate();
        break;
      }
      case "add-gear": {
        const inp = document.getElementById("cg-gear-text");
        const val = inp?.value?.trim();
        if (val) {
          b.gear = b.gear || [];
          b.gear.push(val);
          afterMutate();
        }
        break;
      }
      case "remove-gear":
        b.gear.splice(Number(el.dataset.idx), 1);
        afterMutate();
        break;

      case "add-contact":
        b.contacts = b.contacts || [];
        b.contacts.push({ name: "", description: "" });
        afterMutate();
        break;
      case "remove-contact":
        b.contacts.splice(Number(el.dataset.idx), 1);
        afterMutate();
        break;
    }
  },

  /* ---- Délégation scopée à #chargen-overlay ---- */
  _delegated: false,
  bindDelegation() {
    if (this._delegated) return;
    this._delegated = true;
    const overlay = () => document.getElementById("chargen-overlay");

    document.addEventListener("change", (e) => {
      const el = e.target.closest("[data-cg]");
      if (!el || !overlay()?.contains(el)) return;
      this._applyField(el);
    });
    document.addEventListener("click", (e) => {
      const el = e.target.closest("[data-cg-action]");
      if (!el || !overlay()?.contains(el)) return;
      this._handleAction(el);
    });
  },
};
