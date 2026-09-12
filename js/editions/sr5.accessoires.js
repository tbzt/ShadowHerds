"use strict";

/* ============================================================
   SR5 — ACCESSOIRES ET MODIFICATIONS D'ARMES, relevé du 2026-09-12
   ------------------------------------------------------------
   La table « Accessoires pour armes à feu » de Run & Gun (VF, p.71-72) — 53
   lignes, vérifiées contre l'annexe du livre —, plus les deux entrées du
   Livre de Règles p.435 qu'elle ne reprend pas (chargeurs). Généré par
   REFERENCE/accessoires-armes/genere_js.py — régénérer, ne pas retoucher.

   ⚠ SIX EMPLACEMENTS (Run & Gun p.68) : Dessus, Dessous (sous le canon),
   Canon, Côté, Interne, Crosse. « Chaque emplacement ne peut accueillir
   qu'un accessoire ou qu'une modification. » `montures` est la LISTE des
   emplacements qu'un objet accepte — il n'en occupe qu'UN, au choix ; `[]`
   = aucun (cumul libre) ; « * » = tous. C'est cette liste que le résolveur
   de conflits lit ; `monture` n'est que l'affichage.

   ⚠ `type` : « accessoire » (se pose en cinq minutes), « modification »
   (test étendu d'Armurerie + Logique, p.68), « option » (un complément d'un
   autre objet — Verrou d'un cran de sûreté, profils d'un Safe Target — sans
   emplacement propre, coût ADDITIONNEL).

   ⚠ Toutes les armes n'ont pas tous les emplacements : Run & Gun p.69 en
   donne la table par arme. L'app ne la porte PAS encore — le résolveur
   suppose les six disponibles, et le dit.

   ⚠ `cout: null` = une formule au livre (« Niveau × 1 500 ¥ », « comme
   commlink + 200 ¥ », « coût de l'arme doublé »), gardée dans `coutNote`.
   ============================================================ */

export const AccessoiresSR5 = [
  { id: "adaptation_pour_environnement_extreme", nom: "Adaptation pour environnement extrême", type: "modification", monture: "—", montures: [], dispo: "8", cout: null, coutNote: "Niveau × 1 500 ¥", source: "Run & Gun p.71-72" },
  { id: "baionnette", nom: "Baïonnette", type: "accessoire", monture: "Dessus / Dessous", montures: ["Dessus", "Dessous"], dispo: "4R", cout: 50, source: "Run & Gun p.71-72" },
  { id: "bandouliere", nom: "Bandoulière", type: "accessoire", monture: "—", montures: [], dispo: "—", cout: 15, source: "Run & Gun p.71-72" },
  { id: "batteries_a_impulsion_chargeur_energetique", nom: "Batteries à impulsion — Chargeur énergétique", type: "accessoire", monture: "—", montures: [], dispo: "14P", cout: 400, source: "Run & Gun p.71-72" },
  { id: "batteries_a_impulsion_sac_energetique", nom: "Batteries à impulsion — Sac énergétique", type: "accessoire", monture: "—", montures: [], dispo: "16P", cout: 900, source: "Run & Gun p.71-72" },
  { id: "batteries_a_impulsion_sac_a_dos_energetique", nom: "Batteries à impulsion — Sac à dos énergétique", type: "accessoire", monture: "—", montures: [], dispo: "20P", cout: 2500, source: "Run & Gun p.71-72" },
  { id: "bipied", nom: "Bipied", type: "accessoire", monture: "Dessous", montures: ["Dessous"], dispo: "2", cout: 200, source: "Run & Gun p.71-72 ; Livre de Règles p.435" },
  { id: "commlink_d_arme", nom: "Commlink d’arme", type: "accessoire", monture: "Crosse / Interne", montures: ["Crosse", "Interne"], dispo: "comme commlink", cout: null, coutNote: "comme commlink + 200 ¥", source: "Run & Gun p.71-72" },
  { id: "cran_de_surete_ameliore", nom: "Cran de sûreté amélioré", type: "modification", monture: "Interne", montures: ["Interne"], dispo: "4", cout: 600, source: "Run & Gun p.71-72" },
  { id: "cran_de_surete_ameliore_verrou", nom: "Cran de sûreté amélioré — Verrou", type: "option", monture: "—", montures: [], dispo: "6", cout: 100, supplement: true, note: "option de « Cran de sûreté amélioré »", source: "Run & Gun p.71-72" },
  { id: "cran_de_surete_ameliore_autodestruction", nom: "Cran de sûreté amélioré — Autodestruction", type: "option", monture: "—", montures: [], dispo: "6", cout: 200, supplement: true, note: "option de « Cran de sûreté amélioré »", source: "Run & Gun p.71-72" },
  { id: "cran_de_surete_ameliore_autodestruction_explosive", nom: "Cran de sûreté amélioré — Autodestruction explosive", type: "option", monture: "—", montures: [], dispo: "11P", cout: 400, supplement: true, note: "option de « Cran de sûreté amélioré »", source: "Run & Gun p.71-72" },
  { id: "cran_de_surete_ameliore_electrocuteur", nom: "Cran de sûreté amélioré — Électrocuteur", type: "option", monture: "—", montures: [], dispo: "6R", cout: 350, supplement: true, note: "option de « Cran de sûreté amélioré »", source: "Run & Gun p.71-72" },
  { id: "crosse_adhesive", nom: "Crosse adhésive", type: "modification", monture: "Crosse", montures: ["Crosse"], dispo: "6", cout: 100, note: "peut être installée sur toute arme, même sans emplacement de crosse", source: "Run & Gun p.71-72" },
  { id: "crosse_pliable", nom: "Crosse pliable", type: "modification", monture: "Crosse", montures: ["Crosse"], dispo: "2", cout: 30, source: "Run & Gun p.71-72" },
  { id: "etui_de_bras_dissimule", nom: "Étui de bras dissimulé", type: "accessoire", monture: "—", montures: [], dispo: "4R", cout: 350, source: "Run & Gun p.71-72 ; Livre de Règles p.435" },
  { id: "guncam", nom: "Guncam", type: "accessoire", monture: "Dessus / Canon / Côté / Interne / Dessous", montures: ["Dessus", "Canon", "Côté", "Interne", "Dessous"], dispo: "4", cout: 350, source: "Run & Gun p.71-72" },
  { id: "gyrostabilisateur", nom: "Gyrostabilisateur", type: "accessoire", monture: "Dessous", montures: ["Dessous"], dispo: "7", cout: 1400, source: "Run & Gun p.71-72 ; Livre de Règles p.435" },
  { id: "holster_dissimulable", nom: "Holster dissimulable", type: "accessoire", monture: "—", montures: [], dispo: "2", cout: 150, source: "Run & Gun p.71-72 ; Livre de Règles p.435" },
  { id: "holster_rapide", nom: "Holster rapide", type: "accessoire", monture: "—", montures: [], dispo: "4", cout: 175, source: "Run & Gun p.71-72 ; Livre de Règles p.435" },
  { id: "holster_rapide_2", nom: "Holster rapide dissimulable", type: "accessoire", monture: "—", montures: [], dispo: "6", cout: 275, source: "Run & Gun p.71-72 ; Livre de Règles p.435" },
  { id: "lampe_torche_standard", nom: "Lampe torche — Standard", type: "accessoire", monture: "Dessus / Côté / Dessous", montures: ["Dessus", "Côté", "Dessous"], dispo: "2", cout: 50, source: "Run & Gun p.71-72" },
  { id: "lampe_torche_vision_nocturne", nom: "Lampe torche — Vision nocturne", type: "accessoire", monture: "Dessus / Côté / Dessous", montures: ["Dessus", "Côté", "Dessous"], dispo: "4", cout: 200, source: "Run & Gun p.71-72" },
  { id: "lampe_torche_vision_thermographique", nom: "Lampe torche — Vision thermographique", type: "accessoire", monture: "Dessus / Côté / Dessous", montures: ["Dessus", "Côté", "Dessous"], dispo: "6", cout: 400, source: "Run & Gun p.71-72" },
  { id: "lance_bolas_sous_le_canon", nom: "Lance-bolas sous le canon", type: "modification", monture: "Dessous", montures: ["Dessous"], dispo: "8R", cout: 350, source: "Run & Gun p.71-72" },
  { id: "lance_flammes_sous_le_canon", nom: "Lance-flammes sous le canon", type: "modification", monture: "Dessous", montures: ["Dessous"], dispo: "comme lance- flammes + 2", cout: null, coutNote: "comme lance- flammes + 200 ¥", source: "Run & Gun p.71-72" },
  { id: "lance_grappin_sous_le_canon", nom: "Lance-grappin sous le canon", type: "modification", monture: "Dessous", montures: ["Dessous"], dispo: "8R", cout: 600, source: "Run & Gun p.71-72" },
  { id: "lance_grenades_sous_le_canon", nom: "Lance-grenades sous le canon", type: "modification", monture: "Dessous", montures: ["Dessous"], dispo: "10P", cout: 3500, source: "Run & Gun p.71-72" },
  { id: "lest_de_canon", nom: "Lest de canon", type: "accessoire", monture: "Dessous", montures: ["Dessous"], dispo: "4R", cout: 50, source: "Run & Gun p.71-72" },
  { id: "lunette_de_visee", nom: "Lunette de visée", type: "accessoire", monture: "Dessus", montures: ["Dessus"], dispo: "2", cout: 300, source: "Run & Gun p.71-72 ; Livre de Règles p.435" },
  { id: "monture_a_glissiere", nom: "Monture à glissière", type: "accessoire", monture: "Dessus / Côté / Dessous", montures: ["Dessus", "Côté", "Dessous"], dispo: "4", cout: 500, source: "Run & Gun p.71-72" },
  { id: "periscope", nom: "Périscope", type: "accessoire", monture: "Dessus", montures: ["Dessus"], dispo: "3", cout: 70, source: "Run & Gun p.71-72 ; Livre de Règles p.435" },
  { id: "personnalite_d_arme", nom: "Personnalité d’arme", type: "accessoire", monture: "—", montures: [], dispo: "8", cout: 250, source: "Run & Gun p.71-72" },
  { id: "plateforme_de_tir_intelligente", nom: "Plateforme de tir intelligente", type: "accessoire", monture: "Dessous", montures: ["Dessous"], dispo: "12P", cout: 2500, source: "Run & Gun p.71-72 ; Livre de Règles p.435" },
  { id: "poignee_avant", nom: "Poignée avant", type: "accessoire", monture: "Canon / Dessous", montures: ["Canon", "Dessous"], dispo: "2", cout: 100, source: "Run & Gun p.71-72" },
  { id: "programmateur_d_explosion_en_vol", nom: "Programmateur d’explosion en vol", type: "accessoire", monture: "Dessus / Côté / Dessous", montures: ["Dessus", "Côté", "Dessous"], dispo: "6R", cout: 600, source: "Run & Gun p.71-72 ; Livre de Règles p.435" },
  { id: "rembourrage_antichocs", nom: "Rembourrage antichocs", type: "modification", monture: "Crosse", montures: ["Crosse"], dispo: "2", cout: 50, note: "peut être installée sur toute arme, même sans emplacement de crosse", source: "Run & Gun p.71-72 ; Livre de Règles p.435" },
  { id: "renfort_en_melee", nom: "Renfort en mêlée", type: "modification", monture: "—", montures: [], dispo: "4", cout: 300, source: "Run & Gun p.71-72" },
  { id: "silencieux_attenuateur_de_son", nom: "Silencieux / Atténuateur de sons", type: "accessoire", monture: "Canon", montures: ["Canon"], dispo: "9P", cout: 500, source: "Run & Gun p.71-72 ; Livre de Règles p.435" },
  { id: "smartgun_interne", nom: "Smartgun, interne", type: "accessoire", monture: "Interne", montures: ["Interne"], dispo: "+2R", cout: null, coutNote: "coût de l’arme doublé", source: "Run & Gun p.71-72 ; Livre de Règles p.435" },
  { id: "smartgun_externe", nom: "Smartgun, externe", type: "accessoire", monture: "Dessus / Dessous", montures: ["Dessus", "Dessous"], dispo: "4R", cout: 200, source: "Run & Gun p.71-72 ; Livre de Règles p.435" },
  { id: "support_de_hanche_rembourre", nom: "Support de hanche rembourré", type: "accessoire", monture: "Crosse", montures: ["Crosse"], dispo: "4", cout: 250, source: "Run & Gun p.71-72" },
  { id: "suppression_de_la_detente", nom: "Suppression de la détente", type: "modification", monture: "—", montures: [], dispo: "2", cout: 50, source: "Run & Gun p.71-72" },
  { id: "systeme_pneumatique_indice_1_3", nom: "Système pneumatique", type: "modification", monture: "Canon", montures: ["Canon"], dispo: "(indice × 3)R", cout: null, coutNote: "indice × 200 ¥", source: "Run & Gun p.71-72 ; Livre de Règles p.435" },
  { id: "systeme_safe_target_basique", nom: "Système Safe Target basique", type: "accessoire", monture: "Dessus / Dessous / Canon / Côté / Interne", montures: ["Dessus", "Dessous", "Canon", "Côté", "Interne"], dispo: "6", cout: 750, source: "Run & Gun p.71-72" },
  { id: "systeme_safe_target_basique_profils_rfid_gps_supplementaires_10_profils", nom: "Système Safe Target basique — Profils RFID / GPS supplémentaires (10 profils)", type: "option", monture: "—", montures: [], dispo: "6", cout: 25, note: "option de « Système Safe Target basique »", source: "Run & Gun p.71-72" },
  { id: "systeme_safe_target_basique_capacite_de_reconnaissance_d_images", nom: "Système Safe Target basique — Capacité de reconnaissance d’images", type: "option", monture: "—", montures: [], dispo: "8", cout: 300, supplement: true, note: "option de « Système Safe Target basique »", source: "Run & Gun p.71-72" },
  { id: "systeme_safe_target_basique_profils_d_images_supplementaires_10_profils", nom: "Système Safe Target basique — Profils d’images supplémentaires (10 profils)", type: "option", monture: "—", montures: [], dispo: "8", cout: 25, note: "option de « Système Safe Target basique »", source: "Run & Gun p.71-72" },
  { id: "telemetre_ameliore", nom: "Télémètre amélioré", type: "accessoire", monture: "toutes", montures: "*", dispo: "6", cout: 2000, source: "Run & Gun p.71-72" },
  { id: "traceur", nom: "Traceur", type: "accessoire", monture: "—", montures: [], dispo: "4", cout: 150, source: "Run & Gun p.71-72" },
  { id: "trepied", nom: "Trépied", type: "accessoire", monture: "Dessous", montures: ["Dessous"], dispo: "4", cout: 500, source: "Run & Gun p.71-72 ; Livre de Règles p.435" },
  { id: "tronconneuse_sous_le_canon", nom: "Tronçonneuse sous le canon", type: "modification", monture: "Dessous", montures: ["Dessous"], dispo: "10R", cout: null, coutNote: "comme tronçonneuse + 500 ¥", source: "Run & Gun p.71-72" },
  { id: "visee_laser", nom: "Visée laser", type: "accessoire", monture: "Dessus / Côté / Dessous", montures: ["Dessus", "Côté", "Dessous"], dispo: "2", cout: 125, source: "Run & Gun p.71-72 ; Livre de Règles p.435" },
  { id: "chargeur_rapide", nom: "Chargeur rapide", type: "accessoire", monture: "—", montures: [], dispo: "2", cout: 25, source: "Livre de Règles p.435" },
  { id: "chargeur_supplementaire", nom: "Chargeur supplémentaire", type: "accessoire", monture: "—", montures: [], dispo: "4", cout: 5, source: "Livre de Règles p.435" },
];
