"use strict";

/* ============================================================
   HUB — « Ombres portées » comme vue transverse du contenu
   ------------------------------------------------------------
   Agrège les trois collections (PNJ, contacts, serveurs) dans
   une seule vue organisée par DOSSIER. Pour la sélection courante
   (pilotée par DossierBar, partagée avec les écrans de génération),
   le contenu est sectionné automatiquement par type ; un filtre de
   type isole une famille. Une barre de création permet de créer
   depuis le hub (l'autre mode étant les écrans de génération dédiés).

   Le hub ne détient PAS la sélection : il délègue la sidebar de
   dossiers à DossierBar et s'y abonne pour se rafraîchir. Il ne
   porte que le filtre de type, le libellé, la grille et la barre
   de création.
   ============================================================ */
const Hub = {
  _type: "all", // all | pnj | contact | server
  _wired: false,

  _typeDefs() {
    return [
      { col: Shadows, type: "pnj", label: "Figurants" },
      { col: ContactsBook, type: "contact", label: "Contacts" },
      { col: Servers, type: "server", label: "Serveurs" },
    ];
  },

  initPanel(type) {
    if (type) this._type = type;
    // Collections + DossierBar sont initialisés au choix d'édition ; ici on
    // ne fait que (dé)monter la sidebar du hub et s'abonner aux changements.
    DossierBar.mount("hub-dossier-list");
    DossierBar.subscribe(() => this.render());
    this._wire();
    DossierBar.refresh(); // rend l'arbre + notifie → this.render()
  },

  render() {
    this._renderLabel();
    this._renderChips();
    this._renderCreate();
    this._renderMain();
  },

  _renderLabel() {
    const label = document.getElementById("hub-dossier-label");
    if (!label) return;
    const node = DossierBar.currentNode();
    label.textContent = node
      ? `${node.name} (${DossierBar.count()})`
      : `Tout le contenu (${DossierBar.count()})`;
  },

  _renderChips() {
    document.querySelectorAll("#panel-shadows .hub-type-chip").forEach((c) => {
      c.classList.toggle("active", c.dataset.type === this._type);
    });
  },

  /** Barre de création contextuelle : selon le filtre-type actif, propose la
      génération de contact, la création de serveur, ou un lien vers l'écran
      PNJ. Le contenu créé se range dans le dossier courant (DossierBar). */
  _renderCreate() {
    const box = document.getElementById("hub-create");
    if (!box) return;
    if (this._type === "contact") {
      box.innerHTML = `<div class="hub-create-bar">
        <div id="contact-gen-form"></div>
        <button class="btn-primary btn-small" data-action="contact-generate">Générer un contact</button>
      </div>`;
      Contacts.renderForm();
    } else if (this._type === "server") {
      box.innerHTML = `<div class="hub-create-bar">
        <div id="server-gen-form"></div>
        <button class="btn-primary btn-small" data-action="create-server">Créer le serveur</button>
      </div>`;
      Servers.renderForm();
    } else if (this._type === "pnj") {
      box.innerHTML = `<div class="hub-create-bar">
        <button class="btn-secondary btn-small" data-action="show-panel" data-panel="generator">→ Ouvrir le Générateur PNJ</button>
      </div>`;
    } else {
      box.innerHTML = "";
    }
  },

  _renderMain() {
    const box = document.getElementById("hub-sections");
    if (!box) return;
    box.innerHTML = "";

    let total = 0;
    for (const { col, type, label } of this._typeDefs()) {
      if (this._type !== "all" && this._type !== type) continue;
      const ids = DossierBar.memberIds(col);
      if (!ids.length) continue;
      total += ids.length;

      const section = document.createElement("div");
      section.className = "hub-section";
      const head = document.createElement("div");
      head.className = "hub-section-head";
      head.innerHTML = `<span class="hub-section-title">${label}</span><span class="hub-section-count">${ids.length}</span>`;
      section.appendChild(head);
      const grid = document.createElement("div");
      grid.className = "cards-zone";
      col.renderMembers(grid, ids);
      section.appendChild(grid);
      box.appendChild(section);
    }

    if (!total) {
      const selected = DossierBar.current !== "all";
      box.innerHTML = `<div class="empty-state">
        <span class="empty-state-title">Rien ici</span>
        ${selected ? "Ce dossier est vide pour ce filtre." : "Générez du contenu (PNJ, contacts, serveurs) et rangez-le dans un dossier."}
      </div>`;
    }
  },

  setType(t) {
    this._type = t;
    this.render();
  },

  _wire() {
    if (this._wired) return;
    this._wired = true;
    document.addEventListener("click", (e) => {
      const el = e.target.closest("[data-hub][data-action]");
      if (!el) return;
      if (el.dataset.action === "hub-type") this.setType(el.dataset.type);
    });
  },
};
