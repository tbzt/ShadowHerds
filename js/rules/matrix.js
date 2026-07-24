"use strict";

/* ============================================================
   MATRICE — catalogues de CI, profils d'indice et sculptures.
   Données/règles par édition, consommées via
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
import { Debug } from "../core/debug.js";
import { ItemResolver } from "./itemresolver.js";
import { Utils } from "../core/utils.js";
import { WeaponEffects } from "./weaponeffects.js";

export const Matrix = {
  /* ========================================================
     CATALOGUES — types de CI par édition
     ======================================================== */
  IC: {
    // Anarchy 2.0 p.223 — succès fixes = indice, FW 1, moniteur 2L/1G/1I
    anarchy2: {
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
          `${s.attrs.attack} cases matricielles (+1/succès exc., +2/mark) + autant en biofeedback étourdissant. Verrouille la connexion.`,
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
          `« Tueuse psychopathe » : VD ${s.attrs.attack} matriciels (+1/succès exc., +2/mark) + autant en dommages de biofeedback.`,
      },
      noire: {
        label: "CI Noire",
        def: "Intuition + Firewall",
        effect: (s) =>
          `Verrouille la connexion. VD ${s.attrs.attack} matriciels (+1/succès exc., +2/mark) + autant en biofeedback physique.`,
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
        effect: (s) => `VD ${s.attrs.attack} dommages matriciels (+1/succès exc., +2/mark).`,
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

    // Anarchy 1re édition (sran_01 p.162-164+199) — GLACE
    // À DÉS (pas de succès fixes) : statblock commun FW 6 · LOG 5 ·
    // Défense 11 · Hacking 8 · Pistage 8 · Moniteur (M) 11. Cybercombat :
    // Hacking+LOG vs LOG+Firewall (GLACE), dégâts (LOG/2)E. Les effets
    // ci-dessous sont cumulables (chaque GLACE ajoute son effet propre).
    anarchy1: {
      patrouilleuse: {
        label: "Patrouilleuse",
        watch: true,
        effect: () => "Ajoute +1 dé à tous les tests du serveur (toujours active).",
      },
      potdecolle: {
        label: "Pot de colle",
        def: "Cybercombat GLACE : LOG + Firewall",
        effect: () => "Le hacker doit réussir un test de Hacking vs le serveur pour se déconnecter.",
      },
      traqueuse: {
        label: "Traqueuse",
        def: "Cybercombat GLACE : LOG + Firewall",
        effect: () => "Localise physiquement chaque hacker qui obtient une complication.",
      },
      acide: {
        label: "Acide",
        def: "Cybercombat GLACE : LOG + Firewall",
        effect: () => "Réduit le Firewall des hackers de 1, cumulatif (jusqu'au reboot).",
      },
      bloqueuse: {
        label: "Bloqueuse",
        def: "Cybercombat GLACE : LOG + Firewall",
        effect: () => "Chaque échec de Hacking (hors cybercombat) inflige −1 dé cumulatif aux futurs tests de Hacking du hacker.",
      },
      brouilleuse: {
        label: "Brouilleuse",
        def: "Cybercombat GLACE : LOG + Firewall",
        effect: () => "Un échec de Hacking avec ≥2 succès excédentaires du serveur force un reboot du hacker en fin de tour.",
      },
      crash: {
        label: "Crash",
        def: "Cybercombat GLACE : LOG + Firewall",
        effect: () => "Fait planter un programme du hacker (au choix du MJ), indisponible jusqu'au reboot.",
      },
      noire: {
        label: "Noire",
        def: "Cybercombat GLACE : LOG + Firewall",
        // p.200 : la glace noire inflige des dommages PHYSIQUES (3P) au lieu de 3E.
        dmg: "3P",
        effect: () => "Chaque succès excédentaire du serveur inflige 1 case de dégâts physiques au hacker.",
      },
      tueuse: {
        label: "Tueuse",
        def: "Cybercombat GLACE : LOG + Firewall",
        // p.200 : +2 dés aux tests de Hacking (cybercombat uniquement).
        atkBonus: 2,
        effect: () => "Chaque succès excédentaire du serveur inflige 1 case de dégâts d'étourdissement au hacker.",
      },
    },
  },

  /* ---- Profils d'indice (tables officielles) ----
     sev : sévérité 0/1/2 pour la sélection aléatoire des CI. */
  PROFILES: {
    // Anarchy 2.0 p.222
    anarchy2: [
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
    // Anarchy 1re édition — le « indice » est directement le
    // pool de défense en dés (pas une échelle 1-12 comme SR5/SR6).
    anarchy1: [
      { id: "artisanal", label: "Artisanal (bricolé, très bas de gamme ou daté)", indice: 4, sev: 0 },
      { id: "faible", label: "Faible (Stuffer Shack, public)", indice: 6, sev: 0 },
      { id: "moyen", label: "Moyen (corporation classique)", indice: 8, sev: 1 },
      { id: "hautaaa", label: "Haut (corporation AAA)", indice: 10, sev: 1 },
      { id: "hautmilitaire", label: "Haut (R&D / militaire)", indice: 12, sev: 2 },
    ],
  },

  /* ---- Curation des CI par gamme (sélection aléatoire) ---- */
  IC_POOLS: {
    anarchy2: [
      ["tueuse", "potdecolle"],
      ["traqueuse", "blaster", "acide", "bloqueuse"],
      ["noire"],
    ],
    // Anarchy 1re édition (9 GLACE)
    anarchy1: [
      ["tueuse", "potdecolle", "crash"],
      ["traqueuse", "acide", "bloqueuse", "brouilleuse"],
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
  _edition: "anarchy2",

  use(edition) {
    this._edition = this.IC[edition] ? edition : "anarchy2";
    if (this._edition !== edition)
      Debug.warn("matrix", "édition inconnue, repli sur anarchy", { requested: edition });
    return this;
  },

  /** Régime Matrice de l'édition courante (hasAttrs, tailles moniteur, textes
      de CI…). Toute la logique par édition vit dans les modules
      (App.editionModule.matrixModel) : matrix.js ne fait qu'orchestrer les
      catalogues communs (IC / PROFILES / IC_POOLS) et déléguer le régime. */
  _model() {
    const mod = App.getEditionModule(this._edition);
    return (mod && mod.matrixModel) || App.getEditionModule("anarchy2").matrixModel;
  },

  icCatalog() {
    return this.IC[this._edition] || this.IC.anarchy2;
  },

  profiles() {
    return this.PROFILES[this._model().profileKey] || this.PROFILES.anarchy2;
  },

  /** Texte d'indice affiché à côté d'un profil (Anarchy : valeur fixe,
      SR5/SR6 : plage min-max — formes de données différentes en amont
      dans PROFILES). */
  profileRangeText(p) {
    return this._model().profileRangeText(p);
  },

  /** Taille du moniteur matriciel d'une CI (Anarchy : fixe 4 cases). */
  icMonitorSize(indice) {
    return this._model().icMonitorSize(indice);
  },

  /** VIS-10 — serveur synthétique minimal d'une CI AUTONOME (ajoutée au tracker
      sans monter de serveur). Le MJ choisit un indice (= indice du serveur
      fictif) ; il suffit à dériver init, taille de moniteur et réserves de
      jet. Les attributs ASDF défaut à l'indice (une CI sans fiche de serveur).
      Édition-neutre : consommé par `icCombatant`/`ic.effect`/`icCombat`
      exactement comme un vrai serveur. */
  bareHost(indice) {
    const i = Utils.clamp(indice | 0, 1, 99);
    return { indice: i, attrs: { attack: i, sleaze: i, dataProcessing: i, firewall: i } };
  },

  /** Nombre max de CI actives simultanément (Anarchy : illimité, p.223). */
  maxActiveIC(indice) {
    return this._model().maxActiveIC(indice);
  },

  /** Plage d'indice disponible pour un serveur. */
  indiceRange() {
    return this._model().indiceRange;
  },

  /** Anarchy 2.0 n'a pas d'attributs ASDF ni de jets de dés pour les CI
      (succès fixes, p.223) : les consommateurs testent ce flag plutôt
      que de comparer l'édition eux-mêmes. */
  hasAttrs() {
    return this._model().hasAttrs;
  },

  /** Régime de brickage des appareils (armes) de l'édition, lu par le
      cockpit combat plutôt que de comparer l'édition (interdit n°1) :
      - "monitor"   → SR5/SR6 : vrai moniteur matriciel d'appareil (8+Indice/2)
      - "narrative" → Anarchy 2.0 : bascule « hors service » sans moniteur (le
                      verbe est au livre p.210, mais pas de chiffre à motoriser)
      - null        → Anarchy 1re : pas de brickage (verbe absent du texte). */
  deviceBricking() {
    return this._model().deviceBricking || null;
  },

  /** Dérive la catégorie d'équipement d'un item non taggé en le
      retrouvant tel quel dans `equipPools` de l'édition — un item généré
      (Gen._generateOne) est toujours une chaîne littérale du catalogue,
      jamais reconstruite. Index construit une fois par édition (catalogues
      statiques, jamais invalidé). Ne résout rien pour l'équipement hors
      `equipPools` (armes/commlinks Anarchy 2, posés en dur par archétype —
      cf. `_LABEL_CAT_RX` ci-dessous). */
  _catIndex: {},
  _resolveCat(str) {
    const mod = App.getEditionModule(this._edition);
    // Anarchy 2 nomme son pool `GEAR_CATALOG` (armures/gear/cyberware/
    // bioware, cf. anarchy2.js) plutôt que `equipPools` (SR5/SR6/Anarchy 1) —
    // même forme aplatissable, nom différent.
    const pools = mod && (mod.equipPools || mod.GEAR_CATALOG);
    if (!pools) return "";
    if (!this._catIndex[this._edition]) {
      const idx = {};
      Object.keys(pools).forEach((key) => {
        ItemResolver._flatPool(pools[key]).forEach((s) => {
          if (!(s in idx)) idx[s] = key;
        });
      });
      this._catIndex[this._edition] = idx;
    }
    return this._catIndex[this._edition][str] || "";
  },

  /** Repli par libellé pour les appareils qui ne vivent pas dans
      `equipPools` (Commlink/Cyberdeck posés en dur dans `equip[]` des
      archétypes Anarchy 2) — un commlink reste un commlink quelle que soit
      sa provenance de données. Vérifié avant la résolution de catégorie
      (prioritaire sur un éventuel classement générique). */
  _LABEL_CAT_RX: [
    { rx: /^Commlink\b/i, cat: "commlinks" },
    { rx: /^Cyberdeck\b/i, cat: "cyberdecks" },
  ],

  /** Électronique sans-fil noyée dans les catégories fourre-tout
      (cyberware/equipSpecial/equipement, défaut NON — « override
      obligatoire ») : reconnue par mot-clé plutôt que par tag item-par-item,
      cohérent avec le motif de parsing déjà en place (AnarchyAtouts,
      WeaponEffects). Jamais consultée hors ces catégories (une arme de
      mêlée « sans fil » — fouet monofilament — n'en devient pas un appareil
      matriciel). Couvre cyberyeux/oreilles cybernétiques, cyberdeck/commlink
      implantés, cyberjack et l'électronique réseau (antenne, routeur,
      liaison satellite, scanner de fréquences, grappin dérivateur). */
  _WIRELESS_RX:
    /cyberjack|cyberdeck implant|commlink implant|yeux? cybern|oreilles? cybern|routeur interne|\bantenne\b|liaison satellite|scanner de fréquences|grappin dérivateur/i,

  /** Un appareil (arme/équipement) est-il une cible matricielle plausible ?
      Ordre : mains nues (jamais) → override explicite (`item.connected`)
      → libellé commlink/cyberdeck (repli hors `equipPools`) → smartgun
      (toujours sans-fil) → catégorie résolue (`cat` ou repli catalogue)
      → sans-fil noyé dans cyberware/equipSpecial/equipement → table par
      catégorie de l'édition → défaut permissif (catégorie inconnue, jamais
      de faux négatif de brickage). Même fonction depuis R1d, jamais
      remplacée (1 fonction, 1 propriétaire). */
  deviceConnected(item) {
    const str = ItemResolver.itemStr(item);
    if (WeaponEffects.isUnarmed(str)) return false;
    if (item && typeof item === "object" && item.connected != null) return !!item.connected;
    const labelHit = this._LABEL_CAT_RX.find((e) => e.rx.test(str));
    if (labelHit) return true;
    if (/\bsmartgun\b/i.test(str)) return true;
    const cat = ItemResolver.itemCat(item) || this._resolveCat(str);
    if ((cat === "cyberware" || cat === "equipSpecial" || cat === "equipement") && this._WIRELESS_RX.test(str))
      return true;
    const table = this._model().connectedByCat;
    if (cat && table && cat in table) return !!table[cat];
    return true;
  },

  /** Indice d'appareil par défaut d'une arme = 2 (« Moyen ») — vérifié
      au livre, identique SR5 (p.425) et SR6 (p.258), les deux listent « armes »
      à l'indice 2. Le MJ ajuste ensuite par pas ± si l'arme est un modèle
      supérieur. Constante partagée : les deux régimes « monitor » s'accordent. */
  DEVICE_DEFAULT_RATING: 2,

  /** Attributs matriciels ASDF (SR5/SR6), dans l'ordre d'affichage.
      Clé = nom de donnée (attrs.<key>), badge = libellé compact (carte),
      label = libellé complet (descriptions, tooltips). Source unique
      consommée par servers.js et serverrenderer.js. */
  ATTR_KEYS: [
    { key: "attack", badge: "A", label: "Attaque" },
    { key: "sleaze", badge: "C", label: "Corruption" },
    { key: "dataProcessing", badge: "T", label: "Traitement de données" },
    { key: "firewall", badge: "F", label: "Firewall" },
  ],

  /** Libellé d'une case de moniteur de CI (Anarchy : seuils de blessure
      nommés, SR5/SR6 : numéro de case générique). */
  monitorBoxLabel(n) {
    return this._model().monitorBoxLabel(n);
  },

  /** Séparateur visuel entre les cases de moniteur (Anarchy : regroupe
      les seuils légère/grave/incap par paquets de 2/1/1). */
  monitorBoxSep(n) {
    return this._model().monitorBoxSep(n);
  },

  /** Delta de Score de Surveillance dû aux accès illégaux maintenus,
      par round (SR6 uniquement, p.178). Neutre : 0 (SR5/Anarchy n'ont
      pas cette règle). */
  overwatchDelta(illUser, illAdmin) {
    return this._model().overwatchDelta(illUser, illAdmin);
  },

  /** Texte des seuils/jets de CI pour l'affichage de carte (SR5/SR6 —
      l'Anarchy a son propre bloc de seuils, hors de cette méthode). */
  icThresholdsText(srv) {
    return this._model().icThresholdsText(srv);
  },

  /** Badges de stats serveur pour le régime hasAttrs:false (Anarchy 2.0 :
      Indice/Firewall ; Anarchy 1re : pool de défense) — propre à chaque
      édition, jamais codé en dur dans serverrenderer.js. */
  serverAttrs(srv) {
    return this._model().serverAttrs(srv);
  },

  /** Texte des seuils pour le régime hasAttrs:false (Anarchy 2.0 : seuils
      d'élévation de Piratage ; Anarchy 1re : Hacking vs pool de défense +
      cybercombat GLACE). */
  thresholdsText(srv) {
    return this._model().thresholdsText(srv);
  },

  /** Libellé de Firewall affiché à côté du moniteur (Anarchy : Firewall fixe 1). */
  firewallLabel() {
    return this._model().firewallLabel;
  },

  /** Texte + libellé d'un jet de CI (perception/attaque/défense/encaissement).
      SR5/SR6 uniquement — les glaces Anarchy ont des succès fixes et ne
      lancent jamais les dés (p.223). `soak` n'existe qu'en SR5 (pas de
      règle d'encaissement de CI en SR6) : renvoie `null`, pas une valeur
      neutre inventée. */
  actionRoll(kind, srv) {
    return this._model().actionRoll(kind, srv);
  },

  /** Texte affiché à la convergence du Score de Surveillance (SS = 40,
      SR5/SR6 uniquement — l'Anarchy a son propre modèle DIEU). */
  convergenceText() {
    return this._model().convergenceText();
  },

  /** T6c — asymétrie SR5 (p.252) : les actions de Résonance d'un technomancien
      ne sont PAS comptabilisées au Score de Surveillance et ne nécessitent
      aucune mark (ses actions matricielles standard, elles, suivent les règles
      du SS). Note citée affichée dans le bloc SS. `null` hors SR5. */
  resonanceOSNote() {
    const m = this._model();
    return m.resonanceOSNote ? m.resonanceOSNote() : null;
  },

  /** T6c — asymétrie SR6 (p.195) : à la Convergence, un sprite disparaît ET la
      position physique du technomancien qui l'a compilé est révélée. `true`
      seulement là où la règle existe (SR6), pour enrichir le bandeau de
      convergence du nom des compilateurs exposés. */
  spriteConvergenceReveal() {
    return !!this._model().spriteConvergenceReveal;
  },

  /** Limite (cap) d'un jet de CI selon l'attribut de serveur concerné
      (SR5 uniquement : Attaque pour l'attaque, Traitement de données
      pour la perception — SR6 n'a pas de limite, neutre : null). */
  attrLimit(kind, srv) {
    return this._model().attrLimit(kind, srv);
  },

  /** Descripteur de combat d'une CI pour un geste (atk/def/soak/per), lu par le
      cockpit (fiche active + console Réagir) ET les handlers de jet
      (`Intrusion.rollIC`, `Encounter._rollBareIC`). Forme uniforme,
      édition-neutre (prohibition n°1 — chaque régime vit dans son modèle
      `matrixModel.icCombat`) :
        • dés (SR5/SR6/A1) → { roll:true, pool, limit, suffix, dmg? }
        • succès fixes (A2) → { roll:false, value, suffix }
        • geste absent (A1 n'a pas de jet d'encaissement) → null.
      `host` = vrai serveur OU serveur synthétique (`bareHost`) — même forme.
      `ic` = entrée de catalogue (modificateurs de type A1, `watch` A2…). */
  icCombat(kind, host, ic) {
    const m = this._model();
    return typeof m.icCombat === "function" ? m.icCombat(kind, host, ic) : null;
  },

  /** Score Défensif matriciel de la cible (SR6 uniquement, p.177 : TdD +
      Firewall) — `null` si l'édition n'a pas cette notion (SR5/Anarchy). */
  defenseScore(srv) {
    const m = this._model();
    return typeof m.defenseScore === "function" ? m.defenseScore(srv) : null;
  },

  /** Libellés des niveaux d'accès matriciels (SR6 uniquement, p.179 :
      Invité/Utilisateur/Administrateur) — `[]` sinon (SR5 utilise les
      marks, Anarchy n'a pas cette mécanique). */
  accessLevels() {
    return this._model().accessLevels || [];
  },

  /* ---- Topologie externe (schéma d'architecture, lot A) ----
     Régime par édition (`matrixModel.topology`), jamais de branche
     `if (edition)`. Alimente le générateur de plan de serveur (TopologyGen)
     et l'écran Serveurs. Archétypes/entrées/cible sourcés par édition
     (A2 dessine chaîne+arbo p.222 ; SR5/6 = WAN ; SR6 seul = imbriqués). */
  _topology() {
    return this._model().topology;
  },

  /** Archétypes de disposition proposés (le 1er = défaut de l'édition). */
  topologyArchetypes() {
    return this._topology().archetypes;
  },

  /** Modes d'entrée d'un serveur (Matrice publique / connexion directe…). */
  topologyEntryModes() {
    return this._topology().entryModes;
  },

  /** Libellé du nœud tenant les données cibles (« le plus profond »). */
  topologyTargetLabel() {
    return this._topology().targetLabel;
  },

  /** Badge de stats compact d'un nœud (par édition : Indice+ASDF SR5/6,
      Indice+Firewall A2, pool de défense A1 — jamais aplati). */
  topologyNodeBadge(srv) {
    return this._topology().nodeBadge(srv);
  },

  /* ---- Fondations (donjon interne d'un serveur, lot B) ----
     SR5 + SR6 SEULEMENT (Data Trails / Hacker Vaillant). Anarchy n'a pas de
     `foundation` → hasFoundation() falsy → l'affordance ne s'affiche jamais.
     Délégation PURE : matrix.js relaie la donnée déjà formée par le module ;
     il ne compose JAMAIS la réserve d'opposition (SR5 = Indice + attribut,
     SR6 = Indice × 2 — divergences sourcées, cf. FONDATIONS_SERVEUR_BT1.md). */
  hasFoundation() {
    return !!this._model().hasFoundation;
  },

  _foundation() {
    return this._model().foundation;
  },

  /** Les 7 nœuds (id, label, role, actions[{name, roll, effect?}]). */
  foundationNodes() {
    return this._foundation().nodes;
  },

  /** Aide MJ : le paradigme est la défense (réutilise srv.sculpture). */
  foundationParadigmHint() {
    return this._foundation().paradigmHint;
  },

  /** Comment on entre dans les Fondations (par édition). */
  foundationEntryText() {
    return this._foundation().entryText;
  },

  /** Rappel du seuil/mécanique de Variance (affichage seul — pas de tracker). */
  foundationVarianceNote() {
    return this._foundation().varianceNote;
  },

  /** Pistes stables du donjon ({from,to}[]) — [] en SR5 (pas de table au
      livre, pistes narratives arbitrées par le MJ, cf. BT1 § 1.d). */
  foundationEdges() {
    return this._foundation().edges || [];
  },

  /** Seuil d'alerte de Variance, DÉJÀ RÉSOLU pour ce serveur (SR5 = 40 fixe,
      SR6 = 80 − 5×Indice) — jamais un nombre en dur côté renderer. */
  foundationVarianceThreshold(srv) {
    return this._foundation().varianceThreshold(srv.indice);
  },

  /** Config du test de variance à dés (SR5 seulement : {threshold,
      poolMineure(srv), poolExtreme(srv)}) — absent en SR6, qui n'a qu'un
      stepper manuel. Présence/absence pilote l'UI, jamais `App.edition`. */
  foundationVarianceTest() {
    return this._foundation().varianceTest || null;
  },

  /** Sélection aléatoire cohérente des CI (Patrouilleuse toujours). */
  pickICs(indice, sev) {
    const tiers = this.IC_POOLS[this._edition] || this.IC_POOLS.anarchy2;
    const candidates = [...tiers[0]];
    if (sev >= 1) candidates.push(...tiers[1]);
    if (sev >= 2) candidates.push(...tiers[2]);

    const n = this._model().pickCount(indice, candidates.length);

    const shuffled = candidates.sort(() => Math.random() - 0.5);
    const chosen = shuffled.slice(0, n);
    // Les serveurs les plus durs sortent leur signature : la Noire.
    if (sev >= 2 && !chosen.includes("noire") && Utils.randBool(0.6)) {
      chosen[chosen.length - 1] = "noire";
    }
    const result = ["patrouilleuse", ...chosen];
    Debug.log("matrix", "pickICs", { edition: this._edition, indice, sev, n, ics: result });
    return result;
  },

  pickSculpture(sev) {
    return Utils.rand(this.SCULPTURES[Utils.clamp(sev, 0, 2)]);
  },

  /* ========================================================
     PARADIGMES — déroulé narratif d'une sculpture sur les aspects
     de la table (le paradigme EST la défense, cf.
     REFERENCE/FONDATIONS_SERVEUR_BT1.md §6). Structure SPARSE et
     ADDITIVE : on n'authore ici que ce qu'on a dérivé des livres ;
     tout le reste tombe en repli côté ParadigmLens. La jointure se
     fait par `sculpture` = TEXTE EXACT d'une entrée de SCULPTURES
     (invariant vérifié par paradigmDriftCheck) — donc AUCUN champ
     nouveau sur `srv` : la clé, c'est srv.sculpture lui-même, et un
     vieux save ou un thème maison retombe simplement sur le repli.
     Champs curés, TOUS optionnels : senses, truth, denizens,
     variance:{minor,extreme}, nodes:{<id de nœud>: costume}.
     Indépendant d'édition (comme SCULPTURES). ======================== */
  PARADIGMS: [
    /* Variance-FICTION (aspect 1). Méthode sourcée Data Trails p.122-124
       (« Le paradigme », « Variance », table « Exemples de variances »
       p.123) : MINEURE = incohérence esthétique, « énigmatique ou
       curieuse » aux habitants ; EXTRÊME = acte perturbant qui saute aux
       yeux et contredit la règle centrale du rêve (ou agir hors-nœud).
       Chaque paire suit la LOGIQUE INTERNE de SA sculpture, souvent
       contre-intuitive (cf. « plaine qui saigne → ne pas saigner »).
       Indépendant d'édition : le hors-thème découle du thème, pas des
       règles (la Variance-RÈGLE, elle, diverge SR5≠SR6, gérée ailleurs).
       Les entrées « façon X, Data Trails/Hacker Vaillant » sont sourçables
       plus directement ; les autres sont dérivées par analogie. */
    // ---- sev 0 ----
    { id: "superette", sculpture: "Supérette virtuelle aux rayonnages criards, jingles promotionnels en boucle, caddies-icônes grinçants ; la patrouilleuse est un vigile mal payé qui traîne des pieds.",
      variance: { minor: "Repartir sans rien acheter.", extreme: "Faire taire les jingles publicitaires." },
      nodes: { portail: "Les portes automatiques", archive: "La réserve, cartons au fond", echafaudage: "Les rayonnages et la mezzanine", securite: "Le vigile qui traîne des pieds", regie: "Les caddies-icônes et les caisses", controle: "Le bureau du gérant, à l'étage", vide: "Le quai de livraison désert" },
      senses: "Le bourdon des néons, une odeur sucrée de promo, le grincement d'un caddie au loin.", truth: "Le serveur d'un petit commerce de quartier — stocks, comptes, fichiers clients ; peu gardé, vite oublié." },
    { id: "fastfood", sculpture: "Fast-food cartoon aux couleurs saturées ; la mascotte géante suit les visiteurs du regard et note tout.",
      variance: { minor: "Refuser de sourire à la mascotte.", extreme: "Déclarer que la nourriture est fausse, ne pas avoir faim." },
      nodes: { portail: "Le comptoir « bienvenue » clignotant", archive: "La chambre froide", echafaudage: "La cuisine et ses passe-plats", securite: "La mascotte géante qui surveille", regie: "Les friteuses et distributeurs asservis", controle: "Le bureau du manager", vide: "Le parking vide sous la pluie" },
      senses: "L'odeur de friture omniprésente, un jingle qui colle, le regard fixe de la mascotte.", truth: "L'enseigne locale d'une chaîne de fast-food — commandes, RH, recettes ; surveille plus qu'il ne protège." },
    { id: "bar-arriere", sculpture: "Arrière-salle de bar enfumée : néons fatigués, juke-box qui saute, fichiers étalés sur les tables poisseuses.",
      variance: { minor: "Rester sobre et parfaitement vif.", extreme: "Ouvrir les fenêtres, chasser la fumée, rallumer la lumière." },
      nodes: { portail: "La porte de service, derrière", archive: "Les fichiers sur les tables poisseuses", echafaudage: "La charpente basse, l'escalier de cave", securite: "Le videur accoudé au comptoir", regie: "Le juke-box qui saute, les néons", controle: "Le bureau du patron", vide: "La cave murée" },
      senses: "La fumée qui pique, le juke-box qui accroche, le poisseux sous les doigts.", truth: "L'arrière-boutique numérique d'un rade — comptes au noir, petits secrets du quartier, dettes de comptoir." },
    { id: "arcade", sculpture: "Salle d'arcade rétro 8-bit : sprites pixelisés, chiptunes, glaces en fantômes de Pac-Man.",
      variance: { minor: "Se mouvoir en diagonale fluide (le monde bouge par crans).", extreme: "Réclamer la sortie de l'écran, parler du monde réel." },
      nodes: { portail: "La borne « INSERT COIN »", archive: "L'écran des meilleurs scores", echafaudage: "La rangée de bornes et les câbles", securite: "Les fantômes de Pac-Man en patrouille", regie: "Le monnayeur et les bornes reliées", controle: "Le panneau de maintenance, à l'arrière", vide: "L'écran « GAME OVER » figé" },
      senses: "Les chiptunes en boucle, le clignotement des bornes, une odeur de plastique chaud.", truth: "Le serveur d'une salle d'arcade ou d'un petit studio de jeu — scores, licences, code maison." },
    { id: "biblio-quartier", sculpture: "Bibliothèque de quartier assoupie, poussière virtuelle, fiches cartonnées ; le silence y est une politique de sécurité.",
      variance: { minor: "Chuchoter un ton trop haut, faire craquer le parquet.", extreme: "Parler à voix pleine, briser le silence." },
      nodes: { portail: "Le tourniquet d'entrée", archive: "Le fichier cartonné et les rayons", echafaudage: "Les étagères et la galerie", securite: "Le silence, et la bibliothécaire", regie: "Le chariot de retour, la photocopieuse", controle: "Le bureau de la conservatrice", vide: "La réserve poussiéreuse, lumière éteinte" },
      senses: "Le silence ouaté, la poussière dans la lumière, le froissement lointain d'une page.", truth: "Le serveur d'une bibliothèque ou d'une archive locale — dossiers, prêts, un fonds qu'on croit sans valeur." },
    { id: "garage", sculpture: "Garage associatif : établis gras, pièces détachées suspendues, simulation d'odeur d'huile approximative.",
      variance: { minor: "Garder les mains propres, ne toucher à rien.", extreme: "Casser une pièce au lieu de la réparer." },
      nodes: { portail: "La porte basculante", archive: "L'établi où sont posés les fichiers", echafaudage: "Les racks à pièces suspendues", securite: "Le molosse attaché près de l'entrée", regie: "Les outils et machines reliés", controle: "L'atelier du chef mécano", vide: "La fosse de vidange vide" },
      senses: "Une odeur d'huile approximative, le tintement d'un outil, la chaleur d'un établi.", truth: "Le serveur d'un garage ou d'un atelier associatif — plans, pièces, bidouilles ; parfois un travail au noir." },
    { id: "page-perso", sculpture: "Page perso à l'ancienne devenue lieu : gifs animés, compteur de visites, murs de photos de famille qui vous dévisagent.",
      variance: { minor: "Éviter le regard des photos.", extreme: "Se déclarer étranger à la famille, effacer un portrait." },
      nodes: { portail: "Le bouton « ENTRER » clignotant", archive: "L'album de photos de famille", echafaudage: "Les cadres et les tableaux de liens", securite: "Les visages qui vous dévisagent", regie: "Le compteur de visites et les gifs", controle: "Le livre d'or, page d'admin", vide: "La page « 404 », fond noir" },
      senses: "Le clignotement des gifs, un vieux MIDI, l'impression d'être dévisagé.", truth: "Le serveur perso de quelqu'un — souvenirs, photos, mots de passe ; l'intimité d'une personne, pas d'une corpo." },
    { id: "centre-commercial", sculpture: "Centre commercial hypersaturé de publicités, mascottes animées et muzak inlassable.",
      variance: { minor: "Ignorer une promotion, ne pas répondre à une mascotte.", extreme: "Arracher une affiche, exiger le silence." },
      nodes: { portail: "Les portiques d'entrée", archive: "Le stock, en sous-sol", echafaudage: "Les coursives et les escalators", securite: "Les mascottes-vigiles animées", regie: "Les écrans publicitaires et la muzak", controle: "Le PC de sécurité, derrière les vitres", vide: "Le parking souterrain désert" },
      senses: "La muzak inlassable, mille pubs qui parlent en même temps, la foule-icône.", truth: "Le serveur d'un centre commercial — flux clients, baux, vidéosurveillance ; grand, mais peu profond." },
    { id: "chapelle-tole", sculpture: "Chapelle de tôle et de lumière : vitraux pixellisés, cantiques MIDI ; les troncs acceptent les certifiés.",
      variance: { minor: "Garder son chapeau, ne pas se recueillir.", extreme: "Vider le tronc, blasphémer." },
      nodes: { portail: "Le porche de tôle", archive: "La sacristie, registre des certifiés", echafaudage: "La charpente et le clocher", securite: "Le bedeau, à l'entrée", regie: "L'orgue MIDI et les vitraux", controle: "L'autel et la chaire", vide: "Le caveau sous le chœur" },
      senses: "Des cantiques MIDI, la lumière colorée des vitraux, une odeur de tôle et d'encens.", truth: "Le serveur d'une petite congrégation ou secte — dons, fidèles, une foi qui sert de sécurité." },
    // ---- sev 1 ----
    { id: "emeraude", sculpture: "Ville sculptée dans l'émeraude : structures cristallines flottantes, arêtes d'or et d'ébène, mobilier en pétales de pierre précieuse qui vole en éclats sous les intrusions (façon serveur du Métroplexe de Seattle, Data Trails).",
      variance: { minor: "Un geste brusque qui ternit le cristal.", extreme: "Briser ou empocher une gemme." },
      nodes: { portail: "L'arche de cristal serti", archive: "La chambre des gemmes (chaque fichier une pierre)", echafaudage: "Les tours flottantes et leurs arêtes d'or", securite: "Les éclats de pierre qui volent aux intrus", regie: "Les serviteurs de jade", controle: "Le trône d'émeraude", vide: "La faille d'ébène sous la ville" },
      senses: "Un tintement cristallin, une lumière verte et froide, la peur de tout ébrécher.", truth: "Le serveur de prestige d'une administration ou d'une corpo du Métroplexe — vitrine autant que coffre (façon Seattle, Data Trails)." },
    { id: "film-noir", sculpture: "Tour de bureaux du XXe siècle en noir et blanc purs, sans un gris ; la sécurité n'est que mouvements d'ombre en trenchcoat et Borsalino (façon serveur administratif, Data Trails).",
      variance: { minor: "Introduire une couleur dans le noir et blanc.", extreme: "Parler ouvertement de shadowrunner (variance extrême imprimée, Data Trails p.123)." },
      nodes: { portail: "La porte à tambour du hall", archive: "Le classeur du bureau, dossiers noirs", echafaudage: "La cage d'escalier en clair-obscur", securite: "Les ombres en trenchcoat et Borsalino", regie: "Le standard téléphonique", controle: "Le bureau du directeur, stores baissés", vide: "La ruelle sans issue, sous la pluie" },
      senses: "Le cliquetis d'une machine à écrire, la pluie sur les vitres, tout en noir et blanc.", truth: "Le serveur administratif d'une bureaucratie corpo — dossiers, filatures, secrets d'employés (façon serveur admin, Data Trails)." },
    { id: "luxe", sculpture: "Boutique de luxe feutrée : vitrines infinies, personnel en gants blancs, clients servis au champagne virtuel (façon serveur Louis Vuitton, Data Trails).",
      variance: { minor: "Toucher la marchandise sans gants, hausser le ton.", extreme: "Marchander sordidement, voler en vitrine." },
      nodes: { portail: "La porte tenue par un portier ganté", archive: "Le coffre de l'arrière-boutique", echafaudage: "Les vitrines infinies en enfilade", securite: "Le personnel en gants blancs", regie: "Les présentoirs, le service au champagne", controle: "Le bureau du directeur de clientèle", vide: "Le monte-charge de livraison" },
      senses: "Le feutré d'une moquette épaisse, une coupe de champagne virtuel, le murmure du personnel.", truth: "Le serveur d'une maison de luxe — clientèle fortunée, stocks rares, réputation à protéger (façon Louis Vuitton, Data Trails)." },
    { id: "prohibition", sculpture: "Commissariat de la Prohibition : G-men en costume, machines à écrire, tampons officiels ; l'autorité en décorum d'époque (façon icônes du DIEU, Hacker Vaillant).",
      variance: { minor: "Un geste hors protocole, un anachronisme.", extreme: "Défier l'autorité, s'avouer intrus." },
      nodes: { portail: "Le comptoir d'accueil, tampon à la main", archive: "Le classeur des dossiers, à clé", echafaudage: "Les couloirs et les bureaux à machines", securite: "Les G-men en costume", regie: "Les machines à écrire et le télétype", controle: "Le bureau du commissaire", vide: "La cellule au sous-sol" },
      senses: "Le tampon qui claque, le télétype qui crépite, l'autorité en costume d'époque.", truth: "Le serveur d'un service de police ou d'un régulateur — mandats, dossiers, surveillance officielle (façon icônes du DIEU, Hacker Vaillant)." },
    { id: "open-space", sculpture: "Open-space corporatiste infini se répétant en fractale, néons blancs, odeur virtuelle de café.",
      variance: { minor: "Flâner sans rien produire.", extreme: "Renverser un poste, crier contre la hiérarchie." },
      nodes: { portail: "Le tourniquet à badge", archive: "La salle des serveurs", echafaudage: "Les rangées de postes qui se répètent", securite: "L'agent d'étage", regie: "Les imprimantes et la machine à café", controle: "Le bureau d'angle du directeur", vide: "L'étage en travaux, cloisons nues" },
      senses: "Le bourdon des néons blancs, l'odeur de café, des postes à perte de vue.", truth: "Le serveur de production d'une corpo moyenne — projets, RH, propriété intellectuelle du quotidien." },
    { id: "campus", sculpture: "Campus universitaire idéalisé : pelouses parfaites, amphithéâtres antiques, le savoir coule en fontaines lumineuses.",
      variance: { minor: "Couper par la pelouse parfaite.", extreme: "Brûler un livre, railler le savoir." },
      nodes: { portail: "Le portail d'honneur", archive: "La bibliothèque universitaire", echafaudage: "Les amphithéâtres et les allées", securite: "La sécurité du campus", regie: "Les fontaines de savoir lumineuses", controle: "Le bureau du doyen", vide: "Le terrain vague derrière les bâtiments" },
      senses: "Le murmure d'une fontaine, l'écho d'un amphi, l'air pur d'une pelouse parfaite.", truth: "Le serveur d'une université ou d'un institut — recherche, dossiers d'étudiants, brevets naissants." },
    { id: "hopital", sculpture: "Hôpital immaculé : couloirs blancs sans fin, personas-soignants pressés, moniteurs qui bipent des flux de données.",
      variance: { minor: "Traîner sans urgence, salir le blanc.", extreme: "Blesser au lieu de soigner." },
      nodes: { portail: "Le sas des urgences", archive: "Les dossiers médicaux, aux archives", echafaudage: "Les couloirs blancs et les étages", securite: "Les vigiles en blouse", regie: "Les moniteurs et les respirateurs", controle: "La salle de garde, bureau du chef", vide: "La morgue, en sous-sol" },
      senses: "Le bip régulier des moniteurs, l'odeur d'antiseptique, le blanc qui fatigue les yeux.", truth: "Le serveur d'un hôpital ou d'une clinique — dossiers médicaux, un secret qu'un patient a emporté." },
    { id: "studio-trid", sculpture: "Studio de trid : plateaux emboîtés, projecteurs aveuglants, câbles-serpents ; tout le monde joue un rôle, surtout la sécurité.",
      variance: { minor: "Chercher la caméra du regard, sortir de son rôle un instant.", extreme: "Refuser de jouer, révéler que c'est un décor." },
      nodes: { portail: "L'entrée des artistes", archive: "La salle de montage, les rushes", echafaudage: "Les plateaux emboîtés et les passerelles", securite: "Les figurants qui « jouent » la sécurité", regie: "Les projecteurs et la régie technique", controle: "La régie du réalisateur", vide: "Le plateau démonté, décor à nu" },
      senses: "Des projecteurs aveuglants, le brouhaha d'un plateau, tout le monde qui joue un rôle.", truth: "Le serveur d'un studio de trid ou d'un média — productions, contrats, ce qu'on a coupé au montage." },
    { id: "jardin-japonais", sculpture: "Jardin japonais idéal : cerisiers perpétuels, pavillons de papier, personas en kimono ; la patrouilleuse est un héron qui arpente son territoire.",
      variance: { minor: "Presser le pas, hausser le ton.", extreme: "Piétiner le jardin, déchirer un pavillon de papier." },
      nodes: { portail: "Le torii à l'entrée", archive: "Le pavillon des rouleaux", echafaudage: "Les allées de gravier et les ponts", securite: "Le héron qui arpente son territoire", regie: "Les fontaines et les lanternes", controle: "Le pavillon de thé du maître", vide: "L'étang gelé, sans reflet" },
      senses: "Le gravier sous les pas, l'eau d'une fontaine, un calme qui ordonne le silence.", truth: "Le serveur d'une corpo japanophile ou d'une fondation — patrimoine, harmonie de façade, décisions feutrées." },
    { id: "jungle", sculpture: "Jungle luxuriante dont les lianes sont des flux de données, faune-icônes exotique ; les glaces chassent en meute.",
      variance: { minor: "Marcher à découvert, sans crainte.", extreme: "Fuir en courant (la meute s'élance)." },
      nodes: { portail: "La trouée dans la canopée", archive: "Le nid caché dans les frondaisons", echafaudage: "Les lianes-flux et les branches maîtresses", securite: "La meute de prédateurs", regie: "La faune-icône asservie", controle: "La clairière du fauve dominant", vide: "Le marécage sans fond" },
      senses: "Des cris d'oiseaux-icônes, l'humidité épaisse, le sentiment d'être suivi.", truth: "Le serveur d'une biotech ou d'un consortium agro — données du vivant, territoires, une proie désignée." },
    { id: "recif", sculpture: "Récif corallien bioluminescent, personas-poissons, glaces en requins blancs.",
      variance: { minor: "Filer droit et vite, sans onduler.", extreme: "Assécher une zone, « respirer » hors de l'eau." },
      nodes: { portail: "La passe dans le récif", archive: "La grotte aux trésors, coquillages scellés", echafaudage: "Les arches de corail bioluminescent", securite: "Les requins blancs qui rôdent", regie: "Les bancs de personas-poissons", controle: "Le cœur du récif, l'anémone-mère", vide: "La fosse abyssale, lumière éteinte" },
      senses: "Une lumière bleue qui ondule, le silence sous-marin, des ombres qui tournent.", truth: "Le serveur d'une corpo maritime ou océanique — ressources, cartes, prédateurs qui gardent le large." },
    // ---- sev 2 ----
    { id: "cottage-sk", sculpture: "Cottage scandinave au creux de fjords virtuels : cubes de chrome et de verre, géométrie escherienne à l'intérieur, glaces en rottweilers dans des couloirs aseptisés (façon Saeder-Krupp, Data Trails).",
      variance: { minor: "Laisser une trace de doigt sur le verre immaculé.", extreme: "Introduire du désordre chaud, une courbe organique dans la géométrie froide." },
      nodes: { portail: "Le sas de verre à l'entrée", archive: "La chambre forte, cubes scellés", echafaudage: "La géométrie escherienne, escaliers impossibles", securite: "Les rottweilers dans les couloirs aseptisés", regie: "Les automates de service", controle: "Le bureau panoramique sur le fjord", vide: "Le vide sous le plancher de verre" },
      senses: "Un froid de chrome, le claquement net d'une porte, une géométrie qui donne le vertige.", truth: "Le serveur AAA d'un dragon-corpo — ordre glacé, secrets majeurs, chiens de garde partout (façon Saeder-Krupp, Data Trails)." },
    { id: "chateau-japonais", sculpture: "Château japonais médiéval : jardins zen, personas en kimono, glaces en armure de samouraï réparties dans des temples-fonctions.",
      variance: { minor: "Tourner le dos à un samouraï, un manquement au protocole.", extreme: "Dégainer sans honneur, frapper un hôte." },
      nodes: { portail: "Le pont-levis et la porte fortifiée", archive: "Le donjon aux rouleaux et sceaux", echafaudage: "Les étages du donjon, galeries de bois", securite: "Les samouraïs en armure", regie: "Les serviteurs et les palefreniers", controle: "La salle du daimyo", vide: "Le jardin sec, cour scellée" },
      senses: "Le bois qui craque, l'odeur de tatami, le poids d'un protocole d'honneur.", truth: "Le serveur d'un keiretsu ou d'un clan corpo — hiérarchie d'acier, loyautés, un trésor gardé par la lame." },
    { id: "pyramide-azteque", sculpture: "Pyramide aztèque monumentale : glyphes de lumière, escaliers processionnels, prêtres-personas ; les connexions coupées sont des sacrifices.",
      variance: { minor: "Remonter la procession à contresens.", extreme: "Refuser le sacrifice, profaner l'autel." },
      nodes: { portail: "Le seuil au pied des marches", archive: "La chambre aux trésors, sous la pyramide", echafaudage: "Les escaliers processionnels", securite: "Les prêtres-gardiens", regie: "Les serviteurs offerts au temple", controle: "L'autel sommital", vide: "Le puits sacrificiel (cenote)" },
      senses: "Un tambour lointain, la lumière des glyphes, une odeur de pierre et de sang.", truth: "Le serveur d'un culte corpo ou d'une AAA rituelle — pouvoir, sacrifices consentis, un secret au sommet." },
    { id: "labo-simu", sculpture: "Laboratoire de simulation hyperréaliste : souffleries de données, prototypes sous scellés virtuels, physique irréprochable (façon serveurs R&D, Data Trails).",
      variance: { minor: "Une entorse discrète à la physique, un objet qui flotte.", extreme: "Violer ouvertement les lois physiques, briser un scellé." },
      nodes: { portail: "Le sas de décontamination", archive: "La salle des prototypes scellés", echafaudage: "Les passerelles et les baies techniques", securite: "Les protocoles et les drones de sécurité", regie: "Les souffleries et les bancs d'essai", controle: "La salle de contrôle vitrée", vide: "La chambre anéchoïque, silence absolu" },
      senses: "Le souffle des souffleries, une physique trop parfaite, l'odeur stérile d'un scellé.", truth: "Le serveur R&D d'une AAA — prototypes, données d'essai, l'invention qu'on tuerait pour garder (façon serveurs R&D, Data Trails)." },
    { id: "vortex", sculpture: "Vortex de traitement : plus on approche du cœur du serveur, plus le souffle des données devient un rugissement assourdissant (façon Data Trails).",
      variance: { minor: "Avancer à contre-courant.", extreme: "S'immobiliser en plein flux, faire taire le rugissement." },
      nodes: { portail: "Le bord du vortex, seuil du souffle", archive: "L'anneau des données stockées", echafaudage: "Les spirales concentriques", securite: "Les bourrasques qui repoussent", regie: "Les flux asservis, canalisés", controle: "L'œil du vortex, le cœur rugissant", vide: "Le point mort, au centre du silence" },
      senses: "Un rugissement qui monte, un souffle qui pousse, tout aspiré vers le cœur.", truth: "Le nexus de traitement d'une AAA — un flux colossal de données, un cœur qu'on ne devrait pas atteindre (façon Data Trails)." },
    { id: "bunker", sculpture: "Bunker militaire en béton brut, éclairage rouge, sirènes silencieuses, portes blindées ; chaque persona est en treillis.",
      variance: { minor: "Une posture relâchée, une tenue civile.", extreme: "Désobéir à un ordre, rire sous les sirènes." },
      nodes: { portail: "Le sas blindé", archive: "L'armurerie et le coffre à documents", echafaudage: "Les galeries de béton, les niveaux", securite: "Les sentinelles en treillis", regie: "Le générateur et les systèmes d'armes", controle: "Le PC de commandement", vide: "Le tunnel muré, issue condamnée" },
      senses: "Une lumière rouge, l'écho du béton, des ordres brefs sous des sirènes muettes.", truth: "Le serveur militaire ou clandestin — opérations, armements, ce qui ne doit jamais sortir." },
    { id: "cathedrale", sculpture: "Cathédrale gothique de données, vitraux de flux lumineux, échos de chants grégoriens ; les glaces sont des gargouilles qui s'éveillent.",
      variance: { minor: "Parler fort, rire sous les voûtes.", extreme: "Blasphémer, profaner l'autel (les gargouilles s'éveillent)." },
      nodes: { portail: "Le grand portail de bronze", archive: "La crypte aux reliques", echafaudage: "La charpente, les arcs-boutants", securite: "Les gargouilles qui s'éveillent", regie: "Les cloches et l'orgue", controle: "Le maître-autel et la chaire", vide: "L'ossuaire scellé sous le chœur" },
      senses: "L'encens froid, l'écho qui avale les pas, une révérence qui pèse.", truth: "Le serveur d'un ordre qui thésaurise — archives de secrets, dogmes, une relique de données au maître-autel." },
    { id: "station-orbitale", sculpture: "Station orbitale chromée, baies vitrées sur une Terre virtuelle, gravité à géométrie variable.",
      variance: { minor: "Marcher comme si le bas était fixe.", extreme: "Réclamer la pesanteur terrestre, exiger de l'air libre." },
      nodes: { portail: "Le sas d'amarrage", archive: "La soute pressurisée", echafaudage: "Les modules et les coursives", securite: "Les tourelles et les drones", regie: "Les systèmes de survie asservis", controle: "La passerelle de commandement", vide: "Le sas extérieur, le vide spatial" },
      senses: "Le silence pressurisé, un bourdon de ventilation, le haut et le bas qui glissent.", truth: "Le serveur d'une corpo orbitale ou aérospatiale — trajectoires, brevets, un actif hors d'atteinte." },
    { id: "colline-reso", sculpture: "Colline sombre sous un ciel sans étoiles, couverte de pierres tombales de programmes morts ; un glas sonne à chaque erreur (façon royaumes de la Résonance, Hacker Vaillant).",
      variance: { minor: "Rire, afficher de la joie.", extreme: "Ressusciter un programme mort, faire taire le glas." },
      nodes: { portail: "La grille du cimetière", archive: "Le caveau des programmes défunts", echafaudage: "Les allées de pierres tombales", securite: "Le glas qui appelle les gardiens", regie: "Les épitaphes et les cierges", controle: "Le mausolée central", vide: "La fosse commune, entrée des Abysses" },
      senses: "Un glas lointain, un ciel sans étoiles, le froid d'un deuil de code.", truth: "Un royaume de la Résonance ou une archive de programmes morts — savoirs enfouis, dangers technomanciens (Hacker Vaillant)." },
    { id: "speakeasy", sculpture: "Speakeasy années 1920 : jazz feutré, fumée volumétrique, videurs en costume rayé ; le mot de passe change à chaque tour.",
      variance: { minor: "Détonner, ignorer le tempo.", extreme: "Crier le mot de passe, appeler la Lone Star." },
      nodes: { portail: "La porte à judas, mot de passe", archive: "L'arrière-salle, coffre sous le bar", echafaudage: "La salle enfumée et la mezzanine", securite: "Les videurs en costume rayé", regie: "Le juke-box et l'alambic clandestin", controle: "Le bureau du gérant, à l'étage", vide: "La sortie de secours, ruelle noire" },
      senses: "Un jazz feutré, la fumée bleue, un videur qui jauge chaque entrée.", truth: "Le serveur d'un réseau clandestin ou d'une pègre — comptes au noir, contacts, un mot de passe qui change sans cesse." },
    { id: "biblio-infinie", sculpture: "Bibliothèque infinie aux rayonnages impossibles, fichiers reliés plein cuir ; les index vivent leur propre vie.",
      variance: { minor: "Ranger un ouvrage à la mauvaise place, corner une page.", extreme: "Brûler un livre, défier l'index vivant." },
      nodes: { portail: "Le vestibule d'entrée", archive: "Les rayonnages reliés plein cuir", echafaudage: "Les galeries impossibles, escaliers d'Escher", securite: "Les index qui vivent leur propre vie", regie: "Les échelles et les pupitres", controle: "Le bureau du bibliothécaire en chef", vide: "La salle scellée, hors catalogue" },
      senses: "Le cuir et le vieux papier, l'écho de galeries sans fin, des index qui bruissent.", truth: "Le serveur d'un archiviste obsessionnel ou d'un think tank — un savoir démesuré, un index qui se défend seul." },
    { id: "noir-absolu", sculpture: "Noir absolu piqueté d'étoiles de données ; l'horizon virtuel n'existe pas, la sécurité si.",
      variance: { minor: "Projeter sa propre lumière.", extreme: "Imposer un horizon, illuminer le vide." },
      nodes: { portail: "Le seuil, une lueur dans le noir", archive: "L'amas d'étoiles-données", echafaudage: "Les constellations reliées", securite: "Les sentinelles invisibles", regie: "Les satellites asservis", controle: "L'étoile centrale, la plus brillante", vide: "Le vide sans horizon, le néant" },
      senses: "Le noir total, des points de données comme des étoiles, aucun sol sous les pieds.", truth: "Le serveur d'une AAA ultra-discrète ou d'un opérateur fantôme — presque rien à voir, tout à cacher." },
  ],
  _paradigmChecked: false,

  /** Normalise une clé de sculpture pour la jointure : unifie les
      apostrophes (droite/typographique) et les espaces, retire les bords.
      Tolère une saisie curée légèrement divergente sans jamais mélanger
      deux sculptures distinctes (le corps du texte reste discriminant). */
  _normSculpt(text) {
    return String(text || "").replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim();
  },

  /** Le Paradigme dérivé d'une sculpture (par texte, normalisé), ou null
      (thème maison / pas encore curé → ParadigmLens sert le repli). */
  paradigmForSculpture(text) {
    if (!this._paradigmChecked) {
      this.paradigmDriftCheck();
      this._paradigmChecked = true;
    }
    if (!text) return null;
    const key = this._normSculpt(text);
    return this.PARADIGMS.find((p) => this._normSculpt(p.sculpture) === key) || null;
  },

  /** Garde-fou anti-dérive : signale tout PARADIGMS.sculpture qui ne
      correspond plus à aucune entrée de SCULPTURES (édition d'un côté
      sans l'autre → repli silencieux). Dev-time, jamais bloquant. */
  paradigmDriftCheck() {
    const all = new Set(this.SCULPTURES.flat().map((s) => this._normSculpt(s)));
    this.PARADIGMS.forEach((p) => {
      if (!all.has(this._normSculpt(p.sculpture)))
        Debug.warn("matrix", "paradigme orphelin (sculpture introuvable dans SCULPTURES)", {
          id: p.id,
          sculpture: String(p.sculpture).slice(0, 40),
        });
    });
  },

  makeName(sev) {
    const org = Utils.rand(this.ORGS[Utils.clamp(sev, 0, 2)]);
    return `${org} — ${Utils.rand(this.SUFFIXES)}`;
  },
};

// Pont couche 2 (migration modules ES) — retiré en fin de migration.
window.Matrix = Matrix;
