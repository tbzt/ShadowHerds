"use strict";

/* ============================================================
   UTILS
   ============================================================ */
const Utils = {
  rand(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  randInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  },

  randBool(p = 0.5) {
    return Math.random() < p;
  },

  clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  },

  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  /* ============================================================
     TABLES DE NOMS
     Organisées par origine culturelle pour donner de la texture.
     Chaque runner a un prénom d'origine + un surnom de rue.
     ============================================================ */
  _noms: {
    // Prénoms par bassin culturel — reflet du melting-pot du sprawl
    japonais: [
      "Aiko",
      "Kenji",
      "Yuki",
      "Hana",
      "Ryo",
      "Miwa",
      "Taro",
      "Suki",
      "Kazuo",
      "Rei",
      "Shota",
      "Nao",
      "Fumiko",
      "Ren",
      "Kei",
    ],
    coreen: [
      "Tae",
      "Joon",
      "Soo",
      "Min",
      "Hyun",
      "Bora",
      "Dain",
      "Jae",
      "Seul",
      "Yuna",
      "Haerin",
      "Kang",
      "Sunhi",
      "Daegu",
    ],
    chinois: [
      "Gao",
      "Xia",
      "Wei",
      "Lin",
      "Fang",
      "Bao",
      "Mei",
      "Jing",
      "Long",
      "Zhu",
      "Shen",
      "Yanli",
      "Rui",
      "Cheng",
    ],
    russe: [
      "Dasha",
      "Irina",
      "Vera",
      "Oksana",
      "Nadia",
      "Petra",
      "Sven",
      "Ivan",
      "Dmitri",
      "Yuri",
      "Tova",
      "Katja",
      "Misha",
      "Zoya",
    ],
    africain: [
      "Fatou",
      "Jomo",
      "Femi",
      "Aya",
      "Kofi",
      "Amara",
      "Seun",
      "Nia",
      "Zola",
      "Kemi",
      "Dayo",
      "Adaeze",
      "Sade",
      "Kwame",
    ],
    latino: [
      "Carlos",
      "Lupe",
      "Rosa",
      "Marco",
      "Inez",
      "Diego",
      "Yara",
      "Camilo",
      "Pilar",
      "Reza",
      "Valentina",
      "Mateo",
      "Flor",
    ],
    polynesien: [
      "Hemi",
      "Tane",
      "Lani",
      "Moana",
      "Koa",
      "Ngata",
      "Rangi",
      "Aroha",
      "Teva",
      "Manu",
    ],
    euro: [
      "Britta",
      "Erik",
      "Ulric",
      "Piet",
      "Gus",
      "Wren",
      "Cass",
      "Brek",
      "Dev",
      "Erin",
      "Liese",
      "Thora",
      "Sigrid",
      "Dag",
      "Ivo",
    ],
    arabe: [
      "Omar",
      "Reza",
      "Nadia",
      "Zara",
      "Tariq",
      "Layla",
      "Bilal",
      "Soraya",
      "Karim",
      "Yasmin",
      "Farouk",
      "Hind",
    ],
    amerindien: [
      "Crow",
      "Sky",
      "Rio",
      "Flint",
      "Sage",
      "Ash",
      "Reed",
      "Dawn",
      "Fox",
      "Storm",
    ],
    asiacentral: [
      "Quin",
      "Zed",
      "Batu",
      "Temur",
      "Altai",
      "Naran",
      "Gol",
      "Saran",
    ],
    generique: [
      "Maya",
      "Nick",
      "Leo",
      "Jade",
      "Uma",
      "Vito",
      "Kira",
      "Sam",
      "Alex",
      "Morgan",
      "Reese",
      "Quinn",
      "Blair",
      "Sasha",
    ],
  },

  _noms_famille: {
    japonais: [
      "Tanaka",
      "Suzuki",
      "Watanabe",
      "Ito",
      "Yamamoto",
      "Nakamura",
      "Kobayashi",
      "Kato",
      "Yoshida",
      "Yamada",
      "Sasaki",
      "Inoue",
      "Kimura",
      "Hayashi",
      "Shimizu",
    ],
    coreen: [
      "Kim",
      "Lee",
      "Park",
      "Choi",
      "Jung",
      "Kang",
      "Cho",
      "Yoon",
      "Jang",
      "Lim",
      "Han",
      "Oh",
      "Seo",
      "Shin",
      "Kwon",
    ],
    chinois: [
      "Zhang",
      "Wang",
      "Li",
      "Liu",
      "Chen",
      "Yang",
      "Huang",
      "Zhao",
      "Wu",
      "Zhou",
      "Sun",
      "Ma",
      "Zhu",
      "Hu",
      "Guo",
    ],
    russe: [
      "Volkov",
      "Morozov",
      "Petrov",
      "Sokolov",
      "Popov",
      "Lebedev",
      "Kozlov",
      "Novikov",
      "Mikhailov",
      "Fedorov",
      "Orlov",
      "Makarov",
      "Nikitin",
      "Zaitsev",
      "Belov",
    ],
    africain: [
      "Diallo",
      "Mbeki",
      "Okonkwo",
      "Nkosi",
      "Traore",
      "Mensah",
      "Osei",
      "Diop",
      "Ndiaye",
      "Bah",
      "Keita",
      "Camara",
      "Coulibaly",
      "Touré",
      "Sy",
    ],
    latino: [
      "Garcia",
      "Rodriguez",
      "Martinez",
      "Hernandez",
      "Lopez",
      "Gonzalez",
      "Perez",
      "Torres",
      "Ramirez",
      "Flores",
      "Rivera",
      "Morales",
      "Ortiz",
      "Cruz",
      "Reyes",
    ],
    polynesien: [
      "Tama",
      "Fetu",
      "Aroha",
      "Rangi",
      "Tane",
      "Ngata",
      "Mako",
      "Heke",
      "Parata",
      "Wiki",
    ],
    euro: [
      "Mueller",
      "Schmidt",
      "Fischer",
      "Weber",
      "Larsson",
      "Andersen",
      "Johansson",
      "Nielsen",
      "Kowalski",
      "Novak",
      "Blanc",
      "Petit",
      "Dubois",
      "Martin",
      "Bernard",
    ],
    arabe: [
      "Al-Rashid",
      "Hassan",
      "Ibrahim",
      "Mansour",
      "Khalil",
      "Farouk",
      "Nasser",
      "Aziz",
      "Hamid",
      "Saleh",
      "Qasim",
      "Jaber",
      "Amin",
      "Samir",
      "Faris",
    ],
    amerindien: [
      "Runs-Fast",
      "Ironcloud",
      "Whitehorse",
      "Manytrees",
      "Strongbow",
      "Clearwater",
      "Redcloud",
      "Blackbear",
      "Longfeather",
      "Twobirds",
    ],
    asiacentral: [
      "Baatar",
      "Gantulga",
      "Munkh",
      "Erdene",
      "Sukhbaatar",
      "Oyun",
      "Dolgorsuren",
      "Batbold",
      "Tserenpuntsag",
      "Ganzorig",
    ],
    generique: [
      "Cross",
      "Vale",
      "Stone",
      "Blake",
      "Ward",
      "Chase",
      "Drake",
      "Holt",
      "Reed",
      "Cole",
      "Vance",
      "Quinn",
      "Marsh",
      "Crane",
      "Sloane",
    ],
  },

  _surnoms: {
    // Surnoms par registre — le runner choisit (ou hérite) du sien
    cyber: [
      "Chrome",
      "Circuit",
      "Câble",
      "Pixel",
      "Déclic",
      "Interface",
      "Patch",
      "Firmware",
      "Glitch",
      "Codec",
      "Kernel",
      "Flux",
      "Nœud",
      "Lag",
      "Buffer",
      "Signal",
      "Static",
      "Overclock",
      "Baud",
      "Hex",
      "Binary",
      "Ram",
      "Stack",
      "Vecteur",
      "Daemon",
    ],
    rue: [
      "Lame",
      "Poing",
      "Griffe",
      "Dard",
      "Cran",
      "Éclat",
      "Tranche",
      "Crochet",
      "Rouille",
      "Sabre",
      "Estoc",
      "Mandrin",
      "Clou",
      "Pique",
      "Leston",
      "Bistouri",
    ],
    nature: [
      "Loup",
      "Corbeau",
      "Lynx",
      "Vipère",
      "Tigre",
      "Renard",
      "Faucon",
      "Ours",
      "Serpent",
      "Requin",
      "Coyote",
      "Panthère",
      "Vautour",
      "Hyène",
      "Mamba",
    ],
    ombre: [
      "Fantôme",
      "Ombre",
      "Brume",
      "Spectre",
      "Néant",
      "Fumée",
      "Voile",
      "Nuage",
      "Mirage",
      "Écho",
      "Silence",
      "Murmure",
      "Nuit",
      "Crépuscule",
      "Cendre",
    ],
    element: [
      "Tonnerre",
      "Braise",
      "Feu",
      "Forge",
      "Acier",
      "Cobalt",
      "Mercure",
      "Soufre",
      "Éclair",
      "Givre",
      "Marteau",
      "Enclume",
      "Étain",
      "Arsenic",
      "Titane",
    ],
    abstrait: [
      "Zéro",
      "Néon",
      "Hex",
      "Toxique",
      "Calme",
      "Frisson",
      "Vif",
      "Pire",
      "Gris",
      "Chaos",
      "Déclin",
      "Fracas",
      "Vertige",
      "Transe",
      "Glace",
      "Acide",
      "Volt",
    ],
    surnom_complet: [
      "Cinq-Doigts",
      "Trois-Balles",
      "Sans-Nom",
      "Brise-Os",
      "Coupe-Court",
      "Tue-Lumière",
      "Passe-Muraille",
      "Casse-Tout",
      "Mange-Fer",
      "Vide-Coffre",
    ],
  },

  /** Liste des bassins pour le formulaire */
  bassins() {
    return Object.keys(this._noms);
  },

  /**
   * Génère un nom complet runner : Prénom "Surnom" Nom
   * Si bassin est fourni, l'utilise ; sinon tirage aléatoire.
   */
  genName(bassin = null) {
    const b =
      bassin && this._noms[bassin]
        ? bassin
        : this.rand(Object.keys(this._noms));
    const prenom = this.rand(this._noms[b]);
    const famille = this._noms_famille[b]
      ? this.rand(this._noms_famille[b])
      : this.rand(this._noms_famille.generique);

    const registre = this.rand(Object.keys(this._surnoms));
    const surnom = this.rand(this._surnoms[registre]);

    return `${prenom} "${surnom}" ${famille}`;
  },

  /** Prénom seul, pour les contacts qui n'ont pas forcément de surnom runner */
  genFirstName() {
    const bassins = Object.keys(this._noms);
    return this.rand(this._noms[this.rand(bassins)]);
  },

  /** Surnom seul */
  genHandle() {
    const registres = Object.keys(this._surnoms);
    return this.rand(this._surnoms[this.rand(registres)]);
  },

  /** Métatype aléatoire avec pondération démographique 2076 (Run Faster)
      Humains 39 %, Orks 22 %, Elfes 15 %, Nains 14 %, Trolls 5 %. */
  randMeta() {
    const poids = { Humain: 39, Ork: 22, Elfe: 15, Nain: 14, Troll: 5 };
    const entries = Object.entries(poids);
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total;
    for (const [meta, w] of entries) {
      r -= w;
      if (r <= 0) return meta;
    }
    return "Humain";
  },

  /** Genre aléatoire */
  randGender() {
    return this.rand(["M", "F", "F", "M", "NB"]);
  },
};

/* ============================================================
   TOAST
   ============================================================ */
function toast(msg, duration = 2400) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove("show"), duration);
}

/* ============================================================
   DICE ROLLER — moteur de règles + animation de lancer

   - computeRoll(n, mode) : applique les règles Shadowrun
     (5-6 = succès ; bévue si plus de la moitié des dés sont des 1 ;
      échec critique si bévue ET zéro succès ; mode explosif relance
      les succès tant qu'il y en a). Renvoie le détail complet.
   - roll() : conserve le comportement du bouton « Lancer » de la
     barre du haut (avec animation overlay).
   - rollPool(n, opts) : lance une réserve depuis une carte (attribut,
     compétence, réserve MJ…) avec animation plein écran : autant de
     dés que de points dans la réserve, qui roulent puis se figent.
   ============================================================ */
const Dice = {
  mode: "normal",
  _animating: false,

  init() {
    document
      .getElementById("dice-roll-btn")
      .addEventListener("click", () => this.roll());
    document.getElementById("dice-count").addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.roll();
    });

    // Clic sur n'importe quelle réserve marquée [data-roll] dans une carte
    document.addEventListener("click", (e) => {
      const t = e.target.closest("[data-roll]");
      if (!t) return;
      const n = parseInt(t.getAttribute("data-roll"), 10);
      if (!n || n < 1) return;
      const label = t.getAttribute("data-roll-label") || "";
      this.rollPool(n, { label });
    });

    this._ensureOverlay();
  },

  setMode(mode, btn) {
    this.mode = mode;
    document
      .querySelectorAll(".dice-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  },

  /* ---- Moteur de règles pur (testable, sans DOM) ---- */
  computeRoll(n, mode = "normal") {
    n = Utils.clamp(n, 1, 60);
    const faces = [];
    let hits = 0;
    let ones = 0;

    for (let i = 0; i < n; i++) {
      const r = Utils.randInt(1, 6);
      faces.push(r);
      if (r >= 5) hits++;
      if (r === 1) ones++;
    }

    // Dés explosifs : on relance les succès (6 d'origine → relance)
    const extra = [];
    if (mode === "explosive") {
      let toReroll = hits;
      let guard = 0;
      while (toReroll > 0 && guard < 8) {
        let newHits = 0;
        for (let i = 0; i < toReroll; i++) {
          const r = Utils.randInt(1, 6);
          extra.push(r);
          if (r >= 5) newHits++;
        }
        hits += newHits;
        toReroll = newHits;
        guard++;
      }
    }

    const glitch = ones > Math.floor(n / 2);
    const critGlitch = glitch && hits === 0;

    return { n, faces, extra, hits, ones, glitch, critGlitch, mode };
  },

  /** Texte de résultat standard. */
  _resultText(res) {
    let t = `${res.hits} succès`;
    if (res.critGlitch) t += " — ÉCHEC CRITIQUE";
    else if (res.glitch) t += " — Bévue";
    return t;
  },

  /* ---- Bouton « Lancer » de la barre du haut ---- */
  roll() {
    const input = document.getElementById("dice-count");
    const n = Utils.clamp(parseInt(input.value) || 6, 1, 40);
    input.value = n;

    const res = this.computeRoll(n, this.mode);

    // Résultat textuel dans la barre (comportement d'origine conservé)
    const el = document.getElementById("dice-result");
    el.textContent = this._resultText(res);
    el.style.color = res.critGlitch
      ? "#c0392b"
      : res.glitch
        ? "var(--accent2)"
        : "var(--accent)";

    // Animation plein écran
    this._animate(res, { label: "" });
  },

  /* ---- Lancer d'une réserve depuis une carte ---- */
  rollPool(n, opts = {}) {
    const res = this.computeRoll(n, this.mode);
    this._animate(res, { label: opts.label || "" });
  },

  /* ========================================================
     ANIMATION
     ======================================================== */
  _ensureOverlay() {
    if (document.getElementById("dice-overlay")) return;
    const ov = document.createElement("div");
    ov.id = "dice-overlay";
    ov.className = "dice-overlay";
    ov.setAttribute("hidden", "");
    ov.innerHTML = `
      <div class="dice-overlay-inner">
        <div class="dice-tray" id="dice-tray"></div>
        <div class="dice-summary" id="dice-summary"></div>
        <div class="dice-hint">Cliquez pour fermer</div>
      </div>`;
    document.body.appendChild(ov);
    ov.addEventListener("click", () => this._closeOverlay());
  },

  _closeOverlay() {
    const ov = document.getElementById("dice-overlay");
    if (!ov) return;
    ov.classList.remove("show");
    ov._closeTimer = setTimeout(() => ov.setAttribute("hidden", ""), 220);
  },

  /** Pip layout (positions des points) pour chaque face de dé. */
  _pips(v) {
    // grille 3x3, positions remplies par face
    const map = {
      1: [4],
      2: [0, 8],
      3: [0, 4, 8],
      4: [0, 2, 6, 8],
      5: [0, 2, 4, 6, 8],
      6: [0, 2, 3, 5, 6, 8],
    };
    const on = new Set(map[v] || []);
    let cells = "";
    for (let i = 0; i < 9; i++) {
      cells += `<span class="pip ${on.has(i) ? "on" : ""}"></span>`;
    }
    return cells;
  },

  _dieEl(value, delay) {
    const hit = value >= 5;
    const one = value === 1;
    const die = document.createElement("div");
    die.className =
      "die rolling" + (hit ? " hit" : "") + (one ? " one" : "");
    die.style.setProperty("--roll-delay", `${delay}ms`);
    // tumble aléatoire pour varier l'animation
    die.style.setProperty("--tumble", `${Utils.randInt(2, 4)}`);
    die.innerHTML = `<div class="die-face">${this._pips(value)}</div>`;
    return die;
  },

  _animate(res, opts = {}) {
    this._ensureOverlay();
    const ov = document.getElementById("dice-overlay");
    clearTimeout(ov._closeTimer);
    const tray = document.getElementById("dice-tray");
    const summary = document.getElementById("dice-summary");
    tray.innerHTML = "";
    summary.innerHTML = "";
    summary.className = "dice-summary";

    const all = [...res.faces, ...res.extra];
    // Bornage d'affichage : au-delà de 40 dés on agrège visuellement
    const shown = all.slice(0, 40);

    const stagger = shown.length > 24 ? 14 : 26;
    shown.forEach((v, i) => {
      tray.appendChild(this._dieEl(v, i * stagger));
    });

    ov.removeAttribute("hidden");
    // force reflow puis show (transition)
    void ov.offsetWidth;
    ov.classList.add("show");

    // Quand tous les dés se sont figés, révéler le résumé
    const settleAt = shown.length * stagger + 760;
    clearTimeout(ov._settleTimer);
    ov._settleTimer = setTimeout(() => {
      tray.querySelectorAll(".die").forEach((d) => d.classList.remove("rolling"));

      const cls = res.critGlitch
        ? "crit"
        : res.glitch
          ? "glitch"
          : res.hits > 0
            ? "good"
            : "zero";
      summary.classList.add("reveal", cls);

      const labelHtml = opts.label
        ? `<span class="dice-summary-label">${this._escSummary(opts.label)}</span>`
        : "";
      const poolHtml = `<span class="dice-summary-pool">${res.n} dé${res.n > 1 ? "s" : ""}${res.mode === "explosive" ? " · explosifs" : ""}</span>`;
      const big = `<span class="dice-summary-hits">${res.hits}</span><span class="dice-summary-hits-label">succès</span>`;
      let tag = "";
      if (res.critGlitch) tag = `<span class="dice-summary-tag crit">Échec critique</span>`;
      else if (res.glitch) tag = `<span class="dice-summary-tag glitch">Bévue</span>`;

      summary.innerHTML = `
        ${labelHtml}
        <div class="dice-summary-main">${big}</div>
        ${tag}
        ${poolHtml}`;
    }, settleAt);
  },

  _escSummary(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  },
};
