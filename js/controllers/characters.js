"use strict";

/* ============================================================
   CHARACTERS — bibliothèque de personnages jouables (PJ)
   ------------------------------------------------------------
   Panneau autonome (reste le point de CRÉATION, cf. CharGen), mais sa
   sidebar affiche désormais l'arbre de dossiers **transverse**
   (DossierBar), le même que Ombres portées — CH-A3 polish : un PJ rangé
   dans « Run 1 » y apparaît, qu'on vienne d'ici ou d'Ombres portées.
   Pas de `dom.sidebar` dans la config Collection ci-dessous : c'est
   `initPanel()` qui monte DossierBar sur #characters-group-list, la
   grille (`_renderGrid` du socle) continue de filtrer sur `currentGroup`,
   déjà tenu à jour par `DossierBar._applyCurrent()` (Characters fait
   partie de `DossierBar._cols()` depuis CH-A3).

   Les entités stockées ont la forme d'un PNJ (cf.
   EditionAnarchy2.generate()) avec la couche PJ en plus (isPC,
   gameLevel, keywords, behaviors, quotes, karma…), produite par
   App.editionModule.creation.buildCharacter() — voir
   js/controllers/chargen.js.
   ============================================================ */
const Characters = Object.assign(
  Collection.create({
    key: "characters",
    combatEligible: true,
    storageKeys: { all: "characters_all", groups: "characters_groups" },
    dom: {
      grid: "characters-grid",
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
      this.renderLabel();
      toast(`✓ ${pnj.name} ajouté aux Personnages.`);
    },

    removePJ(id) {
      this.remove(id);
    },

    /** Montage du panneau (CH-A3 polish) : la sidebar de dossiers est
        transverse (DossierBar), pas propre à Characters — même patron que
        Hub.initPanel(). `_renderSidebar()` du socle Collection est un no-op
        ici (pas de `dom.sidebar` dans la config) : c'est cette méthode qui
        met à jour le libellé (`dom.label` visé directement, hors socle).
        L'abonné appelle `_renderGrid()` (privé), PAS `render()` : DossierBar.
        init() câble déjà `col._cfg.onChange = () => DossierBar.refresh()`
        sur chaque collection — `render()` déclencherait onChange → refresh
        → notify → ce même abonné → render() → boucle infinie. */
    initPanel() {
      DossierBar.mount("characters-group-list");
      DossierBar.subscribe(() => {
        this._renderGrid();
        this.renderLabel();
      });
      DossierBar.refresh(); // rend l'arbre + notifie → grille/libellé ici
      this.renderLabel();
    },

    renderLabel() {
      const label = document.getElementById("characters-group-label");
      if (!label) return;
      const node = DossierBar.currentNode();
      const base = node ? node.name : "Tous les personnages";
      label.textContent = `${base} (${DossierBar.memberIds(this).length})`;
    },
  },
);
