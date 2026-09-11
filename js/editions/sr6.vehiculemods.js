"use strict";

/* ============================================================
   SR6 — MODIFICATIONS DE VÉHICULE, relevé du 2026-09-11
   ------------------------------------------------------------
   4 entrées du Livre de base p.303, puis le catalogue COMPLET du supplément
   rigger « À tombeau ouvert », chapitre « Règles sur les modifications »
   (p.123-145 imprimées) : 80 mods distincts, 147 entrées avec leurs variantes.
   Généré par REFERENCE/mods-vehicule-sr6/genere_js.py — ne pas retoucher à la
   main, régénérer.

   ⚠ TROIS familles d'emplacements, pas quatre — le livre le dit p.122 : « un
   nombre d'emplacements de mods égal [à] son score de Résistance non modifié
   dans chacune des trois catégories : Châssis, Motorisation, Électronique ».
   « Mods d'Habillage » est une SOUS-SECTION du livre (l'enveloppe du
   véhicule), gardée dans `section` ; la rattacher à la famille Châssis est
   une DÉDUCTION, pas une phrase du livre.

   ⚠ `famille: null` = accessoire : il ne consomme AUCUN emplacement (p.123),
   et la remise d'auto-installation ne s'applique pas à lui.

   ⚠ `emplacements: null` n'est PAS zéro. CONVENTION : avec une
   `emplacementsNote`, c'est une formule que l'app ne résout pas (« 1 ×
   Indice », « Résistance/2 ») ; SANS note, le livre ne précise rien et c'est
   la règle p.123 qui s'applique — « considérez que le multiplicateur de seuil
   et d'intervalle est de 1 ». L'économie d'emplacements doit LE DIRE, jamais
   compter 0 en silence.

   ⚠ `cout: null` n'est pas une donnée manquante : le livre y écrit une
   FORMULE (« Résistance x 1 000¥ », « Indice × 5 000¥ ») ou deux prix (pneus :
   drones & motos / voitures & camions), conservés tels quels dans `coutNote`.
   Ne jamais les remplacer par un nombre inventé.

   ⚠ `supplement: true` marque un coût ADDITIONNEL (le livre l'écrit
   « +500 ¥ ») : il s'ajoute au prix, il ne le remplace pas.

   ⚠ `note` porte les colonnes maison de certaines tables (support d'une
   monture, VD en mêlée d'un bras, performances d'une propulsion) : lisibles,
   pas calculées.

   Doublons EXACTS du livre de base écartés du supplément : « Module
   d'interface pour rigger » (p.143 : 0 emplacement, Électronique — reporté sur
   l'entrée de base ci-dessous). Les autres montures d'armes du supplément ont
   d'autres noms (tailles, tourelles) et sont toutes présentes.
   ============================================================ */

export const VehiculeModsSR6 = [
  { id: "module_d_interface_pour_rigger", nom: "Module d’interface pour rigger", section: "Électronique", famille: "Électronique", emplacements: 0, dispo: "2", cout: 1000, source: "Livre de base p.303 ; À tombeau ouvert p.143" },
  { id: "monture_d_arme_standard", nom: "Monture d’arme standard", dispo: "4 (I)", cout: 2500, source: "Livre de base p.303" },
  { id: "monture_d_arme_renforcee", nom: "Monture d’arme renforcée", dispo: "6 (I)", cout: 5000, source: "Livre de base p.303" },
  { id: "mode_manuel", nom: "Mode manuel", dispo: "+1", cout: 500, supplement: true, source: "Livre de base p.303" },
  { id: "bandes_herse", nom: "Bandes — Herse", section: "Accessoires", famille: null, emplacements: null, dispo: "3 (I)", cout: 250, source: "À tombeau ouvert p.123" },
  { id: "bandes_bande_de_pistage", nom: "Bandes — Bande de pistage", section: "Accessoires", famille: null, emplacements: null, dispo: "3", cout: 500, source: "À tombeau ouvert p.123" },
  { id: "bandes_bande_electrocutrice", nom: "Bandes — Bande électrocutrice", section: "Accessoires", famille: null, emplacements: null, dispo: "3 (L)", cout: 1000, source: "À tombeau ouvert p.123" },
  { id: "diffuseur_de_fumee", nom: "Diffuseur de fumée", section: "Accessoires", famille: null, emplacements: null, dispo: "3 (L)", cout: 600, source: "À tombeau ouvert p.123", coutNote: "+ 100¥ pour la fumée thermique" },
  { id: "ejecteur_de_bande_routiere", nom: "Éjecteur de bande routière", section: "Accessoires", famille: null, emplacements: null, dispo: "4 (I)", cout: 1000, source: "À tombeau ouvert p.123" },
  { id: "kit_anti_identification", nom: "Kit anti-identification", section: "Accessoires", famille: null, emplacements: null, dispo: "4 (I)", cout: 1500, source: "À tombeau ouvert p.124" },
  { id: "pneus_speciaux_standard", nom: "Pneus spéciaux — Standard", section: "Accessoires", famille: null, emplacements: null, dispo: "1", cout: null, source: "À tombeau ouvert p.124", coutNote: "250¥ (drones & motos) / 500¥ (voitures & camions)" },
  { id: "pneus_speciaux_tout_terrain", nom: "Pneus spéciaux — Tout-terrain", section: "Accessoires", famille: null, emplacements: null, dispo: "2", cout: null, source: "À tombeau ouvert p.124", coutNote: "800¥ (drones & motos) / 1 600¥ (voitures & camions)" },
  { id: "pneus_speciaux_course", nom: "Pneus spéciaux — Course", section: "Accessoires", famille: null, emplacements: null, dispo: "2", cout: null, source: "À tombeau ouvert p.124", coutNote: "500¥ (drones & motos) / 1 000¥ (voitures & camions)" },
  { id: "pneus_speciaux_run_flat", nom: "Pneus spéciaux — Run-flat", section: "Accessoires", famille: null, emplacements: null, dispo: "2", cout: null, source: "À tombeau ouvert p.124", coutNote: "400¥ (drones & motos) / 800¥ (voitures & camions)" },
  { id: "pneus_speciaux_intelligents", nom: "Pneus spéciaux — Intelligents", section: "Accessoires", famille: null, emplacements: null, dispo: "4", cout: null, source: "À tombeau ouvert p.124", coutNote: "1 200¥ (drones & motos) / 2 400¥ (voitures & camions)" },
  { id: "pneus_speciaux_dechiqueteurs", nom: "Pneus spéciaux — Déchiqueteurs", section: "Accessoires", famille: null, emplacements: null, dispo: "4 (I)", cout: null, source: "À tombeau ouvert p.124", coutNote: "600¥ (drones & motos) / 1 200¥ (voitures & camions)" },
  { id: "projecteur", nom: "Projecteur", section: "Accessoires", famille: null, emplacements: null, dispo: "2", cout: 800, source: "À tombeau ouvert p.124" },
  { id: "pulverisateur_dhuile", nom: "Pulvérisateur d’huile", section: "Accessoires", famille: null, emplacements: null, dispo: "4 (I)", cout: 1000, source: "À tombeau ouvert p.124" },
  { id: "rampe_gyrophare_sirene", nom: "Rampe gyrophare/sirène", section: "Accessoires", famille: null, emplacements: null, dispo: "4 (L)", cout: 6000, source: "À tombeau ouvert p.125" },
  { id: "signes_distinctifs", nom: "Signes distinctifs", section: "Accessoires", famille: null, emplacements: null, dispo: "2", cout: 4000, source: "À tombeau ouvert p.125" },
  { id: "systeme_de_diffusion_de_gaz", nom: "Système de diffusion de gaz", section: "Accessoires", famille: null, emplacements: null, dispo: "5 (L)", cout: null, source: "À tombeau ouvert p.125", coutNote: "2 000¥ + jusqu’à cinq doses de toxine" },
  { id: "acces_supplementaire", nom: "Accès supplémentaire", section: "Châssis", famille: "Châssis", emplacements: 1, dispo: "4", cout: 4000, source: "À tombeau ouvert p.125" },
  { id: "amelioration_dintegrite_structurelle", nom: "Amélioration d’intégrité structurelle", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "4", cout: null, source: "À tombeau ouvert p.125", emplacementsNote: "1 × Indice", indice: "Jusqu’à Résistance/2", coutNote: "5 000¥ × Indice" },
  { id: "amenagements_medevac", nom: "Aménagements Medevac", section: "Châssis", famille: "Châssis", emplacements: 1, dispo: "5", cout: 3500, source: "À tombeau ouvert p.126" },
  { id: "auto_transformation", nom: "Auto-Transformation", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "6 (L)", cout: null, source: "À tombeau ouvert p.126", emplacementsNote: "Résistance/2", indice: "1–4", coutNote: "1 500¥ × Indice" },
  { id: "meurtrieres", nom: "Meurtrières", section: "Châssis", famille: "Châssis", emplacements: 0.5, dispo: "3 (L)", cout: 1000, source: "À tombeau ouvert p.126" },
  { id: "mods_pour_environnement_extreme_type", nom: "Mods pour environnement extrême (Type)", section: "Châssis", famille: "Châssis", emplacements: 2, dispo: "3", cout: 3000, source: "À tombeau ouvert p.126" },
  { id: "montage_demontage_facile", nom: "Montage/démontage facile", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "3", cout: null, source: "À tombeau ouvert p.126", coutNote: "(Résistance + 1) × 1 000¥" },
  { id: "supports_de_fixation_petite_taille", nom: "Supports de fixation — Petite taille", section: "Châssis", famille: "Châssis", emplacements: 0.5, dispo: "2", cout: 800, source: "À tombeau ouvert p.127" },
  { id: "supports_de_fixation_standard", nom: "Supports de fixation — Standard", section: "Châssis", famille: "Châssis", emplacements: 1, dispo: "2", cout: 1500, source: "À tombeau ouvert p.127" },
  { id: "supports_de_fixation_grande_taille", nom: "Supports de fixation — Grande taille", section: "Châssis", famille: "Châssis", emplacements: 2, dispo: "3", cout: 3000, source: "À tombeau ouvert p.127" },
  { id: "supports_de_fixation_tres_grande_taille", nom: "Supports de fixation — Très grande taille", section: "Châssis", famille: "Châssis", emplacements: 3, dispo: "4", cout: null, source: "À tombeau ouvert p.127", coutNote: "8 000¥ place" },
  { id: "montures_darmes_monture_darme_de_petite_taille", nom: "Montures d’armes — Monture d’arme de petite taille", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "3 (I)", cout: 1500, source: "À tombeau ouvert p.128", note: "support : Petit" },
  { id: "montures_darmes_tourelle_de_petite_taille", nom: "Montures d’armes — Tourelle de petite taille", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "5 (I)", cout: 6500, source: "À tombeau ouvert p.128", note: "support : Standard" },
  { id: "montures_darmes_monture_darme_standard", nom: "Montures d’armes — Monture d’arme standard", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "4 (I)", cout: 2500, source: "À tombeau ouvert p.128", note: "support : Standard" },
  { id: "montures_darmes_tourelle_de_taille_standard", nom: "Montures d’armes — Tourelle de taille standard", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "6 (I)", cout: 8500, source: "À tombeau ouvert p.128", note: "support : Grand" },
  { id: "montures_darmes_monture_darme_de_grande_taille", nom: "Montures d’armes — Monture d’arme de grande taille", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "6 (I)", cout: 5000, source: "À tombeau ouvert p.128", note: "support : Grand" },
  { id: "montures_darmes_tourelle_de_grande_taille_tres", nom: "Montures d’armes — Tourelle de grande taille Très", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "8 (I)", cout: 12000, source: "À tombeau ouvert p.128", note: "support : Grand" },
  { id: "montures_darmes_ajout_de_controles_manuels", nom: "Montures d’armes — Ajout de contrôles manuels", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "+1", cout: 500, source: "À tombeau ouvert p.128" },
  { id: "montures_darmes_petite_taille", nom: "Montures d’armes — Petite taille", section: "Châssis", famille: "Châssis", emplacements: 0.5, dispo: "3 (L)", cout: 400, source: "À tombeau ouvert p.128" },
  { id: "montures_darmes_taille_standard", nom: "Montures d’armes — Taille standard", section: "Châssis", famille: "Châssis", emplacements: 1, dispo: "3 (L)", cout: 800, source: "À tombeau ouvert p.128" },
  { id: "montures_darmes_grande_taille", nom: "Montures d’armes — Grande taille", section: "Châssis", famille: "Châssis", emplacements: 1.5, dispo: "3 (L)", cout: null, source: "À tombeau ouvert p.128", coutNote: "1 200¥ taille ; ils sont alors lancés l’un après l’autre. La capacité" },
  { id: "dissimulation_des_montures_darmes_petite_taille", nom: "Dissimulation des montures d’armes — Petite taille", section: "Châssis", famille: "Châssis", emplacements: 0, dispo: "2 (I)", cout: 100, source: "À tombeau ouvert p.128" },
  { id: "dissimulation_des_montures_darmes_taille_standard", nom: "Dissimulation des montures d’armes — Taille standard", section: "Châssis", famille: "Châssis", emplacements: 0, dispo: "2 (I)", cout: 200, source: "À tombeau ouvert p.128" },
  { id: "dissimulation_des_montures_darmes_grande_taille", nom: "Dissimulation des montures d’armes — Grande taille", section: "Châssis", famille: "Châssis", emplacements: 0, dispo: "2 (I)", cout: 300, source: "À tombeau ouvert p.128" },
  { id: "dissimulation_des_montures_darmes_tres_grande_taille", nom: "Dissimulation des montures d’armes — Très grande taille", section: "Châssis", famille: "Châssis", emplacements: 0, dispo: "2 (I)", cout: 400, source: "À tombeau ouvert p.128" },
  { id: "dissimulation_des_montures_darmes_petite_taille_128", nom: "Dissimulation des montures d’armes — Petite taille", section: "Châssis", famille: "Châssis", emplacements: 0.5, dispo: "2 (I)", cout: 1500, source: "À tombeau ouvert p.128" },
  { id: "dissimulation_des_montures_darmes_taille_standard_128", nom: "Dissimulation des montures d’armes — Taille standard", section: "Châssis", famille: "Châssis", emplacements: 1, dispo: "3 (I)", cout: 3000, source: "À tombeau ouvert p.128" },
  { id: "dissimulation_des_montures_darmes_grande_taille_128", nom: "Dissimulation des montures d’armes — Grande taille", section: "Châssis", famille: "Châssis", emplacements: 2, dispo: "3 (I)", cout: 4500, source: "À tombeau ouvert p.128" },
  { id: "dissimulation_des_montures_darmes_tres_grande_taille_128", nom: "Dissimulation des montures d’armes — Très grande taille", section: "Châssis", famille: "Châssis", emplacements: 3, dispo: "4 (I)", cout: 6000, source: "À tombeau ouvert p.128" },
  { id: "rack_pour_drone_rack_mini_micro_support_petit", nom: "Rack pour drone — rack Mini/Micro, support Petit", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "3", cout: 1000, source: "À tombeau ouvert p.129", note: "jusqu’à 5 drone(s)" },
  { id: "rack_pour_drone_rack_petit_support_standard", nom: "Rack pour drone — rack Petit, support Standard", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "3", cout: 2000, source: "À tombeau ouvert p.129", note: "jusqu’à 3 drone(s)" },
  { id: "rack_pour_drone_rack_moyen_support_grand", nom: "Rack pour drone — rack Moyen, support Grand", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "4", cout: 5000, source: "À tombeau ouvert p.129", note: "jusqu’à 1 drone(s)" },
  { id: "rack_pour_drone_rack_grand_support_tres_grand", nom: "Rack pour drone — rack Grand, support Très grand", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "6", cout: 10000, source: "À tombeau ouvert p.129", note: "jusqu’à 1 drone(s)" },
  { id: "stockage_de_drone_supplementaire_mini_micro", nom: "Stockage de drone supplémentaire — Mini/Micro", section: "Châssis", famille: "Châssis", emplacements: 0.55, dispo: "3", cout: 500, source: "À tombeau ouvert p.129" },
  { id: "stockage_de_drone_supplementaire_petite", nom: "Stockage de drone supplémentaire — Petite", section: "Châssis", famille: "Châssis", emplacements: 13, dispo: "3", cout: 1000, source: "À tombeau ouvert p.129" },
  { id: "stockage_de_drone_supplementaire_moyenne", nom: "Stockage de drone supplémentaire — Moyenne", section: "Châssis", famille: "Châssis", emplacements: 11, dispo: "4", cout: 2500, source: "À tombeau ouvert p.129" },
  { id: "stockage_de_drone_supplementaire_grande", nom: "Stockage de drone supplémentaire — Grande", section: "Châssis", famille: "Châssis", emplacements: 21, dispo: "4", cout: 5000, source: "À tombeau ouvert p.129" },
  { id: "bras_mecanique_force_12_petite_support_petit", nom: "Bras mécanique — Force 1–2 (Petite, support Petit)", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "2", cout: 2000, source: "À tombeau ouvert p.129", note: "VD en mêlée : 2P" },
  { id: "bras_mecanique_force_35_moyenne_support_standard", nom: "Bras mécanique — Force 3–5 (Moyenne, support Standard)", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "2", cout: 4000, source: "À tombeau ouvert p.129", note: "VD en mêlée : 2P" },
  { id: "bras_mecanique_force_610_grande_support_grand", nom: "Bras mécanique — Force 6–10 (Grande, support Grand)", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "3", cout: 7000, source: "À tombeau ouvert p.129", note: "VD en mêlée : 3P" },
  { id: "bras_mecanique_force_1120_tres_grande_support_tres_grand", nom: "Bras mécanique — Force 11–20 (Très grande, support Très grand)", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "5", cout: 11000, source: "À tombeau ouvert p.129", note: "VD en mêlée : 4P" },
  { id: "belier", nom: "Bélier", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "3 (L)", cout: null, source: "À tombeau ouvert p.129", coutNote: "Résistance x 250¥" },
  { id: "commandes_de_pilotage_avancees", nom: "Commandes de pilotage avancées", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "6 (L)", cout: null, source: "À tombeau ouvert p.130", emplacementsNote: "3 × Indice", indice: "1–2", coutNote: "24 000¥ × Indice" },
  { id: "maniabilite_amelioree", nom: "Maniabilité améliorée", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "5", cout: null, source: "À tombeau ouvert p.130", emplacementsNote: "2 × Indice", indice: "1–2", coutNote: "18 000¥ × Indice" },
  { id: "retrait_des_commandes_manuelles", nom: "Retrait des commandes manuelles", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "2", cout: 800, source: "À tombeau ouvert p.130", emplacementsNote: "–1", indice: "—" },
  { id: "suspension_tout_terrain_dynamique", nom: "Suspension tout-terrain (dynamique)", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "4", cout: null, source: "À tombeau ouvert p.130", emplacementsNote: "1 × Indice", indice: "1–3", coutNote: "4 500¥ × Indice" },
  { id: "suspension_tout_terrain_statique", nom: "Suspension tout-terrain (statique)", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "2", cout: null, source: "À tombeau ouvert p.131", emplacementsNote: "0,5 × Indice", indice: "1–3", coutNote: "2 500¥ × Indice" },
  { id: "adaptation_pour_metahumains", nom: "Adaptation pour métahumains", section: "Châssis", famille: "Châssis", emplacements: 0, dispo: "2", cout: null, source: "À tombeau ouvert p.131", coutNote: "500¥ /250¥" },
  { id: "augmentation_reduction_de_la_capacite_de_chargement", nom: "Augmentation/Réduction de la capacité de chargement", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "2", cout: null, source: "À tombeau ouvert p.131", emplacementsNote: "1 pour 2 FC", coutNote: "800¥ pour 2 FC ajoutés" },
  { id: "blindage_electromagnetique", nom: "Blindage électromagnétique", section: "Châssis", famille: "Châssis", emplacements: 0.5, dispo: "3 (L)", cout: null, source: "À tombeau ouvert p.131", coutNote: "FC x 1 000¥" },
  { id: "bras_cybernetique_integre", nom: "Bras cybernétique intégré", section: "Châssis", famille: "Châssis", emplacements: 1, dispo: "4", cout: 15000, source: "À tombeau ouvert p.132" },
  { id: "remorques_et_side_cars_side_car", nom: "Remorques et side-cars — Side-car", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "2", cout: null, source: "À tombeau ouvert p.132", coutNote: "1 000¥ par FC", note: "FC 1–4, catégorie de taille 3, Résistance 1, Blindage 0" },
  { id: "remorques_et_side_cars_remorque_de_tres_petite_taille", nom: "Remorques et side-cars — Remorque de très petite taille", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "2", cout: null, source: "À tombeau ouvert p.132", coutNote: "300¥ par FC", note: "FC 1–9, catégorie de taille 4, Résistance 2, Blindage 1" },
  { id: "remorques_et_side_cars_remorque_de_petite_taille", nom: "Remorques et side-cars — Remorque de petite taille", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "2", cout: null, source: "À tombeau ouvert p.132", coutNote: "250¥ par FC", note: "FC 10–19, catégorie de taille 5, Résistance 5, Blindage 2" },
  { id: "remorques_et_side_cars_remorque_de_taille_moyenne", nom: "Remorques et side-cars — Remorque de taille moyenne", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "2", cout: null, source: "À tombeau ouvert p.132", coutNote: "200¥ par FC", note: "FC 20–49, catégorie de taille 6, Résistance 10, Blindage 2" },
  { id: "remorques_et_side_cars_remorque_de_grande_taille", nom: "Remorques et side-cars — Remorque de grande taille", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "2", cout: null, source: "À tombeau ouvert p.132", coutNote: "150¥ par FC", note: "FC 50–99, catégorie de taille 8, Résistance 15, Blindage 3" },
  { id: "remorques_et_side_cars_semi_remorque", nom: "Remorques et side-cars — Semi-remorque", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "3", cout: null, source: "À tombeau ouvert p.132", coutNote: "100¥ par FC", note: "FC 100–200, catégorie de taille 10, Résistance 20, Blindage 4" },
  { id: "finitions_interieures_amenagements_squatter", nom: "Finitions intérieures/Aménagements — Squatter", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "2", cout: 1000, source: "À tombeau ouvert p.132" },
  { id: "finitions_interieures_amenagements_moyen", nom: "Finitions intérieures/Aménagements — Moyen", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "2", cout: 2000, source: "À tombeau ouvert p.132" },
  { id: "finitions_interieures_amenagements_eleve", nom: "Finitions intérieures/Aménagements — Élevé", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "4", cout: 4000, source: "À tombeau ouvert p.132" },
  { id: "finitions_interieures_amenagements_luxueux", nom: "Finitions intérieures/Aménagements — Luxueux", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "6", cout: 20000, source: "À tombeau ouvert p.132" },
  { id: "isolation_environnementale_1", nom: "Isolation environnementale — 1", section: "Châssis", famille: "Châssis", emplacements: 1, dispo: "4", cout: null, source: "À tombeau ouvert p.132", coutNote: "Résistance x 1 000¥" },
  { id: "isolation_environnementale_2", nom: "Isolation environnementale — 2", section: "Châssis", famille: "Châssis", emplacements: 2, dispo: "6", cout: null, source: "À tombeau ouvert p.132", coutNote: "Résistance x 3 000¥" },
  { id: "siege_ejectable", nom: "Siège éjectable", section: "Châssis", famille: "Châssis", emplacements: 1, dispo: "6 (L)", cout: 2000, source: "À tombeau ouvert p.133" },
  { id: "systeme_de_pacification_interne_systeme_de_diffusion_de_gaz", nom: "Système de pacification interne — Système de diffusion de gaz", section: "Châssis", famille: "Châssis", emplacements: 1, dispo: "4 (I)", cout: null, source: "À tombeau ouvert p.134", coutNote: "3 000¥ + Toxine" },
  { id: "systeme_de_pacification_interne_systeme_electrocuteur", nom: "Système de pacification interne — Système électrocuteur", section: "Châssis", famille: "Châssis", emplacements: 2, dispo: "5 (L)", cout: 6000, source: "À tombeau ouvert p.134" },
  { id: "systeme_de_protection_des_passagers", nom: "Système de protection des passagers", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "3", cout: null, source: "À tombeau ouvert p.134", emplacementsNote: "0,5 × Indice", indice: "1–6", coutNote: "Indice x 2 500¥" },
  { id: "augmentation_du_nombre_de_places_1_par_place_supplementaire", nom: "Augmentation du nombre de places — 1 par place supplémentaire", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "2", cout: null, source: "À tombeau ouvert p.134", coutNote: "1 200¥ par place" },
  { id: "cocon_de_rigger_1", nom: "Cocon de rigger — 1", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "4", cout: 3000, source: "À tombeau ouvert p.134" },
  { id: "compartiment_de_contrebande_14", nom: "Compartiment de contrebande — 1–4", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "4 (I)", cout: null, source: "À tombeau ouvert p.134", coutNote: "1 000¥ x FC" },
  { id: "compartiment_de_contrebande_0", nom: "Compartiment de contrebande — 0", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "4 (I)", cout: null, source: "À tombeau ouvert p.134", coutNote: "250¥ x FC du compartiment" },
  { id: "espace_dhabitation_squatter_2_x_occupants", nom: "Espace d’habitation — Squatter 2 x occupants", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "2", cout: null, source: "À tombeau ouvert p.135", coutNote: "500¥ par occupant englobe" },
  { id: "espace_dhabitation_bas_4_x_occupants", nom: "Espace d’habitation — Bas 4 x occupants", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "3", cout: null, source: "À tombeau ouvert p.135", coutNote: "2 000¥ par occupant" },
  { id: "espace_dhabitation_moyen_6_x_occupants", nom: "Espace d’habitation — Moyen 6 x occupants", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "4", cout: null, source: "À tombeau ouvert p.135", coutNote: "5 000¥ par occupant" },
  { id: "espace_dhabitation_eleve_8_x_occupants", nom: "Espace d’habitation — Élevé 8 x occupants", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "5", cout: null, source: "À tombeau ouvert p.135", coutNote: "10 000¥ par occupant" },
  { id: "espace_dhabitation_luxueux_10_x_occupants", nom: "Espace d’habitation — Luxueux 10 x occupants", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "6", cout: null, source: "À tombeau ouvert p.135", coutNote: "100 000¥ par occupant" },
  { id: "installation_mobile_50", nom: "Installation mobile — 50", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "8", cout: 75000, source: "À tombeau ouvert p.135" },
  { id: "module_valkyrie", nom: "Module Valkyrie", section: "Châssis", famille: "Châssis", emplacements: null, dispo: "4", cout: null, source: "À tombeau ouvert p.135", emplacementsNote: "1, ou 2 FC", coutNote: "3 000¥ L’INTÉRIEUR" },
  { id: "apparence_realiste", nom: "Apparence réaliste", section: "Habillage", famille: "Châssis", emplacements: null, dispo: "Indice x 2", cout: null, source: "À tombeau ouvert p.136", emplacementsNote: "1 par Indice", indice: "1–4", coutNote: "Indice x Résistance x 1 000¥" },
  { id: "blindage_standard", nom: "Blindage standard", section: "Habillage", famille: "Châssis", emplacements: 0, dispo: "3", cout: null, source: "À tombeau ouvert p.137", indice: "Jusqu’à Résistance x 2", coutNote: "800¥ × Indice" },
  { id: "blindage_ceramique", nom: "Blindage céramique", section: "Habillage", famille: "Châssis", emplacements: null, dispo: "5 (L)", cout: null, source: "À tombeau ouvert p.137", emplacementsNote: "0,25 x Blindage", coutNote: "1 500¥ x Blindage" },
  { id: "blindage_militaire_indice_1", nom: "Blindage militaire — indice 1", section: "Habillage", famille: "Châssis", emplacements: 2, dispo: "9 (I)", cout: 30000, source: "À tombeau ouvert p.137", indice: "1" },
  { id: "blindage_militaire_indice_2", nom: "Blindage militaire — indice 2", section: "Habillage", famille: "Châssis", emplacements: 4, dispo: "9 (I)", cout: 40000, source: "À tombeau ouvert p.137", indice: "2" },
  { id: "blindage_militaire_indice_3", nom: "Blindage militaire — indice 3", section: "Habillage", famille: "Châssis", emplacements: 6, dispo: "9 (I)", cout: 50000, source: "À tombeau ouvert p.137", indice: "3" },
  { id: "renforcement_elementaire", nom: "Renforcement élémentaire", section: "Habillage", famille: "Châssis", emplacements: null, dispo: "—", cout: null, source: "À tombeau ouvert p.137", emplacementsNote: "0,5 × Indice", indice: "1–6", coutNote: "1 000¥ × Indice" },
  { id: "revetement_ram", nom: "Revêtement RAM", section: "Habillage", famille: "Châssis", emplacements: null, dispo: "4 (I)", cout: null, source: "À tombeau ouvert p.137", emplacementsNote: "0,5 × Indice", indice: "1–6", coutNote: "1 500¥ × Indice" },
  { id: "isolation_au_mana_de_grey", nom: "Isolation au Mana de Grey", section: "Habillage", famille: "Châssis", emplacements: null, dispo: "4 (I)", cout: null, source: "À tombeau ouvert p.137", emplacementsNote: "1 par Indice", indice: "1–6", coutNote: "Indice x 2 500¥ /5 000¥" },
  { id: "acceleration_amelioree", nom: "Accélération améliorée", section: "Motorisation", famille: "Motorisation", emplacements: null, dispo: "3", cout: null, source: "À tombeau ouvert p.138", emplacementsNote: "1 par Indice", indice: "1–2", coutNote: "Indice × 15 000¥" },
  { id: "boost_nitro", nom: "Boost Nitro", section: "Motorisation", famille: "Motorisation", emplacements: 2, dispo: "3 (I)", cout: 5000, source: "À tombeau ouvert p.138" },
  { id: "cellule_solaire", nom: "Cellule solaire", section: "Motorisation", famille: "Motorisation", emplacements: 1, dispo: "2", cout: 9500, source: "À tombeau ouvert p.138" },
  { id: "consommation_capacite_amelioree", nom: "Consommation/Capacité améliorée", section: "Motorisation", famille: "Motorisation", emplacements: null, dispo: "2", cout: null, source: "À tombeau ouvert p.139", emplacementsNote: "1–3", indice: "1–3", coutNote: "6 000¥ × Indice" },
  { id: "convertisseur_dhydrocarbure", nom: "Convertisseur d’hydrocarbure", section: "Motorisation", famille: "Motorisation", emplacements: 2, dispo: "5", cout: null, source: "À tombeau ouvert p.139", coutNote: "Résistance x 1 500¥" },
  { id: "gridlink", nom: "GridLink", section: "Motorisation", famille: "Motorisation", emplacements: 0, dispo: "2", cout: 500, source: "À tombeau ouvert p.139" },
  { id: "prises_adhesives_1", nom: "Prises adhésives — 1", section: "Motorisation", famille: "Motorisation", emplacements: 0, dispo: "3", cout: 1500, source: "À tombeau ouvert p.139" },
  { id: "prises_adhesives_2", nom: "Prises adhésives — 2", section: "Motorisation", famille: "Motorisation", emplacements: 1, dispo: "3", cout: 3000, source: "À tombeau ouvert p.139" },
  { id: "prises_adhesives_3", nom: "Prises adhésives — 3", section: "Motorisation", famille: "Motorisation", emplacements: 2, dispo: "3", cout: 6500, source: "À tombeau ouvert p.139" },
  { id: "prises_adhesives_4", nom: "Prises adhésives — 4", section: "Motorisation", famille: "Motorisation", emplacements: 3, dispo: "3", cout: 9000, source: "À tombeau ouvert p.139" },
  { id: "systeme_de_propulsion_secondaire_amphibie_sous_marin", nom: "Système de propulsion secondaire — Amphibie, Sous-marin", section: "Motorisation", famille: "Motorisation", emplacements: 4, dispo: "6 (L)", cout: null, source: "À tombeau ouvert p.140", coutNote: "Résistance x 3 000¥", note: "Maniabilité 5, Accélération 5, Intervalle 10, Vitesse max 40" },
  { id: "systeme_de_propulsion_secondaire_amphibie_surface", nom: "Système de propulsion secondaire — Amphibie, Surface", section: "Motorisation", famille: "Motorisation", emplacements: 3, dispo: "3", cout: null, source: "À tombeau ouvert p.140", coutNote: "Résistance x 1 000¥", note: "Maniabilité 4, Accélération 10, Intervalle 15, Vitesse max 60" },
  { id: "systeme_de_propulsion_secondaire_planeur", nom: "Système de propulsion secondaire — Planeur", section: "Motorisation", famille: "Motorisation", emplacements: 2, dispo: "3", cout: null, source: "À tombeau ouvert p.140", coutNote: "Résistance x 1 500¥", note: "Maniabilité 5, Accélération 5, Intervalle 10, Vitesse max 60" },
  { id: "systeme_de_propulsion_secondaire_aeroglisseur", nom: "Système de propulsion secondaire — Aéroglisseur", section: "Motorisation", famille: "Motorisation", emplacements: 3, dispo: "6", cout: null, source: "À tombeau ouvert p.140", coutNote: "Résistance x 3 000¥", note: "Maniabilité 4, Accélération 10, Intervalle 15, Vitesse max 90" },
  { id: "systeme_de_propulsion_secondaire_moteur_fusee", nom: "Système de propulsion secondaire — Moteur-fusée", section: "Motorisation", famille: "Motorisation", emplacements: 3, dispo: "8 (I)", cout: null, source: "À tombeau ouvert p.140", coutNote: "Résistance x 6 000¥", note: "Maniabilité 7, Accélération 100, Intervalle 50, Vitesse max 300" },
  { id: "systeme_de_propulsion_secondaire_rotor", nom: "Système de propulsion secondaire — Rotor", section: "Motorisation", famille: "Motorisation", emplacements: 4, dispo: "6 (L)", cout: null, source: "À tombeau ouvert p.140", coutNote: "Résistance x 5 000¥", note: "Maniabilité 5, Accélération 10, Intervalle 20, Vitesse max 120" },
  { id: "systeme_de_propulsion_secondaire_chenilles", nom: "Système de propulsion secondaire — Chenilles", section: "Motorisation", famille: "Motorisation", emplacements: 2, dispo: "5", cout: null, source: "À tombeau ouvert p.140", coutNote: "Résistance x 2 000¥", note: "Maniabilité 4/2, Accélération 4, Intervalle 15, Vitesse max 60" },
  { id: "systeme_de_propulsion_secondaire_poussee_vectorielle_vba", nom: "Système de propulsion secondaire — Poussée vectorielle (VBA)", section: "Motorisation", famille: "Motorisation", emplacements: 5, dispo: "7 (L)", cout: null, source: "À tombeau ouvert p.140", coutNote: "Résistance x 9 000¥", note: "Maniabilité 4, Accélération 25, Intervalle 50, Vitesse max 300" },
  { id: "systeme_de_propulsion_secondaire_arthropode", nom: "Système de propulsion secondaire — Arthropode", section: "Motorisation", famille: "Motorisation", emplacements: 4, dispo: "6", cout: null, source: "À tombeau ouvert p.140", coutNote: "Résistance x 4 000¥", note: "Maniabilité 3/3, Accélération 10, Intervalle 15, Vitesse max 30" },
  { id: "systeme_de_propulsion_secondaire_roues", nom: "Système de propulsion secondaire — Roues", section: "Motorisation", famille: "Motorisation", emplacements: 2, dispo: "3", cout: null, source: "À tombeau ouvert p.140", coutNote: "Résistance x 1 000¥", note: "Maniabilité 3/4, Accélération 10, Intervalle 15, Vitesse max 120" },
  { id: "systeme_de_propulsion_secondaire_ailes", nom: "Système de propulsion secondaire — Ailes", section: "Motorisation", famille: "Motorisation", emplacements: 4, dispo: "5 (L)", cout: null, source: "À tombeau ouvert p.140", coutNote: "Résistance x 4 500¥", note: "Maniabilité 5, Accélération 15, Intervalle 25, Vitesse max 150" },
  { id: "stabilite_amelioree", nom: "Stabilité améliorée", section: "Motorisation", famille: "Motorisation", emplacements: null, dispo: "3", cout: null, source: "À tombeau ouvert p.140", emplacementsNote: "2 × Indice", indice: "1–3", coutNote: "Indice × 7 000¥" },
  { id: "suspension_ajustee", nom: "Suspension ajustée", section: "Motorisation", famille: "Motorisation", emplacements: 1, dispo: "4", cout: 12000, source: "À tombeau ouvert p.141" },
  { id: "suspension_de_course", nom: "Suspension de course", section: "Motorisation", famille: "Motorisation", emplacements: 3, dispo: "6 (L)", cout: 20000, source: "À tombeau ouvert p.141" },
  { id: "amelioration_de_vitesse_max", nom: "Amélioration de Vitesse Max", section: "Motorisation", famille: "Motorisation", emplacements: null, dispo: "3", cout: null, source: "À tombeau ouvert p.141", emplacementsNote: "1 par point d’Indice", indice: "1–3", coutNote: "8 000¥ × Indice" },
  { id: "dispositif_electrocuteur", nom: "Dispositif électrocuteur", section: "Électronique", famille: "Électronique", emplacements: 1, dispo: "4 (L)", cout: 6000, source: "À tombeau ouvert p.141" },
  { id: "fonctionnalites_furtives_passives", nom: "Fonctionnalités furtives passives", section: "Électronique", famille: "Électronique", emplacements: 1, dispo: "3", cout: 1000, source: "À tombeau ouvert p.141" },
  { id: "peinture_electrochrome", nom: "Peinture électrochrome", section: "Électronique", famille: "Électronique", emplacements: 1, dispo: "2", cout: 1500, source: "À tombeau ouvert p.142" },
  { id: "revetement_cameleon", nom: "Revêtement caméléon", section: "Électronique", famille: "Électronique", emplacements: null, dispo: "9", cout: null, source: "À tombeau ouvert p.142", coutNote: "000¥ × Indice (taille 9 ou plus)" },
  { id: "appareil_matriciel_integre", nom: "Appareil matriciel intégré", section: "Électronique", famille: "Électronique", emplacements: 0, dispo: "2", cout: null, source: "À tombeau ouvert p.142", coutNote: "800¥ + coût de l’appareil" },
  { id: "commandement_controle_et_communications_c3", nom: "Commandement, contrôle et communications (C3)", section: "Électronique", famille: "Électronique", emplacements: 1, dispo: "4", cout: 7000, source: "À tombeau ouvert p.142" },
  { id: "contre_mesures_electroniques_cme", nom: "Contre-mesures électroniques (CME)", section: "Électronique", famille: "Électronique", emplacements: 1, dispo: "4 (L)", cout: null, source: "À tombeau ouvert p.143", indice: "1–6", coutNote: "Indice x 500¥" },
  { id: "systeme_antivol_indice_2", nom: "Système antivol — indice 2", section: "Électronique", famille: "Électronique", emplacements: 0, dispo: "3", cout: 2000, source: "À tombeau ouvert p.143", indice: "2" },
  { id: "systeme_antivol_indice_3", nom: "Système antivol — indice 3", section: "Électronique", famille: "Électronique", emplacements: 1, dispo: "4 (L)", cout: 3500, source: "À tombeau ouvert p.143", indice: "3" },
  { id: "systeme_antivol_indice_4", nom: "Système antivol — indice 4", section: "Électronique", famille: "Électronique", emplacements: 2, dispo: "6 (I)", cout: 9000, source: "À tombeau ouvert p.143", indice: "4" },
  { id: "systeme_de_nanoreparation", nom: "Système de nanoréparation", section: "Électronique", famille: "Électronique", emplacements: null, dispo: "Indice x 2 (L)", cout: null, source: "À tombeau ouvert p.143", emplacementsNote: "1 par point d’Indice", indice: "1–4", coutNote: "Indice x 9 000¥" },
  { id: "unite_de_retransmission", nom: "Unité de retransmission", section: "Électronique", famille: "Électronique", emplacements: 1, dispo: "3", cout: 7000, source: "À tombeau ouvert p.143" },
  { id: "verrouillage_des_commandes_electroniques", nom: "Verrouillage des commandes électroniques", section: "Électronique", famille: "Électronique", emplacements: 0.5, dispo: "3", cout: 1500, source: "À tombeau ouvert p.144" },
  { id: "autopilote_ameliore", nom: "Autopilote amélioré", section: "Électronique", famille: "Électronique", emplacements: null, dispo: "Indice", cout: null, source: "À tombeau ouvert p.144", emplacementsNote: "1 × Indice", indice: "1–9", coutNote: "Indice × 5 000¥" },
  { id: "contournement_xguide", nom: "Contournement xGuide", section: "Électronique", famille: "Électronique", emplacements: 1, dispo: "4 (I)", cout: 5000, source: "À tombeau ouvert p.144" },
  { id: "partage_de_reseau_etendu_pre", nom: "Partage de réseau étendu (PRE)", section: "Électronique", famille: "Électronique", emplacements: 4, dispo: "9 (L)", cout: 85000, source: "À tombeau ouvert p.144" },
  { id: "senseurs_ameliores", nom: "Senseurs améliorés", section: "Électronique", famille: "Électronique", emplacements: null, dispo: "Indice", cout: null, source: "À tombeau ouvert p.144", emplacementsNote: "1 × Indice", indice: "1–8", coutNote: "Indice × 2 000¥" },
  { id: "treuil", nom: "Treuil", section: "Châssis", famille: "Châssis", emplacements: null, indice: "1–2", dispo: "Indice x 2", cout: null, coutNote: "750¥ (indice 1) / 4 000¥ (indice 2)", source: "À tombeau ouvert p.129" },
];
