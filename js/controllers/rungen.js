"use strict";

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
    "Passage de frontière NAA sous les radars",
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
    "Famille d'un disparu dans les barrens",
    "Chaman communautaire protégeant son quartier",
    "Hacker voulant des bras physiques pour compléter son infiltration",
    "Johnson — Ares Arms (via fixer)",
    "Johnson — Aztechnology (opération non officielle)",
    "Johnson — Renraku (récupération d'actifs)",
    "Johnson — Horizon (gestion d'image)",
    "Crime organisé — Mafia locale",
    "Crime organisé — Yakuza / Mitsuhama",
    "Communauté méta (Ork Rights Commission)",
    "Loge hermétique secrète",
    "Dragon ou représentant — motivations inconnues",
    "Gouvernement NAA en sous-main",
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
    "Appartement piégé dans les barrens",
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
    "Quartier ork / troll des barrens",
    "Base militaire désaffectée (matériel récupérable)",
    "Forêt amérindienne protégée (magie territoriale)",
    "Seattle Metroplex en couvre-feu nocturne",
    "Paradis numérique public (hack à ciel ouvert)",
    "Marché noir couvert (barrens)",
  ],

  lieuxAnarchy: [
    "District industriel de Puyallup (barrens, gangs, toxines)",
    "Waterfront de Seattle (docks, criminalité, Triade)",
    "Complexe Renraku de Bellevue (sécurité maximale)",
    "Underground de Seattle (tunnels, comunautés cachées)",
    "Université de Washington (labos, archives, accès légal)",
    "Touristville (zone de loisirs, trafic, mélange social)",
    "Zone NAA à la frontière — poste de passage",
    "Squat éveillé dans les barrens (communauté magique)",
    "Bar de go-gangers sur l'autoroute I-5",
    "Clinique clandestine dans un sous-sol de Redmond",
    "Loft hackers dans Renton (matrices et serveurs)",
    "Paradis numérique dans le cloud Horizon",
    "Port de Seattle sous contrôle Triade",
    "Complexe corpo en périphérie (bureau + logements)",
    "Station de métro abandonnée reconvertie",
    "Marché couvert illégal des barrens",
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
