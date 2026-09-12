"use strict";

/* ============================================================
   SR5 — MODIFICATIONS D'ARMURE ET CAPACITÉ, relevé du 2026-09-12
   ------------------------------------------------------------
   Deux tables de l'annexe de Run & Gun (VF, p.225-226) : les 17
   PERSONNALISATIONS d'armure — dont les 7 du Livre de Règles p.439-440, que
   la table reprend — et la CAPACITÉ DU MATÉRIEL INSTALLÉ, 57 équipements
   qu'on peut loger dans une protection. Les dix personnalisations nouvelles
   sont vérifiées contre les titres de leur chapitre (p.98-100). Généré par
   REFERENCE/accessoires-armures/genere_js.py — régénérer, ne pas retoucher.

   ⚠ LA RÈGLE (Livre de Règles p.437) : « La Capacité d'une protection est
   égale à son indice d'Armure. Les modifications d'armure ont un coût en
   capacité variable. Sauf mention contraire, les modifications ont un indice
   entre 1 et 6. » Run & Gun p.100 étend la capacité à tout équipement
   installé dans l'armure.

   ⚠ `capacite: null` n'est PAS zéro : c'est « [Indice] » — le coût dépend de
   l'indice choisi, que l'app ne porte pas par objet — gardé dans
   `capaciteNote`. `capacite: 0` = « — » au livre : n'en consomme pas (YNT
   Softweave, Poches de gel). L'économie NOMME les indéterminés, elle ne les
   compte pas 0.

   ⚠ `cout: null` = formule (« Indice × 250 ¥ », « double le coût de la
   protection »), gardée dans `coutNote`. « 1 500 ¥ + coût des produits »
   garde son nombre ET sa note.

   ⚠ « Senseur à ultrasons » a DEUX capacités selon qu'il est un senseur [1]
   ou une amélioration visuelle [2] : deux entrées.
   ============================================================ */

export const ArmureModsSR5 = [
  { id: "attenuation_thermique", nom: "Atténuation thermique", capacite: null, capaciteNote: "indice", dispo: "10R", cout: null, coutNote: "Indice × 500 ¥", source: "Livre de Règles p.439 ; Run & Gun p.225" },
  { id: "armure_ynt_softweave", nom: "Armure YNT Softweave", capacite: 0, dispo: "+4", cout: null, coutNote: "double le coût de la protection", source: "Run & Gun p.98" },
  { id: "auto_injecteur", nom: "Auto-injecteur", capacite: 2, dispo: "4", cout: 1500, coutNote: "+ coût des produits", source: "Run & Gun p.98" },
  { id: "equipement_a_interface_reactive_eir", nom: "Équipement à Interface Réactive (EIR)", capacite: 6, capaciteNote: "4 + 2 (deux composants)", dispo: "8", cout: 2500, source: "Run & Gun p.98" },
  { id: "fibres_electrisees", nom: "Fibres électrisées", capacite: 3, dispo: "8", cout: 1000, source: "Run & Gun p.98" },
  { id: "fibres_pulsantes", nom: "Fibres pulsantes", capacite: 3, dispo: "+8R", cout: null, coutNote: "Indice × 3 000 ¥", source: "Run & Gun p.99" },
  { id: "isolation_chimique", nom: "Isolation chimique", capacite: 6, dispo: "12R", cout: 3000, source: "Livre de Règles p.439 ; Run & Gun p.225" },
  { id: "materiau_miroir_universel_par_metre_carre", nom: "Matériau miroir universel (par mètre carré)", capacite: 3, indice: "1-6", dispo: "8P", cout: null, coutNote: "Indice × 250 ¥", source: "Run & Gun p.99" },
  { id: "poches_de_gel", nom: "Poches de gel", capacite: 0, dispo: "6", cout: 1500, source: "Run & Gun p.99" },
  { id: "protection_antiradiations", nom: "Protection antiradiations", capacite: null, capaciteNote: "Indice", indice: "1-6", dispo: "Indice × 2", cout: null, coutNote: "Indice × 200 ¥", source: "Run & Gun p.100" },
  { id: "protection_chimique", nom: "Protection chimique", capacite: null, capaciteNote: "indice", dispo: "6", cout: null, coutNote: "Indice × 250 ¥", source: "Livre de Règles p.439 ; Run & Gun p.225" },
  { id: "protection_electrique", nom: "Protection électrique", capacite: null, capaciteNote: "indice", dispo: "6", cout: null, coutNote: "Indice × 250 ¥", source: "Livre de Règles p.439 ; Run & Gun p.225" },
  { id: "protection_ignifuge", nom: "Protection ignifuge", capacite: null, capaciteNote: "indice", dispo: "6", cout: null, coutNote: "Indice × 250 ¥", source: "Livre de Règles p.439 ; Run & Gun p.225" },
  { id: "protection_thermique", nom: "Protection thermique", capacite: null, capaciteNote: "indice", dispo: "6", cout: null, coutNote: "Indice × 250 ¥", source: "Livre de Règles p.440 ; Run & Gun p.225" },
  { id: "revetement_en_polymeres_de_ruthenium", nom: "Revêtement en polymères de ruthénium", capacite: 4, indice: "1-4", dispo: "16P", cout: null, coutNote: "Indice × 5 000 ¥", source: "Run & Gun p.100" },
  { id: "tissu_fresnel", nom: "Tissu Fresnel", capacite: 2, indice: "1-6", dispo: "14R", cout: null, coutNote: "Indice × 1 000 ¥", source: "Run & Gun p.100" },
  { id: "vrilles_electriques", nom: "Vrilles électriques", capacite: 2, dispo: "6R", cout: 250, source: "Livre de Règles p.440 ; Run & Gun p.225" },
];

/** Le matériel qu'on peut loger dans une armure, et ce qu'il y prend. */
export const ArmureCapaciteSR5 = [
  { id: "cap_autocrocheteur", nom: "Autocrocheteur", groupe: "Équipement", capacite: 1, source: "Run & Gun p.225-226" },
  { id: "cap_batterie_pour_mini_poste_a_soudure", nom: "Batterie pour mini-poste à soudure", groupe: "Équipement", capacite: 1, source: "Run & Gun p.225-226" },
  { id: "cap_biomoniteur", nom: "Biomoniteur", groupe: "Équipement", capacite: 1, source: "Run & Gun p.225-226" },
  { id: "cap_copieur_de_cle_magnetique", nom: "Copieur de clé magnétique", groupe: "Équipement", capacite: 3, source: "Run & Gun p.225-226" },
  { id: "cap_gps", nom: "GPS", groupe: "Équipement", capacite: 1, source: "Run & Gun p.225-226" },
  { id: "cap_holster_dissimulable", nom: "Holster dissimulable", groupe: "Équipement", capacite: 4, source: "Run & Gun p.225-226" },
  { id: "cap_holster_rapide_dissimule", nom: "Holster rapide dissimulé", groupe: "Équipement", capacite: 4, source: "Run & Gun p.225-226" },
  { id: "cap_holster_rapide", nom: "Holster rapide", groupe: "Équipement", capacite: 4, source: "Run & Gun p.225-226" },
  { id: "cap_masque_a_gaz", nom: "Masque à gaz", groupe: "Modifications d’armure", capacite: 2, source: "Run & Gun p.225-226" },
  { id: "cap_holster", nom: "Holster", groupe: "Équipement", capacite: 3, source: "Run & Gun p.225-226" },
  { id: "cap_kit_generique", nom: "Kit (générique)", groupe: "Équipement", capacite: 6, source: "Run & Gun p.225-226" },
  { id: "cap_kit_de_serrurerie", nom: "Kit de Serrurerie", groupe: "Équipement", capacite: 2, source: "Run & Gun p.225-226" },
  { id: "cap_kit_de_survie", nom: "Kit de Survie", groupe: "Équipement", capacite: 6, source: "Run & Gun p.225-226" },
  { id: "cap_lampe_torche", nom: "Lampe-torche", groupe: "Équipement", capacite: 1, source: "Run & Gun p.225-226" },
  { id: "cap_materiel_d_escalade", nom: "Matériel d’escalade", groupe: "Équipement", capacite: 5, source: "Run & Gun p.225-226" },
  { id: "cap_medikit", nom: "Médikit", groupe: "Équipement", capacite: 5, source: "Run & Gun p.225-226" },
  { id: "cap_micro_pistolet_de_detresse", nom: "Micro-pistolet de détresse", groupe: "Équipement", capacite: 1, source: "Run & Gun p.225-226" },
  { id: "cap_reserve_d_air_interne", nom: "Réserve d’air interne", groupe: "Modifications d’armure", capacite: null, capaciteNote: "1 par heure", note: "voir combinaison NBC (p.451, SR5)", source: "Run & Gun p.225-226" },
  { id: "cap_mini_poste_a_soudure_avec_1_batterie", nom: "Mini-poste à soudure (avec 1 batterie)", groupe: "Équipement", capacite: 1, source: "Run & Gun p.225-226" },
  { id: "cap_pinces_coupantes", nom: "Pinces coupantes", groupe: "Équipement", capacite: 1, source: "Run & Gun p.225-226" },
  { id: "cap_sequenceur", nom: "Séquenceur", groupe: "Équipement", capacite: 2, source: "Run & Gun p.225-226" },
  { id: "cap_amplification_auditive", nom: "Amplification auditive", groupe: "Améliorations auditives", capacite: null, capaciteNote: "Indice", source: "Run & Gun p.225-226" },
  { id: "cap_camera", nom: "Caméra", groupe: "Senseurs", capacite: 1, source: "Run & Gun p.225-226" },
  { id: "cap_filtre_sonore_selectif", nom: "Filtre sonore sélectif", groupe: "Améliorations auditives", capacite: null, capaciteNote: "Indice", source: "Run & Gun p.225-226" },
  { id: "cap_compteur_geiger", nom: "Compteur Geiger", groupe: "Senseurs", capacite: 1, source: "Run & Gun p.225-226" },
  { id: "cap_reconnaissance_spatiale", nom: "Reconnaissance spatiale", groupe: "Améliorations auditives", capacite: 2, source: "Run & Gun p.225-226" },
  { id: "cap_detecteur_de_mouvements", nom: "Détecteur de mouvements", groupe: "Senseurs", capacite: 1, source: "Run & Gun p.225-226" },
  { id: "cap_systeme_audio", nom: "Système audio", groupe: "Améliorations auditives", capacite: 1, source: "Run & Gun p.225-226" },
  { id: "cap_microphone", nom: "Microphone", groupe: "Senseurs", capacite: 1, source: "Run & Gun p.225-226" },
  { id: "cap_microphone_directionnel", nom: "Microphone directionnel", groupe: "Senseurs", capacite: 1, source: "Run & Gun p.225-226" },
  { id: "cap_brouilleur", nom: "Brouilleur", groupe: "Équipement de communication", capacite: 2, source: "Run & Gun p.225-226" },
  { id: "cap_microphone_laser", nom: "Microphone laser", groupe: "Senseurs", capacite: 2, source: "Run & Gun p.225-226" },
  { id: "cap_commlink", nom: "Commlink", groupe: "Équipement de communication", capacite: 2, source: "Run & Gun p.225-226" },
  { id: "cap_microphone_omnidirectionnel", nom: "Microphone omnidirectionnel", groupe: "Senseurs", capacite: 2, source: "Run & Gun p.225-226" },
  { id: "cap_demarqueur", nom: "Démarqueur", groupe: "Équipement de communication", capacite: 1, source: "Run & Gun p.225-226" },
  { id: "cap_scanner_de_cyberware", nom: "Scanner de cyberware", groupe: "Senseurs", capacite: 1, source: "Run & Gun p.225-226" },
  { id: "cap_gants_ra", nom: "Gants RA", groupe: "Équipement de communication", capacite: 1, source: "Run & Gun p.225-226" },
  { id: "cap_scanner_de_frequences", nom: "Scanner de fréquences", groupe: "Senseurs", capacite: 1, source: "Run & Gun p.225-226" },
  { id: "cap_generateur_de_bruit_blanc", nom: "Générateur de bruit blanc", groupe: "Équipement de communication", capacite: 2, source: "Run & Gun p.225-226" },
  { id: "cap_scanner_magnetique", nom: "Scanner magnétique", groupe: "Senseurs", capacite: 1, source: "Run & Gun p.225-226" },
  { id: "cap_holo_projecteur", nom: "Holo-projecteur", groupe: "Équipement de communication", capacite: 1, source: "Run & Gun p.225-226" },
  { id: "cap_senseur_a_ultrasons", nom: "Senseur à ultrasons", groupe: "Senseurs", capacite: 1, source: "Run & Gun p.225-226" },
  { id: "cap_micro_transmetteur", nom: "Micro-transmetteur", groupe: "Équipement de communication", capacite: 1, source: "Run & Gun p.225-226" },
  { id: "cap_senseur_atmospherique", nom: "Senseur atmosphérique", groupe: "Senseurs", capacite: 1, source: "Run & Gun p.225-226" },
  { id: "cap_module_sim", nom: "Module sim", groupe: "Équipement de communication", capacite: 1, source: "Run & Gun p.225-226" },
  { id: "cap_senseur_olfactif", nom: "Senseur olfactif", groupe: "Senseurs", capacite: 1, source: "Run & Gun p.225-226" },
  { id: "cap_simrig", nom: "Simrig", groupe: "Équipement de communication", capacite: 5, source: "Run & Gun p.225-226" },
  { id: "cap_telemetre_laser", nom: "Télémètre laser", groupe: "Senseurs", capacite: 1, source: "Run & Gun p.225-226" },
  { id: "cap_trodes", nom: "Trodes", groupe: "Équipement de communication", capacite: 2, source: "Run & Gun p.225-226" },
  { id: "cap_amplification_visuelle", nom: "Amplification visuelle", groupe: "Améliorations visuelles", capacite: null, capaciteNote: "Indice", source: "Run & Gun p.225-226" },
  { id: "cap_smartlink", nom: "Smartlink", groupe: "Améliorations visuelles", capacite: 1, source: "Run & Gun p.225-226" },
  { id: "cap_compensation_anti_flash", nom: "Compensation anti-flash", groupe: "Améliorations visuelles", capacite: 1, source: "Run & Gun p.225-226" },
  { id: "cap_vision_nocturne", nom: "Vision nocturne", groupe: "Améliorations visuelles", capacite: 1, source: "Run & Gun p.225-226" },
  { id: "cap_interface_visuelle_affichage_tete_haute", nom: "Interface visuelle / Affichage tête haute", groupe: "Améliorations visuelles", capacite: 1, source: "Run & Gun p.225-226" },
  { id: "cap_vision_thermographique", nom: "Vision thermographique", groupe: "Améliorations visuelles", capacite: 1, source: "Run & Gun p.225-226" },
  { id: "cap_senseur_a_ultrasons_ameliorations_visuelles", nom: "Senseur à ultrasons", groupe: "Améliorations visuelles", capacite: 2, source: "Run & Gun p.225-226" },
  { id: "cap_zoom", nom: "Zoom", groupe: "Améliorations visuelles", capacite: 1, source: "Run & Gun p.225-226" },
];
