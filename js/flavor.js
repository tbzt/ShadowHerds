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

  /* Mots-clés supplémentaires propres aux rôles de contacts,
     mappés sur les tags existants. Complète _tagRules sans le réécrire. */
  _contactRoleTags: {
    corpo: ["Cadre", "Johnson", "corpo"],
    crime: [
      "Consiglieri",
      "Receleur",
      "Fixer",
      "Intermédiaire",
      "identités",
      "Mafia",
    ],
    police: ["sécurité véreux", "Enquêteur", "Avocat", "Flic"],
    militaire: ["DocWagon", "combat"],
    rue: [
      "Barman",
      "bar",
      "Pharmacien",
      "Aumônier",
      "Prêtre",
      "Doc des rues",
      "gang",
    ],
    ombre: ["Contrebandier", "Passeur", "retraite", "Armurier"],
    magique: ["Mage", "Chaman", "talismans", "NAN", "Amérindiennes"],
    matrice: ["Decker", "Hacker", "numérique", "Paradis"],
    tech: [
      "Mécanicien",
      "Chirurgien",
      "cyberware",
      "Médecin",
      "Professeur",
      "Rigger",
    ],
    civil: ["Journaliste"],
  },

  tagsFor(pnj) {
    const prof = pnj.profession || "";
    const spec = pnj.special || "";
    const role = pnj.role || "";
    const hay = `${prof} ${spec} ${role}`;
    const tags = new Set();
    for (const rule of this._tagRules) {
      if (rule.match.some((m) => hay.includes(m))) tags.add(rule.tag);
    }
    // Compléter avec les mots-clés de rôles de contacts
    for (const [tag, kws] of Object.entries(this._contactRoleTags)) {
      if (kws.some((k) => hay.includes(k))) tags.add(tag);
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
      "parfum trop fort pour masquer autre chose",
      "vieille brûlure sur la main gauche",
      "regard qui s'attarde une seconde de trop",
      "sourire asymétrique",
      "tic à la paupière",
      "ongles impeccablement entretenus",
      "accent difficile à situer",
      "mains calleuses malgré une tenue élégante",
      "yeux rougis par le manque de sommeil",
      "air constamment sur ses gardes",
    ],
    gang: [
      "tatouages de gang aux phalanges",
      "couleurs du gang sur la veste",
      "cicatrice rituelle",
      "crête colorée",
      "piercings multiples",
      "dents en métal",
      "graffitis personnels sur son équipement",
      "couleurs du gang discrètement dissimulées",
      "vieilles fractures mal ressoudées",
      "implant bon marché visible",
      "odeur de BTL ou de cram",
      "mains couvertes de cicatrices de bagarre",
    ],
    corpo: [
      "costume impeccable",
      "badge corpo agrafé",
      "montre hors de prix",
      "coupe nette réglementaire",
      "lentilles teintées de marque",
      "posture droite",
      "sourire professionnel parfaitement calibré",
      "implant de communication discret à l'oreille",
      "manucure impeccable",
      "odeur d'un parfum de luxe",
      "vêtements toujours légèrement trop neufs",
      "air perpétuellement pressé",
    ],
    police: [
      "coupe réglementaire",
      "regard qui scanne la pièce",
      "main jamais loin du holster",
      "insigne visible",
      "carrure imposante",
      "vieille blessure qui gêne certains mouvements",
      "yeux qui ne cessent de balayer les angles morts",
      "uniforme légèrement usé mais entretenu",
      "mâchoire serrée en permanence",
      "odeur de café et de fatigue",
    ],
    crime: [
      "bague chevalière voyante",
      "complet sombre",
      "cure-dent permanent",
      "regard de tueur calme",
      "tatouage d'allégeance caché",
      "costume qui cache mal un gilet pare-balles",
      "bijoux chargés de symboles familiaux",
      "sourire qui n'atteint jamais les yeux",
      "mains impeccablement manucurées",
      "cicatrice ancienne soigneusement dissimulée",
    ],
    militaire: [
      "posture militaire",
      "cicatrices de combat",
      "tatouage d'unité",
      "regard mille mètres",
      "rangers cirées",
      "cheveux coupés par habitude plutôt que par règlement",
      "vieilles prothèses militaires",
      "regard qui mesure systématiquement les distances",
      "corps couvert de cicatrices anciennes",
      "matériel entretenu avec obsession",
    ],
    rue: [
      "vêtements râpés",
      "regard méfiant",
      "ongles sales",
      "manteau trop grand",
      "odeur de synthé bon marché",
      "vêtements adaptés à plusieurs saisons à la fois",
      "odeur de pluie, de fumée et de plastique",
      "regard constamment attiré par la nourriture",
      "visage marqué par les nuits dehors",
      "matériel récupéré et rafistolé",
    ],
    ombre: [
      "visage qu'on oublie aussitôt",
      "gants en toute saison",
      "capuche relevée",
      "silhouette passe-partout",
      "voix neutre",
      "aucun détail ne semble mémorable",
      "vêtements qui changent selon le quartier",
      "yeux toujours cachés derrière quelque chose",
      "gestes économes et précis",
      "matériel porté de façon parfaitement fonctionnelle",
    ],
    magique: [
      "fétiches autour du cou",
      "yeux qui semblent voir ailleurs",
      "symboles tracés sur la peau",
      "calme déroutant",
      "murmures inaudibles",
      "regard distrait comme à l'écoute de quelque chose",
      "odeur d'encens ou d'herbes",
      "bijoux chargés de symboles personnels",
      "présence étrangement apaisante ou inquiétante",
      "petits objets rituels cousus dans les vêtements",
    ],
    matrice: [
      "datajack visible à la tempe",
      "yeux cybernétiques scintillants",
      "tics nerveux des doigts",
      "teint blafard d'insomniaque",
      "lunettes AR jamais retirées",
      "cernes profondes éclairées par des interfaces AR",
      "mouvements oculaires suivant des fenêtres invisibles",
      "vêtements équipés de multiples ports et câbles",
      "brûlures de contact près des implants",
      "gestes qui semblent manipuler des objets inexistants",
    ],
    tech: [
      "taches de cambouis",
      "outils accrochés à la ceinture",
      "lunettes-loupe relevées",
      "doigts couverts de pansements",
      "odeur d'huile, d'ozone ou de soudure",
      "vêtements brûlés par endroits",
      "poches remplies de pièces détachées",
      "implants réparés plusieurs fois",
      "mains noircies malgré les lavages",
    ],
    civil: [
      "allure quelconque",
      "vêtements de travail usés",
      "air fatigué",
      "alliance au doigt",
      "badge professionnel usé",
      "vêtements choisis pour durer",
      "air préoccupé par autre chose",
      "petites économies visibles dans chaque détail",
      "commlink ancien soigneusement entretenu",
    ],
  },

  _manies: {
    any: [
      "tapote du pied quand il attend",
      "répète la dernière phrase de son interlocuteur",
      "ne quitte jamais une pièce sans repérer les sorties",
      "compte sa monnaie deux fois",
      "siffle entre ses dents",
      "évite systématiquement le contact visuel",
      "termine les verres abandonnés",
      "observe les mains avant les visages",
      "s'interrompt au milieu de ses phrases",
      "hausse les épaules avant de mentir",
      "parle aux objets comme s'ils répondaient",
      "compte mentalement les personnes présentes",
      "demande toujours l'heure alors qu'il possède un commlink",
    ],
    gang: [
      "crache par terre pour marquer son mépris",
      "joue avec un cran d'arrêt",
      "parle en argot de gang",
      "défie du regard par réflexe",
      "évalue immédiatement l'appartenance de chacun",
      "cherche toujours à savoir d'où viennent les gens",
      "teste les inconnus avec des insultes amicales",
      "marque son territoire sans y penser",
      "ne supporte pas qu'on touche à sa veste",
    ],
    corpo: [
      "consulte son commlink toutes les deux minutes",
      "corrige la moindre faute de langage",
      "refuse les poignées de main",
      "parle en jargon corporatiste",
      "transforme toute conversation en réunion",
      "prend des notes même lorsqu'il n'y a rien à noter",
      "utilise des acronymes incompréhensibles",
      "s'excuse avant de formuler une menace",
      "parle de lui à travers sa corporation",
    ],
    police: [
      "mémorise les visages",
      "annonce ses intentions comme un rapport",
      "garde une distance tactique",
      "tutoie pour intimider",
      "pose des questions comme lors d'un interrogatoire",
      "retient automatiquement les plaques et les visages",
      "se place toujours dos au mur",
      "observe les mains avant les paroles",
    ],
    crime: [
      "ne tourne jamais le dos à la porte",
      "offre toujours à boire d'abord",
      "parle à voix basse",
      "teste la loyauté par de petites faveurs",
      "laisse de longs silences avant de répondre",
      "fait répéter les promesses",
      "appelle tout le monde par un diminutif",
      "offre de petits cadeaux lourds de sens",
    ],
    militaire: [
      "vérifie son arme par réflexe",
      "parle en termes de mission",
      "se lève à heure fixe",
      "évalue chaque pièce comme un terrain",
      "compte inconsciemment les sorties",
      "observe les lignes de tir potentielles",
      "mange rapidement, même au calme",
      "emploie un vocabulaire tactique",
    ],
    rue: [
      "mendie un clope à tout le monde",
      "garde la tête basse",
      "planque sa nourriture",
      "sursaute au moindre bruit",
      "ramasse tout ce qui pourrait servir",
      "surveille les poubelles intéressantes",
      "cache ses biens sans s'en rendre compte",
      "remercie excessivement pour les petits gestes",
    ],
    ombre: [
      "efface ses traces machinalement",
      "change d'itinéraire sans raison",
      "ne donne jamais son vrai nom",
      "paie toujours en liquide intraçable",
      "s'assied toujours face aux sorties",
      "retient les noms sans jamais donner le sien",
      "observe les caméras avant les personnes",
      "laisse les autres parler en premier",
    ],
    magique: [
      "touche ses fétiches avant d'agir",
      "lit l'aura des gens sans le dire",
      "évite le fer quand il peut",
      "marmonne des formules",
      "observe le vide pendant quelques secondes",
      "évite certains lieux sans explication",
      "parle de coïncidences comme de certitudes",
      "remercie des esprits invisibles",
    ],
    matrice: [
      "décrit le monde réel en termes de données",
      "tape dans le vide comme sur un clavier",
      "méfiant de toute caméra",
      "parle trop vite",
      "cherche un réseau avant une sortie de secours",
      "compare les gens à des logiciels",
      "reste silencieux pendant des conversations AR",
      "perd le fil du monde réel",
    ],
    tech: [
      "démonte un objet pour comprendre",
      "garde toujours un tournevis",
      "nomme ses drones et véhicules",
      "graisse ses outils en réfléchissant",
      "diagnostique tout ce qu'il voit",
      "écoute les machines avant les gens",
      "parle à ses outils",
      "récupère des pièces sans valeur apparente",
    ],
    civil: [
      "évite les ennuis à tout prix",
      "parle de sa famille",
      "compte les heures avant la fin du service",
      "consulte les horaires de transport",
      "parle de son travail même hors service",
      "vérifie ses dépenses",
      "évite les sujets dangereux",
    ],
  },

  _motivations: {
    any: [
      "payer ses dettes",
      "survivre une nuit de plus",
      "se faire un nom",
      "protéger les siens",
      "oublier un passé qui colle à la peau",
      "prouver qu'on s'est trompé à son sujet",
      "obtenir enfin des réponses",
      "quitter cette ville pour toujours",
      "retrouver quelqu'un disparu",
      "gagner suffisamment pour recommencer ailleurs",
      "tenir une promesse faite autrefois",
    ],
    gang: [
      "défendre le territoire",
      "venger un frère tombé",
      "monter dans la hiérarchie du gang",
      "prouver sa valeur",
      "sortir un proche du gang",
      "récupérer un territoire perdu",
      "éviter une guerre de gangs",
      "gagner assez pour quitter les Barrens",
    ],
    corpo: [
      "décrocher une promotion",
      "ne pas finir comme variable d'ajustement",
      "rembourser son contrat",
      "plaire au supérieur direct",
      "survivre à la prochaine restructuration",
      "obtenir un bureau au bon étage",
      "effacer une erreur de carrière",
      "échapper à une clause contractuelle",
      "faire oublier un scandale interne",
    ],
    police: [
      "nettoyer son secteur",
      "boucler son service sans bavure",
      "arrondir ses fins de mois",
      "coffrer une cible précise",
      "prouver qu'une affaire a été étouffée",
      "protéger ses équipiers",
      "prendre sa retraite vivant",
      "faire tomber quelqu'un d'intouchable",
    ],
    crime: [
      "honorer la famille",
      "étendre le racket",
      "effacer un témoin gênant",
      "rembourser un parrain",
      "maintenir la paix entre deux familles",
      "préparer sa succession",
      "faire payer une trahison ancienne",
      "préserver les apparences",
    ],
    militaire: [
      "accomplir la mission",
      "ramener son équipe vivante",
      "toucher sa prime",
      "fuir un passé de soldat",
      "retrouver un ancien frère d'armes",
      "oublier une opération qui a mal tourné",
      "racheter une erreur de commandement",
      "prouver qu'il est encore utile",
    ],
    rue: [
      "trouver un repas chaud",
      "un toit pour la nuit",
      "une dose",
      "ne pas se faire remarquer",
      "obtenir un vrai SIN",
      "mettre quelqu'un à l'abri",
      "trouver un endroit sûr",
      "rester invisible aux autorités",
    ],
    ombre: [
      "le prochain gros coup",
      "disparaître pour de bon",
      "régler une vieille dette",
      "rester intraçable",
      "amasser assez d'argent pour disparaître",
      "tenir jusqu'au prochain contrat",
      "protéger une identité secrète",
      "quitter définitivement les Ombres",
    ],
    magique: [
      "percer un mystère astral",
      "honorer son mentor/totem",
      "maîtriser un pouvoir qui le dépasse",
      "protéger un lieu sacré",
      "comprendre une vision récurrente",
      "apaiser un esprit hostile",
      "retrouver un artefact disparu",
      "éviter une catastrophe annoncée",
    ],
    matrice: [
      "la donnée parfaite",
      "humilier une corpo",
      "effacer son propre dossier",
      "le frisson de l'intrusion",
      "publier des données interdites",
      "dévoiler un secret corporatiste",
      "devenir une légende du Réseau",
      "retrouver des données effacées",
    ],
    tech: [
      "construire la machine parfaite",
      "récupérer des pièces rares",
      "prouver son génie",
      "un atelier à soi",
      "mettre au point une invention impossible",
      "ouvrir son propre atelier",
      "réparer quelque chose qu'il a détruit",
      "être reconnu pour son talent",
    ],
    civil: [
      "nourrir sa famille",
      "garder son emploi",
      "une vie tranquille",
      "éviter les runners",
      "payer les études d'un enfant",
      "conserver son logement",
      "échapper à ses dettes",
      "rester en dehors des problèmes des autres",
    ],
  },

  _styles: {
    any: [
      "pragmatique",
      "discret",
      "tape-à-l'œil",
      "minimaliste",
      "usé mais entretenu",
      "fonctionnel avant tout",
      "délibérément intimidant",
      "élégance négligée",
      "rétro remis au goût du jour",
      "personnalisé jusqu'à l'excès",
    ],

    gang: [
      "streetwear couvert de patchs",
      "cuir clouté",
      "couleurs criardes du gang",
      "look post-apo des Barrens",
      "mode urbaine agressive",
      "équipement de récupération customisé",
      "style inspiré des icônes du gang",
      "mélange de vêtements volés et de trophées",
      "ostentation des augmentations",
      "allure de prédateur de quartier",
    ],

    corpo: [
      "costume taillé sur mesure",
      "tailleur sobre et cher",
      "tenue business augmentée AR",
      "élégance froide",
      "luxe discret",
      "mode corporatiste de dernière génération",
      "tenue pensée pour impressionner",
      "sobriété calculée",
      "apparence calibrée par le service image",
      "style de cadre supérieur inaccessible",
    ],

    police: [
      "uniforme réglementaire",
      "armure de patrouille",
      "civil mais reconnaissable",
      "trench de détective",
      "tenue pratique et robuste",
      "ancien uniforme conservé par habitude",
      "style de flic hors service",
      "équipement toujours à portée de main",
      "allure de vétéran de la rue",
      "fonctionnel jusqu'à l'austérité",
    ],

    crime: [
      "complet sombre soigné",
      "bijoux ostentatoires",
      "élégance menaçante",
      "sobre mais coûteux",
      "luxe de mauvais goût",
      "apparence de notable respectable",
      "raffinement intimidant",
      "mode traditionnelle de la famille",
      "richesse affichée comme une arme",
      "costume conçu pour dissimuler une arme",
    ],

    militaire: [
      "treillis et armure modulaire",
      "surplus militaire",
      "tenue tactique noire",
      "camouflage urbain",
      "équipement entretenu avec obsession",
      "ancien uniforme adapté à la vie civile",
      "allure de mercenaire professionnel",
      "prêt au combat en permanence",
      "style austère et réglementaire",
      "matériel avant apparence",
    ],

    rue: [
      "fripes superposées",
      "vêtements de récup",
      "manteau rapiécé",
      "look crasseux fonctionnel",
      "assemblage de dons et de trouvailles",
      "plusieurs couches contre le froid et la pluie",
      "tenue adaptée à la survie urbaine",
      "vêtements trop grands récupérés ailleurs",
      "apparence volontairement invisible",
      "style des squats et des refuges",
    ],

    ombre: [
      "tenue passe-partout sombre",
      "vêtements sans marque ni signe",
      "gris urbain",
      "noir technique discret",
      "mode qui ne retient pas l'attention",
      "équipement dissimulé dans les vêtements",
      "élégance utilitaire",
      "allure interchangeable",
      "style de professionnel prudent",
      "apparence conçue pour disparaître dans la foule",
    ],

    magique: [
      "robes et fétiches",
      "look mystique discret",
      "vêtements ornés de symboles",
      "sobriété chargée de sens",
      "tenues traditionnelles adaptées au Sixième Monde",
      "bijoux rituels omniprésents",
      "style ésotérique contemporain",
      "vêtements choisis selon des considérations symboliques",
      "apparence d'érudit occulte",
      "mélange de spiritualité et de modernité",
    ],

    matrice: [
      "sweat à capuche et lunettes AR",
      "look hacker négligé",
      "tenue confortable bardée de tech",
      "néo-cyberpunk",
      "vêtements saturés d'interfaces",
      "mode urbaine augmentée",
      "look d'insomniaque professionnel",
      "câbles, batteries et accessoires apparents",
      "minimalisme technologique",
      "style influencé par les célébrités du Réseau",
    ],

    tech: [
      "combinaison de mécano",
      "veste à mille poches",
      "tablier renforcé",
      "tenue pratique tachée d'huile",
      "équipement modifié maison",
      "style d'atelier permanent",
      "vêtements renforcés contre les accidents",
      "accessoires techniques omniprésents",
      "apparence de bricoleur obsessionnel",
      "fonctionnalité absolue",
    ],

    civil: [
      "vêtements de tous les jours",
      "tenue de travail",
      "look ordinaire et passe-inaperçu",
      "style de salarié fatigué",
      "mode achetée en grande surface",
      "vêtements choisis pour durer",
      "apparence soigneuse malgré les moyens limités",
      "allure de parent débordé",
      "sobriété économique",
      "look sans histoire",
    ],
  },

  _attitudes: {
    any: [
      "méfiant mais poli",
      "fatigué et pressé",
      "chaleureux en apparence",
      "sur la défensive",
      "curieux",
      "agressivement amical",
      "observe avant de parler",
      "cherche à évaluer son interlocuteur",
      "semble constamment préoccupé",
      "agit comme s'il manquait de temps",
    ],

    gang: [
      "cherche à intimider",
      "teste immédiatement les limites",
      "joue les gros bras",
      "traite les inconnus comme des rivaux potentiels",
      "protège instinctivement les siens",
      "affiche une confiance excessive",
      "réagit vite aux provocations",
      "cherche le respect avant tout",
    ],

    corpo: [
      "professionnel et distant",
      "aimablement condescendant",
      "sourit sans se dévoiler",
      "considère chaque échange comme une négociation",
      "cherche à garder le contrôle",
      "parle comme en réunion",
      "traite les émotions comme un problème à résoudre",
      "évalue immédiatement l'utilité des gens",
    ],

    police: [
      "pose des questions avant de répondre",
      "reste constamment vigilant",
      "cherche les incohérences",
      "agit comme en service",
      "considère tout le monde comme un suspect potentiel",
      "essaie de garder la situation sous contrôle",
      "affiche une autorité naturelle",
      "s'attend au pire",
    ],

    crime: [
      "parle calmement pour inquiéter",
      "traite chaque échange comme une dette",
      "semble toujours connaître un secret",
      "accorde sa confiance au compte-gouttes",
      "cherche les leviers de pression",
      "donne l'impression d'être dangereux sans hausser le ton",
      "valorise le respect et les formes",
      "laisse volontairement planer la menace",
    ],

    militaire: [
      "analyse la situation avant les personnes",
      "reste discipliné même au repos",
      "donne des ordres sans s'en rendre compte",
      "cherche une chaîne de commandement",
      "considère les problèmes comme des objectifs",
      "garde ses émotions sous contrôle",
      "privilégie l'efficacité à la diplomatie",
      "agit comme si le danger pouvait surgir à tout moment",
    ],

    rue: [
      "s'attend à être trompé",
      "reste prêt à fuir",
      "se montre reconnaissant au moindre geste",
      "cherche à éviter les conflits",
      "parle peu et écoute beaucoup",
      "craint les autorités",
      "attend qu'on lui demande quelque chose en retour",
      "se méfie des gens trop gentils",
    ],

    ombre: [
      "évalue chaque mot prononcé",
      "agit comme si la réunion était déjà terminée",
      "ne révèle jamais plus que nécessaire",
      "semble constamment prévoir une sortie",
      "fait parler les autres",
      "garde une distance émotionnelle",
      "reste calme même sous pression",
      "donne l'impression d'avoir déjà vécu cette situation",
    ],

    magique: [
      "semble savoir quelque chose que les autres ignorent",
      "écoute des choses invisibles",
      "considère les événements comme des signes",
      "réagit à des détails insignifiants",
      "parle parfois de façon énigmatique",
      "reste calme face à l'inexplicable",
      "accorde de l'importance aux symboles",
      "semble observer plusieurs réalités à la fois",
    ],

    matrice: [
      "paraît distrait par des informations invisibles",
      "réfléchit plus vite qu'il ne parle",
      "considère les gens comme des systèmes",
      "semble plus à l'aise en RA qu'en face-à-face",
      "passe brutalement d'un sujet à l'autre",
      "traite les problèmes comme des énigmes techniques",
      "cherche des données avant des opinions",
      "oublie parfois le monde physique",
    ],

    tech: [
      "cherche à comprendre avant d'agir",
      "voit des problèmes à réparer partout",
      "préfère les machines aux gens",
      "aborde les difficultés de façon méthodique",
      "reste calme face aux pannes et au chaos",
      "s'intéresse davantage aux objets qu'aux propriétaires",
      "veut toujours améliorer ce qui fonctionne déjà",
      "réfléchit à voix haute",
    ],

    civil: [
      "cherche avant tout à éviter les ennuis",
      "essaie de rester poli",
      "s'inquiète des conséquences",
      "fait passer sa famille avant tout",
      "espère que tout rentrera dans l'ordre",
      "se montre prudent avec les inconnus",
      "préfère les compromis aux conflits",
      "semble dépassé par les événements",
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
      attitude: this._pick(this._attitudes, tags),
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
      attitude: this._attitudes,
    };
    if (field === "age") pnj.flavor.age = this._ageFor(pnj);
    else if (map[field]) pnj.flavor[field] = this._pick(map[field], tags);
    return pnj;
  },
};
