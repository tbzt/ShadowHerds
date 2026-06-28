"use strict";

/* ============================================================
   FLAVOR — couche d'habillage cohérente des PNJ
   S'applique APRÈS génération, sur les 3 éditions.
   Objectif : chaque PNJ semble unique sans jamais être incohérent.

   Tout est filtré par contexte (niveau, profession, faction) :
   un samouraï corpo n'a ni le style, ni l'âge, ni les manies
   d'un ganger des Barrens. On tire dans des pools pondérés par
   des « tags » de profession plutôt que dans une grande table à plat.

   Le moteur range les détails dans pnj.flavor = { age, signe,
   manie, motivation, style }. L'affichage les lit depuis là.
   ============================================================ */

const Flavor = {
  /* ----------------------------------------------------------
     CLASSIFICATION : on dérive des « tags » depuis la profession.
     Ces tags pilotent ensuite la sélection des détails.
  ---------------------------------------------------------- */
  _tagRules: [
    {
      tag: "gang",
      match: [
        "Ganger",
        "Go-ganger",
        "Gang",
        "Halloweeners",
        "Ancients",
        "Ork Rights",
      ],
    },
    {
      tag: "corpo",
      match: [
        "corpo",
        "Renraku",
        "Ares",
        "Aztechnology",
        "Séraphin",
        "Samouraï rouge",
        "Espion industriel",
        "VIP",
        "Corporations",
      ],
    },
    {
      tag: "police",
      match: [
        "Flic",
        "Knight Errant",
        "Lone Star",
        "SWAT",
        "Détective",
        "anti-magie",
        "Maintien",
      ],
    },
    {
      tag: "crime",
      match: [
        "Mafia",
        "Yakuza",
        "Triade",
        "Vory",
        "Koshari",
        "Capo",
        "Enforcer",
        "Wakagashira",
        "Soldat Mafia",
      ],
    },
    {
      tag: "militaire",
      match: [
        "Soldat",
        "Commando",
        "Mercenaire",
        "Forces spéciales",
        "Pilote militaire",
        "Rigger militaire",
        "renseignement",
      ],
    },
    {
      tag: "rue",
      match: ["Voyou", "Décérébré", "Sans-abri", "Dealer", "Foule", "Barrens"],
    },
    {
      tag: "ombre",
      match: [
        "Assassin",
        "Cambrioleur",
        "Contrebandier",
        "Passeur",
        "Faussaire",
        "Trafiquant",
        "Pilote de location",
      ],
    },
    {
      tag: "magique",
      match: ["Mage", "Chaman", "Adepte", "Initié", "éveillé", "Magogang"],
    },
    {
      tag: "matrice",
      match: [
        "Decker",
        "Technomancien",
        "Technicien matriciel",
        "contre-mesures",
        "Hacker",
      ],
    },
    { tag: "tech", match: ["Rigger", "Technicien", "Chimiste", "Mécanique"] },
    {
      tag: "civil",
      match: ["Civil", "Travailleur", "docker", "usine", "ordinaire"],
    },
  ],

  tagsFor(pnj) {
    const prof = pnj.profession || "";
    const spec = pnj.special || "";
    const hay = `${prof} ${spec}`;
    const tags = new Set();
    for (const rule of this._tagRules) {
      if (rule.match.some((m) => hay.includes(m))) tags.add(rule.tag);
    }
    if (tags.size === 0) tags.add("rue");
    return tags;
  },

  /* ----------------------------------------------------------
     ÂGE — plausible selon le niveau d'expérience.
     Niveau bas = souvent jeune ; niveau élevé = vétéran.
     On ramène prof (0-6 SR5/Anarchy) ou rang (Anarchy) sur 0-1.
  ---------------------------------------------------------- */
  _ageFor(pnj) {
    let lvl = 0.4;
    if (typeof pnj.prof === "number") lvl = Utils.clamp(pnj.prof / 6, 0, 1);
    else if (pnj.rang) {
      const map = {
        Figurant: 0.2,
        "Figurant d'élite": 0.5,
        Lieutenant: 0.7,
        Boss: 0.9,
      };
      lvl = map[pnj.rang] ?? 0.4;
    }
    // Base 19 ans + jusqu'à ~28 ans selon expérience, ± bruit
    const base = 19 + Math.round(lvl * 26);
    const age = base + Utils.randInt(-3, 5);
    // Elfes et certaines métavariantes vivent plus vieux : on ne plafonne pas
    return Utils.clamp(age, 16, 71);
  },

  /* ----------------------------------------------------------
     POOLS DE DÉTAILS — indexés par tag.
     'any' = fond commun toujours disponible.
  ---------------------------------------------------------- */
  _signes: {
    any: [
      "cicatrice à la lèvre",
      "regard fuyant",
      "voix éraillée",
      "mâchoire serrée",
      "tatouage discret au cou",
      "doigts jaunis",
      "démarche assurée",
      "rire nerveux",
    ],
    gang: [
      "tatouages de gang aux phalanges",
      "couleurs du gang sur la veste",
      "cicatrice rituelle",
      "crête colorée",
      "piercings multiples",
      "dents en métal",
    ],
    corpo: [
      "costume impeccable",
      "badge corpo agrafé",
      "montre hors de prix",
      "coupe nette réglementaire",
      "lentilles teintées de marque",
      "posture droite",
    ],
    police: [
      "coupe réglementaire",
      "regard qui scanne la pièce",
      "main jamais loin du holster",
      "insigne visible",
      "carrure imposante",
    ],
    crime: [
      "bague chevalière voyante",
      "complet sombre",
      "cure-dent permanent",
      "regard de tueur calme",
      "tatouage d'allégeance caché",
    ],
    militaire: [
      "posture militaire",
      "cicatrices de combat",
      "tatouage d'unité",
      "regard mille mètres",
      "rangers cirées",
    ],
    rue: [
      "vêtements râpés",
      "regard méfiant",
      "ongles sales",
      "manteau trop grand",
      "odeur de synthé bon marché",
    ],
    ombre: [
      "visage qu'on oublie aussitôt",
      "gants en toute saison",
      "capuche relevée",
      "silhouette passe-partout",
      "voix neutre",
    ],
    magique: [
      "fétiches autour du cou",
      "yeux qui semblent voir ailleurs",
      "symboles tracés sur la peau",
      "calme déroutant",
      "murmures inaudibles",
    ],
    matrice: [
      "datajack visible à la tempe",
      "yeux cybernétiques scintillants",
      "tics nerveux des doigts",
      "teint blafard d'insomniaque",
      "lunettes AR jamais retirées",
    ],
    tech: [
      "taches de cambouis",
      "outils accrochés à la ceinture",
      "lunettes-loupe relevées",
      "doigts couverts de pansements",
    ],
    civil: [
      "allure quelconque",
      "vêtements de travail usés",
      "air fatigué",
      "alliance au doigt",
    ],
  },

  _manies: {
    any: [
      "tapote du pied quand il attend",
      "répète la dernière phrase de son interlocuteur",
      "ne quitte jamais une pièce sans repérer les sorties",
      "compte sa monnaie deux fois",
      "siffle entre ses dents",
    ],
    gang: [
      "crache par terre pour marquer son mépris",
      "joue avec un cran d'arrêt",
      "parle en argot de gang",
      "défie du regard par réflexe",
    ],
    corpo: [
      "consulte son commlink toutes les deux minutes",
      "corrige la moindre faute de langage",
      "refuse les poignées de main",
      "parle en jargon corporate",
    ],
    police: [
      "mémorise les visages",
      "annonce ses intentions comme un rapport",
      "garde une distance tactique",
      "tutoie pour intimider",
    ],
    crime: [
      "ne tourne jamais le dos à la porte",
      "offre toujours à boire d'abord",
      "parle à voix basse",
      "teste la loyauté par de petites faveurs",
    ],
    militaire: [
      "vérifie son arme par réflexe",
      "parle en termes de mission",
      "se lève à heure fixe",
      "évalue chaque pièce comme un terrain",
    ],
    rue: [
      "mendie un clope à tout le monde",
      "garde la tête basse",
      "planque sa nourriture",
      "sursaute au moindre bruit",
    ],
    ombre: [
      "efface ses traces machinalement",
      "change d'itinéraire sans raison",
      "ne donne jamais son vrai nom",
      "paie toujours en liquide intraçable",
    ],
    magique: [
      "touche ses fétiches avant d'agir",
      "lit l'aura des gens sans le dire",
      "évite le fer quand il peut",
      "marmonne des formules",
    ],
    matrice: [
      "décrit le monde réel en termes de données",
      "tape dans le vide comme sur un clavier",
      "méfiant de toute caméra",
      "parle trop vite",
    ],
    tech: [
      "démonte un objet pour comprendre",
      "garde toujours un tournevis",
      "nomme ses drones et véhicules",
      "graisse ses outils en réfléchissant",
    ],
    civil: [
      "évite les ennuis à tout prix",
      "parle de sa famille",
      "compte les heures avant la fin du service",
    ],
  },

  _motivations: {
    any: [
      "payer ses dettes",
      "survivre une nuit de plus",
      "se faire un nom",
      "protéger les siens",
      "oublier un passé qui colle à la peau",
    ],
    gang: [
      "défendre le territoire",
      "venger un frère tombé",
      "monter dans la hiérarchie du gang",
      "prouver sa valeur",
    ],
    corpo: [
      "décrocher une promotion",
      "ne pas finir comme variable d'ajustement",
      "rembourser son contrat",
      "plaire au supérieur direct",
    ],
    police: [
      "nettoyer son secteur",
      "boucler son service sans bavure",
      "arrondir ses fins de mois",
      "coffrer une cible précise",
    ],
    crime: [
      "honorer la famille",
      "étendre le racket",
      "effacer un témoin gênant",
      "rembourser un parrain",
    ],
    militaire: [
      "accomplir la mission",
      "ramener son équipe vivante",
      "toucher sa prime",
      "fuir un passé de soldat",
    ],
    rue: [
      "trouver un repas chaud",
      "un toit pour la nuit",
      "une dose",
      "ne pas se faire remarquer",
    ],
    ombre: [
      "le prochain gros coup",
      "disparaître pour de bon",
      "régler une vieille dette",
      "rester intraçable",
    ],
    magique: [
      "percer un mystère astral",
      "honorer son mentor/totem",
      "maîtriser un pouvoir qui le dépasse",
      "protéger un lieu sacré",
    ],
    matrice: [
      "la donnée parfaite",
      "humilier une corpo",
      "effacer son propre dossier",
      "le frisson de l'intrusion",
    ],
    tech: [
      "construire la machine parfaite",
      "récupérer des pièces rares",
      "prouver son génie",
      "un atelier à soi",
    ],
    civil: [
      "nourrir sa famille",
      "garder son emploi",
      "une vie tranquille",
      "éviter les runners",
    ],
  },

  _styles: {
    any: ["pragmatique", "discret", "tape-à-l'œil", "minimaliste"],
    gang: [
      "streetwear couvert de patchs",
      "cuir clouté",
      "couleurs criardes du gang",
      "look post-apo des Barrens",
    ],
    corpo: [
      "costume taillé sur mesure",
      "tailleur sobre et cher",
      "tenue business augmentée AR",
      "élégance froide",
    ],
    police: [
      "uniforme réglementaire",
      "armure de patrouille",
      "civil mais reconnaissable",
      "trench de détective",
    ],
    crime: [
      "complet sombre soigné",
      "bijoux ostentatoires",
      "élégance menaçante",
      "sobre mais coûteux",
    ],
    militaire: [
      "treillis et armure modulaire",
      "surplus militaire",
      "tenue tactique noire",
      "camouflage urbain",
    ],
    rue: [
      "fripes superposées",
      "vêtements de récup",
      "manteau rapiécé",
      "look crasseux fonctionnel",
    ],
    ombre: [
      "tenue passe-partout sombre",
      "vêtements sans marque ni signe",
      "gris urbain",
      "noir technique discret",
    ],
    magique: [
      "robes et fétiches",
      "look mystique discret",
      "vêtements ornés de symboles",
      "sobriété chargée de sens",
    ],
    matrice: [
      "sweat à capuche et lunettes AR",
      "look hacker négligé",
      "tenue confortable bardée de tech",
      "néo-cyberpunk",
    ],
    tech: [
      "combinaison de mécano",
      "veste à mille poches",
      "tablier renforcé",
      "tenue pratique tachée d'huile",
    ],
    civil: [
      "vêtements de tous les jours",
      "tenue de travail",
      "look ordinaire et passe-inaperçu",
    ],
  },

  _pick(pool, tags) {
    // Concatène les pools des tags présents + le fond commun, puis tire
    let bag = [...(pool.any || [])];
    for (const t of tags) if (pool[t]) bag = bag.concat(pool[t]);
    return Utils.rand(bag);
  },

  /* ----------------------------------------------------------
     APPLICATION — enrichit le PNJ. Idempotent : si pnj.flavor
     existe déjà (édition manuelle), on ne l'écrase pas.
  ---------------------------------------------------------- */
  apply(pnj) {
    if (!pnj || pnj.flavor) return pnj;
    const tags = this.tagsFor(pnj);
    pnj.flavor = {
      age: this._ageFor(pnj),
      signe: this._pick(this._signes, tags),
      manie: this._pick(this._manies, tags),
      motivation: this._pick(this._motivations, tags),
      style: this._pick(this._styles, tags),
    };
    return pnj;
  },

  /** Re-tirage manuel d'un champ (pour un bouton « relancer » futur) */
  reroll(pnj, field) {
    const tags = this.tagsFor(pnj);
    const map = {
      signe: this._signes,
      manie: this._manies,
      motivation: this._motivations,
      style: this._styles,
    };
    if (field === "age") pnj.flavor.age = this._ageFor(pnj);
    else if (map[field]) pnj.flavor[field] = this._pick(map[field], tags);
    return pnj;
  },
};
