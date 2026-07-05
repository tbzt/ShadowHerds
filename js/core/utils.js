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

  /** Normalise une chaîne pour la recherche : minuscules, sans accents. */
  searchNorm(s) {
    return String(s ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
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

  /** Nom complet d'une abréviation d'attribut, pour l'affichage (tooltips, jets). */
  attrFullName(abbr) {
    const names = {
      CON: "Constitution",
      AGI: "Agilité",
      REA: "Réaction",
      RÉA: "Réaction",
      FOR: "Force",
      VOL: "Volonté",
      LOG: "Logique",
      INT: "Intuition",
      CHA: "Charisme",
      ESS: "Essence",
      MAG: "Magie",
    };
    return names[abbr] || abbr;
  },

  /** Malus de dés lié aux cases de moniteur remplies — formule propre à
      chaque édition, cf. `conditionMonitor.woundMalus` (js/editions/*.js). */
  woundMalus(pnj, edition) {
    if (!pnj) return 0;
    const editionModule = App.getEditionModule(edition);
    return editionModule ? editionModule.conditionMonitor.woundMalus(pnj) : 0;
  },

  /* ============================================================
     TABLES DE NOMS
     Organisées par origine culturelle pour donner de la texture.
     Chaque runner a un prénom d'origine + un surnom de rue.
     ============================================================ */
  _firstNames: {
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

  _lastNames: {
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

  _aliases: {
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

  /** Liste des originPools pour le formulaire */
  originPools() {
    return Object.keys(this._firstNames);
  },

  /**
   * Génère un nom complet runner : Prénom "Surnom" Nom
   * Si bassin est fourni, l'utilise ; sinon tirage aléatoire.
   */
  genName(originPool = null) {
    const b =
      originPool && this._firstNames[originPool]
        ? originPool
        : this.rand(Object.keys(this._firstNames));
    const firstName = this.rand(this._firstNames[b]);
    const family = this._lastNames[b]
      ? this.rand(this._lastNames[b])
      : this.rand(this._lastNames.generique);

    const registre = this.rand(Object.keys(this._aliases));
    const alias = this.rand(this._aliases[registre]);

    return `${firstName} "${alias}" ${family}`;
  },

  /** Prénom seul, pour les contacts qui n'ont pas forcément de surnom runner */
  genFirstName() {
    const originPools = Object.keys(this._firstNames);
    return this.rand(this._firstNames[this.rand(originPools)]);
  },

  /** Surnom seul */
  genHandle() {
    const registres = Object.keys(this._aliases);
    return this.rand(this._aliases[this.rand(registres)]);
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

  /** Échappe &, < et > pour une insertion sûre dans du HTML. */
  escHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
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

/** Variante de toast avec un bouton « Annuler » qui appelle onUndo() puis
    ferme le toast. Sert de filet de sécurité aux suppressions (Collection,
    générateur). Durée plus longue (6 s) pour laisser le temps de réagir.
    Le bouton est câblé en JS (pas de handler inline). */
function toastUndo(msg, onUndo, duration = 6000) {
  const el = document.getElementById("toast");
  if (!el) return;
  clearTimeout(el._timer);
  el.innerHTML = "";
  const span = document.createElement("span");
  span.className = "toast-msg";
  span.textContent = msg;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "toast-undo";
  btn.textContent = "Annuler";
  const hide = () => el.classList.remove("show");
  btn.addEventListener("click", () => {
    clearTimeout(el._timer);
    hide();
    onUndo();
  });
  el.append(span, btn);
  el.classList.add("show");
  el._timer = setTimeout(hide, duration);
}
