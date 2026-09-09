"use strict";

/* ============================================================
   CHARACTERS — bibliothèque de personnages jouables (PJ)
   ------------------------------------------------------------
   Panneau autonome (reste le point de CRÉATION, cf. CharGen). Sa colonne
   affiche l'arbre de dossiers **transverse** (DossierBar) : pas de
   `dom.sidebar` dans la config Collection ci-dessous, c'est `initPanel()`
   qui monte DossierBar sur #characters-group-list.

   ⚠ CETTE COLONNE NE FILTRE PAS LA GRILLE, et ce commentaire a longtemps
   prétendu le contraire (« la grille continue de filtrer sur `currentGroup` »).
   C'est faux depuis A4-bis.3b : `currentGroup` et `data.groups` ont disparu
   avec l'appartenance de dossier, `_applyCurrent()` est un no-op assumé, et
   `Collection._renderGrid` rend `data.all` en entier. La croyance a survécu
   dans le code : `renderLabel` comptait les PJ CONVOQUÉS sur le dossier
   sélectionné au-dessus d'une grille qui les montrait tous (mesuré :
   « R-T (0) » sur trois fiches). Corrigé — le libellé décrit la grille.

   Ce que la colonne fait vraiment ici, et qui suffit à la justifier : elle est
   le SEUL gestionnaire de l'arbre Campagne › Run › Scène de l'app (créer,
   renommer, supprimer, typer, dupliquer — rendus par `DossierBar._nodeHtml`,
   monté nulle part ailleurs), et elle désigne la cible du bouton ☆ Équipe.

   Les entités stockées ont la forme d'un PNJ (cf.
   EditionAnarchy2.generate()) avec la couche PJ en plus (isPC,
   gameLevel, keywords, behaviors, quotes, karma…), produite par
   App.editionModule.creation.buildCharacter() — voir
   js/controllers/chargen.js.
   ============================================================ */
import { CardRenderer } from "../widgets/card/cardrenderer.js";
import { Collection } from "../widgets/collection/collection.js";
import { Dialog } from "../widgets/kit/dialog.js";
import { DossierBar } from "../widgets/journal/dossierbar.js";
import { Dossiers } from "../widgets/journal/dossiers.js";
import { Storage } from "../core/storage.js";
import { Utils } from "../core/utils.js";

export const Characters = Object.assign(
  Collection.create({
    key: "characters",
    combatEligible: true,
    storageKeys: { all: "characters_all" },
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
      emptyBody: "Un nom suffit pour commencer — la fiche se complète ensuite, l'assistant complet reste à portée.",
      emptyCta: { label: "＋ PJ rapide", action: "pj-quick-add" },
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
      // Suivi de campagne : motifs du registre (mentionnent runs/contacts).
      ...((pnj.campaign && pnj.campaign.ledger) || []).map((e) => e.reason),
      // Recherche plein-fiche : compétences, équipement, sorts…
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
        Indice 1/3 de la DA (couleur constante partout) ; les indices
        2-3 (forme sur l'avatar, initiale) arrivent plus tard. */
    _PC_COLORS: ["#e0533d", "#3d90e0", "#3dbf6e", "#c9a13d", "#9d5fd6", "#3dc2c2"],

    /** PJ léger — « un PJ = un nom », persistant, hors chargen. Entité
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

    /** Liens contacts ↔ PJ qualifiés. Depuis VIS-15 (B0) l'arête vit dans
        le registre unique `RelationsStore` (record `type:"contact"`), plus sur
        l'entité PJ — sens inverse (« Connu de » sur la fiche contact) calculé à
        la volée par `CardRenderer._contactKnownBy` (CO-b), jamais stocké côté
        contact (une seule source de vérité). Loyauté en nombre libre, non
        contraint : vérifié dans les livres, SR5/SR6 ont une échelle 1-6 imprimée
        pour les contacts mais Anarchy (1 et 2) n'a aucune notion de loyauté
        (modèle « Niveau » différent) — imposer un clamp aurait inventé une règle. */
    addContactLink(pnjId, contactId, relation, loyalty) {
      const pnj = this.data.all.find((p) => p.id === pnjId);
      if (!pnj || !contactId) return;
      if (!RelationsStore.linkContact(pnjId, contactId, relation, loyalty)) {
        toast("Ce contact est déjà lié.", "warning");
        return;
      }
      CardRenderer.refresh(pnj);
    },

    removeContactLink(pnjId, contactId) {
      const pnj = this.data.all.find((p) => p.id === pnjId);
      if (!pnj) return;
      RelationsStore.unlinkContact(pnjId, contactId);
      CardRenderer.refresh(pnj);
    },

    /** Lien en masse depuis la fiche contact (BulkBar → ContactsBook.
        linkManyToPj) : rattache N contacts au même PJ en un seul save() +
        refresh, en sautant silencieusement les liens déjà présents (pas de
        toast par doublon, contrairement au lien individuel `addContactLink`).
        Liens nus (relation/loyauté vides) — la qualification se fait côté PJ
        Renvoie le nombre de liens réellement ajoutés. */
    addContactLinks(pnjId, contactIds) {
      const pnj = this.data.all.find((p) => p.id === pnjId);
      if (!pnj || !Array.isArray(contactIds)) return 0;
      let added = 0;
      for (const contactId of contactIds) {
        if (RelationsStore.linkContact(pnjId, contactId, "", null)) added++;
      }
      if (added) CardRenderer.refresh(pnj);
      return added;
    },

    /** Lie un ou plusieurs contacts à CHAQUE membre de l'équipe active
        (activeTeamMembers → addContactLinks par membre, doublons sautés). Un
        seul geste côté carnet pour rattacher un fixer/indic à toute la table.
        Renvoie { members, added } pour le récap toast côté ContactsBook. */
    linkContactsToActiveTeam(contactIds) {
      const members = this.activeTeamMembers();
      let added = 0;
      for (const pj of members) added += this.addContactLinks(pj.id, contactIds);
      return { members: members.length, added };
    },

    /** Équipe active pour « + Équipe » (Encounter.addTeam). Référence
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
      // A4-bis.3b (§5.3) : l'équipe active = les PJ CONVOQUÉS sur son nœud (plus
      // l'appartenance de groupe, retirée). Repli gracieux sur tous les PJ quand
      // aucun nœud n'est désigné ou qu'aucun PJ n'y est encore convoqué (cas MJ
      // à table unique — l'équipe = tous les PJ).
      const node = this._activeTeamNode();
      if (node) {
        const ids = new Set(DossierBar.convenedIds(node.id, { types: ["pj"] }));
        if (ids.size) return this.data.all.filter((p) => ids.has(p.id));
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

    /** Montage du panneau : la sidebar de dossiers est
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

    /** Le libellé décrit LA GRILLE, et rien d'autre.

        Il annonçait le dossier sélectionné dans la colonne et comptait les PJ
        qui y sont CONVOQUÉS — alors que la grille, elle, montre toute la
        bibliothèque depuis A4-bis.3b (`Collection._renderGrid` : « toute la
        bibliothèque, plus de filtrage par currentGroup »). Les deux moitiés de
        l'écran disaient donc deux choses différentes : mesuré, sélectionner un
        run affichait « R-T (0) » au-dessus de trois fiches bien présentes.

        Un compte qui ne compte pas ce qu'on voit est pire qu'une absence de
        compte : il apprend à ne plus lire la ligne. Le contexte, lui, n'est pas
        perdu — le fil d'Ariane et le sélecteur le portent en haut de tous les
        écrans, et le dossier sélectionné garde ses deux vraies fonctions ici :
        désigner l'équipe active (☆) et servir de gestionnaire de dossiers.

        Reste hors de portée de ce correctif, et inchangé : le compte ne suit pas
        le filtre TEXTE (la grille en montre alors moins). Le Hub sait le dire
        (« affichées/total », `hub.js:_renderLabel`) parce qu'il possède son
        propre filtre ; ici il faudrait envelopper `setFilter` du socle. */
    renderLabel() {
      const label = document.getElementById("characters-group-label");
      if (!label) return;
      label.textContent = `Tous les personnages (${this.data.all.length})`;
    },
  },
);

// Pont couche 5 (migration modules ES) — retiré en fin de migration.
window.Characters = Characters;
