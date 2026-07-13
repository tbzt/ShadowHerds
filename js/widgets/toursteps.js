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
  ],
};
