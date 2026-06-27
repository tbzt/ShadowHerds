"use strict";

/* ============================================================
   CONTACTS GENERATOR
   ============================================================ */
const Contacts = {
  /* -- Professions avec description courte -- */
  professions: [
    // Intermédiaires & réseaux
    { role: "Fixer", desc: "Arrange les runs, connaît tout le monde" },
    {
      role: "Receleur",
      desc: "Rachète du matériel chaud sans poser de questions",
    },
    {
      role: "Tailleur d'identités",
      desc: "Faux SINs, passeports, permis de toutes sortes",
    },
    {
      role: "Rabatteur de gangs",
      desc: "Loue des bras casseurs pour la soirée",
    },
    {
      role: "Agent de sécurité véreux",
      desc: "Vend les plannings et les angles morts",
    },
    {
      role: "Employé corpo corrompu",
      desc: "Accès aux bases de données internes",
    },
    {
      role: "Officier de police compromis",
      desc: "Fait disparaître des rapports, lâche des infos",
    },
    {
      role: "Journaliste d'investigation",
      desc: "Dossiers croustillants, sources protégées",
    },
    {
      role: "Avocat de l'ombre",
      desc: "Sortie de garde à vue, effacement de casier",
    },
    {
      role: "Politicien de bas étage",
      desc: "Petite corruption, grands services occasionnels",
    },

    // Techniques & matriciel
    {
      role: "Hacker freelance",
      desc: "Infiltration de systèmes, pas de questions",
    },
    {
      role: "Technicien matriciel",
      desc: "Répare les cyberdecks, vend des programmes",
    },
    {
      role: "Ingénieur en armement",
      desc: "Modifications illégales, munitions spéciales",
    },
    {
      role: "Mécanicien / Rigger",
      desc: "Drones, véhicules, blindage improvisé",
    },
    { role: "Chimiste de rue", desc: "Drogues, poisons, explosifs artisanaux" },
    { role: "Médecin de rue", desc: "Soins discrets, implants sans dossier" },
    {
      role: "Chirurgien cyberware",
      desc: "Pose des augmentations hors circuit légal",
    },

    // Magie & métahumain
    {
      role: "Mage de rue",
      desc: "Services magiques, identification d'artefacts",
    },
    { role: "Chaman urbain", desc: "Esprits, protection rituelle, visions" },
    {
      role: "Herboriste adepte",
      desc: "Préparations mystiques, soins alternatifs",
    },
    {
      role: "Dresseur de bestioles",
      desc: "Critters, paraanimanix, surveillance discrète",
    },

    // Logistique & terrain
    {
      role: "Contrebandier",
      desc: "Transport de marchandises et personnes interdites",
    },
    {
      role: "Pilote de location",
      desc: "Exfiltration rapide, pas de manifeste",
    },
    {
      role: "Cambrioleur à la retraite",
      desc: "Plans de bâtiments, techniques d'intrusion",
    },
    {
      role: "Runner à la retraite",
      desc: "Expérience, contacts, encore quelques ressources",
    },
    {
      role: "Chef de gang local",
      desc: "Territoire, muscle, renseignement de rue",
    },
    {
      role: "Trafiquant d'armes",
      desc: "Du pistolet à la mitrailleuse lourde",
    },
    { role: "Dealer", desc: "Jazz, Tempo, Kamikaze — et autres selon demande" },
    {
      role: "Passeur de frontière",
      desc: "Documents, routes secrètes, contacts à l'étranger",
    },

    // Informateurs & culture
    {
      role: "Barman du sprawl",
      desc: "Tout entend, rien oublie, vend les rumeurs",
    },
    {
      role: "Prêtre de quartier",
      desc: "Réfugié sûr, réseau de solidarité, confessionnal",
    },
    {
      role: "Tatoueuse / Artiste",
      desc: "Voit défiler les runners, archive les secrets",
    },
    {
      role: "Libraire de l'ancien monde",
      desc: "Archives papier, livres interdits, cartes oubliées",
    },
  ],

  /* -- Lieux dans le sprawl -- */
  lieux: [
    "Barrens profonds",
    "Zone d'exclusion",
    "Port de commerce illégal",
    "Downtown corpo",
    "Périphérie industrielle",
    "Tir — no man's land",
    "Favelas surélevées",
    "Zone franche neutre",
    "Quartier elfe (Cara'Sir)",
    "Enclave ork",
    "Souterrains du sprawl",
    "Mall corpo abandonné",
    "Marina privée",
    "Aéroport clandestin",
    "Hôpital de zone",
    "Académie de magie de rue",
    "Université corpo (campus fermé)",
    "Datacenter flottant",
    "Club nocturne",
    "Métro abandonné",
    "Sanctuaire chamanique",
    "Tour de guet des Barrens",
    "Marché noir couvert",
    "Entrepôt frigorifique",
    "Quartier général de gang",
  ],

  /* -- Traits de personnalité / particularités -- */
  traits: [
    // Comportements
    "Paranoïaque — change de lieu de rendez-vous à la dernière minute",
    "Bavard — livre toujours un peu plus qu'il ne devrait",
    "Discret — ne laisse aucune trace numérique",
    "Loyal mais hors de prix — prix triplé si les runners sont dans la merde",
    "Pratique le troc — cash refusé, marchandises acceptées",
    "Exige du cash nuyen — pas de crédisticks traçables",
    "Curieux de tout — veut toujours savoir pourquoi",
    "Professionnel froid — aucun contact inutile",
    // Situations
    "A des dettes auprès d'un gang — pourrait entraîner les runners dedans",
    "Travaille pour plusieurs Johnson — risque de conflit d'intérêt",
    "Informateur infiltré — loyauté douteuse à long terme",
    "Sous surveillance corpo — les réunions sont risquées",
    "En cavale — impossible à joindre via les canaux normaux",
    "Drogué fonctionnel — fiable, mais certains jours moins que d'autres",
    "Vieux runner reconverti — nostalgique, parfois imprudent",
    "Récemment brûlé — plus méfiant, conditions plus dures",
    // Spécificités
    "Ne sort jamais sans garde du corps",
    "Communique uniquement par messages chiffrés",
    "Refuse de traiter avec des corps augmentés de plus de 50%",
    "Uniquement disponible entre 2h et 6h du matin",
    "Exige un coup de main non rémunéré à chaque faveur",
    "Membre discret d'une loge magique",
    "Ancien prisonnier de Aztechnology — haine viscérale de la corpo",
    "Fan de l'Urban Brawl — organisable via le stade",
  ],

  /* -- Spécialisations qui s'ajoutent à la profession -- */
  specialites: [
    null,
    null,
    null, // majorité sans spécialité particulière
    "spécialisé Renraku",
    "spécialisé Ares",
    "spécialisé Aztechnology",
    "spécialisé Saeder-Krupp",
    "spécialisé Horizon",
    "spécialisé NeoNET",
    "spécialisé trafic humain",
    "spécialisé extraction",
    "spécialisé contre-espionnage",
    "spécialisé magie noire",
    "spécialisé drones militaires",
  ],

  generate() {
    const prof = Utils.rand(this.professions);
    const spec = Utils.rand(this.specialites);
    const prenom = Utils.genFirstName();
    // Les contacts ont parfois un surnom runner, parfois juste un prénom
    const hasHandle = Utils.randBool(0.55);
    const name = hasHandle ? `${prenom} "${Utils.genHandle()}"` : prenom;

    return {
      id: Utils.uid(),
      name,
      role: prof.role,
      desc: prof.desc,
      specialite: spec,
      lieu: Utils.rand(this.lieux),
      loyaute: Utils.randInt(1, 6),
      connexion: Utils.randInt(1, 6),
      trait: Utils.rand(this.traits),
    };
  },

  initPanel() {
    const zone = document.getElementById("contacts-panel-content");
    if (zone.dataset.init) return;
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
   ============================================================ */
const RunGen = {
  /* -- Types de mission -- */
  types: [
    // Extraction
    "Extraction de personne (employé corpo)",
    "Extraction de personne (scientifique)",
    "Extraction de personne (prisonnier)",
    "Extraction inversée — ramener quelqu'un de force",
    // Vol & données
    "Vol de données (prototype corpo)",
    "Vol de données (dossiers noirs)",
    "Vol de données (localisation d'un fuyard)",
    "Espionnage industriel longue durée",
    // Sabotage
    "Sabotage d'infrastructure (usine, centrale)",
    "Sabotage matriciel (effacement de preuves)",
    "Sabotage logistique (cargaison, convoi)",
    "Destruction de prototype avant livraison",
    // Livraison & transport
    "Livraison discrète de colis non identifié",
    "Transport de personne protégée",
    "Convoyage de matériel de contrebande",
    // Élimination
    "Neutralisation d'une cible (vivante de préférence)",
    "Neutralisation d'une cible (peu importe l'état)",
    "Élimination propre d'un informateur",
    // Protection
    "Escorte de Johnson lors d'une négociation",
    "Protection rapprochée lors d'un événement public",
    "Sécurisation d'un lieu de rendez-vous",
    // Récupération
    "Récupération d'objet volé à notre client",
    "Récupération d'otage (famille d'un Johnson)",
    "Récupération de créature para-animale vivante",
    // Divers
    "Infiltration et rapport (pas d'action directe)",
    "Nettoyage d'une scène de crime corpo",
    "Mise en scène d'un accident",
    "Contre-opération — neutraliser un autre runner team",
    "Surveillance longue durée d'une cible",
    "Coup de main dans une run déjà en cours",
  ],

  /* -- Clients -- */
  clients: [
    // Corps AAA
    "Johnson — Ares Macrotechnology (Défense)",
    "Johnson — Ares Macrotechnology (Sécurité intérieure)",
    "Johnson — Aztechnology (Pharmacie)",
    "Johnson — Aztechnology (Magie d'entreprise)",
    "Johnson — Saeder-Krupp (Finance)",
    "Johnson — Saeder-Krupp (Recherche & Développement)",
    "Johnson — Horizon (Médias)",
    "Johnson — Horizon (Relations publiques)",
    "Johnson — NeoNET (Informatique)",
    "Johnson — Shiawase (Nucléaire & Énergie)",
    "Johnson — Renraku (Électronique)",
    "Johnson — Wuxing (Commerce & Magie)",
    // Criminels
    "Crime organisé — Vory v Zakone (Seattle)",
    "Crime organisé — Yakuza (clan Shotozumi)",
    "Crime organisé — Triade (Red Dragon)",
    "Crime organisé — Seoulpa Rings",
    "Crime organisé — Mafia (Chicago Outfit délocalisé)",
    "Gang de grande envergure",
    // Indépendants & état
    "Johnson anonyme — identité inconnue",
    "Gouvernement fantoche local",
    "Agence de renseignement (UCAS, CAS ou autre)",
    "Milice privée indépendante",
    "Runner à la retraite qui sous-traite",
    "Mage puissant aux motivations obscures",
    "Esprit libre aux désirs impénétrables",
    // Factions étranges
    "Loge hermétique secrète",
    "Éco-terroristes (TerraFirst!)",
    "Groupe de liberation métahumaine",
    "Journaliste d'investigation (paiement en infos)",
  ],

  /* -- Lieux -- */
  lieux: [
    // Urbain
    "Gratte-ciel corpo en plein Downtown",
    "Sous-sol d'un hôtel de luxe",
    "Centre commercial corpo en activité",
    "Centre commercial corpo abandonné",
    "Entrepôt des docks — zone grise",
    "Résidence sécurisée en banlieue riche",
    "Appartement piégé dans les Barrens",
    "Club nocturne avec backroom secrète",
    "Galerie marchande flottante",
    "Hôpital privé corpo",
    // Industriel
    "Usine de recyclage cyberware",
    "Centrale électrique de zone",
    "Laboratoire pharmaceutique souterrain",
    "Datacenter flottant offshore",
    "Chantier naval sous surveillance militaire",
    "Plateforme pétrolière reconvertie",
    // Mobilité
    "Convoi blindé en transit autoroutier",
    "Train cargo express intercontinental",
    "Cargo maritime avec fret illégal",
    "Vol commercial — cible à bord",
    "Sous-marin cargo en eaux territoriales",
    // Zones particulières
    "Zone d'exclusion nucléaire (rad-zone)",
    "Zone astrale perturbée — magie instable",
    "Enclave corpo extraterritoriale",
    "Base militaire désaffectée",
    "Serveur matriciel ultra-sécurisé (présence physique requise)",
    "Parc naturel protégé — critters présents",
    "Métroplexe en état d'urgence (couvre-feu)",
  ],

  /* -- Complications -- */
  complications: [
    // Trahison
    "Double trahison du Johnson — la cible était le piège",
    "Un membre de l'équipe a été acheté avant la run",
    "Second Johnson en compétition sur la même cible",
    "Le Johnson est mort avant le paiement",
    // Sécurité
    "Sécurité renforcée à mi-run — quelqu'un a vendu la mise",
    "Patrouille surprise de la Knight Errant",
    "Drones militaires en couverture aérienne",
    "Système d'IA défensif non répertorié",
    "Sécurité magique — gardiens astraux actifs",
    // Environnement
    "Panne de courant générale — tout est manuel",
    "Brouillage matriciel complet dans la zone",
    "Tempête — toutes exfiltrations aériennes impossibles",
    "Pollution chimique — combinaisons requises",
    "Tremblement de terre mineur en cours de run",
    // Humain
    "Civil innocent pris en otage dans la zone",
    "Enfant présent — changement de priorité éthique",
    "Ancien contact de l'équipe du côté adverse",
    "Journaliste avec drone qui documente tout",
    "Runner team adverse qui arrive simultanément",
    // Cible
    "La cible est déjà morte à l'arrivée",
    "La cible refuse catégoriquement de partir",
    "La cible est en réalité innocente",
    "La cible a des pouvoirs magiques non signalés",
    "La cible est un double — laquelle est la vraie ?",
    // Données & logistique
    "Fuite d'info — la cible sait que les runners arrivent",
    "Minuterie activée — explosion imminente",
    "Contact compromis — les infos de préparation étaient fausses",
    "Colis livrable est vivant et conscient",
    "Les plans du lieu datent de 10 ans — tout a changé",
  ],

  /* -- Objectifs secondaires (bonus de paiement si accomplis) -- */
  objectifsSecondaires: [
    null,
    null, // souvent pas d\'objectif secondaire
    "Bonus : aucun mort parmi le personnel de sécurité",
    "Bonus : récupérer un second fichier non mentionné au brief",
    "Bonus : faire croire à un accident",
    "Bonus : ne pas déclencher l'alarme",
    "Bonus : récupérer un prototype supplémentaire",
    "Bonus : éliminer un témoin gênant en passant",
    "Bonus : photos compromettantes d'un dirigeant",
    "Bonus : laisser une fausse piste pointant vers un rival",
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
    // Base : 5k–40k¥ selon difficulté, par runner
    const baseK = Utils.randInt(5, 40) * 1000;
    const pay = Math.round((baseK * payMult) / 500) * 500;
    const objectif2 = Utils.rand(this.objectifsSecondaires);

    return {
      type: Utils.rand(this.types),
      client: Utils.rand(this.clients),
      lieu: Utils.rand(this.lieux),
      complication: Utils.rand(this.complications),
      objectif2,
      payment: `${pay.toLocaleString("fr-FR")}¥ par runner`,
      difficulte: diff,
    };
  },

  initPanel() {
    const zone = document.getElementById("run-panel-content");
    if (zone.dataset.init) return;
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
