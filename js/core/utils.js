"use strict";

/* ============================================================
   UTILS
   ============================================================ */
export const Utils = {
  /** Résolveur du module d'édition, injecté par App au démarrage.
      Utils (couche 1, socle) ne référence jamais App (couche 6) par son nom :
      la dépendance ne descend que dans un sens (CONTRIBUTING.md « cycle
      verrou ») — c'est App qui appelle Utils.init, jamais l'inverse. */
  _resolveEditionModule: null,
  init(hooks) {
    this._resolveEditionModule = hooks.resolveEditionModule;
  },

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

  /** Aplatit le CONTENU d'une fiche (compétences, équipement, sorts,
      pouvoirs, augmentations, armes, connaissances, journal) en une seule
      chaîne indexable par la recherche plein-fiche (F1). Lit des champs
      GÉNÉRIQUES posés à la génération dans toutes les éditions — aucune
      branche `App.edition`. Tolère les entrées chaîne OU objet ({name,…}) :
      selon l'édition, spells/powers/knowledges sont l'un ou l'autre. Les
      champs `journal`/`note` sont lus défensivement (absents avant F2). */
  entityContent(e) {
    if (!e) return "";
    // #63 : v.str couvre l'item d'équipement polymorphe {str,cat,rating}
    // (ItemResolver), v.name les autres formes objet (sorts/pouvoirs/...).
    const named = (v) => (v == null ? "" : typeof v === "string" ? v : v.name || v.str || "");
    const list = (arr) => (Array.isArray(arr) ? arr.map(named).join(" ") : "");
    const journal = Array.isArray(e.journal)
      ? e.journal.map((j) => (typeof j === "string" ? j : j && j.text) || "").join(" ")
      : "";
    return [
      list(e.skills),
      list(e.equip),
      list(e.spells),
      list(e.powers),
      list(e.augs),
      list(e.weapons),
      list(e.knowledges),
      journal,
      e.note || "",
    ].join(" ");
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
    if (!pnj || !this._resolveEditionModule) return 0;
    const editionModule = this._resolveEditionModule(edition);
    return editionModule ? editionModule.conditionMonitor.woundMalus(pnj) : 0;
  },

  /** Malus de dés dû aux effets (sorts / formes complexes) MAINTENUS — règle
      propre à chaque édition (cf. `sustainMalus` des modules : −2 par effet
      maintenu en SR5/SR6, cf. livre SR5 p.284/p.253 et SR6 p.136/p.129 ; 0 en
      Anarchy). Renvoie 0 si l'édition n'expose pas la mécanique. */
  sustainMalus(pnj, edition) {
    if (!pnj || !this._resolveEditionModule) return 0;
    const editionModule = this._resolveEditionModule(edition);
    return editionModule && editionModule.sustainMalus ? editionModule.sustainMalus(pnj) : 0;
  },

  /** Malus de dés SITUATIONNEL TOTAL d'un acteur = blessure + effets maintenus.
      Ces deux pénalités frappent TOUS les tests du PNJ, elles se cumulent, et
      chaque site de jet doit retrancher la même chose : c'est ce point unique.
      ⚠ Le badge de blessure, lui, lit `woundMalus` SEUL — il nomme sa source ;
      un badge de maintien distinct nomme la sienne. */
  dicePenalty(pnj, edition) {
    return this.woundMalus(pnj, edition) + this.sustainMalus(pnj, edition);
  },

  /** Nombre d'effets (sorts + formes complexes) actuellement MAINTENUS par un
      PNJ : un effet est maintenu quand son dernier lancer porte le flag
      (`_lastCast.sustained`, posé par MagicAction._toggleSustain). Neutre par
      édition — le mapping compte→dés est porté par `sustainMalus` de chaque
      module (−2/effet en SR5/SR6, 0 en Anarchy). */
  sustainedCount(pnj) {
    if (!pnj) return 0;
    let n = 0;
    for (const list of [pnj.spells, pnj.complexForms]) {
      if (!Array.isArray(list)) continue;
      for (const e of list) if (e && e._lastCast && e._lastCast.sustained) n++;
    }
    return n;
  },

  /** Malus de blessure d'un moniteur DOUBLE (physique + étourdissant).
      La règle est la même dans les trois éditions à échelle, et elle compte
      **par moniteur, puis cumule** — jamais sur la somme des deux :
      - SR5, chap. Dommages : « -1 par tranche de trois cases de dommages
        dans l'UN des moniteurs […] les modificateurs issus de CHACUN des
        moniteurs se cumulent » ;
      - SR6 p.43 : rangées de 3, -1 par rangée pleine, cumulé sur les deux ;
      - Anarchy 1 p.156 : « chaque fois qu'une ligne est remplie, sur le
        moniteur physique OU étourdissant […] les modificateurs se cumulent ».

      Sommer d'abord puis diviser sur-pénalise dès que les deux restes
      cumulent ≥ div (2 phys + 2 étourdi = 0 au livre, -1 si l'on somme).

      `ignore` = cases neutralisées par le Compensateur de dommages, qui est
      un STOCK librement réparti entre les deux pistes (SR5 p.464 : « physiques,
      ou étourdissantes ou une combinaison des deux ») — et la répartition
      change le résultat. On retient donc la plus favorable au porteur, comme
      le livre l'y autorise, plutôt que d'imposer un ordre arbitraire. */
  woundMalusTracks(physFilled, stunFilled, div, ignore = 0) {
    if (!div) return 0;
    const phys = Math.max(0, physFilled || 0);
    const stun = Math.max(0, stunFilled || 0);
    const stock = Math.max(0, ignore || 0);
    let best = Infinity;
    for (let onPhys = 0; onPhys <= Math.min(stock, phys); onPhys++) {
      const onStun = Math.min(stock - onPhys, stun);
      const malus =
        Math.floor((phys - onPhys) / div) + Math.floor((stun - onStun) / div);
      if (malus < best) best = malus;
    }
    return best === Infinity ? 0 : best;
  },

  /** Teinte d'alarme d'une jauge de vie proportionnelle (moniteur en
      échelle : SR5/SR6/A1/véhicules) — convention d'affichage partagée,
      seuils ½ (attention) et ¾ (critique). Couche 1 pour qu'elle vive en
      UN seul endroit : les 3 éditions à échelle la lisent depuis leur
      `gauge()`, le renderer ne fait que peindre le `level` renvoyé.
      ⚠ NE convient PAS aux moniteurs à seuils (Anarchy 2) : là, l'alarme
      dépend du palier le plus GRAVE atteint, pas de la fraction de cases —
      chaque édition tranche sa règle dans `gauge()`. */
  woundTone(frac) {
    if (frac >= 0.75) return "crit";
    if (frac >= 0.5) return "warn";
    return "";
  },

  /** Descripteur de jauge en ÉCHELLE (`form:"ladder"`) — moniteur à cases
      cumulées : SR5, SR6, Anarchy 1, véhicules/drones. Rempli par l'édition
      dans `conditionMonitor.gauge()`, dessiné aveuglément par le renderer
      (barre fine = `frac`+`level` ; cases = `filled`/`total`). `null` quand
      il n'y a pas de moniteur (total 0 : PJ ad-hoc, CI matricielle) → le
      renderer n'affiche rien. Miroir à seuils : `Utils.tiersGauge`. */
  ladderGauge(filled, total) {
    const t = Math.max(0, total || 0);
    if (!t) return null;
    const f = Utils.clamp(filled || 0, 0, t);
    const frac = f / t;
    return { form: "ladder", filled: f, total: t, frac, level: Utils.woundTone(frac), label: `${f} / ${t}` };
  },

  /** Descripteur de jauge à SEUILS (`form:"tiers"`) — moniteur par paliers de
      gravité (Anarchy 2 : légère/grave/incapacitante). `tiers` porte la forme
      réelle pour un rendu par segments ; `frac`+`level` classent par palier le
      plus GRAVE atteint, jamais par le nombre de cases (2 légères < 1 grave —
      cf. livre A2 p.68). Le renderer dessine sans comprendre la règle. */
  tiersGauge(tiers) {
    const list = (tiers || []).map((t) => ({
      sev: t.sev,
      label: t.label,
      cap: Math.max(0, t.cap || 0),
      filled: Utils.clamp(t.filled || 0, 0, Math.max(0, t.cap || 0)),
    }));
    if (!list.length) return null;
    // Palier le plus grave atteint = dernier de la liste ayant au moins une
    // case pleine (les tiers sont fournis du plus léger au plus grave).
    let worstIdx = -1;
    list.forEach((t, i) => {
      if (t.filled > 0) worstIdx = i;
    });
    const last = list.length - 1;
    // Fraction MONOTONE en gravité : chaque palier occupe une bande, sans
    // qu'aucune quantité de léger ne franchisse la bande d'un cran plus grave.
    // Alarme : dernier palier (incapacitante) → critique ; tout palier
    // intermédiaire non-léger → attention ; léger seul → neutre.
    const frac = worstIdx < 0 ? 0 : (worstIdx + 1) / list.length;
    const level = worstIdx < 0 ? "" : worstIdx >= last ? "crit" : worstIdx >= 1 ? "warn" : "";
    const label = worstIdx < 0 ? "indemne" : `blessure ${list[worstIdx].label}`;
    return { form: "tiers", tiers: list, frac, level, label };
  },

  /** Vibration courte (Android ; iOS Safari l'ignore silencieusement, le
      visuel doit tenir seul) — couche 1, partagée par tout geste qui veut
      un retour haptique bref (drag de scène, palier de moniteur…). */
  haptic(ms) {
    try {
      if (navigator.vibrate) navigator.vibrate(ms);
    } catch (_) {}
  },

  /** Nombre de cases de dommages ignorées pour le calcul des
      modificateurs de blessure, apporté par un « Compensateur de dommages »
      (SR5 p.464 / SR6 p.301, indice 1-12, mécanique identique). Neutre —
      le libellé est le même dans les deux éditions, l'APPLICATION vit dans
      chaque `conditionMonitor.woundMalus`. Indice non résolu (plage non
      réglée par le stepper #63) → 0. */
  woundBoxesIgnored(pnj) {
    if (!pnj || typeof ItemResolver === "undefined") return 0;
    const items = [...(pnj.equip || []), ...(pnj.augs || [])];
    const carrier = items.find((it) =>
      /compensateur de dommages/i.test(ItemResolver.itemStr(it)),
    );
    if (!carrier) return 0;
    return ItemResolver.itemRating(carrier) || 0;
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
      "Haruki",
      "Sora",
      "Emi",
      "Daichi",
      "Yumi",
      "Isamu",
      "Chika",
      "Goro",
      "Akira",
      "Noriko",
      "Satoshi",
      "Mai",
      "Hiro",
      "Aya",
      "Jiro",
      "Keiko",
      "Osamu",
      "Rin",
      "Takumi",
      "Yoko",
      "Makoto",
      "Sachi",
      "Tomo",
      "Naoki",
      "Eri",
      "Kaede",
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
      "Jiwoo",
      "Eunji",
      "Sungmin",
      "Jihoon",
      "Nari",
      "Doyoon",
      "Somin",
      "Yejin",
      "Taemin",
      "Hyejin",
      "Woojin",
      "Areum",
      "Seojun",
      "Jinho",
      "Miyoung",
      "Kyungsoo",
      "Sunwoo",
      "Hyerin",
      "Minjae",
      "Chaewon",
      "Bomi",
      "Gyuri",
      "Jimin",
      "Suah",
      "Hoyeon",
      "Namjoo",
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
      "Feng",
      "Hua",
      "Ling",
      "Bo",
      "Qing",
      "Xiu",
      "Yun",
      "Jun",
      "Lei",
      "Ming",
      "Ning",
      "Ping",
      "Tao",
      "Xin",
      "Yao",
      "Zhen",
      "Dan",
      "Hui",
      "Jie",
      "Kai",
      "Lan",
      "Nuo",
      "Ru",
      "Shan",
      "Ting",
      "Wan",
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
      "Anya",
      "Sergei",
      "Nikolai",
      "Pavel",
      "Lena",
      "Sonya",
      "Tatiana",
      "Andrei",
      "Boris",
      "Galina",
      "Igor",
      "Larisa",
      "Maxim",
      "Natasha",
      "Olga",
      "Roman",
      "Svetlana",
      "Vadim",
      "Yelena",
      "Alexei",
      "Grigori",
      "Marina",
      "Vasili",
      "Lyuba",
      "Fyodor",
      "Raisa",
      "Konstantin",
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
      "Abeni",
      "Chidi",
      "Efua",
      "Folami",
      "Jabari",
      "Kamau",
      "Lumo",
      "Makena",
      "Ngozi",
      "Obi",
      "Themba",
      "Zuberi",
      "Ama",
      "Baraka",
      "Chinelo",
      "Eshe",
      "Ifeoma",
      "Jengo",
      "Naledi",
      "Oluwaseun",
      "Simba",
      "Tendai",
      "Yaa",
      "Bem",
      "Dunia",
      "Ekon",
      "Zawadi",
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
      "Sofia",
      "Javier",
      "Lucia",
      "Esteban",
      "Carmen",
      "Rafael",
      "Elena",
      "Tomas",
      "Isabela",
      "Nacho",
      "Paloma",
      "Ramon",
      "Gabriela",
      "Alejandro",
      "Marisol",
      "Emilio",
      "Renata",
      "Hector",
      "Dolores",
      "Salvador",
      "Ximena",
      "Andres",
      "Beatriz",
      "Cristobal",
      "Guadalupe",
      "Nando",
      "Consuelo",
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
      "Kai",
      "Nalani",
      "Ari",
      "Tui",
      "Maui",
      "Hina",
      "Ropata",
      "Anahera",
      "Wiremu",
      "Marama",
      "Keanu",
      "Leilani",
      "Mahina",
      "Nikau",
      "Ratu",
      "Sina",
      "Vaite",
      "Fetu",
      "Kalani",
      "Ihaka",
      "Manaia",
      "Ariki",
      "Tiare",
      "Malia",
      "Tavita",
      "Heremana",
      "Poema",
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
      "Anke",
      "Bram",
      "Freya",
      "Hans",
      "Ingrid",
      "Jonas",
      "Klara",
      "Lars",
      "Mila",
      "Nils",
      "Otto",
      "Pia",
      "Rurik",
      "Stig",
      "Tilda",
      "Ulf",
      "Wilhelm",
      "Astrid",
      "Emil",
      "Greta",
      "Henrik",
      "Johan",
      "Katrin",
      "Magnus",
      "Nadja",
      "Oskar",
      "Runa",
      "Solveig",
      "Bjorn",
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
      "Amir",
      "Dalia",
      "Faisal",
      "Jamila",
      "Khalid",
      "Leila",
      "Malik",
      "Nour",
      "Rashid",
      "Samira",
      "Youssef",
      "Zaid",
      "Aisha",
      "Bashir",
      "Fadi",
      "Ghada",
      "Habib",
      "Imran",
      "Jalal",
      "Latifa",
      "Mona",
      "Nabil",
      "Rania",
      "Sami",
      "Widad",
      "Tahir",
      "Salma",
      "Adnan",
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
      "River",
      "Raven",
      "Talon",
      "Cedar",
      "Willow",
      "Onyx",
      "Aiyana",
      "Dakota",
      "Elan",
      "Kaya",
      "Nayeli",
      "Chaska",
      "Tala",
      "Cheyenne",
      "Koda",
      "Mika",
      "Nita",
      "Yuma",
      "Winona",
      "Chayton",
      "Enola",
      "Mato",
      "Takoda",
      "Aponi",
      "Tokala",
      "Wrenna",
      "Halona",
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
      "Bek",
      "Chuluun",
      "Dorj",
      "Enkh",
      "Ganbold",
      "Khulan",
      "Nergui",
      "Odval",
      "Sarnai",
      "Tengis",
      "Ulan",
      "Yesun",
      "Bolor",
      "Ceren",
      "Dari",
      "Jibek",
      "Kuralai",
      "Madi",
      "Nurlan",
      "Timur",
      "Aizhan",
      "Bota",
      "Sanjar",
      "Erdeni",
      "Khenbish",
      "Oyunaa",
      "Tamir",
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
      "Jordan",
      "Casey",
      "Riley",
      "Taylor",
      "Robin",
      "Drew",
      "Charlie",
      "Frankie",
      "Jules",
      "Max",
      "Nova",
      "Remy",
      "Ari",
      "Bailey",
      "Devon",
      "Emery",
      "Gray",
      "Harley",
      "Indie",
      "Kit",
      "Lane",
      "Micah",
      "Noa",
      "Perry",
      "Rowan",
      "Shay",
      "Val",
      "Wynn",
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
      "Mori",
      "Abe",
      "Ikeda",
      "Hashimoto",
      "Ishikawa",
      "Ogawa",
      "Goto",
      "Okada",
      "Hasegawa",
      "Murakami",
      "Kondo",
      "Ishii",
      "Saito",
      "Sakamoto",
      "Endo",
      "Aoki",
      "Fujita",
      "Nishimura",
      "Fukuda",
      "Ota",
      "Miura",
      "Takahashi",
      "Matsumoto",
      "Nakagawa",
      "Kaneko",
      "Wada",
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
      "Hwang",
      "Ahn",
      "Song",
      "Ryu",
      "Hong",
      "Jeon",
      "Ko",
      "Moon",
      "Yang",
      "Bae",
      "Baek",
      "Heo",
      "Yu",
      "Nam",
      "Noh",
      "Ha",
      "Gu",
      "Sim",
      "Chu",
      "Do",
      "Jo",
      "Min",
      "Chae",
      "Wi",
      "Ma",
      "Kwak",
      "Seok",
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
      "Lin",
      "He",
      "Gao",
      "Luo",
      "Zheng",
      "Liang",
      "Xie",
      "Song",
      "Tang",
      "Han",
      "Feng",
      "Deng",
      "Cao",
      "Peng",
      "Zeng",
      "Xiao",
      "Tian",
      "Dong",
      "Yuan",
      "Pan",
      "Cai",
      "Jiang",
      "Yu",
      "Du",
      "Ye",
      "Cheng",
      "Wei",
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
      "Egorov",
      "Pavlov",
      "Semenov",
      "Golubev",
      "Vinogradov",
      "Bogdanov",
      "Vorobyov",
      "Kuznetsov",
      "Smirnov",
      "Vasiliev",
      "Solovyov",
      "Kudryavtsev",
      "Baranov",
      "Antonov",
      "Tarasov",
      "Belyakov",
      "Komarov",
      "Melnikov",
      "Shcherbakov",
      "Gerasimov",
      "Panov",
      "Rusakov",
      "Titov",
      "Frolov",
      "Zhukov",
      "Karpov",
      "Ivanov",
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
      "Adeyemi",
      "Abara",
      "Achebe",
      "Balogun",
      "Dlamini",
      "Eze",
      "Fofana",
      "Gueye",
      "Ibe",
      "Kamara",
      "Kone",
      "Mabaso",
      "Mwangi",
      "Ndlovu",
      "Obi",
      "Okafor",
      "Sankara",
      "Sesay",
      "Sithole",
      "Tshabalala",
      "Wanjiru",
      "Zuma",
      "Cissé",
      "Fall",
      "Gadji",
      "Konaté",
      "Sarr",
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
      "Gomez",
      "Diaz",
      "Vargas",
      "Castillo",
      "Jimenez",
      "Romero",
      "Suarez",
      "Mendoza",
      "Aguilar",
      "Vega",
      "Delgado",
      "Guerrero",
      "Rojas",
      "Medina",
      "Castro",
      "Herrera",
      "Nunez",
      "Salazar",
      "Acosta",
      "Sandoval",
      "Fuentes",
      "Cabrera",
      "Molina",
      "Campos",
      "Espinoza",
      "Navarro",
      "Pena",
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
      "Kahale",
      "Tuilagi",
      "Faleatua",
      "Manaia",
      "Rewiti",
      "Tui",
      "Kaimana",
      "Naufahu",
      "Latu",
      "Sione",
      "Vaega",
      "Pouri",
      "Teariki",
      "Tuputala",
      "Havili",
      "Faasavalu",
      "Tupou",
      "Kealoha",
      "Mahelona",
      "Kanahele",
      "Whetu",
      "Ngaro",
      "Paikea",
      "Tangaroa",
      "Rangihau",
      "Maniapoto",
      "Kealohi",
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
      "Hoffmann",
      "Wagner",
      "Becker",
      "Schulz",
      "Koch",
      "Richter",
      "Klein",
      "Wolf",
      "Neumann",
      "Zimmermann",
      "Braun",
      "Krüger",
      "Hofmann",
      "Lindqvist",
      "Bergström",
      "Sørensen",
      "Jensen",
      "Hansen",
      "Wojcik",
      "Kaminski",
      "Horvat",
      "Vermeulen",
      "De Vries",
      "Bakker",
      "Moreau",
      "Laurent",
      "Girard",
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
      "Haddad",
      "Najjar",
      "Sayegh",
      "Kassab",
      "Bakr",
      "Fakhoury",
      "Darwish",
      "Halabi",
      "Masri",
      "Nazari",
      "Rahimi",
      "Shadid",
      "Tahan",
      "Zaidan",
      "Ghannam",
      "Wahab",
      "Sultan",
      "Rahman",
      "Karimi",
      "Baghdadi",
      "Sharif",
      "Younes",
      "Dabbagh",
      "Osman",
      "Habibi",
      "Marwan",
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
      "Silvercloud",
      "Runningwolf",
      "Blackfeather",
      "Morningstar",
      "Tallgrass",
      "Swiftwater",
      "Redhawk",
      "Standingbear",
      "Coldwind",
      "Greyeagle",
      "Littlecrow",
      "Nightsky",
      "Thunderhorse",
      "Whitecloud",
      "Bearclaw",
      "Wildhorse",
      "Firewalker",
      "Manyhorses",
      "Yellowbird",
      "Stillwater",
      "Brightwater",
      "Windwalker",
      "Rainingsky",
      "Tenbears",
      "Highelk",
      "Snowowl",
      "Darkcloud",
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
      "Bayar",
      "Chuluunbaatar",
      "Dorjsuren",
      "Enkhbat",
      "Gombojav",
      "Khorloo",
      "Lkhagva",
      "Nyamdorj",
      "Otgonbayar",
      "Purevdorj",
      "Sanjaa",
      "Tumurbaatar",
      "Zorigt",
      "Altankhuyag",
      "Bataar",
      "Choijil",
      "Delger",
      "Gantumur",
      "Jargal",
      "Munkhbat",
      "Nasan",
      "Ochir",
      "Sukh",
      "Tsogt",
      "Yondon",
      "Amur",
      "Baasan",
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
      "Frost",
      "Kane",
      "Rourke",
      "Bishop",
      "Fletcher",
      "Hale",
      "Mercer",
      "Nash",
      "Pryce",
      "Rhodes",
      "Sharpe",
      "Thorne",
      "Vaughn",
      "Wilder",
      "York",
      "Ashby",
      "Blackwood",
      "Cade",
      "Dax",
      "Ellis",
      "Grimes",
      "Hollis",
      "Keller",
      "Lynch",
      "Malone",
      "Pike",
      "Sable",
    ],
  },

  _aliases: {
    // Surnoms par registre — le runner choisit (ou hérite) du sien
    cyber: [
      "Chrome",
      "Circuit",
      "Pixel",
      "Patch",
      "Firmware",
      "Glitch",
      "Codec",
      "Kernel",
      "Flux",
      "Buffer",
      "Signal",
      "Static",
      "Overclock",
      "Baud",
      "Hex",
      "Binary",
      "Stack",
      "Daemon",
      "Root",
      "Proxy",
      "Byte",
      "Ping",
      "Modem",
      "Crypt",
      "Cache",
      "Reboot",
      "Sudo",
      "Grid",
      "Bit",
      "Bug",
      "Wired",
      "Splice",
      "Trojan",
      "Null",
      "Meltdown",
      "Hardwire",
      "Zeroday",
      "Uplink",
      "Feedback",
      "Surge",
      "Cortex",
      "Crash",
      "Deadlink",
      "Hotwire",
      "Blackhat",
      "Deadbolt",
      "Câble",
    ],
    rue: [
      "Blade",
      "Fist",
      "Claw",
      "Spike",
      "Edge",
      "Razor",
      "Hook",
      "Rust",
      "Saber",
      "Cutter",
      "Nail",
      "Slash",
      "Gash",
      "Basher",
      "Mauler",
      "Chain",
      "Cleaver",
      "Scar",
      "Shiv",
      "Knuckles",
      "Bruiser",
      "Slugger",
      "Grinder",
      "Buzzsaw",
      "Meathook",
      "Steeltoe",
      "Hardcase",
      "Bulldog",
      "Trigger",
      "Wrecker",
      "Crowbar",
      "Sledge",
      "Ripper",
      "Brawler",
      "Pipe",
      "Brick",
      "Boot",
      "Wrench",
      "Gutpunch",
      "Switch",
      "Lame",
      "Surin",
      "Nervi",
      "Molosse",
    ],
    nature: [
      "Wolf",
      "Raven",
      "Lynx",
      "Viper",
      "Tiger",
      "Fox",
      "Falcon",
      "Bear",
      "Snake",
      "Shark",
      "Coyote",
      "Panther",
      "Vulture",
      "Hyena",
      "Mamba",
      "Eagle",
      "Crow",
      "Badger",
      "Wolverine",
      "Jackal",
      "Cobra",
      "Hawk",
      "Grizzly",
      "Cheetah",
      "Jaguar",
      "Leopard",
      "Lioness",
      "Orca",
      "Puma",
      "Raptor",
      "Scorpion",
      "Bull",
      "Boar",
      "Owl",
      "Bison",
      "Gator",
      "Hornet",
      "Wildcat",
      "Mako",
      "Kestrel",
      "Adder",
      "Timber",
      "Loup",
      "Corbeau",
    ],
    ombre: [
      "Ghost",
      "Shadow",
      "Mist",
      "Spectre",
      "Void",
      "Smoke",
      "Veil",
      "Haze",
      "Mirage",
      "Echo",
      "Silence",
      "Whisper",
      "Dusk",
      "Ash",
      "Soot",
      "Shroud",
      "Vapor",
      "Halo",
      "Blur",
      "Stalker",
      "Prowler",
      "Wraith",
      "Phantom",
      "Fade",
      "Cipher",
      "Nomad",
      "Drift",
      "Slipstream",
      "Blackout",
      "Nightshade",
      "Creep",
      "Lurk",
      "Grim",
      "Hollow",
      "Dim",
      "Umbra",
      "Twilight",
      "Nightfall",
      "Deadair",
      "Ghostwire",
      "Ombre",
      "Fantôme",
    ],
    element: [
      "Thunder",
      "Ember",
      "Blaze",
      "Forge",
      "Steel",
      "Cobalt",
      "Mercury",
      "Sulfur",
      "Bolt",
      "Frost",
      "Hammer",
      "Anvil",
      "Tin",
      "Arsenic",
      "Titanium",
      "Lead",
      "Copper",
      "Zinc",
      "Nickel",
      "Tungsten",
      "Cast",
      "Magma",
      "Cinder",
      "Silicon",
      "Plasma",
      "Ozone",
      "Cyanide",
      "Napalm",
      "Kerosene",
      "Tar",
      "Spark",
      "Furnace",
      "Sodium",
      "Phosphor",
      "Uranium",
      "Rivet",
      "Nut",
      "Slag",
      "Alloy",
      "Flint",
      "Coal",
      "Braise",
      "Acier",
      "Foudre",
    ],
    abstrait: [
      "Zero",
      "Neon",
      "Toxic",
      "Thrill",
      "Quick",
      "Gray",
      "Chaos",
      "Decline",
      "Crash",
      "Vertigo",
      "Trance",
      "Ice",
      "Acid",
      "Volt",
      "Seven",
      "Dogma",
      "Feud",
      "Ruin",
      "Vice",
      "Dread",
      "Grim",
      "Fatal",
      "Zeal",
      "Spite",
      "Grudge",
      "Mute",
      "Reprieve",
      "Deadlock",
      "Riddle",
      "Verdict",
      "Litany",
      "Flaw",
      "Reject",
      "Nemesis",
      "Ricochet",
      "Cataclysm",
      "Anomaly",
      "Payback",
      "Fallout",
      "Static",
      "Hex",
      "Fiel",
      "Vertige",
      "Rancœur",
    ],
    surnom_complet: [
      "Deadeye",
      "Hatchet",
      "Knuckles",
      "Blackout",
      "Lockjaw",
      "Two-Guns",
      "Snake-Eyes",
      "Bonebreaker",
      "Ripcord",
      "Six-Shooter",
      "Longshot",
      "Deadbolt",
      "Switchblade",
      "Backdraft",
      "Ironjaw",
      "Coldsnap",
      "Gunsmoke",
      "Redline",
      "Payback",
      "Deadman",
      "Hangman",
      "Crossfire",
      "Warhead",
      "Deadlift",
      "Frostbite",
      "Cutthroat",
      "Roadkill",
      "Deadshot",
      "Gravedigger",
      "Blindside",
      "Wolfhound",
      "Steelhead",
      "Ironside",
      "Deadweight",
      "Nightcrawler",
      "Bloodhound",
      "Hardhead",
      "Trip-Wire",
      "Buckshot",
      "Sawtooth",
      "Grimjaw",
      "Ratchet",
      "Brise-Os",
      "Sans-Visage",
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

  /** Découpe un nom « Prénom "Surnom" Famille » en composantes réutilisables
      (carte, tracker). Règle Canon nom compact : alias si présent, sinon le
      dernier mot du nom civil — jamais tronquer un mononyme (`family === full`
      quand le nom n'a qu'un mot). */
  parseName(raw) {
    const full = String(raw ?? "");
    const m = full.match(/^(.*?)\s*[«"“]([^»"”]+)[»"”]\s*(.*)$/);
    if (m) {
      const alias = m[2].trim();
      const given = m[1].trim();
      const family = m[3].trim();
      const civil = `${given} ${family}`.replace(/\s+/g, " ").trim();
      return { alias, given, family, civil, full };
    }
    const parts = full.trim().split(/\s+/).filter(Boolean);
    const family = parts.length ? parts[parts.length - 1] : "";
    const given = parts.length > 1 ? parts.slice(0, -1).join(" ") : "";
    return { alias: "", given, family, civil: full, full };
  },

  /** Échappe &, <, > et " pour une insertion sûre dans du HTML (texte ou attribut). */
  escHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  },

  /** HTML → texte lisible : décode les entités et retire les balises via un
      DOMParser inerte (aucune exécution de script), en préservant les fins de
      bloc — sinon `<p>…</p><p>…</p>` collerait « …fin.Début… ». Neutre :
      partagé par l'import Foundry SR5/SR6 pour aplatir les descriptions HTML
      des items venus d'une vraie fiche. */
  htmlToText(html) {
    const str = String(html == null ? "" : html);
    if (!str) return "";
    if (!/[<&]/.test(str)) return str.trim();
    const withBreaks = str.replace(/<\/(p|div|li|h[1-6])>|<br\s*\/?>/gi, "\n");
    const doc = new DOMParser().parseFromString(withBreaks, "text/html");
    const text = (doc.body && doc.body.textContent) || "";
    return text.replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").replace(/\n{2,}/g, "\n").trim();
  },
};

/* ============================================================
   TOAST
   ============================================================ */
/** @param type "warning" | "danger" | "info" | null — pose une classe
    modificatrice sur les tokens sémantiques déjà déclarés (--warning/--danger/
    --info) ; omis = apparence neutre existante, rétrocompatible. */
export function toast(msg, type = null, duration = 2400) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.remove("toast-warning", "toast-danger", "toast-info");
  if (type) el.classList.add(`toast-${type}`);
  el.classList.add("show");
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove("show"), duration);
}

/** Variante de toast avec un bouton « Annuler » qui appelle onUndo() puis
    ferme le toast. Sert de filet de sécurité aux suppressions (Collection,
    générateur). Durée plus longue (6 s) pour laisser le temps de réagir.
    Le bouton est câblé en JS (pas de handler inline). */
export function toastUndo(msg, onUndo, duration = 6000) {
  const el = document.getElementById("toast");
  if (!el) return;
  clearTimeout(el._timer);
  el.innerHTML = "";
  el.classList.remove("toast-warning", "toast-danger", "toast-info"); // pas de type persistant d'un toast() précédent
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

// Pont couche 1 (voir PLANS/PLAN_MODULES_ES.md) : ces trois exports restent
// aussi accessibles en globals classiques (`Utils.x`, `toast(...)`), tant
// que les modules d'édition/widgets/contrôleurs n'ont pas eux-mêmes basculé
// en `import`. Retiré en fin de migration (Phase 6).
window.Utils = Utils;
window.toast = toast;
window.toastUndo = toastUndo;
