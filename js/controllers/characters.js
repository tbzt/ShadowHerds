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
      // Recherche plein-fiche (F1) : compétences, équipement, sorts…
      Utils.entityContent(pnj),
    ],
    renderCard: (pnj) => CardRenderer.render(pnj, ["edit", "remove-pj"]),
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

    /** Palette d'accent des PJ légers — rotation, pas de branche d'édition.
        Indice 1/3 de la DA (couleur constante partout, cf. E6) ; les indices
        2-3 (forme sur l'avatar, initiale) arrivent au chantier E6. */
    _PC_COLORS: ["#e0533d", "#3d90e0", "#3dbf6e", "#c9a13d", "#9d5fd6", "#3dc2c2"],

    /** E1 : PJ léger — « un PJ = un nom », persistant, hors chargen. Entité
        volontairement squelette : CardRenderer/EditModal la détectent via
        `pcLight` et rendent un gabarit minimal commun (aucune branche
        `App.edition`, la fiche complète du chargen n'est pas concernée). */
    addLight(name) {
      const n = (name || "").trim();
      if (!n) return null;
      const pnj = {
        id: "char-" + Utils.uid(),
        name: n,
        edition: App.edition,
        isPC: true,
        pcLight: true,
        player: "",
        notes: "",
        pcColor: this._PC_COLORS[this.data.all.length % this._PC_COLORS.length],
      };
      this.data.all.push(pnj);
      this.save();
      this.render();
      this.renderLabel();
      toast(`✓ ${pnj.name} ajouté à l'équipe.`);
      return pnj;
    },

    /** Dialog interne (jamais de prompt() natif) déclenché par le bouton
        « ＋ PJ rapide » du panneau Personnages. */
    async promptAddLight() {
      const name = await Dialog.prompt({
        title: "Ajouter un PJ",
        label: "Nom du PJ",
        placeholder: "Nom du personnage joueur",
        confirmLabel: "Ajouter",
      });
      if (name === null) return;
      this.addLight(name);
    },

    removePJ(id) {
      this.remove(id);
    },

    /** E5 : liens contacts ↔ PJ qualifiés. `contactLinks` additif sur
        l'entité PJ (vit dans `characters_all`, aucune nouvelle clé) — sens
        inverse (« Connu de » sur la fiche contact) calculé à la volée par
        `ContactRenderer`, jamais stocké côté contact (une seule source de
        vérité). Loyauté en nombre libre, non contraint : vérifié dans les
        livres, SR5/SR6 ont une échelle 1-6 imprimée pour les contacts mais
        Anarchy (1 et 2) n'a aucune notion de loyauté (modèle « Niveau »
        différent) — imposer un clamp aurait inventé une règle. */
    addContactLink(pnjId, contactId, relation, loyalty) {
      const pnj = this.data.all.find((p) => p.id === pnjId);
      if (!pnj || !contactId) return;
      if (!Array.isArray(pnj.contactLinks)) pnj.contactLinks = [];
      if (pnj.contactLinks.some((l) => l.contactId === contactId)) {
        toast("Ce contact est déjà lié.", "warning");
        return;
      }
      pnj.contactLinks.push({ contactId, relation: relation || "", loyalty: loyalty ?? null });
      this.save();
      CardRenderer.refresh(pnj);
    },

    removeContactLink(pnjId, contactId) {
      const pnj = this.data.all.find((p) => p.id === pnjId);
      if (!pnj || !Array.isArray(pnj.contactLinks)) return;
      pnj.contactLinks = pnj.contactLinks.filter((l) => l.contactId !== contactId);
      this.save();
      CardRenderer.refresh(pnj);
    },

    /** E2 : équipe active pour « + Équipe » (Encounter.addTeam). Référence
        l'ID d'un dossier existant (Dossiers) — jamais son nom : un dossier
        renommé (DossierBar.renameDossier) cascade déjà le renommage dans
        `Characters.data.groups`, mais une clé stockée à part comme celle-ci
        n'aurait pas suivi si elle gardait le nom — bug trouvé en vérifiant.
        L'id, lui, ne change jamais au renommage. `null` = tous les PJ
        (défaut, table unique). Clé légère dédiée, hors du cycle load()/
        save() du socle (lue à la demande, jamais mise en cache). */
    getActiveTeamId() {
      return Storage.get("characters_team", null);
    },
    setActiveTeamId(id) {
      Storage.set("characters_team", id || null);
    },
    /** Dossier de l'équipe active, ou null si désigné mais supprimé depuis
        (repli silencieux sur « tous les PJ », même garde que ci-dessous). */
    _activeTeamNode() {
      const id = this.getActiveTeamId();
      return id ? Dossiers.get(id) : null;
    },
    activeTeamMembers() {
      const node = this._activeTeamNode();
      if (node && this.data.groups[node.name]) {
        const ids = new Set(this.data.groups[node.name]);
        return this.data.all.filter((p) => ids.has(p.id));
      }
      return this.data.all.slice();
    },

    /** Désigne le dossier affiché dans le panneau Personnages comme équipe
        active — redésigner le même dossier réinitialise à « tous les PJ »
        (le MJ table unique n'a jamais besoin d'y toucher). */
    toggleActiveTeam() {
      const node = DossierBar.currentNode();
      if (!node) {
        toast("Ouvrez un dossier de PJ pour le désigner comme équipe.", "warning");
        return;
      }
      const current = this.getActiveTeamId();
      if (current === node.id) {
        this.setActiveTeamId(null);
        toast("Équipe active : tous les PJ.");
      } else {
        this.setActiveTeamId(node.id);
        toast(`Équipe active : ${node.name}.`);
      }
      this._renderActiveTeamLabel();
    },

    _renderActiveTeamLabel() {
      const btn = document.getElementById("btn-active-team");
      if (!btn) return;
      const node = this._activeTeamNode();
      btn.textContent = node ? `★ Équipe : ${node.name}` : "☆ Équipe : Tous les PJ";
      btn.classList.toggle("is-active-team", !!node);
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
      this._toggleChargenButton();
      this._renderActiveTeamLabel();
    },

    /** Seule Anarchy 2 expose un assistant de création complet
        (`App.editionModule.creation`, cf. `chargen.js`) ; masquer le bouton
        ailleurs plutôt que laisser l'utilisateur cliquer dans le vide (le
        toast « non disponible » de `CharGen.open()` restait bizarre). Lecture
        de l'API neutre de l'édition, aucune branche `App.edition`. */
    _toggleChargenButton() {
      const btn = document.getElementById("btn-chargen-open");
      if (!btn) return;
      const available = !!(App.editionModule && App.editionModule.creation);
      btn.toggleAttribute("hidden", !available);
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
