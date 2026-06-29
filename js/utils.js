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
   DICE ROLLER
   ============================================================ */
const Dice = {
  mode: "normal",

  init() {
    document
      .getElementById("dice-roll-btn")
      .addEventListener("click", () => this.roll());
    document.getElementById("dice-count").addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.roll();
    });
  },

  setMode(mode, btn) {
    this.mode = mode;
    document
      .querySelectorAll(".dice-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  },

  roll() {
    const input = document.getElementById("dice-count");
    const n = Utils.clamp(parseInt(input.value) || 6, 1, 40);
    input.value = n;

    let hits = 0;
    let ones = 0;

    for (let i = 0; i < n; i++) {
      const r = Utils.randInt(1, 6);
      if (r >= 5) hits++;
      if (r === 1) ones++;
    }

    // Dés explosifs : on relance les succès
    if (this.mode === "explosive") {
      let toReroll = hits;
      let guard = 0;
      while (toReroll > 0 && guard < 6) {
        let newHits = 0;
        for (let i = 0; i < toReroll; i++) {
          if (Utils.randInt(1, 6) >= 5) newHits++;
        }
        hits += newHits;
        toReroll = newHits;
        guard++;
      }
    }

    const glitch = ones > Math.floor(n / 2);
    const critGlitch = glitch && hits === 0;

    let result = `${hits} succès`;
    if (critGlitch) result += " — ÉCHEC CRITIQUE";
    else if (glitch) result += " — Bévue";

    const el = document.getElementById("dice-result");
    el.textContent = result;
    el.style.color = critGlitch
      ? "#c0392b"
      : glitch
        ? "var(--accent2)"
        : "var(--accent)";
  },
};
