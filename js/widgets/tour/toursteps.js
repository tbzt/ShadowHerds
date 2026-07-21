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
      body: "Un decker gagne une section « Matrice » ⚡ (deck, moniteur, cible) juste après Combat. Un personnage magique gagne une section « Magie » ✦ (tradition, esprit mentor, pouvoirs d'adepte). Invisibles si le PNJ n'est pas concerné.",
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
      body: "Le module Matrice ⚡ d'un technomancien (SR5/SR6) affiche désormais son persona incarné : Attaque, Corruption, Traitement de données, Firewall, calculés depuis ses attributs mentaux et sa Résonance. En SR6, un bouton de reconfiguration répartit le pool de points bonus entre les 4 attributs. Les dommages matriciels encaissés rejoignent le moniteur étourdissant, comme au livre.",
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
      title: "Dépenser son Edge avant le jet (SR5/SR6)",
      body: "À activer dans Paramètres › Lanceur de dés. Une fois activé, lancer depuis une carte SR5/SR6 avec de l'Edge dépensable ouvre un panneau : « Repousser les limites » (SR5, ignore la Limite), « Prendre un risque » ou « Ajouter son rang d'Atout » (SR6, dés explosifs) — sinon « Lancer sans Edge ». L'Edge du personnage est débité. Le tap reste un lancer immédiat quand il n'y a pas d'Edge à dépenser.",
    },
    {
      id: "wn-preroll-edge-pill", anchor: "nav-settings", tours: ["whatsnew"], since: "1.53.0", fallback: "center",
      title: "Edge avant le jet : pastille",
      body: "Nouveau 3ᵉ choix dans Paramètres › Lanceur de dés (« Pastille sur la carte »). Au lieu d'un panneau qui s'ouvre à chaque jet, une petite pastille « Edge » distincte apparaît à côté des jets où le personnage peut dépenser de l'Edge/Atout (Défense, Encaissement, Drain, armes). Le tap normal reste un lancer immédiat ; toucher « Edge » ouvre le petit choix (Repousser les limites / Prendre un risque / Ajouter son rang d'Atout selon l'édition) avant de lancer.",
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
      id: "wn-drag-to-folder", anchor: "nav-shadows", tours: ["whatsnew"], since: "1.63.0", fallback: "center",
      title: "Glissez une carte dans un dossier",
      body: "En mode « Sélectionner », tirez une fiche vers la gauche (souris ou doigt) : un rail de dossiers apparaît. Survolez-en un pour déplier ses sous-groupes, lâchez sur le bon pour y ranger la fiche. Si des fiches sont cochées et que vous tirez l'une d'elles, tout le lot suit. C'est le pendant gestuel du bouton « Déplacer vers » de la barre de sélection.",
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
      body: "Le run que vous jouez est désormais sorti en tête de « Jouer » et rassemble tout pour la séance : la scène vivante (round, moteur ⚔/⚡, barre de vie par combattant, sans ouvrir le tracker), la présence de chaque participant (un tap : RV ou astral, selon sa capacité — RA par défaut), l'horloge d'intrusion quand un serveur est en jeu (alerte, tour, CI), le topos condensé (objectif, complication, mandant, lieu, paie), le casting préparé (tap pour consulter, ⚔ pour envoyer un PNJ en scène, ⚡ pour mettre un serveur en jeu) et un accès direct à votre carnet de notes. Vos autres runs restent listés en dessous.",
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
      body: "Quand aucun run n'existe encore, « Jouer » n'affiche plus « Rien à jouer » : un bouton « ＋ Créer mon premier run » demande un nom, crée le run et le met aussitôt en contexte — dès lors, tout ce que vous rangez ou générez s'y range. Et promouvoir un topos en run le focalise directement, en proposant d'un clic de générer le casting d'opposition.",
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
  ],
};

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.TourSteps = TourSteps;
