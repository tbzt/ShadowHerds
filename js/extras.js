"use strict";

/* ============================================================
   CONTACTS GENERATOR
   SR5/SR6 : Influence (1-12) + Loyauté (1-6) — p.388-394 SR5
   Anarchy  : Atout à niveau (0-6), RR sur Réseau
   ============================================================ */
const Contacts = {
  /* ----
     CONTACTS SR5/SR6
     Calibrés sur les exemples officiels p.392-396
     Influence = réseau du contact (1-12)
     Loyauté   = fiabilité envers le PJ (1-6)
  ---- */
  catalogueSR: [
    // --- Officiels du livre de base SR5 ---
    {
      role: "Barman",
      influenceMin: 2,
      influenceMax: 4,
      desc: "Sert de conseiller ou de psy. Voit et entend tout dans son établissement.",
      lieux: ["bar du coin", "boîte de nuit", "restaurant de quartier"],
      similaires: "patron de bar, serveuse, strip-teaseuse, videur",
      competences: [
        "Alcools 6",
        "Culture générale 6",
        "Rumeurs de la rue 6",
        "Sports 6",
        "Stars des médias 5",
      ],
    },
    {
      role: "Doc des rues",
      influenceMin: 3,
      influenceMax: 5,
      desc: "Soins discrets sans poser de questions. Peut poser du cyberware hors circuit légal.",
      lieux: ["clinique locale", "bioclinique", "arrière-boutique"],
      similaires:
        "équipe médicale d'urgence, ambulancier, mage / chaman urbain",
      competences: [
        "Cybertechnologie 7",
        "Médecine 8",
        "Négociation 4",
        "Perception 6",
        "Premiers soins 6",
      ],
    },
    {
      role: "Flic des rues",
      influenceMin: 3,
      influenceMax: 5,
      desc: "Connaît tous les coins et recoins de son secteur. Peut partager des infos et arranger des rencontres.",
      lieux: ["rues de son secteur", "cafés", "commissariat"],
      similaires: "détective, flic-à-louer, flic sous couverture, indic",
      competences: [
        "Armes automatiques 4",
        "Combat à mains nues 5",
        "Course 4",
        "Étiquette (La rue) 6",
        "Intimidation 5",
        "Leadership 4",
        "Perception 6",
        "Pistolets 6",
      ],
    },
    {
      role: "Consiglieri de la Mafia",
      influenceMin: 5,
      influenceMax: 7,
      desc: "Informations sur la famille et influence directe sur les opérations criminelles locales.",
      lieux: ["restaurants", "casinos", "bars"],
      similaires: "maître des encens des Triades, wakagashira de la Yakuza",
      competences: [
        "Enseignement 6",
        "Étiquette (Mafia) 7",
        "Informatique 5",
        "Leadership 7",
        "Négociation 6",
        "Perception 6",
        "Pistolets 3",
      ],
    },
    {
      role: "Intermédiaire (Fixer)",
      influenceMin: 5,
      influenceMax: 8,
      desc: "Centre de l'univers des shadowrunners. Arrange les runs, met en relation acheteurs et vendeurs.",
      lieux: [
        "bars ou boîtes de nuit du coin",
        "cafés",
        "coins où la surveillance est impossible",
      ],
      similaires: "M. Johnson, prêteur sur gages, receleur",
      competences: [
        "Étiquette (La rue) 8",
        "Informatique 7",
        "Négociation 9",
        "Perception 6",
        "Pistolets 5",
      ],
    },
    {
      role: "Marchand de talismans",
      influenceMin: 2,
      influenceMax: 4,
      desc: "Grande source d'équipement magique et d'infos sur la communauté Éveillée locale.",
      lieux: ["boutique de talismans", "librairie occulte", "cafés"],
      similaires: "intermédiaire, mage / chaman urbain, mage corpo",
      competences: [
        "Arcanes 6",
        "Artisanat 5",
        "Enchantement (GC) 6",
        "Étiquette (Magie) 5",
        "Négociation 6",
        "Observation astrale 6",
      ],
    },
    {
      role: "Mécanicien",
      influenceMin: 2,
      influenceMax: 4,
      desc: "Répare ce qui est abîmé, améliore ce qui ne l'est pas. Connaît aussi le marché des véhicules d'occasion.",
      lieux: [
        "garage du coin",
        "station service",
        "boutique de pièces détachées",
        "hangar à avions",
      ],
      similaires: "crack en technologie",
      competences: [
        "Armes de véhicules 3",
        "Hardware 6",
        "Informatique 4",
        "Mécanique aéronautique 6",
        "Mécanique automobile 8",
        "Mécanique industrielle 4",
        "Véhicules terrestres 6",
      ],
    },
    {
      role: "M. Johnson",
      influenceMin: 5,
      influenceMax: 8,
      desc: "Commandite les runs. Dispose d'un réseau multi-sphères et paie pour des résultats.",
      lieux: ["à peu près n'importe où il le désire"],
      similaires: "agent corporatiste, agent gouvernemental, intermédiaire",
      competences: [
        "Escroquerie 4",
        "Étiquette (Corporations) 7",
        "Informatique 6",
        "Intimidation 4",
        "Négociation 8",
        "Perception 5",
        "Pistolets 5",
      ],
    },
    // --- Contacts supplémentaires cohérents SR ---
    {
      role: "Receleur",
      influenceMin: 2,
      influenceMax: 5,
      desc: "Rachète du matériel sans poser de questions. Fourni également de l'équipement d'occasion.",
      lieux: ["entrepôt discret", "marché noir", "boutique de seconde main"],
      similaires: "intermédiaire, trafiquant d'armes",
      competences: ["Évaluation 7", "Négociation 6", "Réseau criminel 6"],
    },
    {
      role: "Faussaire",
      influenceMin: 3,
      influenceMax: 6,
      desc: "Faux SINs, passeports, permis de toutes sortes. Le prix dépend de la qualité.",
      lieux: ["back-room sécurisée", "n'importe où avec un bon commlink"],
      similaires: "hacker, agent gouvernemental véreux",
      competences: ["Contrefaçon 8", "Electronique (GC) 6", "Hacking 7"],
    },
    {
      role: "Hacker freelance",
      influenceMin: 2,
      influenceMax: 5,
      desc: "Infiltre les systèmes et vend des données. Ne pose pas de questions sur l'utilisation.",
      lieux: ["n'importe où avec une connexion sécurisée"],
      similaires: "decker runner, technicien matriciel, paradis numérique",
      competences: [
        "Cybercombat 7",
        "Électronique (GC) 6",
        "Hacking (GC) 8",
        "Informatique 6",
      ],
    },
    {
      role: "Agent de sécurité véreux",
      influenceMin: 2,
      influenceMax: 4,
      desc: "Vend les plans de sécurité, les angles morts et les plannings de patrouille.",
      lieux: ["bars loin de son lieu de travail", "parking souterrain"],
      similaires: "flic des rues, cadre corpo corrompu",
      competences: [
        "Armes automatiques 4",
        "Perception 5",
        "Procédures de sécurité 6",
      ],
    },
    {
      role: "Chirurgien cyberware",
      influenceMin: 3,
      influenceMax: 5,
      desc: "Pose des augmentations hors circuit légal. Prix élevé mais discrétion garantie.",
      lieux: ["clinique privée", "arrière-salle"],
      similaires: "doc des rues, médecin corpo",
      competences: ["Cybertechnologie 9", "Médecine 8", "Premiers soins 6"],
    },
    {
      role: "Mage de rue",
      influenceMin: 2,
      influenceMax: 5,
      desc: "Services magiques discrets, identification d'artefacts, protection rituelle.",
      lieux: [
        "sanctuaire chamanique",
        "appartement discret",
        "académie de magie de rue",
      ],
      similaires:
        "chaman urbain, marchand de talismans, hermétiste indépendant",
      competences: [
        "Conjuration (GC) 5",
        "Lancer de sorts 6",
        "Observation astrale 5",
      ],
    },
    {
      role: "Contrebandier",
      influenceMin: 3,
      influenceMax: 5,
      desc: "Transport de marchandises et personnes interdites. Connaît toutes les routes secrètes.",
      lieux: ["port discret", "aéroport clandestin", "route de campagne"],
      similaires: "pilote de location, passeur de frontière, coyote",
      competences: [
        "Armes automatiques 4",
        "Ingénierie (véhicules) 5",
        "Pilotage (GC) 6",
      ],
    },
    {
      role: "Chef de gang",
      influenceMin: 3,
      influenceMax: 6,
      desc: "Muscles, territoire, renseignement de quartier. Peut louer des bras.",
      lieux: ["territoire du gang", "bar de zone", "entrepôt"],
      similaires: "lieutenant de gang, go-ganger",
      competences: [
        "Armes automatiques 5",
        "Combat à mains nues 6",
        "Intimidation 7",
        "Leadership 5",
      ],
    },
    {
      role: "Journaliste d'investigation",
      influenceMin: 2,
      influenceMax: 5,
      desc: "Dossiers croustillants, sources protégées. Peut exercer une pression médiatique.",
      lieux: ["rédaction", "cafés publics", "rencontres discrètes"],
      similaires: "blogueur des Ombres, informateur, espion corpo",
      competences: [
        "Électronique 5",
        "Étiquette (médias) 6",
        "Perception 7",
        "Recherche matricielle 6",
      ],
    },
    {
      role: "Runner à la retraite",
      influenceMin: 3,
      influenceMax: 6,
      desc: "Expérience irremplaçable, contacts solides, équipement stocké. Parfois encore actif à mi-temps.",
      lieux: ["appartement discret", "bar habituel", "dépôt sécurisé"],
      similaires: "mercenaire à la retraite, ancien militaire",
      competences: [
        "Armes à feu (GC) 6",
        "Combat rapproché 5",
        "Réseau 7",
        "Tactique 5",
      ],
    },
  ],

  /* ----
     CONTACTS ANARCHY — mécaniques officielles
     niveau = coût en niveaux d\'atout (1 niv = 5 000¥)
  ---- */
  catalogueAnarchy: [
    {
      role: "Armurier",
      niveau: 4,
      cout: 20000,
      rr: 1,
      domaine: "Réseau (la rue et ingénierie)",
      desc: "Armes légales et illégales, munitions spéciales, modifications sur mesure",
      bonus: null,
    },
    {
      role: "Avocat",
      niveau: 4,
      cout: 20000,
      rr: 2,
      domaine: "Réseau (gouvernemental)",
      desc: "Sorties de garde à vue, effacement de dossiers, procédures d'urgence",
      bonus: null,
    },
    {
      role: "Cadre corporatiste",
      niveau: 2,
      cout: 10000,
      rr: 1,
      domaine: "Réseau (corporatiste)",
      desc: "Accès interne, passes, renseignements sur les mouvements corpo",
      bonus: null,
    },
    {
      role: "Consiglieri de la Mafia",
      niveau: 4,
      cout: 20000,
      rr: 2,
      domaine: "Réseau (criminel)",
      desc: "Muscle, protection, accès aux réseaux du crime organisé",
      bonus: null,
    },
    {
      role: "Contrebandier",
      niveau: 4,
      cout: 20000,
      rr: 1,
      domaine: "Réseau (la rue et ingénierie)",
      desc: "Transport discret de marchandises et personnes, routes secrètes",
      bonus: null,
    },
    {
      role: "Doc des rues",
      niveau: 2,
      cout: 10000,
      rr: 1,
      domaine: "Réseau (médical)",
      desc: "Soins discrets, implants sans dossier, patch trauma à portée",
      bonus: null,
    },
    {
      role: "Flic sous couverture",
      niveau: 2,
      cout: 10000,
      rr: 1,
      domaine: "Réseau (gouvernemental)",
      desc: "Infos sur les enquêtes en cours, plannings de patrouille",
      bonus: null,
    },
    {
      role: "Ganger",
      niveau: 2,
      cout: 10000,
      rr: 1,
      domaine: "Réseau (criminel)",
      desc: "Muscle de rue, territoire, renseignement de quartier",
      bonus: null,
    },
    {
      role: "Intermédiaire (Fixer)",
      niveau: 5,
      cout: 25000,
      rr: 1,
      domaine: "Réseau (tous domaines)",
      desc: "Arrange les runs, met en relation, connaît tout le monde",
      bonus: null,
    },
    {
      role: "Journaliste",
      niveau: 2,
      cout: 10000,
      rr: 1,
      domaine: "Réseau (médiatique)",
      desc: "Dossiers croustillants, sources protégées, pression publique",
      bonus: null,
    },
    {
      role: "M. Johnson",
      niveau: 6,
      cout: 30000,
      rr: 1,
      domaine: "Réseau (la rue, criminel et corporatiste)",
      desc: "Commandes de runs, paiement fiable, réseau étendu multi-sphères",
      bonus: null,
    },
    {
      role: "Marchand de talismans",
      niveau: 2,
      cout: 10000,
      rr: 1,
      domaine: "Réseau (magique)",
      desc: "Foci, ingrédients rituels, identification d'artefacts",
      bonus: null,
    },
    {
      role: "Mécanicien",
      niveau: 2,
      cout: 10000,
      rr: 1,
      domaine: "Réseau (ingénierie)",
      desc: "Réparations discrètes, drones, véhicules modifiés",
      bonus: null,
    },
    {
      role: "Paradis numérique",
      niveau: 4,
      cout: 20000,
      rr: 1,
      domaine: "Réseau (matriciel)",
      desc: "Serveur sécurisé, programmes, données volées",
      bonus: "RR 1 aux tests d'Électronique (recherche matricielle)",
    },
    {
      role: "Patron de bar",
      niveau: 2,
      cout: 10000,
      rr: 1,
      domaine: "Réseau (la rue)",
      desc: "Tout entend, rien oublie, lieu de rendez-vous neutre",
      bonus: null,
    },
    {
      role: "Professeur d'université",
      niveau: 2,
      cout: 10000,
      rr: 1,
      domaine: "Réseau (universitaire)",
      desc: "Archives légales, expertise technique, couverture académique",
      bonus: null,
    },
    {
      role: "Faussaire",
      niveau: 4,
      cout: 20000,
      rr: 2,
      domaine: "Réseau (gouvernemental et la rue)",
      desc: "Faux SINs, passeports, permis de toutes sortes",
      bonus: null,
    },
    {
      role: "Chaman de rue",
      niveau: 3,
      cout: 15000,
      rr: 1,
      domaine: "Réseau (magique)",
      desc: "Esprits, protection rituelle, consultation astrale",
      bonus: null,
    },
    {
      role: "Receleur",
      niveau: 3,
      cout: 15000,
      rr: 1,
      domaine: "Réseau (la rue)",
      desc: "Rachète du matériel chaud, fourni de l'équipement sans trace",
      bonus: null,
    },
    {
      role: "Chef de gang",
      niveau: 4,
      cout: 20000,
      rr: 2,
      domaine: "Réseau (criminel)",
      desc: "Territoire, protection, muscle collectif disponible",
      bonus: null,
    },
    {
      role: "Agent de sécurité véreux",
      niveau: 3,
      cout: 15000,
      rr: 1,
      domaine: "Réseau (corporatiste)",
      desc: "Plans de sécurité, angles morts, plannings de patrouille",
      bonus: null,
    },
    {
      role: "Passeur de frontière",
      niveau: 4,
      cout: 20000,
      rr: 1,
      domaine: "Réseau (la rue et gouvernemental)",
      desc: "Routes secrètes, exfiltration internationale, documents de transit",
      bonus: null,
    },
    {
      role: "Pilote discret",
      niveau: 3,
      cout: 15000,
      rr: 1,
      domaine: "Réseau (ingénierie)",
      desc: "Exfiltration rapide, transport sans manifeste, drones de recon",
      bonus: null,
    },
    {
      role: "Prêtre de quartier",
      niveau: 2,
      cout: 10000,
      rr: 1,
      domaine: "Réseau (la rue)",
      desc: "Refuge sûr, réseau de solidarité, confessionnal du sprawl",
      bonus: null,
    },
  ],

  /* ---- Traits de personnalité ---- */
  traits: [
    "Paranoïaque : change de lieu de rendez-vous à la dernière minute",
    "Bavard : livre toujours un peu plus qu'il ne devrait",
    "Discret : ne laisse aucune trace numérique",
    "Loyal mais hors de prix : exige une contrepartie proportionnelle",
    "Pratique le troc : cash refusé, services ou marchandises",
    "Exige du cash : pas de créditubes certifiés",
    "Curieux de tout : veut toujours savoir pourquoi",
    "Professionnel froid : aucun contact inutile, toujours efficace",
    "A des dettes auprès d'un gang : pourrait entraîner les runners",
    "Travaille pour plusieurs factions : risque de conflit d'intérêt",
    "Sous surveillance corpo : les réunions sont risquées",
    "En cavale : impossible à joindre via les canaux normaux",
    "Drogué fonctionnel : fiable, mais certains jours moins que d'autres",
    "Ancien runner reconverti : nostalgique, parfois imprudent",
    "Ne sort jamais sans garde du corps",
    "Communique uniquement par messages chiffrés à usage unique",
    "Exige un coup de main non rémunéré à chaque faveur",
    "Membre discret d'une loge hermétique",
    "Uniquement disponible entre 2h et 6h du matin",
    "Récemment cramé : plus méfiant, souhaite revenir sur le devant",
    "Fan de combat urbain : peut se voir au stade",
    "Ancien prisonnier d'Aztechnology : haine viscérale de la corpo",
    "Ancien prisonnier de Horizon : haine viscérale de la corpo",
    "Ancien cadre d'Ares : haine viscérale de la corpo",
    "Ancien prisonnier de MCT : haine viscérale de la corpo",
    "Ancien prisonnier de Renraku : haine viscérale de la corpo",
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
      return {
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
    } else {
      // SR5 / SR6
      const cat = Utils.rand(this.catalogueSR);
      const influence = Utils.randInt(cat.influenceMin, cat.influenceMax);
      const loyaute = Utils.randInt(1, 6);
      return {
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
   Factions, clients, lieux et complications issus du lore SR
   ============================================================ */
const RunGen = {
  /* ---- Types de mission ---- */
  types: [
    // Extraction
    "Extraction d'un scientifique corpo",
    "Extraction d'un prisonnier politique",
    "Extraction d'un agent double",
    "Extraction inversée : ramener quelqu'un de force",
    "Extraction d'un enfant de cadre corpo",
    // Vol & données
    "Vol de données (prototype corpo)",
    "Vol de données (dossiers compromettants)",
    "Vol de données (localisation d'un fuyard)",
    "Espionnage industriel longue durée",
    "Copie de fichiers avant destruction du serveur",
    // Sabotage
    "Sabotage d'infrastructure corpo (usine, centrale)",
    "Sabotage matriciel (effacement de preuves)",
    "Sabotage logistique (cargaison, convoi blindé)",
    "Destruction d'un prototype avant livraison à un rival",
    "Contamination d'un stock de drogues Eveillées",
    // Livraison & transport
    "Livraison discrète de colis non identifié",
    "Transport de personne protégée",
    "Transport de matériel de contrebande",
    "Livraison d'un message physique",
    // Élimination
    "Neutralisation d'une cible (vivante de préférence)",
    "Neutralisation d'une cible (peu importe l'état)",
    "Élimination propre d'un informateur compromis",
    "Récupération d'un espion corpo retourné",
    // Protection
    "Escorte d'un M. Johnson lors d'une négociation à risque",
    "Protection rapprochée lors d'un événement public",
    "Sécurisation d'un lieu de rendez-vous",
    // Récupération
    "Récupération d'objet volé à notre client",
    "Récupération d'un otage (famille d'un Johnson)",
    "Récupération d'un artefact magique dangereux",
    "Récupération d'une créature para-animale vivante",
    // Divers
    "Infiltration et rapport (aucune action directe)",
    "Nettoyage d'une scène de crime corpo",
    "Mise en scène d'un accident sur une cible gênante",
    "Contre-opération : neutraliser une autre équipe de runners",
    "Surveillance longue durée d'un cadre corpo",
  ],

  /* ---- Clients — factions officielles SR ---- */
  clients: [
    // Corporations AAA (Big Ten)
    "M. Johnson — Ares Macrotechnology (Division Arms)",
    "M. Johnson — Ares Macrotechnology (Knight Errant Security)",
    "M. Johnson — Aztechnology (Pharmachimie)",
    "M. Johnson — Aztechnology (Magie d'entreprise)",
    "M. Johnson — Saeder-Krupp (Finance / Lofwyr mandate)",
    "M. Johnson — Saeder-Krupp (Recherche & Développement)",
    "M. Johnson — Horizon Group (Médias et RP)",
    "M. Johnson — Horizon Group (Gestion de perception)",
    "M. Johnson — Mitsuhama Computer Technologies (Robotique)",
    "M. Johnson — NeoNET (Infrastructure matricielle)",
    "M. Johnson — Renraku Computer Systems (Samouraïs rouges)",
    "M. Johnson — Shiawase Corporation (Nucléaire & Médical)",
    "M. Johnson — Evo Corporation (Transhumain & Bioware)",
    "M. Johnson — Wuxing Inc. (Commerce & Magie orientale)",
    // Crime organisé
    "Intermédiaire — Mafia (réseau UCAS)",
    "Intermédiaire — Yakuza (clan Shotozumi, Seattle)",
    "Intermédiaire — Triade (Red Dragon Association)",
    "Intermédiaire — Vory v Zakone",
    "Intermédiaire — Koshari (crime amérindien)",
    // Indépendants & gouvernements
    "M. Johnson anonyme — identité inconnue",
    "Gouvernement local (UCAS, CAS, NAN)",
    "Agence de renseignement (CIA, Lone Star Intelligence)",
    "Dragon ou représentant draconic",
    "Loge hermétique secrète",
    "Runner à la retraite qui sous-traite",
    "Fixer de haut vol (Influence 8+)",
    "Éco-terroristes (TerraFirst!)",
    "Groupe de libération métahumaine (Ork Rights Commission)",
    "Esprit libre aux motivations impénétrables",
    "Journaliste d'investigation (paie en informations)",
  ],

  /* ---- Lieux — sprawl et environnements SR ---- */
  lieux: [
    // Urban — bâtiments
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
    // Industriel & zones grises
    "Entrepôt des docks",
    "Usine de recyclage cyberware (pièces grises)",
    "Centrale électrique de zone industrielle",
    "Chantier naval sous surveillance militaire",
    "Plateforme pétrolière reconvertie (offshore)",
    // Mobilité
    "Convoi blindé en transit sur l'autoroute",
    "Train cargo express intercontinental (zone UCAS/CAS)",
    "Cargo maritime avec fret illégal (Triade)",
    "Vol commercial — cible à bord avec équipe de sécurité",
    "Sous-marin cargo en eaux territoriales",
    // Zones particulières
    "Zone d'exclusion nucléaire (rad-zone, survie requise)",
    "Zone astrale perturbée — magie instable et esprits hostiles",
    "Quartier ork / troll des barrens (solidarité métatype)",
    "Base militaire désaffectée (matériel récupérable)",
    "Forêt amérindienne protégée (magie forte)",
    "Metroplexe de Seattle en couvre-feu nocturne",
    "Paradis numérique public (hack à ciel ouvert)",
    "Marché noir couvert (barrens, tout s'achète et se vend)",
  ],

  /* ---- Complications ---- */
  complications: [
    // Trahison
    "Double trahison du Johnson : la cible était le piège dès le départ",
    "Un membre de l'équipe a été acheté avant la run",
    "Second Johnson concurrent sur la même cible (Ares vs Aztechnology)",
    "Le Johnson est mort avant le paiement, qui détient les fonds ?",
    "Le vrai commanditaire est un dragon, le M. Johnson ne le savait pas",
    // Sécurité renforcée
    "Sécurité renforcée à mi-run, quelqu'un a vendu la mèche",
    "Patrouille surprise de Knight Errant (changement de planning)",
    "Drones militaires Ares en couverture aérienne inattendue",
    "Mages de sécurité Aztechnology avec veilleurs astraux actifs",
    // Environnement
    "Panne de courant générale, tout passe en mode manuel",
    "Brouillage matriciel complet dans la zone (intervention de DIEU)",
    "Tempête, toutes exfiltrations aériennes impossibles",
    "Pollution chimique d'un labo, combinaisons requises",
    "Tremblement de terre mineur pendant l'opération (Seattle)",
    // Humain
    "Civil innocent pris en otage dans la zone d'opération",
    "Présence d'enfants",
    "Ancien contact de l'équipe se retrouve du côté adverse",
    "Journaliste avec drone documente tout en direct",
    "Équipe de runners rivaux qui arrive simultanément",
    // Cible
    "La cible est déjà morte à l'arrivée",
    "La cible refuse catégoriquement de partir",
    "La cible est un double, laquelle est l'originale ?",
    "La cible est en réalité innocente, les runners le découvrent en route",
    "La cible a des pouvoirs magiques non signalés au brief",
    // Données & logistique
    "Fuite d'info, la cible sait que les runners arrivent",
    "Minuterie activée, explosion dans 45 minutes",
    "Les plans du lieu datent de 3 ans, tout a été rénové",
    "Le colis livrable est vivant, conscient et paniqué",
    "Contact compromis, les infos de préparation étaient partiellement fausses",
  ],

  /* ---- Objectifs secondaires (bonus de paiement) ---- */
  objectifsSecondaires: [
    null,
    null,
    null,
    "Bonus : aucun mort parmi le personnel de sécurité ordinaire",
    "Bonus : récupérer un second fichier non mentionné au brief",
    "Bonus : faire croire à un accident, aucune trace de la run",
    "Bonus : ne déclencher aucune alarme",
    "Bonus : récupérer un prototype supplémentaire non prioritaire",
    "Bonus : éliminer un témoin gênant en passant",
    "Bonus : photos compromettantes d'un dirigeant (chantage futur)",
    "Bonus : laisser une fausse piste pointant vers un rival corpo",
    "Bonus : récupérer les plans d'un second projet secret",
    "Bonus : exfiltrer un informateur qui se trouvait sur place",
  ],

  difficulties: [
    "Facile",
    "Standard",
    "Difficile",
    "Très difficile",
    "Cauchemar",
  ],

  generate() {
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
      type: Utils.rand(this.types),
      client: Utils.rand(this.clients),
      lieu: Utils.rand(this.lieux),
      complication: Utils.rand(this.complications),
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
