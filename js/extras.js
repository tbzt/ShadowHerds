"use strict";

/* ============================================================
   CONTACTS GENERATOR
   Deux modes selon l'édition active :
   - SR5 / SR6 : Loyauté + Influence (1-6)
   - Anarchy    : Atout à niveau (0-6), RR sur Réseau, coût en ¥
   ============================================================ */
const Contacts = {
  /* ---- Catalogue Anarchy — tiré du livre de base ----
     Chaque entrée = un type de contact avec ses mécaniques officielles.
     niveau    : coût en niveaux d'atout (1 niv = 5 000¥)
     cout      : coût en nuyen
     rr        : Réduction de Risque fournie
     domaine   : spécialisation(s) de Réseau couverte(s)
     bonus     : effet supplémentaire éventuel
  ---- */
  catalogueAnarchy: [
    // -- Officiels du livre de base --
    {
      role: "Armurier",
      niveau: 4,
      cout: 20000,
      rr: 1,
      domaine: "Réseau (la rue et ingénierie)",
      desc: "Armes légales et illégales, munitions spéciales, modifications",
      trait: null,
    },
    {
      role: "Avocat",
      niveau: 4,
      cout: 20000,
      rr: 2,
      domaine: "Réseau (gouvernemental)",
      desc: "Sorties de garde à vue, effacement de dossiers, procédures d'urgence",
      trait: null,
    },
    {
      role: "Cadre corporatiste",
      niveau: 2,
      cout: 10000,
      rr: 1,
      domaine: "Réseau (corporatiste)",
      desc: "Accès interne, passes, renseignements sur les mouvements corpo",
      trait: null,
    },
    {
      role: "Consigliere de la Mafia",
      niveau: 4,
      cout: 20000,
      rr: 2,
      domaine: "Réseau (criminel)",
      desc: "Muscle, protection, accès aux réseaux du crime organisé",
      trait: null,
    },
    {
      role: "Contrebandier",
      niveau: 4,
      cout: 20000,
      rr: 1,
      domaine: "Réseau (la rue et ingénierie)",
      desc: "Transport discret de marchandises et personnes, routes secrètes",
      trait: null,
    },
    {
      role: "Doc des rues",
      niveau: 2,
      cout: 10000,
      rr: 1,
      domaine: "Réseau (médical)",
      desc: "Soins discrets, implants sans dossier, patch trauma à portée",
      trait: null,
    },
    {
      role: "Flic sous couverture",
      niveau: 2,
      cout: 10000,
      rr: 1,
      domaine: "Réseau (gouvernemental)",
      desc: "Infos sur les enquêtes en cours, plannings de patrouille",
      trait: null,
    },
    {
      role: "Ganger",
      niveau: 2,
      cout: 10000,
      rr: 1,
      domaine: "Réseau (criminel)",
      desc: "Muscle de rue, territoire, renseignement de quartier",
      trait: null,
    },
    {
      role: "Intermédiaire (Fixer)",
      niveau: 5,
      cout: 25000,
      rr: 1,
      domaine: "Réseau (tous domaines)",
      desc: "Arrange les runs, met en relation, connaît tout le monde",
      trait: null,
    },
    {
      role: "Journaliste",
      niveau: 2,
      cout: 10000,
      rr: 1,
      domaine: "Réseau (médiatique)",
      desc: "Dossiers croustillants, sources protégées, pression publique",
      trait: null,
    },
    {
      role: "M. Johnson",
      niveau: 6,
      cout: 30000,
      rr: 1,
      domaine: "Réseau (la rue, criminel et corporatiste)",
      desc: "Commandes de runs, paiement fiable, réseau étendu multi-sphères",
      trait: null,
    },
    {
      role: "Marchand de talismans",
      niveau: 2,
      cout: 10000,
      rr: 1,
      domaine: "Réseau (magique)",
      desc: "Foci, ingrédients rituels, identification d'artefacts",
      trait: null,
    },
    {
      role: "Mécanicien",
      niveau: 2,
      cout: 10000,
      rr: 1,
      domaine: "Réseau (ingénierie)",
      desc: "Réparations discrètes, drones, véhicules modifiés",
      trait: null,
    },
    {
      role: "Paradis numérique",
      niveau: 4,
      cout: 20000,
      rr: 1,
      domaine: "Réseau (matriciel)",
      desc: "Serveur sécurisé, programmes, données volées",
      bonus: "RR 1 aux tests d'Électronique (recherche matricielle)",
      trait: null,
    },
    {
      role: "Patron de bar",
      niveau: 2,
      cout: 10000,
      rr: 1,
      domaine: "Réseau (la rue)",
      desc: "Tout entend, rien oublie, lieu de rendez-vous neutre",
      trait: null,
    },
    {
      role: "Professeur d'université",
      niveau: 2,
      cout: 10000,
      rr: 1,
      domaine: "Réseau (universitaire)",
      desc: "Archives légales, expertise technique, couverture académique",
      trait: null,
    },
    // -- Contacts supplémentaires cohérents avec la mécanique --
    {
      role: "Tailleur d'identités",
      niveau: 4,
      cout: 20000,
      rr: 2,
      domaine: "Réseau (gouvernemental et la rue)",
      desc: "Faux SINs, passeports, permis de toutes sortes",
      trait: null,
    },
    {
      role: "Chaman de rue",
      niveau: 3,
      cout: 15000,
      rr: 1,
      domaine: "Réseau (magique)",
      desc: "Esprits, protection rituelle, consultation astrale",
      trait: null,
    },
    {
      role: "Receleur",
      niveau: 3,
      cout: 15000,
      rr: 1,
      domaine: "Réseau (la rue)",
      desc: "Rachète du matériel chaud, fournis de l'équipement sans trace",
      trait: null,
    },
    {
      role: "Chef de gang",
      niveau: 4,
      cout: 20000,
      rr: 2,
      domaine: "Réseau (criminel)",
      desc: "Territoire, protection, muscle collectif disponible",
      trait: null,
    },
    {
      role: "Agent de sécurité véreux",
      niveau: 3,
      cout: 15000,
      rr: 1,
      domaine: "Réseau (corporatiste)",
      desc: "Plans de sécurité, angles morts, plannings de patrouille",
      trait: null,
    },
    {
      role: "Passeur de frontière",
      niveau: 4,
      cout: 20000,
      rr: 1,
      domaine: "Réseau (la rue et gouvernemental)",
      desc: "Routes secrètes, exfiltration internationale, documents de transit",
      trait: null,
    },
    {
      role: "Pilote discret",
      niveau: 3,
      cout: 15000,
      rr: 1,
      domaine: "Réseau (ingénierie)",
      desc: "Exfiltration rapide, transport sans manifeste, drones de recon",
      trait: null,
    },
    {
      role: "Prêtre de quartier",
      niveau: 2,
      cout: 10000,
      rr: 1,
      domaine: "Réseau (la rue)",
      desc: "Refuge sûr, réseau de solidarité, confessionnal du sprawl",
      trait: null,
    },
  ],

  /* ---- Traits pour tous modes ---- */
  traits: [
    "Paranoïaque — change de lieu de rendez-vous à la dernière minute",
    "Bavard — livre toujours un peu plus qu'il ne devrait",
    "Discret — ne laisse aucune trace numérique",
    "Loyal mais hors de prix — exige une contrepartie proportionnelle",
    "Pratique le troc — cash refusé, services ou marchandises",
    "Exige du cash nuyen — pas de crédisticks traçables",
    "Curieux de tout — veut toujours savoir pourquoi",
    "Professionnel froid — aucun contact inutile, toujours efficace",
    "A des dettes auprès d'un gang — pourrait entraîner les runners",
    "Travaille pour plusieurs factions — risque de conflit d'intérêt",
    "Sous surveillance corpo — les réunions sont risquées",
    "En cavale — impossible à joindre via les canaux normaux",
    "Drogué fonctionnel — fiable, mais certains jours moins que d'autres",
    "Ancien runner reconverti — nostalgique, parfois imprudent",
    "Ne sort jamais sans garde du corps",
    "Communique uniquement par messages chiffrés à usage unique",
    "Exige un coup de main non rémunéré à chaque faveur",
    "Membre discret d'une loge magique",
    "Uniquement disponible entre 2h et 6h du matin",
  ],

  /* ---- Professions SR5/SR6 (inchangées) ---- */
  professionsSR: [
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
      role: "Hacker freelance",
      desc: "Infiltration de systèmes, pas de questions",
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
    {
      role: "Mage de rue",
      desc: "Services magiques, identification d'artefacts",
    },
    {
      role: "Contrebandier",
      desc: "Transport de marchandises et personnes interdites",
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
      role: "Barman du sprawl",
      desc: "Tout entend, rien oublie, vend les rumeurs",
    },
    {
      role: "Prêtre de quartier",
      desc: "Réfugié sûr, réseau de solidarité, confessionnal",
    },
  ],

  lieux: [
    "Barrens profonds",
    "Zone d'exclusion",
    "Port de commerce illégal",
    "Downtown corpo",
    "Périphérie industrielle",
    "Tir — no man's land",
    "Favelas surélevées",
    "Zone franche neutre",
    "Quartier elfe",
    "Enclave ork",
    "Souterrains du sprawl",
    "Mall corpo abandonné",
    "Marina privée",
    "Aéroport clandestin",
    "Club nocturne",
    "Marché noir couvert",
    "Sanctuaire chamanique",
    "Métro abandonné",
  ],

  specialitesSR: [
    null,
    null,
    null,
    "spécialisé Renraku",
    "spécialisé Ares",
    "spécialisé Aztechnology",
    "spécialisé Saeder-Krupp",
    "spécialisé Horizon",
    "spécialisé extraction",
    "spécialisé contre-espionnage",
    "spécialisé magie noire",
    "spécialisé drones militaires",
  ],

  /* ---- Génération selon l'édition ---- */
  generate() {
    const prenom = Utils.genFirstName();
    const hasHandle = Utils.randBool(0.55);
    const name = hasHandle ? `${prenom} "${Utils.genHandle()}"` : prenom;
    const trait = Utils.rand(this.traits);

    if (App.edition === "anarchy") {
      // Anarchy : atout à niveau avec RR mécanique
      const cat = Utils.rand(this.catalogueAnarchy);
      // Niveau peut varier légèrement (contact moins ou plus développé)
      const niveauEffectif = Utils.clamp(
        cat.niveau + Utils.rand([-1, 0, 0, 0, 1]),
        0,
        6,
      );
      const coutEffectif = niveauEffectif * 5000;
      return {
        id: Utils.uid(),
        edition: "anarchy",
        name,
        role: cat.role,
        desc: cat.desc,
        niveau: niveauEffectif,
        cout: coutEffectif,
        rr: cat.rr,
        domaine: cat.domaine,
        bonus: cat.bonus || null,
        trait,
      };
    } else {
      // SR5 / SR6 : Loyauté + Influence
      const prof = Utils.rand(this.professionsSR);
      const spec = Utils.rand(this.specialitesSR);
      return {
        id: Utils.uid(),
        edition: App.edition,
        name,
        role: prof.role,
        desc: prof.desc,
        specialite: spec,
        lieu: Utils.rand(this.lieux),
        loyaute: Utils.randInt(1, 6),
        influence: Utils.randInt(1, 6),
        trait,
      };
    }
  },

  initPanel() {
    const zone = document.getElementById("contacts-panel-content");
    // Réinitialiser si l'édition a changé
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
    "Métroplex en état d'urgence (couvre-feu)",
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
