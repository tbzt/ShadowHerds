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
    el.innerHTML = this._formHTML(ed, "sg");
  },

  _buildGroupForm(ed) {
    const el = document.getElementById("gen-form-group");
    el.innerHTML = `
      <div class="form-group">
        <label>Nombre</label>
        <select id="gg-count">
          <option value="2-4">2 – 4</option>
          <option value="3-6">3 – 6</option>
          <option value="4-10">4 – 10</option>
        </select>
      </div>
      ${this._formHTML(ed, "gg", { hideName: true })}
    `;
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
    const opts = this._readForm("sg");
    const pnj = this.edition.generate(opts);
    this.pool.push(pnj);

    const zone = document.getElementById("gen-zone-single");
    const card = CardRenderer.render(pnj, ["save", "discard"]);
    zone.prepend(card);
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
    this.pool = this.pool.filter((p) => p.id !== id);
    const card = document.querySelector(`.pnj-card[data-id="${id}"]`);
    if (card) {
      card.style.transition = "opacity 0.2s, transform 0.2s";
      card.style.opacity = "0";
      card.style.transform = "scale(0.94)";
      setTimeout(() => card.remove(), 200);
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
