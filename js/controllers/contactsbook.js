"use strict";

/* ============================================================
   CONTACTS BOOK — contacts persistants avec groupes et notes
   Structure miroir de Shadows, mais pour les contacts
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
      // Si un groupe est sélectionné, l'y ajouter directement
      if (this.currentGroup !== "all" && this.data.groups[this.currentGroup]) {
        this.data.groups[this.currentGroup].push(c.id);
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

    initPanel() {
      this.load();
      this.render();
      if (typeof Contacts !== "undefined" && Contacts.renderForm) {
        Contacts.renderForm();
      }
    },
  },
);
