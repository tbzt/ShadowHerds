"use strict";

/* ============================================================
   GENERATOR — formulaire + génération PNJ individuel / groupe
   ============================================================ */
const Gen = {
  /** PNJ générés non encore sauvegardés (zone de génération) */
  pool: [],

  /** Retourne le module d'édition actif */
  get edition() {
    return App.editionModule;
  },

  /* ---- Construction du formulaire ---- */
  buildForms() {
    const ed = this.edition;
    if (!ed) return;

    this._buildSingleForm(ed);
    this._buildGroupForm(ed);
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
   * @param {object} ed - module d'édition
   * @param {string} prefix - préfixe des IDs ('sg' ou 'gg')
   * @param {object} opts
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

    // Bassin culturel — noms de famille + prénom cohérents
    const bassinsOpts = ["Aléatoire", ...Utils.bassins()];
    const bassinsLabels = {
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
    html += `<div class="form-group">
      <label>Origine</label>
      <select id="${prefix}-bassin">
        ${bassinsOpts.map((b) => `<option value="${b}">${bassinsLabels[b] || b}</option>`).join("")}
      </select>
    </div>`;

    html += this._select(prefix, "meta", "Métatype", fo.meta);
    html += this._select(prefix, "gender", "Genre", fo.gender);

    if (fo.rang) {
      html += this._select(prefix, "rang", "Rang", fo.rang);
    } else if (fo.prof) {
      html += this._select(prefix, "prof", "Professionnalisme", fo.prof);
    }

    html += this._select(prefix, "profession", "Profession", fo.profession);

    if (fo.special) {
      html += this._select(prefix, "special", "Spécialisation", fo.special);
    }

    return html;
  },

  _select(prefix, field, label, options) {
    const id = `${prefix}-${field}`;
    const opts = options
      .map((o) => `<option value="${o}">${o}</option>`)
      .join("");
    return `<div class="form-group">
      <label>${label}</label>
      <select id="${id}">${opts}</select>
    </div>`;
  },

  /* ---- Lecture du formulaire ---- */
  _readForm(prefix) {
    const get = (id) => document.getElementById(id)?.value ?? "";
    return {
      name: get(`${prefix}-name`),
      bassin: get(`${prefix}-bassin`) || "Aléatoire",
      meta: get(`${prefix}-meta`) || "Aléatoire",
      gender: get(`${prefix}-gender`) || "Aléatoire",
      prof: get(`${prefix}-prof`) || "Aléatoire",
      rang: get(`${prefix}-rang`) || "Aléatoire",
      profession: get(`${prefix}-profession`) || "Aléatoire",
      special: get(`${prefix}-special`) || "Aucun",
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
    const opts = this._readForm("gg");
    const countStr = document.getElementById("gg-count")?.value || "2-4";
    const [cmin, cmax] = countStr.split("-").map(Number);
    const count = Utils.randInt(cmin, cmax);

    const zone = document.getElementById("gen-zone-group");
    zone.innerHTML = "";

    const newPNJs = [];
    for (let i = 0; i < count; i++) {
      const pnj = this.edition.generate({ ...opts, name: "" });
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

  /** Retrouve un PNJ dans le pool par son id */
  findInPool(id) {
    return this.pool.find((p) => p.id === id) || null;
  },

  /* ---- Onglets du générateur ---- */
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
