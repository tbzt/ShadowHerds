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
  ],
};
