"use strict";

/* ============================================================
   ÉDITION ANARCHY 1RE — Shadowrun Anarchy (1re édition)
   Sources : sran_01_anarchy_web_v1a.pdf (livre de base) +
   sran_03_anarchistes_web_v0.pdf (Anarchistes).

   SCAFFOLDING (isWip) — clone structurel d'EditionAnarchy2.
   Les données (statBlocks, catalogue d'armes, esprits, matrice, drogues…)
   sont pour l'instant celles de la V2, en PLACEHOLDER : à remplacer par les
   valeurs V1 en Phase 3, en surchargeant les propriétés concernées ici
   (ex. EditionAnarchy1.statBlocks = { … }). Seules les métadonnées et le flag
   WIP sont surchargés pour le moment.

   Le générateur, les jets, la Matrice et la carte fonctionnent dès à présent :
   - generate() est agnostique (capture this.id → PNJ taggés "anarchy1") ;
   - usesRiskPanel est hérité (true) → tous les chemins « famille Anarchy »
     de la Phase 1 s'appliquent automatiquement ;
   - les catalogues indexés par édition exposent un alias anarchy1 → anarchy2
     (voir js/rules & js/catalogs) tant que les données V1 ne sont pas saisies.

   Doit être chargé APRÈS js/editions/anarchy2.js (dépend d'EditionAnarchy2).
   ============================================================ */
const EditionAnarchy1 = Object.assign({}, EditionAnarchy2, {
  id: "anarchy1",
  label: "Anarchy 1re",
  badgeLabel: "ANARCHY 1RE",
  isWip: true,
});
