"use strict";

/* ============================================================
   CHARGEN — assistant de création de personnage jouable (PJ)
   ------------------------------------------------------------
   Édition-agnostique : lit App.editionModule.creation (présent
   uniquement pour Anarchy à ce stade — cf. js/editions/anarchy2.
   creation.js). Aucune branche `App.edition === …` ni catalogue
   d'édition nommé ici : tout passe par l'API `creation.*`.

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
    const draft = this._loadDraft();
    this._resumed = !!draft;
    this._build = draft || this._newBuild(creation);
    this._build.skills = this._normalizeSkillSpecs(this._build.skills);
    this._step = 0;
    document.getElementById("chargen-overlay").classList.add("open");
    this._renderAll();
  },

  /** Bandeau de reprise de brouillon (masquable, propose de repartir à zéro). */
  _resumeBanner() {
    if (!this._resumed) return "";
    return `<div class="cg-resume-banner">
      <span>↺ Brouillon repris.</span>
      <button class="btn-secondary btn-small" data-cg-action="restart">Recommencer à zéro</button>
      <button class="btn-icon-tiny" data-cg-action="dismiss-resume" title="Masquer">✕</button>
    </div>`;
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
      knowledges: [],
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
      knowledges: (b.knowledges || []).map((s) => s.trim()).filter(Boolean),
      contacts: (b.contacts || []).filter((c) => c && c.name && c.name.trim()),
    };
  },

  /** Migre les compétences vers le modèle multi-spés `specs: string[]`
      (tolère l'ancienne forme scalaire `spec` des brouillons/presets). */
  _normalizeSkillSpecs(skills) {
    return (skills || []).map((s) => {
      const specs = s.specs || (s.spec ? [s.spec] : []);
      const { spec, ...rest } = s;
      return { ...rest, specs };
    });
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

  /** Erreurs live de l'étape courante, rendues en tête de l'étape. */
  _stepErrorBox(step) {
    const errs = this._creation().stepErrors(this._build)[step] || [];
    if (!errs.length) return "";
    return `<div class="cg-step-errors">${errs
      .map((e) => `<div class="cg-error-text">⚠ ${this._esc(e)}</div>`)
      .join("")}</div>`;
  },

  /** Jauge « utilisé / offert par le kit » : ambre quand on paie au-delà
      (payer est légal en Anarchy), le rouge restant réservé aux vraies erreurs. */
  _kitMeter(used, free, label) {
    const over = used > free;
    const paid = over ? ` <span class="cg-kit-paid">+${used - free} payant</span>` : "";
    return `<span class="cg-kit-meter${over ? " over" : ""}">${label} : ${used}/${free}${paid}</span>`;
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
    const stepErr = this._creation().stepErrors(this._build);
    el.innerHTML = this.STEPS.map((s, i) => {
      const hasErr = (stepErr[s] || []).length > 0;
      return `<button class="cg-step-tab${i === this._step ? " active" : ""}${hasErr ? " has-error" : ""}" data-cg-action="goto" data-idx="${i}" aria-current="${i === this._step ? "step" : "false"}">${i + 1}. ${this.STEP_LABELS[s]}${hasErr ? ' <span class="cg-tab-dot">●</span>' : ""}</button>`;
    }).join("");
  },

  _renderBudget() {
    const el = document.getElementById("chargen-budget");
    if (!el) return;
    const c = this._creation();
    const b = this._build;
    const level = c.gameLevels[b.gameLevel];
    const table = c.pointTables[b.gameLevel][b.archetypeTable];
    const spent = c.totalCost(b);
    const pct = Math.min(100, Math.round((spent / level.nuyen) * 100));
    // Mode avancé : la barre nuyen EST la limite. Mode table : coût indicatif
    // (la limite réelle sont les cellules de catégories affichées dessous).
    const barOver = b.advancedMode && spent > level.nuyen;
    const nuyenLabel = b.advancedMode
      ? `${spent.toLocaleString("fr-FR")} / ${level.nuyen.toLocaleString("fr-FR")} ¥`
      : `Coût ${spent.toLocaleString("fr-FR")} ¥ · budget ${level.nuyen.toLocaleString("fr-FR")} ¥`;
    let html = `<div class="cg-budget-row">
      <span class="cg-budget-cell${barOver ? " over" : ""}">${nuyenLabel}</span>
      <div class="cg-budget-bar"><div class="cg-budget-fill${barOver ? " over" : ""}" style="width:${pct}%"></div></div>
    </div>`;
    if (!b.advancedMode) {
      const attrPts = c.attrPointsUsed(b.attrs);
      const skillPts = c.skillPointsUsed(b);
      const edgePts = b.edges.reduce((a, e) => a + (e.level || 0), 0);
      const cell = (label, used, total) =>
        `<span class="cg-budget-cell${used > total ? " over" : ""}">${label} ${used}/${total}</span>`;
      html += `<div class="cg-budget-row cg-budget-cats">
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
    el.innerHTML = this._resumeBanner() + this[`_render_${name}`].call(this);
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

    const presetBtns = (c.presets || [])
      .map(
        (p) =>
          `<button class="btn-secondary btn-small cg-preset-btn" data-cg-action="apply-preset" data-id="${p.id}">${this._esc(p.label)}</button>`,
      )
      .join("");

    return `<div class="cg-step">
      ${this._stepErrorBox("concept")}
      <div class="cg-preset-row">
        <span class="cg-section-label">Démarrage rapide</span>
        <div class="cg-preset-btns">${presetBtns}</div>
      </div>
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
    const attrPtsUsed = c.attrPointsUsed(b.attrs);
    let atMaxCount = 0;

    const rows = ["FOR", "AGI", "VOL", "LOG", "CHA"]
      .map((k) => {
        const [min, max] = range[k];
        const val = b.attrs[k];
        const atMax = val >= max;
        if (atMax) atMaxCount++;
        const outOfRange = val < min || val > max;
        return `<div class="cg-attr-row">
          <span class="cg-attr-label">${k}</span>
          <div class="cg-stepper">
            <button class="cg-step-btn" data-cg-action="attr-dec" data-key="${k}" ${val <= min ? "disabled" : ""} aria-label="Diminuer ${k}">−</button>
            <input type="number" min="${min}" max="${max}" data-cg="attrs.${k}" value="${val}">
            <button class="cg-step-btn" data-cg-action="attr-inc" data-key="${k}" ${val >= max ? "disabled" : ""} aria-label="Augmenter ${k}">＋</button>
          </div>
          <span class="cg-attr-range">(${min}–${max})</span>
          ${atMax ? '<span class="tag">au max</span>' : ""}
          ${outOfRange ? '<span class="cg-error-text">hors bornes</span>' : ""}
        </div>`;
      })
      .join("");

    const overMax = atMaxCount > level.attrsAtMax;
    return `<div class="cg-step">
      ${this._stepErrorBox("attrs")}
      <p class="cg-hint">Table « ${this._esc(table.label)} » : ${table.attrPoints} points d'attributs, comptés depuis 0 (somme des indices, p.85). Dé d'Anarchy du ${this._esc(b.meta)} : ${range.anarchy}.</p>
      ${rows}
      <p class="cg-hint">Points utilisés : ${attrPtsUsed} / ${table.attrPoints} · <span class="${overMax ? "cg-error-text" : ""}">attributs au max : ${atMaxCount} / ${level.attrsAtMax}</span></p>
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
    const skillPts = c.skillPointsUsed(b);
    const atCapCount = b.skills.filter((s) => (s.val || 0) >= level.skillMax).length;

    const rows = b.skills
      .map((s, i) => {
        const def = c.skills.find((d) => d.name === s.name);
        const specs = s.specs || [];
        const overCap = (s.val || 0) > level.skillMax;
        const attrKey = s.attr || def?.attr || "LOG";
        const attrVal = b.attrs[attrKey] || 0;
        const pool = (s.val || 0) + attrVal;
        const poolChip = `<span class="cg-pool" title="Pool = ${s.val || 0} (${this._esc(s.name)}) + ${attrVal} (${attrKey})">⚄ ${pool}</span>`;
        // Une puce lançable par spécialisation (indice+2), retirable.
        const specChips = specs
          .map(
            (sp) =>
              `<span class="cg-spec-chip" title="Spécialisation ${this._esc(sp)} : ${(s.val || 0) + 2} + ${attrVal} (${attrKey})">◊ ${this._esc(sp)} <strong>${(s.val || 0) + 2 + attrVal}</strong><button class="cg-spec-x" data-cg-action="remove-spec" data-idx="${i}" data-spec="${this._esc(sp)}" title="Retirer la spécialisation">✕</button></span>`,
          )
          .join("");
        const remaining = (def?.specs || []).filter((sp) => !specs.includes(sp));
        const canAddSpec = (s.val || 0) >= 1 && remaining.length > 0;
        const addSpec = remaining.length
          ? `<span class="cg-spec-add">
              <select id="cg-skill-spec-pick-${i}">${remaining.map((sp) => `<option value="${this._esc(sp)}">${this._esc(sp)}</option>`).join("")}</select>
              <button class="btn-icon-tiny" data-cg-action="add-spec" data-idx="${i}" ${canAddSpec ? "" : "disabled"} title="${canAddSpec ? "Ajouter une spécialisation (2 500 ¥)" : "Indice ≥ 1 requis"}">＋ spé</button>
            </span>`
          : "";
        return `<div class="cg-list-row cg-skill-row">
          <strong>${this._esc(s.name)}</strong>
          <input type="number" min="0" max="${level.skillMax}" data-cg="skills.${i}.val" value="${s.val || 0}" style="width:3.5em">
          ${poolChip}
          ${overCap ? '<span class="cg-error-text">&gt; plafond</span>' : ""}
          <button class="btn-icon-tiny danger" data-cg-action="remove-skill" data-idx="${i}" title="Retirer">✕</button>
          <div class="cg-spec-line">${specChips}${addSpec}</div>
        </div>`;
      })
      .join("");

    const addOpts = available.map((s) => `<option value="${this._esc(s.name)}">${this._esc(s.name)} (${s.attr})</option>`).join("");
    const capNote =
      table.skillsAtCap != null
        ? ` · <span class="${atCapCount > table.skillsAtCap ? "cg-error-text" : ""}">au plafond ${level.skillMax} : ${atCapCount} / ${table.skillsAtCap}</span>`
        : "";

    // Connaissances (p.85) : 2 500 ¥ = 1 point de compétence chacune.
    const knowledges = b.knowledges || [];
    const knowledgeRows = knowledges
      .map(
        (k, i) =>
          `<div class="cg-list-row"><span>${this._esc(k)}</span><button class="btn-icon-tiny danger" data-cg-action="remove-knowledge" data-idx="${i}" title="Retirer">✕</button></div>`,
      )
      .join("");

    return `<div class="cg-step">
      ${this._stepErrorBox("skills")}
      <p class="cg-hint">Table : ${table.skillPoints} points de compétences (spés et connaissances comprises). Plafond d'indice : ${level.skillMax}. ⚄ = pool de dés (indice + attribut). Plusieurs spés possibles par compétence (indice ≥ 1, sans limite de nombre).</p>
      ${rows || '<p class="cg-hint">Aucune compétence choisie.</p>'}
      <div class="cg-add-row">
        <select id="cg-skill-pick">${addOpts || "<option>— toutes prises —</option>"}</select>
        <button class="btn-secondary btn-small" data-cg-action="add-skill" ${available.length ? "" : "disabled"}>＋ Ajouter</button>
      </div>
      <div class="cg-section-label">Connaissances <span class="cg-section-note">2 500 ¥ chacune = 1 point</span></div>
      ${knowledgeRows}
      <div class="cg-add-row">
        <input type="text" id="cg-knowledge-text" placeholder="ex. Gangs de Seattle, Sécurité corpo, Magie…">
        <button class="btn-secondary btn-small" data-cg-action="add-knowledge">＋ Ajouter</button>
      </div>
      <p class="cg-hint">Points utilisés : ${skillPts} / ${table.skillPoints}${capNote}</p>
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

    // Une option par paire (compétence, spécialisation) pour cibler le RR.
    const specPairs = [];
    b.skills.forEach((s, i) => (s.specs || []).forEach((sp) => specPairs.push({ i, name: s.name, spec: sp })));
    const specOpts = specPairs
      .map((p) => `<option value="${p.i}::${this._esc(p.spec)}">${this._esc(p.name)} (${this._esc(p.spec)})</option>`)
      .join("");
    const skillOpts = b.skills.map((s, i) => `<option value="${i}">${this._esc(s.name)}</option>`).join("");

    let magicHtml = "";
    if (b.awakened) {
      const kitSpells = table.kit.sorts;
      const spellChecks = c.spellPool()
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
        <div class="cg-section-label">Sorts <span class="cg-section-note">${this._kitMeter(b.spells.length, kitSpells, "au kit")} · 5 000 ¥/sort hors kit</span></div>
        <div class="cg-check-grid">${spellChecks}</div>
        <div class="cg-section-label">Esprit mentor</div>
        <div class="cg-add-row">${mentorBlock}</div>
      </div>`;
    }

    return `<div class="cg-step">
      ${this._stepErrorBox("edges")}
      <p class="cg-hint">Table : ${table.edgePoints} points d'atouts (5 000 ¥/niveau). Modèles RR pré-câblés (s'appliquent automatiquement) + atout personnalisé en texte libre pour le reste du système (cyberware/bioware/pouvoirs d'adepte…, p.58-63).</p>
      ${edgeRows || '<p class="cg-hint">Aucun atout.</p>'}
      <div class="cg-add-row">
        <select id="cg-edge-spec-pick">${specOpts || "<option value=\"\">— aucune spécialisation —</option>"}</select>
        <button class="btn-secondary btn-small" data-cg-action="add-edge-rrspec" ${specPairs.length ? "" : "disabled"}>＋ RR 1 (spé, niv. 2)</button>
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
    const catalog = c.weaponCatalog();
    const chosenNames = b.weapons.map((w) => w.name);
    const specialistNames = new Set(catalog.filter((w) => w.specialist).map((w) => w.name));
    const chosenNormal = b.weapons.filter((w) => !specialistNames.has(w.name)).length;
    const chosenSpe = b.weapons.filter((w) => specialistNames.has(w.name)).length;
    const weaponCheck = (w) =>
      `<label class="cg-check"><input type="checkbox" data-cg-action="toggle-weapon" data-name="${this._esc(w.name)}" ${chosenNames.includes(w.name) ? "checked" : ""}> ${this._esc(w.name)}</label>`;
    const normalChecks = catalog.filter((w) => !w.specialist).map(weaponCheck).join("");
    const speChecks = catalog.filter((w) => w.specialist).map(weaponCheck).join("");
    const gearRows = (b.gear || [])
      .map(
        (g, i) =>
          `<div class="cg-list-row"><span>${this._esc(g)}</span><button class="btn-icon-tiny danger" data-cg-action="remove-gear" data-idx="${i}" title="Retirer">✕</button></div>`,
      )
      .join("");

    return `<div class="cg-step">
      ${this._stepErrorBox("gear")}
      <p class="cg-hint">Kit gratuit (${this._esc(table.label)}) : commlink, faux SIN et armure 3 toujours fournis. Au-delà des quotas, chaque élément est payé en nuyens.</p>
      <div class="cg-section-label">Armes normales <span class="cg-section-note">${this._kitMeter(chosenNormal, table.kit.armesNormales, "au kit")}</span></div>
      <div class="cg-check-grid">${normalChecks}</div>
      ${speChecks ? `<div class="cg-section-label">Armes de spécialiste <span class="cg-section-note">${this._kitMeter(chosenSpe, table.kit.armesSpe, "au kit")}</span></div>
      <div class="cg-check-grid">${speChecks}</div>` : ""}
      <div class="cg-section-label">Armure supplémentaire <span class="cg-section-note">au-delà des 3 du kit, 2 500 ¥/point</span></div>
      <input type="number" min="0" data-cg="extraArmor" value="${b.extraArmor || 0}" style="width:4em">
      <div class="cg-section-label">Équipement <span class="cg-section-note">${this._kitMeter((b.gear || []).length, table.kit.equipements, "au kit")}</span></div>
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
    const roles = ["Métatype", "Origine", "Rôle", "Train de vie", "Libre"];
    // Suggestion par défaut (une seule fois) : le mot-clé 1 reprend le métatype.
    if (!b.keywords[0]) {
      b.keywords[0] = b.meta;
      this._saveDraft();
    }
    const kwFields = b.keywords
      .map(
        (v, i) =>
          `<label class="cg-narrative-field">
            <span class="cg-narrative-role">${this._esc(roles[i] || `Mot-clé ${i + 1}`)}</span>
            <input type="text" data-cg="keywords.${i}" data-cg-rerender="false" value="${this._esc(v)}" placeholder="${this._esc(roles[i] || `Mot-clé ${i + 1}`)}">
          </label>`,
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
    const diceBtn = (field) =>
      `<button class="btn-secondary btn-small cg-dice-btn" data-cg-action="draw-narrative" data-field="${field}" title="Remplit les champs vides">🎲 Inspiration</button>`;

    return `<div class="cg-step">
      <div class="cg-section-label">5 mots-clés (p.50-51) ${diceBtn("keywords")}</div>
      <div class="cg-narrative-grid">${kwFields}</div>
      <div class="cg-section-label">4 comportements ${diceBtn("behaviors")}</div>
      <div class="cg-narrative-grid">${bhFields}</div>
      <div class="cg-section-label">4 répliques ${diceBtn("quotes")}</div>
      <div class="cg-narrative-grid">${qFields}</div>
      <p class="cg-hint">Le mot-clé « Train de vie » sert aussi de train de vie du personnage.</p>
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
    const stepErr = c.stepErrors(clean);
    const errBox = document.getElementById("cg-review-errors");
    if (errBox) {
      const items = [];
      this.STEPS.forEach((step, idx) => {
        (stepErr[step] || []).forEach((e) => {
          items.push(
            `<div class="cg-error cg-error-link" data-cg-action="goto" data-idx="${idx}" title="Aller à l'étape ${this._esc(this.STEP_LABELS[step])}">⚠ ${this._esc(e)} <span class="cg-error-goto">→ ${this._esc(this.STEP_LABELS[step])}</span></div>`,
          );
        });
      });
      // Dépassement de budget global (mode avancé) : sans étape dédiée.
      const level = c.gameLevels[clean.gameLevel];
      if (level && clean.advancedMode) {
        const spent = c.totalCost(clean);
        if (spent > level.nuyen) {
          items.push(
            `<div class="cg-error">⚠ Budget dépassé : ${spent.toLocaleString("fr-FR")} ¥ / ${level.nuyen.toLocaleString("fr-FR")} ¥.</div>`,
          );
        }
      }
      errBox.innerHTML = items.length ? items.join("") : '<div class="cg-ok">✓ Personnage valide.</div>';
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
    // Le 4e mot-clé (Train de vie) alimente aussi le champ lifestyle du PJ.
    if (path === "keywords.3") this._build.lifestyle = val;
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
      this._renderSteps();
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
      case "restart":
        this._build = this._newBuild(c);
        this._clearDraft();
        this._resumed = false;
        this._step = 0;
        this._renderAll();
        break;
      case "dismiss-resume":
        this._resumed = false;
        this._renderStep();
        break;
      case "apply-preset": {
        const preset = (c.presets || []).find((p) => p.id === el.dataset.id);
        if (!preset) break;
        // Repart d'un brouillon neuf (garde le niveau de jeu choisi) + patch.
        const level = b.gameLevel;
        const fresh = this._newBuild(c);
        fresh.gameLevel = level;
        this._build = { ...fresh, ...preset.patch };
        // Normalise l'attribut + les spés (specs[]) de chaque compétence.
        this._build.skills = this._normalizeSkillSpecs(
          (this._build.skills || []).map((s) => {
            const def = c.skills.find((d) => d.name === s.name);
            return { ...s, attr: s.attr || def?.attr };
          }),
        );
        this._resumed = false;
        this._saveDraft();
        this._step = this.STEPS.indexOf("attrs");
        this._renderAll();
        toast(`Preset « ${preset.label} » appliqué.`);
        break;
      }
      case "draw-narrative": {
        const field = el.dataset.field;
        const sug = c.drawNarrative(b);
        const arr = b[field];
        (sug[field] || []).forEach((val, i) => {
          if (i < arr.length && !(arr[i] && arr[i].trim())) {
            arr[i] = val;
            if (field === "keywords" && i === 3) b.lifestyle = val;
          }
        });
        afterMutate();
        break;
      }

      case "attr-inc":
      case "attr-dec": {
        const key = el.dataset.key;
        const range = c.metatypes[b.meta][key];
        const delta = action === "attr-inc" ? 1 : -1;
        b.attrs[key] = Utils.clamp((b.attrs[key] || 1) + delta, range[0], range[1]);
        this._saveDraft();
        this._renderAll();
        break;
      }

      case "add-skill": {
        const sel = document.getElementById("cg-skill-pick");
        const def = c.skills.find((d) => d.name === sel?.value);
        if (def) {
          b.skills.push({ name: def.name, val: 1, attr: def.attr, specs: [] });
          afterMutate();
        }
        break;
      }
      case "remove-skill":
        b.skills.splice(Number(el.dataset.idx), 1);
        afterMutate();
        break;

      case "add-knowledge": {
        const inp = document.getElementById("cg-knowledge-text");
        const val = inp?.value?.trim();
        if (val) {
          b.knowledges = b.knowledges || [];
          b.knowledges.push(val);
          afterMutate();
        }
        break;
      }
      case "remove-knowledge":
        b.knowledges.splice(Number(el.dataset.idx), 1);
        afterMutate();
        break;

      case "add-spec": {
        const i = Number(el.dataset.idx);
        const s = b.skills[i];
        const sel = document.getElementById(`cg-skill-spec-pick-${i}`);
        const sp = sel?.value;
        if (s && sp && (s.val || 0) >= 1) {
          s.specs = s.specs || [];
          if (!s.specs.includes(sp)) s.specs.push(sp);
          afterMutate();
        }
        break;
      }
      case "remove-spec": {
        const s = b.skills[Number(el.dataset.idx)];
        if (s && s.specs) {
          s.specs = s.specs.filter((sp) => sp !== el.dataset.spec);
          afterMutate();
        }
        break;
      }

      case "add-edge-rrspec": {
        const sel = document.getElementById("cg-edge-spec-pick");
        const [idxStr, spec] = (sel?.value || "").split("::");
        const s = b.skills[Number(idxStr)];
        const tpl = c.edgeTemplates.find((t) => t.id === "rr-spec");
        if (s && spec && tpl) {
          // rr structuré → permet la validation des plafonds par niveau.
          b.edges.push({ level: tpl.level, text: tpl.text(s.name, spec), rr: { skill: s.name, spec, amount: 1 } });
          afterMutate();
        }
        break;
      }
      case "add-edge-rrskill": {
        const sel = document.getElementById("cg-edge-skill-pick");
        const s = b.skills[Number(sel?.value)];
        const tpl = c.edgeTemplates.find((t) => t.id === "rr-skill");
        if (s && tpl) {
          b.edges.push({ level: tpl.level, text: tpl.text(s.name), rr: { skill: s.name, spec: null, amount: 1 } });
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
        const mentor = c.drawMentor(b.awakened);
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
    // Entrée dans un champ « ＋ Ajouter » déclenche l'ajout correspondant.
    const ENTER_ADD = {
      "cg-gear-text": "add-gear",
      "cg-knowledge-text": "add-knowledge",
      "cg-edge-custom-label": "add-edge-custom",
      "cg-edge-custom-level": "add-edge-custom",
    };
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" || e.target.tagName !== "INPUT") return;
      const ov = overlay();
      if (!ov?.contains(e.target)) return;
      const action = ENTER_ADD[e.target.id];
      if (!action) return;
      e.preventDefault();
      const btn = ov.querySelector(`[data-cg-action="${action}"]`);
      if (btn) this._handleAction(btn);
    });
  },
};
