"use strict";

/* ============================================================
   SR6 — MODIFICATIONS D'ARMURE ET CAPACITÉ DES ARMURES, relevé du 2026-09-13
   ------------------------------------------------------------
   Les deux tables récapitulatives de Feu nourri (VF, p.152 imprimée, PDF 154) :
   « Accessoires et modifications d'armure » — 28 entrées, dont les 5 du Livre
   de base p.275 et 7 holsters/étuis — et « Armures & vêtements » — 58 armures
   avec leur CAPACITÉ, dont les 10 du Livre de base p.274-275. Généré par
   REFERENCE/accessoires-armures/genere_js_sr6.py — régénérer, ne pas retoucher.

   ⚠ LA RÈGLE (Livre de base p.275) : « La Capacité d'une protection est
   indiquée sur la table Armures. Les modifications d'armure ont un coût en
   Capacité égal à leur indice. » En SR6 la Capacité N'EST PAS l'indice
   d'armure (c'est la règle SR5) : c'est une valeur propre à chaque armure —
   d'où `ArmuresSR6`, que le catalogue d'équipement (« Nom [SD+N] ») ne porte
   pas. Elle se lit ici par NOM au moment du choix, et se saisit sinon.

   ⚠ `capacite: null` = « [Indice] », « [Indice × 2] », « [2-3] » : dépend
   d'un indice ou d'un choix que l'app ne porte pas par objet — gardé dans
   `capaciteNote`, NOMMÉ, pas compté 0.

   ⚠ Le Harnais SEM (p.65) a une capacité « [10]/(12+8) » : un système
   modulaire qui en OFFRE — hors modèle, note gardée.
   ============================================================ */

export const ArmureModsSR6 = [
  { id: "arm_acces_a_l_equipement", nom: "Accès à l’équipement", capacite: 3, dispo: "2", cout: 250, source: "Feu nourri p.68" },
  { id: "arm_armure_reactive_gelweave", nom: "Armure réactive — GelWeave", capacite: null, capaciteNote: "Indice × 2", dispo: "6(I)", cout: null, coutNote: "Indice × 5 000 ¥", source: "Feu nourri p.68" },
  { id: "arm_armure_reactive_plaques", nom: "Armure réactive — Plaques", capacite: null, capaciteNote: "Indice × 2", dispo: "9(I)", cout: null, coutNote: "Indice × 2 500 ¥", source: "Feu nourri p.68" },
  { id: "arm_baudrier_tactique_sem", nom: "Baudrier tactique SEM", capacite: 2, dispo: "2", cout: 75, source: "Feu nourri p.65" },
  { id: "arm_cartouchiere_pour_shotgun_sem", nom: "Cartouchière pour shotgun SEM", capacite: 2, dispo: "2", cout: 75, source: "Feu nourri p.65" },
  { id: "arm_dissipation_thermique", nom: "Dissipation thermique", capacite: 3, dispo: "2", cout: null, coutNote: "Indice × 250 ¥", source: "Feu nourri p.69" },
  { id: "arm_etui_a_munitions_dissimulable", nom: "Étui à munitions dissimulable", capacite: 3, dispo: "2 (L)", cout: 100, source: "Feu nourri p.69" },
  { id: "arm_etui_a_munitions_sem_grand", nom: "Étui à munitions SEM (grand)", capacite: 1, dispo: "2", cout: 85, source: "Feu nourri p.65" },
  { id: "arm_etui_a_munitions_sem_petit", nom: "Étui à munitions SEM (petit)", capacite: 1, dispo: "2", cout: 75, source: "Feu nourri p.65" },
  { id: "arm_fibres_durcies_toughweave", nom: "Fibres durcies « Toughweave »", capacite: null, capaciteNote: "Indice × 3", dispo: "9(I)", cout: null, coutNote: "Indice × 15 000 ¥", source: "Feu nourri p.69" },
  { id: "arm_fibres_electrisees", nom: "Fibres électrisées", capacite: 4, dispo: "3 (L)", cout: null, coutNote: "Indice × 1 000 ¥", source: "Feu nourri p.69" },
  { id: "arm_harnais_sem", nom: "Harnais SEM", capacite: null, capaciteNote: "10 ou 12+8 selon le harnais (p.65)", dispo: "2", cout: 300, source: "Feu nourri p.65" },
  { id: "arm_holster", nom: "Holster", capacite: 3, dispo: "1", cout: 50, source: "Livre de base p.275" },
  { id: "arm_holster_rapide", nom: "Holster rapide", capacite: 3, dispo: "2", cout: 175, source: "Livre de base p.275" },
  { id: "arm_holster_rapide_sem", nom: "Holster rapide SEM", capacite: 3, dispo: "2", cout: 200, source: "Feu nourri p.65" },
  { id: "arm_holster_sem", nom: "Holster SEM", capacite: 3, dispo: "2", cout: 100, source: "Feu nourri p.65" },
  { id: "arm_isolation_chimique", nom: "Isolation chimique", capacite: 6, dispo: "5", cout: 3000, source: "Livre de base p.275" },
  { id: "arm_pack_de_camouflage_programmable", nom: "Pack de camouflage programmable", capacite: 2, dispo: "2", cout: 75, source: "Feu nourri p.69" },
  { id: "arm_poche_secrete", nom: "Poche secrète", capacite: 2, dispo: "2", cout: 200, source: "Feu nourri p.70" },
  { id: "arm_poignee_de_tractage", nom: "Poignée de tractage", capacite: 2, dispo: "2", cout: 75, source: "Feu nourri p.70" },
  { id: "arm_protection_chimique", nom: "Protection chimique", capacite: null, capaciteNote: "Indice", dispo: "3", cout: null, coutNote: "Indice × 250 ¥", source: "Livre de base p.275" },
  { id: "arm_resistance_a_l_electricite", nom: "Résistance à l’électricité", capacite: null, capaciteNote: "Indice", dispo: "3", cout: null, coutNote: "Indice × 250 ¥", source: "Livre de base p.275" },
  { id: "arm_resistance_au_feu", nom: "Résistance au feu", capacite: null, capaciteNote: "Indice", dispo: "3", cout: null, coutNote: "Indice × 250 ¥", source: "Livre de base p.275" },
  { id: "arm_resistance_au_froid", nom: "Résistance au froid", capacite: null, capaciteNote: "Indice", dispo: "3", cout: null, coutNote: "Indice × 250 ¥", source: "Livre de base p.275" },
  { id: "arm_systeme_de_camouflage_d_armure_au_ruthenium", nom: "Système de camouflage d’armure au ruthénium", capacite: 6, dispo: "8(I)", cout: null, coutNote: "Indice × 1 500 ¥", source: "Feu nourri p.70" },
  { id: "arm_tissage_mystique", nom: "Tissage mystique", capacite: null, capaciteNote: "Indice × 2", dispo: "6(L)", cout: null, coutNote: "Indice × 10 000 ¥", source: "Feu nourri p.70" },
  { id: "arm_trousse_a_medikit_sem", nom: "Trousse à médikit SEM", capacite: null, capaciteNote: "2-3", dispo: "2", cout: 200, source: "Feu nourri p.65" },
  { id: "arm_trousse_d_equipement_sem", nom: "Trousse d’équipement SEM", capacite: 2, dispo: "2", cout: 50, source: "Feu nourri p.65" },
];

/** Les armures et leur Capacité (Feu nourri p.152, Livre de base p.274-275). */
export const ArmuresSR6 = [
  { id: "ace_of_clubs", nom: "Ace of Clubs", sd: "+3", capacite: 7, ss: "+3", dispo: "5", cout: 1200, source: "Feu nourri p.67" },
  { id: "ace_of_coins", nom: "Ace of Coins", sd: "+3", capacite: 6, ss: "+6", dispo: "5", cout: 2100, source: "Feu nourri p.67" },
  { id: "ace_of_cups", nom: "Ace of Cups", sd: "+4", capacite: 8, ss: "+3", dispo: "5", cout: 1500, source: "Feu nourri p.67" },
  { id: "ace_of_diamonds", nom: "Ace of Diamonds", sd: "+4", capacite: 7, ss: "+3", dispo: "6", cout: 1400, source: "Feu nourri p.67" },
  { id: "ace_of_hearts", nom: "Ace of Hearts", sd: "+3", capacite: 7, ss: "+4", dispo: "5", cout: 1300, source: "Feu nourri p.67" },
  { id: "ace_of_spades", nom: "Ace of Spades", sd: "+3", capacite: 8, ss: "+3", dispo: "4", cout: 1100, source: "Feu nourri p.67" },
  { id: "ace_of_swords", nom: "Ace of Swords", sd: "+3", capacite: 6, ss: "+2", dispo: "4", cout: 1000, source: "Feu nourri p.67" },
  { id: "ace_of_wands", nom: "Ace of Wands", sd: "+3", capacite: 9, ss: "+4", dispo: "5", cout: 1400, source: "Feu nourri p.67" },
  { id: "ares_bug_stomper", nom: "Ares \"Bug Stomper\"", sd: "+8", capacite: 12, ss: "-10", dispo: "9(I)", cout: 55000, source: "Feu nourri p.62" },
  { id: "ares_bug_stomper_casque", nom: "Ares \"Bug Stomper\" — Casque", sd: "+2", capacite: 6, ss: "-4", dispo: "—", cout: 500, source: "Feu nourri p.62" },
  { id: "armure_anti_meurtre", nom: "Armure anti-meurtre", sd: "+4", capacite: 4, ss: "+2", dispo: "4 (L)", cout: 5000, source: "Feu nourri p.63" },
  { id: "armure_corporelle_integrale", nom: "Armure corporelle intégrale", sd: "+5", capacite: 10, dispo: "4 (L)", cout: 2000, source: "Livre de base p.274" },
  { id: "armure_corporelle_integrale_casque", nom: "Armure corporelle intégrale — Casque", sd: "+2", capacite: 6, dispo: "—", cout: 500, source: "Livre de base p.274" },
  { id: "armure_de_classe_militaire", nom: "Armure de classe militaire", sd: "+2", capacite: 2, dispo: "3", cout: 3000, source: "Feu nourri p.63" },
  { id: "armure_de_classe_militaire_legere", nom: "Armure de classe militaire — Légère", sd: "+8", capacite: 10, ss: "-6", dispo: "9(I)", cout: 29000, source: "Feu nourri p.63" },
  { id: "armure_de_classe_militaire_moyenne", nom: "Armure de classe militaire — Moyenne", sd: "+9", capacite: 12, ss: "-7", dispo: "9(I)", cout: 34000, source: "Feu nourri p.63" },
  { id: "armure_de_classe_militaire_lourde", nom: "Armure de classe militaire — Lourde", sd: "+10", capacite: 14, ss: "-8", dispo: "9(I)", cout: 39000, source: "Feu nourri p.63" },
  { id: "armure_de_classe_militaire_casque", nom: "Armure de classe militaire — Casque", sd: "+2", capacite: 8, ss: "-4", dispo: "9(I)", cout: null, coutNote: "coût au livre", source: "Feu nourri p.63" },
  { id: "armure_de_securite", nom: "Armure de sécurité", sd: "+6", capacite: 10, ss: "-6", dispo: "7(L)", cout: 12500, source: "Feu nourri p.63" },
  { id: "armure_de_securite_casque", nom: "Armure de sécurité — Casque", sd: "+2", capacite: 6, ss: "-4", dispo: "—", cout: 500, source: "Feu nourri p.63" },
  { id: "armure_parashield_protection_mystique", nom: "Armure Parashield \"Protection mystique\"", sd: "+4", capacite: 6, ss: "-2", dispo: "6(L)", cout: 11000, source: "Feu nourri p.64" },
  { id: "armure_realeather", nom: "Armure ReaLeather", sd: "+2", capacite: 2, ss: "+5", dispo: "4", cout: 3000, source: "Feu nourri p.66" },
  { id: "armure_securetech_invisi_shield", nom: "Armure SecureTech Invisi-Shield", sd: "+2", capacite: 4, dispo: "3", cout: 5000, source: "Feu nourri p.64" },
  { id: "big_game_hunter", nom: "Big Game Hunter", sd: "+4", capacite: 7, ss: "-4", dispo: "3", cout: 3500, source: "Feu nourri p.66" },
  { id: "bouclier_antiemeute", nom: "Bouclier antiémeute", sd: "+2", capacite: 2, dispo: "4", cout: 1200, source: "Livre de base p.275" },
  { id: "bouclier_balistique", nom: "Bouclier balistique", sd: "+2", capacite: 2, dispo: "4", cout: 900, source: "Livre de base p.275" },
  { id: "casque", nom: "Casque", sd: "+1", capacite: 4, dispo: "1", cout: 200, source: "Livre de base p.275" },
  { id: "collection_nightshade_moonsilver", nom: "Collection NightShade & Moonsilver", sd: "+3", capacite: 4, ss: "+6", dispo: "6", cout: 2800, source: "Feu nourri p.66" },
  { id: "collection_synergist", nom: "Collection Synergist", sd: "+2", capacite: 4, ss: "+3", dispo: "4", cout: 1900, source: "Feu nourri p.67" },
  { id: "combinaison_cameleon", nom: "Combinaison caméléon", sd: "+2", capacite: 4, dispo: "4 (I)", cout: 2000, source: "Livre de base p.274" },
  { id: "combinaison_urban_explorer", nom: "Combinaison Urban Explorer", sd: "+3", capacite: 6, dispo: "2", cout: 800, source: "Livre de base p.274" },
  { id: "costume_actioneer", nom: "Costume Actioneer", sd: "+2", capacite: 6, ss: "+2", dispo: "2", cout: 1500, source: "Feu nourri p.67" },
  { id: "costume_robe_armante", nom: "Costume/robe Armanté", sd: "+3", capacite: 4, ss: "+10", dispo: "7", cout: 5000, source: "Feu nourri p.67" },
  { id: "cyclewear", nom: "Cyclewear", sd: "+3", capacite: 8, ss: "-5", dispo: "3", cout: 500, source: "Feu nourri p.67" },
  { id: "gilet_pare_balles", nom: "Gilet pare-balles", sd: "+3", capacite: 6, dispo: "2", cout: 750, source: "Livre de base p.274" },
  { id: "gilet_pare_balles_tactique_sem", nom: "Gilet pare-balles tactique SEM", sd: "+3", capacite: 20, ss: "-2", dispo: "2", cout: 900, source: "Feu nourri p.64" },
  { id: "globetrotter", nom: "Globetrotter", sd: "+2", capacite: 4, ss: "+1", dispo: "1", cout: 600, source: "Feu nourri p.66" },
  { id: "masque_balistique", nom: "Masque balistique", sd: "+1", capacite: 4, ss: "-2", dispo: "2", cout: 200, source: "Feu nourri p.64" },
  { id: "manteau_renforce", nom: "Manteau renforcé", sd: "+3", capacite: 7, dispo: "2", cout: 900, source: "Livre de base p.274" },
  { id: "mortimer_of_london_costume_berwick", nom: "Mortimer of London — Costume Berwick", sd: "+3", capacite: 7, ss: "+4", dispo: "6", cout: 2300, source: "Feu nourri p.67" },
  { id: "mortimer_of_london_costume_crimson_sky", nom: "Mortimer of London — Costume Crimson Sky", sd: "+3", capacite: 6, ss: "+5", dispo: "6", cout: 2600, source: "Feu nourri p.67" },
  { id: "mortimer_of_london_costume_summit", nom: "Mortimer of London — Costume Summit", sd: "+3", capacite: 6, ss: "+4", dispo: "5", cout: 2400, source: "Feu nourri p.67" },
  { id: "mortimer_of_london_diamant", nom: "Mortimer of London — Diamant", sd: "+2", capacite: 2, ss: "+2", dispo: "2", cout: 500, source: "Feu nourri p.67" },
  { id: "mortimer_of_london_manteau", nom: "Mortimer of London — Manteau", sd: "+4", capacite: 7, ss: "+4", dispo: "5", cout: 2500, source: "Feu nourri p.67" },
  { id: "rapid_transit_basique", nom: "Rapid Transit — Basique", sd: "+2", capacite: 2, ss: "-1", dispo: "1", cout: 200, source: "Feu nourri p.67" },
  { id: "rapid_transit_elite", nom: "Rapid Transit — Élite", sd: "+2", capacite: 2, dispo: "2", cout: 300, source: "Feu nourri p.67" },
  { id: "rapid_transit_platine", nom: "Rapid Transit — Platine", sd: "+2", capacite: 2, ss: "+1", dispo: "2", cout: 400, source: "Feu nourri p.67" },
  { id: "rapid_transit_diamant", nom: "Rapid Transit — Diamant", sd: "+2", capacite: 2, ss: "+2", dispo: "2", cout: 500, source: "Feu nourri p.67" },
  { id: "securetech_skinshield", nom: "Securetech SkinShield", sd: "+2", capacite: 2, dispo: "3", cout: 3500, source: "Feu nourri p.64" },
  { id: "sleeping_tiger", nom: "Sleeping Tiger", sd: "+3", capacite: 6, ss: "+5", dispo: "4", cout: 4500, source: "Feu nourri p.67" },
  { id: "steampunk", nom: "Steampunk", sd: "+4", capacite: 10, ss: "+4", dispo: "4", cout: 4500, source: "Feu nourri p.67" },
  { id: "systeme_d_equipement_modulaire_harnais", nom: "Système d’équipement modulaire (Harnais)", sd: "—", capacite: null, capaciteNote: "10 ou 12+8 selon le harnais (p.65)", ss: "-4", dispo: "2", cout: 300, source: "Feu nourri p.65" },
  { id: "systeme_de_renfort_d_armure_securetech", nom: "Système de Renfort d’Armure Securetech", sd: "+1", capacite: 2, ss: "-1", dispo: "3", cout: 500, source: "Feu nourri p.65" },
  { id: "tenue_de_service_standard", nom: "Tenue de service standard", sd: "+2", capacite: 4, ss: "-2", dispo: "2", cout: 550, source: "Feu nourri p.65" },
  { id: "veste_en_cuir_synthetique", nom: "Veste en cuir synthétique", sd: "+1", capacite: 3, dispo: "1", cout: 300, source: "Livre de base p.275" },
  { id: "veste_pare_balles", nom: "Veste pare-balles", sd: "+4", capacite: 8, dispo: "2", cout: 1000, source: "Livre de base p.275" },
  { id: "vetements_pare_balles", nom: "Vêtements pare-balles", sd: "+2", capacite: 4, dispo: "2", cout: 500, source: "Livre de base p.275" },
  { id: "wild_hunt", nom: "Wild Hunt", sd: "+3", capacite: 8, ss: "-2", dispo: "3", cout: 3000, source: "Feu nourri p.67" },
];
