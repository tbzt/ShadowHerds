"use strict";

/* ============================================================
   SR5 — MODIFICATIONS DE VÉHICULE, relevé du 2026-09-10
   ------------------------------------------------------------
   4 modifications — Livre de Règles p.465.

   Le livre ne borne pas explicitement le nombre de montures en SR5 : la limite se lit sur la Carrosserie du véhicule.

   ⚠ `supplement: true` marque un coût ADDITIONNEL (le livre l'écrit
   « +500 ¥ ») : il s'ajoute au prix du véhicule, il ne le remplace pas.

   ⚠ CE RELEVÉ EST CELUI DU LIVRE DE BASE, ET RIEN DE PLUS. Le supplément
   rigger « À tombeau ouvert » porte un système COMPLET à emplacements de mods
   (châssis, habillage, enveloppe…) : 81 tables sur 24 pages, avec une économie
   d'emplacements comparable à celle des modules de vie. Ce n'est pas une
   extension de cette table, c'est un autre système — à traiter comme tel, pas
   à greffer ici.
   ============================================================ */

export const VehiculeModsSR5 = [
  { id: "module_d_interface_pour_rigging", nom: "Module d’interface pour rigging", dispo: "4", cout: 1000, source: "Livre de Règles p.465" },
  { id: "monture_d_arme_standard", nom: "Monture d’arme standard", dispo: "8P", cout: 2500, source: "Livre de Règles p.465" },
  { id: "monture_d_arme_renforcee", nom: "Monture d’arme renforcée", dispo: "14P", cout: 5000, source: "Livre de Règles p.465" },
  { id: "operation_manuelle", nom: "Opération manuelle", dispo: "+1", cout: 500, supplement: true, source: "Livre de Règles p.465" },
];
