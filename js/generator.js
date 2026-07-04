"use strict";

/* ============================================================
   GENERATOR — formulaire + génération PNJ individuel / groupe

   Filtres en multi-sélection (« ajouter / enlever des données ») :
   chaque champ accepte plusieurs valeurs. Lors de la génération,
   on tire au hasard parmi les valeurs cochées (sélection vide =
   « Aléatoire / tout »). Pour un groupe, chaque PNJ re-tire dans
   les ensembles cochés, ce qui donne une bande variée mais cadrée.

   La Profession utilise un multi-select à double niveau (catégorie
   → professions) via ProfCategories.
   ============================================================ */
const Gen = {
  /** PNJ générés non encore sauvegardés (zone de génération) */
  pool: [],

  /** Type d'entité du formulaire individuel :
      "meta" (métahumain) | "spirit" (esprit libre) | "creature" */
  entityType: "meta",

  /** correspondance label Origine -> valeur interne (rempli au build) */
  _originPoolLabelToValue: {},

  /** Retourne le module d'édition actif */
  get edition() {
    return App.editionModule;
  },

  /* ---- Construction du formulaire ---- */
  buildForms() {
    const ed = this.edition;
    if (!ed) return;

    MultiSelect.init();
    this._buildSingleForm(ed);
    this._buildGroupForm(ed);
    MultiSelect.refresh(document.getElementById("panel-generator"));
  },

  _buildSingleForm(ed) {
    const el = document.getElementById("gen-form-single");
    this.entityType = "meta";
    el.innerHTML = this._wrapFilters(
      this._entityTypeBar() +
        `<div id="sg-fields-meta">${this._formHTML(ed, "sg")}</div>` +
        `<div id="sg-fields-spirit" hidden>${this._spiritFormHTML(ed)}</div>` +
        `<div id="sg-fields-creature" hidden>${this._creatureFormHTML(ed)}</div>`,
    );
  },

  /* ---- Repli/dépli des filtres (état global, mémorisé) ---- */
  _FILTERS_KEY: "gen_filters_collapsed",

  filtersCollapsed() {
    return Storage.getGlobal(this._FILTERS_KEY, false);
  },

  /** Enrobe les champs d'un formulaire dans une zone repliable, avec sa
      barre de bascule. `display:contents` sur .gen-filters préserve la
      grille de .gen-form. */
  _wrapFilters(fieldsHTML) {
    const collapsed = this.filtersCollapsed();
    return `<button type="button" class="filters-toggle" onclick="Gen.toggleFilters()"
        title="Replier / déplier les filtres" aria-expanded="${!collapsed}">
        <span>Filtres</span>
        <span class="chev">${collapsed ? "▸" : "▾"}</span>
      </button>
      <div class="gen-filters${collapsed ? " collapsed" : ""}">${fieldsHTML}</div>`;
  },

  toggleFilters() {
    const collapsed = !this.filtersCollapsed();
    Storage.setGlobal(this._FILTERS_KEY, collapsed);
    // Bascule directe dans le DOM (sans rebuild : conserve les sélections)
    document
      .querySelectorAll("#panel-generator .gen-filters")
      .forEach((el) => el.classList.toggle("collapsed", collapsed));
    document
      .querySelectorAll("#panel-generator .filters-toggle")
      .forEach((btn) => {
        btn.setAttribute("aria-expanded", String(!collapsed));
        const chev = btn.querySelector(".chev");
        if (chev) chev.textContent = collapsed ? "▸" : "▾";
      });
  },

  /* ---- Sélecteur de type d'entité (PNJ individuel) ---- */
  _entityTypeBar() {
    const types = [
      ["meta", "Métahumain"],
      ["spirit", "Esprit libre"],
      ["creature", "Créature"],
    ];
    return `<div class="entity-type-bar" role="tablist" aria-label="Type d'entité">
      ${types
        .map(
          ([key, label]) =>
            `<button type="button" class="entity-type-btn${key === this.entityType ? " active" : ""}"
              data-entity-type="${key}" onclick="Gen.setEntityType('${key}')">${label}</button>`,
        )
        .join("")}
    </div>`;
  },

  setEntityType(type) {
    this.entityType = type;
    document.querySelectorAll(".entity-type-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.entityType === type);
    });
    const zones = { meta: "sg-fields-meta", spirit: "sg-fields-spirit", creature: "sg-fields-creature" };
    for (const [key, id] of Object.entries(zones)) {
      const el = document.getElementById(id);
      if (el) el.hidden = key !== type;
    }
  },

  /** Formulaire esprit libre : type + Puissance (SR5/SR6) ou palier (Anarchy). */
  _spiritFormHTML(ed) {
    if (typeof Spirits === "undefined") return "";
    const types = Spirits.typesFor(ed.id);
    const typeOpts = Object.entries(types)
      .map(([key, t]) => `<option value="${key}">${t.label}</option>`)
      .join("");
    let powerField;
    if (ed.id === "anarchy") {
      powerField = `<div class="form-group">
        <label>Niveau</label>
        <select id="sg-spirit-power">
          ${Spirits.ANARCHY_TIERS.map((l, i) => `<option value="${i}"${i === 1 ? " selected" : ""}>${l}</option>`).join("")}
        </select>
      </div>`;
    } else {
      powerField = `<div class="form-group">
        <label>Puissance</label>
        <select id="sg-spirit-power">
          ${[2, 3, 4, 5, 6, 7, 8, 9, 10].map((f) => `<option value="${f}"${f === 6 ? " selected" : ""}>${f}</option>`).join("")}
        </select>
      </div>`;
    }
    return `<div class="form-group">
      <label>Type d'esprit</label>
      <select id="sg-spirit-type">
        <option value="">Aléatoire</option>
        ${typeOpts}
      </select>
    </div>
    ${powerField}`;
  },

  /** Formulaire créature : sélection dans le catalogue de l'édition. */
  _creatureFormHTML(ed) {
    if (typeof Creatures === "undefined") return "";
    const catalog = Creatures.catalogFor(ed.id);
    const opts = Object.entries(catalog)
      .map(([key, c]) => `<option value="${key}">${c.label}</option>`)
      .join("");
    return `<div class="form-group">
      <label>Créature</label>
      <select id="sg-creature-key">
        <option value="">Aléatoire</option>
        ${opts}
      </select>
    </div>`;
  },

  _buildGroupForm(ed) {
    const el = document.getElementById("gen-form-group");
    el.innerHTML = this._wrapFilters(`
      <div class="form-group">
        <label>Nombre</label>
        <select id="gg-count">
          <option value="2-4">2 – 4</option>
          <option value="3-6">3 – 6</option>
          <option value="4-10">4 – 10</option>
        </select>
      </div>
      ${this._formHTML(ed, "gg", { hideName: true })}
    `);
  },

  /**
   * Génère le HTML du formulaire selon les options de l'édition.
   */
  _formHTML(ed, prefix, opts = {}) {
    const fo = ed.formOptions;
    let html = "";

    if (!opts.hideName) {
      html += `<div class="form-group">
        <label>Nom</label>
        <input type="text" id="${prefix}-name" placeholder="Aléatoire">
      </div>`;
    }

    // Bassin culturel
    const originPoolLabels = {
      japonais: "Japonais",
      coreen: "Coréen",
      chinois: "Chinois",
      russe: "Russe",
      africain: "Africain",
      latino: "Latino",
      polynesien: "Polynésien",
      euro: "Européen",
      arabe: "Arabe",
      amerindien: "Amérindien",
      asiacentral: "Asie centrale",
      generique: "Générique",
    };
    const originPoolValues = Utils.originPools();
    html += MultiSelect.create({
      id: `${prefix}-bassin`,
      label: "Origine",
      mode: "flat",
      options: originPoolValues.map((b) => originPoolLabels[b] || b),
    });
    originPoolValues.forEach((b) => {
      this._originPoolLabelToValue[originPoolLabels[b] || b] = b;
    });

    html += this._metaSelect(prefix, ed);

    html += MultiSelect.create({
      id: `${prefix}-gender`,
      label: "Genre",
      mode: "flat",
      options: this._strip(fo.gender),
    });

    if (fo.tier) {
      html += MultiSelect.create({
        id: `${prefix}-rang`,
        label: "Rang",
        mode: "flat",
        options: this._strip(fo.tier),
      });
    } else if (fo.proRating) {
      html += MultiSelect.create({
        id: `${prefix}-prof`,
        label: "Professionnalisme",
        mode: "flat",
        options: this._strip(fo.proRating),
      });
    }

    // Profession — double niveau
    const archetypeItems = this._strip(fo.archetype);
    const groups = ProfCategories.forEdition(ed.id, archetypeItems);
    html += MultiSelect.create({
      id: `${prefix}-profession`,
      label: "Profession",
      mode: "grouped",
      groups,
    });

    if (fo.special) {
      html += MultiSelect.create({
        id: `${prefix}-special`,
        label: "Spécialisation",
        mode: "flat",
        options: this._strip(fo.special, ["Aucun"]),
        emptyLabel: "Aucune / aléatoire",
      });
    }

    return html;
  },

  /** Retire les marqueurs « Aléatoire » / « Aucun » d'une liste. */
  _strip(list, extra = []) {
    const drop = new Set(["Aléatoire", ...extra]);
    return (list || []).filter((o) => !drop.has(o));
  },

  /**
   * Sélecteur de métatype en multi-select (groupé si métavariantes).
   */
  _metaSelect(prefix, ed) {
    const id = `${prefix}-meta`;
    const fo = ed.formOptions;

    if (!ed.useMetavariants || typeof Metavariants === "undefined") {
      return MultiSelect.create({
        id,
        label: "Métatype",
        mode: "flat",
        options: this._strip(fo.meta),
      });
    }

    Metavariants.use(ed.id);
    const groups = [];

    for (const grp of Metavariants.groupedOptions()) {
      groups.push({
        cat: grp.baseMetatype,
        items: [grp.baseMetatype, ...grp.metavariants],
      });
    }

    const mc = Metavariants.allMetaconsciences();
    if (mc.length) groups.push({ cat: "Métaconsciences", items: mc });

    const zoo = Metavariants.allZoocanthropes();
    if (zoo.length) groups.push({ cat: "Zoocanthropes", items: zoo });

    if (typeof Infected !== "undefined") {
      Infected.use(ed.id);
      groups.push(...Infected.groupedOptions());
    }

    return MultiSelect.create({
      id,
      label: "Métatype",
      mode: "grouped",
      groups,
    });
  },

  /* ---- Lecture du formulaire ---- */
  _pick(id, fallback = "Aléatoire") {
    const sel = MultiSelect.selected(id);
    if (!sel.length) return fallback;
    return Utils.rand(sel);
  },

  _readForm(prefix) {
    const nameEl = document.getElementById(`${prefix}-name`);

    const originPoolLabel = this._pick(`${prefix}-bassin`);
    const originPool =
      originPoolLabel === "Aléatoire"
        ? "Aléatoire"
        : this._originPoolLabelToValue[originPoolLabel] || originPoolLabel;

    return {
      name: nameEl ? nameEl.value : "",
      originPool,
      meta: this._pick(`${prefix}-meta`),
      gender: this._pick(`${prefix}-gender`),
      proRating: this._pick(`${prefix}-prof`),
      tier: this._pick(`${prefix}-rang`),
      archetype: this._pick(`${prefix}-profession`),
      special: this._pick(`${prefix}-special`, "Aucun"),
    };
  },

  /* ---- Génération individuelle ---- */
  generateSingle() {
    if (this.entityType === "spirit") return this._generateFreeSpirit();
    if (this.entityType === "creature") return this._generateCreature();
    const opts = this._readForm("sg");
    const pnj = this.edition.generate(opts);
    this.pool.push(pnj);

    const zone = document.getElementById("gen-zone-single");
    const card = CardRenderer.render(pnj, ["save", "discard"]);
    zone.prepend(card);
  },

  _generateFreeSpirit() {
    const edId = this.edition.id;
    const types = Spirits.typesFor(edId);
    const selType = document.getElementById("sg-spirit-type")?.value;
    const typeKey = selType || Utils.rand(Object.keys(types));
    const power = parseInt(document.getElementById("sg-spirit-power")?.value, 10);
    const spirit = Spirits.spawn(null, typeKey, {
      edition: edId,
      force: edId === "anarchy" ? undefined : power || 6,
      tier: edId === "anarchy" ? (Number.isFinite(power) ? power : 1) : undefined,
    });
    if (!spirit) return;
    this.pool.push(spirit);
    const zone = document.getElementById("gen-zone-single");
    const card = CardRenderer.render(spirit, ["save", "discard"]);
    card.classList.add("spirit-card");
    zone.prepend(card);
  },

  _generateCreature() {
    const edId = this.edition.id;
    const catalog = Creatures.catalogFor(edId);
    const selKey = document.getElementById("sg-creature-key")?.value;
    const key = selKey || Utils.rand(Object.keys(catalog));
    const pnj = Creatures.spawn(edId, key);
    if (!pnj) return;
    this.pool.push(pnj);
    const zone = document.getElementById("gen-zone-single");
    zone.prepend(CardRenderer.render(pnj, ["save", "discard"]));
  },

  /* ---- Génération de groupe ---- */
  generateGroup() {
    const countStr = document.getElementById("gg-count")?.value || "2-4";
    const [cmin, cmax] = countStr.split("-").map(Number);
    const count = Utils.randInt(cmin, cmax);

    const zone = document.getElementById("gen-zone-group");
    zone.innerHTML = "";

    const newPNJs = [];
    for (let i = 0; i < count; i++) {
      const opts = this._readForm("gg"); // re-tirage par PNJ
      opts.name = "";
      const pnj = this.edition.generate(opts);
      this.pool.push(pnj);
      newPNJs.push(pnj);
    }

    for (const pnj of newPNJs) {
      zone.appendChild(CardRenderer.render(pnj, ["save", "discard"]));
    }
  },

  /* ---- Actions ---- */
  discard(id) {
    // Cascade : les entités liées (drones/véhicules) partent avec leur maître.
    const doomed = new Set([id]);
    for (const p of this.pool) {
      if (p.ownerId === id) doomed.add(p.id);
    }
    this.pool = this.pool.filter((p) => !doomed.has(p.id));
    for (const did of doomed) {
      // Scopé au générateur : un PNJ sauvegardé a aussi une carte dans
      // les Ombres, qu'on ne doit pas toucher ici.
      const card = document.querySelector(
        `#panel-generator .pnj-card[data-id="${did}"]`,
      );
      if (card) {
        card.style.transition = "opacity 0.2s, transform 0.2s";
        card.style.opacity = "0";
        card.style.transform = "scale(0.94)";
        setTimeout(() => card.remove(), 200);
      }
    }
  },

  clearSingle() {
    const zone = document.getElementById("gen-zone-single");
    const ids = [...zone.querySelectorAll(".pnj-card")].map(
      (c) => c.dataset.id,
    );
    this.pool = this.pool.filter((p) => !ids.includes(p.id));
    zone.innerHTML = "";
  },

  clearGroup() {
    const zone = document.getElementById("gen-zone-group");
    const ids = [...zone.querySelectorAll(".pnj-card")].map(
      (c) => c.dataset.id,
    );
    this.pool = this.pool.filter((p) => !ids.includes(p.id));
    zone.innerHTML = "";
  },

  findInPool(id) {
    return this.pool.find((p) => p.id === id) || null;
  },

  showTab(tab, btn) {
    document
      .querySelectorAll("#panel-generator .tab-btn")
      .forEach((b) => b.classList.remove("active"));
    document
      .querySelectorAll("#panel-generator .tab-panel")
      .forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`gen-tab-${tab}`).classList.add("active");
  },
};
