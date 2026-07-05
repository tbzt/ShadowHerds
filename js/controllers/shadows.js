"use strict";

/* ============================================================
   SHADOWS — Ombres portées (bibliothèque de PNJ)
   Layout : sidebar groupes à gauche, grille à droite
   Persistance, groupes et rendu délégués au socle Collection ;
   ce fichier ne porte que ce qui est propre au domaine PNJ :
   sauvegarde depuis le générateur et entités liées (drones,
   véhicules, esprits invoqués) qui suivent leur maître.
   ============================================================ */
const Shadows = Object.assign(
  Collection.create({
    key: "shadows",
    storageKeys: { all: "shadows_all", groups: "shadows_groups" },
    dom: { grid: "shadows-grid", sidebar: "shadows-group-list", label: "shadows-group-label" },
    labels: {
      removeConfirm: (key) =>
        `Supprimer le groupe "${key}" ? (Les PNJ restent dans les Ombres.)`,
      allSummary: (n) => `Tous les figurants (${n})`,
      emptyTitle: "Aucun figurant ici",
      emptyBody: "Générez des PNJ et sauvegardez-les depuis le générateur.",
      noMatch: (q) => `Aucun figurant ne correspond à « ${q} ».`,
    },
    searchFields: (pnj) => [
      pnj.name,
      pnj.alias,
      pnj.civilName,
      pnj.archetype,
      pnj.meta,
      pnj.metavariant,
      pnj.infected,
    ],
    linked: {
      isChild: (e) => !!e.ownerId,
      ownerOf: (e) => e.ownerId,
      renderChild: (e) => {
        const sub = CardRenderer.render(e, ["remove"]);
        sub.classList.add("vehicle-card");
        return sub;
      },
    },
    renderCard: (pnj) => CardRenderer.render(pnj, ["edit", "remove"]),
  }),
  {
    /* ---- Sauvegarder un PNJ depuis le générateur ----
       Sauvegarde toujours sans groupe : l'assignation se fait ensuite
       via le déclencheur de groupes (popover) présent sur la carte,
       commun aux trois collections. */
    savePNJ(id) {
      const pnj = Gen.findInPool(id);
      if (!pnj) {
        toast("PNJ introuvable dans le pool.");
        return;
      }
      if (this.data.all.find((p) => p.id === id)) {
        toast("Déjà sauvegardé dans les Ombres.");
        return;
      }

      this.data.all.push(pnj);
      // Entités liées (drones/véhicules déployés) : suivent leur maître.
      if (Gen.pool) {
        const linked = Gen.pool.filter(
          (e) => e.ownerId === pnj.id && !this.data.all.some((p) => p.id === e.id),
        );
        for (const e of linked) {
          this.data.all.push(e);
          Gen.pool = Gen.pool.filter((p) => p.id !== e.id);
        }
      }
      this.save();
      this.render();
      toast(`✓ ${pnj.name} ajouté aux Ombres.`);

      // Basculer la card du générateur en mode « sauvegardé » : on change
      // ses actions (data-saved-actions) puis on rafraîchit — refresh()
      // met à jour TOUTES les copies (générateur + Ombres), chacune avec
      // ses propres actions.
      const card = document.querySelector(
        `#panel-generator .pnj-card[data-id="${pnj.id}"]`,
      );
      if (card) {
        const footer = card.querySelector(".pnj-card-footer");
        if (footer) footer.dataset.savedActions = JSON.stringify(["saved", "edit"]);
      }
      CardRenderer.refresh(pnj);
    },

    /* ---- Supprimer un PNJ (et ses entités liées, via le socle) ---- */
    removePNJ(id) {
      this.remove(id);
    },

    /* ---- Sauvegarder tous les PNJ visibles dans le groupe courant ---- */
    saveAllVisible() {
      if (this.currentGroup === "all") {
        toast("Sélectionnez un groupe d'abord.");
        return;
      }
      const ids = this.data.groups[this.currentGroup] || [];
      let added = 0;
      for (const pnj of this.data.all) {
        if (!ids.includes(pnj.id)) {
          this.data.groups[this.currentGroup].push(pnj.id);
          added++;
        }
      }
      this.save();
      this.render();
      toast(
        added > 0
          ? `${added} PNJ ajoutés au groupe.`
          : "Tous les PNJ sont déjà dans ce groupe.",
      );
    },
  },
);
