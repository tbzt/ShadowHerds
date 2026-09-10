"use strict";

/* ============================================================
   SR6 — MODIFICATIONS DE VÉHICULE, relevé du 2026-09-10
   ------------------------------------------------------------
   4 modifications — Livre de base p.303.

   ⚠ RÈGLE À NE PAS PERDRE : « Les véhicules peuvent être équipés d'un nombre de montures d'arme égal à leur Résistance non augmentée / 3 (arrondir à l'inférieur) » (p.303). Une monture RENFORCÉE en vaut DEUX.

   ⚠ `supplement: true` marque un coût ADDITIONNEL (le livre l'écrit
   « +500 ¥ ») : il s'ajoute au prix du véhicule, il ne le remplace pas.

   ⚠ CE RELEVÉ EST CELUI DU LIVRE DE BASE, ET RIEN DE PLUS. Le supplément
   rigger « À tombeau ouvert » porte un système COMPLET à emplacements de mods
   (châssis, habillage, enveloppe…) : 81 tables sur 24 pages, avec une économie
   d'emplacements comparable à celle des modules de vie. Ce n'est pas une
   extension de cette table, c'est un autre système — à traiter comme tel, pas
   à greffer ici.
   ============================================================ */

export const VehiculeModsSR6 = [
  { id: "module_d_interface_pour_rigger", nom: "Module d’interface pour rigger", dispo: "2", cout: 1000, source: "Livre de base p.303" },
  { id: "monture_d_arme_standard", nom: "Monture d’arme standard", dispo: "4 (I)", cout: 2500, source: "Livre de base p.303" },
  { id: "monture_d_arme_renforcee", nom: "Monture d’arme renforcée", dispo: "6 (I)", cout: 5000, source: "Livre de base p.303" },
  { id: "mode_manuel", nom: "Mode manuel", dispo: "+1", cout: 500, supplement: true, source: "Livre de base p.303" },
];
