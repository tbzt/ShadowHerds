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
  /** correspondance label Rôle/Milieu -> clé Coherence (rempli au build) */
  _roleLabelToValue: {},
  _milieuLabelToValue: {},

  /** Retourne le module d'édition actif */
  get edition() {
    return App.editionModule;
  },

  /* ---- Construction du formulaire ---- */
  buildForms() {
    const ed = this.edition;
    if (!ed) return;

    MultiSelect.init();
    SingleSelect.init();
    this._buildSingleForm(ed);
    this._buildGroupForm(ed);
    MultiSelect.refresh(document.getElementById("panel-generator"));
    this.restorePool();
  },

  /* ---- Persistance du pool de génération (édition-scopée) ----
     Les PNJ générés mais pas encore sauvegardés survivent au F5 ; on ne
     mémorise pas de quel onglet (individuel/groupe) ils viennent, donc la
     restauration les remet tous dans l'onglet individuel. */
  _POOL_KEY: "gen_pool",

  _savePool() {
    Storage.set(this._POOL_KEY, this.pool);
  },

  restorePool() {
    const saved = Storage.get(this._POOL_KEY, []);
    if (!saved.length) return;
    this.pool = saved;
    const zone = document.getElementById("gen-zone-single");
    for (const pnj of saved) {
      const actions = pnj.type === "vehicle" || (pnj.type === "spirit" && pnj.ownerId)
        ? ["remove"]
        : ["save", "discard"];
      zone.appendChild(CardRenderer.render(pnj, actions));
    }
  },

  _buildSingleForm(ed) {
    const el = document.getElementById("gen-form-single");
    this.entityType = "meta";
    el.innerHTML = this._wrapFilters(
      this._entityTypeBar() +
        `<div id="sg-fields-meta" class="entity-fields">${this._formHTML(ed, "sg")}</div>` +
        `<div id="sg-fields-spirit" class="entity-fields" hidden>${this._spiritFormHTML(ed)}</div>` +
        `<div id="sg-fields-creature" class="entity-fields" hidden>${this._creatureFormHTML(ed)}</div>`,
    );
    if (!el.dataset.habitatBound) {
      el.dataset.habitatBound = "1";
      el.addEventListener("change", (e) => {
        if (e.target.id === "sg-creature-habitat") this._filterCreaturesByHabitat();
      });
    }
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
    return `<button type="button" class="filters-toggle" data-action="toggle-filters"
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
      ["meta", "▣", "Métahumain"],
      ["spirit", "✦", "Esprit libre"],
      ["creature", "❖", "Créature"],
    ];
    return `<div class="entity-type-bar" role="tablist" aria-label="Type d'entité">
      ${types
        .map(
          ([key, icon, label]) =>
            `<button type="button" class="entity-type-btn${key === this.entityType ? " active" : ""}"
              role="tab" aria-selected="${key === this.entityType}"
              data-action="set-entity-type" data-entity-type="${key}">
              <span class="entity-type-icon" aria-hidden="true">${icon}</span>
              <span class="entity-type-label">${label}</span>
            </button>`,
        )
        .join("")}
    </div>`;
  },

  setEntityType(type) {
    this.entityType = type;
    document.querySelectorAll(".entity-type-btn").forEach((b) => {
      const active = b.dataset.entityType === type;
      b.classList.toggle("active", active);
      b.setAttribute("aria-selected", String(active));
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
    const typeOptions = Object.entries(types).map(([key, t]) => ({
      value: key,
      label: t.label,
    }));

    let powerField;
    if (ed.id === "anarchy") {
      powerField = SingleSelect.create({
        id: "sg-spirit-power",
        label: "Niveau",
        options: Spirits.ANARCHY_TIERS.map((l, i) => ({ value: String(i), label: l })),
        value: "1",
      });
    } else {
      powerField = SingleSelect.create({
        id: "sg-spirit-power",
        label: "Puissance",
        options: [2, 3, 4, 5, 6, 7, 8, 9, 10].map((f) => ({ value: String(f), label: String(f) })),
        value: "6",
      });
    }
    return SingleSelect.create({
      id: "sg-spirit-type",
      label: "Type d'esprit",
      options: typeOptions,
      value: "",
      placeholder: "Aléatoire",
    }) + powerField;
  },

  /** Formulaire créature : filtre par lieu + sélection dans le catalogue. */
  _creatureFormHTML(ed) {
    if (typeof Creatures === "undefined") return "";
    const catalog = Creatures.catalogFor(ed.id);
    const options = Object.entries(catalog).map(([key, c]) => ({
      value: key,
      label: c.label,
      data: { habitat: (c.habitat || []).join(" ") },
    }));
    const habitatOptions = Object.entries(Creatures.HABITATS).map(([key, label]) => ({
      value: key,
      label,
    }));
    return SingleSelect.create({
      id: "sg-creature-habitat",
      label: "Lieu de rencontre",
      options: habitatOptions,
      value: "",
      placeholder: "Tous les lieux",
    }) + SingleSelect.create({
      id: "sg-creature-key",
      label: "Créature",
      options,
      value: "",
      placeholder: "Aléatoire",
    });
  },

  /** Filtre les options du sélecteur de créature selon le lieu choisi
      (masque celles dont data-habitat ne contient pas la clé choisie). */
  _filterCreaturesByHabitat() {
    const habitat = document.getElementById("sg-creature-habitat")?.value;
    SingleSelect.filterOptions("sg-creature-key", (opt) => {
      if (!habitat) return true;
      const tags = (opt.dataset.habitat || "").split(" ").filter(Boolean);
      return tags.includes(habitat);
    });
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

    // Composition libre (facultative) — contraint le tirage « Aléatoire »
    // de Profession à un rôle/milieu cohérent (js/rules/coherence.js),
    // sans remplacer les professions nommées ci-dessus.
    html += this._roleMilieuHTML(prefix);

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

    Infected.use(ed.id);
    groups.push(...Infected.groupedOptions());

    return MultiSelect.create({
      id,
      label: "Métatype",
      mode: "grouped",
      groups,
    });
  },

  /**
   * Sélecteurs Rôle / Milieu (composition libre) — bornent le tirage
   * « Aléatoire » de Profession à un tuple cohérent (js/rules/coherence.js)
   * au lieu de piocher parmi tous les archétypes nommés sans distinction.
   */
  _roleMilieuHTML(prefix) {
    const roleLabels = Object.entries(Coherence.ROLES).map(([k, r]) => {
      this._roleLabelToValue[r.label] = k;
      return r.label;
    });
    const milieuLabels = Object.entries(Coherence.MILIEUX).map(([k, m]) => {
      this._milieuLabelToValue[m.label] = k;
      return m.label;
    });
    return (
      MultiSelect.create({
        id: `${prefix}-role`,
        label: "Rôle (composition libre)",
        mode: "flat",
        options: roleLabels,
      }) +
      MultiSelect.create({
        id: `${prefix}-milieu`,
        label: "Milieu (composition libre)",
        mode: "flat",
        options: milieuLabels,
      })
    );
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

    // Composition libre : si aucune profession nommée n'est cochée mais
    // qu'un rôle/milieu l'est, on tire un archétype nommé dont le tuple
    // résolu (Coherence.resolveTuple) correspond — la génération reste
    // celle, déjà cohérente, des professions nommées.
    const roleLabel = this._pick(`${prefix}-role`);
    const milieuLabel = this._pick(`${prefix}-milieu`);
    const role = roleLabel === "Aléatoire" ? null : this._roleLabelToValue[roleLabel];
    const milieu = milieuLabel === "Aléatoire" ? null : this._milieuLabelToValue[milieuLabel];

    let archetype = this._pick(`${prefix}-profession`);
    if (archetype === "Aléatoire" && (role || milieu)) {
      archetype = this._pickCoherentArchetype(role, milieu);
    }

    return {
      name: nameEl ? nameEl.value : "",
      originPool,
      meta: this._pick(`${prefix}-meta`),
      gender: this._pick(`${prefix}-gender`),
      proRating: this._pick(`${prefix}-prof`),
      tier: this._pick(`${prefix}-rang`),
      archetype,
      special: this._pick(`${prefix}-special`, "Aucun"),
    };
  },

  /** Tire, parmi les professions nommées de l'édition active, une dont le
      tuple résolu correspond au rôle et/ou milieu choisis en composition
      libre. Retombe sur "Aléatoire" (tirage habituel) si rien ne correspond. */
  _pickCoherentArchetype(role, milieu) {
    const ed = this.edition;
    const all = this._strip(ed.formOptions.archetype);
    const matches = all.filter((name) => {
      const t = Coherence.resolveTuple(ed.id, name);
      return (!role || t.role === role) && (!milieu || t.milieu === milieu);
    });
    return matches.length ? Utils.rand(matches) : "Aléatoire";
  },

  /** Raccourci clavier « g » : génère sur l'onglet actif (individuel ou
      groupe). No-op si le panel Générateur n'est pas affiché. */
  generateActive() {
    if (!document.getElementById("panel-generator")?.classList.contains("active"))
      return;
    const groupActive = document
      .getElementById("gen-tab-group")
      ?.classList.contains("active");
    if (groupActive) this.generateGroup();
    else this.generateSingle();
  },

  /* ---- Génération individuelle ---- */
  generateSingle() {
    if (this.entityType === "spirit") return this._generateFreeSpirit();
    if (this.entityType === "creature") return this._generateCreature();
    const opts = this._readForm("sg");
    Debug.log("generator", "generateSingle — options", opts);
    const pnj = this.edition.generate(opts);
    Debug.log("generator", "→ PNJ généré", pnj);
    this.pool.push(pnj);
    this._savePool();

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
    Debug.log("generator", "esprit libre — options", { edId, typeKey, power });
    const spirit = Spirits.spawn(null, typeKey, {
      edition: edId,
      force: edId === "anarchy" ? undefined : power || 6,
      tier: edId === "anarchy" ? (Number.isFinite(power) ? power : 1) : undefined,
    });
    if (!spirit) {
      Debug.warn("generator", "esprit non généré", { typeKey, power });
      return;
    }
    Debug.log("generator", "→ esprit généré", spirit);
    this.pool.push(spirit);
    this._savePool();
    const zone = document.getElementById("gen-zone-single");
    const card = CardRenderer.render(spirit, ["save", "discard"]);
    card.classList.add("spirit-card");
    zone.prepend(card);
  },

  _generateCreature() {
    const edId = this.edition.id;
    const catalog = Creatures.catalogFor(edId);
    const selKey = document.getElementById("sg-creature-key")?.value;
    const habitat = document.getElementById("sg-creature-habitat")?.value;
    const pool = habitat
      ? Object.entries(catalog)
          .filter(([, c]) => (c.habitat || []).includes(habitat))
          .map(([k]) => k)
      : Object.keys(catalog);
    const key = selKey || Utils.rand(pool.length ? pool : Object.keys(catalog));
    Debug.log("generator", "créature — clé", { edId, key });
    const pnj = Creatures.spawn(edId, key);
    if (!pnj) {
      Debug.warn("generator", "créature non générée", { key });
      return;
    }
    Debug.log("generator", "→ créature générée", pnj);
    this.pool.push(pnj);
    this._savePool();
    const zone = document.getElementById("gen-zone-single");
    zone.prepend(CardRenderer.render(pnj, ["save", "discard"]));
  },

  /* ---- Génération de groupe ---- */
  generateGroup() {
    const countStr = document.getElementById("gg-count")?.value || "2-4";
    const [cmin, cmax] = countStr.split("-").map(Number);
    const count = Utils.randInt(cmin, cmax);
    Debug.log("generator", "generateGroup", { countStr, count });

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
    Debug.log("generator", `→ ${newPNJs.length} PNJ générés`, newPNJs);
    this._savePool();

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
    // Instantané pour l'annulation : entrées du pool avec leur index d'origine.
    const snapshot = [];
    this.pool.forEach((p, i) => {
      if (doomed.has(p.id)) snapshot.push({ entity: p, index: i });
    });
    const primary = snapshot.find((s) => s.entity.id === id);
    this.pool = this.pool.filter((p) => !doomed.has(p.id));
    this._savePool();

    // On conserve les nœuds de carte : l'annulation les ré-attache tels quels
    // (rendu des entités liées préservé, aucun re-render nécessaire).
    const cards = [];
    for (const did of doomed) {
      // Scopé au générateur : un PNJ sauvegardé a aussi une carte dans
      // les Ombres, qu'on ne doit pas toucher ici.
      const card = document.querySelector(
        `#panel-generator .pnj-card[data-id="${did}"]`,
      );
      if (!card) continue;
      cards.push({ card, parent: card.parentElement, next: card.nextElementSibling });
      card.style.transition = "opacity 0.2s, transform 0.2s";
      card.style.opacity = "0";
      card.style.transform = "scale(0.94)";
      card._removeTimer = setTimeout(() => card.remove(), 200);
    }

    const restore = () => {
      snapshot
        .slice()
        .sort((a, b) => a.index - b.index)
        .forEach(({ entity, index }) => {
          this.pool.splice(Math.min(index, this.pool.length), 0, entity);
        });
      this._savePool();
      // Ré-attache en ordre DOM inverse : chaque carte retrouve son ancre
      // « suivant » déjà rebranchée.
      for (const { card, parent, next } of cards.slice().reverse()) {
        clearTimeout(card._removeTimer);
        if (!card.isConnected && parent) {
          parent.insertBefore(card, next && next.isConnected ? next : null);
        }
        card.style.opacity = "1";
        card.style.transform = "none";
      }
    };

    const name = primary && primary.entity.name;
    toastUndo(name ? `${name} écarté.` : "PNJ écarté.", restore);
  },

  clearSingle() {
    const zone = document.getElementById("gen-zone-single");
    const ids = [...zone.querySelectorAll(".pnj-card")].map(
      (c) => c.dataset.id,
    );
    this.pool = this.pool.filter((p) => !ids.includes(p.id));
    this._savePool();
    zone.innerHTML = "";
  },

  clearGroup() {
    const zone = document.getElementById("gen-zone-group");
    const ids = [...zone.querySelectorAll(".pnj-card")].map(
      (c) => c.dataset.id,
    );
    this.pool = this.pool.filter((p) => !ids.includes(p.id));
    this._savePool();
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

  /** Délégation globale du panel (boutons statiques + cartes générées,
      dont le contenu est reconstruit à chaque render sans jamais
      remplacer le conteneur #panel-generator lui-même). */
  init() {
    const panel = document.getElementById("panel-generator");
    if (!panel) return;
    panel.addEventListener("click", (e) => {
      const el = e.target.closest("[data-action]");
      if (!el) return;
      switch (el.dataset.action) {
        case "show-tab":
          this.showTab(el.dataset.tab, el);
          break;
        case "toggle-filters":
          this.toggleFilters();
          break;
        case "set-entity-type":
          this.setEntityType(el.dataset.entityType);
          break;
        case "generate-single":
          this.generateSingle();
          break;
        case "clear-single":
          this.clearSingle();
          break;
        case "generate-group":
          this.generateGroup();
          break;
        case "clear-group":
          this.clearGroup();
          break;
        case "discard":
          this.discard(el.dataset.id);
          break;
      }
    });
  },
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => Gen.init());
} else {
  Gen.init();
}
