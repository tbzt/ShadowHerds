"use strict";

/* ============================================================
   EXTRAS — Contacts + Runs
   Contacts SR5/SR6 : Influence (1-12) + Loyauté (1-6)
   Contacts Anarchy : atout à niveau (0-6), RR sur Réseau
   Runs : bifurqués par édition (SR5/SR6/Anarchy)

   Philosophie : les livres donnent les archétypes de référence.
   Le générateur produit une infinité de variantes cohérentes
   pour peupler le monde à la volée.
   ============================================================ */

/* ============================================================
   CONTACTS
   ============================================================ */
const Contacts = {
  /* ----
     CONTACTS SR5/SR6
     Calibrés sur SR5 p.388-396 + SR6 p.243-249
     Influence = poids du réseau du contact (1-12)
     Loyauté   = fiabilité envers le PJ (1-6)
  ---- */
  catalogueSR: [
    // ── Officiels SR5 / SR6 ─────────────────────────────────
    {
      role: "Barman / Patron de bar",
      influenceMin: 2,
      influenceMax: 4,
      desc: "Voit et entend tout dans son établissement. Relie les inconnus, garde les secrets, guide les débutants.",
      lieux: [
        "bar du quartier",
        "boîte de nuit",
        "restaurant de zone",
        "coffee-shop discret",
      ],
      similaires: "serveuse, videur, strip-teaseuse, propriétaire de karaoké",
      traits: [
        "Discret par nature",
        "Bavard après quelques verres",
        "Réglé cash uniquement",
      ],
    },
    {
      role: "Doc des rues",
      influenceMin: 3,
      influenceMax: 5,
      desc: "Soins sans SIN, sans dossier. Cyberware posé hors circuit légal, patches trauma, chirurgie d'urgence.",
      lieux: [
        "clinique clandestine",
        "bioclinique",
        "arrière-salle d'une pharmacie",
      ],
      similaires:
        "ambulancier, infirmière de quartier, mage guérisseur, vétérinaire reconverti",
      traits: [
        "Paie en services ou équipement",
        "Hors de prix en urgence",
        "Ne parle jamais aux autorités",
      ],
    },
    {
      role: "Flic des rues",
      influenceMin: 3,
      influenceMax: 5,
      desc: "Connaît son secteur comme sa poche. Peut partager infos, arranger des rencontres ou regarder ailleurs.",
      lieux: [
        "rues de son secteur",
        "café habituel",
        "commissariat en sous-main",
      ],
      similaires:
        "détective, indic, flic sous couverture, agent de sécurité véreux",
      traits: [
        "Corruptible mais pas traître",
        "Protège son territoire avant tout",
        "Mémoire longue",
      ],
    },
    {
      role: "Consiglieri de la Mafia",
      influenceMin: 5,
      influenceMax: 8,
      desc: "Accès aux secrets de la Famille, influence sur les opérations criminelles locales. Jouer double jeu est fatal.",
      lieux: ["restaurants fermés au public", "casinos", "bars blindés"],
      similaires:
        "wakagashira Yakuza, maître des encens Triade, sous-boss Vory",
      traits: [
        "Paie en faveurs autant qu'en nuyen",
        "N'oublie jamais une trahison",
        "Réseau considérable mais conditionnel",
      ],
    },
    {
      role: "Intermédiaire (Fixer)",
      influenceMin: 5,
      influenceMax: 9,
      desc: "Centre névralgique des Ombres. Arrange les runs, met en relation acheteurs et vendeurs, connaît tout le monde.",
      lieux: [
        "bars ou boîtes de nuit",
        "cafés surveillés",
        "coins où la surveillance est impossible",
      ],
      similaires: "prêteur sur gages, receleur haut de gamme, agent d'artistes",
      traits: [
        "Prend sa part sur toutes les transactions",
        "Plus il est bon, plus il est cher",
        "Ne nomme jamais ses sources",
      ],
    },
    {
      role: "Marchand de talismans",
      influenceMin: 2,
      influenceMax: 5,
      desc: "Foci magiques, réactifs rares, ingrédients rituels. Fenêtre sur la communauté Éveillée.",
      lieux: [
        "boutique de talismans",
        "librairie occulte",
        "marché couvert de zone",
      ],
      similaires:
        "intermédiaire pour Éveillés, mage chaman urbain, enchanteur indépendant",
      traits: [
        "Vend des infos sur l'activité magique locale",
        "Très chatouilleux sur la qualité",
        "Méfiant envers les non-Éveillés",
      ],
    },
    {
      role: "Mécanicien / Rigger de quartier",
      influenceMin: 2,
      influenceMax: 4,
      desc: "Répare ce qui est cassé, améliore ce qui ne l'est pas. Réseau de vendeurs de véhicules d'occasion.",
      lieux: [
        "garage du coin",
        "station service",
        "dépôt de drones",
        "hangar à avions",
      ],
      similaires:
        "crack en technologie, pilote freelance, technicien de drones",
      traits: [
        "Paie en pièces ou services",
        "Zéro paperasse",
        "Connaît tous les propriétaires de véhicules du quartier",
      ],
    },
    {
      role: "M. Johnson",
      influenceMin: 5,
      influenceMax: 9,
      desc: "Commandite les runs. Réseau multi-sphères, mémoire longue, ne pardonne pas les échecs.",
      lieux: [
        "n'importe où à sa convenance",
        "hôtels neutres",
        "via commlink chiffré",
      ],
      similaires:
        "agent corpo, agent gouvernemental, intermédiaire de haut rang",
      traits: [
        "Identité toujours floue",
        "Paie bien mais exige des résultats",
        "Peut blacklister toute une équipe",
      ],
    },
    {
      role: "Receleur",
      influenceMin: 2,
      influenceMax: 5,
      desc: "Rachète le matériel chaud, fournit de l'équipement sans trace. Prix dépressifs à l'achat, gonflés à la vente.",
      lieux: [
        "entrepôt discret",
        "marché noir",
        "boutique de seconde main façade",
      ],
      similaires: "intermédiaire, trafiquant d'armes, ferrailleur",
      traits: [
        "Ne pose jamais de questions",
        "Offre 30% de la valeur réelle",
        "Peut revendre à vos ennemis si le prix est bon",
      ],
    },
    {
      role: "Tailleur d'identités",
      influenceMin: 3,
      influenceMax: 6,
      desc: "Faux SINs, passeports, permis, dossiers effacés. La qualité a un prix — la qualité médiocre coûte plus cher encore.",
      lieux: [
        "back-room sécurisée",
        "connexion matricielle uniquement",
        "via intermédiaire",
      ],
      similaires: "hacker spécialisé, faussaire, agent gouvernemental véreux",
      traits: [
        "Travail en avance, pas à la demande",
        "Ne livre jamais deux fois au même endroit",
        "Exige moitié en avance",
      ],
    },
    {
      role: "Hacker freelance (Decker)",
      influenceMin: 2,
      influenceMax: 6,
      desc: "Infiltre les systèmes, extrait des données, efface des traces. Ne pose pas de questions sur l'utilisation.",
      lieux: [
        "n'importe où avec une connexion sécurisée",
        "paradis numérique",
        "safe house équipée",
      ],
      similaires:
        "technicien matriciel corpo, decker runner, spécialiste contre-mesures",
      traits: [
        "Délai incompressible : 48h minimum",
        "Coût indexé sur le niveau de sécurité",
        "Garde toujours une copie pour lui",
      ],
    },
    {
      role: "Agent de sécurité véreux",
      influenceMin: 2,
      influenceMax: 5,
      desc: "Vend plans de sécurité, angles morts, plannings de patrouille. Risque élevé — si grillé, il nie tout.",
      lieux: [
        "bars loin de son lieu de travail",
        "parking souterrain",
        "contact mort-vivant",
      ],
      similaires: "flic des rues, cadre corpo corrompu, vigile de nuit",
      traits: [
        "Exige paiement immédiat en cryptomonnaie",
        "Peut changer de camp si menacé",
        "Informations parfois partielles ou obsolètes",
      ],
    },
    {
      role: "Chirurgien cyberware",
      influenceMin: 3,
      influenceMax: 6,
      desc: "Pose des augmentations hors circuit légal. Discrétion garantie, prix élevé, qualité variable selon le tarif.",
      lieux: [
        "clinique privée non répertoriée",
        "arrière-salle",
        "via doc des rues de haut rang",
      ],
      similaires: "doc des rues spécialisé, biotech de labo corpo rogue",
      traits: [
        "Prix triple pour l'urgence",
        "Délai post-opératoire imposé",
        "Réputation à protéger — qualité réelle",
      ],
    },
    {
      role: "Mage / Chaman de rue",
      influenceMin: 2,
      influenceMax: 5,
      desc: "Services magiques discrets : protection rituelle, identification d'artefacts, surveillance astrale, soins.",
      lieux: [
        "sanctuaire chamanique",
        "appartement discret",
        "académie de magie alternative",
      ],
      similaires:
        "initié hermétique, marchand de talismans, guérisseur traditionnel",
      traits: [
        "Exige parfois des rituels ou faveurs ésotériques",
        "Fiable mais imprévisible",
        "Réseau dans la communauté Éveillée",
      ],
    },
    {
      role: "Contrebandier / Passeur",
      influenceMin: 3,
      influenceMax: 6,
      desc: "Transport de marchandises et personnes interdites. Routes secrètes, papiers falsifiés, pilotage sans manifeste.",
      lieux: ["port discret", "aéroport clandestin", "route de montagne NAN"],
      similaires: "pilote de location, coyote, go-ganger expérimenté",
      traits: [
        "Ponctuel ou remboursement",
        "Pas de questions sur la cargaison",
        "Demande toujours un contact de secours",
      ],
    },
    {
      role: "Chef de gang",
      influenceMin: 3,
      influenceMax: 6,
      desc: "Muscle de rue sur commande, territoire, renseignement de quartier. Loyauté conditionnelle au respect des règles.",
      lieux: [
        "territoire du gang",
        "bar de zone fortifié",
        "entrepôt ou local",
      ],
      similaires:
        "lieutenant de gang, go-ganger senior, boss de syndicat de rue",
      traits: [
        "Orgueilleux — ne tolère pas les affronts",
        "Réseau limité au quartier mais très dense",
        "Peut louer des bras",
      ],
    },
    {
      role: "Journaliste d'investigation",
      influenceMin: 2,
      influenceMax: 5,
      desc: "Dossiers croustillants, sources protégées. Peut exercer une pression médiatique ou exposer ce qui doit l'être.",
      lieux: [
        "rédaction de média indépendant",
        "cafés publics",
        "via canaux sécurisés",
      ],
      similaires:
        "blogueur des Ombres, informateur matriciel, lanceur d'alerte",
      traits: [
        "Protège ses sources mais publie tout",
        "Réseau de sources dans toutes les sphères",
        "Peut devenir encombrant si trop curieux",
      ],
    },
    {
      role: "Runner à la retraite",
      influenceMin: 3,
      influenceMax: 7,
      desc: "Expérience irremplaçable, réseau solide, équipement stocké. Encore actif à mi-temps pour les bonnes causes.",
      lieux: [
        "appartement discret hors quartier chaud",
        "bar habituel",
        "dépôt sécurisé",
      ],
      similaires:
        "mercenaire à la retraite, ancien militaire, fixer reconverti",
      traits: [
        "Connaît tout le monde depuis vingt ans",
        "Sous-traite parfois des runs à de jeunes équipes",
        "Caché mais joignable",
      ],
    },
    {
      role: "Pharmacien de rue",
      influenceMin: 2,
      influenceMax: 4,
      desc: "Drogues de combat, stims, médicaments hors circuit, composants chimiques. Discret et rapide.",
      lieux: [
        "arrière-boutique",
        "livraison à domicile",
        "via réseau de dealers",
      ],
      similaires: "chimiste clandestin, dealer haut de gamme, doc des rues",
      traits: [
        "Stock variable",
        "Exige anonymat strict",
        "Peut fournir des toxines sur commande",
      ],
    },
    {
      role: "Spécialiste des Nations Amérindiennes (NAN)",
      influenceMin: 3,
      influenceMax: 6,
      desc: "Guide dans les territoires NAN, contacts avec les Wildcats Sioux, Koshari, factions tribales.",
      lieux: [
        "frontières NAN",
        "villes de passage",
        "via intermédiaire amérindien",
      ],
      similaires: "contrebandier, chaman, officier NAN reconverti",
      traits: [
        "Méfiant envers les étrangers",
        "Connaît tous les points de passage",
        "Exige le respect du territoire",
      ],
    },
    {
      role: "Cadre corpo corrompu",
      influenceMin: 4,
      influenceMax: 8,
      desc: "Accès intérieur à une corporation : dossiers, passes, mouvements de personnel, projets secrets.",
      lieux: [
        "hôtels de standing",
        "réunions d'affaires neutres",
        "via messagerie morte",
      ],
      similaires: "agent de sécurité véreux, M. Johnson, avocat corpo",
      traits: [
        "Risque maximal si grillé — ne laisse aucune trace",
        "Exige des garanties mutuelles",
        "Peut commander des runs lui-même",
      ],
    },
    {
      role: "Médecin de combat (Doc DocWagon)",
      influenceMin: 3,
      influenceMax: 5,
      desc: "Trauma patches, chirurgie de terrain, cyberware d'urgence. Peut faire sortir quelqu'un d'une zone chaude.",
      lieux: ["ambulances blindées", "cliniques IHR", "safe house équipée"],
      similaires: "doc des rues, chirurgien corpo, infirmière de combat",
      traits: [
        "Répond en 4 minutes dans sa zone",
        "Prix très élevés",
        "Ne pose pas de questions en urgence",
      ],
    },
    {
      role: "Enquêteur privé",
      influenceMin: 3,
      influenceMax: 6,
      desc: "Surveillance, dossiers, filatures, antécédents. Accès aux bases de données légales et semi-légales.",
      lieux: ["bureau discret", "cafés du secteur", "terrain de filature"],
      similaires: "détective, flic des rues, journaliste d'investigation",
      traits: [
        "Garde une copie de tout",
        "Neutre — travaille pour qui paie",
        "Réseau dans les services publics et privés",
      ],
    },
    {
      role: "Prêtre / Aumônier de quartier",
      influenceMin: 1,
      influenceMax: 4,
      desc: "Refuge sûr, réseau de solidarité communautaire, confessionnal des rues. Non-violent mais connecté.",
      lieux: [
        "église de quartier",
        "soupe populaire",
        "centre communautaire Barrens",
      ],
      similaires: "travailleur social, chaman de rue, médecin de quartier",
      traits: [
        "N'a pas d'agenda criminel",
        "Connaît tous les habitants du quartier",
        "Peut cacher des gens sans poser de questions",
      ],
    },
  ],

  /* ----
     CONTACTS ANARCHY V2
     Catalogue officiel p.164 + contacts cohérents avec l\'univers
     Mécanique : atout contact = RR sur compétence Réseau ou spécialisation
     Niveau 2 = 10 000¥ / Niveau 4 = 20 000¥ / Niveau 5 = 25 000¥ / Niveau 6 = 30 000¥
  ---- */
  catalogueAnarchy: [
    // ── Catalogue officiel p.164 ──────────────────────────────
    {
      role: "Armurier",
      niveau: 4,
      cout: 20000,
      rr: 1,
      domaine: "Réseau (la rue et ingénierie)",
      desc: "Armes légales et illégales, munitions spéciales, modifications sur mesure. Discret, rapide, hors de prix.",
    },
    {
      role: "Avocat",
      niveau: 4,
      cout: 20000,
      rr: 2,
      domaine: "Réseau (gouvernemental)",
      desc: "Sorties de garde à vue, effacement de casiers, procédures d'urgence. Connaît les failles du système.",
    },
    {
      role: "Cadre corporatiste",
      niveau: 2,
      cout: 10000,
      rr: 1,
      domaine: "Réseau (corporatiste)",
      desc: "Accès interne, passes d'installation, renseignements sur les mouvements corpo et projets internes.",
    },
    {
      role: "Consiglieri de la Mafia",
      niveau: 4,
      cout: 20000,
      rr: 2,
      domaine: "Réseau (criminel)",
      desc: "Muscle, protection, accès aux réseaux du crime organisé. Jouer double jeu avec lui est une erreur fatale.",
    },
    {
      role: "Contrebandier",
      niveau: 4,
      cout: 20000,
      rr: 1,
      domaine: "Réseau (la rue et ingénierie)",
      desc: "Transport discret de marchandises et personnes, routes secrètes, papiers falsifiés. Ponctuel ou remboursement.",
    },
    {
      role: "Doc des rues",
      niveau: 2,
      cout: 10000,
      rr: 1,
      domaine: "Réseau (médical)",
      desc: "Soins discrets, implants sans dossier, patch trauma à portée. Ne parle jamais aux autorités.",
    },
    {
      role: "Flic sous couverture",
      niveau: 2,
      cout: 10000,
      rr: 1,
      domaine: "Réseau (gouvernemental)",
      desc: "Infos sur les enquêtes en cours, plannings de patrouille, identités brûlées. Risque mutuel élevé.",
    },
    {
      role: "Ganger",
      niveau: 2,
      cout: 10000,
      rr: 1,
      domaine: "Réseau (criminel)",
      desc: "Muscle de rue sur commande, territoire, renseignement de quartier. Loyauté conditionnelle.",
    },
    {
      role: "Intermédiaire (Fixer)",
      niveau: 5,
      cout: 25000,
      rr: 1,
      domaine: "Réseau (tous domaines)",
      desc: "Arrange les runs, met en relation, connaît tout le monde. Prend sa part — c'est son droit.",
    },
    {
      role: "Journaliste",
      niveau: 2,
      cout: 10000,
      rr: 1,
      domaine: "Réseau (médiatique)",
      desc: "Dossiers croustillants, sources protégées, pression publique. Peut devenir encombrant si trop curieux.",
    },
    {
      role: "M. Johnson",
      niveau: 6,
      cout: 30000,
      rr: 1,
      domaine: "Réseau (la rue, criminel et corporatiste)",
      desc: "Commandes de runs, paiement fiable, réseau étendu multi-sphères. Identité toujours floue.",
    },
    {
      role: "Marchand de talismans",
      niveau: 2,
      cout: 10000,
      rr: 1,
      domaine: "Réseau (magique)",
      desc: "Foci magiques, réactifs rares, ingrédients rituels. Fenêtre sur la communauté Éveillée.",
    },
    {
      role: "Mécanicien",
      niveau: 2,
      cout: 10000,
      rr: 1,
      domaine: "Réseau (ingénierie)",
      desc: "Réparations discrètes, drones, véhicules modifiés. Connaît tous les propriétaires de véhicules du quartier.",
    },
    {
      role: "Paradis numérique",
      niveau: 4,
      cout: 20000,
      rr: 1,
      domaine: "Réseau (matriciel)",
      desc: "Serveur sécurisé, programmes, données volées, accès à des informations inaccessibles autrement.",
      bonus: "RR 1 aux tests d'Électronique (recherche matricielle)",
    },
    {
      role: "Patron de bar",
      niveau: 2,
      cout: 10000,
      rr: 1,
      domaine: "Réseau (la rue)",
      desc: "Tout entend, rien oublie, lieu de rendez-vous neutre. Relie les inconnus, garde les secrets.",
    },
    {
      role: "Professeur d'université",
      niveau: 2,
      cout: 10000,
      rr: 1,
      domaine: "Réseau (universitaire)",
      desc: "Archives légales, expertise technique, couverture académique. Accès aux bibliothèques et labos.",
    },
    {
      role: "Tailleur d'identités",
      niveau: 4,
      cout: 20000,
      rr: 2,
      domaine: "Réseau (gouvernemental et la rue)",
      desc: "Faux SINs, passeports, permis. La qualité a un prix. Ne livre jamais deux fois au même endroit.",
    },
    // ── Contacts cohérents supplémentaires ───────────────────
    {
      role: "Chaman de rue",
      niveau: 3,
      cout: 15000,
      rr: 1,
      domaine: "Réseau (magique)",
      desc: "Esprits, protection rituelle, consultation astrale, surveillance de zone. Imprévisible mais efficace.",
    },
    {
      role: "Receleur",
      niveau: 3,
      cout: 15000,
      rr: 1,
      domaine: "Réseau (la rue)",
      desc: "Rachète le matériel chaud, fournit de l'équipement sans trace. Offre 30% de la valeur réelle.",
    },
    {
      role: "Chef de gang",
      niveau: 4,
      cout: 20000,
      rr: 2,
      domaine: "Réseau (criminel)",
      desc: "Territoire, protection, muscle collectif. Orgueilleux — ne tolère pas les affronts.",
    },
    {
      role: "Agent de sécurité véreux",
      niveau: 3,
      cout: 15000,
      rr: 1,
      domaine: "Réseau (corporatiste)",
      desc: "Plans de sécurité, angles morts, plannings de patrouille. Si grillé, il nie tout — et vous avec.",
    },
    {
      role: "Passeur de frontière",
      niveau: 4,
      cout: 20000,
      rr: 1,
      domaine: "Réseau (la rue et gouvernemental)",
      desc: "Routes secrètes, exfiltration internationale, documents de transit. Connaît tous les points de passage.",
    },
    {
      role: "Pilote discret",
      niveau: 3,
      cout: 15000,
      rr: 1,
      domaine: "Réseau (ingénierie)",
      desc: "Exfiltration rapide sans manifeste, drones de reconnaissance, pilotage de zone chaude.",
    },
    {
      role: "Prêtre de quartier",
      niveau: 2,
      cout: 10000,
      rr: 1,
      domaine: "Réseau (la rue)",
      desc: "Refuge sûr, réseau de solidarité, confessionnal du sprawl. Connaît tous les habitants du quartier.",
    },
    {
      role: "Decker freelance",
      niveau: 4,
      cout: 20000,
      rr: 1,
      domaine: "Réseau (matriciel)",
      desc: "Infiltration de systèmes, extraction de données, effacement de traces. Délai minimum 48h.",
      bonus: "RR 1 aux tests de Piratage (force brute)",
    },
    {
      role: "Rigger de quartier",
      niveau: 3,
      cout: 15000,
      rr: 1,
      domaine: "Réseau (ingénierie)",
      desc: "Drones de surveillance et de livraison, véhicules modifiés, exfiltration motorisée.",
    },
    {
      role: "Médecin de combat",
      niveau: 4,
      cout: 20000,
      rr: 1,
      domaine: "Réseau (médical)",
      desc: "Trauma patches, chirurgie de terrain, cyberware d'urgence. Prix élevés mais répond en urgence.",
      bonus: "RR 1 aux tests de Survie (premiers soins)",
    },
    {
      role: "Éveillé indépendant",
      niveau: 3,
      cout: 15000,
      rr: 1,
      domaine: "Réseau (magique)",
      desc: "Services magiques sur mesure : protection, identification, surveillance astrale, contre-sorts.",
    },
    {
      role: "Pharmacien de rue",
      niveau: 2,
      cout: 10000,
      rr: 1,
      domaine: "Réseau (la rue et médical)",
      desc: "Drogues de combat, stims, médicaments hors circuit. Stock variable, discret, sans trace.",
    },
    {
      role: "Enquêteur privé",
      niveau: 3,
      cout: 15000,
      rr: 1,
      domaine: "Réseau (gouvernemental et la rue)",
      desc: "Surveillance, filatures, dossiers, antécédents. Garde une copie de tout. Neutre — travaille pour qui paie.",
    },
  ],

  /* ---- Traits de personnalité des contacts ---- */
  traits: [
    // Méfiance et protocoles
    "Paranoïaque — change de lieu de rendez-vous à la dernière minute",
    "Communique uniquement par messages chiffrés à usage unique",
    "Exige une contre-vérification d'identité avant chaque contact",
    "Ne répond qu'aux messages vocaux codés, jamais aux textos",
    "Change de commlink toutes les semaines",
    // Loyauté conditionnelle
    "Loyal mais hors de prix — exige une contrepartie proportionnelle",
    "Pratique le troc — cash refusé, services ou marchandises",
    "Exige du cash nuyen — pas de crédisticks traçables",
    "A des dettes auprès d'un gang — pourrait entraîner les runners",
    "Travaille pour plusieurs factions — risque de conflit d'intérêt",
    "Récemment brûlé — plus méfiant, conditions plus dures",
    "Exige un coup de main non rémunéré à chaque faveur",
    // Disponibilité et accès
    "Uniquement disponible entre 2h et 6h du matin",
    "Joignable uniquement via un intermédiaire — jamais directement",
    "Sous surveillance corpo — les réunions dans sa zone sont risquées",
    "En cavale — impossible à joindre via les canaux normaux",
    "Se déplace constamment — localisation variable",
    // Personnalité
    "Bavard — livre toujours un peu plus qu'il ne devrait",
    "Discret — ne laisse aucune trace numérique, jamais",
    "Curieux de tout — veut toujours savoir pourquoi",
    "Professionnel froid — aucun contact inutile, toujours efficace",
    "Fan de l'Urban Brawl — organisable via le stade les soirs de match",
    "Ancien runner reconverti — nostalgique, parfois imprudent",
    "Ne sort jamais sans garde du corps discret",
    "Drogué fonctionnel — fiable, mais certains jours moins que d'autres",
    // Liens et appartenance
    "Membre discret d'une loge hermétique",
    "Ancien prisonnier d'Aztechnology — haine viscérale de la corpo",
    "Lié à la Mafia par une vieille dette — peut créer des frictions",
    "Ancienne star des médias reconvertie — encore connue du grand public",
    "Vétéran des guerres corpo — PTSD discret mais réel",
    "Éveillé non déclaré — connaît bien les deux mondes",
    "Infiltré dans une corporation — double vie stressante",
    "Informateur pour deux factions rivales — équilibre dangereux",
  ],

  /* ---- Génération ---- */
  generate() {
    const prenom = Utils.genFirstName();
    const hasHandle = Utils.randBool(0.55);
    const name = hasHandle ? `${prenom} "${Utils.genHandle()}"` : prenom;
    const trait = Utils.rand(this.traits);

    if (App.edition === "anarchy") {
      const cat = Utils.rand(this.catalogueAnarchy);
      const niveauEffectif = Utils.clamp(
        cat.niveau + Utils.rand([-1, 0, 0, 0, 1]),
        0,
        6,
      );
      const contact = {
        id: Utils.uid(),
        edition: "anarchy",
        name,
        role: cat.role,
        desc: cat.desc,
        niveau: niveauEffectif,
        cout: niveauEffectif * 5000,
        rr: cat.rr,
        domaine: cat.domaine,
        bonus: cat.bonus || null,
        trait,
      };
      if (typeof Flavor !== "undefined") Flavor.apply(contact);
      return contact;
    } else {
      const cat = Utils.rand(this.catalogueSR);
      const influence = Utils.randInt(cat.influenceMin, cat.influenceMax);
      const loyaute = Utils.randInt(1, 6);
      const contact = {
        id: Utils.uid(),
        edition: App.edition,
        name,
        role: cat.role,
        desc: cat.desc,
        influence,
        loyaute,
        lieu: Utils.rand(cat.lieux),
        similaires: cat.similaires || null,
        trait,
      };
      if (typeof Flavor !== "undefined") Flavor.apply(contact);
      return contact;
    }
  },

  initPanel() {
    const zone = document.getElementById("contacts-panel-content");
    delete zone.dataset.init;
    zone.dataset.init = "1";
    zone.innerHTML = `
      <div class="gen-actions">
        <button class="btn-primary"   onclick="Contacts.addOne()">Générer un contact</button>
        <button class="btn-secondary" onclick="Contacts.clearAll()">Effacer tout</button>
      </div>
      <div class="cards-zone" id="contacts-list"></div>`;
  },

  addOne() {
    document
      .getElementById("contacts-list")
      .prepend(ContactRenderer.render(this.generate()));
  },

  clearAll() {
    document.getElementById("contacts-list").innerHTML = "";
  },
};

/* ============================================================
   RUN GENERATOR
   Tables bifurquées par édition :
   - SR5 / SR6 : opérations corpo classiques, Big Ten, crime organisé
   - Anarchy    : types d\'opérations du livre + adaptations narratives
   ============================================================ */
const RunGen = {
  /* ---- Types de missions communs ---- */
  typesCommuns: [
    // Extraction
    "Extraction d'un scientifique corpo",
    "Extraction d'un prisonnier politique",
    "Extraction d'un agent double brûlé",
    "Extraction inversée — ramener quelqu'un de force",
    "Extraction d'un enfant de cadre corpo",
    // Vol & données
    "Vol de données (prototype corpo)",
    "Vol de données (dossiers noirs compromettants)",
    "Vol de données (localisation d'un fuyard)",
    "Espionnage industriel longue durée",
    "Copie de fichiers avant destruction du serveur",
    // Sabotage
    "Sabotage d'infrastructure corpo (usine, centrale)",
    "Sabotage matriciel (effacement de preuves)",
    "Sabotage logistique (cargaison, convoi blindé)",
    "Destruction d'un prototype avant livraison à un rival",
    "Contamination d'un stock de drogues éveillées",
    // Livraison & transport
    "Livraison discrète de colis non identifié",
    "Transport de personne protégée",
    "Convoyage de matériel de contrebande",
    "Livraison d'un message qui ne peut pas voyager électroniquement",
    // Élimination & neutralisation
    "Neutralisation d'une cible (vivante de préférence)",
    "Neutralisation d'une cible (peu importe l'état)",
    "Élimination propre d'un informateur compromis",
    "Récupération d'un espion corpo retourné",
    // Protection & escorte
    "Escorte d'un M. Johnson lors d'une négociation à risque",
    "Protection rapprochée lors d'un événement public",
    "Sécurisation d'un lieu de rendez-vous",
    // Récupération
    "Récupération d'objet volé à notre client",
    "Récupération d'un otage (famille d'un Johnson)",
    "Récupération d'un artefact magique dangereux",
    "Récupération d'une créature para-animale vivante",
    // Surveillance & infiltration
    "Infiltration et rapport (aucune action directe)",
    "Nettoyage d'une scène de crime corpo",
    "Mise en scène d'un accident sur une cible gênante",
    "Contre-opération — neutraliser une autre équipe de runners",
    "Surveillance longue durée d'un cadre corpo",
  ],

  // Types spécifiques Anarchy (narration partagée, flashbacks, runs courts)
  typesAnarchy: [
    // Vol direct
    "Vol d'une cargaison corpo en transit dans les docks",
    "Récupération d'équipement militaire volé par un gang",
    "Détournement d'un convoi de médicaments Shiawase",
    // Opérations urbaines
    "Nettoyage d'un squat pour un propriétaire corpo",
    "Protection d'un paradis numérique contre un raid",
    "Escorte d'un initié magique à travers un territoire hostile",
    // Tensions communautaires
    "Médiation armée entre deux gangs (sans tuer personne)",
    "Récupération d'un enfant enlevé par un culte magique",
    "Mise en sécurité d'un témoin gênant pour la Mafia",
    // Contre-culture & Ombres
    "Sabotage d'une campagne de propagande Humanis",
    "Exfiltration d'un lanceur d'alerte corpo",
    "Récupération de preuves compromettantes avant publication",
    // Magie & technologie
    "Sécurisation d'un site magique perturbé",
    "Extraction d'une IA développant une conscience",
    "Neutralisation d'un esprit libre devenu dangereux",
    // Courts et nerveux
    "Course contre la montre : livraison en 2 heures ou contrat annulé",
    "Un seul bâtiment, une seule nuit : extraction d'un dossier",
    "Passage de frontière NAN sous les radars",
  ],

  /* ---- Clients bifurqués par édition ---- */
  clientsSR: [
    // Big Ten
    "M. Johnson — Ares Macrotechnology (Division Arms)",
    "M. Johnson — Ares Macrotechnology (Knight Errant Security)",
    "M. Johnson — Aztechnology (Pharmachimie / Aliments)",
    "M. Johnson — Aztechnology (Magie d'entreprise)",
    "M. Johnson — Saeder-Krupp (Finance / mandate Lofwyr)",
    "M. Johnson — Saeder-Krupp (Recherche & Développement)",
    "M. Johnson — Horizon Group (Médias et RP)",
    "M. Johnson — Horizon Group (Gestion de perception)",
    "M. Johnson — Mitsuhama Computer Technologies (Robotique)",
    "M. Johnson — Renraku Computer Systems (Samouraïs rouges)",
    "M. Johnson — Shiawase Corporation (Nucléaire & Médical)",
    "M. Johnson — Evo Corporation (Transhumain & Bioware)",
    "M. Johnson — Wuxing Inc. (Commerce & Magie orientale)",
    "M. Johnson — NeoNET (Infrastructure matricielle)",
    // Crime organisé
    "Intermédiaire — Mafia (réseau UCAS)",
    "Intermédiaire — Yakuza (clan Shotozumi, Seattle)",
    "Intermédiaire — Triade (Red Dragon Association)",
    "Intermédiaire — Vory v Zakone",
    "Intermédiaire — Koshari (crime amérindien)",
    // Indépendants & gouvernements
    "M. Johnson anonyme — identité inconnue",
    "Gouvernement fantoche local (UCAS, CAS, NAN)",
    "Agence de renseignement (CIA, Lone Star Intelligence)",
    "Dragon ou représentant draconique",
    "Loge hermétique secrète",
    "Runner à la retraite qui sous-traite",
    "Fixer de haut vol",
    "Éco-terroristes (TerraFirst!)",
    "Groupe de libération métahumaine (Ork Rights Commission)",
    "Esprit libre aux motivations impénétrables",
    "Journaliste d'investigation (paie en informations)",
  ],

  clientsAnarchy: [
    // Factions lore Anarchy / Seattle
    "Johnson anonyme via intermédiaire connu",
    "Chef de gang souhaitant agrandir son territoire",
    "Éveillé cherchant à récupérer un artefact volé",
    "Cadre corpo en cavale ayant besoin d'exfiltration",
    "Journaliste voulant des preuves sans se salir les mains",
    "Famille d'un disparu dans les Barrens",
    "Chaman communautaire protégeant son quartier",
    "Hacker voulant des bras physiques pour compléter son infiltration",
    "Johnson — Ares Arms (via fixer)",
    "Johnson — Aztechnology (opération non officielle)",
    "Johnson — Renraku (récupération d'actifs)",
    "Johnson — Horizon (gestion d'image)",
    "Crime organisé — Mafia locale",
    "Crime organisé — Yakuza / Mitsuhama",
    "Communauté méta (Ork Rights, NAN)",
    "Loge hermétique secrète",
    "Dragon ou représentant — motivations inconnues",
    "Gouvernement NAN en sous-main",
  ],

  /* ---- Lieux ---- */
  lieuxSR: [
    "Gratte-ciel corpo en plein Downtown (sécurité Renraku)",
    "Complexe Ares Arms en banlieue industrielle",
    "Tour NeoNET avec accès matriciel ultra-sécurisé",
    "Siège Horizon dans les beaux quartiers (illusion & médias)",
    "Enclave extraterritoriale Aztechnology (règles aztèques)",
    "Laboratoire pharmaceutique souterrain (niveau P4)",
    "Centre commercial corpo en activité (civils présents)",
    "Centre commercial corpo abandonné (gangs et squatteurs)",
    "Résidence sécurisée en banlieue riche (murs magiques)",
    "Appartement piégé dans les Barrens",
    "Hôpital privé corpo (SIN requis à l'entrée)",
    "Club nocturne avec backroom secrète",
    "Entrepôt des docks (zone grise, Lone Star évite)",
    "Usine de recyclage cyberware (pièces grises)",
    "Centrale électrique de zone industrielle",
    "Chantier naval sous surveillance militaire",
    "Plateforme pétrolière reconvertie (offshore)",
    "Convoi blindé en transit sur l'autoroute",
    "Train cargo express intercontinental",
    "Cargo maritime avec fret illégal (Triade)",
    "Vol commercial — cible à bord avec sécurité",
    "Sous-marin cargo en eaux territoriales",
    "Zone d'exclusion nucléaire (rad-zone)",
    "Zone astrale perturbée — magie instable",
    "Quartier ork / troll des Barrens",
    "Base militaire désaffectée (matériel récupérable)",
    "Forêt amérindienne protégée (magie territoriale)",
    "Seattle Metroplex en couvre-feu nocturne",
    "Paradis numérique public (hack à ciel ouvert)",
    "Marché noir couvert (Barrens)",
  ],

  lieuxAnarchy: [
    "District industriel de Puyallup (Barrens, gangs, toxines)",
    "Waterfront de Seattle (docks, criminalité, Triade)",
    "Complexe Renraku de Bellevue (sécurité maximale)",
    "Underground de Seattle (tunnels, comunautés cachées)",
    "Université de Washington (labos, archives, accès légal)",
    "Touristville (zone de loisirs, trafic, mélange social)",
    "Zone NAN à la frontière — poste de passage",
    "Squat éveillé dans les Barrens (communauté magique)",
    "Bar de go-gangers sur l'autoroute I-5",
    "Clinique clandestine dans un sous-sol de Redmond",
    "Loft hackers dans Renton (matrices et serveurs)",
    "Paradis numérique dans le cloud Horizon",
    "Port de Seattle sous contrôle Triade",
    "Complexe corpo en périphérie (bureau + logements)",
    "Station de métro abandonnée reconvertie",
    "Marché couvert illégal des Barrens",
    "Maison de quartier communautaire (couverture)",
    "T-bird strip dans les montagnes NAN",
  ],

  /* ---- Complications ---- */
  complicationsCommunes: [
    // Trahison
    "Double trahison du Johnson — la cible était le piège dès le départ",
    "Un membre de l'équipe a été acheté avant la run",
    "Second Johnson concurrent sur la même cible",
    "Le Johnson est mort avant le paiement — qui détient les fonds ?",
    "Le vrai commanditaire est un dragon, le M. Johnson ne le savait pas",
    // Sécurité renforcée
    "Sécurité renforcée à mi-run — quelqu'un a vendu la mise",
    "Patrouille surprise (changement de planning non communiqué)",
    "Drones de couverture aérienne inattendue",
    "IA défensive non répertoriée dans les plans",
    "Mages de sécurité avec watchers astraux actifs",
    // Environnement
    "Panne de courant générale — tout passe en mode manuel",
    "Brouillage matriciel complet dans la zone",
    "Tempête — toutes exfiltrations aériennes impossibles",
    "Pollution chimique d'un labo — protection requise",
    // Humain
    "Civil innocent pris en otage dans la zone d'opération",
    "Enfant présent — changement de priorité éthique radical",
    "Ancien contact de l'équipe se retrouve du côté adverse",
    "Journaliste avec drone documente tout en direct",
    "Équipe de runners rivaux qui arrive simultanément",
    // Cible
    "La cible est déjà morte à l'arrivée",
    "La cible refuse catégoriquement de partir",
    "La cible est un double — laquelle est l'originale ?",
    "La cible est en réalité innocente — les runners le découvrent en route",
    "La cible a des pouvoirs magiques non signalés au brief",
    // Données & logistique
    "Fuite d'info — la cible sait que les runners arrivent",
    "Minuterie activée — compte à rebours déclenché",
    "Les plans du lieu datent de 3 ans — tout a été rénové",
    "Le colis livrable est vivant, conscient et paniqué",
    "Contact compromis — les infos de préparation étaient fausses",
    // Anarchy — péripéties narratives
    "Un PNJ inattendu réclame l'aide des runners en pleine opération",
    "L'objectif principal change en cours de run (le Johnson rappelle)",
    "Un esprit libre s'intéresse à l'équipe — il veut négocier",
    "Un gang local bloque l'accès au lieu — négociation ou violence",
    "La zone est déclarée interdite par les NAO pendant l'opération",
    "Une manifestation Humanis bloque l'exfiltration principale",
  ],

  /* ---- Objectifs secondaires ---- */
  objectifsSecondaires: [
    null,
    null,
    null,
    "Bonus : aucun mort parmi le personnel de sécurité ordinaire",
    "Bonus : récupérer un second fichier non mentionné au brief",
    "Bonus : faire croire à un accident — aucune trace de la run",
    "Bonus : ne déclencher aucune alarme",
    "Bonus : récupérer un prototype supplémentaire non prioritaire",
    "Bonus : photos compromettantes d'un dirigeant (chantage futur)",
    "Bonus : laisser une fausse piste pointant vers un rival corpo",
    "Bonus : récupérer les plans d'un second projet secret",
    "Bonus : exfiltrer un informateur qui se trouvait sur place",
    "Bonus : repartir avec le véhicule de sécurité (valeur marchande)",
    "Bonus : effacer toutes les traces de présence dans les logs",
    "Bonus : récupérer l'équipement cyberware du chef de la sécurité",
  ],

  difficulties: [
    "Facile",
    "Standard",
    "Difficile",
    "Très difficile",
    "Cauchemar",
  ],

  generate() {
    const ed = App?.edition || "sr5";
    const isAnarchy = ed === "anarchy";

    const types = isAnarchy
      ? [...this.typesCommuns, ...this.typesAnarchy]
      : this.typesCommuns;
    const clients = isAnarchy ? this.clientsAnarchy : this.clientsSR;
    const lieux = isAnarchy ? this.lieuxAnarchy : this.lieuxSR;

    const diff = Utils.rand(this.difficulties);
    const payMult =
      {
        Facile: 0.4,
        Standard: 1,
        Difficile: 1.8,
        "Très difficile": 3,
        Cauchemar: 5,
      }[diff] || 1;
    const baseK = Utils.randInt(5, 40) * 1000;
    const pay = Math.round((baseK * payMult) / 500) * 500;

    return {
      type: Utils.rand(types),
      client: Utils.rand(clients),
      lieu: Utils.rand(lieux),
      complication: Utils.rand(this.complicationsCommunes),
      objectif2: Utils.rand(this.objectifsSecondaires),
      payment: `${pay.toLocaleString("fr-FR")}¥ par runner`,
      difficulte: diff,
    };
  },

  initPanel() {
    const zone = document.getElementById("run-panel-content");
    delete zone.dataset.init;
    zone.dataset.init = "1";
    zone.innerHTML = `
      <div class="gen-actions">
        <button class="btn-primary"   onclick="RunGen.addOne()">Générer une run</button>
        <button class="btn-secondary" onclick="RunGen.clearAll()">Effacer tout</button>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:1rem;" id="run-list"></div>`;
  },

  addOne() {
    document
      .getElementById("run-list")
      .prepend(RunRenderer.render(this.generate()));
  },
  clearAll() {
    document.getElementById("run-list").innerHTML = "";
  },
};

/* ============================================================
   CONTACTS BOOK — contacts persistants avec groupes et notes
   Structure miroir de Shadows, mais pour les contacts
   ============================================================ */
const ContactsBook = {
  data: {
    all: [],
    groups: {},
  },
  currentGroup: "all",

  load() {
    this.data.all = Storage.get("contacts_all", []);
    this.data.groups = Storage.get("contacts_groups", {});
  },

  save() {
    Storage.set("contacts_all", this.data.all);
    Storage.set("contacts_groups", this.data.groups);
  },

  /* ---- Générer et ajouter ---- */
  generate() {
    const c = Contacts.generate();
    c.notes = "";
    this.data.all.push(c);
    // Si un groupe est sélectionné, l'y ajouter directement
    if (this.currentGroup !== "all" && this.data.groups[this.currentGroup]) {
      this.data.groups[this.currentGroup].push(c.id);
    }
    this.save();
    this.render();
    toast(`✓ ${c.name} ajouté aux contacts.`);
  },

  remove(id) {
    const c = this.data.all.find((x) => x.id === id);
    this.data.all = this.data.all.filter((x) => x.id !== id);
    for (const g of Object.keys(this.data.groups)) {
      this.data.groups[g] = this.data.groups[g].filter((i) => i !== id);
    }
    this.save();
    this.render();
    if (c) toast(`${c.name} supprimé.`);
  },

  /* ---- Édition inline ---- */
  editNote(id, value) {
    const c = this.data.all.find((x) => x.id === id);
    if (c) {
      c.notes = value;
      this.save();
    }
  },

  editField(id, field, value) {
    const c = this.data.all.find((x) => x.id === id);
    if (c) {
      if (field === "influence" || field === "loyaute" || field === "niveau") {
        c[field] = parseInt(value, 10);
      } else {
        c[field] = value;
      }
      this.save();
    }
  },

  /* ---- Édition du portrait (flavor) ---- */
  editFlavor(id, field, value) {
    const c = this.data.all.find((x) => x.id === id);
    if (!c) return;
    if (!c.flavor) c.flavor = {};
    if (field === "age") {
      const n = parseInt(value, 10);
      if (Number.isFinite(n)) c.flavor.age = n;
    } else {
      c.flavor[field] = value;
    }
    this.save();
  },

  /* ---- Relancer tout le portrait d'un contact ---- */
  rerollFlavor(id) {
    const c = this.data.all.find((x) => x.id === id);
    if (!c || typeof Flavor === "undefined") return;
    c.flavor = null;
    Flavor.apply(c);
    this.save();
    this.render();
  },

  /* ---- Groupes ---- */
  addGroup() {
    const name = prompt("Nom du groupe :");
    if (!name || !name.trim()) return;
    const key = name.trim();
    if (key === "all") {
      toast("Nom réservé.");
      return;
    }
    if (!this.data.groups[key]) this.data.groups[key] = [];
    this.save();
    this.render();
    toast(`Groupe "${key}" créé.`);
  },

  removeGroup(key) {
    if (!confirm(`Supprimer le groupe "${key}" ?`)) return;
    delete this.data.groups[key];
    if (this.currentGroup === key) this.currentGroup = "all";
    this.save();
    this.render();
  },

  renameGroup(key) {
    const newName = prompt("Nouveau nom :", key);
    if (!newName || !newName.trim() || newName.trim() === key) return;
    const newKey = newName.trim();
    if (this.data.groups[newKey]) {
      toast("Ce nom existe déjà.");
      return;
    }
    this.data.groups[newKey] = this.data.groups[key];
    delete this.data.groups[key];
    if (this.currentGroup === key) this.currentGroup = newKey;
    this.save();
    this.render();
  },

  moveToGroup(id, targetGroup) {
    for (const g of Object.keys(this.data.groups)) {
      this.data.groups[g] = this.data.groups[g].filter((i) => i !== id);
    }
    if (targetGroup !== "all" && this.data.groups[targetGroup]) {
      if (!this.data.groups[targetGroup].includes(id)) {
        this.data.groups[targetGroup].push(id);
      }
    }
    this.save();
    this.render();
  },

  groupsOf(id) {
    return Object.keys(this.data.groups).filter((g) =>
      this.data.groups[g].includes(id),
    );
  },

  switchGroup(g) {
    this.currentGroup = g;
    this.render();
  },

  /* ---- Rendu ---- */
  render() {
    this._renderSidebar();
    this._renderGrid();
  },

  initPanel() {
    this.load();
    this.render();
  },

  _renderSidebar() {
    const container = document.getElementById("contacts-group-list");
    if (!container) return;
    const groups = Object.keys(this.data.groups);

    const allActive = this.currentGroup === "all" ? "active" : "";
    let html = `<div class="group-item ${allActive}" onclick="ContactsBook.switchGroup('all')">
      <span class="group-item-icon">◈</span>
      <span class="group-item-name">Tous</span>
      <span class="group-item-count">${this.data.all.length}</span>
    </div>`;

    for (const g of groups) {
      const count = this.data.groups[g].length;
      const active = this.currentGroup === g ? "active" : "";
      const gSafe = g.replace(/'/g, "\\'");
      html += `<div class="group-item ${active}" onclick="ContactsBook.switchGroup('${gSafe}')">
        <span class="group-item-icon">▸</span>
        <span class="group-item-name">${g}</span>
        <span class="group-item-count">${count}</span>
        <span class="group-item-actions">
          <button class="btn-icon-tiny" onclick="event.stopPropagation(); ContactsBook.renameGroup('${gSafe}')" title="Renommer">✎</button>
          <button class="btn-icon-tiny danger" onclick="event.stopPropagation(); ContactsBook.removeGroup('${gSafe}')" title="Supprimer">✕</button>
        </span>
      </div>`;
    }

    container.innerHTML = html;

    const label = document.getElementById("contacts-group-label");
    if (label) {
      label.textContent =
        this.currentGroup === "all"
          ? `Tous les contacts (${this.data.all.length})`
          : `${this.currentGroup} (${(this.data.groups[this.currentGroup] || []).length})`;
    }
  },

  _renderGrid() {
    const grid = document.getElementById("contacts-grid");
    if (!grid) return;
    grid.innerHTML = "";

    let list = this.data.all;
    if (this.currentGroup !== "all") {
      const ids = this.data.groups[this.currentGroup] || [];
      list = this.data.all.filter((c) => ids.includes(c.id));
    }

    if (!list.length) {
      grid.innerHTML = `<div class="empty-state">
        <span class="empty-state-title">Aucun contact ici</span>
        Générez des contacts avec le bouton ci-dessus.
      </div>`;
      return;
    }

    const allGroups = Object.keys(this.data.groups);
    for (const c of list) {
      const card = ContactRenderer.renderPersistent(
        c,
        allGroups,
        this.groupsOf(c.id),
      );
      grid.appendChild(card);
    }
  },
};
