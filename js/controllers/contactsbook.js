"use strict";

/* ============================================================
   CONTACTS BOOK — bibliothèque de contacts persistants.

   Domaine contact, brique « bibliothèque » : contacts persistants
   avec groupes et notes (socle Collection, structure miroir de
   Shadows). Reçoit ses contacts de Contacts/ContactGen ; c'est la
   seule des trois briques contact qui persiste.
   ============================================================ */
const ContactsBook = Object.assign(
  Collection.create({
    key: "contacts",
    storageKeys: { all: "contacts_all", groups: "contacts_groups" },
    dom: { grid: "contacts-grid", sidebar: "contacts-group-list", label: "contacts-group-label" },
    labels: {
      allSummary: (n) => `Tous les contacts (${n})`,
      emptyTitle: "Aucun contact ici",
      emptyBody: "Générez des contacts avec le bouton ci-dessus.",
      noMatch: (q) => `Aucun contact ne correspond à « ${q} ».`,
    },
    searchFields: (c) => [c.name, c.role, c.metatype, c.desc],
    renderCard: (c) => ContactRenderer.renderPersistent(c),
  }),
  {
    /* ---- Générer et ajouter ---- */
    generate() {
      const c = Contacts.generate();
      c.notes = "";
      this.data.all.push(c);
      // Classe dans le dossier de destination courant (piloté par DossierBar).
      if (this.currentGroup && this.currentGroup !== "all") {
        (this.data.groups[this.currentGroup] ||= []).push(c.id);
      }
      this.save();
      this.render();
      toast(`✓ ${c.name} ajouté aux contacts.`);
    },

    /* ---- Édition inline ---- */
    editNote(id, value) {
      const c = this.data.all.find((x) => x.id === id);
      if (c) {
        c.notes = value;
        this.save();
      }
    },

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
       même accès direct que Shadows.savePNJ fait déjà vers Gen.pool) et sa
       carte s'affiche imbriquée dans la fiche contact (ContactRenderer). */
    deployPNJ(id) {
      const c = this.data.all.find((x) => x.id === id);
      if (!c) return;
      if (Shadows.data.all.some((p) => p.sourceContactId === id)) {
        toast("PNJ déjà déployé pour ce contact.");
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
