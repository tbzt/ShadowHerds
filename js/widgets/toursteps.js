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
const TourSteps = {
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
      body: "Des serveurs prêts à hacker, avec CI et pilotage d'intrusion. Le decker n'attend plus que vous improvisiez ses hôtes.",
    },
    {
      id: "run", anchor: "nav-run", tours: ["full"], since: "1.0.0", fallback: "center",
      title: "Run",
      body: "Une ébauche de mission en un clic : mandant, lieu, complication, objectif, paiement. L'amorce quand les joueurs partent où vous ne l'aviez pas prévu.",
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
      body: "Un dossier peut être marqué « Campagne » ou « Run » depuis le menu « ⋯ » de la barre de dossiers — automatique quand vous « Rangez la run ». Une run pointe vers sa prep générée, une campagne compte ses runs.",
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
  ],
};
