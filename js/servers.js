"use strict";

/* ============================================================
   SERVEURS & CI — assistance aux intrusions matricielles
   (issue #14). Panneau « Matrice » : bibliothèque de serveurs
   avec groupes (même socle que ContactsBook), génération
   dirigée ou aléatoire, et tracker d'intrusion en direct.

   Sources :
   - Anarchy 2.0 p.220-225 : indice 2-7 (+1 sécurité physique),
     Firewall = indice, glaces à succès fixes (= indice), FW 1,
     moniteur 2L/1G/1I, une glace déployée par tour après
     détection. Surveillance du DIEU p.218 : effets cumulatifs
     sur complications (mineure : +2 dés de risque min ;
     critique : seuil de Piratage +1 ; désastre : convergence).
   - SR5 p.247-251 (VF « serveurs ») : indice 1-12, attributs
     ASDF = indice à indice+3 ; CI : attaque indice×2 [Attaque],
     moniteur 8+(indice/2), 1 CI/tour, max = indice, une copie
     par type. SS p.233 : +succès défense par action illégale,
     +2D6/15 min, convergence à 40.
     NB : la table d'exemples d'indices VF p.249 est décalée
     (ligne 3-4 manquante) — on utilise la répartition corrigée.
   - SR6 p.187-190 : idem indices/ASDF ; CI : jets = indice×2,
     moniteur 8+(indice/2), SO = ATQ+COR, init TdD×2+3D6.
     SS p.178 : +succès défense, +1/programme de hacking,
     +1/round par accès Utilisateur illégal, +3/round par accès
     Admin illégal, convergence à 40.
   ============================================================ */
const Servers = {
  data: {
    all: [],
    groups: {},
  },
  currentGroup: "all",

  /* ========================================================
     CATALOGUES — types de CI par édition
     ======================================================== */
  IC: {
    // Anarchy 2.0 p.223 — succès fixes = indice, FW 1, moniteur 2L/1G/1I
    anarchy: {
      patrouilleuse: {
        label: "Patrouilleuse",
        watch: true,
        effect: (i) =>
          `Perception (matricielle) : ${i} succès fixes vs Furtivité (discrétion matricielle) + LOG du decker. Donne l'alerte.`,
      },
      acide: {
        label: "Acide",
        effect: (i) =>
          `Cybercombat : ${i} succès fixes — chaque attaque réussie réduit le Firewall de la cible de 1 (durée : la Scène, aucun dommage).`,
      },
      blaster: {
        label: "Blaster",
        effect: (i) =>
          `Cybercombat : ${i} succès fixes — verrouillage de connexion (1 tour) + dommages matriciels VD ${Math.ceil(i / 2)}.`,
      },
      bloqueuse: {
        label: "Bloqueuse",
        effect: (i) =>
          `Cybercombat : ${i} succès fixes — chaque attaque réussie réduit l'Attaque de la cible de 1 (durée : la Scène, aucun dommage).`,
      },
      noire: {
        label: "Noire",
        effect: (i) =>
          `Cybercombat : ${i} succès fixes — dommages de biofeedback VD ${Math.ceil(i / 2)} (encaissés avec la Volonté en RV).`,
      },
      potdecolle: {
        label: "Pot de colle",
        effect: (i) =>
          `Cybercombat : ${i} succès fixes — verrouillage de connexion (1 tour, aucun dommage).`,
      },
      traqueuse: {
        label: "Traqueuse",
        effect: (i) =>
          `Cybercombat : ${i} succès fixes — découvre la localisation physique de la cible (aucun dommage).`,
      },
      tueuse: {
        label: "Tueuse",
        effect: (i) => `Cybercombat : ${i} succès fixes — dommages matriciels VD ${i}.`,
      },
    },

    // SR5 p.248-251 — attaque = indice×2 [Attaque]
    sr5: {
      patrouilleuse: {
        label: "CI Patrouilleuse",
        watch: true,
        effect: (s) =>
          `Perception matricielle sur toutes les icônes du serveur (active en permanence, n'attaque pas, ne subit pas de dommages sur échec).`,
      },
      acide: {
        label: "CI Acide",
        def: "Volonté + Firewall",
        effect: (s) =>
          `Réduit le Firewall de la cible de 1 (cumulatif, jusqu'au reboot). Firewall 0 → 1 case de dommages par succès excédentaire.`,
      },
      blaster: {
        label: "CI Blaster",
        def: "Logique + Firewall",
        effect: (s) =>
          `${s.attrs.ATQ} cases matricielles (+1/succès exc., +2/mark) + autant en biofeedback étourdissant. Verrouille la connexion.`,
      },
      bloqueuse: {
        label: "CI Bloqueuse",
        def: "Volonté + Attaque",
        effect: (s) =>
          `Réduit l'Attaque de la cible de 1 (cumulatif, jusqu'au reboot). Attaque 0 → 1 case de dommages par succès excédentaire.`,
      },
      brouilleuse: {
        label: "CI Brouilleuse",
        def: "Volonté + Firewall",
        effect: (s) =>
          `Si le serveur a 3 marks sur la cible : reboot immédiat de l'appareil (choc d'éjection en RV).`,
      },
      crash: {
        label: "CI Crash",
        def: "Intuition + Firewall",
        effect: (s) =>
          `Si le serveur a une mark sur la cible : plante un programme aléatoire (indisponible jusqu'au reboot).`,
      },
      fragmenteuse: {
        label: "CI Fragmenteuse",
        def: "Volonté + Trait. de données",
        effect: (s) =>
          `Réduit le Traitement de données de la cible de 1 (cumulatif, jusqu'au reboot). TdD 0 → 1 case de dommages par succès exc.`,
      },
      furie: {
        label: "CI Furie",
        def: "Intuition + Firewall",
        effect: (s) =>
          `« Tueuse psychopathe » : VD ${s.attrs.ATQ} matriciels (+1/succès exc., +2/mark) + autant en dommages de biofeedback.`,
      },
      noire: {
        label: "CI Noire",
        def: "Intuition + Firewall",
        effect: (s) =>
          `Verrouille la connexion. VD ${s.attrs.ATQ} matriciels (+1/succès exc., +2/mark) + autant en biofeedback physique.`,
      },
      potdecolle: {
        label: "CI Pot de colle",
        def: "Logique + Firewall",
        effect: (s) =>
          `Verrouille la connexion. Si déjà verrouillée : pose une mark (max 3).`,
      },
      rongeuse: {
        label: "CI Rongeuse",
        def: "Volonté + Corruption",
        effect: (s) =>
          `Réduit la Corruption de la cible de 1 (cumulatif, jusqu'au reboot). Corruption 0 → 1 case de dommages par succès exc.`,
      },
      sonde: {
        label: "CI Sonde",
        def: "Intuition + Firewall",
        effect: (s) => `Chaque attaque réussie pose une mark sur la cible (max 3).`,
      },
      traqueuse: {
        label: "CI Traqueuse",
        def: "Volonté + Corruption",
        effect: (s) =>
          `Si succès exc. et ≥ 2 marks du serveur : localisation physique découverte et signalée aux autorités.`,
      },
      tueuse: {
        label: "CI Tueuse",
        def: "Intuition + Firewall",
        effect: (s) => `VD ${s.attrs.ATQ} dommages matriciels (+1/succès exc., +2/mark).`,
      },
    },

    // SR6 p.188-189 — jets = indice×2, SO = ATQ+COR
    sr6: {
      patrouilleuse: {
        label: "CI Patrouilleuse",
        watch: true,
        effect: (s) =>
          `Percevoir la Matrice à l'entrée d'un intrus, puis 1×/minute ou après chaque action illégale. Prévient la sécurité, peut déclencher une CI.`,
      },
      acide: {
        label: "CI Acide",
        def: "Volonté + Firewall",
        effect: (s) =>
          `Réduit le Firewall de la cible de 1 par succès net (régénère 1 pt/min après avoir quitté le serveur).`,
      },
      blaster: {
        label: "CI Blaster",
        def: "Logique + Firewall",
        effect: (s) =>
          `${s.indice} dommages matriciels + verrouillage de connexion.`,
      },
      bloqueuse: {
        label: "CI Bloqueuse",
        def: "Volonté + Attaque",
        effect: (s) =>
          `Réduit l'Attaque de la cible de 1 par succès net (à 0 : plus d'action avec cet attribut ; régén. 1 pt/min hors serveur).`,
      },
      brouilleuse: {
        label: "CI Brouilleuse",
        def: "Volonté + Firewall",
        effect: (s) =>
          `Force la cible à rebooter à son prochain tour, sauf si elle subit un verrouillage de connexion.`,
      },
      crash: {
        label: "CI Crash",
        def: "Intuition + Firewall",
        effect: (s) => `Fait planter un programme au hasard (indisponible jusqu'au reboot).`,
      },
      fragmenteuse: {
        label: "CI Fragmenteuse",
        def: "Volonté + Trait. de données",
        effect: (s) =>
          `Réduit le Traitement de données de 1 par succès net (à 0 : plus aucune action matricielle ; régén. 1 pt/min hors serveur).`,
      },
      furie: {
        label: "CI Furie",
        def: "Intuition + Firewall",
        effect: (s) => `${s.indice} + succès nets en dommages de biofeedback.`,
      },
      noire: {
        label: "CI Noire",
        def: "Intuition + Firewall",
        effect: (s) =>
          `${s.indice} + succès nets en dommages matriciels ET autant en biofeedback.`,
      },
      potdecolle: {
        label: "CI Pot de colle",
        def: "Logique + Firewall",
        effect: (s) => `Verrouillage de connexion.`,
      },
      rongeuse: {
        label: "CI Rongeuse",
        def: "Volonté + Corruption",
        effect: (s) =>
          `Réduit la Corruption de 1 par succès net (à 0 : plus d'action avec cet attribut ; régén. 1 pt/min hors serveur).`,
      },
      traqueuse: {
        label: "CI Traqueuse",
        def: "Volonté + Corruption",
        effect: (s) => `Découvre la localisation physique de la cible (aucun dommage).`,
      },
      tueuse: {
        label: "CI Tueuse",
        def: "Intuition + Firewall",
        effect: (s) => `${s.indice} + succès nets en dommages matriciels.`,
      },
    },
  },

  /* ---- Profils d'indice (tables officielles) ----
     sev : sévérité 0/1/2 pour la sélection aléatoire des CI. */
  PROFILES: {
    // Anarchy 2.0 p.222
    anarchy: [
      { id: "bricole", label: "Bricolé, très bas de gamme ou daté", indice: 2, sev: 0 },
      { id: "basdegamme", label: "Bas de gamme (ex : Stuffer Shack)", indice: 3, sev: 0 },
      { id: "moyen", label: "Moyen (corporation classique)", indice: 4, sev: 1 },
      { id: "securise", label: "Sécurisé (AA / AAA, serveur critique)", indice: 5, sev: 1 },
      { id: "hautesecu", label: "Haute sécurité (critique d'une AAA)", indice: 6, sev: 2 },
      { id: "extreme", label: "Sécurité extrême (R&D AAA, militaire)", indice: 7, sev: 2 },
    ],
    // SR5 p.249 (répartition VO corrigée) / SR6 p.187
    sr5: [
      { id: "perso", label: "Sites personnels, archives pirates, éducation publique", min: 1, max: 2, sev: 0 },
      { id: "commerce", label: "Petit commerce, entreprise privée, petits policlubs", min: 3, max: 4, sev: 0 },
      { id: "pub", label: "Sites publicitaires, bibliothèques, policlubs internationaux", min: 5, max: 6, sev: 1 },
      { id: "corpolocal", label: "Jeux matriciels, corpos locales, universités, petit gouvernement", min: 7, max: 8, sev: 1 },
      { id: "regional", label: "Groupes influents, corpos régionales, gouvernement majeur", min: 9, max: 10, sev: 2 },
      { id: "megacorpo", label: "QG de mégacorpo, commandement militaire, siège clandestin", min: 11, max: 12, sev: 2 },
    ],
    get sr6() {
      return this.sr5;
    },
  },

  /* ---- Génération de noms / sculptures ---- */
  ORGS: [
    // sev 0 : commerces et sites locaux
    ["Stuffer Shack", "Nukit Burgers", "McHugh's", "Kong-Walmart", "Bibliothèque municipale de Touristville", "Crusher 495", "Weapons World", "Clinique de quartier", "Matchsticks", "Armadillo Business Software"],
    // sev 1 : corpos locales et institutions
    ["Gaeatronics", "Telestrian Industries", "Brackhaven Investments", "Federated-Boeing", "Université de Washington", "KSAF", "DocWagon Seattle", "Lone Star Seattle", "Knight Errant Seattle", "Metroplex de Seattle"],
    // sev 2 : AAA, militaire, clandestin
    ["Renraku", "Ares Macrotechnology", "Aztechnology", "Horizon", "Shiawase", "Mitsuhama", "Evo", "Wuxing", "Saeder-Krupp", "Spinrad Global", "Fort Lewis (UCAS)"],
  ],
  SUFFIXES: [
    "serveur commercial",
    "serveur administratif",
    "serveur de travail",
    "serveur de données",
    "serveur de sécurité",
    "serveur R&D",
    "nœud d'archives",
    "serveur logistique",
  ],
  SCULPTURES: [
    "Château japonais médiéval : jardins zen, personas en kimono, glaces en armure de samouraï.",
    "Cathédrale gothique de données, vitraux de flux lumineux, échos de chants grégoriens.",
    "Centre commercial hypersaturé de publicités, mascottes animées et muzak inlassable.",
    "Open-space corporatiste infini se répétant en fractale, néons blancs, odeur virtuelle de café.",
    "Jungle luxuriante dont les lianes sont des flux de données, faune-icônes exotique.",
    "Station orbitale chromée, baies vitrées sur une Terre virtuelle, gravité fantaisiste.",
    "Speakeasy années 1920 : jazz feutré, fumée volumétrique, videurs en costume rayé.",
    "Bunker militaire en béton brut, éclairage rouge, sirènes silencieuses, portes blindées.",
    "Récif corallien bioluminescent, personas-poissons, glaces en requins blancs.",
    "Bibliothèque infinie aux rayonnages impossibles, fichiers reliés plein cuir.",
    "Temple aztèque monumental, glyphes de lumière, escaliers processionnels.",
    "Arcade rétro 8-bit : sprites pixelisés, chiptunes, glaces en fantômes de Pac-Man.",
  ],

  /* ========================================================
     ACCESSEURS
     ======================================================== */
  _edition() {
    return typeof App !== "undefined" ? App.edition : "anarchy";
  },

  icCatalog(edition) {
    return this.IC[edition] || this.IC.anarchy;
  },

  profiles(edition) {
    return this.PROFILES[edition === "sr6" ? "sr5" : edition] || this.PROFILES.anarchy;
  },

  find(id) {
    return this.data.all.find((s) => s.id === id);
  },

  /** Taille du moniteur matriciel d'une CI. */
  icMonitorSize(srv) {
    return srv.edition === "anarchy" ? 4 : 8 + Math.ceil(srv.indice / 2);
  },

  /* ========================================================
     PERSISTANCE / GROUPES (même socle que ContactsBook)
     ======================================================== */
  load() {
    this.data.all = Storage.get("servers_all", []);
    this.data.groups = Storage.get("servers_groups", {});
  },

  save() {
    Storage.set("servers_all", this.data.all);
    Storage.set("servers_groups", this.data.groups);
  },

  remove(id) {
    const s = this.find(id);
    if (s && !confirm(`Supprimer le serveur « ${s.name} » ?`)) return;
    this.data.all = this.data.all.filter((x) => x.id !== id);
    for (const g of Object.keys(this.data.groups)) {
      this.data.groups[g] = this.data.groups[g].filter((i) => i !== id);
    }
    this.save();
    this.render();
    if (s) toast(`${s.name} supprimé.`);
  },

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

  /* ========================================================
     GÉNÉRATION
     ======================================================== */
  _newIntrusion() {
    return {
      open: false,
      alerted: false,
      turn: 0,
      ics: {},
      marks: 0,
      ss: 0,
      ssLog: [],
      lastRollT: 0,
      illUser: 0,
      illAdmin: 0,
      minor: 0,
      critical: 0,
      converged: false,
    };
  },

  /** Crée un serveur depuis le formulaire du panneau. */
  createFromForm() {
    const ed = this._edition();
    const profiles = this.profiles(ed);

    const profSel = (document.getElementById("srv-profile") || {}).value || "random";
    const profile =
      profSel === "random"
        ? Utils.rand(profiles)
        : profiles.find((p) => p.id === profSel) || Utils.rand(profiles);

    let indice;
    const indSel = (document.getElementById("srv-indice") || {}).value || "auto";
    if (indSel === "auto") {
      indice =
        ed === "anarchy" ? profile.indice : Utils.randInt(profile.min, profile.max);
    } else {
      indice = parseInt(indSel, 10);
    }
    const secPhys =
      ed === "anarchy" && !!(document.getElementById("srv-secphys") || {}).checked;
    if (secPhys) indice += 1;

    // Attributs ASDF (SR5/SR6) : indice à indice+3 répartis au hasard
    let attrs = null;
    if (ed !== "anarchy") {
      const vals = [indice, indice + 1, indice + 2, indice + 3].sort(
        () => Math.random() - 0.5,
      );
      attrs = { ATQ: vals[0], COR: vals[1], TDD: vals[2], FW: vals[3] };
    }

    // Liste des CI : sélection manuelle si des cases sont cochées, sinon auto
    const checked = Array.from(
      document.querySelectorAll("#srv-ic-choices input:checked"),
    ).map((el) => el.value);
    const icList = checked.length
      ? ["patrouilleuse", ...checked.filter((k) => k !== "patrouilleuse")]
      : this._pickICs(ed, indice, profile.sev);

    const nameInput = (document.getElementById("srv-name") || {}).value || "";
    const name = nameInput.trim() || this._makeName(profile.sev);

    const srv = {
      id: Utils.uid(),
      edition: ed,
      name,
      profile: profile.label,
      indice,
      secPhys,
      attrs,
      icList,
      sculpture: Utils.rand(this.SCULPTURES),
      spider: null,
      notes: "",
      intrusion: this._newIntrusion(),
    };

    if ((document.getElementById("srv-spider") || {}).checked) {
      srv.spider = this._makeSpider(srv);
    }

    this.data.all.push(srv);
    if (this.currentGroup !== "all" && this.data.groups[this.currentGroup]) {
      this.data.groups[this.currentGroup].push(srv.id);
    }
    this.save();
    this.render();
    toast(`✓ ${srv.name} (indice ${srv.indice}) créé.`);
  },

  /** Sélection aléatoire cohérente des CI (Patrouilleuse toujours). */
  _pickICs(edition, indice, sev) {
    const pools = {
      anarchy: [
        ["tueuse", "potdecolle"],
        ["traqueuse", "blaster", "acide", "bloqueuse"],
        ["noire"],
      ],
      sr5: [
        ["tueuse", "potdecolle", "sonde", "crash", "brouilleuse"],
        ["acide", "bloqueuse", "fragmenteuse", "rongeuse", "traqueuse", "blaster"],
        ["furie", "noire"],
      ],
      sr6: [
        ["tueuse", "potdecolle", "crash", "brouilleuse"],
        ["acide", "bloqueuse", "fragmenteuse", "rongeuse", "traqueuse", "blaster"],
        ["furie", "noire"],
      ],
    };
    const tiers = pools[edition] || pools.anarchy;
    const candidates = [...tiers[0]];
    if (sev >= 1) candidates.push(...tiers[1]);
    if (sev >= 2) candidates.push(...tiers[2]);

    const n =
      edition === "anarchy"
        ? Utils.clamp(1 + Math.round(indice / 2) + Utils.randInt(-1, 1), 1, candidates.length)
        : Utils.clamp(2 + Math.ceil(indice / 3) + Utils.randInt(-1, 1), 2, candidates.length);

    const shuffled = candidates.sort(() => Math.random() - 0.5);
    const chosen = shuffled.slice(0, n);
    // Les serveurs les plus durs sortent leur signature : la Noire.
    if (sev >= 2 && !chosen.includes("noire") && Utils.randBool(0.6)) {
      chosen[chosen.length - 1] = "noire";
    }
    return ["patrouilleuse", ...chosen];
  },

  _makeName(sev) {
    const org = Utils.rand(this.ORGS[Utils.clamp(sev, 0, 2)]);
    return `${org} — ${Utils.rand(this.SUFFIXES)}`;
  },

  /* ---- Spider (decker de sécurité lié) ---- */
  _spiderOpts(srv) {
    if (srv.edition === "anarchy") {
      return {
        meta: "Aléatoire",
        gender: "Aléatoire",
        archetype: srv.indice >= 6 ? "Decker d'élite" : "Decker de sécurité",
        tier: "Aléatoire",
        special: "Aucun",
      };
    }
    const proRating = String(Utils.clamp(Math.ceil(srv.indice / 2), 2, 6));
    return {
      meta: "Aléatoire",
      gender: "Aléatoire",
      archetype:
        srv.edition === "sr5" ? "Spécialiste contre-mesures" : "Decker freelance",
      proRating,
      tier: "Aléatoire",
      special: "Decker",
    };
  },

  _makeSpider(srv) {
    const Mod =
      typeof App !== "undefined" && App.getEditionModule
        ? App.getEditionModule(srv.edition)
        : null;
    if (!Mod || !Mod.generate) return null;
    const pnj = Mod.generate(this._spiderOpts(srv));
    pnj.archetype = `Spider — ${pnj.archetype}`;
    pnj.ownerName = srv.name;
    return pnj;
  },

  addSpider(id) {
    const srv = this.find(id);
    if (!srv) return;
    srv.spider = this._makeSpider(srv);
    this.save();
    this.render();
    if (srv.spider) toast(`Spider ${srv.spider.name} en poste sur ${srv.name}.`);
  },

  removeSpider(id) {
    const srv = this.find(id);
    if (!srv || !srv.spider) return;
    const name = srv.spider.name;
    srv.spider = null;
    this.save();
    this.render();
    toast(`${name} relevé de son poste.`);
  },

  /** Recherche d'un spider par id de PNJ (intégration lancer de dés). */
  findSpider(pnjId) {
    for (const s of this.data.all) {
      if (s.spider && s.spider.id === pnjId) return s.spider;
    }
    return null;
  },

  ownsPnj(pnjId) {
    return !!this.findSpider(pnjId);
  },

  /* ========================================================
     TRACKER D'INTRUSION
     ======================================================== */
  _intr(id) {
    const srv = this.find(id);
    if (!srv) return null;
    if (!srv.intrusion) srv.intrusion = this._newIntrusion();
    return srv;
  },

  toggleIntrusion(id) {
    const srv = this._intr(id);
    if (!srv) return;
    srv.intrusion.open = !srv.intrusion.open;
    this.save();
    this.render();
  },

  /** L'alerte est donnée (la Patrouilleuse a repéré l'intrus). */
  setAlert(id) {
    const srv = this._intr(id);
    if (!srv) return;
    srv.intrusion.alerted = !srv.intrusion.alerted;
    if (srv.intrusion.alerted && srv.intrusion.turn === 0) srv.intrusion.turn = 1;
    this.save();
    this.render();
  },

  /** Tour suivant : déploie la prochaine CI (1/tour) + SS SR6. */
  nextTurn(id) {
    const srv = this._intr(id);
    if (!srv) return;
    const intr = srv.intrusion;
    intr.turn += 1;

    // SR6 : accès illégaux maintenus (+1/round Utilisateur, +3/round Admin)
    if (srv.edition === "sr6" && (intr.illUser > 0 || intr.illAdmin > 0)) {
      const delta = intr.illUser * 1 + intr.illAdmin * 3;
      this._pushSS(srv, delta, `accès illégaux maintenus (${intr.illUser}U/${intr.illAdmin}A)`);
    }

    // Déploiement : une CI par tour, si l'alerte est donnée
    if (intr.alerted) {
      const maxActive = srv.edition === "anarchy" ? Infinity : srv.indice;
      const active = srv.icList.filter((k) => {
        const st = intr.ics[k];
        return st && st.active && !st.down;
      }).length;
      if (active < maxActive) {
        const next = srv.icList.find((k) => {
          if (k === "patrouilleuse") return false;
          const st = intr.ics[k];
          return !st || !st.active;
        });
        if (next) {
          intr.ics[next] = { active: true, dmg: 0, down: false, turn: intr.turn };
          const label = this.icCatalog(srv.edition)[next]?.label || next;
          toast(`Le serveur déploie : ${label}.`);
        }
      }
    }
    this.save();
    this.render();
  },

  resetIntrusion(id) {
    const srv = this._intr(id);
    if (!srv) return;
    if (!confirm("Réinitialiser l'intrusion (tours, CI, surveillance) ?")) return;
    const open = srv.intrusion.open;
    srv.intrusion = this._newIntrusion();
    srv.intrusion.open = open;
    this.save();
    this.render();
  },

  /** Relance une CI détruite (dès le tour suivant, au choix du serveur). */
  relaunchIC(id, key) {
    const srv = this._intr(id);
    if (!srv) return;
    srv.intrusion.ics[key] = {
      active: true,
      dmg: 0,
      down: false,
      turn: srv.intrusion.turn,
    };
    this.save();
    this.render();
  },

  /** Clic sur une case du moniteur d'une CI. */
  icBox(id, key, n) {
    const srv = this._intr(id);
    if (!srv) return;
    const st = (srv.intrusion.ics[key] ||= { active: true, dmg: 0, down: false });
    st.dmg = st.dmg === n ? n - 1 : n;
    const size = this.icMonitorSize(srv);
    st.down = st.dmg >= size;
    this.save();
    this.render();
  },

  /* ---- Marks (SR5) ---- */
  addMarks(id, delta) {
    const srv = this._intr(id);
    if (!srv) return;
    srv.intrusion.marks = Utils.clamp(srv.intrusion.marks + delta, 0, 3);
    this.save();
    this.render();
  },

  /* ---- Score de Surveillance (SR5/SR6) ---- */
  _pushSS(srv, delta, label) {
    const intr = srv.intrusion;
    intr.ss = Math.max(0, intr.ss + delta);
    intr.ssLog.unshift({ t: Date.now(), d: delta, label });
    if (intr.ssLog.length > 30) intr.ssLog.length = 30;
  },

  addSS(id, delta, label) {
    const srv = this._intr(id);
    if (!srv) return;
    this._pushSS(srv, delta, label || "succès de la défense");
    this.save();
    this.render();
  },

  /** SR5 : +2D6 toutes les 15 minutes (jet réel, loggé au journal). */
  addSS2D6(id) {
    const srv = this._intr(id);
    if (!srv) return;
    const res = Dice.computeInitiative(0, 2);
    Dice._animate(res, { label: "Surveillance DIEU : +2D6 SS", who: srv.name });
    srv.intrusion.lastRollT = Date.now();
    this._pushSS(srv, res.total, `+2D6 (temps) : [${res.faces.join(", ")}]`);
    this.save();
    this.render();
  },

  undoSS(id) {
    const srv = this._intr(id);
    if (!srv || !srv.intrusion.ssLog.length) return;
    const last = srv.intrusion.ssLog.shift();
    srv.intrusion.ss = Math.max(0, srv.intrusion.ss - last.d);
    this.save();
    this.render();
  },

  /** Reboot du decker : SS et marks repartent à zéro. */
  resetSS(id) {
    const srv = this._intr(id);
    if (!srv) return;
    if (!confirm("Reboot du decker : SS et marks à zéro ?")) return;
    srv.intrusion.ss = 0;
    srv.intrusion.ssLog = [];
    srv.intrusion.marks = 0;
    srv.intrusion.lastRollT = 0;
    this.save();
    this.render();
    toast("SS remis à zéro (reboot : perte des marks, choc d'éjection en RV).");
  },

  /** SR6 : compteurs d'accès illégaux maintenus. */
  setIllegal(id, kind, delta) {
    const srv = this._intr(id);
    if (!srv) return;
    const k = kind === "admin" ? "illAdmin" : "illUser";
    srv.intrusion[k] = Utils.clamp(srv.intrusion[k] + delta, 0, 9);
    this.save();
    this.render();
  },

  /* ---- Surveillance du DIEU (Anarchy p.218) ---- */
  dieu(id, kind, delta) {
    const srv = this._intr(id);
    if (!srv) return;
    const k = kind === "critical" ? "critical" : "minor";
    srv.intrusion[k] = Utils.clamp(srv.intrusion[k] + delta, 0, 9);
    this.save();
    this.render();
  },

  disaster(id) {
    const srv = this._intr(id);
    if (!srv) return;
    srv.intrusion.converged = !srv.intrusion.converged;
    this.save();
    this.render();
  },

  /** Anarchy : reboot + 1 h hors ligne — les malus disparaissent. */
  rebootDecker(id) {
    const srv = this._intr(id);
    if (!srv) return;
    srv.intrusion.minor = 0;
    srv.intrusion.critical = 0;
    srv.intrusion.converged = false;
    this.save();
    this.render();
    toast("Reboot + 1 h hors ligne : malus DIEU effacés, tous les accès sont perdus.");
  },

  editNote(id, value) {
    const srv = this.find(id);
    if (srv) {
      srv.notes = value;
      this.save();
    }
  },

  /* ========================================================
     RENDU — panneau, formulaire, cartes
     ======================================================== */
  initPanel() {
    this.load();
    this.renderForm();
    this.render();
  },

  render() {
    this._renderSidebar();
    this._renderGrid();
  },

  renderForm() {
    const host = document.getElementById("server-gen-form");
    if (!host) return;
    const ed = this._edition();
    const esc = CardRenderer._esc.bind(CardRenderer);

    const profOpts = [
      `<option value="random">Aléatoire</option>`,
      ...this.profiles(ed).map(
        (p) =>
          `<option value="${p.id}">${esc(p.label)}${ed === "anarchy" ? ` (${p.indice})` : ` (${p.min}-${p.max})`}</option>`,
      ),
    ].join("");

    const range = ed === "anarchy" ? [2, 8] : [1, 12];
    const indOpts = [
      `<option value="auto">Selon profil</option>`,
      ...Array.from({ length: range[1] - range[0] + 1 }, (_, i) => range[0] + i).map(
        (n) => `<option value="${n}">${n}</option>`,
      ),
    ].join("");

    const icChips = Object.entries(this.icCatalog(ed))
      .filter(([k]) => k !== "patrouilleuse")
      .map(
        ([k, ic]) => `
        <label class="ic-choice"><input type="checkbox" value="${k}">${esc(ic.label.replace(/^CI /, ""))}</label>`,
      )
      .join("");

    host.innerHTML = `
      <div class="contact-form">
        <div class="contact-form-row">
          <label>Nom
            <input type="text" id="srv-name" placeholder="Aléatoire si vide">
          </label>
          <label>Profil
            <select id="srv-profile">${profOpts}</select>
          </label>
          <label>Indice
            <select id="srv-indice">${indOpts}</select>
          </label>
        </div>
        <div class="contact-form-row server-form-flags">
          ${ed === "anarchy" ? `<label class="ic-choice"><input type="checkbox" id="srv-secphys">Gère la sécurité physique (+1 indice)</label>` : ""}
          <label class="ic-choice"><input type="checkbox" id="srv-spider">Spider (decker de sécurité lié)</label>
        </div>
        <details class="server-ic-details">
          <summary>CI présentes — sélection auto (Patrouilleuse toujours incluse), ou au choix :</summary>
          <div id="srv-ic-choices" class="server-ic-choices">${icChips}</div>
        </details>
      </div>`;
  },

  _renderSidebar() {
    const container = document.getElementById("servers-group-list");
    if (!container) return;
    const groups = Object.keys(this.data.groups);

    const allActive = this.currentGroup === "all" ? "active" : "";
    let html = `<div class="group-item ${allActive}" onclick="Servers.switchGroup('all')">
      <span class="group-item-icon">⌗</span>
      <span class="group-item-name">Tous</span>
      <span class="group-item-count">${this.data.all.length}</span>
    </div>`;

    for (const g of groups) {
      const count = this.data.groups[g].length;
      const active = this.currentGroup === g ? "active" : "";
      const gSafe = g.replace(/'/g, "\\'");
      html += `<div class="group-item ${active}" onclick="Servers.switchGroup('${gSafe}')">
        <span class="group-item-icon">▸</span>
        <span class="group-item-name">${g}</span>
        <span class="group-item-count">${count}</span>
        <span class="group-item-actions">
          <button class="btn-icon-tiny" onclick="event.stopPropagation(); Servers.renameGroup('${gSafe}')" title="Renommer">✎</button>
          <button class="btn-icon-tiny danger" onclick="event.stopPropagation(); Servers.removeGroup('${gSafe}')" title="Supprimer">✕</button>
        </span>
      </div>`;
    }

    container.innerHTML = html;

    const label = document.getElementById("servers-group-label");
    if (label) {
      label.textContent =
        this.currentGroup === "all"
          ? `Tous les serveurs (${this.data.all.length})`
          : `${this.currentGroup} (${(this.data.groups[this.currentGroup] || []).length})`;
    }
  },

  filterText: "",
  setFilter(v) {
    this.filterText = v || "";
    this._renderGrid();
  },
  _matchesFilter(s) {
    const q = Utils.searchNorm(this.filterText).trim();
    if (!q) return true;
    const hay = Utils.searchNorm(
      [s.name, s.profile, `indice ${s.indice}`].filter(Boolean).join(" "),
    );
    return q.split(/\s+/).every((word) => hay.includes(word));
  },

  _renderGrid() {
    const grid = document.getElementById("servers-grid");
    if (!grid) return;
    grid.innerHTML = "";

    let list = this.data.all;
    if (this.currentGroup !== "all") {
      const ids = this.data.groups[this.currentGroup] || [];
      list = this.data.all.filter((s) => ids.includes(s.id));
    }
    list = list.slice().reverse();
    const unfiltered = list.length;
    list = list.filter((s) => this._matchesFilter(s));

    if (!list.length) {
      grid.innerHTML =
        unfiltered > 0 && this.filterText.trim()
          ? `<div class="empty-state">
              <span class="empty-state-title">Aucun résultat</span>
              Aucun serveur ne correspond à « ${CardRenderer._esc(this.filterText.trim())} ».
            </div>`
          : `<div class="empty-state">
              <span class="empty-state-title">Aucun serveur ici</span>
              Créez un serveur avec le formulaire ci-dessus, ou lancez la génération aléatoire.
            </div>`;
      return;
    }

    const allGroups = Object.keys(this.data.groups);
    for (const srv of list) {
      grid.appendChild(this._renderCard(srv, allGroups));
      if (srv.spider) {
        const sub = CardRenderer.render(srv.spider, []);
        sub.classList.add("vehicle-card");
        grid.appendChild(sub);
      }
    }
  },

  _renderCard(srv, allGroups) {
    const esc = CardRenderer._esc.bind(CardRenderer);
    const card = document.createElement("div");
    card.className = "server-card";
    card.dataset.id = srv.id;

    const intr = srv.intrusion || this._newIntrusion();
    const catalog = this.icCatalog(srv.edition);

    /* -- header + stats -- */
    let statsHtml;
    if (srv.edition === "anarchy") {
      statsHtml = `
        <div class="server-attrs">
          <span class="server-attr"><b>${srv.indice}</b>Indice</span>
          <span class="server-attr"><b>${srv.indice}</b>Firewall</span>
        </div>
        <div class="server-thresholds">Seuils de Piratage : sans élévation <b>${srv.indice}</b> · élever à Utilisateur <b>${srv.indice + 1}</b> · à Administrateur <b>${srv.indice + 2}</b> · décryptage <b>${srv.indice}</b></div>`;
    } else {
      const a = srv.attrs || { ATQ: "?", COR: "?", TDD: "?", FW: "?" };
      statsHtml = `
        <div class="server-attrs">
          <span class="server-attr"><b>${srv.indice}</b>Indice</span>
          <span class="server-attr"><b>${a.ATQ}</b>ATQ</span>
          <span class="server-attr"><b>${a.COR}</b>COR</span>
          <span class="server-attr"><b>${a.TDD}</b>TdD</span>
          <span class="server-attr"><b>${a.FW}</b>FW</span>
        </div>
        <div class="server-thresholds">CI : ${srv.edition === "sr5" ? `attaque ${srv.indice * 2} dés [Attaque ${a.ATQ}] · moniteur ${this.icMonitorSize(srv)} cases · max ${srv.indice} CI active${srv.indice > 1 ? "s" : ""}` : `jets ${srv.indice * 2} dés · SO ${(a.ATQ || 0) + (a.COR || 0)} · moniteur ${this.icMonitorSize(srv)} cases · init TdD×2+3D6 · max ${srv.indice} CI active${srv.indice > 1 ? "s" : ""}`}</div>`;
    }

    /* -- chips CI -- */
    const chips = (srv.icList || [])
      .map((k) => {
        const ic = catalog[k];
        if (!ic) return "";
        const label = ic.label.replace(/^CI /, "");
        const eff = typeof ic.effect === "function" ? ic.effect(srv.edition === "anarchy" ? srv.indice : srv) : "";
        const tip = `${ic.def ? `Défense : ${ic.def} — ` : ""}${eff}`;
        return `<span class="ic-chip ${ic.watch ? "watch" : ""}" title="${esc(tip)}">${esc(label)}</span>`;
      })
      .join("");

    /* -- footer / groupes -- */
    const groupSel = allGroups.length
      ? `<select class="group-select-inline" title="Déplacer vers un groupe"
          onchange="Servers.moveToGroup('${srv.id}', this.value)">
          ${["— Sans groupe —", ...allGroups]
            .map((g) => {
              const val = g === "— Sans groupe —" ? "all" : g;
              const sel = this.groupsOf(srv.id).includes(g) ? "selected" : "";
              return `<option value="${esc(val)}" ${sel}>${esc(g)}</option>`;
            })
            .join("")}
        </select>`
      : "";

    card.innerHTML = `
      <div class="server-card-header">
        <span class="server-name" title="${esc(srv.profile || "")}">${esc(srv.name)}</span>
        <span class="server-badge">Indice ${srv.indice}</span>
      </div>
      <div class="server-card-body">
        <div class="server-profile">${esc(srv.profile || "")}${srv.secPhys ? " · sécurité physique (+1)" : ""}</div>
        ${statsHtml}
        <div class="server-sculpture">${esc(srv.sculpture || "")}</div>
        <div class="server-ic-row">${chips}</div>
        ${intr.open ? this._intrusionHTML(srv) : ""}
        <textarea class="server-notes" placeholder="Notes…"
          onchange="Servers.editNote('${srv.id}', this.value)">${esc(srv.notes || "")}</textarea>
      </div>
      <div class="server-card-footer">
        <button class="btn-secondary btn-small ${intr.open ? "active" : ""}"
          onclick="Servers.toggleIntrusion('${srv.id}')">${intr.open ? "Fermer l'intrusion" : "⚡ Intrusion"}</button>
        ${srv.spider
          ? `<button class="btn-secondary btn-small" onclick="Servers.removeSpider('${srv.id}')" title="Retirer le spider">Spider ✕</button>`
          : `<button class="btn-secondary btn-small" onclick="Servers.addSpider('${srv.id}')" title="Générer un decker de sécurité lié">+ Spider</button>`}
        ${groupSel}
        <button class="btn-icon danger" onclick="Servers.remove('${srv.id}')" title="Supprimer">✕</button>
      </div>`;
    return card;
  },

  /* ---- Bloc intrusion (tracker) ---- */
  _intrusionHTML(srv) {
    const esc = CardRenderer._esc.bind(CardRenderer);
    const intr = srv.intrusion;
    const catalog = this.icCatalog(srv.edition);
    const size = this.icMonitorSize(srv);

    /* Lignes de CI */
    const rows = (srv.icList || [])
      .map((k) => {
        const ic = catalog[k];
        if (!ic) return "";
        const st = intr.ics[k] || { active: !!ic.watch, dmg: 0, down: false };
        const isActive = ic.watch || (st.active && !st.down);
        const label = ic.label.replace(/^CI /, "");
        const eff =
          typeof ic.effect === "function"
            ? ic.effect(srv.edition === "anarchy" ? srv.indice : srv)
            : "";

        const boxes = `<span class="monitor-boxes">${Array.from({ length: size }, (_, i) => {
            const n = i + 1;
            const sep =
              srv.edition === "anarchy" && (n === 3 || n === 4)
                ? ' style="margin-left:3px;"'
                : "";
            return `<span class="monitor-box ${st.dmg >= n ? "filled" : ""}"${sep}
              title="${srv.edition === "anarchy" ? ["Légère", "Légère", "Grave", "Incapacitante"][i] : `Case ${n}`}"
              onclick="Servers.icBox('${srv.id}', '${k}', ${n})"></span>`;
          }).join("")}</span>`;

        const status = ic.watch
          ? `<span class="ic-status watch">veille</span>`
          : st.down
            ? `<span class="ic-status down">détruite</span>
               <button class="btn-secondary btn-small" onclick="Servers.relaunchIC('${srv.id}', '${k}')" title="Le serveur relance une copie (dès le tour suivant)">↻ relancer</button>`
            : st.active
              ? `<span class="ic-status active">active${st.turn ? ` · t${st.turn}` : ""}</span>`
              : `<span class="ic-status idle">en réserve</span>`;

        return `<div class="ic-row ${isActive ? "on" : ""} ${st.down ? "dead" : ""}">
          <div class="ic-row-head">
            <span class="ic-row-name">${esc(label)}</span>
            ${status}
          </div>
          <div class="ic-row-effect">${ic.def ? `<b>Défense :</b> ${esc(ic.def)} — ` : ""}${esc(eff)}</div>
          ${st.active || st.down || ic.watch ? `<div class="monitor-row"><span class="monitor-label">Moniteur${srv.edition === "anarchy" ? " (FW 1)" : ""}</span>${boxes}</div>` : ""}
        </div>`;
      })
      .join("");

    /* Bloc surveillance selon édition */
    const surveillance =
      srv.edition === "anarchy" ? this._dieuHTML(srv) : this._ssHTML(srv);

    return `
      <div class="intrusion-panel">
        <div class="intrusion-toolbar">
          <span class="intrusion-turn">Tour <b>${intr.turn}</b></span>
          <button class="btn-secondary btn-small ${intr.alerted ? "alert-on" : ""}"
            onclick="Servers.setAlert('${srv.id}')"
            title="La Patrouilleuse a repéré l'intrus : le serveur déploie une CI par tour">
            ${intr.alerted ? "⚠ Alerte en cours" : "Donner l'alerte"}</button>
          <button class="btn-primary btn-small" onclick="Servers.nextTurn('${srv.id}')">Tour suivant ▸</button>
          <button class="btn-icon" onclick="Servers.resetIntrusion('${srv.id}')" title="Réinitialiser l'intrusion">↺</button>
        </div>
        <div class="ic-rows">${rows}</div>
        ${surveillance}
      </div>`;
  },

  /* ---- Jauge SS (SR5/SR6) ---- */
  _ssHTML(srv) {
    const esc = CardRenderer._esc.bind(CardRenderer);
    const intr = srv.intrusion;
    const ss = intr.ss;
    const pct = Utils.clamp((ss / 40) * 100, 0, 100);
    const zone = ss >= 40 ? "conv" : ss >= 30 ? "hot" : ss >= 20 ? "warm" : "cool";

    const fmt = (t) => {
      const d = new Date(t);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    };
    const log = intr.ssLog
      .slice(0, 6)
      .map(
        (e) =>
          `<div class="ss-log-item"><span>${fmt(e.t)}</span> <b>${e.d >= 0 ? "+" : ""}${e.d}</b> ${esc(e.label)}</div>`,
      )
      .join("");

    const sr5Extra =
      srv.edition === "sr5"
        ? `<button class="btn-secondary btn-small" onclick="Servers.addSS2D6('${srv.id}')"
            title="Le SS augmente de 2D6 toutes les 15 minutes après le premier point (p.233)">
            +2D6 ⏱${intr.lastRollT ? ` ${Math.round((Date.now() - intr.lastRollT) / 60000)} min` : ""}</button>
          <span class="ss-marks">Marks du serveur :
            <button class="btn-icon-tiny" onclick="Servers.addMarks('${srv.id}', -1)">−</button>
            <b>${intr.marks}</b>/3
            <button class="btn-icon-tiny" onclick="Servers.addMarks('${srv.id}', 1)">＋</button>
            <small>(+2 dommages CI/mark · Traqueuse à 2+ · convergence = 3 marks posées)</small>
          </span>`
        : `<button class="btn-secondary btn-small" onclick="Servers.addSS('${srv.id}', 1, 'programme de hacking')"
            title="+1 SS par action matricielle modifiée par un programme de hacking (p.178)">+1 prog.</button>
          <span class="ss-marks">Accès illégaux maintenus —
            Utilisateur <button class="btn-icon-tiny" onclick="Servers.setIllegal('${srv.id}', 'user', -1)">−</button><b>${intr.illUser}</b><button class="btn-icon-tiny" onclick="Servers.setIllegal('${srv.id}', 'user', 1)">＋</button>
            · Admin <button class="btn-icon-tiny" onclick="Servers.setIllegal('${srv.id}', 'admin', -1)">−</button><b>${intr.illAdmin}</b><button class="btn-icon-tiny" onclick="Servers.setIllegal('${srv.id}', 'admin', 1)">＋</button>
            <small>(+1/+3 SS par round, appliqués à « Tour suivant »)</small>
          </span>`;

    const convergence =
      ss >= 40
        ? `<div class="ss-convergence">☠ CONVERGENCE — ${
            srv.edition === "sr5"
              ? "VD 12 dommages matriciels, reboot forcé (perte des marks, éjection, choc en RV). Dans un serveur : 3 marks posées + déploiement de CI ; le demi-DIEU converge à la sortie (p.233, 249)."
              : "l'appareil de la dernière action illégale est brické, éjection avec choc, localisation signalée aux autorités (p.178)."
          }</div>`
        : "";

    return `
      <div class="ss-block">
        <div class="ss-head">
          <span class="monitor-label">Score de Surveillance</span>
          <span class="ss-value ${zone}">${ss} / 40</span>
        </div>
        <div class="ss-gauge"><div class="ss-fill ${zone}" style="width:${pct}%"></div></div>
        <div class="ss-actions">
          <span class="ss-actions-label" title="Après chaque action illégale : +succès de la défense">Défense :</span>
          ${[1, 2, 3, 4, 5]
            .map(
              (n) =>
                `<button class="btn-secondary btn-small" onclick="Servers.addSS('${srv.id}', ${n})">+${n}</button>`,
            )
            .join("")}
          <button class="btn-icon-tiny" onclick="Servers.undoSS('${srv.id}')" title="Annuler le dernier ajout">⌫</button>
          <button class="btn-icon-tiny" onclick="Servers.resetSS('${srv.id}')" title="Reboot du decker : SS à zéro">↺</button>
        </div>
        <div class="ss-actions">${sr5Extra}</div>
        ${convergence}
        ${log ? `<div class="ss-log">${log}</div>` : ""}
      </div>`;
  },

  /* ---- Surveillance du DIEU (Anarchy) ---- */
  _dieuHTML(srv) {
    const intr = srv.intrusion;
    const riskMin = intr.minor * 2;
    const seuil = intr.critical;

    const stepper = (label, key, val, tip) => `
      <span class="ss-marks" title="${tip}">${label}
        <button class="btn-icon-tiny" onclick="Servers.dieu('${srv.id}', '${key}', -1)">−</button>
        <b>${val}</b>
        <button class="btn-icon-tiny" onclick="Servers.dieu('${srv.id}', '${key}', 1)">＋</button>
      </span>`;

    return `
      <div class="ss-block">
        <div class="ss-head">
          <span class="monitor-label">Surveillance du DIEU (complications de Piratage)</span>
        </div>
        <div class="ss-actions">
          ${stepper("Mineures", "minor", intr.minor, "Chaque complication mineure : +2 dés de risque minimum sur les tests de Piratage (hors cybercombat)")}
          ${stepper("Critiques", "critical", intr.critical, "Chaque complication critique : seuil de tous les tests de Piratage (hors cybercombat) +1")}
        </div>
        <div class="ss-effects ${riskMin || seuil ? "on" : ""}">
          Effets en cours : dés de risque minimum <b>${riskMin}</b> · seuil de Piratage <b>+${seuil}</b> (hors cybercombat)
        </div>
        <div class="ss-actions">
          <button class="btn-secondary btn-small ${intr.converged ? "alert-on" : ""}"
            onclick="Servers.disaster('${srv.id}')"
            title="Complication Désastre : le DIEU converge">${intr.converged ? "☠ Convergence !" : "Désastre…"}</button>
          <button class="btn-secondary btn-small" onclick="Servers.rebootDecker('${srv.id}')"
            title="Seule façon d'effacer les malus : reboot du deck + 1 h hors ligne (perte de tous les accès)">Reboot + 1 h hors ligne</button>
        </div>
        ${
          intr.converged
            ? `<div class="ss-convergence">☠ DÉSASTRE — le DIEU converge : cyberdeck brické, choc d'éjection, force d'intervention d'élite sur place en quelques minutes (p.218).</div>`
            : ""
        }
      </div>`;
  },
};
