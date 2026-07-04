"use strict";

/* ============================================================
   CONTACT GEN — génération dirigée de contacts

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

  /**
   * Génère un contact Anarchy dirigé.
   * @param {object} opts { networkId, rr (1-3), scope, metatype, gender }
   */
  generateAnarchy(opts = {}) {
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
      edition: "anarchy",
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
      trait: Utils.rand(Contacts.traits),
    };
    if (typeof Flavor !== "undefined") {
      contact.role_tags = this._roleTags(networkId);
      Flavor.apply(contact);
    }
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
      edition,
      name,
      role: cat.role,
      desc: cat.desc,
      influence,
      loyaute,
      lieu: cat.lieux ? Utils.rand(cat.lieux) : null,
      similaires: cat.similaires || null,
      metatype: this._resolveMeta(opts.metatype),
      trait: Utils.rand(Contacts.traits),
    };
    if (typeof Flavor !== "undefined") {
      contact.role_tags = opts.categoryId ? [opts.categoryId] : null;
      Flavor.apply(contact);
    }
    return contact;
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
    const pool = (Contacts.catalogueAnarchy || []).filter((c) => {
      const d = (c.domaine || "").toLowerCase();
      return d.includes(target) || d.includes("tous domaines");
    });
    if (!pool.length) {
      // fallback : tous domaines, sinon n'importe lequel
      const any = (Contacts.catalogueAnarchy || []).filter((c) =>
        (c.domaine || "").toLowerCase().includes("tous domaines"),
      );
      return Utils.rand(any.length ? any : Contacts.catalogueAnarchy || [null]);
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
    const catalogue = Contacts.catalogueSR || [];
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
