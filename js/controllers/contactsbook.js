"use strict";

/* ============================================================
   CONTACTS BOOK — bibliothèque de contacts persistants.

   Domaine contact, brique « bibliothèque » : contacts persistants
   avec groupes et notes (socle Collection, structure miroir de
   Shadows). Reçoit ses contacts de Contacts/ContactGen ; c'est la
   seule des trois briques contact qui persiste.
   ============================================================ */
const _contactsCollection = Collection.create(
  {
    key: "contacts",
    storageKeys: { all: "contacts_all", groups: "contacts_groups" },
    // dragGrid (Vague B1) : dom.grid n'est jamais monté dans le DOM (les
    // contacts ne s'affichent QUE via l'écran de génération, cf.
    // _renderGenGrid) — le glisser-déposer doit viser le conteneur réel.
    dom: {
      grid: "contacts-grid",
      dragGrid: "contacts-gen-grid",
      sidebar: "contacts-group-list",
      label: "contacts-group-label",
    },
    labels: {
      allSummary: (n) => `Tous les contacts (${n})`,
      emptyTitle: "Aucun contact ici",
      emptyBody: "Générez des contacts avec le bouton ci-dessus.",
      noMatch: (q) => `Aucun contact ne correspond à « ${q} ».`,
    },
    searchFields: (c) => [c.name, c.role, c.metatype, c.desc],
    // CO-b : la carte contact converge sur CardRenderer (ex-`ContactRenderer`,
    // dissous). `editable:true` (D-edit-A) préserve l'édition en ligne de la
    // fiche contact ; `contact-card` reste posée sur la racine — seul delta
    // CSS restant après convergence avec la coquille rail-carnet (merge) :
    // le liseré `--accent2` du haut de carte
    // (`.contact-card .pnj-card-frame::before`).
    // CO-d (joint déployé, cible) : une fois déployé, on ne ré-imbrique plus
    // une carte contact autour du PNJ — on rend DIRECTEMENT la carte du PNJ
    // (Combat/Capacités/modules + module Relation qui lit ce contact via
    // `sourceContactId`, cf. `CardRenderer._relationSource`). Fin du double
    // chrome hérité de `ContactRenderer`/CO-b. Rafraîchi automatiquement au
    // déploiement par l'`onChange` déjà câblé côté `Shadows` (ContactsBook.
    // refreshGrid()) — aucune plomberie neuve.
    renderCard: (c, ctx) => {
      const deployed = Shadows.data.all.find((p) => p.sourceContactId === c.id);
      const el = deployed
        ? CardRenderer.render(deployed, ["edit", "remove"], {
            ...CardRenderer.liveDeps(),
            context: ctx && ctx.context,
          })
        : CardRenderer.render(c, [], {
            ...CardRenderer.liveDeps(),
            editable: true,
            context: ctx && ctx.context,
          });
      el.classList.add("contact-card");
      return el;
    },
    // Rattachement en masse à un PJ (BulkBar) : les liens vivent côté PJ
    // (Characters.contactLinks), le contact n'est que la cible du lien.
    pjLinkable: true,
  },
);
// Capturé avant extension pour pouvoir envelopper le `load` du socle (CO-a).
const _contactsBaseLoad = _contactsCollection.load;
import { CardRenderer } from "../widgets/card/cardrenderer.js";
import { Characters } from "./characters.js";
import { Coherence } from "../rules/coherence.js";
import { Collection } from "../widgets/collection.js";
import { ContactGen } from "./contactgen.js";
import { Contacts } from "./contacts.js";
import { DossierBar } from "../widgets/dossierbar.js";
import { Flavor } from "../rules/flavor.js";
import { Shadows } from "./shadows.js";

export const ContactsBook = Object.assign(_contactsCollection, {
    /* ---- Normalisation à la lecture (CO-a, carte Contact) : les contacts
       déjà sauvegardés n'ont pas de `type`. On rétro-pose `type:"contact"`
       en mémoire pour que la garde `CardRenderer.isContact` (consommée à
       partir de CO-b) soit vraie partout, sans écriture au boot — la
       persistance suit le prochain `save()` naturel (champ additif, aucun
       bump de schéma). Couvre boot (app.js) et restauration (backup.js). ---- */
    load() {
      _contactsBaseLoad.call(this);
      for (const c of this.data.all) {
        if (c && !c.type) c.type = "contact";
      }
    },

    /* ---- Générer et ajouter ---- */
    generate() {
      const c = Contacts.generate();
      this.data.all.push(c);
      // Classe dans le dossier de destination courant (piloté par DossierBar).
      const group =
        this.currentGroup && this.currentGroup !== "all" ? this.currentGroup : null;
      if (group) {
        (this.data.groups[group] ||= []).push(c.id);
      }
      this.save();
      this.render();
      // Zone d'essai / undo (parité avec le pool PNJ du Générateur) : un
      // contact généré doit pouvoir être écarté sans passer par la
      // suppression explicite de la fiche.
      const restore = () => {
        this.data.all = this.data.all.filter((x) => x.id !== c.id);
        if (group) {
          this.data.groups[group] = (this.data.groups[group] || []).filter(
            (id) => id !== c.id,
          );
        }
        this.save();
        this.render();
      };
      toastUndo(`✓ ${c.name} ajouté aux contacts.`, restore);
    },

    /* ---- Créer un contact saisi à la main ----
       Ajout rapide depuis une fiche PJ (ContactCreate) : crée un vrai contact
       du carnet à partir des champs saisis (seul le nom est requis, cf.
       ContactGen.buildManual), le range dans le dossier courant si applicable
       (même logique que generate()), persiste, et le renvoie pour que
       l'appelant le lie au PJ (Characters.addContactLink). Pas de zone d'essai/
       undo ici : la création est intentionnelle, pas un tirage à écarter. */
    createManual(fields, edition = App.edition) {
      const c = ContactGen.buildManual(edition, fields);
      this.data.all.push(c);
      const group =
        this.currentGroup && this.currentGroup !== "all" ? this.currentGroup : null;
      if (group) {
        (this.data.groups[group] ||= []).push(c.id);
      }
      this.save();
      this.render();
      return c;
    },

    /* ---- Rattachement en masse à un PJ (BulkBar → _cfg.pjLinkable) ----
       Les liens sont stockés côté PJ (Characters.contactLinks) ; ces deux
       méthodes sont l'API que BulkBar lit sur la collection active, sans rien
       connaître du domaine contact/PJ. */
    pjLinkOptions() {
      if (typeof Characters === "undefined") return [];
      return Characters.data.all.map((p) => ({ id: p.id, name: p.name }));
    },
    linkManyToPj(ids, pjId) {
      if (typeof Characters === "undefined" || !pjId) return;
      const pj = Characters.data.all.find((p) => p.id === pjId);
      const added = Characters.addContactLinks(pjId, ids);
      const name = pj ? pj.name : "ce PJ";
      toast(
        added
          ? `${added} contact${added > 1 ? "s" : ""} lié${added > 1 ? "s" : ""} à ${name}.`
          : `Déjà liés à ${name}.`,
        added ? "success" : "warning",
      );
      this.clearSelection();
      this.render();
    },

    /** Libellé de l'entrée « équipe » en tête des sélecteurs de PJ (fiche
        contact + BulkBar) — reflète le dossier désigné comme équipe active, ou
        « tous les PJ » quand aucun (cas table unique). Vocabulaire ★/☆ aligné
        sur le bouton #btn-active-team (Characters._renderActiveTeamLabel). */
    teamLinkLabel() {
      if (typeof Characters === "undefined") return "★ L'équipe";
      const node = Characters._activeTeamNode();
      return node ? `★ Équipe : ${node.name}` : "★ L'équipe (tous les PJ)";
    },

    /** Lie un/des contacts à toute l'équipe active en un geste (mono-contact
        depuis la carte via linkManyToTeam([id]), ou sélection depuis BulkBar).
        Délègue à Characters.linkContactsToActiveTeam ; render() rafraîchit tous
        les chips « Connu de » d'un coup. */
    linkManyToTeam(ids) {
      if (typeof Characters === "undefined") return;
      const { members, added } = Characters.linkContactsToActiveTeam(ids);
      if (!members) {
        toast("Aucun PJ dans l'équipe active.", "warning");
        return;
      }
      toast(
        added
          ? `${added} lien${added > 1 ? "s" : ""} ajouté${added > 1 ? "s" : ""} à l'équipe (${members} PJ).`
          : "Déjà liés à l'équipe.",
        added ? "success" : "warning",
      );
      this.clearSelection();
      this.render();
    },

    /* ---- Édition inline ---- */
    editField(id, field, value) {
      const c = this.data.all.find((x) => x.id === id);
      if (c) {
        if (field === "influence" || field === "loyaute" || field === "level") {
          c[field] = parseInt(value, 10);
        } else {
          c[field] = value;
        }
        this.save();
      }
    },

    /* ---- Édition du portrait (flavor) ---- */
    editFlavor(id, field, value) {
      const c = this.data.all.find((x) => x.id === id);
      if (!c) return;
      if (!c.flavor) c.flavor = {};
      if (field === "age") {
        const n = parseInt(value, 10);
        if (Number.isFinite(n)) c.flavor.age = n;
      } else {
        c.flavor[field] = value;
      }
      this.save();
    },

    /* ---- Relancer tout le portrait d'un contact ---- */
    rerollFlavor(id) {
      const c = this.data.all.find((x) => x.id === id);
      if (!c || typeof Flavor === "undefined") return;
      c.flavor = null;
      Flavor.apply(c);
      this.save();
      this.render();
    },

    /* ---- Déployer un PNJ complet depuis un contact ----
       Le vocabulaire des contacts ne correspond pas aux archétypes nommés
       du générateur : on ne mappe que le milieu (ContactGen.milieuForContact,
       depuis le tag réseau/catégorie du contact) et on laisse Coherence
       choisir un archétype cohérent, comme la « composition libre » du
       Générateur. Le PNJ va directement aux Ombres (data.all de Shadows,
       même accès direct que Shadows.savePNJ fait déjà vers Gen.pool) ; sa
       carte remplace directement celle du contact dans ce carnet dès qu'il
       est déployé (renderCard, joint CO-d — plus d'imbrication). */
    deployPNJ(id) {
      const c = this.data.all.find((x) => x.id === id);
      if (!c) return;
      if (Shadows.data.all.some((p) => p.sourceContactId === id)) {
        toast("PNJ déjà déployé pour ce contact.", "warning");
        return;
      }
      const ed = App.editionModule;
      if (!ed) return;
      const milieu = ContactGen.milieuForContact(c);
      const archetype =
        Coherence.pickArchetype(App.edition, ed.formOptions.archetype, { milieu }) ||
        "Aléatoire";
      const pnj = ed.generate({
        name: c.name,
        originPool: "Aléatoire",
        meta: c.metatype || "Aléatoire",
        gender: "Aléatoire",
        proRating: "Aléatoire",
        tier: "Aléatoire",
        archetype,
        special: "Aucun",
      });
      pnj.sourceContactId = id;
      Shadows.data.all.push(pnj);
      Shadows.save();
      Shadows.render();
      toast(`✓ ${pnj.name} déployé aux Ombres depuis ${c.name}.`);
    },

    initPanel() {
      this.load();
      this.render();
      if (Contacts.renderForm) {
        Contacts.renderForm();
      }
    },

    /* ---- Écran de génération dédié (barre de dossiers + formulaire +
       grille des contacts du dossier courant) ---- */
    _genWired: false,
    initGenPanel() {
      Contacts.renderForm();
      if (!this._genWired) {
        this._genWired = true;
        DossierBar.mount("contacts-dossier-list");
        DossierBar.subscribe(() => this._renderGenGrid());
      }
      this._renderGenGrid();
      DossierBar.render();
    },
    _renderGenGrid() {
      const grid = document.getElementById("contacts-gen-grid");
      if (!grid) return;
      grid.innerHTML = "";
      this.renderMembers(grid, DossierBar.memberIds(this));
    },

    /** Rafraîchit la grille de contacts affichée, sans reconstruire le
        formulaire ni les dossiers. Point d'entrée public pour un
        rafraîchissement déclenché depuis un autre contrôleur (ex. Shadows,
        quand un PNJ déployé depuis un contact est modifié/supprimé —
        cf. onChange dans js/controllers/shadows.js). */
    refreshGrid() {
      this._renderGenGrid();
    },
  },
);

// Pont couche 5 (migration modules ES) — retiré en fin de migration.
window.ContactsBook = ContactsBook;
