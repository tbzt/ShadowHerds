"use strict";

/* ============================================================
   SR5 — ACCESSOIRES D'ARMES, relevé du 2026-09-10
   ------------------------------------------------------------
   18 accessoires, table à quatre colonnes (accessoire, monture,
   disponibilité, coût) — Livre de Règles p.435.

   ⚠ Lu par les POSITIONS X des colonnes, pas au flux texte : une cellule vide
   décale tout le reste de la ligne si on découpe aux espaces. Les bornes
   viennent des en-têtes eux-mêmes.

   ⚠ La table s'arrête quand une « ligne » cesse d'en être une : un nom qui
   commence en MINUSCULE ou dépasse 45 signes est de la prose descriptive, qui
   suit la table et en remplit les colonnes de gravats. Sans cette borne, le
   relevé rendait 47 « accessoires » dont 29 étaient des morceaux de phrases.

   ⚠ La MONTURE déborde parfois dans la colonne du nom (« Système smartgun,
   externe Dessus | ou dessous ») : elle est recollée.

   ⚠ `cout: null` n'est pas une donnée manquante : le livre y écrit une
   FORMULE (« Coût de l'arme × 2 » pour le smartgun interne), conservée telle
   quelle dans `coutNote`. Ne pas la remplacer par un nombre inventé.

   La MONTURE est la règle à ne pas aplatir : deux accessoires qui occupent le
   même point de fixation ne se cumulent pas. « — » signifie qu'il n'occupe
   aucune monture et se cumule librement.
   ============================================================ */

export const AccessoiresSR5 = [
  { id: "bipied", nom: "Bipied", monture: "Dessous", dispo: "2", cout: 200, source: "Livre de Règles p.435" },
  { id: "chargeur_rapide", nom: "Chargeur rapide", monture: "—", dispo: "2", cout: 25, source: "Livre de Règles p.435" },
  { id: "chargeur_supplementaire", nom: "Chargeur supplémentaire", monture: "—", dispo: "4", cout: 5, source: "Livre de Règles p.435" },
  { id: "etui_de_bras_dissimule", nom: "Étui de bras dissimulé", monture: "—", dispo: "4R", cout: 350, source: "Livre de Règles p.435" },
  { id: "gyrostabilisateur", nom: "Gyrostabilisateur", monture: "Dessous", dispo: "7", cout: 1400, source: "Livre de Règles p.435" },
  { id: "holster_dissimulable", nom: "Holster dissimulable", monture: "—", dispo: "2", cout: 150, source: "Livre de Règles p.435" },
  { id: "holster_rapide", nom: "Holster rapide", monture: "—", dispo: "4", cout: 175, source: "Livre de Règles p.435" },
  { id: "lunette_de_visee", nom: "Lunette de visée", monture: "Dessus", dispo: "2", cout: 300, source: "Livre de Règles p.435" },
  { id: "periscope", nom: "Périscope", monture: "Dessus", dispo: "3", cout: 70, source: "Livre de Règles p.435" },
  { id: "plateforme_de_tir_intelligente", nom: "Plateforme de tir intelligente", monture: "Dessous", dispo: "12P", cout: 2500, source: "Livre de Règles p.435" },
  { id: "programmateur_d_explosion_en_vol", nom: "Programmateur d’explosion en vol", monture: "—", dispo: "6R", cout: 600, source: "Livre de Règles p.435" },
  { id: "rembourrage_antichocs", nom: "Rembourrage antichocs", monture: "—", dispo: "2", cout: 50, source: "Livre de Règles p.435" },
  { id: "silencieux_attenuateur_de_son", nom: "Silencieux / Atténuateur de son", monture: "Canon", dispo: "9P", cout: 500, source: "Livre de Règles p.435" },
  { id: "smartgun_interne", nom: "Smartgun, interne", monture: "—", dispo: "(+2)R", cout: null, coutNote: "l’arme doublé", source: "Livre de Règles p.435" },
  { id: "smartgun_externe", nom: "Smartgun, externe", monture: "Dessus ou Dessous", dispo: "4R", cout: 200, source: "Livre de Règles p.435" },
  { id: "systeme_pneumatique_indice_1_3", nom: "Système pneumatique (indice 1–3)", monture: "Canon", dispo: "(indice × 3)R", cout: 200, source: "Livre de Règles p.435" },
  { id: "trepied", nom: "Trépied", monture: "Dessous", dispo: "4", cout: 500, source: "Livre de Règles p.435" },
  { id: "visee_laser", nom: "Visée laser", monture: "Dessus ou Dessous", dispo: "2", cout: 125, source: "Livre de Règles p.435" },
];
