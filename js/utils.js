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

  /** Malus de dés lié aux cases de moniteur remplies (SR5/SR6).
      SR5 : −1D par tranche de `woundMod` cases (physique + étourdissement
      cumulés), réglage par défaut 3, désactivable (0).
      SR6 : −1D par tranche de 3 cases du moniteur d'état. */
  woundMalus(pnj, edition) {
    if (!pnj) return 0;
    if (edition === "sr5") {
      const div = parseInt(
        (typeof Settings !== "undefined" && Settings.get("woundMod", 3)) ?? 3,
        10,
      );
      if (!div) return 0;
      const total = (pnj.physFilled || 0) + (pnj.stunFilled || 0);
      return Math.floor(total / div);
    }
    if (edition === "sr6") {
      return Math.floor((pnj.physFilled || 0) / 3);
    }
    return 0;
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

   - computeRoll(n) : applique les règles Shadowrun
     (5-6 = succès ; bévue si plus de la moitié des dés sont des 1 ;
      échec critique si bévue ET zéro succès). Renvoie le détail complet.
   - roll() : conserve le comportement du bouton « Lancer » de la
     barre du haut (avec animation overlay).
   - rollPool(n, opts) : lance une réserve depuis une carte (attribut,
     compétence, réserve MJ…) avec animation plein écran : autant de
     dés que de points dans la réserve, qui roulent puis se figent.
   ============================================================ */
const Dice = {
  _animating: false,

  /* ---- Journal des jets (session, plus récent en premier) ---- */
  history: [],
  HISTORY_MAX: 30,

  _prefs() {
    return typeof Settings !== "undefined" && Settings.getDicePrefs
      ? Settings.getDicePrefs()
      : { quickRoll: false, defaultCount: 6 };
  },

  /** Applique les préférences (réserve par défaut du lanceur topbar). */
  applyPrefs() {
    const input = document.getElementById("dice-count");
    if (input) input.value = this._prefs().defaultCount;
  },

  init() {
    this.applyPrefs();
    document
      .getElementById("dice-roll-btn")
      .addEventListener("click", () => this.roll());
    document.getElementById("dice-count").addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.roll();
    });

    // Stepper −/＋ du lanceur topbar
    document.querySelectorAll("[data-dice-topbar-step]").forEach((btn) => {
      const delta = parseInt(btn.getAttribute("data-dice-topbar-step"), 10) || 0;
      btn.addEventListener("click", () => this.stepCount(delta));
    });

    // Clic sur n'importe quelle réserve marquée [data-roll] dans une carte
    document.addEventListener("click", (e) => {
      // Replier/déplier la zone Référence d'une carte
      const refEl = e.target.closest("[data-ref-toggle]");
      if (refEl) {
        const pnj = this._lookupPnj(refEl.getAttribute("data-ref-toggle"));
        if (pnj) {
          const open =
            typeof CardRenderer !== "undefined" && CardRenderer._refIsOpen
              ? CardRenderer._refIsOpen(pnj)
              : true;
          pnj._refOpen = !open;
          this._persistAndRefresh(pnj);
        }
        return;
      }

      // Effacer l'initiative affichée sur un PNJ
      const clearEl = e.target.closest("[data-init-clear]");
      if (clearEl) {
        e.stopPropagation();
        const pnj = this._lookupPnj(clearEl.getAttribute("data-init-clear"));
        if (pnj) {
          delete pnj.lastInit;
          this._persistAndRefresh(pnj);
        }
        return;
      }

      // Initiative : base + N D6 (somme, pas des succès)
      const initEl = e.target.closest("[data-roll-init]");
      if (initEl) {
        const base = parseInt(initEl.getAttribute("data-roll-init"), 10) || 0;
        const dice =
          parseInt(initEl.getAttribute("data-roll-init-dice"), 10) || 1;
        const pnjId = initEl.getAttribute("data-roll-pnj") || "";
        this.rollInitiative(base, dice, pnjId);
        return;
      }

      // Arme SR5/SR6 : on résout le pool depuis le PNJ et on lance
      const wEl = e.target.closest("[data-roll-weapon]");
      if (wEl) {
        const pnj = this._lookupPnj(wEl.getAttribute("data-roll-pnj"));
        const edition = wEl.getAttribute("data-roll-edition") || "sr5";
        const weapon = wEl.getAttribute("data-roll-weapon");
        if (pnj) this.rollWeapon(pnj, weapon, edition);
        return;
      }

      // Arme Anarchy : passe par le panneau de risque (avec la RR de l'arme)
      const waEl = e.target.closest("[data-roll-weapon-anarchy]");
      if (waEl) {
        const pnj = this._lookupPnj(waEl.getAttribute("data-roll-pnj"));
        const wName = waEl.getAttribute("data-roll-weapon-anarchy");
        if (pnj) {
          const weapon = (pnj.weapons || []).find((a) => a.name === wName);
          const r =
            typeof WeaponRoll !== "undefined" && weapon
              ? WeaponRoll.resolvePool(pnj, weapon, "anarchy")
              : null;
          if (r) {
            this.openRiskPanel(r.pool, {
              label: `${r.weaponName} (${r.matchedSkill || r.skill})`,
              rr: r.rr,
              adv: pnj.drugAdv || 0,
              who: pnj.name || "",
            });
          }
        }
        return;
      }

      const t = e.target.closest("[data-roll]");
      if (!t) return;
      const n = parseInt(t.getAttribute("data-roll"), 10);
      if (!n || n < 1) return;
      const label = t.getAttribute("data-roll-label") || "";
      const edition = t.getAttribute("data-roll-edition") || "";
      const rr = parseInt(t.getAttribute("data-roll-rr"), 10) || 0;

      // PNJ à l'origine du jet : attribut explicite, sinon la carte
      // englobante (compétences SR5/SR6, réserves MJ…). Alimente le
      // journal des jets.
      const holder = t.closest(".pnj-card");
      const rollPnj = this._lookupPnj(
        t.getAttribute("data-roll-pnj") || (holder && holder.dataset.id),
      );
      const who = (rollPnj && rollPnj.name) || "";

      // Anarchy 2.0 : on passe par le panneau de prise de risque
      if (edition === "anarchy") {
        this.openRiskPanel(n, { label, rr, adv: (rollPnj && rollPnj.drugAdv) || 0, who });
      } else {
        this.rollPool(n, { label, who });
      }
    });

    this._ensureOverlay();
    this._ensureRiskPanel();
  },

  /** Retrouve un PNJ par id dans le pool de génération ou les sauvegardés. */
  _lookupPnj(id) {
    if (!id) return null;
    if (typeof Gen !== "undefined" && Gen.findInPool) {
      const p = Gen.findInPool(id);
      if (p) return p;
    }
    if (typeof Shadows !== "undefined" && Shadows.data && Shadows.data.all) {
      const p = Shadows.data.all.find((x) => x.id === id);
      if (p) return p;
    }
    // Spiders liés aux serveurs (panneau Matrice)
    if (typeof Servers !== "undefined" && Servers.findSpider) {
      const p = Servers.findSpider(id);
      if (p) return p;
    }
    return null;
  },

  /** Lance l'attaque d'une arme SR5/SR6 (pool résolu, limite SR5). */
  rollWeapon(pnj, weapon, edition) {
    if (typeof WeaponRoll === "undefined") return;
    const r = WeaponRoll.resolvePool(pnj, weapon, edition);
    if (!r) return;
    const res = this.computeRoll(r.pool);
    // Plafonnement à la Précision (SR5) : la limite mord si hits > limite
    if (r.limit != null && res.hits > r.limit) {
      res.cappedFrom = res.hits;
      res.hits = r.limit;
      res.limited = true;
      res.limit = r.limit;
    }
    const approxTxt = r.approx ? " ~" : "";
    this._animate(res, {
      label: `${r.weaponName} (${r.matchedSkill || r.skill}${approxTxt})`,
      who: pnj.name || "",
    });
  },

  /** Stepper −/＋ du compteur de dés topbar. */
  stepCount(delta) {
    const input = document.getElementById("dice-count");
    if (!input) return;
    const n = Utils.clamp((parseInt(input.value, 10) || 0) + delta, 1, 40);
    input.value = n;
  },

  /* ---- Moteur de règles pur (testable, sans DOM) ---- */
  computeRoll(n) {
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

    const glitch = ones > Math.floor(n / 2);
    const critGlitch = glitch && hits === 0;

    return { n, faces, extra: [], hits, ones, glitch, critGlitch };
  },

  /* ========================================================
     ANARCHY 2.0 — RÈGLE DE RISQUE STANDARD

     La réserve totale ne change pas : on remplace `riskDice` dés
     normaux par des dés de risque.
       - Succès normaux : faces 5-6 sur les dés normaux.
       - Succès de risque : faces 5-6 sur les dés de risque, ×2.
       - Les ‘1’ sur les dés de risque génèrent des complications
         (les ‘1’ sur les dés normaux n'ont aucun effet).
       - La RR (réduction de risque) annule autant de ‘1’ de risque.
       - Complications après RR : 0 = rien, 1 = mineure,
         2 = critique, 3+ = désastre.
     ======================================================== */

  /* Table « Combien prendre de dés de risque ? » (p.71)
     indexée [RR][niveau] ; niveaux : faible, normal, fort, extrême.
     null = combinaison non prévue par la table (RR3 / extrême). */
  RISK_TABLE: {
    0: { faible: 1, normal: 2, fort: 4, extreme: 6 },
    1: { faible: 3, normal: 5, fort: 7, extreme: 10 },
    2: { faible: 5, normal: 8, fort: 11, extreme: 13 },
    3: { faible: 8, normal: 12, fort: 15, extreme: null },
  },

  RISK_LEVELS: [
    { key: "faible", label: "Faible", sub: "Précautionneuse" },
    { key: "normal", label: "Normal", sub: "Normale" },
    { key: "fort", label: "Fort", sub: "Risquée" },
    { key: "extreme", label: "Extrême", sub: "Suicidaire" },
  ],

  /** Nombre de dés de risque conseillé pour un level et une RR donnés. */
  riskDiceFor(level, rr, pool) {
    const row = this.RISK_TABLE[Utils.clamp(rr, 0, 3)] || this.RISK_TABLE[0];
    let v = row[level];
    if (v == null) {
      // Combinaison hors table (ex. RR3 extrême) : on prend tout le pool.
      v = pool;
    }
    return Utils.clamp(v, 0, pool);
  },

  /**
   * Lance une réserve Anarchy avec dés de risque.
   * @param {number} pool - taille totale de la réserve
   * @param {number} riskDice - dés de risque (0..pool)
   * @param {number} rr - réduction de risque (0..3)
   * @param {number} adv - avantage/désavantage net (p.67) : -1 = désavantage
   *   (seul 6 est un succès), 0 = normal (5-6), +1 = avantage (4-6).
   */
  computeAnarchyRoll(pool, riskDice, rr = 0, adv = 0) {
    pool = Utils.clamp(pool, 1, 60);
    riskDice = Utils.clamp(riskDice, 0, pool);
    rr = Utils.clamp(rr, 0, 3);
    adv = Utils.clamp(adv, -1, 1);
    const threshold = adv === 1 ? 4 : adv === -1 ? 6 : 5;

    const normalCount = pool - riskDice;
    const faces = []; // { v, risk: bool }
    let normalHits = 0;
    let riskHits = 0;
    let riskOnes = 0;

    for (let i = 0; i < normalCount; i++) {
      const v = Utils.randInt(1, 6);
      faces.push({ v, risk: false });
      if (v >= threshold) normalHits++;
    }
    for (let i = 0; i < riskDice; i++) {
      const v = Utils.randInt(1, 6);
      faces.push({ v, risk: true });
      if (v >= threshold) riskHits++;
      if (v === 1) riskOnes++;
    }

    // Succès : risque compte double
    const hits = normalHits + riskHits * 2;

    // Complications : ‘1’ de risque après RR
    const effectiveOnes = Math.max(0, riskOnes - rr);
    let complication = "none";
    if (effectiveOnes === 1) complication = "minor";
    else if (effectiveOnes === 2) complication = "critical";
    else if (effectiveOnes >= 3) complication = "disaster";

    return {
      anarchy: true,
      pool,
      riskDice,
      rr,
      adv,
      threshold,
      faces,
      extra: [],
      normalHits,
      riskHits,
      riskOnes,
      effectiveOnes,
      hits,
      complication,
    };
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

    // Anarchy 2.0 : ce lanceur passe par le panneau de prise de risque
    if (typeof App !== "undefined" && App.edition === "anarchy") {
      this.openRiskPanel(n, { label: "" });
      return;
    }

    const res = this.computeRoll(n);

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
    const res = this.computeRoll(n);
    this._animate(res, { label: opts.label || "" });
  },

  /* ---- Initiative : base + N D6, en SOMME (pas de succès) ---- */
  computeInitiative(base, dice) {
    base = Math.max(0, base | 0);
    dice = Utils.clamp(dice | 0, 1, 12);
    const faces = [];
    let sum = 0;
    for (let i = 0; i < dice; i++) {
      const v = Utils.randInt(1, 6);
      faces.push(v);
      sum += v;
    }
    return { init: true, base, dice, faces, diceSum: sum, total: base + sum };
  },

  rollInitiative(base, dice, pnjId) {
    const res = this.computeInitiative(base, dice);
    const pnjForLog = pnjId ? this._lookupPnj(pnjId) : null;
    this._animate(res, {
      label: "Initiative",
      who: (pnjForLog && pnjForLog.name) || "",
    });

    // Mémoriser le résultat sur le PNJ pour l'afficher sur sa carte
    if (pnjId) {
      const pnj = pnjForLog;
      if (pnj) {
        pnj.lastInit = {
          total: res.total,
          base: res.base,
          dice: res.dice,
          faces: res.faces.slice(),
        };
        this._persistAndRefresh(pnj);
      }
    }
  },

  /** Sauvegarde (si le PNJ est dans les Ombres ou spider d'un serveur)
      et rafraîchit sa carte. */
  _persistAndRefresh(pnj) {
    if (
      typeof Shadows !== "undefined" &&
      Shadows.data &&
      Shadows.data.all &&
      Shadows.data.all.some((p) => p.id === pnj.id)
    ) {
      Shadows.save();
    }
    if (typeof Servers !== "undefined" && Servers.ownsPnj && Servers.ownsPnj(pnj.id)) {
      Servers.save();
    }
    if (typeof CardRenderer !== "undefined" && CardRenderer.refresh) {
      CardRenderer.refresh(pnj);
    }
  },

  /* ========================================================
     PANNEAU DE PRISE DE RISQUE (Anarchy 2.0)
     ======================================================== */
  _risk: { pool: 0, riskDice: 0, rr: 0, adv: 0, level: "normal", label: "" },

  ADV_LEVELS: [
    { key: -1, label: "Désavantage", sub: "Seul 6 = succès" },
    { key: 0, label: "Normal", sub: "5-6 = succès" },
    { key: 1, label: "Avantage", sub: "4-6 = succès" },
  ],

  _ensureRiskPanel() {
    if (document.getElementById("risk-panel")) return;
    const p = document.createElement("div");
    p.id = "risk-panel";
    p.className = "risk-panel-overlay";
    p.setAttribute("hidden", "");
    p.innerHTML = `
      <div class="risk-panel" role="dialog" aria-label="Prise de risque">
        <div class="risk-panel-head">
          <span class="risk-panel-title" id="risk-panel-title">Prise de risque</span>
          <button class="risk-panel-close" id="risk-panel-close" aria-label="Fermer">✕</button>
        </div>
        <div class="risk-panel-pool" id="risk-panel-pool"></div>
        <div class="risk-levels" id="risk-levels"></div>
        <div class="risk-slider-row">
          <label class="risk-slider-label">Dés de risque
            <span class="risk-slider-val" id="risk-dice-val">0</span>
            <span class="risk-slider-sub">/ <span id="risk-pool-total">0</span></span>
          </label>
          <input type="range" id="risk-dice-slider" min="0" max="0" value="0">
        </div>
        <div class="risk-rr-row">
          <span class="risk-rr-label">Réduction de risque (RR)</span>
          <div class="risk-rr-steps" id="risk-rr-steps"></div>
        </div>
        <div class="risk-adv-row">
          <span class="risk-adv-label">Avantage / Désavantage</span>
          <div class="risk-adv-steps" id="risk-adv-steps"></div>
        </div>
        <div class="risk-forecast" id="risk-forecast"></div>
        <button class="risk-roll-btn" id="risk-roll-btn">Lancer</button>
      </div>`;
    document.body.appendChild(p);

    // Fermer en cliquant le fond ou la croix
    p.addEventListener("click", (e) => {
      if (e.target === p) this._closeRiskPanel();
    });
    document
      .getElementById("risk-panel-close")
      .addEventListener("click", () => this._closeRiskPanel());

    // Niveaux
    const lv = document.getElementById("risk-levels");
    lv.innerHTML = this.RISK_LEVELS.map(
      (l) =>
        `<button class="risk-level-btn" data-level="${l.key}">
           <span class="risk-level-name">${l.label}</span>
           <span class="risk-level-sub">${l.sub}</span>
         </button>`,
    ).join("");
    lv.addEventListener("click", (e) => {
      const b = e.target.closest(".risk-level-btn");
      if (!b) return;
      this._risk.level = b.dataset.level;
      const n = this.riskDiceFor(
        this._risk.level,
        this._risk.rr,
        this._risk.pool,
      );
      this._risk.riskDice = n;
      this._syncRiskPanel();
    });

    // RR steps 0-3
    const rr = document.getElementById("risk-rr-steps");
    rr.innerHTML = [0, 1, 2, 3]
      .map((v) => `<button class="risk-rr-btn" data-rr="${v}">${v}</button>`)
      .join("");
    rr.addEventListener("click", (e) => {
      const b = e.target.closest(".risk-rr-btn");
      if (!b) return;
      this._risk.rr = parseInt(b.dataset.rr, 10);
      // Recalcule les dés de risque pour le niveau courant
      this._risk.riskDice = this.riskDiceFor(
        this._risk.level,
        this._risk.rr,
        this._risk.pool,
      );
      this._syncRiskPanel();
    });

    // Slider
    const slider = document.getElementById("risk-dice-slider");
    slider.addEventListener("input", () => {
      this._risk.riskDice = parseInt(slider.value, 10) || 0;
      this._risk.level = null; // ajustement manuel : plus de niveau actif
      this._syncRiskPanel();
    });

    // Avantage / Désavantage (p.67 : net, un seul palier)
    const adv = document.getElementById("risk-adv-steps");
    adv.innerHTML = this.ADV_LEVELS.map(
      (l) =>
        `<button class="risk-adv-btn" data-adv="${l.key}">
           <span class="risk-adv-name">${l.label}</span>
           <span class="risk-adv-sub">${l.sub}</span>
         </button>`,
    ).join("");
    adv.addEventListener("click", (e) => {
      const b = e.target.closest(".risk-adv-btn");
      if (!b) return;
      this._risk.adv = parseInt(b.dataset.adv, 10);
      this._syncRiskPanel();
    });

    // Lancer
    document.getElementById("risk-roll-btn").addEventListener("click", () => {
      const { pool, riskDice, rr, adv, label, who } = this._risk;
      this._closeRiskPanel();
      const res = this.computeAnarchyRoll(pool, riskDice, rr, adv);
      this._animate(res, { label, who });
    });

    // Échap ferme
    document.addEventListener("keydown", (e) => {
      if (
        e.key === "Escape" &&
        !document.getElementById("risk-panel").hasAttribute("hidden")
      ) {
        this._closeRiskPanel();
      }
    });
  },

  openRiskPanel(pool, opts = {}) {
    this._ensureRiskPanel();
    this._risk = {
      pool,
      rr: Utils.clamp(opts.rr || 0, 0, 3),
      adv: Utils.clamp(opts.adv || 0, -1, 1),
      level: "normal",
      label: opts.label || "",
      who: opts.who || "",
      riskDice: 0,
    };
    this._risk.riskDice = this.riskDiceFor("normal", this._risk.rr, pool);

    const title = opts.label || "Prise de risque";
    document.getElementById("risk-panel-title").textContent = opts.who
      ? `${opts.who} — ${title}`
      : title;
    document.getElementById("risk-panel-pool").innerHTML =
      `Réserve : <strong>${pool}</strong> dé${pool > 1 ? "s" : ""}`;

    const slider = document.getElementById("risk-dice-slider");
    slider.max = String(pool);

    const p = document.getElementById("risk-panel");
    p.removeAttribute("hidden");
    void p.offsetWidth;
    p.classList.add("show");
    this._syncRiskPanel();
  },

  _closeRiskPanel() {
    const p = document.getElementById("risk-panel");
    if (!p) return;
    p.classList.remove("show");
    clearTimeout(p._t);
    p._t = setTimeout(() => p.setAttribute("hidden", ""), 200);
  },

  _syncRiskPanel() {
    const { pool, riskDice, rr, adv, level } = this._risk;
    document.getElementById("risk-dice-val").textContent = riskDice;
    document.getElementById("risk-pool-total").textContent = pool;
    const slider = document.getElementById("risk-dice-slider");
    slider.value = String(riskDice);
    const fillPct = pool > 0 ? (riskDice / pool) * 100 : 0;
    slider.style.setProperty("--fill", `${fillPct}%`);

    document.querySelectorAll(".risk-level-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.level === level);
    });
    document.querySelectorAll(".risk-rr-btn").forEach((b) => {
      b.classList.toggle("active", parseInt(b.dataset.rr, 10) === rr);
    });
    document.querySelectorAll(".risk-adv-btn").forEach((b) => {
      b.classList.toggle("active", parseInt(b.dataset.adv, 10) === adv);
    });

    // Prévision lisible
    const normalDice = pool - riskDice;
    const threshold = adv === 1 ? 4 : adv === -1 ? 6 : 5;
    const fc = document.getElementById("risk-forecast");
    const rrTxt = rr > 0 ? ` · RR ${rr} annule ${rr} « 1 »` : "";
    const advTxt =
      adv === 1
        ? " · Avantage : 4-6 = succès"
        : adv === -1
          ? " · Désavantage : seul 6 = succès"
          : "";
    fc.innerHTML =
      `<span>${normalDice} norm${normalDice > 1 ? "aux" : "al"} + ${riskDice} de risque</span>` +
      `<span class="risk-forecast-note">Succès de risque ×2 (seuil ${threshold}+)${rrTxt}${advTxt}</span>`;
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

  _dieEl(value, delay, isRisk = false, isInit = false, threshold = 5) {
    const hit = !isInit && value >= threshold;
    const one = !isInit && value === 1;
    const die = document.createElement("div");
    die.className =
      "die rolling" +
      (hit ? " hit" : "") +
      (one ? " one" : "") +
      (isRisk ? " risk" : "") +
      (isInit ? " init" : "");
    die.style.setProperty("--roll-delay", `${delay}ms`);
    // tumble aléatoire pour varier l'animation
    die.style.setProperty("--tumble", `${Utils.randInt(2, 4)}`);
    const badge = isRisk ? `<span class="die-risk-badge">!</span>` : "";
    die.innerHTML = `<div class="die-face">${this._pips(value)}</div>${badge}`;
    return die;
  },

  /** Normalise les faces d'un résultat en { v, risk } pour l'affichage. */
  _normalizeFaces(res) {
    const norm = (f) =>
      typeof f === "number"
        ? { v: f, risk: false }
        : { v: f.v, risk: !!f.risk };
    return {
      faces: (res.faces || []).map(norm),
      extra: (res.extra || []).map(norm),
    };
  },

  /* ---- Journal : enregistre chaque jet, quel que soit son origine ---- */
  _logRoll(res, opts = {}) {
    const e = { t: Date.now(), label: opts.label || "", who: opts.who || "" };
    if (res.init) {
      e.label = e.label || "Initiative";
      e.main = String(res.total);
      e.unit = "";
      e.sub = `${res.base} + ${res.dice}D6 [${res.faces.join(", ")}]`;
      e.cls = "good";
    } else if (res.anarchy) {
      e.main = String(res.hits);
      e.unit = `succès`;
      const advSuf = res.adv === 1 ? " · avantage" : res.adv === -1 ? " · désavantage" : "";
      e.sub = `${res.pool} dés · ${res.riskDice} de risque${advSuf}`;
      const compLabel = {
        minor: "Complication mineure",
        critical: "Complication critique",
        disaster: "Désastre",
      }[res.complication];
      e.tag = compLabel || "";
      e.cls =
        res.complication === "none"
          ? res.hits > 0
            ? "good"
            : "zero"
          : res.complication === "minor"
            ? "glitch"
            : "crit";
    } else {
      e.main = String(res.hits);
      e.unit = `succès`;
      e.sub = `${res.n} dés`;
      e.tag = res.critGlitch
        ? "Échec critique"
        : res.glitch
          ? "Bévue"
          : res.limited
            ? `Limité (${res.cappedFrom}→${res.limit})`
            : "";
      e.cls = res.critGlitch
        ? "crit"
        : res.glitch
          ? "glitch"
          : res.hits > 0
            ? "good"
            : "zero";
    }
    this.history.unshift(e);
    if (this.history.length > this.HISTORY_MAX)
      this.history.length = this.HISTORY_MAX;
    if (typeof DiceLog !== "undefined" && DiceLog.refresh) DiceLog.refresh();
  },

  /* ---- Lancer rapide : bandeau discret au lieu de l'animation ---- */
  _quickResult(res, opts = {}) {
    let el = document.getElementById("dice-quick");
    if (!el) {
      el = document.createElement("div");
      el.id = "dice-quick";
      document.body.appendChild(el);
      el.addEventListener("click", () => el.classList.remove("show"));
    }
    const last = this.history[0];
    if (!last) return;
    const fullLabel = [last.who, last.label].filter(Boolean).join(" — ");
    const labelHtml = fullLabel
      ? `<span class="dice-quick-label">${this._escSummary(fullLabel)}</span>`
      : "";
    const tagHtml = last.tag
      ? `<span class="dice-quick-tag">${this._escSummary(last.tag)}</span>`
      : "";
    el.className = `dice-quick-${last.cls}`;
    el.innerHTML = `${labelHtml}
      <span class="dice-quick-main">${last.main}</span>
      <span class="dice-quick-unit">${last.unit || ""}</span>
      ${tagHtml}
      <span class="dice-quick-sub">${this._escSummary(last.sub)}</span>`;
    void el.offsetWidth;
    el.classList.add("show");
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(() => el.classList.remove("show"), 2800);
  },

  _animate(res, opts = {}) {
    this._logRoll(res, opts);

    // Lancer rapide : pas d'animation plein écran
    if (this._prefs().quickRoll) {
      this._quickResult(res, opts);
      return;
    }

    this._ensureOverlay();
    const ov = document.getElementById("dice-overlay");
    clearTimeout(ov._closeTimer);
    const tray = document.getElementById("dice-tray");
    const summary = document.getElementById("dice-summary");
    tray.innerHTML = "";
    summary.innerHTML = "";
    summary.className = "dice-summary";

    let shown;
    if (res.init) {
      // Dés d'initiative : neutres (somme, pas de succès)
      shown = res.faces.slice(0, 40).map((v) => ({ v, init: true }));
    } else {
      const { faces, extra } = this._normalizeFaces(res);
      shown = [...faces, ...extra].slice(0, 40);
    }

    const threshold = res.anarchy ? res.threshold || 5 : 5;
    const stagger = shown.length > 24 ? 14 : 26;
    shown.forEach((f, i) => {
      tray.appendChild(
        this._dieEl(f.v, i * stagger, f.risk, f.init, threshold),
      );
    });

    ov.removeAttribute("hidden");
    void ov.offsetWidth;
    ov.classList.add("show");

    const settleAt = shown.length * stagger + 760;
    clearTimeout(ov._settleTimer);
    ov._settleTimer = setTimeout(() => {
      tray
        .querySelectorAll(".die")
        .forEach((d) => d.classList.remove("rolling"));
      if (res.init) this._revealInitiative(res, summary, opts);
      else if (res.anarchy) this._revealAnarchy(res, summary, opts);
      else this._revealStandard(res, summary, opts);
    }, settleAt);
  },

  /** Ligne « qui lance » de l'overlay (nom du PNJ, si connu). */
  _whoHtml(opts) {
    return opts && opts.who
      ? `<span class="dice-summary-who">${this._escSummary(opts.who)}</span>`
      : "";
  },

  _revealInitiative(res, summary, opts) {
    summary.classList.add("reveal", "good", "init");
    const detail = `${res.base} + [${res.faces.join(", ")}]`;
    summary.innerHTML = `
      ${this._whoHtml(opts)}
      <span class="dice-summary-label">Initiative</span>
      <div class="dice-summary-main">
        <span class="dice-summary-hits">${res.total}</span>
      </div>
      <span class="dice-summary-breakdown">${res.total} = ${detail}</span>
      <span class="dice-summary-pool">${res.base} + ${res.dice}D6</span>`;
  },

  _revealStandard(res, summary, opts) {
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
    const poolHtml = `<span class="dice-summary-pool">${res.n} dé${res.n > 1 ? "s" : ""}</span>`;
    const big = `<span class="dice-summary-hits">${res.hits}</span><span class="dice-summary-hits-label">succès</span>`;
    let tag = "";
    if (res.critGlitch)
      tag = `<span class="dice-summary-tag crit">Échec critique</span>`;
    else if (res.glitch)
      tag = `<span class="dice-summary-tag glitch">Bévue</span>`;

    // Limite SR5 : signaler quand la Précision mord
    let limitTag = "";
    if (res.limited) {
      limitTag = `<span class="dice-summary-tag limit">Limité par la précision (${res.cappedFrom}→${res.limit})</span>`;
    }

    summary.innerHTML = `
      ${this._whoHtml(opts)}
      ${labelHtml}
      <div class="dice-summary-main">${big}</div>
      ${tag}
      ${limitTag}
      ${poolHtml}`;
  },

  _revealAnarchy(res, summary, opts) {
    const compMeta = {
      none: { cls: "good", label: "" },
      minor: { cls: "glitch", label: "Complication mineure" },
      critical: { cls: "crit", label: "Complication critique" },
      disaster: { cls: "crit", label: "Désastre" },
    }[res.complication];

    const cls =
      res.complication !== "none"
        ? compMeta.cls
        : res.hits > 0
          ? "good"
          : "zero";
    summary.classList.add("reveal", cls);

    const labelHtml = opts.label
      ? `<span class="dice-summary-label">${this._escSummary(opts.label)}</span>`
      : "";
    const big = `<span class="dice-summary-hits">${res.hits}</span><span class="dice-summary-hits-label">succès</span>`;

    // Détail de la composition des succès
    const riskBonus = res.riskHits * 2;
    const breakdown =
      res.riskDice > 0
        ? `<span class="dice-summary-breakdown">${res.normalHits} norm${res.normalHits > 1 ? "aux" : "al"} + ${res.riskHits}×2 risque</span>`
        : "";

    // Tag de complication
    let tag = "";
    if (res.complication !== "none") {
      const tcls = res.complication === "minor" ? "glitch" : "crit";
      const onesTxt =
        res.rr > 0
          ? ` (${res.riskOnes} « 1 » − RR ${res.rr})`
          : ` (${res.riskOnes} « 1 »)`;
      tag = `<span class="dice-summary-tag ${tcls}">${compMeta.label}${onesTxt}</span>`;
    } else if (res.riskOnes > 0 && res.rr > 0) {
      // RR a tout absorbé : on le signale positivement
      tag = `<span class="dice-summary-tag safe">RR absorbe ${res.riskOnes} « 1 »</span>`;
    }

    // Avantage / désavantage : affichage clair (p.67)
    let advTag = "";
    if (res.adv === 1)
      advTag = `<span class="dice-summary-tag safe">Avantage — 4-6 = succès</span>`;
    else if (res.adv === -1)
      advTag = `<span class="dice-summary-tag glitch">Désavantage — seul 6 = succès</span>`;

    const poolHtml = `<span class="dice-summary-pool">${res.pool} dés · ${res.riskDice} de risque</span>`;

    summary.innerHTML = `
      ${this._whoHtml(opts)}
      ${labelHtml}
      <div class="dice-summary-main">${big}</div>
      ${breakdown}
      ${advTag}
      ${tag}
      ${poolHtml}`;
  },

  _escSummary(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  },
};
