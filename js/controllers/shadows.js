"use strict";

/* ============================================================
   SHADOWS — Ombres portées (bibliothèque de PNJ)
   Layout : sidebar groupes à gauche, grille à droite
   Persistance, groupes et rendu délégués au socle Collection ;
   ce fichier ne porte que ce qui est propre au domaine PNJ :
   sauvegarde depuis le générateur et entités liées (drones,
   véhicules, esprits invoqués) qui suivent leur maître.
   ============================================================ */
import { CardRenderer } from "../widgets/card/cardrenderer.js";
import { Collection } from "../widgets/collection/collection.js";
import { ContactsBook } from "./contactsbook.js";
import { Gen } from "./generator.js";
import { RosterView } from "../widgets/collection/rosterview.js";
import { Utils } from "../core/utils.js";

export const Shadows = Object.assign(
  Collection.create({
    key: "shadows",
    combatEligible: true,
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
      // Recherche plein-fiche : compétences, équipement, sorts…
      Utils.entityContent(pnj),
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
    renderCard: (pnj, opts) =>
      opts && opts.context === "library" && RosterView.active()
        ? CardRenderer.renderRow(pnj, CardRenderer.liveDeps())
        : CardRenderer.render(pnj, ["edit", "remove"], {
            ...CardRenderer.liveDeps(),
            context: opts && opts.context,
          }),
    // Le carnet Contacts affiche directement la carte du PNJ déployé
    // (ContactsBook.deployPNJ, joint CO-d) : la rafraîchir si ce PNJ est
    // modifié/supprimé/re-déployé depuis la grille des Ombres elle-même.
    onChange: () => {
      if (typeof ContactsBook !== "undefined") ContactsBook.refreshGrid();
    },
  }),
  {
    /* ---- Sauvegarder un PNJ depuis le générateur ----
       Sauvegarde toujours sans groupe : l'assignation se fait ensuite
       via le déclencheur de groupes (popover) présent sur la carte,
       commun aux trois collections. */
    savePNJ(id) {
      const pnj = Gen.findInPool(id);
      if (!pnj) {
        toast("PNJ introuvable dans le pool.", "warning");
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
      // Classe dans le dossier de destination courant (piloté par DossierBar).
      if (this.currentGroup && this.currentGroup !== "all") {
        (this.data.groups[this.currentGroup] ||= []).push(pnj.id);
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

    /* ---- Dupliquer un PNJ (et ses entités liées : drones/véhicules,
       esprits invoqués qui suivent leur maître) ---- */
    duplicatePNJ(id) {
      const original = this.data.all.find((p) => p.id === id);
      if (!original) {
        toast("PNJ introuvable.", "warning");
        return;
      }

      const copy = structuredClone(original);
      copy.id = Utils.uid();
      copy.name = `${original.name} (copie)`;
      this.data.all.push(copy);

      const children = this.data.all.filter(
        (e) => e.ownerId === original.id && e.id !== copy.id,
      );
      for (const child of children) {
        const childCopy = structuredClone(child);
        childCopy.id = Utils.uid();
        childCopy.ownerId = copy.id;
        this.data.all.push(childCopy);
      }

      for (const g of this.groupsOf(original.id)) {
        (this.data.groups[g] ||= []).push(copy.id);
      }

      this.save();
      this.render();
      toast(`✓ ${copy.name} dupliqué.`);
    },
  },
);

// Pont couche 5 (migration modules ES) — retiré en fin de migration.
window.Shadows = Shadows;
