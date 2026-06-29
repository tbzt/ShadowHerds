"use strict";

/* ============================================================
   CONTENT — base de données d'aléas cohérents pour les PNJ
   Sources : SR5 (livre de base, Run & Gun, Chrome Flesh),
             SR6 (livre de base, Feu Nourri, Grimoire de sorts,
             Voies occultes, Corps à la carte).

   Chaque entrée porte :
     - nom  : libellé affiché
     - desc : description courte affichable en un clic
     - profMin : professionnalisme minimum requis (cohérence :
                 un PNJ faible n'a pas de contenu surpuissant)
     - pour : liste de tags d'archétype compatibles (filtre de
              cohérence). "tous" = universel.

   Tags d'archétype (alignés sur Flavor) :
     combat, corpo, police, crime, militaire, rue, ombre,
     magique, matrice, tech, gang, civil
   ============================================================ */

const Content = {
  /* ----------------------------------------------------------
     ARMES — communes SR5/SR6 (l'arsenal change peu de nom).
     Catégories : legere, lourde, melee, fusil, exotique.
     La VD est indicative (format SR6 simplifié).
  ---------------------------------------------------------- */
  armes: {
    legere: [
      {
        nom: "Ares Light Fire 75",
        desc: "Pistolet léger silencieux, discret. VD 2P. Favori des agents d'infiltration.",
        profMin: 1,
        pour: ["tous"],
      },
      {
        nom: "Fichetti Security 600",
        desc: "Pistolet léger fiable et bon marché. VD 2P. Très répandu dans les rues.",
        profMin: 0,
        pour: ["tous"],
      },
      {
        nom: "Colt America L36",
        desc: "Pistolet léger d'entrée de gamme. VD 2P. L'arme du débutant.",
        profMin: 0,
        pour: ["rue", "gang", "civil"],
      },
      {
        nom: "Beretta 201T",
        desc: "Pistolet léger avec mode rafale. VD 2P. Apprécié des coursiers.",
        profMin: 1,
        pour: ["ombre", "crime"],
      },
    ],
    lourde: [
      {
        nom: "Ares Predator VI",
        desc: "Pistolet lourd emblématique, smartgun intégré. VD 3P. La référence des runners.",
        profMin: 1,
        pour: ["combat", "ombre", "crime", "militaire", "police"],
      },
      {
        nom: "Remington Roomsweeper",
        desc: "Pistolet lourd à chevrotine, brutal à courte portée. VD 3P.",
        profMin: 2,
        pour: ["gang", "crime", "combat"],
      },
      {
        nom: "Ruger Super Warhawk",
        desc: "Revolver lourd dévastateur. VD 3P. Pour qui aime frapper fort.",
        profMin: 2,
        pour: ["combat", "militaire", "crime"],
      },
      {
        nom: "Colt Manhunter",
        desc: "Pistolet lourd robuste et précis. VD 3P. Standard de la sécurité.",
        profMin: 1,
        pour: ["corpo", "police", "militaire"],
      },
    ],
    fusil: [
      {
        nom: "AK-97",
        desc: "Fusil d'assaut robuste et omniprésent. VD 3P, rafale. L'arme de guerre du pauvre.",
        profMin: 2,
        pour: ["militaire", "gang", "combat", "crime"],
      },
      {
        nom: "Ares Alpha",
        desc: "Fusil d'assaut haut de gamme, lance-grenades intégré. VD 3P. Élite militaire.",
        profMin: 4,
        pour: ["militaire", "combat"],
      },
      {
        nom: "FN HAR",
        desc: "Fusil d'assaut équilibré et fiable. VD 3P, rafale. Standard des forces de sécurité.",
        profMin: 3,
        pour: ["militaire", "corpo", "police", "combat"],
      },
      {
        nom: "Ingram Smartgun X",
        desc: "Pistolet-mitrailleur silencieux smartlink. VD 2P, rafale longue. Roi de la discrétion létale.",
        profMin: 3,
        pour: ["ombre", "militaire", "crime"],
      },
      {
        nom: "Ranger Arms SM-5",
        desc: "Fusil de précision démontable. VD 4P. L'outil du sniper professionnel.",
        profMin: 5,
        pour: ["militaire", "ombre"],
      },
    ],
    melee: [
      {
        nom: "Couteau de combat",
        desc: "Lame courte et fiable. VD (FOR+1)P. Toujours utile en dernier recours.",
        profMin: 0,
        pour: ["tous"],
      },
      {
        nom: "Katana",
        desc: "Lame monomoléculaire élégante et mortelle. VD (FOR+3)P. Arme de samouraï urbain.",
        profMin: 2,
        pour: ["combat", "crime", "ombre", "militaire"],
      },
      {
        nom: "Matraque télescopique",
        desc: "Arme contondante non létale. VD (FOR+2)E. Outil du videur et du flic.",
        profMin: 0,
        pour: ["police", "corpo", "rue"],
      },
      {
        nom: "Lame rétractable",
        desc: "Cyber-implant tranchant dissimulé. VD (FOR+1)P. L'arme qu'on ne voit pas venir.",
        profMin: 3,
        pour: ["ombre", "crime", "combat"],
      },
      {
        nom: "Hache monofilament",
        desc: "Arme lourde à fil monomoléculaire. VD (FOR+4)P. Brutale et terrifiante.",
        profMin: 3,
        pour: ["gang", "combat"],
      },
    ],
    exotique: [
      {
        nom: "Fouet à choc",
        desc: "Arme exotique électrifiée. VD (FOR)E + choc. Spectaculaire et déroutante.",
        profMin: 3,
        pour: ["combat", "crime"],
      },
      {
        nom: "Shuriken",
        desc: "Étoiles de jet équilibrées. VD (FOR)P. Pour l'adepte ou l'assassin stylé.",
        profMin: 2,
        pour: ["magique", "ombre"],
      },
      {
        nom: "Arc à poulies",
        desc: "Arc moderne silencieux et puissant. VD (FOR+2)P. Létal et indétectable.",
        profMin: 3,
        pour: ["ombre", "militaire"],
      },
    ],
  },

  /* ----------------------------------------------------------
     POUVOIRS D'ADEPTE — SR5/SR6 (Voies occultes, Grimoire des
     ombres). Le coût en PP guide le profMin (pouvoir cher =
     adepte expérimenté).
  ---------------------------------------------------------- */
  pouvoirsAdepte: [
    {
      nom: "Réflexes améliorés",
      desc: "Augmente la Réaction et les dés d'initiative. Le pouvoir signature de l'adepte de combat.",
      profMin: 3,
      pour: ["magique"],
    },
    {
      nom: "Frappe mortelle",
      desc: "Décuple les dégâts à mains nues. L'adepte devient une arme.",
      profMin: 3,
      pour: ["magique"],
    },
    {
      nom: "Maîtrise du critique",
      desc: "Améliore la réussite des coups portés. Précision surhumaine.",
      profMin: 2,
      pour: ["magique"],
    },
    {
      nom: "Course sur les murs",
      desc: "Permet de courir sur les surfaces verticales quelques secondes. Mobilité acrobatique.",
      profMin: 2,
      pour: ["magique"],
    },
    {
      nom: "Grand saut",
      desc: "Multiplie la distance de saut. L'adepte bondit comme un félin.",
      profMin: 1,
      pour: ["magique"],
    },
    {
      nom: "Sens accru (ouïe)",
      desc: "Ouïe surhumaine permettant de percevoir l'imperceptible.",
      profMin: 1,
      pour: ["magique"],
    },
    {
      nom: "Carrure imposante",
      desc: "Renforce la Force pour les tests athlétiques. Puissance brute mystique.",
      profMin: 2,
      pour: ["magique"],
    },
    {
      nom: "Pare-balles",
      desc: "Le corps de l'adepte encaisse les impacts comme une armure vivante.",
      profMin: 4,
      pour: ["magique"],
    },
    {
      nom: "Visage caméléon",
      desc: "Modifie subtilement les traits pour se fondre dans une foule. Idéal pour l'infiltration.",
      profMin: 2,
      pour: ["magique"],
    },
    {
      nom: "Voix de velours",
      desc: "Charisme magnétique qui facilite la manipulation sociale.",
      profMin: 1,
      pour: ["magique"],
    },
    {
      nom: "Maîtrise corporelle",
      desc: "Contrôle total du corps : résistance à la douleur et aux toxines.",
      profMin: 4,
      pour: ["magique"],
    },
    {
      nom: "Doigts de fée",
      desc: "Dextérité surnaturelle pour le crochetage et la manipulation fine.",
      profMin: 2,
      pour: ["magique"],
    },
  ],

  /* ----------------------------------------------------------
     TRAITS / QUALITÉS — positifs et négatifs, pour la couleur.
     Universels sauf mention. profMin bas (ce sont des nuances).
  ---------------------------------------------------------- */
  traits: [
    {
      nom: "Réflexes de combat",
      desc: "Réagit vite au danger : bonus aux tests de surprise et d'initiative.",
      profMin: 2,
      pour: ["combat", "militaire", "police", "ombre"],
    },
    {
      nom: "Sang-froid",
      desc: "Garde son calme sous la pression. Résiste à l'intimidation et à la peur.",
      profMin: 1,
      pour: ["tous"],
    },
    {
      nom: "Réputation (rue)",
      desc: "Connu et respecté dans les Ombres. Ouvre des portes, en ferme d'autres.",
      profMin: 2,
      pour: ["crime", "ombre", "gang", "rue"],
    },
    {
      nom: "Contacts haut placés",
      desc: "Dispose de relations dans les corpos ou l'administration.",
      profMin: 3,
      pour: ["corpo", "crime", "police"],
    },
    {
      nom: "Vision dans le noir",
      desc: "Implant ou don : voit parfaitement dans l'obscurité totale.",
      profMin: 1,
      pour: ["combat", "militaire", "ombre"],
    },
    {
      nom: "Toxicomanie",
      desc: "Dépendant à une substance. Un levier de manipulation et une faiblesse.",
      profMin: 0,
      pour: ["rue", "gang", "crime"],
    },
    {
      nom: "Code d'honneur",
      desc: "Suit des règles personnelles strictes. Prévisible mais loyal.",
      profMin: 1,
      pour: ["militaire", "crime", "combat"],
    },
    {
      nom: "Paranoïa",
      desc: "Méfiant à l'extrême, ne baisse jamais sa garde. Survit là où d'autres tombent.",
      profMin: 1,
      pour: ["ombre", "crime"],
    },
    {
      nom: "Ambidextrie",
      desc: "Manie ses deux mains avec la même aisance. Mortel au pistolet double.",
      profMin: 2,
      pour: ["combat", "ombre"],
    },
    {
      nom: "Mémoire eidétique",
      desc: "Se souvient de tout avec précision. Précieux pour un planificateur.",
      profMin: 2,
      pour: ["matrice", "corpo", "magique"],
    },
    {
      nom: "Bon goût",
      desc: "Élégance naturelle qui impressionne dans les hautes sphères.",
      profMin: 1,
      pour: ["corpo", "crime"],
    },
    {
      nom: "Allergie (pollens)",
      desc: "Réaction allergique gênante. Un détail qui humanise et qui peut trahir.",
      profMin: 0,
      pour: ["civil", "rue"],
    },
  ],

  /* ----------------------------------------------------------
     API — sélection cohérente
  ---------------------------------------------------------- */

  /** true si l'item est compatible avec au moins un tag du PNJ */
  _match(item, tags) {
    if (item.pour.includes("tous")) return true;
    return item.pour.some((p) => tags.has(p));
  },

  /** Filtre une liste par profMin + compatibilité d'archétype */
  _eligible(list, prof, tags) {
    return list.filter((it) => prof >= it.profMin && this._match(it, tags));
  },

  /**
   * Choisit une arme cohérente selon les tags et le prof.
   * Privilégie une catégorie selon l'archétype.
   */
  pickArme(tags, prof) {
    // Catégories pertinentes selon l'archétype
    let cats;
    if (tags.has("militaire") || tags.has("combat"))
      cats = ["fusil", "lourde", "melee"];
    else if (tags.has("gang")) cats = ["lourde", "fusil", "melee"];
    else if (tags.has("ombre") || tags.has("crime"))
      cats = ["lourde", "legere", "melee", "exotique"];
    else if (tags.has("police") || tags.has("corpo"))
      cats = ["lourde", "fusil", "melee"];
    else if (tags.has("magique")) cats = ["legere", "melee", "exotique"];
    else cats = ["legere", "melee"];

    // Concatène les armes éligibles des catégories retenues
    let pool = [];
    for (const c of cats) {
      pool = pool.concat(this._eligible(this.armes[c] || [], prof, tags));
    }
    if (!pool.length) pool = this._eligible(this.armes.legere, prof, tags);
    if (!pool.length) return null;
    return Utils.rand(pool);
  },

  /** Choisit jusqu'à n pouvoirs d'adepte cohérents */
  pickPouvoirs(prof, n = 2) {
    const pool = this.pouvoirsAdepte.filter((p) => prof >= p.profMin);
    return this._sample(pool, Math.min(n, pool.length));
  },

  /** Choisit jusqu'à n traits cohérents avec l'archétype */
  pickTraits(tags, prof, n = 1) {
    const pool = this._eligible(this.traits, prof, tags);
    return this._sample(pool, Math.min(n, pool.length));
  },

  /** Tirage sans remise de n éléments (dédupliqué par nom) */
  _sample(pool, n) {
    const copy = [...pool];
    const out = [];
    const seen = new Set();
    let guard = 0;
    while (out.length < n && copy.length && guard < 200) {
      guard++;
      const idx = Utils.randInt(0, copy.length - 1);
      const item = copy.splice(idx, 1)[0];
      if (item && !seen.has(item.nom)) {
        seen.add(item.nom);
        out.push(item);
      }
    }
    return out;
  },

  /* ----------------------------------------------------------
     SORTS — communs aux deux éditions (le panthéon de sorts
     SR5/SR6 se recoupe largement). Le Drain pilote le profMin :
       drain ≤3 → prof 1+ · 4-5 → prof 2+ · 6-7 → prof 3+ · 8+ → prof 4+
     Sources : Grimoire de sorts SR6, Grimoire des ombres SR5.
  ---------------------------------------------------------- */
  sorts: [
    // — COMBAT —
    {
      nom: "Trait étourdissant",
      desc: "Petit choc mental qui sonne la cible. Sort de base, faible Drain.",
      drain: 2,
      profMin: 0,
      cat: "combat",
    },
    {
      nom: "Manaboule",
      desc: "Énergie mana qui frappe une zone. Direct, ignore l'armure. Drain modéré.",
      drain: 5,
      profMin: 2,
      cat: "combat",
    },
    {
      nom: "Éclair mana",
      desc: "Trait de mana pur sur une cible. Dommages directs.",
      drain: 4,
      profMin: 2,
      cat: "combat",
    },
    {
      nom: "Boule de feu",
      desc: "Explosion de feu en zone, impose l'état Enflammé. Spectaculaire et dangereux.",
      drain: 6,
      profMin: 3,
      cat: "combat",
    },
    {
      nom: "Trait de feu",
      desc: "Jet de feu sur une cible unique, impose Enflammé.",
      drain: 5,
      profMin: 2,
      cat: "combat",
    },
    {
      nom: "Éclair",
      desc: "Décharge électrique, impose l'état Électrocuté.",
      drain: 5,
      profMin: 2,
      cat: "combat",
    },
    {
      nom: "Explosion infernale",
      desc: "Feu massif en zone, peut imposer Corrodé. Sort dévastateur de haut niveau.",
      drain: 8,
      profMin: 4,
      cat: "combat",
    },
    {
      nom: "Éclair étourdissant",
      desc: "Mana qui assomme sans tuer. Idéal pour neutraliser proprement.",
      drain: 3,
      profMin: 1,
      cat: "combat",
    },
    {
      nom: "Toucher mortel",
      desc: "Magie létale infligée au contact. Discret et mortel.",
      drain: 3,
      profMin: 1,
      cat: "combat",
    },
    {
      nom: "Lance de glace",
      desc: "Froid élémentaire, impose Frigorifié.",
      drain: 5,
      profMin: 2,
      cat: "combat",
    },
    // — SANTÉ —
    {
      nom: "Soins",
      desc: "Referme les blessures et récupère des cases de dommages.",
      drain: 3,
      profMin: 1,
      cat: "sante",
    },
    {
      nom: "Augmentation de réflexes",
      desc: "Accélère un sujet : plus de Réaction et d'initiative.",
      drain: 5,
      profMin: 2,
      cat: "sante",
    },
    {
      nom: "Augmentation d'attribut",
      desc: "Renforce temporairement un attribut de la cible.",
      drain: 3,
      profMin: 2,
      cat: "sante",
    },
    {
      nom: "Stabilisation",
      desc: "Stoppe l'hémorragie d'un mourant. Sort de survie.",
      drain: 2,
      profMin: 1,
      cat: "sante",
    },
    {
      nom: "Antidote",
      desc: "Purge les toxines du corps de la cible.",
      drain: 5,
      profMin: 2,
      cat: "sante",
    },
    // — DÉTECTION —
    {
      nom: "Lumière magique",
      desc: "Crée une lueur ou éteint les lumières alentour. Cantrip utilitaire.",
      drain: 2,
      profMin: 0,
      cat: "detection",
    },
    {
      nom: "Détection de la vie",
      desc: "Repère les êtres conscients cachés à proximité.",
      drain: 3,
      profMin: 1,
      cat: "detection",
    },
    {
      nom: "Clairvoyance",
      desc: "Voit à distance, à travers les obstacles.",
      drain: 3,
      profMin: 1,
      cat: "detection",
    },
    {
      nom: "Sonde mentale",
      desc: "Lit les pensées et souvenirs d'une cible. Intrusif.",
      drain: 5,
      profMin: 3,
      cat: "detection",
    },
    {
      nom: "Analyse de la véracité",
      desc: "Détecte si la cible ment. Utile en négociation.",
      drain: 3,
      profMin: 1,
      cat: "detection",
    },
    // — ILLUSION —
    {
      nom: "Invisibilité",
      desc: "Rend la cible invisible aux regards.",
      drain: 3,
      profMin: 2,
      cat: "illusion",
    },
    {
      nom: "Masque physique",
      desc: "Change l'apparence, la voix, l'odeur. Idéal pour usurper une identité.",
      drain: 4,
      profMin: 2,
      cat: "illusion",
    },
    {
      nom: "Confusion",
      desc: "Désoriente la cible d'un déferlement sensoriel.",
      drain: 3,
      profMin: 1,
      cat: "illusion",
    },
    {
      nom: "Silence",
      desc: "Étouffe tout son dans une zone. Parfait pour l'infiltration.",
      drain: 3,
      profMin: 1,
      cat: "illusion",
    },
    // — MANIPULATION —
    {
      nom: "Armure",
      desc: "Renforce mystiquement la défense de la cible.",
      drain: 4,
      profMin: 2,
      cat: "manipulation",
    },
    {
      nom: "Lévitation",
      desc: "Fait flotter un sujet ou un objet dans les airs.",
      drain: 6,
      profMin: 3,
      cat: "manipulation",
    },
    {
      nom: "Contrôle des pensées",
      desc: "Impose sa volonté dans l'esprit d'une cible. Très puissant.",
      drain: 4,
      profMin: 4,
      cat: "manipulation",
    },
    {
      nom: "Barrière physique",
      desc: "Érige un mur de force solide. Bloque ou protège.",
      drain: 6,
      profMin: 3,
      cat: "manipulation",
    },
    {
      nom: "Foudre télékinétique",
      desc: "Projette des objets comme des projectiles mortels.",
      drain: 5,
      profMin: 3,
      cat: "manipulation",
    },
  ],

  /**
   * Choisit des sorts cohérents pour un éveillé.
   * Le nombre dépend du prof ; la sélection respecte le profMin.
   * Un combattant magique privilégie les sorts de combat.
   */
  pickSorts(prof, tags) {
    const eligible = this.sorts.filter((s) => prof >= s.profMin);
    if (!eligible.length) return [];
    // Nombre de sorts : 2 à ~5 selon le prof
    const n = Utils.clamp(2 + Math.floor(prof / 2), 2, 6);
    // Pondération : un combattant prend surtout du combat
    const combat = eligible.filter((s) => s.cat === "combat");
    const autres = eligible.filter((s) => s.cat !== "combat");
    let pool = eligible;
    if (
      (tags.has("combat") || tags.has("militaire") || tags.has("gang")) &&
      combat.length
    ) {
      // 60% combat, 40% autres — on biaise le pool
      pool = combat.concat(combat, autres);
    }
    return this._sample(pool, Math.min(n, eligible.length));
  },
};
