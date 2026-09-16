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

/** Les armures de Run & Gun (p.223-224) et leur capacité PROPRE quand le
    livre en donne une (Ace of Coins : armure 7, capacité 10) ; `capacite:
    null` sans note = la règle p.437 (capacité = indice d'Armure) s'applique. */
export const ArmuresSR5 = [
  { id: "ares_flashield", nom: "Ares FlaShield", armure: "+6", capacite: 4, dispo: "12R", cout: "4 000 ¥", source: "Run & Gun p.89" },
  { id: "armure_anti_emeutes", nom: "Armure anti-émeutes", armure: "14", capacite: 8, dispo: "10R", cout: "5 000 ¥", source: "Run & Gun p.87" },
  { id: "armure_anti_emeutes_casque", nom: "Armure anti-émeutes — Casque", armure: "+2", capacite: 6, dispo: "6R", cout: "1 000 ¥", source: "Run & Gun p.223-224" },
  { id: "armure_corporelle_en_sac", nom: "Armure corporelle en sac", armure: "8", capacite: 4, dispo: "8", cout: "750 ¥", source: "Run & Gun p.88" },
  { id: "armure_corporelle_integrale", nom: "Armure corporelle intégrale", armure: "15", capacite: null, dispo: "14R", cout: "2 000 ¥", source: "Livre de Règles p.439" },
  { id: "armure_corporelle_integrale_casque", nom: "Armure corporelle intégrale — Casque", armure: "+3", capacite: 6, dispo: "—", cout: "+500 ¥", source: "Run & Gun p.223-224" },
  { id: "armures_de_securite_legere", nom: "Armures de sécurité — Légère", armure: "15", capacite: 12, dispo: "14R", cout: "8 000 ¥", source: "Run & Gun p.223-224" },
  { id: "armures_de_securite_moyenne", nom: "Armures de sécurité — Moyenne", armure: "18", capacite: 14, dispo: "16R", cout: "14 000 ¥", source: "Run & Gun p.223-224" },
  { id: "armures_de_securite_lourde", nom: "Armures de sécurité — Lourde", armure: "20", capacite: 16, dispo: "18R", cout: "20 000 ¥", source: "Run & Gun p.223-224" },
  { id: "armures_de_securite_casque", nom: "Armures de sécurité — Casque", armure: "+3", capacite: 5, dispo: "8R", cout: "5 000 ¥", source: "Run & Gun p.223-224" },
  { id: "armure_macabre", nom: "Armure macabre", armure: "13", capacite: 4, dispo: "12R", cout: "5 000 ¥", source: "Run & Gun p.90" },
  { id: "armure_militaire_renforcee_legere", nom: "Armure militaire renforcée — Légère", armure: "15", capacite: 15, dispo: "16P", cout: "15 000 ¥", source: "Run & Gun p.223-224" },
  { id: "armure_militaire_renforcee_moyenne", nom: "Armure militaire renforcée — Moyenne", armure: "18", capacite: 18, dispo: "18P", cout: "20 000 ¥", source: "Run & Gun p.223-224" },
  { id: "armure_militaire_renforcee_lourde", nom: "Armure militaire renforcée — Lourde", armure: "20", capacite: 20, dispo: "22P", cout: "25 000 ¥", source: "Run & Gun p.223-224" },
  { id: "armure_militaire_renforcee_casque", nom: "Armure militaire renforcée — Casque", armure: "+3", capacite: 8, dispo: "8P", cout: "10 000 ¥", source: "Run & Gun p.223-224" },
  { id: "armure_moulante_corporelle", nom: "Armure moulante corporelle", armure: "8", capacite: 3, dispo: "8", cout: "1 300 ¥", source: "Run & Gun p.84" },
  { id: "armure_rembourree_en_cuir", nom: "Armure rembourrée en cuir", armure: "7", capacite: 2, dispo: "8", cout: "600 ¥", source: "Run & Gun p.89" },
  { id: "armure_swat", nom: "Armure SWAT", armure: "15", capacite: 15, dispo: "16R", cout: "8 000 ¥", source: "Run & Gun p.88" },
  { id: "armure_swat_casque", nom: "Armure SWAT — Casque", armure: "+3", capacite: 8, dispo: "10R", cout: "1 500 ¥", source: "Run & Gun p.223-224" },
  { id: "bouclier_anti_emeutes", nom: "Bouclier anti-émeutes", armure: "+6", capacite: null, dispo: "10R", cout: "1 500 ¥", source: "Livre de Règles p.440" },
  { id: "bouclier_balistique", nom: "Bouclier balistique", armure: "+6", capacite: null, dispo: "12R", cout: "1 200 ¥", source: "Livre de Règles p.440" },
  { id: "casque", nom: "Casque", armure: "+2", capacite: null, dispo: "2", cout: "100 ¥", source: "Livre de Règles p.440" },
  { id: "combinaison_cameleon", nom: "Combinaison caméléon", armure: "9", capacite: null, dispo: "10R", cout: "1 700 ¥", source: "Livre de Règles p.439" },
  { id: "combinaison_de_moto_de_course", nom: "Combinaison de moto de course", armure: "8", capacite: 8, dispo: "6", cout: "500 ¥", source: "Run & Gun p.86" },
  { id: "combinaison_de_moto_de_course_casque", nom: "Combinaison de moto de course — Casque", armure: "+2", capacite: 6, dispo: "6", cout: "200 ¥", source: "Run & Gun p.223-224" },
  { id: "combinaison_de_pompier", nom: "Combinaison de pompier", armure: "6", capacite: 6, dispo: "6", cout: "3 000 ¥", source: "Run & Gun p.87" },
  { id: "combinaison_de_pompier_casque", nom: "Combinaison de pompier — Casque", armure: "+2", capacite: 3, dispo: "6", cout: "750 ¥", source: "Run & Gun p.223-224" },
  { id: "combinaison_urban_explorer", nom: "Combinaison Urban Explorer", armure: "9", capacite: null, dispo: "8", cout: "650 ¥", source: "Livre de Règles p.439" },
  { id: "combinaison_urban_explorer_casque", nom: "Combinaison Urban Explorer — Casque", armure: "+2", capacite: null, dispo: "—", cout: "+100 ¥", source: "Run & Gun p.223-224" },
  { id: "costume_actioneer", nom: "Costume « Actioneer »", armure: "8", capacite: null, dispo: "8", cout: "1 500 ¥", source: "Livre de Règles p.439" },
  { id: "cotte_de_mailles", nom: "Cotte de mailles", armure: "8", capacite: 2, dispo: "8", cout: "900 ¥", source: "Run & Gun p.89" },
  { id: "gilet_pare_balles", nom: "Gilet pare-balles", armure: "9", capacite: null, dispo: "4", cout: "500 ¥", source: "Livre de Règles p.439" },
  { id: "manteau_renforce", nom: "Manteau renforcé", armure: "9", capacite: null, dispo: "4", cout: "900 ¥", source: "Livre de Règles p.439" },
  { id: "masque_balistique", nom: "Masque balistique", armure: "+2", capacite: 8, dispo: "6", cout: "150 ¥", source: "Run & Gun p.91" },
  { id: "protections_d_avant_bras", nom: "Protections d’avant-bras", armure: "+1", capacite: 3, dispo: "6", cout: "300 ¥", source: "Run & Gun p.90" },
  { id: "systeme_securetech_ppp_pour_bras", nom: "Système SecureTech PPP pour bras", armure: "+1", capacite: 1, dispo: "6", cout: "250 ¥", source: "Run & Gun p.88" },
  { id: "systeme_securetech_ppp_pour_jambes", nom: "Système SecureTech PPP pour jambes", armure: "+1", capacite: 1, dispo: "6", cout: "300 ¥", source: "Run & Gun p.88" },
  { id: "systeme_securetech_ppp_pour_organes_vitaux", nom: "Système SecureTech PPP pour organes vitaux", armure: "+1", capacite: 1, dispo: "6", cout: "350 ¥", source: "Run & Gun p.88" },
  { id: "veste_pare_balles", nom: "Veste pare-balles", armure: "12", capacite: null, dispo: "2", cout: "1 000 ¥", source: "Livre de Règles p.439" },
  { id: "vetements_pare_balles", nom: "Vêtements pare-balles", armure: "6", capacite: null, dispo: "2", cout: "450 ¥", source: "Livre de Règles p.439" },
  { id: "ace_of_clubs", nom: "Ace of Clubs", armure: "7", capacite: 6, dispo: "6", cout: "1 000 ¥", source: "Run & Gun p.80" },
  { id: "ace_of_coins", nom: "Ace of Coins", armure: "7", capacite: 10, dispo: "4", cout: "2 100 ¥", source: "Run & Gun p.80" },
  { id: "ace_of_cups", nom: "Ace of Cups", armure: "9", capacite: 8, dispo: "6", cout: "1 600 ¥", source: "Run & Gun p.80" },
  { id: "ace_of_diamonds", nom: "Ace of Diamonds", armure: "8", capacite: 6, dispo: "8", cout: "1 400 ¥", source: "Run & Gun p.80" },
  { id: "ace_of_hearts", nom: "Ace of Hearts", armure: "7", capacite: 6, dispo: "6", cout: "1 000 ¥", source: "Run & Gun p.80" },
  { id: "ace_of_spades", nom: "Ace of Spades", armure: "7", capacite: 6, dispo: "6", cout: "1 000 ¥", source: "Run & Gun p.80" },
  { id: "ace_of_swords", nom: "Ace of Swords", armure: "7", capacite: 8, dispo: "6", cout: "1 300 ¥", source: "Run & Gun p.80" },
  { id: "ace_of_wands", nom: "Ace of Wands", armure: "6", capacite: 8, dispo: "6", cout: "1 200 ¥", source: "Run & Gun p.80" },
  { id: "big_game_hunter", nom: "Big Game Hunter", armure: "14", capacite: 12, dispo: "12", cout: "5 000 ¥", source: "Run & Gun p.82" },
  { id: "costume_robe_armante", nom: "Costume / Robe Armanté", armure: "8", capacite: 4, dispo: "10", cout: "2 500 ¥", source: "Run & Gun p.77" },
  { id: "costume_berwick", nom: "Costume Berwick", armure: "9", capacite: 5, dispo: "9", cout: "2 600 ¥", source: "Run & Gun p.78" },
  { id: "costume_crimson_sky", nom: "Costume Crimson Sky", armure: "8", capacite: 5, dispo: "6", cout: "2 400 ¥", source: "Run & Gun p.78" },
  { id: "costume_summit", nom: "Costume Summit", armure: "8", capacite: 6, dispo: "7", cout: "2 500 ¥", source: "Run & Gun p.78" },
  { id: "executive_suite", nom: "Executive Suite", armure: "12", capacite: 4, dispo: "12", cout: "2 000 ¥", source: "Run & Gun p.81" },
  { id: "gilet_globetrotter", nom: "Gilet Globetrotter", armure: "9", capacite: 10, dispo: "7", cout: "900 ¥", source: "Run & Gun p.82" },
  { id: "heritage", nom: "Heritage", armure: "4 / 6 / 8 / 10 / 12", capacite: null, capaciteNote: "Armure / 2", dispo: "16", cout: "2 000 + Armure × 500) ¥", source: "Run & Gun p.81" },
  { id: "industrious", nom: "Industrious", armure: "9", capacite: 6, dispo: "6", cout: "1 100 ¥", source: "Run & Gun p.82" },
  { id: "manteau_argentum", nom: "Manteau Argentum", armure: "12 / +4", capacite: 14, dispo: "10", cout: "3 600 ¥", source: "Run & Gun p.78" },
  { id: "manteau_greatcoat", nom: "Manteau Greatcoat", armure: "10 / +3", capacite: 10, dispo: "8", cout: "3 000 ¥", source: "Run & Gun p.78" },
  { id: "manteau_long_synergist_business_line", nom: "Manteau long Synergist Business Line", armure: "10 / +3", capacite: 6, dispo: "8", cout: "2 300 ¥", source: "Run & Gun p.80" },
  { id: "manteau_ulysses", nom: "Manteau Ulysses", armure: "10 / +3", capacite: 12, dispo: "8", cout: "3 100 ¥", source: "Run & Gun p.78" },
  { id: "nightshade_moonsilver", nom: "Nightshade / Moonsilver", armure: "7", capacite: 2, dispo: "10", cout: "8 500 ¥", source: "Run & Gun p.81" },
  { id: "rapid_transit", nom: "Rapid Transit", armure: "9", capacite: 6, dispo: "10", cout: "400 ¥+", source: "Run & Gun p.82" },
  { id: "robe_berwick", nom: "Robe Berwick", armure: "8", capacite: 4, dispo: "8", cout: "2 300 ¥", source: "Run & Gun p.78" },
  { id: "robe_summit", nom: "Robe Summit", armure: "7", capacite: 5, dispo: "7", cout: "2 200 ¥", source: "Run & Gun p.78" },
  { id: "sleeping_tiger", nom: "Sleeping Tiger", armure: "13", capacite: 10, dispo: "10", cout: "13 500 ¥", source: "Run & Gun p.80" },
  { id: "steampunk", nom: "Steampunk", armure: "10", capacite: 14, dispo: "7", cout: "2 250 ¥", source: "Run & Gun p.80" },
  { id: "synergist_business_line", nom: "Synergist Business Line", armure: "9", capacite: 5, dispo: "8", cout: "1 500 ¥", source: "Run & Gun p.80" },
  { id: "second_skin", nom: "Second Skin", armure: "6 / +2", capacite: 2, dispo: "14", cout: "12 000 ¥", source: "Run & Gun p.81" },
  { id: "veste_globetrotter", nom: "Veste Globetrotter", armure: "12", capacite: 10, dispo: "10", cout: "1 300 ¥", source: "Run & Gun p.82" },
  { id: "vetements_globetrotter", nom: "Vêtements Globetrotter", armure: "7", capacite: 10, dispo: "6", cout: "600 ¥", source: "Run & Gun p.82" },
  { id: "wild_hunt", nom: "Wild Hunt", armure: "12", capacite: 10, dispo: "12", cout: "3 000 ¥", source: "Run & Gun p.82" },
  { id: "ares_armored_survivalist", nom: "Ares Armored Survivalist", armure: "8", capacite: 6, dispo: "10", cout: "1 500 ¥", source: "Run & Gun p.91" },
  { id: "armure_de_plongee", nom: "Armure de plongée", armure: "7", capacite: 4, dispo: "6", cout: "1 750 ¥", source: "Run & Gun p.95" },
  { id: "bulle_de_survie", nom: "Bulle de survie", armure: "4", capacite: 4, dispo: "Indice × 3", cout: "Indice × 2 000 ¥", source: "Run & Gun p.98" },
  { id: "combinaison_ares_arctic_forces", nom: "Combinaison Ares Arctic Forces", armure: "15", capacite: 14, dispo: "16R", cout: "11 000 ¥", source: "Run & Gun p.93" },
  { id: "combinaison_contre_le_froid_blindee_ares", nom: "Combinaison contre le froid blindée Ares", armure: "9", capacite: 6, dispo: "6", cout: "1 200 ¥", source: "Run & Gun p.94" },
  { id: "combinaison_de_camouflage_polaire_ares", nom: "Combinaison de camouflage polaire Ares", armure: "6", capacite: 4, dispo: "16P", cout: "10 000 ¥", source: "Run & Gun p.94" },
  { id: "combinaison_de_plongeur_arctique", nom: "Combinaison de plongeur arctique", armure: "1", capacite: 4, dispo: "8", cout: "3 000 ¥", source: "Run & Gun p.95" },
  { id: "combinaison_de_survie_polaire", nom: "Combinaison de survie polaire", armure: "6", capacite: 6, dispo: "8", cout: "2 000 ¥", source: "Run & Gun p.93" },
  { id: "combinaison_evo_hel", nom: "Combinaison Evo HEL", armure: "8", capacite: 5, dispo: "10", cout: "3 000 ¥", source: "Run & Gun p.96" },
  { id: "combinaison_mitsuhama_ee", nom: "Combinaison Mitsuhama EE", armure: "6", capacite: 5, dispo: "10", cout: "2 500 ¥", source: "Run & Gun p.98" },
  { id: "combinaison_spatiale", nom: "Combinaison spatiale", armure: "12", capacite: 6, dispo: "16", cout: "12 000 ¥", source: "Run & Gun p.96" },
  { id: "combinaison_spatiale_de_securite", nom: "Combinaison spatiale de sécurité", armure: "15", capacite: 10, dispo: "24", cout: "25 000 ¥", source: "Run & Gun p.96" },
  { id: "combinaison_spatiale_blindee_evo_armadillo", nom: "Combinaison spatiale blindée Evo Armadillo", armure: "16", capacite: 10, dispo: "24R", cout: "35 000 ¥", source: "Run & Gun p.97" },
  { id: "tenue_desert", nom: "Tenue désert", armure: "3", capacite: 2, dispo: "8", cout: "1 000 ¥", source: "Run & Gun p.92" },
  { id: "tenue_ghillie", nom: "Tenue Ghillie", armure: "4", capacite: 4, dispo: "6", cout: "600 ¥", source: "Run & Gun p.91" },
];
