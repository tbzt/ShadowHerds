"use strict";

/* ============================================================
   MATRICE — catalogues de CI, profils d'indice et sculptures
   (issue #14). Données/règles par édition, consommées via
   Matrix.use(edition), sur le patron d'Infected/Metavariants.
   Le tracker d'intrusion (contrôleur) reste dans js/servers.js.

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
const Matrix = {
  /* ========================================================
     CATALOGUES — types de CI par édition
     ======================================================== */
  IC: {
    // Anarchy 2.0 p.223 — succès fixes = indice, FW 1, moniteur 2L/1G/1I
    anarchy: {
      patrouilleuse: {
        label: "Patrouilleuse",
        watch: true,
        effect: (srv) =>
          `Perception (matricielle) : ${srv.indice} succès fixes vs Furtivité (discrétion matricielle) + LOG du decker. Donne l'alerte.`,
      },
      acide: {
        label: "Acide",
        effect: (srv) =>
          `Cybercombat : ${srv.indice} succès fixes — chaque attaque réussie réduit le Firewall de la cible de 1 (durée : la Scène, aucun dommage).`,
      },
      blaster: {
        label: "Blaster",
        effect: (srv) =>
          `Cybercombat : ${srv.indice} succès fixes — verrouillage de connexion (1 tour) + dommages matriciels VD ${Math.ceil(srv.indice / 2)}.`,
      },
      bloqueuse: {
        label: "Bloqueuse",
        effect: (srv) =>
          `Cybercombat : ${srv.indice} succès fixes — chaque attaque réussie réduit l'Attaque de la cible de 1 (durée : la Scène, aucun dommage).`,
      },
      noire: {
        label: "Noire",
        effect: (srv) =>
          `Cybercombat : ${srv.indice} succès fixes — dommages de biofeedback VD ${Math.ceil(srv.indice / 2)} (encaissés avec la Volonté en RV).`,
      },
      potdecolle: {
        label: "Pot de colle",
        effect: (srv) =>
          `Cybercombat : ${srv.indice} succès fixes — verrouillage de connexion (1 tour, aucun dommage).`,
      },
      traqueuse: {
        label: "Traqueuse",
        effect: (srv) =>
          `Cybercombat : ${srv.indice} succès fixes — découvre la localisation physique de la cible (aucun dommage).`,
      },
      tueuse: {
        label: "Tueuse",
        effect: (srv) => `Cybercombat : ${srv.indice} succès fixes — dommages matriciels VD ${srv.indice}.`,
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

  /* ---- Curation des CI par gamme (sélection aléatoire) ---- */
  IC_POOLS: {
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
  },

  /* ---- Génération de noms / sculptures (indépendant de l'édition) ---- */
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
  /* Sculptures par gamme (sev 0/1/2), inspirées des serveurs décrits
     dans Data Trails (VF : Métroplexe de Seattle, Saeder-Krupp,
     Louis Vuitton, secteurs R&D…), Hacker Vaillant (G-men du DIEU,
     royaumes de la Résonance) et Anarchistes (patrouilleuses en
     gardes ou animaux territoriaux, icônes reflétant leur fonction). */
  SCULPTURES: [
    // sev 0 — commerces locaux, sites persos, bas de gamme
    [
      "Supérette virtuelle aux rayonnages criards, jingles promotionnels en boucle, caddies-icônes grinçants ; la patrouilleuse est un vigile mal payé qui traîne des pieds.",
      "Fast-food cartoon aux couleurs saturées ; la mascotte géante suit les visiteurs du regard et note tout.",
      "Arrière-salle de bar enfumée : néons fatigués, juke-box qui saute, fichiers étalés sur les tables poisseuses.",
      "Salle d'arcade rétro 8-bit : sprites pixelisés, chiptunes, glaces en fantômes de Pac-Man.",
      "Bibliothèque de quartier assoupie, poussière virtuelle, fiches cartonnées ; le silence y est une politique de sécurité.",
      "Garage associatif : établis gras, pièces détachées suspendues, simulation d'odeur d'huile approximative.",
      "Page perso à l'ancienne devenue lieu : gifs animés, compteur de visites, murs de photos de famille qui vous dévisagent.",
      "Centre commercial hypersaturé de publicités, mascottes animées et muzak inlassable.",
      "Chapelle de tôle et de lumière : vitraux pixellisés, cantiques MIDI ; les troncs acceptent les certifiés.",
    ],
    // sev 1 — corpos locales, universités, gouvernement
    [
      "Ville sculptée dans l'émeraude : structures cristallines flottantes, arêtes d'or et d'ébène, mobilier en pétales de pierre précieuse qui vole en éclats sous les intrusions (façon serveur du Métroplexe de Seattle, Data Trails).",
      "Tour de bureaux du XXe siècle en noir et blanc purs, sans un gris ; la sécurité n'est que mouvements d'ombre en trenchcoat et Borsalino (façon serveur administratif, Data Trails).",
      "Boutique de luxe feutrée : vitrines infinies, personnel en gants blancs, clients servis au champagne virtuel (façon serveur Louis Vuitton, Data Trails).",
      "Commissariat de la Prohibition : G-men en costume, machines à écrire, tampons officiels ; l'autorité en décorum d'époque (façon icônes du DIEU, Hacker Vaillant).",
      "Open-space corporatiste infini se répétant en fractale, néons blancs, odeur virtuelle de café.",
      "Campus universitaire idéalisé : pelouses parfaites, amphithéâtres antiques, le savoir coule en fontaines lumineuses.",
      "Hôpital immaculé : couloirs blancs sans fin, personas-soignants pressés, moniteurs qui bipent des flux de données.",
      "Studio de trid : plateaux emboîtés, projecteurs aveuglants, câbles-serpents ; tout le monde joue un rôle, surtout la sécurité.",
      "Jardin japonais idéal : cerisiers perpétuels, pavillons de papier, personas en kimono ; la patrouilleuse est un héron qui arpente son territoire.",
      "Jungle luxuriante dont les lianes sont des flux de données, faune-icônes exotique ; les glaces chassent en meute.",
      "Récif corallien bioluminescent, personas-poissons, glaces en requins blancs.",
    ],
    // sev 2 — AAA, militaire, clandestin
    [
      "Cottage scandinave au creux de fjords virtuels : cubes de chrome et de verre, géométrie escherienne à l'intérieur, glaces en rottweilers dans des couloirs aseptisés (façon Saeder-Krupp, Data Trails).",
      "Château japonais médiéval : jardins zen, personas en kimono, glaces en armure de samouraï réparties dans des temples-fonctions.",
      "Pyramide aztèque monumentale : glyphes de lumière, escaliers processionnels, prêtres-personas ; les connexions coupées sont des sacrifices.",
      "Laboratoire de simulation hyperréaliste : souffleries de données, prototypes sous scellés virtuels, physique irréprochable (façon serveurs R&D, Data Trails).",
      "Vortex de traitement : plus on approche du cœur du serveur, plus le souffle des données devient un rugissement assourdissant (façon Data Trails).",
      "Bunker militaire en béton brut, éclairage rouge, sirènes silencieuses, portes blindées ; chaque persona est en treillis.",
      "Cathédrale gothique de données, vitraux de flux lumineux, échos de chants grégoriens ; les glaces sont des gargouilles qui s'éveillent.",
      "Station orbitale chromée, baies vitrées sur une Terre virtuelle, gravité à géométrie variable.",
      "Colline sombre sous un ciel sans étoiles, couverte de pierres tombales de programmes morts ; un glas sonne à chaque erreur (façon royaumes de la Résonance, Hacker Vaillant).",
      "Speakeasy années 1920 : jazz feutré, fumée volumétrique, videurs en costume rayé ; le mot de passe change à chaque tour.",
      "Bibliothèque infinie aux rayonnages impossibles, fichiers reliés plein cuir ; les index vivent leur propre vie.",
      "Noir absolu piqueté d'étoiles de données ; l'horizon virtuel n'existe pas, la sécurité si.",
    ],
  ],

  /* ========================================================
     ACCESSEURS — patron use(edition), comme Infected/Metavariants
     ======================================================== */
  _edition: "anarchy",

  use(edition) {
    this._edition = this.IC[edition] ? edition : "anarchy";
    return this;
  },

  icCatalog() {
    return this.IC[this._edition] || this.IC.anarchy;
  },

  profiles() {
    return this.PROFILES[this._edition === "sr6" ? "sr5" : this._edition] || this.PROFILES.anarchy;
  },

  /** Taille du moniteur matriciel d'une CI (Anarchy : fixe 4 cases). */
  icMonitorSize(indice) {
    return this._edition === "anarchy" ? 4 : 8 + Math.ceil(indice / 2);
  },

  /** Nombre max de CI actives simultanément (Anarchy : illimité, p.223). */
  maxActiveIC(indice) {
    return this._edition === "anarchy" ? Infinity : indice;
  },

  /** Plage d'indice disponible pour un serveur. */
  indiceRange() {
    return this._edition === "anarchy" ? [2, 8] : [1, 12];
  },

  /** Delta de Score de Surveillance dû aux accès illégaux maintenus,
      par round (SR6 uniquement, p.178). Neutre : 0 (SR5/Anarchy n'ont
      pas cette règle). */
  overwatchDelta(illUser, illAdmin) {
    return this._edition === "sr6" ? illUser * 1 + illAdmin * 3 : 0;
  },

  /** Texte des seuils/jets de CI pour l'affichage de carte (SR5/SR6 —
      l'Anarchy a son propre bloc de seuils, hors de cette méthode). */
  icThresholdsText(srv) {
    const a = srv.attrs || { ATQ: "?", COR: "?", TDD: "?", FW: "?" };
    return this._edition === "sr5"
      ? `attaque ${srv.indice * 2} dés [Attaque ${a.ATQ}] · moniteur ${this.icMonitorSize(srv.indice)} cases · max ${srv.indice} CI active${srv.indice > 1 ? "s" : ""}`
      : `jets ${srv.indice * 2} dés · SO ${(a.ATQ || 0) + (a.COR || 0)} · moniteur ${this.icMonitorSize(srv.indice)} cases · init TdD×2+3D6 · max ${srv.indice} CI active${srv.indice > 1 ? "s" : ""}`;
  },

  /** Libellé de Firewall affiché à côté du moniteur (Anarchy : FW fixe 1). */
  firewallLabel() {
    return this._edition === "anarchy" ? " (FW 1)" : "";
  },

  /** Texte + libellé d'un jet de CI (perception/attaque/défense/encaissement).
      SR5/SR6 uniquement — les glaces Anarchy ont des succès fixes et ne
      lancent jamais les dés (p.223). `soak` n'existe qu'en SR5 (pas de
      règle d'encaissement de CI en SR6) : renvoie `null`, pas une valeur
      neutre inventée. */
  actionRoll(kind, srv) {
    const i = srv.indice;
    const a = srv.attrs || {};
    const isSR5 = this._edition === "sr5";
    if (kind === "per") {
      return {
        txt: `Perception ${i * 2}d${isSR5 ? ` [TdD ${a.TDD}]` : ""}`,
        tip:
          "Perception matricielle de la Patrouilleuse : indice × 2" +
          (isSR5 ? ", limitée par le Traitement de données" : ""),
      };
    }
    if (kind === "atk") {
      return {
        txt: `Attaque ${i * 2}d${isSR5 ? ` [ATQ ${a.ATQ}]` : ""}`,
        tip: isSR5
          ? "Attaque de la CI : indice × 2, limitée par l'Attaque du serveur (p.249)"
          : "Jet d'attaque de la CI : indice × 2 (p.188)",
      };
    }
    if (kind === "def") {
      return {
        txt: `Défense ${i * 2}d`,
        tip: isSR5
          ? "Défense de la CI quand le decker l'attaque (indice × 2, usage — la VF ne détaille pas cette réserve)"
          : "Jet de défense de la CI : indice × 2 (p.188)",
      };
    }
    if (kind === "soak" && isSR5) {
      return {
        txt: `Encaisse ${i + (a.FW || 0)}d`,
        tip: "Résistance aux dommages matriciels : indice + Firewall du serveur (p.229)",
      };
    }
    return null;
  },

  /** Texte affiché à la convergence du Score de Surveillance (SS = 40,
      SR5/SR6 uniquement — l'Anarchy a son propre modèle DIEU). */
  convergenceText() {
    return this._edition === "sr5"
      ? "VD 12 dommages matriciels, reboot forcé (perte des marks, éjection, choc en RV). Dans un serveur : 3 marks posées + déploiement de CI ; le demi-DIEU converge à la sortie (p.233, 249)."
      : "l'appareil de la dernière action illégale est brické, éjection avec choc, localisation signalée aux autorités (p.178).";
  },

  /** Limite (cap) d'un jet de CI selon l'attribut de serveur concerné
      (SR5 uniquement : Attaque pour l'attaque, Traitement de données
      pour la perception — SR6 n'a pas de limite, neutre : null). */
  attrLimit(kind, srv) {
    if (this._edition !== "sr5") return null;
    const a = srv.attrs || {};
    if (kind === "atk") return a.ATQ ?? null;
    if (kind === "per") return a.TDD ?? null;
    return null;
  },

  /** Sélection aléatoire cohérente des CI (Patrouilleuse toujours). */
  pickICs(indice, sev) {
    const tiers = this.IC_POOLS[this._edition] || this.IC_POOLS.anarchy;
    const candidates = [...tiers[0]];
    if (sev >= 1) candidates.push(...tiers[1]);
    if (sev >= 2) candidates.push(...tiers[2]);

    const n =
      this._edition === "anarchy"
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

  pickSculpture(sev) {
    return Utils.rand(this.SCULPTURES[Utils.clamp(sev, 0, 2)]);
  },

  makeName(sev) {
    const org = Utils.rand(this.ORGS[Utils.clamp(sev, 0, 2)]);
    return `${org} — ${Utils.rand(this.SUFFIXES)}`;
  },
};
