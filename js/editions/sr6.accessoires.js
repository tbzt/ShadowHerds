"use strict";

/* ============================================================
   SR6 — ACCESSOIRES ET MODIFICATIONS D'ARMES, relevé du 2026-09-12
   ------------------------------------------------------------
   Les deux tables récapitulatives de Feu nourri (VF, p.150-151 imprimées) :
   42 accessoires — dont les 18 du Livre de base p.269-270, que la table
   reprend — et 37 modifications, chacune vérifiée contre les titres de son
   chapitre. Généré par REFERENCE/accessoires-armes/genere_js.py — régénérer,
   ne pas retoucher.

   ⚠ DEUX SYSTÈMES, PAS UN (Feu nourri p.41). Un ACCESSOIRE occupe une
   MONTURE de l'arme — Dessus, Dessous, Canon, Crosse ; « Libre » = n'importe
   laquelle — et se pose sans test. `montures` est la liste des montures
   acceptées, l'objet n'en occupe qu'une ; `[]` = aucune. Une MODIFICATION
   n'a pas de monture : elle consomme un EMPLACEMENT DE MODIFICATION du type
   d'arme (pistolets 3, mitraillettes 4, shotguns et fusils de précision 5,
   fusils d'assaut 6, corps à corps / arcs / tasers / exotiques 2, armes de
   jet 0 ; pistolets de poche : rien), après un test étendu d'Ingénierie
   (Armurerie) + Logique (4, 1 heure). Le smartgun INTERNE compte comme une
   modification (p.41). Une modification de série ne consomme rien.

   ⚠ `armes` dit sur quoi l'accessoire se pose (mêlée / trait-jet / feu) ;
   absent quand le livre laisse la case vide (smartguns).

   ⚠ `cout: null` = formule ou double prix au livre (« (Indice × 25) ¥ »,
   « 50 / 75 ¥ »), gardé dans `coutNote`. « Bricolée » n'est pas un achat :
   c'est un trait de l'arme.
   ============================================================ */

export const AccessoiresSR6 = [
  { id: "baionnette", nom: "Baïonnette", type: "accessoire", monture: "Dessus / Dessous", montures: ["Dessus", "Dessous"], armes: { melee: false, trait: false, feu: true }, dispo: "3 (I)", cout: 75, source: "Feu nourri p.54" },
  { id: "bandoulieres_standard_et_tactique", nom: "Bandoulières standard et tactique", type: "accessoire", monture: "—", montures: [], armes: { melee: false, trait: false, feu: true }, dispo: "3 /4 (L)", cout: null, coutNote: "50 / 75 ¥", source: "Feu nourri p.54" },
  { id: "bipied", nom: "Bipied", type: "accessoire", monture: "Dessous", montures: ["Dessous"], armes: { melee: false, trait: true, feu: true }, dispo: "1", cout: 200, source: "Livre de base p.269" },
  { id: "carquois_rapide", nom: "Carquois rapide", type: "accessoire", monture: "—", montures: [], armes: { melee: false, trait: true, feu: false }, dispo: "2", cout: 115, source: "Feu nourri p.55" },
  { id: "cartouchiere", nom: "Cartouchière", type: "accessoire", monture: "—", montures: [], armes: { melee: false, trait: false, feu: true }, dispo: "2 (L)", cout: 50, source: "Feu nourri p.55" },
  { id: "chargeur_grande_capacite", nom: "Chargeur grande capacité", type: "accessoire", monture: "—", montures: [], armes: { melee: false, trait: false, feu: true }, dispo: "4 (L)", cout: null, coutNote: "(Indice × 25) ¥", source: "Feu nourri p.55" },
  { id: "chargeur_rapide", nom: "Chargeur rapide", type: "accessoire", monture: "—", montures: [], armes: { melee: false, trait: false, feu: true }, dispo: "1", cout: 25, source: "Livre de base p.269" },
  { id: "chargeur_supplementaire", nom: "Chargeur supplémentaire", type: "accessoire", monture: "—", montures: [], armes: { melee: false, trait: false, feu: true }, dispo: "2", cout: 5, source: "Livre de base p.269" },
  { id: "compensateur_de_recul_pneumatique", nom: "Compensateur de recul pneumatique", type: "accessoire", monture: "Canon", montures: ["Canon"], armes: { melee: false, trait: false, feu: true }, dispo: "3", cout: 500, source: "Livre de base p.269" },
  { id: "etui_a_fusil_en_ruthenium", nom: "Étui à fusil en ruthénium", type: "accessoire", monture: "—", montures: [], armes: { melee: true, trait: false, feu: true }, dispo: "4", cout: 1000, source: "Feu nourri p.55" },
  { id: "etui_a_munitions", nom: "Étui à munitions", type: "accessoire", monture: "—", montures: [], armes: { melee: false, trait: false, feu: true }, dispo: "2 (L)", cout: 25, source: "Feu nourri p.56" },
  { id: "etui_de_bras_dissimule", nom: "Étui de bras dissimulé", type: "accessoire", monture: "—", montures: [], armes: { melee: false, trait: false, feu: true }, dispo: "2", cout: 350, source: "Livre de base p.269" },
  { id: "etui_rapide_pour_corps_a_corps", nom: "Étui rapide pour corps à corps", type: "accessoire", monture: "—", montures: [], armes: { melee: false, trait: false, feu: false }, dispo: "2", cout: 115, source: "Feu nourri p.56" },
  { id: "fourreau_ares_gunfighter", nom: "Fourreau Ares Gunfighter", type: "accessoire", monture: "—", montures: [], armes: { melee: true, trait: true, feu: true }, dispo: "5 (L)", cout: 450, source: "Feu nourri p.56" },
  { id: "fourreau_de_bras_dissimule", nom: "Fourreau de bras dissimulé", type: "accessoire", monture: "—", montures: [], armes: { melee: false, trait: true, feu: false }, dispo: "2", cout: 125, source: "Feu nourri p.57" },
  { id: "fourreau_dissimulable", nom: "Fourreau dissimulable", type: "accessoire", monture: "—", montures: [], armes: { melee: true, trait: false, feu: false }, dispo: "2", cout: 50, source: "Feu nourri p.57" },
  { id: "fourreau_rapide", nom: "Fourreau rapide", type: "accessoire", monture: "—", montures: [], armes: { melee: true, trait: false, feu: false }, dispo: "2", cout: 160, source: "Feu nourri p.57" },
  { id: "guncam", nom: "Guncam", type: "accessoire", monture: "toutes", montures: "*", armes: { melee: false, trait: true, feu: true }, dispo: "4 (L)", cout: 350, source: "Feu nourri p.57" },
  { id: "gyrostabilisateur", nom: "Gyrostabilisateur", type: "accessoire", monture: "Dessous", montures: ["Dessous"], armes: { melee: false, trait: false, feu: true }, dispo: "3", cout: 1400, source: "Livre de base p.269" },
  { id: "harnais_de_hanche", nom: "Harnais de hanche", type: "accessoire", monture: "Crosse", montures: ["Crosse"], armes: { melee: false, trait: false, feu: true }, dispo: "2", cout: 180, source: "Feu nourri p.58" },
  { id: "holster_blinde", nom: "Holster blindé", type: "accessoire", monture: "—", montures: [], armes: { melee: false, trait: false, feu: true }, dispo: "3 (L)", cout: 250, source: "Feu nourri p.58" },
  { id: "holster_dissimulable", nom: "Holster dissimulable", type: "accessoire", monture: "—", montures: [], armes: { melee: false, trait: false, feu: true }, dispo: "1", cout: 150, source: "Livre de base p.269" },
  { id: "holster_rapide", nom: "Holster rapide", type: "accessoire", monture: "—", montures: [], armes: { melee: false, trait: false, feu: true }, dispo: "2", cout: 175, source: "Livre de base p.269" },
  { id: "holster_rapide_2", nom: "Holster rapide dissimulable", type: "accessoire", monture: "—", montures: [], armes: { melee: false, trait: false, feu: true }, dispo: "2 (L)", cout: 70, source: "Feu nourri p.58" },
  { id: "lampe_torche_nocturne", nom: "Lampe-torche, nocturne", type: "accessoire", monture: "toutes", montures: "*", armes: { melee: false, trait: true, feu: true }, dispo: "1", cout: 100, source: "Feu nourri p.59" },
  { id: "lampe_torche_thermographique", nom: "Lampe-torche, thermographique", type: "accessoire", monture: "toutes", montures: "*", armes: { melee: false, trait: true, feu: true }, dispo: "1", cout: 100, source: "Feu nourri p.59" },
  { id: "lunette_de_visee", nom: "Lunette de visée", type: "accessoire", monture: "Dessus", montures: ["Dessus"], armes: { melee: false, trait: true, feu: true }, dispo: "1", cout: 350, source: "Livre de base p.269" },
  { id: "pisto_gantelets_crackshot_arms_regulator", nom: "\"Pisto-gantelets\" Crackshot Arms Regulator", type: "accessoire", monture: "—", montures: [], armes: { melee: false, trait: false, feu: true }, dispo: "3 (L)", cout: 850, source: "Feu nourri p.60" },
  { id: "periscope", nom: "Périscope", type: "accessoire", monture: "Dessus", montures: ["Dessus"], armes: { melee: false, trait: true, feu: true }, dispo: "2", cout: 70, source: "Livre de base p.270" },
  { id: "plaques_de_blindage_pour_mitrailleuse", nom: "Plaques de blindage pour mitrailleuse", type: "accessoire", monture: "Dessus / Dessous", montures: ["Dessus", "Dessous"], armes: { melee: false, trait: false, feu: false }, dispo: "4 (I)", cout: null, coutNote: "250 ¥ / 350 ¥", source: "Feu nourri p.60" },
  { id: "plateforme_de_tir_intelligente", nom: "Plateforme de tir intelligente", type: "accessoire", monture: "Dessous", montures: ["Dessous"], armes: { melee: false, trait: false, feu: true }, dispo: "5", cout: 2500, source: "Livre de base p.270" },
  { id: "programmateur_d_explosion_en_vol", nom: "Programmateur d’explosion en vol", type: "accessoire", monture: "—", montures: [], armes: { melee: false, trait: false, feu: true }, dispo: "3", cout: 600, source: "Livre de base p.270" },
  { id: "rembourrage_antichoc", nom: "Rembourrage antichoc", type: "accessoire", monture: "—", montures: [], armes: { melee: false, trait: false, feu: true }, dispo: "2", cout: 50, source: "Livre de base p.270" },
  { id: "silencieux", nom: "Silencieux", type: "accessoire", monture: "Canon", montures: ["Canon"], armes: { melee: false, trait: false, feu: true }, dispo: "4", cout: 500, source: "Livre de base p.270" },
  { id: "systeme_smartgun_externe", nom: "Smartgun (externe)", type: "accessoire", monture: "Dessus / Dessous", montures: ["Dessus", "Dessous"], dispo: "2 (L)", cout: 200, source: "Livre de base p.270" },
  { id: "systeme_smartgun_interne", nom: "Smartgun (interne)", type: "accessoire", monture: "—", montures: [], dispo: "1 (L)", cout: 500, supplement: true, emplacements: 1, note: "compte comme une modification pour les emplacements (Feu nourri p.41)", source: "Livre de base p.270" },
  { id: "trepied", nom: "Trépied", type: "accessoire", monture: "Dessous", montures: ["Dessous"], armes: { melee: false, trait: false, feu: true }, dispo: "2", cout: 500, source: "Feu nourri p.270," },
  { id: "visee_laser", nom: "Visée laser, standard", type: "accessoire", monture: "Dessus / Dessous", montures: ["Dessus", "Dessous"], armes: { melee: false, trait: true, feu: true }, dispo: "1", cout: 125, source: "Livre de base p.270" },
  { id: "visee_laser_basse_puissance", nom: "Visée laser, basse puissance", type: "accessoire", monture: "Dessus / Dessous", montures: ["Dessus", "Dessous"], armes: { melee: false, trait: true, feu: true }, dispo: "1", cout: 80, source: "Feu nourri p.61" },
  { id: "visee_laser_haute_puissance", nom: "Visée laser, haute puissance", type: "accessoire", monture: "Dessus / Dessous", montures: ["Dessus", "Dessous"], armes: { melee: false, trait: true, feu: true }, dispo: "1", cout: 200, source: "Feu nourri p.61" },
  { id: "systeme_de_visee_ranger_arms_eagle_eye", nom: "Système de visée Ranger Arms « Eagle Eye »", type: "accessoire", monture: "toutes", montures: "*", armes: { melee: false, trait: true, feu: true }, dispo: "5 (L)", cout: 550, source: "Feu nourri p.60" },
  { id: "tambour_amovible", nom: "Tambour amovible", type: "accessoire", monture: "Canon / Dessous", montures: ["Canon", "Dessous"], armes: { melee: false, trait: false, feu: true }, dispo: "3 (I)", cout: 75, source: "Feu nourri p.61" },
  { id: "poignee", nom: "Poignée", type: "modification", monture: "—", montures: [], emplacements: 1, dispo: "2", cout: 140, source: "Feu nourri p.48" },
  { id: "poignee_personnalisee", nom: "Poignée personnalisée", type: "modification", monture: "—", montures: [], emplacements: 1, dispo: "3 (L)", cout: 200, source: "Feu nourri p.49" },
  { id: "pointes", nom: "Pointes", type: "modification", monture: "—", montures: [], emplacements: 1, dispo: "1", cout: 40, source: "Feu nourri p.49" },
  { id: "pointes_retractables", nom: "Pointes rétractables", type: "modification", monture: "—", montures: [], emplacements: 1, dispo: "2", cout: 115, source: "Feu nourri p.49" },
  { id: "protection_matricielle_pour_soldats", nom: "Protection matricielle pour soldats", type: "modification", monture: "—", montures: [], emplacements: 1, dispo: "4 (L)", cout: 2000, source: "Feu nourri p.49" },
  { id: "rails_pour_accessoires", nom: "Rails pour accessoires", type: "modification", monture: "—", montures: [], emplacements: 1, dispo: "3 (L)", cout: 75, source: "Feu nourri p.50" },
  { id: "rallonge_de_canon", nom: "Rallonge de canon", type: "modification", monture: "—", montures: [], emplacements: 1, dispo: "3 (L)", cout: 350, source: "Feu nourri p.50" },
  { id: "renfort_de_melee", nom: "Renfort de mêlée", type: "modification", monture: "—", montures: [], emplacements: 1, dispo: "3", cout: 300, source: "Feu nourri p.50" },
  { id: "revetement_electrique", nom: "Revêtement électrique", type: "modification", monture: "—", montures: [], emplacements: 1, dispo: "3", cout: 275, source: "Feu nourri p.50" },
  { id: "revetement_lumineux", nom: "Revêtement lumineux", type: "modification", monture: "—", montures: [], emplacements: 1, dispo: "3", cout: 275, source: "Feu nourri p.51" },
  { id: "style_personnalise", nom: "Style personnalisé", type: "modification", monture: "—", montures: [], emplacements: 1, dispo: "2", cout: 250, source: "Feu nourri p.51" },
  { id: "support_de_fixation_sous_le_canon", nom: "Support de fixation sous le canon", type: "modification", monture: "—", montures: [], emplacements: 1, dispo: "3 (I)", cout: 500, source: "Feu nourri p.51" },
  { id: "support_pour_munitions_secondaires", nom: "Support pour munitions secondaires", type: "modification", monture: "—", montures: [], emplacements: 1, dispo: "2 (L)", cout: 150, source: "Feu nourri p.52" },
  { id: "suppression_de_la_detente", nom: "Suppression de la détente", type: "modification", monture: "—", montures: [], emplacements: 1, dispo: "3 (I)", cout: 250, source: "Feu nourri p.52" },
  { id: "systeme_de_securite_pour_arme", nom: "Système de sécurité pour arme", type: "modification", monture: "—", montures: [], emplacements: 1, dispo: "3 (L)", cout: 500, source: "Feu nourri p.52" },
  { id: "systeme_de_tension_dynamique", nom: "Système de tension dynamique", type: "modification", monture: "—", montures: [], emplacements: 1, dispo: "3", cout: 200, source: "Feu nourri p.53" },
  { id: "systeme_de_tir_securise_iae", nom: "Système de tir sécurisé IAE", type: "modification", monture: "—", montures: [], emplacements: 1, dispo: "3 (L)", cout: 400, source: "Feu nourri p.53" },
  { id: "systeme_pneumatique_ameliore", nom: "Système pneumatique (amélioré)", type: "modification", monture: "—", montures: [], emplacements: 1, dispo: "3", cout: 600, source: "Feu nourri p.54" },
  { id: "verrouillage_biometrique", nom: "Verrouillage biométrique", type: "modification", monture: "—", montures: [], emplacements: 1, dispo: "2 (L)", cout: 100, source: "Feu nourri p.54" },
  { id: "adaptation_pour_metahumains", nom: "Adaptation pour métahumains", type: "modification", monture: "—", montures: [], emplacements: 1, dispo: "3", cout: null, coutNote: "+10%", source: "Feu nourri p.43" },
  { id: "adhesif_gecko", nom: "Adhésif gecko", type: "modification", monture: "—", montures: [], emplacements: 1, dispo: "2", cout: 90, source: "Feu nourri p.44" },
  { id: "allegement", nom: "Allègement", type: "modification", monture: "—", montures: [], emplacements: 1, dispo: "3", cout: 175, source: "Feu nourri p.45" },
  { id: "bricolee", nom: "Bricolée", type: "modification", monture: "—", montures: [], emplacements: 1, dispo: "—", cout: null, coutNote: "trait de l'arme, pas un achat", source: "Feu nourri p.45" },
  { id: "canon_court", nom: "Canon court", type: "modification", monture: "—", montures: [], emplacements: 1, dispo: "2", cout: 65, source: "Feu nourri p.45" },
  { id: "crosse", nom: "Crosse", type: "modification", monture: "—", montures: [], emplacements: 1, dispo: "1", cout: 100, source: "Feu nourri p.46" },
  { id: "crosse_escamotable", nom: "Crosse escamotable", type: "modification", monture: "—", montures: [], emplacements: 1, dispo: "2", cout: 250, source: "Feu nourri p.46" },
  { id: "crosse_escamotable_revolution_arms", nom: "Crosse escamotable rEVOlution Arms", type: "modification", monture: "—", montures: [], emplacements: 1, dispo: "3 (L)", cout: 700, source: "Feu nourri p.46" },
  { id: "crosse_pliante", nom: "Crosse pliante", type: "modification", monture: "—", montures: [], emplacements: 1, dispo: "2 (L)", cout: 75, source: "Feu nourri p.46" },
  { id: "sans_crosse", nom: "Sans crosse", type: "modification", monture: "—", montures: [], emplacements: 1, dispo: "1", cout: 50, source: "Feu nourri p.47" },
  { id: "demontage_facile", nom: "Démontage facile", type: "modification", monture: "—", montures: [], emplacements: 1, dispo: "3 (I)", cout: 400, source: "Feu nourri p.47" },
  { id: "dikote", nom: "Dikote", type: "modification", monture: "—", montures: [], emplacements: 1, dispo: "5", cout: 225, source: "Feu nourri p.47" },
  { id: "gyrostabilisateur_ii", nom: "Gyrostabilisateur II", type: "modification", monture: "—", montures: [], emplacements: 1, dispo: "3", cout: 1500, source: "Feu nourri p.47" },
  { id: "lame_aveuglante", nom: "Lame aveuglante", type: "modification", monture: "—", montures: [], emplacements: 1, dispo: "4 (L)", cout: 150, source: "Feu nourri p.48" },
  { id: "lestage", nom: "Lestage", type: "modification", monture: "—", montures: [], emplacements: 1, dispo: "3", cout: 175, source: "Feu nourri p.48" },
  { id: "lest_d_arme_canon_lourd", nom: "Lest d’arme/Canon lourd", type: "modification", monture: "—", montures: [], emplacements: 1, dispo: "2", cout: 70, source: "Feu nourri p.48" },
  { id: "materiaux_intelligents", nom: "Matériaux intelligents", type: "modification", monture: "—", montures: [], emplacements: 1, dispo: "3", cout: 900, source: "Feu nourri p.48" },
  { id: "nanoconstruction", nom: "Nanoconstruction", type: "modification", monture: "—", montures: [], emplacements: 1, dispo: "3 (L)", cout: 130, source: "Feu nourri p.48" },
];
