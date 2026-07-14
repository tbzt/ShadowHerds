"use strict";

/* ============================================================
   CONTACT GEN — données + génération de contacts.

   Domaine contact, brique « données » : catalogues (Réseaux,
   métiers…) et fabrication d'un objet contact. Ne touche ni au DOM
   du panneau (→ Contacts) ni à la persistance (→ ContactsBook).
   À ne pas confondre avec RunGen, qui génère des runs, pas des
   contacts (js/controllers/rungen.js).

   Anarchy 2.0 : on choisit un type de Réseau (parmi les 10
   officiels, p.163) et une Réduction de Risque (RR 1-3). Le coût
   en points d'atout en découle directement de la règle (p.59) :
     - RR sur une spécialisation de Réseau = +2 / niveau
     - RR sur la compétence Réseau entière = +5 / niveau
   La valeur de RR « représente à la fois la loyauté et le réseau
   du contact » (p.164).

   SR5 / SR6 : on génère un contact pertinent en filtrant par
   grand métier, métatype et genre, plutôt qu'au hasard.
   ============================================================ */
const ContactGen = {
  /* ---- Les 10 Réseaux officiels d'Anarchy 2.0 (p.163) ---- */
  NETWORKS: [
    { id: "corporatiste", label: "Corporatiste", desc: "Employés et cadres des AAA et corpos locales : informations corporatistes et politiques, parfois du matériel, rarement des services." },
    { id: "criminel", label: "Criminel", desc: "Crime organisé (Mafia, Yakuza, grands gangs) : biens illégaux et services peu légaux. Être redevable a un prix." },
    { id: "rue", label: "La rue", desc: "Acteurs indépendants du crime, des petits gangers aux runners, contrebandiers, receleurs, barmen. Beaucoup de services à qui peut payer." },
    { id: "gouvernemental", label: "Gouvernemental", desc: "Agents de l'État et corpos régaliennes (Lone Star…) : faire retomber la pression, laisser fuiter une enquête, revendre une saisie." },
    { id: "ingenierie", label: "Ingénierie", desc: "Tout ce qui touche à la mécanique et au bâtiment : pilotes, mécaniciens, pièces, démolition. Beaucoup de matériel lié à leur activité." },
    { id: "magique", label: "Magique", desc: "Profils Éveillés hétéroclites, des apprentis aux chercheurs et marchands de talismans : infos, services et matériel liés à la magie." },
    { id: "matriciel", label: "Matriciel", desc: "Hackers de garage, administrateurs de paradis de données, professionnels : infos, services et matériel liés à la Matrice." },
    { id: "mediatique", label: "Médiatique", desc: "Des deux côtés de la caméra : journalistes, éditeurs, simstars. Beaucoup de services, des infos s'ils ont enquêté, peu de matériel." },
    { id: "medical", label: "Médical", desc: "Infirmiers, médecins, chirurgiens, pharmaciens : soins quand une run tourne mal, mais aussi cyberware et drogues." },
    { id: "universitaire", label: "Universitaire", desc: "Enseignants et chercheurs, pointus dans leur domaine : la connaissance théorique qui fait la différence." },
  ],

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
      role: "Spécialiste des Nations des autochtones d'Amérique (NAA)",
      influenceMin: 3,
      influenceMax: 6,
      desc: "Guide dans les territoires NAA, contacts avec les Wildcats Sioux, Koshari, factions tribales.",
      lieux: [
        "frontières NAA",
        "villes de passage",
        "via intermédiaire amérindien",
      ],
      similaires: "contrebandier, chaman, officier NAA reconverti",
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
        "réunions d'affaires",
        "via messagerie",
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
      lieux: ["ambulance blindée", "clinique", "planque équipée"],
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
      lieux: ["bureau discret", "cafés du secteur", "sur le terrain"],
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
        "centre communautaire des barrens",
        "underground district",
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
      level: 4,
      cout: 20000,
      rr: 1,
      domaine: "Réseau (la rue et ingénierie)",
      desc: "Armes légales et illégales, munitions spéciales, modifications sur mesure. Discret, rapide, hors de prix.",
    },
    {
      role: "Avocat",
      level: 4,
      cout: 20000,
      rr: 2,
      domaine: "Réseau (gouvernemental)",
      desc: "Sorties de garde à vue, effacement de casiers, procédures d'urgence. Connaît les failles du système.",
    },
    {
      role: "Cadre corporatiste",
      level: 2,
      cout: 10000,
      rr: 1,
      domaine: "Réseau (corporatiste)",
      desc: "Accès interne, passes d'installation, renseignements sur les mouvements corpo et projets internes.",
    },
    {
      role: "Consiglieri de la Mafia",
      level: 4,
      cout: 20000,
      rr: 2,
      domaine: "Réseau (criminel)",
      desc: "Muscle, protection, accès aux réseaux du crime organisé. Jouer double jeu avec lui est une erreur fatale.",
    },
    {
      role: "Contrebandier",
      level: 4,
      cout: 20000,
      rr: 1,
      domaine: "Réseau (la rue et ingénierie)",
      desc: "Transport discret de marchandises et personnes, routes secrètes, papiers falsifiés. Ponctuel ou remboursement.",
    },
    {
      role: "Doc des rues",
      level: 2,
      cout: 10000,
      rr: 1,
      domaine: "Réseau (médical)",
      desc: "Soins discrets, implants sans dossier, patch trauma à portée. Ne parle jamais aux autorités.",
    },
    {
      role: "Flic sous couverture",
      level: 2,
      cout: 10000,
      rr: 1,
      domaine: "Réseau (gouvernemental)",
      desc: "Infos sur les enquêtes en cours, plannings de patrouille, identités brûlées. Risque mutuel élevé.",
    },
    {
      role: "Ganger",
      level: 2,
      cout: 10000,
      rr: 1,
      domaine: "Réseau (criminel)",
      desc: "Muscle de rue sur commande, territoire, renseignement de quartier. Loyauté conditionnelle.",
    },
    {
      role: "Intermédiaire (Fixer)",
      level: 5,
      cout: 25000,
      rr: 1,
      domaine: "Réseau (tous domaines)",
      desc: "Arrange les runs, met en relation, connaît tout le monde. Prend sa part — c'est son droit.",
    },
    {
      role: "Journaliste",
      level: 2,
      cout: 10000,
      rr: 1,
      domaine: "Réseau (médiatique)",
      desc: "Dossiers croustillants, sources protégées, pression publique. Peut devenir encombrant si trop curieux.",
    },
    {
      role: "M. Johnson",
      level: 6,
      cout: 30000,
      rr: 1,
      domaine: "Réseau (la rue, criminel et corporatiste)",
      desc: "Commandes de runs, paiement fiable, réseau étendu multi-sphères. Identité toujours floue.",
    },
    {
      role: "Marchand de talismans",
      level: 2,
      cout: 10000,
      rr: 1,
      domaine: "Réseau (magique)",
      desc: "Foci magiques, réactifs rares, ingrédients rituels. Fenêtre sur la communauté Éveillée.",
    },
    {
      role: "Mécanicien",
      level: 2,
      cout: 10000,
      rr: 1,
      domaine: "Réseau (ingénierie)",
      desc: "Réparations discrètes, drones, véhicules modifiés. Connaît tous les propriétaires de véhicules du quartier.",
    },
    {
      role: "Paradis numérique",
      level: 4,
      cout: 20000,
      rr: 1,
      domaine: "Réseau (matriciel)",
      desc: "Serveur sécurisé, programmes, données volées, accès à des informations inaccessibles autrement.",
      bonus: "RR 1 aux tests d'Électronique (recherche matricielle)",
    },
    {
      role: "Patron de bar",
      level: 2,
      cout: 10000,
      rr: 1,
      domaine: "Réseau (la rue)",
      desc: "Tout entend, rien oublie, lieu de rendez-vous neutre. Relie les inconnus, garde les secrets.",
    },
    {
      role: "Professeur d'université",
      level: 2,
      cout: 10000,
      rr: 1,
      domaine: "Réseau (universitaire)",
      desc: "Archives légales, expertise technique, couverture académique. Accès aux bibliothèques et labos.",
    },
    {
      role: "Tailleur d'identités",
      level: 4,
      cout: 20000,
      rr: 2,
      domaine: "Réseau (gouvernemental et la rue)",
      desc: "Faux SINs, passeports, permis. La qualité a un prix. Ne livre jamais deux fois au même endroit.",
    },
    // ── Contacts cohérents supplémentaires ───────────────────
    {
      role: "Chaman de rue",
      level: 3,
      cout: 15000,
      rr: 1,
      domaine: "Réseau (magique)",
      desc: "Esprits, protection rituelle, consultation astrale, surveillance de zone. Imprévisible mais efficace.",
    },
    {
      role: "Receleur",
      level: 3,
      cout: 15000,
      rr: 1,
      domaine: "Réseau (la rue)",
      desc: "Rachète le matériel chaud, fournit de l'équipement sans trace. Offre 30% de la valeur réelle.",
    },
    {
      role: "Chef de gang",
      level: 4,
      cout: 20000,
      rr: 2,
      domaine: "Réseau (criminel)",
      desc: "Territoire, protection, muscle collectif. Orgueilleux — ne tolère pas les affronts.",
    },
    {
      role: "Agent de sécurité véreux",
      level: 3,
      cout: 15000,
      rr: 1,
      domaine: "Réseau (corporatiste)",
      desc: "Plans de sécurité, angles morts, plannings de patrouille. Si grillé, il nie tout — et vous avec.",
    },
    {
      role: "Passeur de frontière",
      level: 4,
      cout: 20000,
      rr: 1,
      domaine: "Réseau (la rue et gouvernemental)",
      desc: "Routes secrètes, exfiltration internationale, documents de transit. Connaît tous les points de passage.",
    },
    {
      role: "Pilote discret",
      level: 3,
      cout: 15000,
      rr: 1,
      domaine: "Réseau (ingénierie)",
      desc: "Exfiltration rapide sans manifeste, drones de reconnaissance, pilotage de zone chaude.",
    },
    {
      role: "Prêtre de quartier",
      level: 2,
      cout: 10000,
      rr: 1,
      domaine: "Réseau (la rue)",
      desc: "Refuge sûr, réseau de solidarité, confessionnal du sprawl. Connaît tous les habitants du quartier.",
    },
    {
      role: "Decker freelance",
      level: 4,
      cout: 20000,
      rr: 1,
      domaine: "Réseau (matriciel)",
      desc: "Infiltration de systèmes, extraction de données, effacement de traces. Délai minimum 48h.",
      bonus: "RR 1 aux tests de Piratage (force brute)",
    },
    {
      role: "Rigger de quartier",
      level: 3,
      cout: 15000,
      rr: 1,
      domaine: "Réseau (ingénierie)",
      desc: "Drones de surveillance et de livraison, véhicules modifiés, exfiltration motorisée.",
    },
    {
      role: "Médecin de combat",
      level: 4,
      cout: 20000,
      rr: 1,
      domaine: "Réseau (médical)",
      desc: "Trauma patches, chirurgie de terrain, cyberware d'urgence. Prix élevés mais répond en urgence.",
      bonus: "RR 1 aux tests de Survie (premiers soins)",
    },
    {
      role: "Éveillé indépendant",
      level: 3,
      cout: 15000,
      rr: 1,
      domaine: "Réseau (magique)",
      desc: "Services magiques sur mesure : protection, identification, surveillance astrale, contre-sorts.",
    },
    {
      role: "Pharmacien de rue",
      level: 2,
      cout: 10000,
      rr: 1,
      domaine: "Réseau (la rue et médical)",
      desc: "Drogues de combat, stims, médicaments hors circuit. Stock variable, discret, sans trace.",
    },
    {
      role: "Enquêteur privé",
      level: 3,
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

  /** Coût en points d'atout selon la cible de la RR.
      Spécialisation (un seul Réseau) : 2/niveau. Compétence entière : 5/niveau. */
  atoutCost(rr, scope = "specialisation") {
    const per = scope === "competence" ? 5 : 2;
    return Math.max(0, rr) * per;
  },

  /** Libellé du domaine pour l'affichage : « Réseau (criminel) ». */
  domaineLabel(networkId, scope = "specialisation") {
    if (scope === "competence") return "Réseau (tous domaines)";
    const n = this.NETWORKS.find((x) => x.id === networkId);
    return `Réseau (${n ? n.label.toLowerCase() : networkId})`;
  },

  /* ---- Grands métiers SR (catégories de contacts) ----
     Chaque catégorie pointe vers des mots-clés de rôle pour filtrer
     le catalogue existant, et un Réseau Anarchy équivalent. */
  SR_CATEGORIES: [
    { id: "rue", label: "Pègre & rue", roles: ["ganger", "chef de gang", "receleur", "contrebandier", "passeur", "barman", "patron de bar", "intermédiaire", "fixer"] },
    { id: "corpo", label: "Corporatiste", roles: ["cadre corpo", "cadre corporatiste", "agent de sécurité", "m. johnson", "johnson"] },
    { id: "securite", label: "Sécurité & loi", roles: ["flic", "enquêteur", "avocat", "agent de sécurité"] },
    { id: "medical", label: "Médical", roles: ["doc", "médecin", "chirurgien", "pharmacien"] },
    { id: "magique", label: "Magique", roles: ["chaman", "mage", "marchand de talismans", "éveillé", "prêtre", "aumônier"] },
    { id: "matrice", label: "Matrice & tech", roles: ["decker", "hacker", "paradis numérique", "rigger", "mécanicien", "pilote"] },
    { id: "media", label: "Médias & savoir", roles: ["journaliste", "professeur", "enquêteur"] },
  ],

  /* ---- Métatypes proposés ---- */
  METATYPES: ["Aléatoire", "Humain", "Ork", "Elfe", "Nain", "Troll"],
  GENDERS: ["Aléatoire", "Homme", "Femme"],

  /** Correspondance tag de contact (réseau Anarchy via _roleTags, ou
      categoryId SR via SR_CATEGORIES) → milieu Coherence. Sert à déployer un
      PNJ cohérent depuis un contact (bouton « Déployer en PNJ »,
      ContactsBook.deployPNJ) sans mapper le libellé du contact à un
      archétype nommé — le milieu suffit à Coherence.pickArchetype. */
  CONTACT_TAG_TO_MILIEU: {
    corpo: "corpo",
    crime: "crime",
    rue: "rue",
    police: "police",
    tech: "ombres",
    magique: "ombres",
    matrice: "ombres",
    securite: "securite_corpo",
    medical: "ombres",
    media: "rue",
  },

  /** Milieu Coherence déduit du tag du contact, ou null (tirage non
      contraint) si le contact n'a pas de tag ou qu'il n'est pas mappé. */
  milieuForContact(c) {
    const tag = (c.role_tags || [])[0];
    return this.CONTACT_TAG_TO_MILIEU[tag] || null;
  },

  /**
   * Point d'entrée unique : route vers generateAnarchy/generateSR selon
   * l'édition. Anarchy (atout+RR) et SR5/SR6 (Influence/Loyauté) sont des
   * modèles de contact structurellement différents, pas une propriété
   * scalaire — le dispatch reste ici plutôt que chez l'appelant.
   * @param {object} opts { networkId, rr, scope, categoryId, metatype, gender }
   */
  generate(edition, opts = {}) {
    return App.getEditionModule(edition)?.usesRiskPanel
      ? this.generateAnarchy(opts, edition)
      : this.generateSR(edition, opts);
  },

  /**
   * Génère un contact Anarchy dirigé.
   * @param {object} opts { networkId, rr (1-3), scope, metatype, gender }
   */
  generateAnarchy(opts = {}, edition = "anarchy2") {
    const networkId = opts.networkId || Utils.rand(this.NETWORKS).id;
    const rr = Utils.clamp(opts.rr || 1, 1, 3);
    const scope = opts.scope === "competence" ? "competence" : "specialisation";

    // Choisir un rôle cohérent avec le Réseau depuis le catalogue.
    const cat = this._pickAnarchyRole(networkId);

    const name = this._makeName();
    // Le niveau d'atout reflète la RR : un contact RR2-3 est un atout fort.
    // On garde le niveau lisible (1-6) corrélé à la RR mais avec variation.
    const level = Utils.clamp(rr * 2 + Utils.rand([-1, 0, 0, 1]), 1, 6);

    const contact = {
      id: Utils.uid(),
      type: "contact", // CO-a : garde CardRenderer.isContact (carte partagée)
      edition,
      name,
      role: cat ? cat.role : this._roleForNetwork(networkId),
      desc: cat ? cat.desc : this._descForNetwork(networkId),
      level,
      cout: level * 5000, // nuyen indicatif (train de vie)
      atoutCost: this.atoutCost(rr, scope), // coût en points d'atout (règle)
      rr,
      scope,
      networkId,
      domaine: this.domaineLabel(networkId, scope),
      bonus: cat ? cat.bonus || null : null,
      metatype: this._resolveMeta(opts.metatype),
      trait: Utils.rand(this.traits),
    };
    contact.role_tags = this._roleTags(networkId);
    Flavor.apply(contact);
    return contact;
  },

  /**
   * Génère un contact SR5/SR6 dirigé.
   * @param {object} opts { categoryId, metatype, gender }
   */
  generateSR(edition, opts = {}) {
    const cat = this._pickSRRole(opts.categoryId);
    const name = this._makeName();
    const influence = Utils.randInt(cat.influenceMin ?? 2, cat.influenceMax ?? 6);
    const loyaute = Utils.randInt(1, 6);

    const contact = {
      id: Utils.uid(),
      type: "contact", // CO-a : garde CardRenderer.isContact (carte partagée)
      edition,
      name,
      role: cat.role,
      desc: cat.desc,
      influence,
      loyaute,
      lieu: cat.lieux ? Utils.rand(cat.lieux) : null,
      similaires: cat.similaires || null,
      metatype: this._resolveMeta(opts.metatype),
      trait: Utils.rand(this.traits),
    };
    contact.role_tags = opts.categoryId ? [opts.categoryId] : null;
    Flavor.apply(contact);
    return contact;
  },

  /**
   * Construit un contact SAISI À LA MAIN (ajout rapide depuis une fiche PJ,
   * cf. ContactsBook.createManual / ContactCreate). Même dispatch structurel
   * que generate() (`usesRiskPanel`) : on ne bâtit PAS un tirage aléatoire, on
   * n'écrit que ce que l'utilisateur a fourni, avec des défauts neutres pour
   * garder le contact bien formé (et éditable ensuite sur sa fiche). Pas de
   * Flavor.apply : la saisie est assumée manuelle, le portrait reste
   * re-générable via ContactsBook.rerollFlavor.
   * @param {object} fields { name, role?, metatype?, influence?, loyaute?, level?, rr? }
   */
  buildManual(edition, fields = {}) {
    const base = {
      id: Utils.uid(),
      type: "contact", // CO-a : garde CardRenderer.isContact (carte partagée)
      edition,
      name: (fields.name || "").trim(),
      role: (fields.role || "").trim(),
      desc: "",
      metatype: this._resolveMeta(fields.metatype),
      trait: null,
      role_tags: null,
    };
    if (App.getEditionModule(edition)?.usesRiskPanel) {
      return Object.assign(base, {
        level: Utils.clamp(parseInt(fields.level, 10) || 1, 0, 6),
        rr: Utils.clamp(parseInt(fields.rr, 10) || 1, 1, 3),
        scope: "specialisation",
      });
    }
    return Object.assign(base, {
      influence: Utils.clamp(parseInt(fields.influence, 10) || 1, 1, 12),
      loyaute: Utils.clamp(parseInt(fields.loyaute, 10) || 1, 1, 6),
    });
  },

  /* ---- Helpers ---- */

  _makeName() {
    const firstName = Utils.genFirstName();
    const hasHandle = Utils.randBool(0.55);
    return hasHandle ? `${firstName} "${Utils.genHandle()}"` : firstName;
  },

  _resolveMeta(meta) {
    if (!meta || meta === "Aléatoire") return Utils.randMeta();
    return meta;
  },

  /** Tags de contexte pour le flavor selon le Réseau. */
  _roleTags(networkId) {
    const map = {
      corporatiste: ["corpo"],
      criminel: ["crime"],
      rue: ["rue"],
      gouvernemental: ["police"],
      ingenierie: ["tech"],
      magique: ["magique"],
      matriciel: ["matrice"],
      mediatique: ["civil"],
      medical: ["civil"],
      universitaire: ["civil"],
    };
    return map[networkId] || ["civil"];
  },

  /** Sélectionne dans le catalogue Anarchy un rôle dont le domaine
      correspond au Réseau demandé (ou un domaine multiple le contenant). */
  _pickAnarchyRole(networkId) {
    const target = this._networkKeyword(networkId);
    const pool = (this.catalogueAnarchy || []).filter((c) => {
      const d = (c.domaine || "").toLowerCase();
      return d.includes(target) || d.includes("tous domaines");
    });
    if (!pool.length) {
      // fallback : tous domaines, sinon n'importe lequel
      const any = (this.catalogueAnarchy || []).filter((c) =>
        (c.domaine || "").toLowerCase().includes("tous domaines"),
      );
      return Utils.rand(any.length ? any : this.catalogueAnarchy || [null]);
    }
    return Utils.rand(pool);
  },

  _networkKeyword(networkId) {
    const map = {
      corporatiste: "corporatiste",
      criminel: "criminel",
      rue: "la rue",
      gouvernemental: "gouvernemental",
      ingenierie: "ingénierie",
      magique: "magique",
      matriciel: "matriciel",
      mediatique: "médiatique",
      medical: "médical",
      universitaire: "universitaire",
    };
    return map[networkId] || networkId;
  },

  _roleForNetwork(networkId) {
    const n = this.NETWORKS.find((x) => x.id === networkId);
    return n ? `Contact ${n.label.toLowerCase()}` : "Contact";
  },

  _descForNetwork(networkId) {
    const n = this.NETWORKS.find((x) => x.id === networkId);
    return n ? n.desc : "";
  },

  /** Sélectionne un rôle SR cohérent avec la catégorie de métier. */
  _pickSRRole(categoryId) {
    const catalogue = this.catalogueSR || [];
    if (!categoryId || categoryId === "any") return Utils.rand(catalogue);
    const def = this.SR_CATEGORIES.find((c) => c.id === categoryId);
    if (!def) return Utils.rand(catalogue);
    const pool = catalogue.filter((c) => {
      const role = (c.role || "").toLowerCase();
      return def.roles.some((kw) => role.includes(kw));
    });
    return Utils.rand(pool.length ? pool : catalogue);
  },
};
