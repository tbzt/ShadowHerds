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
        effect: () => "Chaque succès excédentaire du serveur inflige 1 case de dégâts physiques au hacker.",
      },
      tueuse: {
        label: "Tueuse",
        def: "Cybercombat GLACE : LOG + Firewall",
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

  /** VIS-10 — hôte synthétique minimal d'une CI AUTONOME (ajoutée au tracker
      sans monter de serveur). Le MJ choisit un indice (= indice de l'hôte
      fictif) ; il suffit à dériver init, taille de moniteur et réserves de
      jet. Les attributs ASDF défaut à l'indice (une CI sans fiche de serveur).
      Édition-neutre : consommé par `icCombatant`/`ic.effect`/`icRollSpec`
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

  /** Réserve + limite + suffixe d'un jet de CI (attaque/défense/encaissement/
      perception), SR5/SR6. `srv` peut être un vrai serveur OU un hôte
      synthétique (`bareHost`) — même forme, mêmes attributs. Réserve indice×2
      (SR5 p.249, SR6 p.188), l'encaissement SR5 = indice + Firewall. Source
      unique consommée par `Intrusion.rollIC` (CI liée) et `Encounter._rollBareIC`
      (CI autonome), pour ne pas dupliquer le calcul. Le nom de la CI est
      préfixé par l'appelant. Suppose `use(edition)` déjà appelé (limites lues
      sur `_model()`). */
  icRollSpec(kind, srv) {
    const i = srv.indice;
    if (kind === "soak")
      return { pool: i + ((srv.attrs && srv.attrs.firewall) || 0), limit: null, suffix: "encaissement (indice + Firewall)" };
    if (kind === "atk") return { pool: i * 2, limit: this.attrLimit("atk", srv), suffix: "attaque" };
    if (kind === "def") return { pool: i * 2, limit: null, suffix: "défense" };
    return { pool: i * 2, limit: this.attrLimit("per", srv), suffix: "perception matricielle" };
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

  makeName(sev) {
    const org = Utils.rand(this.ORGS[Utils.clamp(sev, 0, 2)]);
    return `${org} — ${Utils.rand(this.SUFFIXES)}`;
  },
};

// Pont couche 2 (migration modules ES) — retiré en fin de migration.
window.Matrix = Matrix;
