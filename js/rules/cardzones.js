"use strict";

/* ============================================================
   CARD ZONES — registre déclaratif des zones de la carte PNJ.

   La « carte modulaire » (VIS-15, face-NŒUD) part d'un constat : le
   renderer ASSEMBLAIT déjà des zones autour du corps d'édition, mais
   l'ordre, les colonnes et les conditions étaient noyés dans des splices
   de chaîne au fil de `CardRenderer._body`. Ce module EXPLICITE cet
   implicite — une extraction, pas une reconstruction.

   Chaque zone déclare :
     - id       : identité stable (clé de continuité entre les lots)
     - label    : nom humain de la zone (annuaire ; pas injecté au rendu)
     - column   : "system" | "fiction" — l'axe de rangement (Lot 1, la clé
                  de tout) : « ça se lance/se calcule » → système (stats,
                  moniteur, initiative, armes, sorts, compétences, augment.,
                  équipement, modificateurs) ; « ça se joue/se raconte » →
                  fiction (incarnation, identités, contacts, backlinks,
                  dossiers, lore). L'ORDRE du tableau EST l'ordre de rendu
                  DANS une colonne.
     - when?(pnj, edModule) : prédicat de pertinence. `edModule` est le
                  module de l'édition DU pnj (dispatch par la donnée, jamais
                  `if(App.edition)`) → une zone peut se gater sur une capacité
                  d'édition (ex. un futur module Matrice `when:(p,ed)=>ed.hasMatrix`)
                  ou sur le pnj (ex. Contacts réservés aux PJ). Absent ⇒ toujours
                  candidate. Une zone sans rien à dire renvoie déjà "" — le
                  vidage propre (D4 : MÊME topographie, pas d'alternative par
                  édition) est acquis sans branche.
     - render(pnj, ctx) : produit le HTML de la zone. La PRODUCTION reste
                  dans le renderer (couche 4) ; la zone la DÉLÈGUE via
                  `ctx.r` — ce module n'importe personne et ne touche ni
                  DOM ni App ni Storage (profil feuille pure). `ctx.density`
                  est acheminé dès maintenant : le continuum de densité
                  (nœud→tuile→paysage→colonne) le consommera aux lots
                  suivants (L1 = densité 2, paysage).

   Interdits respectés : 0 branche `App.edition` (dispatch par la donnée
   du pnj, via `when?`) · 0 `Storage` (rien de persisté) · 0 handler inline
   (les sections déléguées gardent leur délégation `data-action`).
   ============================================================ */

export const CardZones = {
  /** Zones NEUTRES (cross-édition) montées par `CardRenderer._body` autour
      du corps d'édition. L'ORDRE de ce tableau EST l'ordre de rendu dans
      une colonne. Le corps d'édition lui-même (stats/moniteur/combat) est
      l'entrée de tête de la colonne « système » — pas une zone du registre,
      il est ajouté par `_body`. Relations (Contacts/Mentionné/Rangé dans) :
      montées ici plutôt que dans chaque module d'édition car elles ne lisent
      que les liens et les mentions — un seul point couvre les 4 éditions. */
  zones: [
    // Colonne FICTION — l'incarnation se lit en premier (« qui je suis »),
    // puis Identités (« qui je prétends être »), puis le tissu narratif.
    {
      id: "flavor",
      label: "Incarnation",
      column: "fiction",
      render: (pnj, ctx) => ctx.r._flavorSection(pnj, ctx.deps),
    },
    {
      id: "identities",
      label: "Identités",
      column: "fiction",
      render: (pnj, ctx) => ctx.r._topModulesHtml(pnj, ctx.deps),
    },
    {
      // Traits de métavariante (Estomac d'ogre, Vision nocturne…) : « ce que la
      // créature EST » → fiction, sous l'incarnation (choix user, équilibre).
      id: "meta-traits",
      label: "Traits raciaux",
      column: "fiction",
      render: (pnj, ctx) => ctx.r._metaTraitsSection(pnj),
    },
    {
      id: "creature-lore",
      label: "Lore créature",
      column: "fiction",
      render: (pnj, ctx) => ctx.r._creatureLoreSection(pnj),
    },
    {
      // « Contacts » n'a de sens que pour un PJ (son « ＋ » crée un lien de
      // contact) ; il s'affiche même sans contact lié.
      id: "contacts",
      label: "Contacts",
      column: "fiction",
      when: (pnj) => !!pnj.isPC,
      render: (pnj, ctx) => ctx.r._contactLinksSection(pnj),
    },
    {
      id: "backlinks",
      label: "Mentionné dans",
      column: "fiction",
      render: (pnj, ctx) => ctx.r._backlinksSection(pnj),
    },
    {
      id: "dossiers",
      label: "Rangé dans",
      column: "fiction",
      render: (pnj, ctx) => ctx.r._dossiersSection(pnj),
    },
    // Colonne SYSTÈME — après le corps d'édition : modificateurs d'objet
    // visibles (non auto-appliqués), qui « se calculent » donc système.
    {
      id: "situational-mods",
      label: "Modificateurs situationnels",
      column: "system",
      render: (pnj, ctx) => ctx.r._situationalMods(pnj),
    },
  ],

  /** Concatène, dans l'ordre déclaré, le HTML des zones de la `column`
      demandée pertinentes pour ce pnj (`when?`). `ctx = { r, deps, density }` :
      `r` est le renderer qui produit le HTML (injecté, jamais importé). Une
      zone qui n'a rien à dire renvoie "" — la jointure reste propre. */
  column(col, pnj, ctx) {
    const ed = ctx && ctx.edModule;
    return this.zones
      .filter((z) => z.column === col && (!z.when || z.when(pnj, ed)))
      .map((z) => z.render(pnj, ctx))
      .join("");
  },

  /** DENSITÉ 0 — la face-NŒUD, le cran le plus replié du continuum
      (0 nœud → 1 tuile → 2 paysage → 3 colonne). « Point + nom (+ type) » :
      la carte réduite à son identité, ce qu'un nœud de graphe montre.
      Contrat PARTAGÉ (couplage VIS-15) : la projection du graphe construit
      ses nœuds via cette seule fonction, plutôt que d'inliner « name || … ».
      Une entité ↔ un nœud, défini à un seul endroit — pas deux rendus
      d'identité. Le clic sur le nœud MONTE en densité 2 (CardPeek, VIS-14) :
      zoomer un nœud, c'est déplier la carte. Feuille pure : reçoit le
      descripteur résolu (id, name, type, pcColor?), n'accède à rien.
      NB : la densité 0 vit en SVG (graphe) et la densité 2 en HTML (carte) —
      le contrat partagé est l'IDENTITÉ, pas le médium de rendu. */
  density0(node) {
    return {
      id: node && node.id,
      label: (node && node.name) || "Sans nom",
      type: node && node.type,
      pcColor: (node && node.pcColor) || null,
    };
  },
};

// Pont couche 2 (migration modules ES) — retiré en fin de migration.
window.CardZones = CardZones;
