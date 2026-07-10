"use strict";

/* ============================================================
   CHARACTERS — bibliothèque de personnages jouables (PJ)
   ------------------------------------------------------------
   Panneau autonome, distinct des « Ombres portées » (PNJ) : sidebar
   de groupes + grille propres, via le socle Collection (même brique
   que Shadows/ContactsBook/Servers), mais SANS passer par le Hub ni
   DossierBar — un PJ n'est pas rangé dans les mêmes dossiers qu'un
   PNJ généré.

   Les entités stockées ont la forme d'un PNJ (cf.
   EditionAnarchy2.generate()) avec la couche PJ en plus (isPC,
   gameLevel, keywords, behaviors, quotes, karma…), produite par
   App.editionModule.creation.buildCharacter() — voir
   js/controllers/chargen.js.
   ============================================================ */
const Characters = Object.assign(
  Collection.create({
    key: "characters",
    storageKeys: { all: "characters_all", groups: "characters_groups" },
    dom: {
      grid: "characters-grid",
      sidebar: "characters-group-list",
      label: "characters-group-label",
    },
    labels: {
      removeConfirm: (key) =>
        `Supprimer le groupe "${key}" ? (Les personnages restent dans la bibliothèque.)`,
      allSummary: (n) => `Tous les personnages (${n})`,
      groupSummary: (name, n) => `${name} (${n})`,
      emptyTitle: "Aucun personnage",
      emptyBody: "Créez votre premier personnage avec l'assistant.",
      noMatch: (q) => `Aucun personnage ne correspond à « ${q} ».`,
      removed: (e) => `${e.name} supprimé.`,
    },
    searchFields: (pnj) => [
      pnj.name,
      pnj.meta,
      pnj.role,
      pnj.gameLevel,
      pnj.archetypeTable,
      ...(pnj.keywords || []),
    ],
    renderCard: (pnj) => CardRenderer.render(pnj, ["remove-pj"]),
  }),
  {
    /** Ajoute un PJ déjà construit (buildCharacter) à la bibliothèque. */
    add(pnj) {
      this.data.all.push(pnj);
      this.save();
      this.render();
      toast(`✓ ${pnj.name} ajouté aux Personnages.`);
    },

    removePJ(id) {
      this.remove(id);
    },
  },
);
