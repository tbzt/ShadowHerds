"use strict";

/* ============================================================
   TOUR STEPS — manifeste déclaratif de la visite guidée (V9).
   Données pures : le moteur (tour.js) ne connaît ni ce contenu ni les
   éditions. `since` = la valeur d'`App.VERSION` où la capacité est apparue
   (source unique : CHANGELOG.md) — pas de compteur `rev`. Une entrée « Quoi
   de neuf » n'existe que pour une mineure (une capacité).
   Grammaire d'une carte : titre = QUOI · body = POURQUOI (MJ), 2 phrases max ·
   try = ESSAYEZ (optionnel). Ancres = clés `data-tour` (sidebar ET bottom-nav) ;
   `fallback` quand l'ancre est masquée : "center" (carte centrée) | "skip".
   ============================================================ */
export const TourSteps = {
  steps: [
    {
      id: "lib", anchor: "nav-shadows", tours: ["full"], since: "1.0.0", fallback: "center",
      title: "Ombres portées",
      body: "Votre bibliothèque de PNJ, contacts et serveurs sauvegardés — un clin d'œil aux bestiaires des scénarios. Tout ce que vous générez et rangez vit ici, par dossier.",
    },
    {
      id: "gen", anchor: "nav-generator", tours: ["full"], since: "1.0.0", fallback: "center",
      title: "Générer un PNJ",
      body: "Le cœur de l'outil : un PNJ complet et jouable en un clic, seul ou en bande. Composez par Rôle × Milieu, ou nommez une profession.",
      try: "ouvrez PNJ, cliquez « Générer ».",
    },
    {
      id: "pj", anchor: "nav-characters", tours: ["full"], since: "1.0.0", fallback: "center",
      title: "Personnages",
      body: "La bibliothèque des personnages-joueurs, distincte des PNJ. Créez-les pas à pas, retrouvez-les à la table.",
    },
    {
      id: "contacts", anchor: "nav-contacts", tours: ["full"], since: "1.0.0", fallback: "center",
      title: "Contacts",
      body: "Générez des relations avec Influence, Loyauté, lieux et traits. De quoi peupler le carnet d'adresses de vos runners en quelques secondes.",
    },
    {
      id: "matrix", anchor: "nav-matrix", tours: ["full"], since: "1.0.0", fallback: "center",
      title: "Serveurs & Matrice",
      body: "Des serveurs prêts à hacker, avec CI et pilotage d'intrusion. Le decker n'attend plus que vous improvisiez ses serveurs.",
    },
    {
      id: "run", anchor: "nav-run", tours: ["full"], since: "1.0.0", fallback: "center",
      title: "Topos",
      body: "Une amorce de mission en un clic : mandant, lieu, complication, objectif, paiement. Quand les joueurs partent où vous ne l'aviez pas prévu — puis « Faire un run » pour la promouvoir en vrai run.",
    },
    {
      id: "play", anchor: "nav-play", tours: ["full"], since: "1.0.0", fallback: "center",
      title: "Jouer",
      body: "Le poste de commandement de votre séance : campagnes, runs et la scène en cours au même endroit. Quand une scène tourne, votre trame s'y joue en direct — l'étape où vous en êtes, la suite possible — pendant que le combat garde la vedette.",
    },
    {
      id: "combat", anchor: "nav-combat", tours: ["full"], since: "1.0.0", fallback: "center",
      title: "Suivi de combat",
      body: "Initiative, moniteurs, fiche du combattant actif, Matrice liée à la scène. Le poste de pilotage pour garder les mains sur l'histoire, pas sur les calculs.",
    },
    {
      id: "settings", anchor: "nav-settings", tours: ["full"], since: "1.0.0", fallback: "center",
      title: "Paramètres",
      body: "Densité des cartes, portraits, sauvegarde et synchro optionnelle. Réglez une fois, l'outil s'efface derrière votre table.",
    },
    {
      id: "help", anchor: "help", tours: ["full"], since: "1.0.0", fallback: "center",
      title: "Aide & raccourcis",
      body: "Ce bouton rouvre cette visite à tout moment, et liste les raccourcis clavier. En cas de doute, tout repart d'ici.",
    },

    /* --- Orientation (premier lancement, ≤ 4 étapes, « fait faire ») --- */
    {
      id: "o-lib", anchor: "nav-shadows", panel: "shadows", tours: ["orientation"], since: "1.0.0", fallback: "center",
      title: "Bienvenue, chummer",
      body: "« Ombres portées », votre bibliothèque : tout ce que vous créez et rangez vit ici, par dossier.",
    },
    {
      id: "o-gen", anchor: "nav-generator", panel: "generator", tours: ["orientation"], since: "1.0.0", fallback: "center",
      title: "Créer un PNJ",
      body: "Voici le générateur : il fabrique un runner complet et jouable — attributs, armes, réserves de dés cliquables.",
    },
    {
      id: "o-generate", anchor: "gen-generate", panel: "generator", tours: ["orientation"], since: "1.0.0", fallback: "center",
      title: "Un clic suffit",
      body: "« Générer » et c'est prêt. Sauvegardez-le ensuite : il rejoindra Ombres portées.",
      try: "cliquez « Générer » dès la fin de cette visite.",
    },
    {
      id: "o-help", anchor: "help", tours: ["orientation"], since: "1.0.0", fallback: "center",
      title: "Perdu ? Ce bouton",
      body: "Il relance cette visite et liste les raccourcis clavier. Bon jeu.",
    },

    /* --- Quoi de neuf (badge « ✦ », cumulé depuis la dernière version vue) --- */
    {
      id: "wn-k8-damage", anchor: "nav-combat", tours: ["whatsnew"], since: "1.1.0", fallback: "center",
      title: "Dégâts en un tap",
      body: "Au tour d'un PJ, la console de réaction encaisse maintenant les dégâts : bouton ✸ Dégâts par PNJ, cases ou gravité selon l'édition — la boucle Défense → Encaisser → Dégâts se boucle sans quitter l'écran.",
    },
    {
      id: "wn-m1-cyberdeck", anchor: "nav-shadows", tours: ["whatsnew"], since: "1.2.0", fallback: "center",
      title: "Le cyberdeck d'un decker",
      body: "Fini la ligne de texte dans l'équipement : le cyberdeck a maintenant ses attributs matriciels lisibles et éditables sur la carte (ASDF/ACTF, Firewall, programmes…), migrés automatiquement sans rien perdre de l'ancien texte.",
    },
    {
      id: "wn-m2-deck-live", anchor: "nav-shadows", tours: ["whatsnew"], since: "1.3.0", fallback: "center",
      title: "Le deck a son moniteur",
      body: "Le cyberdeck encaisse maintenant ses propres dégâts matriciels (moniteur cliquable) et se reconfigure en un tap en SR5/SR6 (échange de 2 attributs).",
    },
    {
      id: "wn-contact-quickadd", anchor: "nav-characters", tours: ["whatsnew"], since: "1.6.0", fallback: "center",
      title: "Un contact depuis un PJ, sans détour",
      body: "Sur la fiche d'un personnage-joueur, le « ＋ » de la section Contacts lie un contact du carnet en un clic — ou en crée un nouveau (le nom suffit) qui rejoint aussi vos contacts. Plus besoin d'ouvrir l'édition.",
    },
    {
      id: "wn-gen-edit-catalog", anchor: "nav-generator", tours: ["whatsnew"], since: "1.8.0", fallback: "center",
      title: "Éditer avant de sauvegarder, et un catalogue d'équipement",
      body: "Le bouton « Éditer » est disponible dès le générateur, sur un PNJ pas encore rangé en bibliothèque. Et la fiche d'édition propose un sélecteur « ＋ Catalogue » (armes, armures, commlinks, cyberware…) au lieu de tout taper — en Anarchy 2.0, les armes ajoutées sont structurées et jouables immédiatement.",
    },
    {
      id: "wn-campaign-tracking", anchor: "nav-characters", tours: ["whatsnew"], since: "1.9.0", fallback: "center",
      title: "Suivre la campagne sur la fiche d'un PJ",
      body: "Sur un personnage-joueur, dépliez « Progression » : tenez ses nuyens et son Karma dans le temps, chaque gain/dépense daté et motivé, solde recalculé tout seul. Réputation gérée selon l'édition (SR5/SR6), plus vos propres compteurs. Optionnel : invisible tant qu'on ne s'en sert pas.",
    },
    {
      id: "wn-campaign-folders", anchor: "nav-shadows", tours: ["whatsnew"], since: "1.11.0", fallback: "center",
      title: "Ranger vos dossiers en campagnes et runs",
      body: "Un dossier peut être marqué « Campagne » ou « Run » depuis le menu « ⋯ » de la barre de dossiers — automatique quand vous « Rangez le run ». Un run pointe vers sa prep générée, une campagne compte ses runs.",
    },
    {
      id: "wn-spell-power-edge-catalog", anchor: "nav-generator", tours: ["whatsnew"], since: "1.13.0", fallback: "center",
      title: "Sorts, Pouvoirs et Atouts au catalogue",
      body: "La fiche d'édition propose désormais un sélecteur « ＋ Catalogue » pour les Sorts (4 éditions), les Pouvoirs d'adepte (SR5/SR6) et les Atouts (Anarchy 1re/2.0) — plus besoin de tout taper à la main. Au passage, le sélecteur d'équipement a la même apparence que celui des compétences.",
    },
    {
      id: "wn-cyberdeck-arsenal", anchor: "nav-shadows", tours: ["whatsnew"], since: "1.14.0", fallback: "center",
      title: "L'arsenal matriciel du decker",
      body: "Le bouton « Piratage » unique devient un râtelier d'actions offensives nommées : Pic de données (avec sa VD), Force brute/Sonder l'accès, Planter un programme… selon l'édition. Chaque decker peut curer son loadout dans la fiche d'édition. Le MJ garde toujours la main sur le jet.",
    },
    {
      id: "wn-collection-reorder", anchor: "nav-characters", tours: ["whatsnew"], since: "1.15.0", fallback: "center",
      title: "Réorganisez vos fiches à la main",
      body: "Bouton « ⠿ Réorganiser » sur les personnages, contacts et serveurs : glissez une fiche à sa place (souris ou doigt), ou déplacez-la au clavier avec les flèches ↑/↓. L'ordre choisi est sauvegardé.",
    },
    {
      id: "wn-pc-color-custom", anchor: "nav-characters", tours: ["whatsnew"], since: "1.16.0", fallback: "center",
      title: "N'importe quelle couleur pour un PJ",
      body: "Dans la fiche d'un personnage, la palette de teintes préréglées garde une dernière pastille arc-en-ciel : elle ouvre le sélecteur de couleur du navigateur pour choisir exactement la teinte voulue.",
    },
    {
      id: "wn-journal-mentions", anchor: "nav-shadows", tours: ["whatsnew"], since: "1.17.0", fallback: "center",
      title: "@ pour mentionner, # pour un mot-clé",
      body: "Dans n'importe quelle note (bloc-notes, journal, fiches), tapez « @ » pour mentionner un PNJ/PJ/contact/serveur par son nom (lien ancré, mis à jour si vous le renommez) ou « # » pour un mot-clé libre. Chaque fiche affiche « Mentionné dans » ses apparitions ailleurs.",
    },
    {
      id: "wn-guided-tour", anchor: "help", tours: ["whatsnew"], since: "1.17.0", fallback: "center",
      title: "Cette visite guidée",
      body: "Le bouton Aide relance ce tour à tout moment et ouvre ce bandeau « Quoi de neuf » — cumulé depuis votre dernière visite, quel que soit le nombre de versions sautées.",
    },
    {
      id: "wn-notes-writing", anchor: "nav-shadows", tours: ["whatsnew"], since: "1.18.0", fallback: "center",
      title: "Écrivez directement dans vos notes",
      body: "Cliquez n'importe où dans le texte affiché d'une note (bloc-notes, fiche) pour écrire — plus besoin de viser le crayon ✎. Et mettez en forme : « **gras** », « _italique_ », « `code` ».",
    },
    {
      id: "wn-attrs-rollable", anchor: "nav-shadows", tours: ["whatsnew"], since: "1.19.0", fallback: "center",
      title: "Attributs lançables",
      body: "Sur une carte, cliquez un attribut (ou Magie/Résonance/Atout) pour lancer un test à ce nombre de dés — comme les compétences. Le petit dé ⚄ signalant qu'une pastille est cliquable est désormais visible en permanence, sans avoir à survoler.",
    },
    {
      id: "wn-ranger-la-run", anchor: "nav-run", tours: ["whatsnew"], since: "1.20.0", fallback: "center",
      title: "La rencontre se range et se rouvre",
      body: "Depuis le menu « ⋯ » d'un dossier Run (ou sa carte de prep) : « Ouvrir la rencontre » restaure combattants, initiative et serveur lié ; « Fermer » range tout. Chaque dossier a aussi son propre carnet de notes.",
    },
    {
      id: "wn-zones-collapsible", anchor: "nav-shadows", tours: ["whatsnew"], since: "1.21.0", fallback: "center",
      title: "Repliez chaque section d'une carte",
      body: "Combat, Capacités et Incarnation se replient maintenant comme Détails — chacune garde sa propre mémoire par carte. Une section repliée affiche un résumé (« Init 11+3D6 », « 6 compétences »…) pour ne rien perdre du coup d'œil.",
    },
    {
      id: "wn-card-incarnation-attacks", anchor: "nav-shadows", tours: ["whatsnew"], since: "1.22.0", fallback: "center",
      title: "Incarnation en haut, attaques regroupées",
      body: "L'habillage (âge, style, manie, motivation) se lit désormais juste après l'identité. Les actions offensives d'un decker rejoignent armes et sorts en zone Combat. Équipement porté et augmentations tiennent dans une seule section.",
    },
    {
      id: "wn-card-modules", anchor: "nav-shadows", tours: ["whatsnew"], since: "1.23.0", fallback: "center",
      title: "Modules Magie et Matrice",
      body: "Un decker gagne une section « Matrice » ⚡︎ (deck, moniteur, cible) juste après Combat. Un personnage magique gagne une section « Magie » ✦ (tradition, esprit mentor, pouvoirs d'adepte). Invisibles si le PNJ n'est pas concerné.",
    },
    {
      id: "wn-card-views", anchor: "nav-shadows", tours: ["whatsnew"], since: "1.24.0", fallback: "center",
      title: "Changez la vue d'une carte",
      body: "Trois onglets en haut de carte : ☰ Fiche (tout), ❝ Incarner (juste l'habillage), ⚔ Combat (Combat/Capacités/modules). Un pli que vous faites à la main sur une carte garde toujours la priorité.",
    },
    {
      id: "wn-suivi-pj", anchor: "nav-characters", tours: ["whatsnew"], since: "1.25.0", fallback: "center",
      title: "Suivi de campagne, repensé",
      body: "Sur la fiche d'un PJ, chaque ressource (nuyens, Karma, réputation…) est une ligne avec son solde toujours visible — touchez-la pour ajouter un montant motivé. Onglet ❖ dédié pour ouvrir directement le Suivi.",
    },
    {
      id: "wn-spectator-view", anchor: "nav-settings", tours: ["whatsnew"], since: "1.26.0", fallback: "center",
      title: "Un écran pour les joueurs",
      body: "Dans Paramètres : « Ouvrir l'écran spectateur » lance un second onglet en lecture seule — initiative et moniteurs de condition de la rencontre en cours, rien d'éditable, aucune fiche secrète. À poser côté table.",
    },
    {
      id: "wn-session-summary", anchor: "nav-combat", tours: ["whatsnew"], since: "1.27.0", fallback: "center",
      title: "Le résumé de la séance",
      body: "En tête du Journal des jets, un bandeau repliable agrège toute la partie : nombre de jets, taux de réussite, alarmes et le MVP du soir. De quoi raconter la séance en un coup d'œil, sans rien à saisir.",
    },
    {
      id: "wn-narrative-actions", anchor: "nav-combat", tours: ["whatsnew"], since: "1.28.0", fallback: "center",
      title: "Actions et réactions en combat Anarchy",
      body: "En combat narratif, touchez une ligne pour mettre ce combattant « en focus » : sa fiche et son budget d'actions s'affichent aussitôt, et si un PJ agit, la console de réaction des PNJ prend le relais. Marquer « joué » passe sur l'anneau ✓ et la pastille.",
    },
    {
      id: "wn-contact-card", anchor: "nav-characters", tours: ["whatsnew"], since: "1.29.0", fallback: "center",
      title: "La carte contact rejoint la fiche PNJ",
      body: "Incarnation repliable, onglets ☰ Fiche / ❝ Incarner, module ◈ Relation (Influence/Loyauté ou Niveau/RR + « Connu de »). Un contact déployé affiche directement sa fiche complète, plus de carte imbriquée.",
    },
    {
      id: "wn-notes-fulltext-search", anchor: "nav-shadows", tours: ["whatsnew"], since: "1.30.0", fallback: "center",
      title: "La palette trouve aussi vos notes",
      body: "Ctrl/Cmd+K cherche désormais dans le bloc-notes de séance et les carnets, pas seulement les fiches — plus besoin d'un « #mot-clé » exact. Ouvrir un résultat mène directement au bon carnet.",
    },
    {
      id: "wn-spectator-identity", anchor: "nav-settings", tours: ["whatsnew"], since: "1.31.0", fallback: "center",
      title: "Écran spectateur : qui est qui",
      body: "L'écran joueurs affiche maintenant le portrait (si dispo) et le type (PJ/PNJ/CI) de chaque combattant à côté de son nom — plus une rangée de moniteurs anonymes.",
    },
    {
      id: "wn-equip-augs", anchor: "nav-characters", tours: ["whatsnew"], since: "1.32.0", fallback: "center",
      title: "Cyberware/bioware bien rangés",
      body: "Un implant ajouté depuis le catalogue (SR5/SR6) rejoint désormais la section Augmentations de la fiche et de la vue d'impression, au lieu de l'Équipement générique.",
    },
    {
      id: "wn-metavariants-edit", anchor: "nav-characters", tours: ["whatsnew"], since: "1.33.0", fallback: "center",
      title: "Toutes les métavariantes à l'édition",
      body: "L'édition avancée d'un PNJ propose maintenant toutes les métavariantes, métaconsciences et zoocanthropes de l'édition (Troll Cyclope, Nartaki…), pas seulement les 5 souches de base.",
    },
    {
      id: "wn-cyberdeck-programs", anchor: "nav-shadows", tours: ["whatsnew"], since: "1.35.0", fallback: "center",
      title: "Cyberdecks et programmes à l'édition",
      body: "L'édition avancée ajoute un cyberdeck depuis le catalogue d'équipement (il renseigne les attributs du deck), et permet d'équiper des programmes matriciels tirés des livres — ceux qui relèvent un attribut/limite ou les dégâts augmentent automatiquement vos jets de Matrice.",
    },
    {
      id: "wn-device-reenable", anchor: "nav-combat", tours: ["whatsnew"], since: "1.36.0", fallback: "center",
      title: "Bricking d'appareil plus fiable",
      body: "Dans le suivi de combat, les mains nues n'apparaissent plus comme cible matricielle « brickable » — seules les vraies armes/appareils le sont. Un appareil hors service se remet en marche d'un geste, sans perdre son indice réglé.",
    },
    {
      id: "wn-context-locator", anchor: "edition-badge", tours: ["whatsnew"], since: "1.37.0", fallback: "center",
      title: "Vous savez toujours où vous êtes",
      body: "Un fil d'Ariane « Campagne › Run › Scène » s'affiche en haut de l'écran dès qu'un dossier est en focus. Chaque niveau est cliquable pour y revenir, et une pastille « En cours » rouvre la scène qui tourne — plus moyen de perdre un combat ou une note dans les dossiers.",
    },
    {
      id: "wn-context-selector", anchor: "notepad-btn", tours: ["whatsnew"], since: "1.38.0", fallback: "center",
      title: "Sauter d'un contexte à l'autre",
      body: "Un même sélecteur de contexte est disponible en haut de l'écran (dans le fil d'Ariane) et dans le bloc-notes. Le titre du bloc-notes devient ce sélecteur : changez de carnet — celui d'un autre run, le carnet global — sans fermer le panneau.",
    },
    {
      id: "wn-live-scene-badge", anchor: "nav-combat", tours: ["whatsnew"], since: "1.39.0", fallback: "center",
      title: "La scène en cours ne se perd plus",
      body: "Une pastille pulsée s'allume sur « Combat » (sidebar et barre du bas mobile) dès qu'une scène tourne — y compris une intrusion Matrice seule, sans combattant. Un coup d'œil suffit pour savoir si une scène vous attend, où que vous soyez dans l'appli.",
    },
    {
      id: "wn-sr5-loadout-focus", anchor: "nav-generator", tours: ["whatsnew"], since: "1.40.0", fallback: "center",
      title: "Équipement SR5 plus cohérent, foci enfin motorisés",
      body: "En SR5, l'arsenal généré reflète mieux le niveau et le rôle du PNJ (un grouille n'hérite plus d'un fusil Gauss par hasard) : rareté et affinité pèsent désormais sur le tirage. Les mages, chamanes et adeptes reçoivent en plus un focus magique, jusqu'ici absent — il augmente réellement leurs jets de sort, d'invocation ou d'attaque selon son type.",
    },
    {
      id: "wn-play-panel", anchor: "nav-play", tours: ["whatsnew"], since: "1.41.0", fallback: "center",
      title: "Un espace « Jouer », et le générateur devient « Topos »",
      body: "La navigation se sépare en « Créer » (vos actifs : Personnages, PNJ, Contacts, Serveurs, Topos) et « Jouer » (vos campagnes, runs et la scène en cours). Le générateur de missions s'appelle désormais « Topos » — l'amorce que vous transformez en run d'un geste.",
    },
    {
      id: "wn-sr5-rigger-fix", anchor: "nav-generator", tours: ["whatsnew"], since: "1.42.0", fallback: "center",
      title: "Riggers SR5 correctement équipés",
      body: "Un archétype rigger (même sans le mot « Rigger » dans son nom, ex. Go-ganger) reçoit désormais ses compétences de pilotage/drones et son matériel de contrôle (câblage, console) — jusqu'ici seuls les drones étaient au rendez-vous.",
    },
    {
      id: "wn-edit-mirror-magic-knowledges", anchor: "nav-shadows", tours: ["whatsnew"], since: "1.43.0", fallback: "center",
      title: "L'édition reflète la carte, magie verrouillée, connaissances",
      body: "La modale d'édition PNJ suit désormais l'ordre de la carte, avec les sections lourdes (Sorts, Compétences, Augmentations…) repliées et résumées. L'indice de Magie (SR5/SR6) est toujours éditable, y compris à 0 — Sorts/Pouvoirs restent visibles mais verrouillés tant qu'il est nul. Une section Connaissances permet d'ajouter une connaissance libre avec sa catégorie (Rue, Académique, Professionnelle, Hobbies), qui câble le bon attribut.",
    },
    {
      id: "wn-sr6-loadout-rigger", anchor: "nav-generator", tours: ["whatsnew"], since: "1.44.0", fallback: "center",
      title: "Équipement SR6 plus cohérent, riggers correctement équipés",
      body: "Même refonte qu'en SR5 : l'arsenal généré reflète mieux le niveau et le rôle du PNJ. Un archétype rigger (même sans le mot « Rigger » dans son nom) reçoit ses compétences et son câblage de contrôle. Mages et chamanes reçoivent un focus de pouvoir qui augmente réellement leurs jets de Sorcellerie et de Conjuration.",
    },
    {
      id: "wn-reserve-breakdown", anchor: "nav-shadows", tours: ["whatsnew"], since: "1.44.2", fallback: "center",
      title: "Explication décomposée des réserves",
      body: "Défense, Encaissement, Drain : un bouton ⓘ séparé du lancer ouvre désormais le détail, source nommée + chiffre (« Défense 7 = Réaction 3 + Intuition 4 »), au lieu du survol figé. Le résultat du jet porte le même décompte. En SR5, l'Encaissement détaille aussi l'armure pièce par pièce quand elle est reconstituable depuis l'équipement.",
    },
    {
      id: "wn-foundry-import", anchor: "nav-shadows", tours: ["whatsnew"], since: "1.45.0", fallback: "center",
      title: "Importer des PJ et PNJ depuis Foundry VTT",
      body: "Le menu ⋯ du hub propose désormais « Importer depuis Foundry VTT » : chargez un ou plusieurs fichiers d'acteur exportés de Foundry (SR5, SR6, Anarchy 2) et Shadow Herds crée les fiches en peuplant les bons champs — attributs, compétences, armes, équipement, sorts, atouts. L'édition est détectée automatiquement ; un PJ Foundry rejoint vos Personnages, un grunt vos Ombres. Les champs non modélisés sont signalés en console.",
    },
    {
      id: "wn-persona-vivant", anchor: "nav-shadows", tours: ["whatsnew"], since: "1.46.0", fallback: "center",
      title: "Persona incarné du technomancien",
      body: "Le module Matrice ⚡︎ d'un technomancien (SR5/SR6) affiche désormais son persona incarné : Attaque, Corruption, Traitement de données, Firewall, calculés depuis ses attributs mentaux et sa Résonance. En SR6, un bouton de reconfiguration répartit le pool de points bonus entre les 4 attributs. Les dommages matriciels encaissés rejoignent le moniteur étourdissant, comme au livre.",
    },
    {
      id: "wn-foundry-import-v2", anchor: "nav-shadows", tours: ["whatsnew"], since: "1.48.0", fallback: "center",
      title: "Import Foundry VTT : fiches réelles, contacts, identités, véhicules",
      body: "L'import Foundry VTT (SR5) lit désormais les vraies fiches Foundry (identité, métatype, sorts, traits) au lieu de ne fonctionner que sur nos propres exports. Il importe aussi les identités (SIN, licences, styles de vie), les contacts, les véhicules liés et l'historique Karma/Nuyens/Réputation. Correctif au passage : la résistance au Drain d'un mage importé se calcule désormais sur les bons attributs.",
    },
    {
      id: "wn-theme-realign", anchor: "edition-badge", tours: ["whatsnew"], since: "1.49.0", fallback: "center",
      title: "Les couleurs des 4 éditions collent enfin aux livres",
      body: "Shadowrun 5 passe de l'ambre au rouge sang, Shadowrun 6 du cyan au magenta, Anarchy 1re éd. troque son duotone magenta/vert pour du bleu/or, et Anarchy 2e éd. devient ambre au lieu de rouge punk — chaque teinte a été relevée directement sur la couverture du livre. Motifs, typo et coupes de coin ne changent pas.",
    },
    {
      id: "wn-a2-gauge-gravity", anchor: "nav-combat", tours: ["whatsnew"], since: "1.50.0", fallback: "center",
      title: "Anarchy 2 : la jauge de vie suit la gravité, pas le nombre",
      body: "En Anarchy 2e éd., la mini-jauge de moniteur (tracker et écran joueur) classait par nombre de cases : deux blessures légères paraissaient plus graves qu'une blessure grave. Elle suit désormais le palier le plus grave atteint — une blessure grave alarme plus que deux légères. Sur l'écran joueur, les cases retrouvent aussi leurs paliers (légère / grave / incapacitante) au lieu d'une rangée aplatie. Les autres éditions ne changent pas.",
    },
    {
      id: "wn-complex-forms-sr5", anchor: "nav-shadows", tours: ["whatsnew"], since: "1.51.0", fallback: "center",
      title: "Formes complexes (SR5)",
      body: "Un technomancien SR5 connaît désormais des formes complexes (catalogue complet, 19 formes vérifiées au livre) et peut les tisser depuis sa carte : le test se roule, le Technodrain se résiste, les dégâts s'encaissent — même geste que lancer un sort. SR6 et Anarchy 1re édition suivront dans une prochaine mise à jour.",
    },
    {
      id: "wn-preroll-edge", anchor: "nav-combat", tours: ["whatsnew"], since: "1.52.0", fallback: "center",
      title: "Dépenser sa Chance / son Atout avant le jet (SR5/SR6)",
      body: "À activer dans Paramètres › Lanceur de dés. Une fois activé, lancer depuis une carte SR5/SR6 dont le personnage a de la Chance (SR5) ou de l'Atout (SR6) à dépenser ouvre un panneau : « Repousser les limites » (SR5, ignore la Limite), « Prendre un risque » ou « Ajouter son rang d'Atout » (SR6, dés explosifs) — sinon « Lancer sans Chance / sans Atout ». La ressource du personnage est débitée. Le tap reste un lancer immédiat quand il n'y a rien à dépenser.",
    },
    {
      id: "wn-preroll-edge-pill", anchor: "nav-settings", tours: ["whatsnew"], since: "1.53.0", fallback: "center",
      title: "Chance / Atout avant le jet : pastille",
      body: "Nouveau 3ᵉ choix dans Paramètres › Lanceur de dés (« Pastille sur la carte »). Au lieu d'un panneau qui s'ouvre à chaque jet, une petite pastille distincte — « Chance » en SR5, « Atout » en SR6 — apparaît à côté des jets où le personnage peut dépenser sa ressource (Défense, Encaissement, Drain, armes). Le tap normal reste un lancer immédiat ; toucher la pastille ouvre le petit choix (Repousser les limites / Prendre un risque / Ajouter son rang d'Atout selon l'édition) avant de lancer.",
    },
    {
      id: "wn-foundry-import-sr6", anchor: "nav-shadows", tours: ["whatsnew"], since: "1.54.0", fallback: "center",
      title: "Import Foundry : les fiches SR6 aussi",
      body: "L'import Foundry VTT reprend maintenant, sur une vraie fiche SR6, l'historique Karma/Nuyens, la réputation, les contacts (rattachés au carnet), les identités (SIN) avec licences et styles de vie, et les véhicules/drones liés. Les descriptions de sorts, pouvoirs et traits, qui se perdaient en SR6, sont enfin reprises — et le HTML des descriptions (SR5 comme SR6) est aplati en texte propre.",
    },
    {
      id: "wn-sr6-atout-gain", anchor: "nav-combat", tours: ["whatsnew"], since: "1.55.0", fallback: "center",
      title: "SR6 : gagner l'Atout avant le jet (SO vs SD)",
      body: "En Shadowrun 6, quand vous lancez une attaque à l'arme d'un PNJ, le panneau « avant de lancer » vous laisse désormais comparer le Score Offensif de l'arme (par bande de Portée pour les armes à distance, SO+Force en mêlée) au Score Défensif de la cible : si l'écart atteint 4, le camp le plus haut gagne 1 point d'Atout, crédité automatiquement à l'attaquant (plafond de réserve appliqué). Le SD se saisit à la main et reste optionnel. Le panneau « avant le jet » est maintenant activé par défaut (réglable dans Paramètres › Lanceur de dés).",
    },
    {
      id: "wn-sustain-effects", anchor: "nav-combat", tours: ["whatsnew"], since: "1.56.0", fallback: "center",
      title: "Maintien des sorts et des formes complexes",
      body: "Après avoir lancé un sort (ou tissé une forme complexe), cliquez sur le nombre de succès affiché pour marquer l'effet maintenu (pastille ⟳) ; re-cliquez, ou utilisez le ✕, pour l'arrêter. Chaque effet maintenu impose −2 dés à tous les tests du PNJ, cumulatif — les réserves de la carte, du tracker et des panneaux s'ajustent toutes seules, et un badge « ⟳ ×N · −N » près du moniteur donne le total d'un coup d'œil. Fidèle aux livres (SR5 p.284/253, SR6 p.136/129) ; sans effet en Anarchy.",
    },
    {
      id: "wn-anarchy-points", anchor: "nav-play", tours: ["whatsnew"], since: "1.57.0", fallback: "center",
      title: "Anarchy 2 : Points d'Anarchy de scène",
      body: "Les augmentations et drogues qui octroient des Points d'Anarchy « par scène » (Réflexes câblés, Move-by-wire, Jazz, Kamikaze…) sont désormais motorisées. En scène, le bandeau d'économie de la fiche active affiche une rangée « Points d'Anarchy » par participant : ± à la main, et un bouton « ⟳ Crédit de scène » qui ajoute d'un coup le total octroyé (une seule fois par scène). Un badge « ◆ » sur l'augmentation dans la fiche rappelle qui en génère, et « +1 action/narration » est signalé quand un atout l'accorde. Les points sont propres à la scène et repartent à zéro à la suivante.",
    },
    {
      id: "wn-complex-forms-sr6-a1", anchor: "nav-shadows", tours: ["whatsnew"], since: "1.58.0", fallback: "center",
      title: "Formes complexes (SR6 et Anarchy 1re)",
      body: "Les technomanciens ont désormais leurs formes complexes en SR6 et Anarchy 1re, après SR5. En SR6 (39 formes) on les tisse depuis la carte : le test se roule (Électronique + Résonance, ou Piratage pour Pic de Résonance), le Technodrain se résiste (Volonté + Logique), les dégâts s'encaissent — même geste qu'un sort. En Anarchy 1 (18 formes), fidèle au jeu, ce sont des Atouts narratifs : chaque forme montre son niveau d'Atout et son effet, sans jet automatisé. Les trois éditions concernées sont couvertes (Anarchy 2 n'en a pas au livre).",
    },
    {
      id: "wn-aro-depth", anchor: "nav-generator", tours: ["whatsnew"], since: "1.59.0", fallback: "center",
      title: "L'interface prend de la profondeur (Réalité augmentée)",
      body: "L'app gagne du relief : les cartes se détachent enfin du fond, un liseré capte la lumière, et le survol les soulève. Le générateur inaugure la peau « Réalité augmentée » — un chrome cyan (grille de scan, tag //AR) qui reste constant quand l'accent d'édition, lui, change de livre en livre. L'écran de choix d'édition adopte enfin les couleurs réalignées des quatre livres. Et l'apparition d'un PNJ généré se fait en douceur, sans à-coup.",
    },
    {
      id: "wn-dicelog-textures", anchor: "nav-combat", tours: ["whatsnew"], since: "1.61.0", fallback: "center",
      title: "Journal des jets : la texture de votre édition",
      body: "Le journal des jets montre maintenant ce qui a fait compter le jet, propre à chaque livre, au lieu d'un tag gris uniforme. En SR5, la Limite qui plafonne les succès s'affiche « Précision 6→3 ». La ressource dépensée avant le jet s'affiche avec son nom d'édition — « +2 Atout · 2×6↯ » en SR6, « +2 Chance… » en SR5 (Repousser les limites) : dés ajoutés et six explosifs, jusqu'ici invisibles. En Anarchy, la complication montre sa gravité sur une échelle (◆◇◇ mineure → ◆◆◆ désastre). L'export texte reprend ces textures ; les jets déjà enregistrés restent lisibles.",
    },
    {
      id: "wn-contact-edit", anchor: "nav-contacts", tours: ["whatsnew"], since: "1.62.0", fallback: "center",
      title: "Éditer un contact",
      body: "Chaque fiche de contact a maintenant un bouton « Éditer » (comme les PNJ, PJ, serveurs et véhicules) : une modale y regroupe le nom, le rôle, le trait, la description, l'Influence/Loyauté (ou Niveau/RR en Anarchy 2) et surtout le métatype, qui n'était modifiable nulle part une fois le contact créé. Au passage, la génération et la création de contact proposent désormais la liste de métatypes complète de l'édition — les 5 souches et toutes les métavariantes (Troll Cyclope, Ork Hobgobelin…), comme le générateur de PNJ.",
    },
    {
      id: "wn-generator-touch-groups", anchor: "nav-generator", tours: ["whatsnew"], since: "1.64.0", fallback: "center",
      title: "Générateur : filtres regroupés et bouton tactile",
      body: "Les neuf filtres du générateur de PNJ sont maintenant regroupés sous trois repères — Identité, Métier, Composition — plutôt qu'une seule cascade de champs. Le bouton « Générer » atteint aussi sa pleine cible tactile (44px) sur smartphone/tablette, là où il restait un peu court.",
    },
    {
      id: "wn-technomancien-a1-gen", anchor: "nav-generator", tours: ["whatsnew"], since: "1.65.0", fallback: "center",
      title: "Générer un technomancien (Anarchy 1re)",
      body: "Le générateur d'Anarchy 1re édition propose enfin des technomanciens : le Techno-ganger (Sbire) et le Technomancien de sécurité (Antagoniste), tirés au livre (Anarchistes p.147). Ils arrivent avec leur Pic de résonance et quelques formes complexes, et se rangent dans les bons milieux. Au passage, dans l'édition d'un PNJ, les sections Sorts et Formes complexes ne s'affichent en Anarchy que pour les personnages concernés (Éveillés / Émergés), plus proprement qu'avant.",
    },
    {
      id: "wn-sprites-compile", anchor: "nav-combat", tours: ["whatsnew"], since: "1.66.0", fallback: "center",
      title: "Compiler des sprites",
      body: "Les technomanciens compilent désormais leurs sprites. Sur la carte, le bouton « ◈ Sprite » ouvre le rail de compilation (même geste que l'invocation d'un esprit, en vocabulaire techno) : choisissez le Niveau et le type, l'app roule le test — les succès nets deviennent les tâches dues et le Technodrain est encaissé automatiquement. Le sprite apparaît en fiche liée avec ses attributs matriciels et son moniteur ; on marque ses tâches, on l'inscrit (permanent) ou on le renvoie. En SR5, SR6 et Anarchy 1 (par palier, sans jet) ; Anarchy 2 n'a pas de technomanciens.",
    },
    {
      id: "wn-play-cockpit", anchor: "nav-play", tours: ["whatsnew"], since: "1.67.0", fallback: "center",
      title: "« Jouer » : le poste de commandement du run",
      body: "Le run que vous jouez est désormais sorti en tête de « Jouer » et rassemble tout pour la séance : la scène vivante (round, moteur ⚔/⚡︎, barre de vie par combattant, sans ouvrir le tracker), la présence de chaque participant (un tap : RV ou astral, selon sa capacité — RA par défaut), l'horloge d'intrusion quand un serveur est en jeu (alerte, tour, CI), le topos condensé (objectif, complication, mandant, lieu, paie), le casting préparé (tap pour consulter, ⚔ pour envoyer un PNJ en scène, ⚡︎ pour mettre un serveur en jeu) et un accès direct à votre carnet de notes. Vos autres runs restent listés en dessous.",
    },
    {
      id: "wn-persona-combat", anchor: "nav-shadows", tours: ["whatsnew"], since: "1.68.0", fallback: "center",
      title: "Le technomancien attaque dans la Matrice",
      body: "Le persona incarné d'un technomancien (SR5/SR6) porte désormais son propre râtelier d'actions matricielles, en zone Combat, comme le cyberdeck d'un decker : Pic de données, Planter un programme, Effacer une mark… Ce sont les mêmes actions que celles d'un decker — le technomancien les joue par la Résonance : leurs réserves de dés sont tirées de son persona vivant (Attaque, Corruption, Traitement de données, Firewall) et non d'un deck. Un tap lance le jet ; la VD est affichée, jamais appliquée d'office.",
    },
    {
      id: "wn-backup-live-scene", anchor: "nav-settings", tours: ["whatsnew"], since: "1.70.0", fallback: "center",
      title: "Reprendre un combat sur un autre appareil",
      body: "Exporter puis importer une sauvegarde emporte désormais la scène de combat/Matrice vivante (round, initiative, combattants) et les runs générés : commencer un combat sur l'ordinateur et le finir sur le téléphone est enfin possible. En fusion, la scène importée ne remplace jamais un combat déjà engagé sur l'appareil qui reçoit l'import — seul « Remplacer tout » le peut.",
    },
    {
      id: "wn-tracker-v7", anchor: "nav-combat", tours: ["whatsnew"], since: "1.72.0", fallback: "center",
      title: "Le suivi de combat, en grand",
      body: "Le tracker devient un véritable écran à quatre zones. L'effectif est une file : l'actif en tête, la suite du tour dessous, et au « Tour suivant » la liste glisse au lieu de sauter. Sa console suit le principe « Agir produit / Réagir subit » — au tour d'un PNJ, ses attaques (armes, sorts, compétences) sans moniteur ; au tour d'un PJ, une console froide où les PNJ se défendent, encaissent, et se font bricker leur matos. Sur téléphone, la console remonte en tête.",
    },
    {
      id: "wn-run-create-launch", anchor: "nav-play", tours: ["whatsnew"], since: "1.73.0", fallback: "center",
      title: "Créer un run et le lancer, sans détour",
      body: "Le bouton « ＋ » de la barre de dossiers demande d'abord le type — ◆ Run, ❖ Campagne ou dossier simple — et crée le dossier déjà typé, sans passer par le menu « ⋯ ». Et dans « Jouer », un run sans scène offre enfin un bouton « Lancer la scène » : plus besoin de passer par la bibliothèque pour démarrer une rencontre.",
    },
    {
      id: "wn-topos-coherent-edit-cast", anchor: "nav-run", tours: ["whatsnew"], since: "1.73.0", fallback: "center",
      title: "Des topos cohérents, éditables, et leur casting",
      body: "Le générateur de topos ne tire plus ses champs au hasard : il monte un vrai conflit — un mandant vise un rival dont un site est le lieu, d'où découlent la sécurité, l'objectif et la difficulté — nourri par Seattle. Un bouton « ✎ Éditer » retouche n'importe quel champ, « Topos vierge » vous laisse écrire votre amorce à la main, et « ⚔ Casting » génère les PNJ d'opposition cohérents avec le topos et les range dans le run.",
    },
    {
      id: "wn-topos-map", anchor: "nav-run", tours: ["whatsnew"], since: "1.73.0", fallback: "center",
      title: "Un plan de lieu, en image",
      body: "Si les images IA sont activées (Réglages), un topos dont le lieu s'y prête porte un bouton « 🗺 Plan du lieu » qui génère un plan/blueprint du décor via Pollinations et le garde sur le topos — une vignette le réaffiche ensuite en grand. Portraits et plans partagent désormais le même réglage et la même file d'attente.",
    },
    {
      id: "wn-comj-nudges", anchor: "nav-settings", tours: ["whatsnew"], since: "1.76.0", fallback: "center",
      title: "Un co-MJ qui souffle au bon moment",
      body: "ShadowHerds commence à proposer, une seule fois et quand ça sert, une fonction déjà présente — sans décider à votre place. Première astuce : au lancement d'une scène, une bulle propose d'ouvrir l'écran joueurs ; à couper d'un coup dans Paramètres › Général.",
    },
    {
      id: "wn-reserves-situation-explain", anchor: "nav-shadows", tours: ["whatsnew"], since: "1.77.0", fallback: "center",
      title: "Le calcul des réserves, à la demande",
      body: "Les réserves de situation d'une fiche (Sang-froid, Surprise, Intentions, Mémoire, Port) affichent désormais leur décompte comme les pastilles de combat : survolez-les (ou appui long au doigt) pour voir la source de chaque dé — « Sang-froid 8 = Volonté 5 + Charisme 3 » — sans rien changer au jet.",
    },
    {
      id: "wn-first-run-guided", anchor: "nav-play", tours: ["whatsnew"], since: "1.79.0", fallback: "center",
      title: "Votre premier run, guidé",
      body: "Quand aucun run n'existe encore, « Jouer » n'affiche plus « Rien à jouer » : un bouton « ＋ Créer mon premier run » demande un nom, crée le run et le met aussitôt en contexte — dès lors, tout ce que vous rangez ou générez s'y range. Et promouvoir un topos en run le focalise directement, en proposant d'un clic de générer sa trame.",
    },
    {
      id: "wn-debrief-seance", anchor: "nav-play", tours: ["whatsnew"], since: "1.80.0", fallback: "center",
      title: "Le débrief de séance",
      body: "À la fin d'un run, un bouton « ✓ Débrief » (et une proposition quand vous rangez la rencontre) demande « qu'est-ce que ce run a laissé ? ». Vous ratifiez la paie, le karma et la réputation — la triade SR5, la Réputation et la Pression SR6, rien d'imposé pour Anarchy — appliqués d'un coup à toute l'équipe ; contact grillé, faveur due ou corpo fâchée rejoignent le carnet du run, datés. Tout dérive du registre de campagne existant : les soldes des fiches bougent, rien n'est stocké en double, chaque écriture reste annulable.",
    },
    {
      id: "wn-dossiers-mirror", anchor: "nav-shadows", tours: ["whatsnew"], since: "1.81.0", fallback: "center",
      title: "« Rangé dans » sur la fiche",
      body: "Chaque fiche montre désormais les dossiers où elle est classée — le miroir de « Mentionné dans », côté organisation plutôt que narration. Un clic sur un dossier le sélectionne et ouvre la bibliothèque filtrée dessus ; la pastille ❖/◆ signale campagne ou run. Rien de neuf à saisir : l'appartenance multi-dossiers existait déjà, on n'en montre que le sens inverse.",
    },
    {
      id: "wn-ic-combatant", anchor: "nav-combat", tours: ["whatsnew"], since: "1.82.0", fallback: "center",
      title: "Une CI comme combattante à part entière",
      body: "Le suivi de combat gagne un bouton « ＋ CI » : choisissez une contre-mesure (CI Noire, Tueuse…) et son indice, elle rejoint l'initiative avec son score du livre, son moniteur et ses jets — plus besoin de bricoler une ligne « CI NOIRE » à l'init saisie à la main. Et quand un serveur est lié et en alerte, « Round suivant » du combat déploie désormais la CI du tour tout seul (les deux horloges sont enfin synchronisées, et l'intrusion parle le même « Round » que le combat).",
    },
    {
      id: "wn-techno-archetype-sr6", anchor: "nav-generator", tours: ["whatsnew"], since: "1.83.0", fallback: "center",
      title: "Un technomancien à générer (SR6)",
      body: "Le générateur SR6 propose enfin deux technomanciens nommés — « Techno-ganger (émergé) » chez les gangs, « Technomancien de sécurité » côté corpo — sourcés d'Anarchistes. La machinerie persona / sprites / formes complexes, jusqu'ici accessible seulement en cochant la spécialisation, a désormais sa porte d'entrée directe. Bonus : un technomancien généré ne reçoit plus d'augmentation qui grignoterait sa Résonance.",
    },
    {
      id: "wn-card-peek", anchor: "nav-play", tours: ["whatsnew"], since: "1.84.0", fallback: "center",
      title: "Un coup d'œil sans quitter Jouer",
      body: "Consulter un PNJ du casting depuis « Jouer » ouvre désormais sa fiche en surimpression, par-dessus votre poste de commandement — au lieu de vous éjecter vers la bibliothèque. La fiche est complète et éditable ; les flèches ‹ › feuillettent le reste du casting sans jamais refermer. Vous ne quittez plus la scène pour jeter un œil.",
    },
    {
      id: "wn-ic-combat-values", anchor: "nav-combat", tours: ["whatsnew"], since: "1.85.0", fallback: "center",
      title: "Une CI qui se défend et attaque, partout",
      body: "Dans le suivi de combat, une contre-mesure d'intrusion montre enfin sa défense quand un decker l'attaque (bloc « Réagir »), et son attaque sur sa fiche — au lieu des boutons « — » inertes qu'affichait Anarchy. Chaque édition garde ses règles : Anarchy 2.0 affiche ses succès fixes en valeurs (défense/attaque = indice, Firewall 1), Anarchy 1re lance le statblock du livre (attaque 8, défense 11, Tueuse +2, Noire en physique), SR5/SR6 gardent leurs jets de dés — avec deux corrections au livre au passage (encaissement SR6 en indice×2, défense SR5 en indice + Firewall).",
    },
    {
      id: "wn-da-seance-projetee", anchor: "nav-play", tours: ["whatsnew"], since: "1.86.0", fallback: "center",
      title: "Les écrans de la séance prennent l'identité du livre",
      body: "L'écran spectateur, le plan de lieu et le poste « Jouer » — ce que les joueurs regardent — portent désormais la direction artistique de leur édition. Sur l'écran spectateur, chaque combattant s'inscrit dans le coin coupé signature (net en SR6), sur un fond de fines lignes de balayage teinté du livre, et son moniteur est agrandi à l'échelle du vidéoprojecteur — sa forme restant celle du livre (jauge continue SR5/SR6, paliers de gravité Anarchy 2). Le plan de lieu dessine sa grille et sa salle-objectif à l'encre de l'édition (magenta SR6, rouge SR5, or Anarchy 2, bleu Anarchy 1) ; le poste « Jouer » file ses moments Avant / Pendant / Après d'un repère à l'accent du livre. La même vérité, habillée pour la table.",
    },
    {
      id: "wn-server-plan", anchor: "nav-matrix", tours: ["whatsnew"], since: "1.89.0", fallback: "center",
      title: "Le plan de serveur",
      body: "Un site n'est presque jamais un seul serveur. L'écran Serveurs porte un bouton « ▤ Plan du site » qui dessine l'architecture du dossier — chaîne, arborescence, WAN (appareils asservis) ou serveurs imbriqués selon l'édition —, gratuitement et à l'instant, comme le « Plan tactique » d'un lieu. En mode édition, désignez le point d'entrée d'un serveur (Matrice publique ou connexion directe au câble) et lequel tient les données cibles. Et quand plusieurs serveurs sont piratés dans une même scène, le tiroir Matrice en affiche une mini-carte : touchez un nœud pour basculer le tiroir sur ce serveur.",
    },
    {
      id: "wn-foundation-reference", anchor: "nav-matrix", tours: ["whatsnew"], since: "1.90.0", fallback: "center",
      title: "Plonger dans les Fondations",
      body: "En SR5 et SR6, un serveur cache un donjon interne : les sept nœuds de ses Fondations (Data Trails / Hacker Vaillant). Le menu ⋯ d'une carte de serveur porte désormais « ⛓ Plonger dans les Fondations » — une fiche de référence qui rappelle, quand vous menez un run profond, les 7 nœuds (Portail, Archive, Centre de contrôle, échafaudage, sécurité, régie, nœud vide), leurs actions et leurs jets, le paradigme (repris de la sculpture du serveur) et le seuil de Variance — chacun au bon régime : SR5 oppose « Indice + attribut », SR6 « Indice × 2 ». Anarchy n'a pas de Fondation : l'entrée ne s'y affiche pas.",
    },
    {
      id: "wn-scene-first-class", anchor: "nav-play", tours: ["whatsnew"], since: "1.91.0", fallback: "center",
      title: "La scène, unité vivante de la campagne",
      body: "Un run n'est plus un topo plat : il contient des scènes nommées, chacune avec son propre casting, ses notes et son plan de lieu — par référence, jamais copie. Dans « Jouer », le moment « Avant » liste les scènes du run. Chaque scène se joue pour elle-même : la lancer ouvre sa rencontre, dont l'état est mémorisé par scène (on bascule sans perdre son round). Les scènes s'enchaînent, et une campagne entière se duplique pour la rejouer avec une autre équipe : la structure est copiée, l'état de jeu repart vierge, mais les PNJ, plans et hosts restent partagés.",
    },
    {
      id: "wn-relations-graph", anchor: "nav-characters", tours: ["whatsnew"], since: "1.92.0", fallback: "center",
      title: "Le graphe des relations",
      body: "Les liens entre vos personnages, PNJ, contacts et serveurs se voient maintenant en graphe. Sur la fiche d'un PJ relié à des contacts, le bouton « ◈ Liens » ouvre une carte des relations : chaque entité est un nœud, reliés par leurs liens. Déplacez les nœuds (ils ont un poids, glissent avec de l'élan), touchez-en un pour ouvrir sa fiche en aperçu sans quitter le graphe, et activez « Tisser » pour créer un lien en tirant d'un nœud à l'autre — la ligne s'accroche à la cible valide. Une seule vérité : liens tissés ici et liens des fiches vivent au même endroit.",
    },
    {
      id: "wn-full-defense", anchor: "nav-combat", tours: ["whatsnew"], since: "1.93.0", fallback: "center",
      title: "La Défense totale, motorisée",
      body: "Au tour d'un PJ, la console « Réagir » gagne un bouton ⛨ Défense totale (SR5/SR6) : d'un tap, le PNJ ajoute sa Volonté à sa réserve de défense pour le round, et le coût d'initiative est appliqué tout seul — −10 au score en SR5, sans coût en SR6. Au passage : le bouton ✸ Dégâts déplie de nouveau ses crans (il ne faisait plus rien), l'Encaissement ⛊ disparaît en Anarchy (qui n'a pas de jet d'encaissement), les blessures légère/grave/incapacitante reprennent les couleurs du moniteur, et la fiche d'un PNJ s'ouvre en aperçu feuilletable (⛶) plutôt que de se déplier vers le bas.",
    },
    {
      id: "wn-card-paysage", anchor: "nav-shadows", tours: ["whatsnew"], since: "1.94.0", fallback: "center",
      title: "Une vue de jeu pour la fiche",
      body: "Un nouveau bouton ◫ dans le rail de vues (à côté de ☰❝⚔) déplie la fiche en PAYSAGE : à gauche le système réduit à l'essentiel de jeu — moniteur en bande horizontale cochable, la capacité signature selon l'archétype (sorts pour un mage, râtelier Matrice pour un decker, armes pour un combattant), les compétences en puces lançables, les augmentations en tags ; à droite la fiction (incarnation lisible, valeurs sous les titres, + contacts/mentions/dossiers). Scannable d'un coup d'œil, tout reste lançable en un tap. Les vues ☰❝⚔ ne changent pas — choisir une lentille sort du paysage. En mode Annuaire, les fiches compactes s'étalent aussi en grille pour comparer plusieurs figurants d'un coup d'œil.",
    },
    {
      id: "wn-worldstate-memory", anchor: "nav-run", tours: ["whatsnew"], since: "1.95.0", fallback: "center",
      title: "Le monde se souvient",
      body: "Générez un topos dans une campagne et le monde tient compte de son histoire : une corpo déjà affrontée revient (« 3ᵉ run contre eux, ils vous connaissent »), un contact connu de l'équipe peut s'en mêler, la réputation de l'équipe pèse sur la taille du job, et un ennemi déjà croisé peut resurgir au casting en un tap. Au débrief, marquez qui vous doit une faveur (il vous ramènera un job) ou qui est grillé (il ne rappelle plus). Le monde propose, vous ratifiez : tout est dérivé de votre campagne, rien n'est imposé, et les éditions sans réputation l'ignorent proprement.",
    },
    {
      id: "wn-graph-mindmap", anchor: "nav-shadows", tours: ["whatsnew"], since: "1.96.0", fallback: "center",
      title: "Le graphe des relations, éditable",
      body: "La lentille « ◈ Liens » s'ouvre désormais depuis n'importe quelle fiche, PNJ compris, pour tisser les relations PNJ↔PNJ. Touchez un nœud : sa fiche s'affiche sur le côté (touchez-en un autre, elle s'échange). Stylez le réseau comme un schéma heuristique — un lien reçoit une couleur, une direction (→, ←, ↔), des pointillés et un mot (« doit une faveur ») ; un nœud reçoit une couleur qui le suit partout. Une flèche reste de la fiction, jamais une marque de jeu. Sur téléphone, la fiche passe en feuille basse sous le graphe.",
    },
    {
      id: "wn-foundation-playable", anchor: "nav-matrix", tours: ["whatsnew"], since: "1.97.0", fallback: "center",
      title: "Les Fondations, en plan et en Variance",
      body: "La fiche « ⛓ Plonger dans les Fondations » (SR5/SR6) affiche maintenant un plan généré des 7 nœuds : en SR6, le vrai squelette de pistes du livre ; en SR5, les 7 nœuds seuls — le livre n'imprime aucune table, elles restent narratives. Touchez un nœud pour sauter à ses actions. Et pendant un run profond, un tracker de Variance rejoint le Score de Surveillance dans le tiroir Matrice : un stepper +1 à +5 en SR6 (seuil 80 − 5×Indice), un vrai test de dés en SR5 (Firewall ou Indice+Firewall, seuil 4, avec ses 4 issues du livre). Anarchy n'a pas de Fondation : rien n'y apparaît.",
    },
    {
      id: "wn-cockpit-vivant", anchor: "nav-play", tours: ["whatsnew"], since: "1.98.0", fallback: "center",
      title: "Le poste « Jouer » devient un cockpit vivant",
      body: "La séance se lit d'un coup d'œil. La coquille prend une couleur d'état : froide au repos, à l'encre de l'édition en combat, verte quand la Matrice tourne — avec une barre qui dit le moment (« ● En combat — Round 2 »). Au repos, le topos se présente comme un vrai briefing (objectif en titre, mandant et lieu, complication en garde) et le bouton « Lancer la scène » chauffe en accent. Chaque campagne devient un Pont : un poste d'aiguillage où le run en cours est surélevé et pulse. À la clôture, le débrief se lit comme un bilan en teinte or.",
    },
    {
      id: "wn-factions", anchor: "nav-shadows", tours: ["whatsnew"], since: "1.98.0", fallback: "center",
      title: "Les Factions, transverses au Monde",
      body: "Une faction rassemble PNJ, PJ, contacts et serveurs sous un même toit : une bande « Factions » apparaît sur chaque fiche. Sur le graphe des relations, chaque faction devient une poche colorée derrière ses membres (bascule « ◇ Poches »). Sélectionnez plusieurs nœuds pour « en faire une faction » d'un geste. Et le nom d'une faction, sur une fiche, ouvre le graphe scopé à ses seuls membres.",
    },
    {
      id: "wn-tags-pin", anchor: "nav-shadows", tours: ["whatsnew"], since: "1.98.0", fallback: "center",
      title: "Des tags et une épingle pour ranger",
      body: "Chaque entité accepte des tags libres (« corpo », « matrice », « indics »), posés depuis sa fiche et réutilisables d'une entité à l'autre. Les Favoris deviennent une épingle (l'étoile de la carte) plutôt qu'un dossier réservé. Dans « Ombres portées », deux nouvelles puces de filtre — ★ Épinglés et Tags — retrouvent d'un tap toutes les fiches d'un tag, en s'ajoutant aux filtres Rôle · Milieu · Métatype.",
    },
    {
      id: "wn-monde-sans-dossiers", anchor: "nav-shadows", tours: ["whatsnew"], since: "1.99.0", fallback: "center",
      title: "Le Monde se range par tags, plus en dossiers",
      body: "La colonne « Dossiers » quitte « Ombres portées » et les écrans de génération : la bibliothèque montre désormais tout votre monde d'un seul tenant, retrouvé par ses tags et son type. Un PNJ, un contact ou un serveur généré rejoint directement le Monde — plus d'étape de rangement. La timeline Campagne › Run › Scène, elle, reste chez elle, dans « Jouer » et le générateur de topos : ce qui EST (le Monde) et ce qui SE JOUE (le Jeu) ne se mélangent plus dans la même liste.",
    },
    {
      id: "wn-casting-convocation", anchor: "nav-run", tours: ["whatsnew"], since: "1.99.0", fallback: "center",
      title: "Le casting d'un run se convoque",
      body: "Générer l'opposition d'un run ne la « range » plus dans un dossier : elle est CONVOQUÉE, par référence. Conséquence directe : une même figure peut jouer dans plusieurs runs sans être copiée, et convoquer une faction amène tout son roster vivant — éditer la faction une fois se répercute sur tous les runs qui la convoquent. La fiche indique « Convoqué dans » les nœuds où elle joue, et « ramener un visage déjà croisé » comme la mémoire du monde suivent cette même vérité.",
    },
    {
      id: "wn-paradigme-deroule", anchor: "nav-matrix", tours: ["whatsnew"], since: "1.100.0", fallback: "center",
      title: "Le paradigme d'un serveur, déroulé pour la table",
      body: "La « sculpture » d'un serveur ne reste plus une simple ligne. Dans « ⛓ Plonger dans les Fondations » (SR5/SR6), chacun des 7 nœuds prend le costume du thème — l'Archive d'une cathédrale devient « la crypte aux reliques » —, une phrase d'arrivée pose l'ambiance, et la Variance se raconte : ce qu'« agir hors-thème » veut dire ici, en mineure et en extrême, dérivé de Data Trails. Sur la carte du serveur, un bloc dit ce que l'hôte EST dans le monde. Le tout couvre les 32 sculptures ; un thème maison retombe sur des amorces qui vous invitent à le décrire.",
    },
    {
      id: "wn-images-ambiance", anchor: "nav-matrix", tours: ["whatsnew"], since: "1.100.0", fallback: "center",
      title: "Des images d'ambiance générées, là où elles servent",
      body: "Quand « Images IA » est activé (Paramètres), l'IA sert désormais l'AMBIANCE, pas la structure. Un bouton « ✨ Image du paradigme » sur une carte serveur génère une vue onirique de son thème (grande dans la vue Fondations, en vignette sur la carte). Et l'ancienne « image de plan » d'un lieu devient une vraie image d'ambiance cinématographique — le plan tactique, lui, reste au plan SVG, gratuit et précis. Le SVG pour la géométrie, l'IA pour le ressenti.",
    },
    {
      id: "wn-casting-briefing", anchor: "nav-play", tours: ["whatsnew"], since: "1.101.0", fallback: "center",
      title: "Le casting du Briefing, par faction et à convoquer",
      body: "Dans « Jouer », la bande Casting d'un run garde enfin ses factions entières : une faction convoquée est une seule puce dépliable — pastille de couleur, compte de membres, chevron qui déroule ses figures avec leur ⚔ « en scène » — au lieu d'une bouillie de noms. Ce que la campagne parente convoque descend sur le run, marqué « hérité ». Et un bouton « ＋ convoquer » ouvre un sélecteur (factions + recherche d'entités) pour bâtir ou ajuster le casting sans quitter le poste de commandement.",
    },
    {
      id: "wn-graph-zoom", anchor: "nav-shadows", tours: ["whatsnew"], since: "1.102.0", fallback: "center",
      title: "La carte des Liens se zoome et se déplace",
      body: "La carte heuristique (vue « Liens ») n'est plus prisonnière de la taille de la fenêtre. Molette pour zoomer autour du curseur, boutons « ＋ / ⤢ / − » au coin de la carte (« ⤢ » revient à la vue d'ensemble), et pincement à deux doigts sur écran tactile — le geste consacré. Une fois zoomé, glissez le fond pour vous déplacer. Vos gestes habituels — déplacer un nœud, tisser un lien — restent intacts : le zoom cadre, il ne touche pas au graphe.",
    },
    {
      id: "wn-trame-scenaristique", anchor: "nav-trames", tours: ["whatsnew"], since: "1.103.0", fallback: "center",
      title: "Un atelier de trame scénaristique, jouable en direct",
      body: "Construisez un run comme une carte de scènes typées (accroche, action, décision, retombée…) reliées par des transitions et des issues de secours — de zéro, d'un squelette (Donjon en 5 salles, Story Spine, Story Circle) ou d'un modèle maison enregistré depuis une trame existante. Superposez un calque d'indices (faits + pistes, ancrées ou flottantes) avec des alertes de robustesse (« ce fait n'a qu'une seule voie », règle des trois indices). Faites avancer la menace avec des horloges (qui ferment une voie ou activent une scène à un seuil) et des fronts (une faction + des étapes « si on ne fait rien… » qui escaladent). Annotez chaque scène de son moment clé (le choix qui fait basculer, une flèche espoir/danger qui teinte la carte). Et surtout : l'atelier de prep et le cockpit de « Jouer » éditent la même trame, en direct — bifurquer ou faire tourner une horloge à la table se voit aussitôt sur le schéma, et inversement.",
    },
    {
      id: "wn-trame-panneau", anchor: "nav-trames", tours: ["whatsnew"], since: "1.104.0", fallback: "center",
      title: "Trames prend toute la place — et rejoint « Préparer un run »",
      body: "L'atelier de trame n'est plus une fenêtre flottante à l'étroit : c'est un écran plein, qui profite enfin des grands moniteurs et se lit comme le reste du site. Son en-tête, jadis une rangée de onze boutons, tient en trois zones claires — la trame et son menu (Nouvelle, Renommer, Modèle…), les lentilles regroupées (Relier · Indices · Horloges · Chronologie), et la Robustesse. Dans la navigation, Topos et Trames se rangent ensemble sous « Préparer un run » : deux façons de démarrer un run — l'amorce rapide ou la structure d'avance — avec un passage direct de l'une à l'autre. Et le vocabulaire se met à parler sans jargon : la Pression devient des Horloges, le bang un Moment clé, les présages des étapes « si on ne fait rien… », l'échéance une Catastrophe.",
    },
    {
      id: "wn-cockpit-etage", anchor: "nav-play", tours: ["whatsnew"], since: "1.105.0", fallback: "center",
      title: "Le cockpit de « Jouer » s'étage autour de la trame",
      body: "Quand une scène de combat tourne, « Jouer » réorganise le poste : le roster (vos combattants) reprend la première place, et la trame se réduit à une barre lisible d'un coup d'œil — le chemin parcouru, l'étape en cours, son moment clé, et « La suite » pour bifurquer. Les Horloges et les Fronts se rangent dans des tiroirs qu'on déplie d'un tap ; monter une horloge ou révéler une étape « si on ne fait rien… » se fait sur place, sans que l'écran se reconstruise et sans perdre où vous en étiez. La première fois qu'un Front apparaît, une note explique en un mot ce que c'est. À froid, en préparation, la trame reprend les commandes — et le fil ne montre que le chemin réellement joué, jamais une ligne imposée d'avance.",
    },
    {
      id: "wn-graph-pan", anchor: "nav-trames", tours: ["whatsnew"], since: "1.106.0", fallback: "center",
      title: "Se déplacer dans les graphes, même sans zoomer",
      body: "Sur les deux écrans qui reposent sur le moteur de graphe — la carte des Liens et l'atelier de Trames — attrapez le fond et faites glisser la vue à n'importe quelle échelle, y compris à l'ouverture. Avant, il fallait d'abord zoomer pour que le déplacement « prenne » ; désormais le fond se saisit tout de suite (le curseur passe en main ouverte, puis fermée pendant le glisser), et le bouton « ⤢ » recentre sur la vue d'ensemble si vous vous éloignez. Vos autres gestes — déplacer un nœud, tisser un lien, zoomer à la molette ou au pincement — restent intacts.",
    },
    {
      id: "wn-worldstate-beats", anchor: "nav-play", tours: ["whatsnew"], since: "1.107.0", fallback: "center",
      title: "Le monde se souvient de vos Moments clés",
      body: "Au débrief, la section « Ce que le run a laissé » affiche désormais les Moments clés que la partie a réellement traversés — les bascules d'espoir ↑ ou de peur ↓ que vous aviez posées sur la trame. Et quand vous générez un nouveau run dans la même campagne, une ligne « ◆ Écho » rappelle un moment fort laissé derrière l'équipe. Rien n'est imposé : ce sont des rappels, la mémoire du monde qui affleure — jamais un choix à votre place.",
    },
    {
      id: "wn-cockpit-peau", anchor: "nav-play", tours: ["whatsnew"], since: "1.108.0", fallback: "center",
      title: "Le cockpit de « Jouer » a de la gueule",
      body: "Le poste de commandement ressemble enfin à un vrai cockpit : un header teinté par l'accent de votre édition, le nom de l'état en grand (⚔ Combat · ⚡︎ Matrice · Préparation) avec une pastille qui rougeoie à chaud, des cellules d'horloge en gros chiffres (Round · Passe · En scène) et un bandeau de jalons. Le fil des étapes se colore par type de scène (accroche, repérage, action, sociale, décision, retombée), et les Horloges deviennent des jauges segmentées qui se remplissent case par case. Tout suit l'accent de l'édition — rien n'est codé en dur.",
    },
    {
      id: "wn-cockpit-onglets", anchor: "nav-play", tours: ["whatsnew"], since: "1.109.0", fallback: "center",
      title: "Le cockpit de « Jouer » se navigue par onglets",
      body: "Le bandeau Préparation · En jeu · Clôture devient cliquable : basculez d'un tap entre les parties du poste de commandement. Le Briefing (topos, casting, scènes), la scène En jeu (Combat ou Matrice, avec le roster, la trame et les Horloges/Fronts) et la Clôture (le bilan) s'affichent chacune en plein, avec la couleur d'état qui suit. La partie qui correspond à l'état réel du run reste l'onglet par défaut — le reste, vous pouvez le prévisualiser quand vous voulez.",
    },
    {
      id: "wn-graph-formes", anchor: "nav-trames", tours: ["whatsnew"], since: "1.110.0", fallback: "center",
      title: "Le graphe de trame se lit à la forme",
      body: "Chaque étape prend une forme selon sa nature, comme un diagramme de flux : l'accroche est un cercle (l'entrée), la retombée un cercle à double liseré (la sortie), les étapes jouables (action · sociale · repérage) des rectangles arrondis, la décision un losange (l'aiguillage) et chaque fait/indice un hexagone. On repère d'un coup d'œil où l'on bifurque et où le run peut retomber, sans lire les étiquettes. Et les liens se posent élégamment sur le bord réel de chaque forme — au flanc du losange, à l'arête du rectangle.",
    },
    {
      id: "wn-topos-trame-auto", anchor: "nav-play", tours: ["whatsnew", "full"], since: "1.111.0", fallback: "center",
      title: "Un topos qui se déplie en trame jouable",
      body: "Le bouton « Générer la trame » (sur la carte de run, et dans « Avant » à Jouer) fait bien plus que caster : d'un clic, il pose une aventure entière depuis le topos, et différente à chaque fois. Le squelette de scènes est tiré au sort parmi trois modèles narratifs, puis habillé par le verbe de votre objectif (une extraction, un vol de données ou un sabotage ne se jouent pas pareil), avec un choix forcé au climax et une flèche espoir/peur qui donne le rythme. S'y greffent : les factions en lice (l'opposition, et le commanditaire ou une équipe rivale selon la complication) ; des horloges de pression (une alerte qui, pleine, déclenche l'affrontement et ferme la fuite, plus une horloge d'objectif propre au contrat) ; des fronts avec leurs présages ; un calque d'indices menant à la vérité cachée derrière le run ; et le casting d'opposition réparti sur les scènes selon les rôles. La trame est aussitôt liée au run : le cockpit de « Jouer » l'affiche en direct. Vous partez d'une amorce, vous repartez avec une aventure structurée.",
    },
    {
      id: "wn-graph-cartes", anchor: "nav-trames", tours: ["whatsnew"], since: "1.113.0", fallback: "center",
      title: "Le graphe de trame se lit comme des fiches",
      body: "Chaque étape devient une carte posée sur le canevas, façon plan de scénario : glyphe + type, titre, casting en puces (et le lieu s'il est renseigné) — tout d'un coup d'œil, sans cliquer pour ouvrir l'inspecteur. Le contour garde la lecture par catégorie : rectangle arrondi pour les scènes jouables, pastille pour l'accroche, pastille à double liseré pour la retombée, octogone pour la décision. Les liens se posent toujours sur le bord réel de chaque carte, et sur petit écran l'affichage se replie au glyphe + titre compact.",
    },
    {
      id: "wn-graph-portraits", anchor: "nav-shadows", tours: ["whatsnew"], since: "1.114.0", fallback: "center",
      title: "Des visages sur la carte des Liens",
      body: "Quand un personnage a un portrait IA généré (depuis sa fiche), son nœud sur la carte des Liens l'affiche directement, détouré dans l'anneau — un vrai casting board où l'on met un visage sur chaque contact d'un coup d'œil. Les entités sans portrait gardent leur pastille et leur glyphe. (Pour générer un portrait : activez « Images IA » dans les Paramètres, puis « Portrait IA » sur une fiche.)",
    },
    {
      id: "wn-graph-traits", anchor: "nav-trames", tours: ["whatsnew"], since: "1.116.0", fallback: "center",
      title: "Colorer et styler les traits du graphe",
      body: "Sélectionnez une transition (graphe de trame) ou un lien (carte des Liens) : l'inspecteur d'arête permet désormais de choisir une couleur et un motif de trait — plein, pointillé ou tirets. De quoi distinguer d'un coup d'œil un passage ferme d'un chemin conditionnel ou hypothétique. Sur la trame, une transition fermée par une horloge ou une issue de secours reste en tirets atténués : l'état de jeu prime sur le style choisi.",
    },
    {
      id: "wn-clues-arm-weave", anchor: "nav-trames", tours: ["whatsnew"], since: "1.117.0", fallback: "center",
      title: "◇ Indices arme le tissage",
      body: "Dans l'atelier de trame, activer ◇ Indices allume maintenant aussi ◈ Relier : vous pouvez tirer d'une scène vers un fait pour l'ancrer tout de suite, sans jongler avec deux boutons. Si vous préférez réarranger les nœuds en glissant, ré-éteignez ◈ Relier à la main.",
    },
    {
      id: "wn-backup-trames", anchor: "nav-shadows", tours: ["whatsnew"], since: "1.118.0", fallback: "center",
      title: "Importer/exporter ses trames",
      body: "« Charger une sauvegarde » compte désormais vos trames scénaristiques au même titre que vos PNJ et contacts : une sauvegarde qui ne contient que des trames n'apparaît plus vide, s'exporte normalement, et le récapitulatif d'import annonce « … N trames ».",
    },
    {
      id: "wn-cockpit-indices", anchor: "nav-play", tours: ["whatsnew"], since: "1.119.0", fallback: "center",
      title: "Les indices de l'enquête, à la table",
      body: "Dans « Jouer » (En jeu), un tiroir Indices liste les indices de la scène en cours — plus les indices flottants, révélables partout — avec le fait qu'ils dévoilent, un repère « jet » s'ils sont derrière un test, et le contact qui les porte le cas échéant. Cochez-les « révélé » au fur et à mesure : l'état survit au rechargement et le tiroir affiche révélés/total, pour tenir la règle des trois indices sans quitter la table.",
    },
    {
      id: "wn-etats-combat", anchor: "nav-combat", tours: ["whatsnew"], since: "1.120.0", fallback: "center",
      title: "Poser un état sur un PNJ (SR5/SR6)",
      body: "Zone Combat d'une fiche SR5 ou SR6 : un « ＋ » ouvre la liste des états. SR6 a ses 28 états du livre (Aveuglé, À terre, Enflammé, Couvert…) — huit en accès direct, le reste derrière « tous… ». SR5 n'a pas d'états mais ses modificateurs de situation persistants (Étendu, Couvert, Surpris…), sous leur nom du livre. Un tap pose, les taps suivants montent d'un cran (Aveuglé I → II → III → retiré), le ✕ retire. Chaque état affiche ses effets et sa page en infobulle : l'app les montre, elle ne les applique pas encore. Le ⛨ « Réinitialiser les moniteurs » les retire tous, et au changement de round elle signale ceux dont la durée est échue — sans jamais les enlever à votre place.",
    },
    {
      id: "wn-etats-anarchy", anchor: "nav-combat", tours: ["whatsnew"], since: "1.121.0", fallback: "center",
      title: "Les états arrivent aussi en Anarchy",
      body: "Anarchy 1 reçoit ce que le moniteur ne disait pas : Assommé, Mourant (l'app vous rappelle le test de fin de Tour, elle ne le résout pas), les séquelles des options de récupération, et les conditions durables Acide et En feu. « Sonné » n'y figure pas — vos cases le disent déjà. Anarchy 2 reçoit Avantage, Désavantage et Drain magique : posez un désavantage sur un PNJ et il part dans le jet, avec la règle du livre (avantage et désavantage se cumulent sans jamais dépasser un cran). Les durées se comptent ici en Narrations.",
    },
    {
      id: "wn-etats-appliques", anchor: "nav-combat", tours: ["whatsnew"], since: "1.122.0", fallback: "center",
      title: "Les états qui comptent baissent vraiment les réserves",
      body: "Quatre états SR6 — Confus, Électrocuté, Fatigué, Frigorifié, les seuls que le livre écrit « à toutes les actions » — entrent maintenant dans toutes les réserves affichées, avec un badge ⊘ −ND qui nomme ses sources : le chiffre ne baisse jamais sans qu'on sache pourquoi. L'encaissement reste exempt, comme l'écrit le livre. Désorienté retire ses 4 points d'initiative et verrouille le panneau d'Atout (« ni gain ni dépense ») ; en SR5, Surpris retire ses 10 points et se réapplique à chaque relance d'initiative tant qu'il est posé. Les vingt-quatre autres états restent affichés et sourcés — « Aveuglé −3 aux tests liés à la vision » ne peut pas devenir un −3 global sans être faux la plupart du temps.",
    },
    {
      id: "wn-echange-actions-sr6", anchor: "nav-combat", tours: ["whatsnew"], since: "1.125.0", fallback: "center",
      title: "SR6 : échanger ses actions",
      body: "La rangée de jetons du tour portait le compte, mais pas la monnaie : majeures et mineures étaient étanches alors que le livre les fait converser (p.42). Deux boutons prolongent la rangée — « 1 majeure → 1 mineure » et « 4 mineures → 1 majeure », ce dernier étant le seul moyen d'attaquer deux fois dans le même tour. Seuls les échanges payables avec ce qui vous reste sont proposés. Attention, l'échange est à perte : descendre puis remonter coûte 3 mineures, comme dans le livre. C'est pourquoi le ↺ rend les jetons échangés du tour au lieu de proposer un aller-retour — et il refuse si vous avez déjà consommé ce qui en dépendait.",
    },
    {
      id: "wn-equipages", anchor: "nav-combat", tours: ["whatsnew"], since: "1.139.0", fallback: "center",
      title: "Monter à trois dans le même taxi",
      body: "La piste ne connaissait que des personnes, et devinait leur véhicule d'après leur équipement — impossible d'y mettre trois runners dans la même bagnole, ni un engin que personne ne possède. Tapez le nom d'un participant sur la piste : sa fiche s'ouvre, et « ▣ Monter dans… » propose les montures déjà en scène, le catalogue de l'édition (tapez « americar », « bulldog », « roto ») ou une saisie libre pour le taxi du coin. On prend le volant, on change de monture, on descend — et descendre repose sur la bande de la voiture, pas ailleurs. Un véhicule vaut désormais UN jeton, comme le livre lui donne une position : son conducteur en sous-titre, son équipage dans sa fiche, où chaque nom ouvre les actions d'Atout de son propriétaire — une carrosserie n'en dépense pas. L'engin pris au catalogue est une vraie fiche avec son moniteur : dans une poursuite, on se fait tirer dessus. Et si l'un des vôtres vole une bagnole en pleine course à pied, la piste accepte les deux régimes : chaque jeton porte son propre attribut, et l'app se tait sur le point d'Atout du round — aucun livre ne compare une Force à un Intervalle de vitesse, donc c'est vous qui tranchez.",
    },
    {
      id: "wn-mouvement", anchor: "nav-combat", tours: ["whatsnew"], since: "1.139.0", fallback: "center",
      title: "Marche, course, sprint — enfin chiffrés",
      body: "Le terrain « À pied » de la piste affichait un attribut sans jamais dire ce qu'il permettait de parcourir. Les vitesses sont maintenant lues dans les livres, sans les lisser entre eux : SR5 les dérive de l'Agilité (marche ×2, course ×4) et ne fait varier que le gain de sprint — +1 m par succès pour les nains et les trolls, +2 m pour les elfes, les humains et les orks ; SR6 est forfaitaire (10 m pour Se déplacer, 15 m + 1 m par succès pour Sprinter, quels que soient le métatype et l'Agilité) ; Anarchy ne compte pas en mètres du tout, et l'app écrit sa phrase — des portées et des Narrations — plutôt qu'un chiffre inventé. Les dix-sept formes qui ont leur propre déplacement remplacent celui de leur souche, mode secondaire compris : le pixie et le falcin volent, le naga nage. Trois endroits pour le lire : la fiche du participant sur la piste (pendant exact de la ligne de stats d'une monture), une pastille « Vitesse » à côté de l'initiative sur la carte, et l'infobulle de l'état « En course » de SR5 — qui portait une conséquence mécanique sans jamais dire à partir de combien de mètres. Un état qui plafonne la vitesse (SR6 Fatigué, Entravé) l'emporte en dernier, en disant lequel.",
    },
    {
      id: "wn-poursuite", anchor: "nav-combat", tours: ["whatsnew"], since: "1.138.0", fallback: "center",
      title: "Les courses-poursuites ont enfin une piste",
      body: "Dans le suivi de combat, « ⋯ → ⇉ Scène Poursuite » ouvre une piste : la cible en haut, l'écart qui descend, et une issue à chaque bout — rattrapé d'un côté, semé de l'autre, avec la condition du livre. Posez tout le monde d'un geste, déplacez d'une bande aux chevrons ▲▼. Chaque jeton porte le chiffre qui décide le round (Intervalle de vitesse, Accélération, Vitesse, Mobilité selon l'édition ET l'environnement) et la barre dit ce qu'il fait : gain d'Atout en SR6, limite du test en SR5. Le ⚄ lance pour vos PNJ et se contente d'enregistrer ce que vos joueurs annoncent. En SR6, le ⇉ d'un jeton déplie les 14 actions d'Atout de course-poursuite, filtrées selon que le participant fuit ou poursuit.",
    },
    {
      id: "wn-etat-groupe", anchor: "nav-combat", tours: ["whatsnew"], since: "1.126.0", fallback: "center",
      title: "Poser un état sur plusieurs PNJ",
      body: "Une fumigène tombe, trois gardes deviennent Aveuglés : en bas du suivi de combat, « ⊘ État de groupe » ouvre un panneau où vous choisissez l'état puis cochez les combattants. Le bouton n'apparaît qu'à partir de deux cibles — à une seule, le ＋ de la fiche suffit. Sur une scène qui mêle les éditions, le panneau propose l'union des états connus et grise les cibles dont l'édition ignore celui que vous avez choisi, en le disant. La fiche, elle, ne change pas : son ＋ pose toujours sur un seul PNJ.",
    },
    {
      id: "wn-interruptions-sr5", anchor: "nav-combat", tours: ["whatsnew"], since: "1.124.0", fallback: "center",
      title: "SR5 : les actions d'interruption",
      body: "L'app ne connaissait que trois natures d'action ; le livre en compte quatre. Les interruptions ne consomment aucun jeton — elles se paient en score d'initiative. En SR5, le ⛨ de la console de réaction déplie maintenant les huit, avec leur coût : Bloquer, Esquiver, Parer, Intercepter, Manger la poussière et Défense contre sorts à −5, Passer en défense totale et Conduite évasive à −10. Celles que l'initiative ne peut pas payer restent visibles mais grisées, avec la raison au survol — et un personnage Surpris ne peut en déclarer aucune avant d'avoir joué (p.169). Les défenses multiples se comptent aussi toutes seules : −1 dé par défense supplémentaire, remis à zéro à sa phase d'action. En SR6, rien ne bouge : une seule interruption, le ⛨ reste une bascule.",
    },
    {
      id: "wn-bilan-round", anchor: "nav-combat", tours: ["whatsnew"], since: "1.123.0", fallback: "center",
      title: "Le round dresse son bilan",
      body: "En passant au round suivant, un panneau liste ce que les états réclament — et il n'apparaît que s'il a quelque chose à dire. Qui brûle, avec la VD du moment et le bouton d'encaissement à côté (« Enflammé 2 · VD 2P »). Qui doit faire un test de round, avec sa réserve et son seuil (« Nauséeux · CON + VOL (2) »). Quelles durées sont échues — et elles se retirent toutes d'un seul geste. Empoisonné décroît tout seul comme le dit le livre, et Mourant (Anarchy 1) compte ses Tours : la difficulté monte d'un cran à chaque fois, le panneau affiche le seuil courant. L'app pose la bonne valeur au bon moment et vous tend les dés — elle ne lance rien à votre place et ne remplit aucun moniteur.",
    },
    {
      id: "wn-qui-est-dans-le-serveur", anchor: "nav-combat", tours: ["whatsnew"], since: "1.149.0", fallback: "center",
      title: "La scène sait qui est dans le serveur",
      body: "Le suivi affichait l'alerte, les CI et la surveillance d'une intrusion sans jamais dire qui la menait — donc sans répondre à la question qu'on se pose à la seconde où l'alerte tombe : qui est exposé ? Le panneau d'intrusion porte maintenant une ligne « Dans le serveur » avec les personas qui y tournent, et la liste des combattants marque ces runners d'un ⚡︎, jumeau du ⇉ de la course-poursuite : un coup d'œil suffit à voir qui se bat, qui fuit et qui est branché. Rien n'a été ajouté à l'intrusion pour ça — l'information vivait déjà sur la fiche du runner, c'est sa cible matricielle, celle que l'app affiche sur sa carte et qu'elle propose de lier à la scène ; elle n'avait jamais été rapprochée de l'effectif. Vos scènes déjà enregistrées en profitent sans rien changer. Deux silences voulus : rien ne s'affiche quand personne n'est dans le serveur, et un runner qui vise un serveur que la scène ne suit pas n'est marqué nulle part.",
    },
    {
      id: "wn-narrations-portee", anchor: "nav-combat", tours: ["whatsnew"], since: "1.148.0", fallback: "center",
      title: "Anarchy : franchir une portée prend du temps",
      body: "« Changer de portée coûte 1 à 3 Narrations » était imprimé sur la piste depuis toujours, en petits caractères, et ne faisait rien. C'est motorisé — mais pas comme une dépense : une Narration n'est pas une monnaie, c'est le tour de jeu d'Anarchy. Franchir un écart est donc une DURÉE. Le jeton reste sur sa bande, une pastille compte les tours restants, et il arrive tout seul à la fin de la ronde voulue ; un écart à une seule Narration se franchit dans le tour courant, donc tout de suite. Un tap sur la pastille fait arriver sans attendre — c'est là que se dépense le point d'Anarchy dont le livre dit qu'il accélère le franchissement, et c'est vous qui en décidez, l'app ne dépense rien d'elle-même. Repartir dans l'autre sens annule le franchissement engagé. Shadowrun 5 et 6 ne chiffrent pas l'écart : le déplacement y reste immédiat, à l'identique.",
    },
    {
      id: "wn-moteurs-cumulables", anchor: "nav-combat", tours: ["whatsnew"], since: "1.147.0", fallback: "center",
      title: "Une scène peut tourner sur plusieurs moteurs",
      body: "Le suivi traitait « combat », « poursuite » et « Matrice » comme un choix unique : ouvrir la Matrice effaçait la poursuite en cours, et une poursuite en Anarchy éteignait le combat. Or c'est l'inverse qui se joue à une table — un combat devient une course-poursuite pour la moitié de l'équipe, reste un combat pour l'autre, pendant qu'un decker est dans un serveur. Les trois tournent maintenant ensemble, chacun avec sa surface, et l'effectif marque d'un ⇉ ceux qui sont sur la piste, pour qu'un coup d'œil suffise à savoir qui joue quoi. L'entrée du menu suit : « ⚡︎ Scène Matrice » devient « ⚡︎ Fermer la Matrice » une fois allumée, exactement comme la poursuite. Rien à réapprendre : c'est le même geste, il ne détruit simplement plus ce qui tournait à côté.",
    },
    {
      id: "wn-ronde-unique", anchor: "nav-combat", tours: ["whatsnew"], since: "1.147.0", fallback: "center",
      title: "La poursuite et le combat n'ont plus qu'une ronde",
      body: "Les livres font payer le test de la ronde sur le tour du personnage — une action majeure en Shadowrun 6, une complexe en Shadowrun 5 : il n'y a donc qu'une ronde, et deux compteurs séparés ne pouvaient que diverger. C'est ce qui arrivait sans rien dire : passer les tours jusqu'à ce que l'ordre boucle changeait la ronde de combat pendant que la piste restait en arrière, avec ses tests déjà posés, ses actions déjà payées et ses flèches de tendance périmées. La piste suit maintenant le combat, son « Round suivant » laisse la place à une mention — on avance à un seul endroit — et une poursuite ouverte au 3ᵉ round commence au 3ᵉ, pas au 1ᵉʳ. Seule exception, et elle est écrite au livre : la filature, dont les phases durent une minute là où une ronde en dure trois secondes, garde son propre compteur.",
    },
    {
      id: "wn-manoeuvres-poursuite", anchor: "nav-combat", tours: ["whatsnew"], since: "1.147.0", fallback: "center",
      title: "Les manœuvres de poursuite se déclenchent enfin",
      body: "En Shadowrun 5, le livre n'impose pas de test par round : la poursuite EST le choix de quatre manœuvres. Elles étaient affichées en petits caractères gris au bas du panneau, sans prix, sans règle et sans moyen de les jouer. Cascade, Couper la route, Percuter et Rattraper sont maintenant des boutons sur la fiche du participant, avec leur coût, et elles débitent son budget d'actions. Leur portée redevient une règle : Percuter et Couper la route se ternissent hors de portée courte en disant pourquoi — ternies et non retirées, parce que le livre écrit une condition, pas une interdiction, et que vous voyez une situation que l'app ne voit pas. En Shadowrun 6, c'est le test de course à pied qui prend son nom : le livre demande « une action majeure Sprinter », l'app jouait une majeure anonyme, elle joue désormais l'action — avec ses interdictions, dont celle qui refuse le sprint à un personnage Électrocuté.",
    },
    {
      id: "wn-scene-au-centre", anchor: "nav-combat", tours: ["whatsnew"], since: "1.146.0", fallback: "center",
      title: "La scène qui tourne prend le centre",
      body: "Une course-poursuite ouverte recevait la colonne la plus étroite du suivi de combat — 300 px, quand la console d'un seul combattant en prenait 511 — et elle ne grandissait sur aucun écran. Le moteur qui fait avancer la scène passe à 771 px, jusqu'à 869 en Anarchy où le livre ne fait pas tourner l'initiative et laisse la piste seule maîtresse ; une scène Matrice, elle, passe de 320 à 831. Le combat ne disparaît pas pour autant : Shadowrun 5 et 6 font tourner l'initiative pendant la poursuite, il garde donc sa colonne. Sa console, en revanche, se replie en un bandeau d'une ligne — qui agit, son initiative, son malus, ses jetons d'action — avec un ⛶ pour rouvrir la fiche entière quand un coup part vraiment. Et deux des cinq bandes de distance, « Longue » et « Extrême », qui étaient purement inatteignables sur un écran de portable, se lisent enfin.",
    },
    {
      id: "wn-poursuite-paie-action", anchor: "nav-combat", tours: ["whatsnew"], since: "1.146.0", fallback: "center",
      title: "Le test de poursuite paie son action",
      body: "Le prix du test de la ronde était écrit au pied de la piste depuis toujours — « 1 majeure » en Shadowrun 6, « 1 action » en Anarchy 2.0 — et ne débitait rien : le compteur d'actions vivait dans une colonne, la piste dans une autre, et c'est vous qui deviez vous rappeler que le pilote avait brûlé sa majeure pour rester en course. Le ⚄ débite maintenant le budget du tour, une seule fois par ronde, et vous voyez le jeton s'éteindre au moment où le test part. Quand plusieurs partagent un véhicule, c'est le conducteur qui paie — pas la voiture, pas les passagers. Corriger un ✓ en ✗ ne repasse pas à la caisse. Si le budget est épuisé, l'app le signale sans vous refuser le dé. Shadowrun 5 et Anarchy 1re ne débitent rien : leurs livres n'imposent pas de test par ronde, et l'app ne leur en invente pas.",
    },
    {
      id: "wn-matrice-colonne", anchor: "nav-combat", tours: ["whatsnew"], since: "1.146.0", fallback: "center",
      title: "La Matrice a enfin une surface",
      body: "Quand le decker infiltre pendant que les autres négocient, le panneau d'intrusion ne vivait que dans un tiroir ou dans une colonne réservée aux écrans d'au moins 1100 px : sur un portable ou une tablette, une scène Matrice n'affichait rien de la Matrice. Le panneau s'installe désormais dans la colonne principale, que la liste d'initiative lui laisse libre — elle y restait affichée avec ses scores, dans une scène que l'app déclare pourtant sans initiative. Et l'impasse est levée : le bouton donnant accès à la liste des serveurs y était masqué, si bien que sans serveur déjà lié, la scène ne menait nulle part. Un « Lier un serveur » est proposé tant qu'aucun ne l'est.",
    },
    {
      id: "wn-moniteur-clavier", anchor: "nav-combat", tours: ["whatsnew"], since: "1.145.0", fallback: "center",
      title: "Le moniteur se coche au clavier",
      body: "Cocher une case de dégâts est le geste le plus fréquent d'une scène, et c'était le seul entièrement hors d'atteinte : les cases étaient des carrés muets, invisibles au clavier comme au lecteur d'écran — 85 sur une scène ordinaire. Chaque case s'annonce maintenant pour ce qu'elle est (« Case 3 sur 10 — physique, palier de malus », ou « Blessure grave 1 sur 1 » en Anarchy 2.0), et un moniteur ne coûte qu'UNE seule tabulation : les flèches ← → circulent dedans, Espace coche. Traverser une fiche ne demande donc pas 85 pressions de Tab. Les quatre éditions en profitent, chacune avec son vocabulaire — l'échelle de Shadowrun et les crans nommés d'Anarchy 2.0 ne s'annoncent pas pareil, parce que les livres ne les décrivent pas pareil.",
    },
    {
      id: "wn-avantage-achete-a2", anchor: "nav-combat", tours: ["whatsnew"], since: "1.144.0", fallback: "center",
      title: "Anarchy 2.0 : l'avantage qui se paie",
      body: "Le panneau de risque savait poser un avantage (4-6 = succès), mais toujours gratuitement — or le livre en vend un : « Obtenir un avantage (ou annuler un désavantage) : 1 point d'Anarchy, déclaré avant de lancer les dés » (p. 77). Une ligne « Payer · Points d'Anarchy −1 » apparaît maintenant sous le sélecteur dès que vous choisissez Avantage, avec le solde restant ; le point part au lancer, pas au tap, pour que vous puissiez encore changer d'avis, et le journal garde trace de la dépense. Le paiement reste facultatif : le livre accorde aussi des avantages gratuits (p. 67, se défendre uniquement en donne un), et vous seul savez lequel s'applique. Détail utile : la ligne ne s'affiche que pour un combattant qui a des points d'Anarchy — c'est la distinction du livre entre premier rôle et figurant, obtenue sans une case de plus à cocher.",
    },
    {
      id: "wn-chance-preroll-a1", anchor: "nav-combat", tours: ["whatsnew"], since: "1.143.0", fallback: "center",
      title: "Anarchy 1re : la Chance se dépense avant le jet",
      body: "Le livre décrit deux ressources pré-jet sur la même page (p. 152) — les Points d'Anarchy, pris sur votre réserve de meneur, et la Chance, prise sur la fiche du personnage : « en dépensant un point de Chance avant de lancer les dés, chaque dé est un succès sur un résultat de 4, 5 ou 6 ». L'app n'en connaissait qu'une ; la Chance n'existait qu'en relance, après le jet. Le panneau d'avant-jet propose maintenant les deux, et vous pouvez cocher les deux sur un même test : le bandeau annonce vos deux budgets, le bouton dit ce qu'il va dépenser, et chaque ressource est débitée au bon endroit — ou aucune si l'une manque. Shadowrun 5 reste à une seule dépense par test, comme son livre l'impose.",
    },
    {
      id: "wn-etat-surpris", anchor: "nav-combat", tours: ["whatsnew"], since: "1.140.0", fallback: "center",
      title: "L'embuscade a enfin son état",
      body: "Surpris était le seul début de combat que l'app ne savait pas noter : vous teniez de tête qui ne joue pas le premier round. L'état rejoint l'accès direct en SR6, avec la règle du livre — le personnage prend son rang d'initiative mais n'agit pas de son propre chef pendant le premier round, ne dépense pas d'Atout, se défend et encaisse normalement, et l'état s'éteint tout seul au changement de round. Rien n'est grisé sur sa feuille d'actions, et c'est voulu : le livre n'interdit aucune action nommée, il dit « ne peut pas agir » avec des exceptions — un rappel s'affiche en tête et vous tranchez, comme pour Figé ou Paniqué. Le test qui détermine la surprise (Réaction + Intuition, seuil 3) est écrit sur la pastille mais reste à votre table.",
    },
    {
      id: "wn-run-clos", anchor: "nav-play", tours: ["whatsnew"], since: "1.140.0", fallback: "center",
      title: "Un run se termine enfin",
      body: "La timeline savait ouvrir un run, jamais le fermer : le débrief racontait la fin sans la marquer, si bien que l'index affichait un run joué il y a six mois exactement comme celui de ce soir. Faire le débrief clôt désormais le run, qui prend la mention ✓ Clos et s'éteint dans la liste — aucun geste neuf à apprendre, la clôture suit celui que vous faisiez déjà, au moment où vous le faisiez. Deux garde-fous : un débrief vide ne clôt rien, ouvrir la modale par curiosité ne termine pas votre run ; et clore est réversible, le message de confirmation propose « Rouvrir » d'un clic.",
    },
    {
      id: "wn-creatures-vf", anchor: "nav-generator", tours: ["whatsnew"], since: "1.140.0", fallback: "center",
      title: "Les créatures reprennent leur nom français",
      body: "Le catalogue de créatures SR6 avait été bâti sur l'édition anglaise, avec des noms traduits au jugé : ne cherchez plus « Jackalope » ni « Glouton majeur », votre livre les appelle Lièvre cornu et Carcajou géant. Quatre-vingt-seize créatures changent de nom — Ours chuteur devient Drop bear, Martichoras devient Manticore, Coloniste devient Blatte régente — et dix-neuf statblocs faux retrouvent les chiffres du livre : l'Ours cornu jouait avec un Seuil de défense de 6 au lieu de 23. Vos fiches déjà rangées gardent leur ancien nom, volontairement : ce sont vos fiches, et les renommer casserait les dossiers et les mentions de journal qui les citent.",
    },
    {
      id: "wn-lancer-embarque-casting", anchor: "nav-play", tours: ["whatsnew"], since: "1.150.0", fallback: "center",
      title: "« Lancer la scène » embarque le casting",
      body: "Un run avec six personnages convoqués ouvrait un suivi de combat vide : le casting était préparé, pas en scène, et il fallait envoyer chaque puce une par une. Quand la scène s'ouvre vide et qu'un casting est convoqué — sur le run ou hérité de la campagne, factions dépliées — l'app propose de l'embarquer : PNJ et PJ en scène, le serveur mis en jeu s'il est le seul, les contacts laissés à leur place. Tout ou rien ; le panneau « Ajouter » du suivi reste là pour trier finement, et rien n'est demandé si la scène a déjà du monde.",
    },
    {
      id: "wn-degats-depuis-la-file", anchor: "nav-combat", tours: ["whatsnew"], since: "1.150.0", fallback: "center",
      title: "Les dégâts se posent depuis n'importe quelle ligne",
      body: "Le ✸ Dégâts ne vivait que dans la console Réagir, donc seulement quand un PJ agissait : une grenade au tour d'un PNJ, un incendie, un tir ami n'avaient aucun geste. Chaque ligne de l'effectif porte maintenant ✸ Dégâts — au menu ⋯ d'une ligne en attente, dans la barre d'actions du combattant actif, sur la ligne narrative d'Anarchy — avec les mêmes puces que Réagir. La jauge de vie passe à 6 px et montre ses crans : elle dit combien il reste, pas seulement « à peu près ». Et lancer l'initiative nomme les PJ dont il attend le score, le premier champ reçoit le focus.",
    },
  ],
};

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.TourSteps = TourSteps;
