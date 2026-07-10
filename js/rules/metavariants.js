"use strict";

/* ============================================================
   MÉTAVARIANTES SR5 — Run Faster (BBE, fr), p.76-78
   Base de données commune. Trois familles :
     - metavariants : 17 métavariantes jouables (souches elfe/nain/ork/troll/humain)
     - metaconsciences : 4 métaconsciences (Centaure, Naga, Pixie, Sasquatch)
     - zoocanthropes : 12 formes anthropes (porteurs du virus zoocanthrope)

   Chaque entrée porte :
     - baseMetatype : métatype parent (pour la pondération et les fallbacks moteur)
     - ranges : { CON, AGI, REA, FOR, VOL, LOG, INT, CHA } — bornes officielles
                (REA = RÉA en SR6 ; le moteur fait la correspondance)
     - traits : liste de traits raciaux (texte affiché sur la fiche)
     - originPools : origines culturelles cohérentes (peuplement « crédible »)
     - mag : pour métaconsciences/zoocanthropes (êtres à nature duale)
     - init : dés d'initiative animale, le cas échéant (zoocanthropes)

   Les ranges remplacent ceux du métatype parent ; les traits sont injectés
   sur la fiche. Le moteur d'édition appelle Metavariants.resolve(meta).
   ============================================================ */

/* Textes de règle courts partagés par plusieurs traits identiques ou proches
   (ex. "Vision nocturne" revient sur ~15 entrées) : centralisés ici pour ne
   pas dupliquer la même prose à chaque occurrence. Chaque trait affiché
   référence un `desc` pris dans ce dictionnaire — même mécanisme que les
   pouvoirs d'adepte (content.js), rendu cliquable par CardRenderer._contentTag. */
const RULE = {
  visionNocturne:
    "Vision nocturne (basse lumière) : voit normalement dans la pénombre et par faible luminosité, sans pénalité pour manque de lumière.",
  visionThermo:
    "Vision thermographique : perçoit les sources de chaleur, ignore l'obscurité totale et la plupart des écrans de fumée (mais pas le noir absolu ni une cible à température ambiante).",
  visionSousMarine:
    "Vision sous-marine : voit normalement sous l'eau, sans la pénalité habituelle de perception aquatique.",
  oeilCyclopeen:
    "Œil cyclopéen : œil central unique remplaçant la paire habituelle ; pas de vision périphérique/stéréoscopique, mais champ de vision frontal normal.",
  oeilDeLynx:
    "Œil de lynx : acuité visuelle exceptionnelle, bonus aux tests de Perception visuelle à longue distance.",
  allonge:
    "Allonge +1 : gabarit imposant donnant une allonge en mêlée supérieure à la moyenne (bonus aux jets de mêlée liés à la distance de contact).",
  altDermiqueEcorce:
    "Écorce / altération dermique : peau très dure façon écorce, agit comme une armure naturelle intégrée.",
  cornesPerforantes:
    "Cornes perforantes : arme naturelle de corne utilisable en mêlée (charge/coup de tête), dégâts physiques supplémentaires.",
  crocs:
    "Crocs : arme naturelle de morsure utilisable en mêlée à la place ou en complément des mains nues.",
  ouieFine:
    "Ouïe fine : audition très développée, bonus aux tests de Perception auditive.",
  vindicatif:
    "Problèmes de maîtrise de soi (Vindicatif) : tempérament rancunier, malus pour résister à la provocation ou laisser filer un affront.",
  estomacOgre:
    "Estomac d'ogre : système digestif capable d'assimiler des aliments impropres à un métahumain normal (quasi-immunité aux intoxications alimentaires).",
  pigmentation:
    "Pigmentation extraordinaire : couleur de peau/pilosité atypique et marquée (trait esthétique, sans effet mécanique direct).",
  jambesSatyre:
    "Jambes de satyre : morphologie de jambes digitigrades ; bonus de déplacement/saut, mais gêne pour porter des chaussures/pantalons standards.",
  amortisseurMagique1:
    "Amortisseur magique (1) : résiste mieux aux dégâts causés par les sorts de combat (réduction fixe des dégâts magiques encaissés).",
  amortisseurMagique2:
    "Amortisseur magique (2) : version renforcée de l'Amortisseur magique — réduction plus importante des dégâts magiques encaissés.",
  neotenie:
    "Néoténie : traits juvéniles permanents (apparence plus jeune que l'âge réel) ; effet surtout social/cosmétique.",
  coutStyleVie:
    "Coût de style de vie majoré : entretien (régime, soins, équipement adapté à la morphologie) plus cher que la moyenne ; le pourcentage indiqué s'applique au style de vie du personnage.",
  pattesSinges:
    "Pattes de singe / queue préhensile : membres inférieurs et/ou queue préhensiles, bonus d'Escalade/Acrobaties, peut manipuler des objets légers.",
  pilositeEtrange:
    "Pilosité étrange : fourrure ou pilosité abondante et non-standard (couleur, texture) ; trait essentiellement cosmétique.",
  celerite:
    "Célérité : réflexes et vivacité innés supérieurs à la moyenne métahumaine.",
  resistanceToxines:
    "Résistance aux pathogènes/toxines : bonus (ou seuil) de résistance contre les maladies et les poisons.",
  doigtsPalmes:
    "Doigts palmés : mains et pieds palmés, bonus de Natation, légère gêne pour la préhension fine.",
  eclat:
    "Éclat : beauté et prestance fae marquées, bonus social (Séduction/Étiquette) mais attire l'attention.",
  symbiose:
    "Symbiose : lien empathique avec la nature environnante, bonus perceptif ou magique en milieu naturel.",
  allergie:
    "Allergie : subit un malus (voire une incapacité) en présence de l'allergène désigné ; la sévérité entre parenthèses (légère/moyenne/grave/extrême) fixe l'ampleur de la pénalité.",
  nocturne:
    "Nocturne : rythme biologique inversé, malus aux tests en pleine lumière du jour.",
  membresAllonges:
    "Membres allongés : bras et jambes disproportionnés, allonge supplémentaire en mêlée et bonus d'Escalade.",
  photometabolisme:
    "Photométabolisme : tire une partie de son énergie de la lumière solaire, réduit le besoin de nourriture mais crée une dépendance à l'exposition lumineuse.",
  brasDeShiva:
    "Bras de Shiva : une ou deux paires de bras surnuméraires, permet des actions/attaques supplémentaires par tour ou narration.",
  armeNaturelle:
    "Arme naturelle : attaque de mêlée innée (crocs, griffes, corne...) aux caractéristiques propres (voir le profil d'armes de la créature), utilisable sans arme portée.",
  deplacement:
    "Déplacement racial : vitesses de marche/course/bonus propres à cette forme, qui remplacent celles du métatype de base (valeurs entre parenthèses).",
  recherche:
    "Recherche : sens olfactif/pistage très développé, bonus aux tests de Perception pour suivre une piste ou localiser une source.",
  sensMagique:
    "Sens magique : perçoit instinctivement la présence de magie active à proximité, sans test d'Assensing complet.",
  animalSangFroid:
    "Animal à sang froid : thermorégulation reptilienne, ralenti et vulnérable au froid, plus actif par forte chaleur.",
  armureFixe:
    "Armure naturelle : bonus d'armure fixe intégré à la morphologie, s'ajoute à l'armure portée.",
  garde:
    "Garde : instinct territorial/protecteur marqué, bonus pour repérer une intrusion ou défendre un lieu/allié.",
  natureDuale:
    "Nature duale : perceptible à la fois sur le plan physique et sur le plan astral, peut être ciblé par la magie comme un esprit.",
  venin:
    "Venin : morsure/attaque envenimée, inflige une toxine en plus des dégâts physiques (résistance requise de la cible).",
  pasDeBrasJambes:
    "Pas de bras ni jambes : corps serpentiforme, aucune manipulation fine possible sans assistance magique/technologique, déplacement par reptation ou nage uniquement.",
  disparition:
    "Disparition : en cas de mort, le corps se désagrège/disparaît rapidement, ne laissant aucune preuve exploitable.",
  dissimulation:
    "Dissimulation (sur soi) : capacité innée à se fondre dans son environnement, bonus aux tests de Discrétion/Camouflage.",
  illettre:
    "Illettré : n'a jamais appris à lire/écrire (trait culturel/biologique) ; pénalité ou impossibilité sur les tests nécessitant la lecture.",
  perceptionAstrale:
    "Perception astrale : perçoit le plan astral sans avoir besoin de projection, comme un Éveillé.",
  imitation:
    "Imitation : capacité innée à reproduire fidèlement sons et voix entendus.",
  organeVomeronasal:
    "Organe voméronasal : sens chimique additionnel proche de l'odorat, bonus pour détecter émotions/phéromones et pister par l'odeur.",
  spectreAuditif:
    "Spectre auditif élargi (ultrasons) : perçoit des fréquences inaudibles pour un métahumain, bonus de Perception auditive.",
  sensEquilibre:
    "Sens de l'équilibre : équilibre et coordination félins hors normes, bonus aux tests d'Acrobaties/Escalade et résistance aux chutes.",
  regardDement:
    "Regard dément : expression faciale dérangeante propre à la souche, effet social ambivalent selon le contexte.",
  boyauxAcier:
    "Boyaux d'acier : système digestif capable de tolérer des substances impropres à la consommation métahumaine standard.",
  robusteBonus:
    "Robuste : encaisse mieux les dégâts, cases de moniteur de blessures supplémentaires (voir le bonus chiffré).",
  resistanceMagie:
    "Résistance à la magie : bonus de résistance inné contre les sorts et effets magiques directs.",
  ailesFonctionnelles:
    "Ailes fonctionnelles : paire d'ailes permettant un véritable vol autonome (le type précisé indique la portée/endurance de vol).",
  bioluminescence:
    "Bioluminescence (spectre UV) : peau capable d'émettre une lumière visible dans l'ultraviolet, invisible à l'œil nu mais détectable avec l'équipement adapté.",
  manaception:
    "Manaception : perçoit instinctivement la présence de magie active (équivalent SR6 du Sens magique).",
  biosonar:
    "Biosonar : écholocation active, perception fine de l'environnement proche même sans lumière, notamment sous l'eau.",
  regeneration:
    "Régénération : guérit les dégâts physiques anormalement vite ; seules les blessures à l'argent ou par le feu échappent à la régénération.",
  transformation:
    "Transformation (forme métahumaine) : peut basculer entre sa forme animale/hybride et sa forme métahumaine d'origine.",
  vulnerabiliteArgent:
    "Vulnérabilité (Argent) : subit des dégâts/malus aggravés au contact d'armes ou d'objets en argent.",
  atoutNiveau:
    "Atout de métavariante : la souche impose de choisir un Atout du niveau indiqué à la création (niv.0 = mineur/cosmétique, niv.1 = notable, niv.2 = marquant) — le livre ne fixe pas toujours l'Atout précis ; à choisir avec le MJ en cohérence avec le trait.",
  atoutObligatoire:
    "Atout obligatoire : la métavariante impose de dépenser un Atout de ce niveau sur un trait racial précis, non substituable par un autre Atout à ce niveau.",
};

const Metavariants = {
  /* ---- Métavariantes jouables (p.76) ---- */
  metavariants: {
    // — Souche TROLL —
    Cyclope: {
      baseMetatype: "Troll",
      ranges: {
        CON: [5, 10],
        AGI: [1, 5],
        REA: [1, 6],
        FOR: [6, 11],
        VOL: [1, 6],
        LOG: [1, 4],
        INT: [1, 5],
        CHA: [1, 4],
      },
      traits: [
        { name: "Allonge +1", desc: RULE.allonge },
        { name: "Œil cyclopéen", desc: RULE.oeilCyclopeen },
        { name: "Vision thermographique", desc: RULE.visionThermo },
        { name: "+100 % au coût du style de vie", desc: RULE.coutStyleVie },
      ],
      originPools: ["euro", "arabe"],
    },
    Fomori: {
      baseMetatype: "Troll",
      ranges: {
        CON: [4, 9],
        AGI: [1, 5],
        REA: [1, 6],
        FOR: [5, 10],
        VOL: [1, 5],
        LOG: [1, 4],
        INT: [1, 4],
        CHA: [1, 5],
      },
      traits: [
        { name: "Allonge +1", desc: RULE.allonge },
        { name: "Amortisseur magique (1)", desc: RULE.amortisseurMagique1 },
        { name: "Vision thermographique", desc: RULE.visionThermo },
        { name: "+100 % au coût du style de vie", desc: RULE.coutStyleVie },
      ],
      originPools: ["euro"],
    },
    Géant: {
      baseMetatype: "Troll",
      ranges: {
        CON: [5, 10],
        AGI: [1, 5],
        REA: [1, 5],
        FOR: [5, 10],
        VOL: [1, 6],
        LOG: [1, 5],
        INT: [1, 5],
        CHA: [1, 5],
      },
      traits: [
        { name: "Allonge +1", desc: RULE.allonge },
        { name: "Altération dermique (écorce)", desc: RULE.altDermiqueEcorce },
        { name: "Vision thermographique", desc: RULE.visionThermo },
        { name: "+100 % au coût du style de vie", desc: RULE.coutStyleVie },
      ],
      originPools: ["euro", "russe"],
    },
    Minotaure: {
      baseMetatype: "Troll",
      ranges: {
        CON: [6, 11],
        AGI: [1, 5],
        REA: [1, 6],
        FOR: [5, 10],
        VOL: [1, 6],
        LOG: [1, 5],
        INT: [1, 6],
        CHA: [1, 4],
      },
      traits: [
        { name: "Allonge +1", desc: RULE.allonge },
        { name: "Cornes perforantes", desc: RULE.cornesPerforantes },
        { name: "Vision thermographique", desc: RULE.visionThermo },
        { name: "+100 % au coût du style de vie", desc: RULE.coutStyleVie },
      ],
      originPools: ["euro", "arabe"],
    },

    // — Souche ORK —
    Hobgobelin: {
      baseMetatype: "Ork",
      ranges: {
        CON: [3, 8],
        AGI: [1, 6],
        REA: [1, 6],
        FOR: [2, 7],
        VOL: [1, 6],
        LOG: [1, 6],
        INT: [2, 7],
        CHA: [1, 5],
      },
      traits: [
        { name: "Crocs", desc: RULE.crocs },
        { name: "Ouïe fine", desc: RULE.ouieFine },
        { name: "Problèmes de maîtrise de soi (Vindicatif)", desc: RULE.vindicatif },
        { name: "Vision nocturne", desc: RULE.visionNocturne },
      ],
      originPools: ["arabe", "asiacentral"],
    },
    Ogre: {
      baseMetatype: "Ork",
      ranges: {
        CON: [4, 9],
        AGI: [1, 6],
        REA: [1, 5],
        FOR: [3, 8],
        VOL: [2, 7],
        LOG: [1, 5],
        INT: [1, 6],
        CHA: [1, 4],
      },
      traits: [
        { name: "Estomac d'ogre", desc: RULE.estomacOgre },
        { name: "Vision nocturne", desc: RULE.visionNocturne },
      ],
      originPools: ["euro", "russe"],
    },
    Oni: {
      baseMetatype: "Ork",
      ranges: {
        CON: [3, 8],
        AGI: [2, 7],
        REA: [1, 6],
        FOR: [2, 7],
        VOL: [1, 6],
        LOG: [1, 5],
        INT: [1, 6],
        CHA: [2, 7],
      },
      traits: [
        { name: "Pigmentation extraordinaire", desc: RULE.pigmentation },
        { name: "Vision nocturne", desc: RULE.visionNocturne },
      ],
      originPools: ["japonais"],
    },
    Satyre: {
      baseMetatype: "Ork",
      ranges: {
        CON: [2, 7],
        AGI: [1, 6],
        REA: [2, 7],
        FOR: [2, 7],
        VOL: [1, 6],
        LOG: [1, 6],
        INT: [1, 6],
        CHA: [1, 5],
      },
      traits: [
        { name: "Jambes de satyre", desc: RULE.jambesSatyre },
        { name: "Vision nocturne", desc: RULE.visionNocturne },
      ],
      originPools: ["euro", "latino"],
    },

    // — Souche NAIN —
    Gnome: {
      baseMetatype: "Nain",
      ranges: {
        CON: [1, 4],
        AGI: [2, 7],
        REA: [1, 6],
        FOR: [1, 4],
        VOL: [2, 7],
        LOG: [2, 7],
        INT: [1, 6],
        CHA: [1, 6],
      },
      traits: [
        { name: "Amortisseur magique (2)", desc: RULE.amortisseurMagique2 },
        { name: "Néoténie", desc: RULE.neotenie },
        { name: "Vision thermographique", desc: RULE.visionThermo },
        { name: "+20 % au coût du style de vie", desc: RULE.coutStyleVie },
      ],
      originPools: ["euro"],
    },
    Hanuman: {
      baseMetatype: "Nain",
      ranges: {
        CON: [1, 6],
        AGI: [2, 7],
        REA: [1, 6],
        FOR: [2, 7],
        VOL: [1, 6],
        LOG: [1, 5],
        INT: [2, 7],
        CHA: [1, 5],
      },
      traits: [
        { name: "Pattes de singes", desc: RULE.pattesSinges },
        { name: "Pilosité étrange (corps)", desc: RULE.pilositeEtrange },
        { name: "Queue fonctionnelle (préhensile)", desc: RULE.pattesSinges },
        { name: "Vision thermographique", desc: RULE.visionThermo },
        { name: "+20 % au coût du style de vie", desc: RULE.coutStyleVie },
      ],
      originPools: ["asiacentral"],
    },
    Koborokuru: {
      baseMetatype: "Nain",
      ranges: {
        CON: [2, 7],
        AGI: [1, 6],
        REA: [1, 6],
        FOR: [2, 7],
        VOL: [2, 7],
        LOG: [1, 6],
        INT: [1, 6],
        CHA: [1, 6],
      },
      traits: [
        { name: "Célérité", desc: RULE.celerite },
        { name: "Pilosité étrange", desc: RULE.pilositeEtrange },
        { name: "Résistance aux pathogènes / toxines", desc: RULE.resistanceToxines },
        { name: "Vision thermographique", desc: RULE.visionThermo },
        { name: "+20 % au coût du style de vie", desc: RULE.coutStyleVie },
      ],
      originPools: ["japonais"],
    },
    Menehune: {
      baseMetatype: "Nain",
      ranges: {
        CON: [2, 7],
        AGI: [2, 7],
        REA: [1, 5],
        FOR: [2, 7],
        VOL: [1, 6],
        LOG: [1, 6],
        INT: [1, 6],
        CHA: [1, 6],
      },
      traits: [
        { name: "Doigts palmés", desc: RULE.doigtsPalmes },
        { name: "Résistance aux pathogènes", desc: RULE.resistanceToxines },
        { name: "Vision sous-marine", desc: RULE.visionSousMarine },
        { name: "Vision thermographique", desc: RULE.visionThermo },
        { name: "+20 % au coût du style de vie", desc: RULE.coutStyleVie },
      ],
      originPools: ["polynesien"],
    },

    // — Souche ELFE —
    Dryade: {
      baseMetatype: "Elfe",
      ranges: {
        CON: [1, 6],
        AGI: [2, 7],
        REA: [1, 6],
        FOR: [1, 5],
        VOL: [1, 6],
        LOG: [1, 6],
        INT: [1, 6],
        CHA: [3, 8],
      },
      traits: [
        { name: "Éclat", desc: RULE.eclat },
        { name: "Symbiose", desc: RULE.symbiose },
        { name: "Vision nocturne", desc: RULE.visionNocturne },
      ],
      originPools: ["euro", "latino"],
    },
    Nocturna: {
      baseMetatype: "Elfe",
      ranges: {
        CON: [1, 5],
        AGI: [3, 8],
        REA: [1, 6],
        FOR: [1, 6],
        VOL: [1, 6],
        LOG: [1, 6],
        INT: [1, 6],
        CHA: [2, 7],
      },
      traits: [
        { name: "Allergie (Soleil, légère)", desc: RULE.allergie },
        { name: "Nocturne", desc: RULE.nocturne },
        { name: "Ouïe fine", desc: RULE.ouieFine },
        { name: "Pilosité étrange (fourrure colorée)", desc: RULE.pilositeEtrange },
        { name: "Vision nocturne", desc: RULE.visionNocturne },
      ],
      originPools: ["euro", "latino"],
    },
    Wakyambi: {
      baseMetatype: "Elfe",
      ranges: {
        CON: [1, 6],
        AGI: [2, 7],
        REA: [1, 6],
        FOR: [1, 6],
        VOL: [1, 6],
        LOG: [1, 5],
        INT: [2, 7],
        CHA: [1, 6],
      },
      traits: [
        { name: "Célérité", desc: RULE.celerite },
        { name: "Membres allongés", desc: RULE.membresAllonges },
        { name: "Vision nocturne", desc: RULE.visionNocturne },
      ],
      originPools: ["africain"],
    },
    "Xapiri thëpë": {
      baseMetatype: "Elfe",
      ranges: {
        CON: [1, 6],
        AGI: [2, 7],
        REA: [1, 6],
        FOR: [1, 6],
        VOL: [1, 6],
        LOG: [1, 5],
        INT: [1, 6],
        CHA: [2, 7],
      },
      traits: [
        { name: "Allergie (Polluants, légère)", desc: RULE.allergie },
        { name: "Photométabolisme", desc: RULE.photometabolisme },
        { name: "Vision nocturne", desc: RULE.visionNocturne },
      ],
      originPools: ["latino", "amerindien"],
    },

    // — Souche HUMAIN —
    Nartaki: {
      baseMetatype: "Humain",
      ranges: {
        CON: [1, 6],
        AGI: [1, 6],
        REA: [1, 6],
        FOR: [1, 6],
        VOL: [1, 6],
        LOG: [1, 6],
        INT: [1, 6],
        CHA: [1, 6],
      },
      traits: [
        { name: "Bras de Shiva", desc: RULE.brasDeShiva },
        { name: "Pigmentation extraordinaire", desc: RULE.pigmentation },
      ],
      originPools: ["arabe", "asiacentral"],
    },
  },

  /* ---- Métaconsciences (p.77) — êtres à nature duale, MAG 1 ---- */
  metaconsciences: {
    Centaure: {
      baseMetatype: "Humain",
      ranges: {
        CON: [3, 8],
        AGI: [1, 6],
        REA: [1, 6],
        FOR: [3, 8],
        VOL: [1, 6],
        LOG: [1, 6],
        INT: [1, 5],
        CHA: [1, 5],
      },
      traits: [
        { name: "Arme naturelle (Coup de pied)", desc: RULE.armeNaturelle },
        { name: "Déplacement (×1/×4/+4)", desc: RULE.deplacement },
        { name: "Recherche", desc: RULE.recherche },
        { name: "Sens magique", desc: RULE.sensMagique },
        { name: "Vision nocturne", desc: RULE.visionNocturne },
        { name: "Vision thermographique", desc: RULE.visionThermo },
        { name: "+150 % au coût de style de vie", desc: RULE.coutStyleVie },
      ],
      naturalWeapons: ["Coup de pied [PRE 6, Allonge 1, VD (FOR+2)P, PA +1]"],
      originPools: ["euro", "asiacentral"],
      mag: 1,
    },
    Naga: {
      baseMetatype: "Humain",
      ranges: {
        CON: [3, 8],
        AGI: [1, 4],
        REA: [2, 7],
        FOR: [4, 9],
        VOL: [2, 7],
        LOG: [1, 6],
        INT: [1, 6],
        CHA: [2, 7],
      },
      traits: [
        { name: "Animal à sang froid", desc: RULE.animalSangFroid },
        { name: "Arme naturelle (Crocs)", desc: RULE.armeNaturelle },
        { name: "Armure 8", bonus: { armor: 8 }, desc: RULE.armureFixe },
        { name: "Déplacement (×1/×4/+1 ; nage ×2/×4/+2)", desc: RULE.deplacement },
        { name: "Garde", desc: RULE.garde },
        { name: "Nature duale", desc: RULE.natureDuale },
        { name: "Venin", desc: RULE.venin },
        { name: "+150 % au coût de style de vie", desc: RULE.coutStyleVie },
        { name: "Pas de bras ni jambes", desc: RULE.pasDeBrasJambes },
      ],
      naturalWeapons: ["Crocs [PRE 6, Allonge -1, VD (FOR+1)P, PA -2]"],
      originPools: ["arabe", "africain"],
      mag: 1,
    },
    Pixie: {
      baseMetatype: "Elfe",
      ranges: {
        CON: [1, 2],
        AGI: [3, 8],
        REA: [3, 8],
        FOR: [1, 2],
        VOL: [3, 8],
        LOG: [2, 7],
        INT: [2, 7],
        CHA: [3, 8],
      },
      traits: [
        { name: "Déplacement (×1/×2/+1 ; vol ×2/×6/+2)", desc: RULE.deplacement },
        { name: "Disparition (mort)", desc: RULE.disparition },
        { name: "Dissimulation (sur soi)", desc: RULE.dissimulation },
        { name: "Illettré", desc: RULE.illettre },
        { name: "Perception astrale", desc: RULE.perceptionAstrale },
        { name: "+100 % au coût de style de vie", desc: RULE.coutStyleVie },
      ],
      originPools: ["euro", "generique"],
      mag: 1,
    },
    Sasquatch: {
      baseMetatype: "Troll",
      ranges: {
        CON: [6, 11],
        AGI: [1, 6],
        REA: [1, 6],
        FOR: [5, 10],
        VOL: [1, 6],
        LOG: [1, 6],
        INT: [1, 6],
        CHA: [1, 6],
      },
      traits: [
        { name: "Arme naturelle (Griffes)", desc: RULE.armeNaturelle },
        { name: "Déplacement (×2/×4/+2)", desc: RULE.deplacement },
        { name: "Illettré", desc: RULE.illettre },
        { name: "Imitation", desc: RULE.imitation },
        { name: "Nature duale", desc: RULE.natureDuale },
        { name: "+100 % au coût de style de vie", desc: RULE.coutStyleVie },
      ],
      naturalWeapons: ["Griffes [PRE 6, Allonge +1, VD (FOR+1)P, PA —]"],
      originPools: ["amerindien", "generique"],
      mag: 1,
    },
  },

  /* ---- Zoocanthropes (p.77) — porteurs anthropes du virus ---- */
  /* Traits communs : Allergie (Grave, argent), Nature duale, Régénération,
     Transformation (Forme métahumaine), Vulnérabilité (Argent) */
  zoocanthropes: {
    Bovin: {
      baseMetatype: "Humain",
      ranges: {
        CON: [3, 8],
        AGI: [1, 4],
        REA: [1, 4],
        FOR: [4, 9],
        VOL: [1, 6],
        LOG: [1, 5],
        INT: [1, 6],
        CHA: [1, 6],
      },
      traits: [
        { name: "Cornes perforantes", desc: RULE.cornesPerforantes },
        { name: "Déplacement (×1/×4/+1)", desc: RULE.deplacement },
        { name: "Illettré", desc: RULE.illettre },
      ],
      mag: 1,
      init: "1D6",
    },
    Canin: {
      baseMetatype: "Humain",
      ranges: {
        CON: [1, 5],
        AGI: [1, 6],
        REA: [2, 7],
        FOR: [1, 5],
        VOL: [2, 7],
        LOG: [1, 5],
        INT: [2, 7],
        CHA: [2, 7],
      },
      traits: [
        { name: "Arme naturelle (Crocs)", desc: RULE.armeNaturelle },
        { name: "Déplacement (×2/×8/+4)", desc: RULE.deplacement },
        { name: "Organe voméronasal", desc: RULE.organeVomeronasal },
        { name: "Spectre auditif élargi (Ultrasons)", desc: RULE.spectreAuditif },
        { name: "Vision nocturne", desc: RULE.visionNocturne },
      ],
      naturalWeapons: ["Crocs [PRE 6, Allonge —, VD (FOR+1)P, PA -1]"],
      mag: 1,
      init: "1D6",
    },
    Équin: {
      baseMetatype: "Humain",
      ranges: {
        CON: [4, 9],
        AGI: [1, 4],
        REA: [1, 6],
        FOR: [5, 10],
        VOL: [1, 6],
        LOG: [1, 6],
        INT: [1, 6],
        CHA: [1, 6],
      },
      traits: [
        { name: "Déplacement (×3/×10/+6)", desc: RULE.deplacement },
        { name: "Illettré", desc: RULE.illettre },
        { name: "Ouïe fine", desc: RULE.ouieFine },
      ],
      mag: 1,
      init: "1D6",
    },
    Falcin: {
      baseMetatype: "Humain",
      ranges: {
        CON: [1, 4],
        AGI: [2, 7],
        REA: [3, 8],
        FOR: [1, 4],
        VOL: [1, 6],
        LOG: [1, 5],
        INT: [2, 7],
        CHA: [2, 7],
      },
      traits: [
        { name: "Armes naturelles (Crocs, Serres)", desc: RULE.armeNaturelle },
        { name: "Déplacement (×1/×2/+0,5 ; vol ×2/×6/+2)", desc: RULE.deplacement },
        { name: "Illettré", desc: RULE.illettre },
        { name: "Œil de lynx", desc: RULE.oeilDeLynx },
      ],
      naturalWeapons: [
        "Crocs [PRE 6, Allonge -1, VD (FOR+2)P, PA -1]",
        "Serres [PRE 6, Allonge —, VD (FOR)P, PA —]",
      ],
      mag: 1,
      init: "2D6",
    },
    Léonin: {
      baseMetatype: "Humain",
      ranges: {
        CON: [3, 8],
        AGI: [1, 6],
        REA: [2, 7],
        FOR: [4, 9],
        VOL: [1, 5],
        LOG: [1, 4],
        INT: [2, 7],
        CHA: [2, 7],
      },
      traits: [
        { name: "Armes naturelles (Crocs, Griffes)", desc: RULE.armeNaturelle },
        { name: "Déplacement (×2/×6/+4)", desc: RULE.deplacement },
        { name: "Illettré", desc: RULE.illettre },
        { name: "Sens de l'équilibre", desc: RULE.sensEquilibre },
        { name: "Spectre auditif élargi (Ultrasons)", desc: RULE.spectreAuditif },
        { name: "Vision nocturne", desc: RULE.visionNocturne },
      ],
      naturalWeapons: [
        "Crocs [PRE 6, Allonge —, VD (FOR+1)P, PA -1]",
        "Griffes [PRE 6, Allonge +1, VD (FOR+1)P, PA -1]",
      ],
      mag: 1,
      init: "2D6",
    },
    Lupin: {
      baseMetatype: "Humain",
      ranges: {
        CON: [1, 6],
        AGI: [2, 7],
        REA: [1, 6],
        FOR: [1, 6],
        VOL: [1, 6],
        LOG: [1, 5],
        INT: [2, 7],
        CHA: [2, 7],
      },
      traits: [
        { name: "Arme naturelle (Crocs)", desc: RULE.armeNaturelle },
        { name: "Déplacement (×2/×6/+4)", desc: RULE.deplacement },
        { name: "Illettré", desc: RULE.illettre },
        { name: "Organe voméronasal", desc: RULE.organeVomeronasal },
        { name: "Spectre auditif élargi (Ultrasons)", desc: RULE.spectreAuditif },
        { name: "Vision nocturne", desc: RULE.visionNocturne },
      ],
      naturalWeapons: ["Crocs [PRE 6, Allonge —, VD (FOR+1)P, PA -1]"],
      mag: 1,
      init: "2D6",
    },
    Panthérin: {
      baseMetatype: "Humain",
      ranges: {
        CON: [2, 7],
        AGI: [2, 7],
        REA: [2, 7],
        FOR: [1, 6],
        VOL: [1, 6],
        LOG: [1, 5],
        INT: [3, 8],
        CHA: [3, 8],
      },
      traits: [
        { name: "Armes naturelles (Crocs, Griffes)", desc: RULE.armeNaturelle },
        { name: "Déplacement (×2/×6/+4)", desc: RULE.deplacement },
        { name: "Illettré", desc: RULE.illettre },
        { name: "Sens de l'équilibre", desc: RULE.sensEquilibre },
        { name: "Spectre auditif élargi (Ultrasons)", desc: RULE.spectreAuditif },
        { name: "Vision nocturne", desc: RULE.visionNocturne },
      ],
      naturalWeapons: [
        "Crocs [PRE 6, Allonge —, VD (FOR+2)P, PA -3]",
        "Griffes [PRE 6, Allonge —, VD (FOR+1)P, PA —]",
      ],
      mag: 1,
      init: "2D6",
    },
    Tigrin: {
      baseMetatype: "Humain",
      ranges: {
        CON: [3, 8],
        AGI: [2, 7],
        REA: [2, 7],
        FOR: [3, 8],
        VOL: [1, 5],
        LOG: [1, 4],
        INT: [3, 8],
        CHA: [2, 7],
      },
      traits: [
        { name: "Armes naturelles (Crocs, Griffes)", desc: RULE.armeNaturelle },
        { name: "Déplacement (×2/×6/+4)", desc: RULE.deplacement },
        { name: "Illettré", desc: RULE.illettre },
        { name: "Sens de l'équilibre", desc: RULE.sensEquilibre },
        { name: "Spectre auditif élargi (Ultrasons)", desc: RULE.spectreAuditif },
        { name: "Vision nocturne", desc: RULE.visionNocturne },
      ],
      naturalWeapons: [
        "Crocs [PRE 6, Allonge —, VD (FOR+2)P, PA -2]",
        "Griffes [PRE 6, Allonge +1, VD (FOR+1)P, PA -1]",
      ],
      mag: 1,
      init: "2D6",
    },
    Ursin: {
      baseMetatype: "Humain",
      ranges: {
        CON: [6, 11],
        AGI: [1, 5],
        REA: [1, 5],
        FOR: [7, 12],
        VOL: [1, 5],
        LOG: [1, 5],
        INT: [1, 6],
        CHA: [1, 6],
      },
      traits: [
        { name: "Armes naturelles (Crocs, Griffes)", desc: RULE.armeNaturelle },
        { name: "Déplacement (×1/×3/+2)", desc: RULE.deplacement },
        { name: "Illettré", desc: RULE.illettre },
        { name: "Organe voméronasal", desc: RULE.organeVomeronasal },
        { name: "Ouïe fine", desc: RULE.ouieFine },
        { name: "Spectre auditif élargi (Ultrasons)", desc: RULE.spectreAuditif },
        { name: "Vision nocturne", desc: RULE.visionNocturne },
      ],
      naturalWeapons: [
        "Crocs [PRE 6, Allonge —, VD (FOR+2)P, PA -2]",
        "Griffes [PRE 6, Allonge +1, VD (FOR+3)P, PA -1]",
      ],
      mag: 1,
      init: "1D6",
    },
    Vulpin: {
      baseMetatype: "Humain",
      ranges: {
        CON: [1, 4],
        AGI: [2, 7],
        REA: [1, 6],
        FOR: [1, 4],
        VOL: [1, 6],
        LOG: [1, 5],
        INT: [2, 7],
        CHA: [2, 7],
      },
      traits: [
        { name: "Arme naturelle (Crocs)", desc: RULE.armeNaturelle },
        { name: "Déplacement (×1/×3/+2)", desc: RULE.deplacement },
        { name: "Illettré", desc: RULE.illettre },
        { name: "Organe voméronasal", desc: RULE.organeVomeronasal },
        { name: "Ouïe fine", desc: RULE.ouieFine },
        { name: "Spectre auditif élargi (Ultrasons)", desc: RULE.spectreAuditif },
        { name: "Vision nocturne", desc: RULE.visionNocturne },
      ],
      naturalWeapons: ["Crocs [PRE 6, Allonge —, VD (FOR+1)P, PA —]"],
      mag: 1,
      init: "2D6",
    },
  },

  /* Traits communs à tous les zoocanthropes */
  zooTraitsCommuns: [
    { name: "Allergie (Grave, argent)", desc: RULE.allergie },
    { name: "Nature duale", desc: RULE.natureDuale },
    { name: "Régénération", desc: RULE.regeneration },
    { name: "Transformation (forme métahumaine)", desc: RULE.transformation },
    { name: "Vulnérabilité (Argent)", desc: RULE.vulnerabiliteArgent },
  ],

  /* ============================================================
     MÉTAVARIANTES SR6 — Le Compagnon du Sixième Monde (BBE, fr), p.196-197
     Format SR6 : clé d'attribut RÉA (accentuée) + attribut spécial ATO.
     Ranges officiels (bornes 1–N). Traits innés propres à la 6e édition.
     Ensemble plus large que SR5 : ajoute Dalakitnon, Valkyrie, Duende, Triton.
     ============================================================ */
  sr6: {
    metavariants: {
      // — Souche ELFE —
      Dalakitnon: {
        baseMetatype: "Elfe",
        ranges: {
          CON: [1, 6],
          AGI: [1, 7],
          RÉA: [1, 6],
          FOR: [1, 6],
          VOL: [1, 6],
          LOG: [1, 8],
          INT: [1, 7],
          CHA: [1, 8],
        },
        traits: [
          { name: "Allergie (épices, Moyenne)", desc: RULE.allergie },
          { name: "Vision nocturne", desc: RULE.visionNocturne },
        ],
        originPools: ["asiacentral", "latino"],
      },
      Dryade: {
        baseMetatype: "Elfe",
        ranges: {
          CON: [1, 6],
          AGI: [1, 7],
          RÉA: [1, 6],
          FOR: [1, 5],
          VOL: [1, 6],
          LOG: [1, 6],
          INT: [1, 6],
          CHA: [1, 8],
        },
        traits: [
          { name: "Éclat", desc: RULE.eclat },
          { name: "Symbiose", desc: RULE.symbiose },
          { name: "Vision nocturne", desc: RULE.visionNocturne },
        ],
        originPools: ["euro", "latino"],
      },
      Nocturna: {
        baseMetatype: "Elfe",
        ranges: {
          CON: [1, 5],
          AGI: [1, 8],
          RÉA: [1, 6],
          FOR: [1, 6],
          VOL: [1, 6],
          LOG: [1, 6],
          INT: [1, 6],
          CHA: [1, 7],
        },
        traits: [
          { name: "Allergie (lumière du soleil, moyenne)", desc: RULE.allergie },
          { name: "Nocturne", desc: RULE.nocturne },
          { name: "Ouïe fine", desc: RULE.ouieFine },
          { name: "Pilosité étrange (pelage coloré)", desc: RULE.pilositeEtrange },
          { name: "Vision nocturne", desc: RULE.visionNocturne },
        ],
        originPools: ["euro", "latino"],
      },
      Wakyambi: {
        baseMetatype: "Elfe",
        ranges: {
          CON: [1, 6],
          AGI: [1, 7],
          RÉA: [1, 6],
          FOR: [1, 6],
          VOL: [1, 6],
          LOG: [1, 6],
          INT: [1, 6],
          CHA: [1, 7],
        },
        traits: [
          { name: "Célérité", desc: RULE.celerite },
          { name: "Membres allongés", desc: RULE.membresAllonges },
          { name: "Vision nocturne", desc: RULE.visionNocturne },
        ],
        originPools: ["africain"],
      },
      "Xapiri thëpë": {
        baseMetatype: "Elfe",
        ranges: {
          CON: [1, 6],
          AGI: [1, 7],
          RÉA: [1, 6],
          FOR: [1, 6],
          VOL: [1, 6],
          LOG: [1, 6],
          INT: [1, 6],
          CHA: [1, 7],
        },
        traits: [
          { name: "Allergie (polluants, moyenne)", desc: RULE.allergie },
          { name: "Bioluminescence (spectre UV)", desc: RULE.bioluminescence },
          { name: "Photométabolisme", desc: RULE.photometabolisme },
          { name: "Vision nocturne", desc: RULE.visionNocturne },
        ],
        originPools: ["latino", "amerindien"],
      },

      // — Souche HUMAIN —
      Nartaki: {
        baseMetatype: "Humain",
        ranges: {
          CON: [1, 8],
          AGI: [1, 6],
          RÉA: [1, 6],
          FOR: [1, 8],
          VOL: [1, 6],
          LOG: [1, 6],
          INT: [1, 6],
          CHA: [1, 6],
        },
        traits: [
          { name: "Bras de Shiva (1 ou 2)", desc: RULE.brasDeShiva },
          { name: "Pigmentation extraordinaire", desc: RULE.pigmentation },
        ],
        originPools: ["arabe", "asiacentral"],
      },
      Valkyrie: {
        baseMetatype: "Humain",
        ranges: {
          CON: [1, 7],
          AGI: [1, 6],
          RÉA: [1, 6],
          FOR: [1, 7],
          VOL: [1, 6],
          LOG: [1, 6],
          INT: [1, 6],
          CHA: [1, 6],
        },
        traits: [{ name: "Ailes fonctionnelles (Type 2)", desc: RULE.ailesFonctionnelles }],
        originPools: ["euro", "russe"],
      },

      // — Souche NAIN —
      Duende: {
        baseMetatype: "Nain",
        ranges: {
          CON: [1, 7],
          AGI: [1, 6],
          RÉA: [1, 8],
          FOR: [1, 6],
          VOL: [1, 7],
          LOG: [1, 6],
          INT: [1, 7],
          CHA: [1, 6],
        },
        traits: [
          { name: "Allergie (lumière du soleil, extrême)", desc: RULE.allergie },
          { name: "Pilosité étrange", desc: RULE.pilositeEtrange },
          { name: "Résistance aux toxines", desc: RULE.resistanceToxines },
          { name: "Vision nocturne", desc: RULE.visionNocturne },
          { name: "Vision thermographique", desc: RULE.visionThermo },
        ],
        originPools: ["latino", "euro"],
      },
      Gnome: {
        baseMetatype: "Nain",
        ranges: {
          CON: [1, 4],
          AGI: [1, 6],
          RÉA: [1, 6],
          FOR: [1, 4],
          VOL: [1, 7],
          LOG: [1, 7],
          INT: [1, 6],
          CHA: [1, 6],
        },
        traits: [
          { name: "Néoténie", desc: RULE.neotenie },
          { name: "Résistance à la magie", desc: RULE.resistanceMagie },
          { name: "Résistance aux toxines", desc: RULE.resistanceToxines },
          { name: "Vision thermographique", desc: RULE.visionThermo },
        ],
        originPools: ["euro"],
      },
      Hanuman: {
        baseMetatype: "Nain",
        ranges: {
          CON: [1, 6],
          AGI: [1, 7],
          RÉA: [1, 6],
          FOR: [1, 7],
          VOL: [1, 6],
          LOG: [1, 6],
          INT: [1, 7],
          CHA: [1, 6],
        },
        traits: [
          { name: "Pattes de singe", desc: RULE.pattesSinges },
          { name: "Pilosité étrange (Corps)", desc: RULE.pilositeEtrange },
          { name: "Queue préhensile", desc: RULE.pattesSinges },
          { name: "Résistance aux toxines", desc: RULE.resistanceToxines },
        ],
        originPools: ["asiacentral"],
      },
      Koborokuru: {
        baseMetatype: "Nain",
        ranges: {
          CON: [1, 7],
          AGI: [1, 6],
          RÉA: [1, 6],
          FOR: [1, 7],
          VOL: [1, 7],
          LOG: [1, 6],
          INT: [1, 6],
          CHA: [1, 6],
        },
        traits: [
          { name: "Célérité", desc: RULE.celerite },
          { name: "Pilosité étrange", desc: RULE.pilositeEtrange },
          { name: "Résistance aux toxines", desc: RULE.resistanceToxines },
          { name: "Vision thermographique", desc: RULE.visionThermo },
        ],
        originPools: ["japonais"],
      },
      Menehune: {
        baseMetatype: "Nain",
        ranges: {
          CON: [1, 7],
          AGI: [1, 7],
          RÉA: [1, 5],
          FOR: [1, 7],
          VOL: [1, 6],
          LOG: [1, 6],
          INT: [1, 6],
          CHA: [1, 6],
        },
        traits: [
          { name: "Doigts palmés", desc: RULE.doigtsPalmes },
          { name: "Résistance aux toxines", desc: RULE.resistanceToxines },
          { name: "Vision sous-marine", desc: RULE.visionSousMarine },
          { name: "Vision thermographique", desc: RULE.visionThermo },
        ],
        originPools: ["polynesien"],
      },

      // — Souche ORK —
      Hobgobelin: {
        baseMetatype: "Ork",
        ranges: {
          CON: [1, 6],
          AGI: [1, 6],
          RÉA: [1, 6],
          FOR: [1, 7],
          VOL: [1, 6],
          LOG: [1, 6],
          INT: [1, 6],
          CHA: [1, 7],
        },
        traits: [
          { name: "Crocs", desc: RULE.crocs },
          { name: "Regard dément", desc: RULE.regardDement },
          { name: "Vision nocturne", desc: RULE.visionNocturne },
        ],
        originPools: ["arabe", "asiacentral"],
      },
      Ogre: {
        baseMetatype: "Ork",
        ranges: {
          CON: [1, 9],
          AGI: [1, 6],
          RÉA: [1, 5],
          FOR: [1, 8],
          VOL: [1, 7],
          LOG: [1, 6],
          INT: [1, 6],
          CHA: [1, 6],
        },
        traits: [
          { name: "Boyaux d'acier", desc: RULE.boyauxAcier },
          { name: "Vision nocturne", desc: RULE.visionNocturne },
        ],
        originPools: ["euro", "russe"],
      },
      Oni: {
        baseMetatype: "Ork",
        ranges: {
          CON: [1, 8],
          AGI: [1, 7],
          RÉA: [1, 6],
          FOR: [1, 7],
          VOL: [1, 6],
          LOG: [1, 6],
          INT: [1, 6],
          CHA: [1, 7],
        },
        traits: [
          { name: "Pigmentation extraordinaire", desc: RULE.pigmentation },
          { name: "Vision nocturne", desc: RULE.visionNocturne },
        ],
        originPools: ["japonais"],
      },
      Satyre: {
        baseMetatype: "Ork",
        ranges: {
          CON: [1, 7],
          AGI: [1, 6],
          RÉA: [1, 7],
          FOR: [1, 7],
          VOL: [1, 6],
          LOG: [1, 6],
          INT: [1, 6],
          CHA: [1, 6],
        },
        traits: [
          { name: "Jambes de satyre", desc: RULE.jambesSatyre },
          { name: "Vision nocturne", desc: RULE.visionNocturne },
        ],
        originPools: ["euro", "latino"],
      },

      // — Souche TROLL —
      Cyclope: {
        baseMetatype: "Troll",
        ranges: {
          CON: [1, 9],
          AGI: [1, 5],
          RÉA: [1, 6],
          FOR: [1, 10],
          VOL: [1, 6],
          LOG: [1, 6],
          INT: [1, 6],
          CHA: [1, 5],
        },
        traits: [
          { name: "Œil cyclopéen", desc: RULE.oeilCyclopeen },
          { name: "Robuste 2", bonus: { monitor: 2 }, desc: RULE.robusteBonus },
          { name: "Vision thermographique", desc: RULE.visionThermo },
        ],
        originPools: ["euro", "arabe"],
      },
      Fomori: {
        baseMetatype: "Troll",
        ranges: {
          CON: [1, 9],
          AGI: [1, 6],
          RÉA: [1, 6],
          FOR: [1, 8],
          VOL: [1, 6],
          LOG: [1, 6],
          INT: [1, 6],
          CHA: [1, 7],
        },
        traits: [
          { name: "Résistance à la magie", desc: RULE.resistanceMagie },
          { name: "Robuste 2", bonus: { monitor: 2 }, desc: RULE.robusteBonus },
          { name: "Vision thermographique", desc: RULE.visionThermo },
        ],
        originPools: ["euro"],
      },
      Géant: {
        baseMetatype: "Troll",
        ranges: {
          CON: [1, 9],
          AGI: [1, 5],
          RÉA: [1, 6],
          FOR: [1, 10],
          VOL: [1, 6],
          LOG: [1, 6],
          INT: [1, 6],
          CHA: [1, 5],
        },
        traits: [
          { name: "Écorce", desc: RULE.altDermiqueEcorce },
          { name: "Robuste 2", bonus: { monitor: 2 }, desc: RULE.robusteBonus },
          { name: "Vision thermographique", desc: RULE.visionThermo },
        ],
        originPools: ["euro", "russe"],
      },
      Minotaure: {
        baseMetatype: "Troll",
        ranges: {
          CON: [1, 10],
          AGI: [1, 5],
          RÉA: [1, 6],
          FOR: [1, 9],
          VOL: [1, 6],
          LOG: [1, 6],
          INT: [1, 6],
          CHA: [1, 5],
        },
        traits: [
          { name: "Cornes perforantes", desc: RULE.cornesPerforantes },
          { name: "Robuste 2", bonus: { monitor: 2 }, desc: RULE.robusteBonus },
          { name: "Vision thermographique", desc: RULE.visionThermo },
        ],
        originPools: ["euro", "arabe"],
      },
    },

    metaconsciences: {
      Centaure: {
        baseMetatype: "Humain",
        ranges: {
          CON: [1, 8],
          AGI: [1, 6],
          RÉA: [1, 6],
          FOR: [1, 9],
          VOL: [1, 6],
          LOG: [1, 6],
          INT: [1, 6],
          CHA: [1, 6],
        },
        traits: [
          { name: "Arme naturelle (Coup de pied)", desc: RULE.armeNaturelle },
          { name: "Déplacement : 10/20/+4", desc: RULE.deplacement },
          { name: "Manaception", desc: RULE.manaception },
          { name: "Recherche", desc: RULE.recherche },
          { name: "Vision nocturne", desc: RULE.visionNocturne },
          { name: "Vision thermographique", desc: RULE.visionThermo },
        ],
        naturalWeapons: ["Coup de pied [VD 3E, SO 7+FOR/–/–/–/–]"],
        originPools: ["euro", "asiacentral"],
        mag: 1,
      },
      Naga: {
        baseMetatype: "Humain",
        ranges: {
          CON: [1, 8],
          AGI: [1, 7],
          RÉA: [1, 6],
          FOR: [1, 9],
          VOL: [1, 7],
          LOG: [1, 6],
          INT: [1, 6],
          CHA: [1, 7],
        },
        traits: [
          { name: "Animal à sang froid", desc: RULE.animalSangFroid },
          { name: "Arme naturelle (Morsure)", desc: RULE.armeNaturelle },
          { name: "Armure 4", bonus: { sd: 4 }, desc: RULE.armureFixe },
          { name: "Déplacement : 5/15/+1 (à terre), 3/12/+2 (nage)", desc: RULE.deplacement },
          { name: "Garde", desc: RULE.garde },
          { name: "Nature duale", desc: RULE.natureDuale },
          { name: "Robuste 2", bonus: { monitor: 2 }, desc: RULE.robusteBonus },
          { name: "Venin", desc: RULE.venin },
        ],
        naturalWeapons: ["Morsure [VD 3P, SO 8+FOR/–/–/–/–]"],
        originPools: ["arabe", "africain"],
        mag: 1,
      },
      Pixie: {
        baseMetatype: "Elfe",
        ranges: {
          CON: [1, 3],
          AGI: [1, 8],
          RÉA: [1, 8],
          FOR: [1, 2],
          VOL: [1, 8],
          LOG: [1, 7],
          INT: [1, 7],
          CHA: [1, 8],
        },
        traits: [
          { name: "Allergie (fer, moyenne)", desc: RULE.allergie },
          { name: "Déplacement : 2/5/+1 (marche), 10/40/+2 (vol)", desc: RULE.deplacement },
          { name: "Disparition", desc: RULE.disparition },
          { name: "Dissimulation (soi)", desc: RULE.dissimulation },
          { name: "Perception astrale", desc: RULE.perceptionAstrale },
        ],
        originPools: ["euro", "generique"],
        mag: 1,
      },
      Sasquatch: {
        baseMetatype: "Troll",
        ranges: {
          CON: [1, 10],
          AGI: [1, 6],
          RÉA: [1, 6],
          FOR: [1, 10],
          VOL: [1, 6],
          LOG: [1, 6],
          INT: [1, 6],
          CHA: [1, 6],
        },
        traits: [
          { name: "Arme naturelle (Griffes)", desc: RULE.armeNaturelle },
          { name: "Déplacement : 10/15/+1", desc: RULE.deplacement },
          { name: "Imitation", desc: RULE.imitation },
          { name: "Nature duale", desc: RULE.natureDuale },
        ],
        naturalWeapons: ["Griffes [VD 3P, SO 7+FOR/–/–/–/–]"],
        originPools: ["amerindien", "generique"],
        mag: 1,
      },
      Triton: {
        baseMetatype: "Humain",
        ranges: {
          CON: [1, 9],
          AGI: [1, 6],
          RÉA: [1, 6],
          FOR: [1, 9],
          VOL: [1, 6],
          LOG: [1, 6],
          INT: [1, 6],
          CHA: [1, 6],
        },
        traits: [
          { name: "Biosonar", desc: RULE.biosonar },
          { name: "Déplacement : 1/3/+0,5 (à terre), 10/25/+2 (nage)", desc: RULE.deplacement },
          { name: "Nature duale", desc: RULE.natureDuale },
          { name: "Robuste 2", bonus: { monitor: 2 }, desc: RULE.robusteBonus },
          { name: "Vision nocturne", desc: RULE.visionNocturne },
          { name: "Vision sous-marine", desc: RULE.visionSousMarine },
        ],
        originPools: ["polynesien", "africain"],
        mag: 1,
      },
    },

    zoocanthropes: {},
  },

  /* ============================================================
     ANARCHY 1RE ÉDITION (Anarchistes, sran_03 p.79-87, findings §13)
     17 métavariantes citées, format V1 natif (6 attrs FOR/AGI/VOL/LOG/
     CHA/CHC). Le livre donne des MODIFICATEURS PLATS (pas des plages
     indépendantes comme SR5/SR6) : `ranges` ci-dessous = plage de la
     souche (EditionAnarchy1.attrRange) DÉCALÉE du modificateur — même
     méthode qu'utilisée pour les Cyclope/Fomori/Géant/Minotaure SR5
     (souche + shift). L'Atout obligatoire (niveau imprimé) et la
     Vision raciale vivent dans `traits` (texte, pas mécanisés au-delà
     du trait affiché — cf. EditionAnarchy1.generate() pour la
     substitution des attributs, qui applique aussi le modificateur
     « PNJ » de metaMod par-dessus, comme pour toute souche).
     ============================================================ */
  anarchy1: {
    metavariants: {
      // — Souche HUMAIN —
      Nartaki: {
        baseMetatype: "Humain",
        ranges: { FOR: [1, 6], AGI: [1, 6], VOL: [1, 6], LOG: [1, 6], CHA: [1, 6], CHC: [1, 8] },
        traits: [
          {
            name: "Deux bras supplémentaires (Atout niv.1)",
            desc: `${RULE.atoutObligatoire} Effet : deux bras surnuméraires permettant 2 attaques par narration.`,
          },
          { name: "Couleur de peau atypique", desc: RULE.pigmentation },
        ],
      },
      // — Souche ELFE —
      Dryade: {
        baseMetatype: "Elfe",
        ranges: { FOR: [1, 6], AGI: [1, 7], VOL: [1, 6], LOG: [1, 6], CHA: [1, 10], CHC: [1, 6] },
        traits: [
          { name: "Vision nocturne", desc: RULE.visionNocturne },
          { name: "Atout obligatoire (niv.1)", desc: RULE.atoutNiveau },
        ],
      },
      Nocturna: {
        baseMetatype: "Elfe",
        ranges: { FOR: [1, 6], AGI: [1, 8], VOL: [1, 6], LOG: [1, 6], CHA: [1, 9], CHC: [1, 6] },
        traits: [
          { name: "Vision nocturne", desc: RULE.visionNocturne },
          {
            name: "Fourrure atypique (Atout niv.0)",
            desc: `${RULE.atoutNiveau} Effet : ${RULE.pilositeEtrange}`,
          },
        ],
      },
      "Xapiri thëpë": {
        baseMetatype: "Elfe",
        ranges: { FOR: [1, 6], AGI: [1, 8], VOL: [1, 6], LOG: [1, 6], CHA: [1, 9], CHC: [1, 6] },
        traits: [
          { name: "Vision nocturne", desc: RULE.visionNocturne },
          {
            name: "Allergie polluants (Atout niv.0)",
            desc: `${RULE.atoutNiveau} Effet : ${RULE.allergie}`,
          },
        ],
      },
      Wakyambi: {
        baseMetatype: "Elfe",
        ranges: { FOR: [1, 6], AGI: [1, 8], VOL: [1, 6], LOG: [1, 6], CHA: [1, 9], CHC: [1, 6] },
        traits: [
          { name: "Vision nocturne", desc: RULE.visionNocturne },
          { name: "Atout obligatoire (niv.2)", desc: RULE.atoutNiveau },
        ],
      },
      // — Souche NAIN —
      Gnome: {
        baseMetatype: "Nain",
        ranges: { FOR: [1, 8], AGI: [1, 6], VOL: [1, 8], LOG: [1, 7], CHA: [1, 6], CHC: [1, 6] },
        traits: [
          { name: "Vision thermographique", desc: RULE.visionThermo },
          {
            name: "Résistance arcanique + Néoténie −1 case moniteur (Atout niv.1)",
            desc: `${RULE.atoutObligatoire} Effet : résistance aux effets magiques directs et réduction d'une case de moniteur (voir ${RULE.neotenie.split(" : ")[0]}).`,
          },
        ],
      },
      Hanuman: {
        baseMetatype: "Nain",
        ranges: { FOR: [1, 9], AGI: [1, 7], VOL: [1, 7], LOG: [1, 6], CHA: [1, 6], CHC: [1, 6] },
        traits: [
          { name: "Vision thermographique", desc: RULE.visionThermo },
          {
            name: "Pattes de singe, queue préhensile, apparence simienne (Atout niv.2)",
            desc: `${RULE.atoutObligatoire} Effet : ${RULE.pattesSinges}`,
          },
        ],
      },
      Menehune: {
        baseMetatype: "Nain",
        ranges: { FOR: [1, 9], AGI: [1, 7], VOL: [1, 7], LOG: [1, 6], CHA: [1, 6], CHC: [1, 6] },
        traits: [
          { name: "Vision thermographique", desc: RULE.visionThermo },
          {
            name: "Adaptation marine (Atout niv.1)",
            desc: `${RULE.atoutObligatoire} Effet : ${RULE.doigtsPalmes}`,
          },
        ],
      },
      Koborokuru: {
        baseMetatype: "Nain",
        ranges: { FOR: [1, 8], AGI: [1, 6], VOL: [1, 7], LOG: [1, 6], CHA: [1, 6], CHC: [1, 6] },
        traits: [
          { name: "Vision thermographique", desc: RULE.visionThermo },
          {
            name: "Adepte mystique (Atout obligatoire)",
            desc: `${RULE.atoutObligatoire} Cette souche doit choisir l'Atout Adepte (mystique) à la création.`,
          },
        ],
      },
      // — Souche ORK —
      Hobgobelin: {
        baseMetatype: "Ork",
        ranges: { FOR: [1, 10], AGI: [1, 6], VOL: [1, 6], LOG: [1, 6], CHA: [1, 5], CHC: [1, 6] },
        traits: [
          { name: "Vision nocturne", desc: RULE.visionNocturne },
          {
            name: "Crocs, ouïe fine, vindicatif (Atout niv.1)",
            desc: `${RULE.atoutObligatoire} Effet : ${RULE.crocs} ${RULE.ouieFine} ${RULE.vindicatif}`,
          },
        ],
      },
      Oni: {
        baseMetatype: "Ork",
        ranges: { FOR: [1, 8], AGI: [1, 6], VOL: [1, 6], LOG: [1, 6], CHA: [1, 5], CHC: [1, 6] },
        traits: [
          { name: "Vision nocturne", desc: RULE.visionNocturne },
          { name: "Atout obligatoire (niv.1)", desc: RULE.atoutNiveau },
        ],
      },
      Ogre: {
        baseMetatype: "Ork",
        ranges: { FOR: [1, 10], AGI: [1, 6], VOL: [1, 6], LOG: [1, 6], CHA: [1, 5], CHC: [1, 6] },
        traits: [
          { name: "Vision nocturne", desc: RULE.visionNocturne },
          {
            name: "Estomac d'ogre (Atout niv.1)",
            desc: `${RULE.atoutObligatoire} Effet : ${RULE.estomacOgre}`,
          },
        ],
      },
      Satyre: {
        baseMetatype: "Ork",
        ranges: { FOR: [1, 9], AGI: [1, 7], VOL: [1, 6], LOG: [1, 6], CHA: [1, 5], CHC: [1, 6] },
        traits: [
          { name: "Vision nocturne", desc: RULE.visionNocturne },
          { name: "Atout obligatoire (niv.2)", desc: RULE.atoutNiveau },
        ],
      },
      // — Souche TROLL —
      Cyclope: {
        baseMetatype: "Troll",
        ranges: { FOR: [1, 13], AGI: [1, 5], VOL: [1, 6], LOG: [1, 5], CHA: [1, 4], CHC: [1, 6] },
        traits: [
          { name: "Vision thermographique", desc: RULE.visionThermo },
          {
            name: "−1 point de compétence (Atout niv.0)",
            desc: `${RULE.atoutNiveau} Effet : un point de compétence en moins à la création, en compensation d'un trait cosmétique (œil cyclopéen).`,
          },
        ],
      },
      Fomori: {
        baseMetatype: "Troll",
        ranges: { FOR: [1, 12], AGI: [1, 5], VOL: [1, 6], LOG: [1, 5], CHA: [1, 4], CHC: [1, 6] },
        traits: [
          { name: "Vision thermographique", desc: RULE.visionThermo },
          { name: "Atout obligatoire (niv.1)", desc: RULE.atoutNiveau },
        ],
      },
      Géant: {
        baseMetatype: "Troll",
        ranges: { FOR: [1, 12], AGI: [1, 5], VOL: [1, 6], LOG: [1, 5], CHA: [1, 4], CHC: [1, 6] },
        traits: [
          { name: "Vision thermographique", desc: RULE.visionThermo },
          {
            name: "Armure +3, −1 point de compétence (Atout niv.0)",
            desc: `${RULE.atoutNiveau} Effet : +3 en armure naturelle, compensé par un point de compétence en moins à la création.`,
          },
        ],
      },
      Minotaure: {
        baseMetatype: "Troll",
        ranges: { FOR: [1, 13], AGI: [1, 5], VOL: [1, 6], LOG: [1, 5], CHA: [1, 4], CHC: [1, 6] },
        traits: [
          { name: "Vision thermographique", desc: RULE.visionThermo },
          {
            name: "−1 point de compétence (Atout niv.2)",
            desc: `${RULE.atoutNiveau} Effet : un point de compétence en moins à la création, en compensation d'un Atout de niveau 2 (cornes perforantes).`,
          },
        ],
      },
    },
    metaconsciences: {},
    zoocanthropes: {},
  },

  /* ============================================================
     API — sélection d'édition active
     SR5 et SR6 appellent Metavariants.use(edition) avant resolve().
     Par défaut : SR5 (rétrocompatibilité totale).
     ============================================================ */

  _edition: "sr5",

  /** Sélectionne le jeu de données actif ("sr5" | "sr6" | "anarchy1") */
  use(edition) {
    const key = ["sr5", "sr6", "anarchy1"].includes(edition) ? edition : "sr5";
    if (key !== this._edition) {
      this._edition = key;
      this._index = null; // invalider l'index
    }
    return this;
  },

  /** Table clavée par édition active, source des trois getters ci-dessous. */
  _tables() {
    return {
      sr5: { metavariants: this.metavariants, metaconsciences: this.metaconsciences, zoocanthropes: this.zoocanthropes },
      sr6: this.sr6,
      anarchy1: this.anarchy1,
    }[this._edition];
  },

  /** Renvoie le jeu de métavariantes actif */
  _data() {
    return this._tables().metavariants;
  },
  _dataMC() {
    return this._tables().metaconsciences;
  },
  _dataZoo() {
    return this._tables().zoocanthropes;
  },

  /** Index plat nom→entrée pour l'édition active */
  _index: null,
  _indexEdition: null,
  _buildIndex() {
    if (this._index && this._indexEdition === this._edition) return this._index;
    const idx = {};
    for (const [name, d] of Object.entries(this._data()))
      idx[name] = { ...d, name, family: "metavariant" };
    for (const [name, d] of Object.entries(this._dataMC()))
      idx[name] = { ...d, name, family: "metaconscience" };
    for (const [name, d] of Object.entries(this._dataZoo())) {
      idx[name] = {
        ...d,
        name,
        family: "zoocanthrope",
        traits: [...d.traits, ...this.zooTraitsCommuns],
      };
    }
    this._index = idx;
    this._indexEdition = this._edition;
    return idx;
  },

  /** true si `meta` est une métavariante/conscience/zoo dans l'édition active */
  is(meta) {
    return !!this._buildIndex()[meta];
  },

  /**
   * Résout une valeur de métatype dans l'édition active.
   * null si métatype de base. Sinon { name, souche, ranges, traits[], ... }
   */
  resolve(meta) {
    return this._buildIndex()[meta] || null;
  },

  /** Souche (métatype parent) d'une valeur quelconque */
  baseMetatype(meta) {
    const r = this.resolve(meta);
    return r ? r.baseMetatype : meta;
  },

  /** Toutes les entrées d'une souche donnée, par famille (édition active) */
  byBaseMetatype(baseMetatype, family = "metavariant") {
    const src =
      family === "metaconscience"
        ? this._dataMC()
        : family === "zoocanthrope"
          ? this._dataZoo()
          : this._data();
    return Object.keys(src).filter((n) => src[n].baseMetatype === baseMetatype);
  },

  /** Structure pour construire le <select> hiérarchique du formulaire */
  groupedOptions() {
    const souches = ["Humain", "Elfe", "Nain", "Ork", "Troll"];
    return souches
      .map((s) => ({
        baseMetatype: s,
        metavariants: this.byBaseMetatype(s, "metavariant"),
      }))
      .filter((g) => g.metavariants.length > 0 || true);
  },

  /** Toutes les métaconsciences de l'édition active (liste plate) */
  allMetaconsciences() {
    return Object.keys(this._dataMC());
  },

  /** Tous les zoocanthropes de l'édition active (liste plate) */
  allZoocanthropes() {
    return Object.keys(this._dataZoo());
  },

  /* ============================================================
     PONDÉRATION DÉMOGRAPHIQUE — tirage « Aléatoire » réaliste
     Source : Run Faster, « Plus qu'une couleur de peau » (population
     mondiale 2076) — données les plus récentes disponibles.
       Humains 39 %, Orks 22 %, Elfes 15 %, Nains 14 %, Trolls 5 %.
     (Les 5 % « Autres » regroupent métavariantes + consciences, gérés
      séparément ci-dessous comme sous-population de chaque souche.)
     ============================================================ */
  souchePoids: { Humain: 39, Ork: 22, Elfe: 15, Nain: 14, Troll: 5 },

  /* Probabilité, une fois la souche tirée, qu'il s'agisse d'une
     métavariante plutôt que du métatype de base. Les métaconsciences
     (Pixie, Naga, Sasquatch…) sont quasi introuvables au hasard :
     population mondiale de l'ordre de 50 000–200 000 individus. */
  P_METACONSCIENCE: 0.004,

  /* Ajustement par souche : certaines souches ont plusieurs métavariantes
     répandues, d'autres une seule et marginale. Humain n'a qu'une
     métavariante exotique (Nartaki / Valkyrie) qui ne doit pas capter
     toute la part « variante » de la population la plus nombreuse. */
  _pMetavarianteSouche: {
    Humain: 0.012,
    Elfe: 0.06,
    Nain: 0.08,
    Ork: 0.09,
    Troll: 0.09,
  },

  _weightedSouche() {
    const entries = Object.entries(this.souchePoids);
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total;
    for (const [baseMetatype, w] of entries) {
      r -= w;
      if (r <= 0) return baseMetatype;
    }
    return "Humain";
  },

  /**
   * Tirage aléatoire pondéré d'un métatype pour l'édition active.
   * Renvoie soit un métatype de base, soit (rarement) une métavariante
   * de la souche tirée, soit (très rarement) une métaconscience.
   * Respecte la démographie canonique du Sixième Monde.
   */
  randomMeta() {
    // Métaconscience : extrêmement rare, indépendante de la souche
    const mc = this.allMetaconsciences();
    if (mc.length && Math.random() < this.P_METACONSCIENCE) {
      return Utils.rand(mc);
    }
    // Sinon : souche pondérée, puis éventuellement une de ses métavariantes
    const baseMetatype = this._weightedSouche();
    const variantes = this.byBaseMetatype(baseMetatype, "metavariant");
    const pVar = this._pMetavarianteSouche[baseMetatype] ?? 0.08;
    if (variantes.length && Math.random() < pVar) {
      return Utils.rand(variantes);
    }
    return baseMetatype;
  },
};
