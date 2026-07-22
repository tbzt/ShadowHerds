"use strict";

/* ============================================================
   TOPOS CATALOG — données taggées + moteur d'assemblage cohérent
   d'amorces de run (topos). Couche 2/3 : données de jeu + fonction
   pure, aucun DOM, aucun `App`, aucune persistance (RunGen s'en
   charge). Consommé par le contrôleur `RunGen`.

   Principe (cf. REFERENCE/topos_coherence_seattle.md) : on n'assemble
   PAS 4 champs indépendants, on tire un CONFLIT. Le squelette
   (Objectif · Cible · Lieu · Factions · Difficulté) est celui du
   générateur officiel d'Anarchy 2 (p.130) ; il est édition-NEUTRE
   (Seattle est le décor commun aux 4 éditions), et sa saveur profite
   à toutes. La cohérence naît des corrélations :
     mandant → cible ∈ rivaux(mandant) → lieu où la cible opère
             → sécurité du site → objectif compatible → difficulté
   Les libellés plats de sortie (`type`/`client`/`lieu`/…) restent
   compatibles avec `RunRenderer`/`Play` ; les clés structurées
   (`objectif`/`opposition`/`securityProfile`/`planUtile`…) alimentent
   le casting (Lot 3b) et le plan de lieu (Lot 4).
   ============================================================ */
import { Utils } from "../core/utils.js";

export const ToposCatalog = {
  /* ---- OBJECTIFS (les 6 verbes d'Anarchy 2) : type de cible, sites
     compatibles, et fabrique de libellé à partir de l'opposition. ---- */
  objectifs: [
    {
      key: "extraction",
      cible: "personne",
      sites: ["residentiel", "corporatiste", "abandonne", "commercial"],
      phrase: (o) =>
        `Extraction — ${Utils.rand(["un cadre", "un chercheur", "un témoin", "un transfuge"])} lié ${ToposCatalog._aux(o.nom)}`,
    },
    {
      key: "vol_donnees",
      cible: "informations",
      sites: ["corporatiste", "industriel", "commercial", "abandonne"],
      phrase: (o) => `Vol de données chez ${o.nom}`,
    },
    {
      key: "sabotage",
      cible: "batiment",
      sites: ["industriel", "corporatiste", "abandonne"],
      phrase: (o) => `Sabotage d'une infrastructure ${ToposCatalog._de(o.nom)}`,
    },
    {
      key: "liquidation",
      cible: "personne",
      sites: ["residentiel", "commercial", "abandonne", "naturel", "corporatiste"],
      phrase: (o) => `Neutralisation d'une cible liée ${ToposCatalog._aux(o.nom)}`,
    },
    {
      key: "protection",
      cible: "personne",
      sites: ["commercial", "corporatiste", "residentiel", "naturel"],
      phrase: (o) =>
        `Protection ${Utils.rand(["d'un VIP", "d'une cargaison", "d'un témoin"])} face ${ToposCatalog._aux(o.nom)}`,
    },
    {
      key: "intimidation",
      cible: "personne",
      sites: ["commercial", "residentiel", "industriel", "naturel"],
      phrase: (o) => `Intimidation / persuasion face ${ToposCatalog._aux(o.nom)}`,
    },
  ],

  /* ---- FACTIONS (map par clé). `hire:false` = jamais mandant (loi,
     gangs, goules). Une faction n'est opposable que si elle a un
     `districts` non vide (ancrage à Seattle). `secu` pointe un
     `securityProfiles`. `rivaux` = clés d'autres factions. ---- */
  factions: {
    // Mégacorpos
    ares: { nom: "Ares Macrotechnology", secu: "knight_errant", districts: ["outremer", "downtown"], rivaux: ["aztech", "ucas", "seraphins"], johnson: "M. Johnson — Ares Macrotechnology" },
    aztech: { nom: "Aztechnology", secu: "blood_mages", districts: ["downtown"], rivaux: ["saederkrupp", "mct", "horizon"], johnson: "M. Johnson — Aztechnology" },
    horizon: { nom: "Horizon", secu: "horizon_soft", districts: ["downtown"], rivaux: ["aztech", "mct", "amazonie"], johnson: "M. Johnson — Horizon" },
    mct: { nom: "Mitsuhama (MCT)", secu: "zone_zero", districts: ["downtown", "tacoma"], rivaux: ["aztech", "horizon"], johnson: "M. Johnson — Mitsuhama" },
    evo: { nom: "Evo", secu: "bioaug", districts: ["outremer", "underground"], rivaux: ["erika", "celedyr"], johnson: "M. Johnson — Evo" },
    renraku: { nom: "Renraku", secu: "red_samurai", districts: ["bellevue", "underground"], rivaux: ["mct", "dragon_marin"], johnson: "M. Johnson — Renraku" },
    saederkrupp: { nom: "Saeder-Krupp", secu: "corpo_gen", districts: ["downtown"], rivaux: ["aztech"], johnson: "M. Johnson — Saeder-Krupp (Hans Brackhaus)" },
    fedboeing: { nom: "Federated-Boeing", secu: "corpo_gen", districts: ["auburn", "everett"], rivaux: ["saederkrupp"], johnson: "M. Johnson — Federated-Boeing" },
    wuxing: { nom: "Wuxing", secu: "corpo_gen", districts: ["downtown"], rivaux: ["saederkrupp"], johnson: "M. Johnson — Wuxing" },
    erika: { nom: "Erika (Eurocorp)", secu: "corpo_gen", districts: ["outremer"], rivaux: ["evo"], johnson: "M. Johnson — Erika" },
    celedyr: { nom: "Transys-Neuronet (Celedyr)", secu: "corpo_gen", districts: ["underground"], rivaux: ["evo"], johnson: "Émissaire de Celedyr" },
    // Externes / gouvernement / spéciaux (mandants sans ancrage-cible propre)
    amazonie: { nom: "Amazonie", secu: "corpo_gen", districts: [], rivaux: ["horizon", "aztech"], johnson: "Contact — Amazonie" },
    ucas: { nom: "le gouvernement UCAS", secu: "corpo_gen", districts: ["downtown"], rivaux: ["ares"], johnson: "Johnson gouvernemental (UCAS)" },
    seraphins: { nom: "les Séraphins (ex-Cross)", secu: "corpo_gen", districts: ["downtown"], rivaux: ["ares"], johnson: "Contact — les Séraphins" },
    particulier: { nom: "un commanditaire privé", secu: "corpo_gen", districts: [], rivaux: [], johnson: "Commanditaire privé (anonyme)" },
    // Pègre
    mafia: { nom: "la Mafia (Gianelli)", secu: "mafia", districts: ["puyallup", "renton", "tacoma"], rivaux: ["yakuza"], johnson: "Intermédiaire — la Mafia (Gianelli)" },
    yakuza: { nom: "la Yakuza", secu: "yakuza", districts: ["puyallup", "tacoma", "outremer"], rivaux: ["mafia", "komungo"], johnson: "Intermédiaire — la Yakuza" },
    vory: { nom: "le Vory (Ivan Ivanovich)", secu: "vory", districts: ["tacoma"], rivaux: ["yakuza"], johnson: "Intermédiaire — le Vory" },
    komungo: { nom: "le Komun'go", secu: "yakuza", districts: ["tacoma"], rivaux: ["yakuza"], hire: false },
    koshari: { nom: "les Koshari", secu: "koshari", districts: ["council_island"], rivaux: ["yakuza"], johnson: "Intermédiaire — les Koshari" },
    triades: { nom: "les Triades", secu: "gang", districts: ["fort_lewis"], rivaux: ["vory"], johnson: "Intermédiaire — les Triades" },
    tamanous: { nom: "Tamanous", secu: "goules", districts: ["redmond"], rivaux: [], hire: false },
    // Loi / militaire (opposition seule)
    ke_ls: { nom: "Knight Errant / Lone Star", secu: "lone_star", districts: ["downtown", "renton", "puyallup"], rivaux: [], hire: false },
    garde: { nom: "la Garde du métroplexe", secu: "militaire", districts: ["fort_lewis"], rivaux: [], hire: false },
    salish: { nom: "la frontière Salish-Shidhe", secu: "corpo_gen", districts: ["everett", "snohomish"], rivaux: [], hire: false },
    // Magie / anti-méta / dragons
    dragon_marin: { nom: "le Dragon marin", secu: "dragon_circle", districts: ["outremer", "underground"], rivaux: ["renraku"], johnson: "Émissaire du Dragon marin" },
    urubia: { nom: "Urubia (dragon)", secu: "dragon_circle", districts: ["redmond"], rivaux: [], johnson: "Émissaire d'Urubia" },
    humanis: { nom: "le Policlub Humanis", secu: "humanis", districts: ["auburn", "renton"], rivaux: [], johnson: "Contact — le Policlub Humanis" },
    toxiques: { nom: "les Toxiques de Green River", secu: "toxic_shamans", districts: ["auburn"], rivaux: [], hire: false },
    // Gangs (opposition, basse menace)
    bmb: { nom: "les Blood Mountain Boys", secu: "gang", districts: ["renton"], rivaux: ["crimson_crush"], hire: false },
    crimson_crush: { nom: "le Crimson Crush", secu: "gang", districts: ["renton", "redmond"], rivaux: ["bmb"], hire: false },
    night_hunters: { nom: "les Night Hunters", secu: "gang", districts: ["renton"], rivaux: [], hire: false },
    validus_magus: { nom: "Validus Magus", secu: "gang", districts: ["renton"], rivaux: [], hire: false },
    ancients: { nom: "les Ancients", secu: "gang", districts: ["puyallup", "auburn"], rivaux: [], hire: false },
    brain_eaters: { nom: "les Brain Eaters", secu: "gang", districts: ["redmond"], rivaux: [], hire: false },
    vigilants: { nom: "les Voisins Vigilants", secu: "vigilants", districts: ["renton"], rivaux: [], hire: false },
  },

  /* ---- DISTRICTS : menace (1-5, alimente la paie et le casting) et
     sites {type, nom, planUtile}. `planUtile` pilote le bouton « Plan
     du lieu » (Lot 4). ---- */
  districts: [
    { key: "downtown", nom: "Downtown", menace: 5, sites: [
      { type: "corporatiste", nom: "un étage de bureau corpo", planUtile: true },
      { type: "corporatiste", nom: "un laboratoire de R&D", planUtile: true },
      { type: "commercial", nom: "l'arrière-salle du Penumbra", planUtile: true },
      { type: "residentiel", nom: "un penthouse de la pyramide", planUtile: true },
      { type: "abandonne", nom: "le pénitencier Wynaco", planUtile: true },
    ] },
    { key: "bellevue", nom: "Bellevue", menace: 4, sites: [
      { type: "residentiel", nom: "une résidence sécurisée", planUtile: true },
      { type: "corporatiste", nom: "un siège corpo feutré", planUtile: true },
      { type: "commercial", nom: "le restaurant étoilé Ivory Anchor", planUtile: true },
    ] },
    { key: "auburn", nom: "Auburn", menace: 3, sites: [
      { type: "industriel", nom: "l'usine Federated-Boeing", planUtile: true },
      { type: "corporatiste", nom: "l'arcologie Green River", planUtile: true },
      { type: "residentiel", nom: "la clinique de la seconde chance", planUtile: true },
    ] },
    { key: "council_island", nom: "Council Island", menace: 4, sites: [
      { type: "corporatiste", nom: "une ambassade", planUtile: true },
      { type: "commercial", nom: "une loge hermétique", planUtile: true },
      { type: "naturel", nom: "un site astral de l'île", planUtile: false },
    ] },
    { key: "everett", nom: "Everett", menace: 3, sites: [
      { type: "industriel", nom: "les docks d'Everett", planUtile: true },
      { type: "industriel", nom: "un entrepôt portuaire", planUtile: true },
      { type: "corporatiste", nom: "un bureau de syndicat", planUtile: true },
    ] },
    { key: "fort_lewis", nom: "Fort Lewis", menace: 5, sites: [
      { type: "industriel", nom: "un dépôt milspec", planUtile: true },
      { type: "corporatiste", nom: "une base des forces armées", planUtile: true },
      { type: "commercial", nom: "la station AWOL", planUtile: true },
    ] },
    { key: "outremer", nom: "Outremer", menace: 4, sites: [
      { type: "residentiel", nom: "un manoir insulaire (Blake)", planUtile: true },
      { type: "corporatiste", nom: "l'île-laboratoire Thesis (Ares)", planUtile: true },
      { type: "naturel", nom: "une crique des îles du Sound", planUtile: false },
    ] },
    { key: "puyallup", nom: "Puyallup", menace: 2, sites: [
      { type: "abandonne", nom: "une planque des cendres", planUtile: true },
      { type: "residentiel", nom: "une clinique clandestine", planUtile: true },
      { type: "industriel", nom: "les tunnels de Carbonado", planUtile: true },
      { type: "naturel", nom: "un no man's land toxique", planUtile: false },
    ] },
    { key: "redmond", nom: "Redmond", menace: 2, sites: [
      { type: "commercial", nom: "le Funhouse d'Urubia", planUtile: true },
      { type: "residentiel", nom: "le Body Mall (hôpital-squat)", planUtile: true },
      { type: "abandonne", nom: "une ruine de Redmond", planUtile: false },
      { type: "naturel", nom: "Glow City (zone irradiée)", planUtile: false },
    ] },
    { key: "renton", nom: "Renton", menace: 3, sites: [
      { type: "residentiel", nom: "un quartier de Renton-est", planUtile: true },
      { type: "commercial", nom: "un commerce sous protection", planUtile: true },
      { type: "abandonne", nom: "une planque de gang", planUtile: true },
    ] },
    { key: "snohomish", nom: "Snohomish", menace: 2, sites: [
      { type: "industriel", nom: "une ferme NatVat", planUtile: true },
      { type: "corporatiste", nom: "le labo Aqua Arcana", planUtile: true },
      { type: "naturel", nom: "un pâturage de la frontière", planUtile: false },
    ] },
    { key: "tacoma", nom: "Tacoma", menace: 3, sites: [
      { type: "industriel", nom: "un entrepôt du Dock 44", planUtile: true },
      { type: "industriel", nom: "un cargo en cale", planUtile: true },
      { type: "commercial", nom: "la « Prison dorée »", planUtile: true },
    ] },
    { key: "underground", nom: "l'Underground", menace: 3, sites: [
      { type: "abandonne", nom: "les tunnels des Profondeurs", planUtile: true },
      { type: "commercial", nom: "un marché noir souterrain", planUtile: true },
      { type: "industriel", nom: "un serveur enfoui", planUtile: true },
    ] },
  ],

  /* ---- DIFFICULTÉS (Anarchy 2 + Vise Juste). `role` = rôle de PNJ
     injecté au casting (Lot 3b), sinon `null`. ---- */
  difficultes: [
    { label: "Double trahison du Johnson", role: null },
    { label: "Un second Johnson concurrent sur la même cible", role: null },
    { label: "Sécurité renforcée : mages + watchers astraux", role: "mage" },
    { label: "Renfort de sécurité à mi-run (quelqu'un a vendu la mise)", role: null },
    { label: "Drones de couverture non répertoriés", role: "rigger" },
    { label: "CI défensive non répertoriée", role: "decker" },
    { label: "Une équipe de runners rivale sur le même contrat", role: "runner_rival" },
    { label: "Plans du lieu périmés (mauvaise information)", role: null },
    { label: "La cible n'est pas celle annoncée (un double)", role: null },
    { label: "Il faut un contact précis pour entrer", role: null },
    { label: "Équipement rare requis pour réussir", role: null },
    { label: "Terrain hostile : zone toxique / brouillage matriciel", role: null },
    { label: "Un civil innocent pris dans la zone d'opération", role: null },
    { label: "Un journaliste avec drone documente tout en direct", role: null },
  ],

  /* ---- PROFILS DE SÉCURITÉ → casting (Lot 3b). Chaque rôle porte une
     CATÉGORIE coarse (`cat`) que RunGen traduit vers la taxonomie Coherence
     (grunt→combattant, mage, decker, rigger, leader→social) ; `spirit` n'est
     pas un PNJ (chemin d'invocation séparé) et est ignoré au casting. ---- */
  securityProfiles: {
    knight_errant: { label: "Knight Errant", roles: [{ cat: "grunt", label: "Garde Knight Errant" }, { cat: "rigger", label: "Drone de combat" }, { cat: "leader", label: "Chef de la sécurité" }] },
    lone_star: { label: "Lone Star", roles: [{ cat: "grunt", label: "Patrouilleur Lone Star" }, { cat: "grunt", label: "Agent corruptible" }, { cat: "rigger", label: "Drone de surveillance" }] },
    blood_mages: { label: "Sécurité aztèque + mages de sang", roles: [{ cat: "grunt", label: "Garde corpo" }, { cat: "mage", label: "Mage de sang" }, { cat: "grunt", label: "Adepte de sécurité" }] },
    zone_zero: { label: "MCT « zone-zéro »", roles: [{ cat: "rigger", label: "Drone tueur" }, { cat: "mage", label: "Mage corpo" }, { cat: "decker", label: "CI mortelle" }] },
    horizon_soft: { label: "Sécurité douce Horizon", roles: [{ cat: "grunt", label: "Agent en civil" }, { cat: "leader", label: "Spin doctor" }, { cat: "rigger", label: "Rigger de drones-caméras" }] },
    red_samurai: { label: "Samouraïs rouges Renraku", roles: [{ cat: "grunt", label: "Samouraï rouge" }, { cat: "decker", label: "Decker de sécurité" }, { cat: "decker", label: "CI" }] },
    corpo_gen: { label: "Sécurité corpo sous contrat", roles: [{ cat: "grunt", label: "Garde sous contrat" }, { cat: "mage", label: "Mage de sécurité" }, { cat: "decker", label: "Decker" }] },
    militaire: { label: "Forces armées / Garde du métroplexe", roles: [{ cat: "grunt", label: "Soldat" }, { cat: "grunt", label: "Fantassin lourd" }, { cat: "leader", label: "Officier" }] },
    mafia: { label: "Soldats de la Mafia", roles: [{ cat: "grunt", label: "Soldat mafieux" }, { cat: "leader", label: "Capo" }, { cat: "grunt", label: "Go-ganger affilié" }] },
    yakuza: { label: "Yakuza", roles: [{ cat: "grunt", label: "Yakuza" }, { cat: "mage", label: "Mage de combat (wuxing)" }, { cat: "decker", label: "Decker" }] },
    vory: { label: "Vory", roles: [{ cat: "grunt", label: "Homme de main du Vory" }, { cat: "grunt", label: "Tireur aux armes lourdes" }] },
    gang: { label: "Gang de rue", roles: [{ cat: "grunt", label: "Ganger" }, { cat: "leader", label: "Chef de gang" }, { cat: "mage", label: "Shaman de rue" }] },
    goules: { label: "Goules (Tamanous)", roles: [{ cat: "grunt", label: "Goule" }, { cat: "grunt", label: "Voleur de corps" }] },
    koshari: { label: "Koshari", roles: [{ cat: "grunt", label: "Homme de main koshari" }, { cat: "leader", label: "Maître-chanteur" }] },
    dragon_circle: { label: "Cercle d'un dragon", roles: [{ cat: "grunt", label: "Garde changeling" }, { cat: "spirit", label: "Esprit lié" }, { cat: "grunt", label: "Sbire dévoué" }] },
    humanis: { label: "Milice Humanis", roles: [{ cat: "grunt", label: "Milicien Humanis" }, { cat: "grunt", label: "Sympathisant armé" }] },
    toxic_shamans: { label: "Chamans toxiques", roles: [{ cat: "mage", label: "Chaman toxique" }, { cat: "spirit", label: "Esprit toxique" }] },
    bioaug: { label: "Sécurité Evo (bio-augmentés)", roles: [{ cat: "grunt", label: "Garde bio-augmenté" }, { cat: "mage", label: "Mage corpo" }] },
    vigilants: { label: "Voisins Vigilants", roles: [{ cat: "grunt", label: "Vigilant à pied" }, { cat: "grunt", label: "Patrouilleur motorisé" }] },
  },

  /* ---- OBJECTIF SECONDAIRE (bonus optionnel ; ~1/5 nul). ---- */
  bonus: [
    null, null, null,
    "Bonus : aucun mort parmi la sécurité ordinaire",
    "Bonus : récupérer un second fichier non mentionné au brief",
    "Bonus : faire croire à un accident — aucune trace de la run",
    "Bonus : ne déclencher aucune alarme",
    "Bonus : exfiltrer un informateur présent sur place",
    "Bonus : photos compromettantes d'un dirigeant (chantage futur)",
    "Bonus : laisser une fausse piste pointant vers un rival corpo",
    "Bonus : effacer toutes les traces dans les logs",
  ],

  /* ---- PALIERS de difficulté/paie. Le palier est tiré autour de la
     menace du district (± 1) : un lieu très surveillé paie mieux. ---- */
  tiers: [
    { label: "Facile", mult: 0.4 },
    { label: "Standard", mult: 1 },
    { label: "Difficile", mult: 1.8 },
    { label: "Très difficile", mult: 3 },
    { label: "Cauchemar", mult: 5 },
  ],

  /* ======================= MOTEUR ======================= */

  /** Assemble un topos cohérent. Retourne les libellés plats (compatibles
      `RunRenderer`/`Play`) + les clés structurées (Lot 3b/4). */
  assemble(facts = null) {
    const mandant = Utils.rand(this._mandants());
    const opp = this._pickOpposition(mandant, facts);
    const district = this._pickDistrict(opp);
    const site = Utils.rand(district.sites);
    const objectif = this._pickObjectif(site.type);
    const diff = Utils.rand(this.difficultes);
    // VIS-12 (P4) : une équipe très connue (réputation notable) tire des jobs un
    // cran plus gros — nudge DOUX du palier (danger+paie), jamais garanti.
    const tier = this._tier(district.menace, this._repBonus(facts));
    const pay = this._pay(tier);

    return {
      // Clés structurées (cohérence, casting, plan de lieu)
      objectif: objectif.key,
      cible: objectif.cible,
      mandant: mandant.key,
      opposition: opp.key,
      district: district.key,
      siteType: site.type,
      planUtile: !!site.planUtile,
      securityProfile: opp.secu,
      injectedRole: diff.role || null,
      // Libellés plats (rétro-compatibles)
      type: objectif.phrase(opp),
      client: mandant.johnson,
      lieu: `${district.nom} — ${site.nom}`,
      complication: diff.label,
      objectif2: Utils.rand(this.bonus),
      difficulte: tier.label,
      payment: `${pay.toLocaleString("fr-FR")}¥ par runner`,
      // VIS-12 (mémoire du monde) : si l'opposition (ou le mandant) tirée revient
      // d'un run passé de la campagne, une ANNOTATION — les picks ci-dessus sont
      // INCHANGÉS (informer, jamais décider). `facts` injecté par RunGen.
      ...this._memory(facts, opp.key, mandant.key),
      ...this._contactInject(facts),
      ...this._reputationNote(facts),
    };
  },

  /** Bonus de palier lié à la réputation (P4) : +1 si l'équipe est très connue
      (notable ≥ 20), 0 sinon. Doux, plafonné par le clamp de `_tier`. */
  _repBonus(facts) {
    const r = facts && facts.reputation;
    return r && r.notable >= 20 ? 1 : 0;
  },

  /** Annotation « votre réputation vous précède » (P4) : la piste la plus
      marquante de l'équipe, dès qu'elle pèse (notable ≥ 5). { reputationNote } ou {}. */
  _reputationNote(facts) {
    const r = facts && facts.reputation;
    if (!r || r.notable < 5) return {};
    return { reputationNote: `Votre réputation vous précède — ${r.top.label} ${r.top.value}.` };
  },

  /** Injection « contacts connus » (VIS-12 Phases 3a/3b). Renvoie soit un
      `client` (biais Johnson, P3b), soit un `contactHook` (accroche, P3a), soit {}.
      - **grillé** (stance burned) : exclu de tout — « ne rappelle plus ».
      - **redevable** (favor) ou **fixer** : peut DEVENIR le mandant (~40 % quand un
        tel contact existe) — le contact vous ramène le job (seul pick modifié, doux,
        proposé). Sinon, une accroche « pourrait être impliqué » (aucun pick changé).
      Un contact au hasard dans le vivier → varie d'un topos à l'autre. */
  _contactInject(facts) {
    if (!facts || !Array.isArray(facts.contacts)) return {};
    const usable = facts.contacts.filter((c) => c.stance !== "burned");
    if (!usable.length) return {};
    const role = (c) => (c.relation ? ` (votre ${c.relation})` : "");
    // P3b — le mandant devient un contact qui vous doit / un fixer.
    const isFixer = (c) => /fixer|johnson|interm|broker|employeur|passeur/i.test(c.relation || "");
    const johnsonPool = usable.filter((c) => c.stance === "favor" || isFixer(c));
    if (johnsonPool.length && Math.random() < 0.4) {
      const c = Utils.rand(johnsonPool);
      return { client: `${c.name}${role(c)}`, clientKnown: true };
    }
    // P3a — accroche « contact connu pourrait être impliqué ».
    const c = Utils.rand(usable);
    return { contactHook: `Contact connu : ${c.name}${role(c)} pourrait être impliqué.` };
  },

  /** Annotation « mémoire du monde » : { memory } si la faction tirée est
      heatée dans `facts` (VIS-12), {} sinon. Ne modifie aucun pick. */
  _memory(facts, oppKey, mandantKey) {
    if (!facts || !Array.isArray(facts.factions)) return {};
    const find = (k) => facts.factions.find((f) => f.key === k);
    const opp = find(oppKey);
    if (opp) return { memory: `${opp.name} — ${opp.count + 1}ᵉ run contre eux, ils vous connaissent.` };
    const man = find(mandantKey);
    if (man) return { memory: `${man.name} — ${man.count + 1}ᵉ fois qu'ils vous emploient.` };
    return {};
  },

  /** Factions qui peuvent commanditer (tout sauf `hire:false`). */
  _mandants() {
    return (this._mandantPool ||= Object.values(this.factions).filter((f) => f.hire !== false));
  },
  /** Une faction est opposable si elle a un ancrage à Seattle. */
  _hasDistrict(f) {
    return Array.isArray(f.districts) && f.districts.length > 0;
  },
  /** L'opposition = un rival du mandant ayant un ancrage ; à défaut,
      n'importe quelle faction ancrée (cas du commanditaire privé). */
  _pickOpposition(mandant, facts = null) {
    let cands = (mandant.rivaux || [])
      .map((k) => this.factions[k])
      .filter((f) => f && this._hasDistrict(f));
    if (!cands.length)
      cands = Object.values(this.factions).filter(
        (f) => f !== mandant && this._hasDistrict(f),
      );
    // VIS-12 (Phase 2) : biais DOUX vers une faction déjà affrontée (némésis
    // récurrente). Poids = 1 + min(count, 3) × 0.5 (Ares vu 2× → poids 2.0,
    // ~2× plus probable, jamais garanti). Sans heat, tous les poids valent 1
    // ⇒ tirage uniforme identique (non-régression : `assemble()` sans facts
    // inchangé). Propose, jamais décide — le MJ régénère à volonté.
    const heat = new Map();
    if (facts && Array.isArray(facts.factions))
      for (const f of facts.factions) heat.set(f.key, f.count);
    return this._weightedPick(cands, (f) => 1 + Math.min(heat.get(f.key) || 0, 3) * 0.5);
  },

  /** Tirage pondéré : `weightOf(item)` > 0. Poids tous égaux ⇒ uniforme. */
  _weightedPick(items, weightOf) {
    if (!items.length) return undefined;
    const weights = items.map(weightOf);
    const total = weights.reduce((a, b) => a + b, 0);
    if (!(total > 0)) return Utils.rand(items);
    let r = Math.random() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r < 0) return items[i];
    }
    return items[items.length - 1];
  },
  /** Un district où l'opposition opère. */
  _pickDistrict(opp) {
    const idx = (this._dIndex ||= Object.fromEntries(this.districts.map((d) => [d.key, d])));
    const ds = opp.districts.map((k) => idx[k]).filter(Boolean);
    return Utils.rand(ds.length ? ds : this.districts);
  },
  /** Un objectif jouable sur ce type de site. */
  _pickObjectif(siteType) {
    const os = this.objectifs.filter((o) => o.sites.includes(siteType));
    return Utils.rand(os.length ? os : this.objectifs);
  },
  /** Palier tiré autour de la menace (± 1), borné aux 5 paliers. */
  _tier(menace, repBonus = 0) {
    let i = menace - 1 + Utils.randInt(-1, 1) + repBonus;
    i = Math.max(0, Math.min(this.tiers.length - 1, i));
    return this.tiers[i];
  },
  _pay(tier) {
    const baseK = Utils.randInt(5, 40) * 1000;
    return Math.round((baseK * tier.mult) / 500) * 500;
  },
  /** Contraction « à + article » → à / au / aux / à la / à l'. */
  _aux(nom) {
    if (nom.startsWith("les ")) return "aux " + nom.slice(4);
    if (nom.startsWith("le ")) return "au " + nom.slice(3);
    if (nom.startsWith("la ")) return "à la " + nom.slice(3);
    if (nom.startsWith("l'")) return "à l'" + nom.slice(2);
    return "à " + nom;
  },
  /** Contraction « de + article » → de / du / des / de la / de l' / d'. */
  _de(nom) {
    if (nom.startsWith("les ")) return "des " + nom.slice(4);
    if (nom.startsWith("le ")) return "du " + nom.slice(3);
    if (nom.startsWith("la ")) return "de la " + nom.slice(3);
    if (nom.startsWith("l'")) return "de l'" + nom.slice(2);
    return (/^[AEIOUYHÉÈaeiouyhéè]/.test(nom) ? "d'" : "de ") + nom;
  },
};

// Renseigne la clé de chaque faction (évite de la dupliquer dans chaque littéral).
for (const [k, f] of Object.entries(ToposCatalog.factions)) f.key = k;
