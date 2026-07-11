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
  _filter: "", // texte de recherche transverse (nom, archétype…)
  _wired: false,

  _typeDefs() {
    return [
      { col: Shadows, type: "pnj", label: "PNJ" },
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
    this._renderChips();
    this._renderMain(); // met aussi le libellé à jour (compte affiché)
  },

  // `shown` = nombre d'entités réellement affichées après filtrage ; en
  // recherche active on montre « affichées/total » pour que le compte ne mente
  // pas quand le filtre masque des fiches du dossier.
  _renderLabel(shown) {
    const label = document.getElementById("hub-dossier-label");
    if (!label) return;
    const node = DossierBar.currentNode();
    const base = node ? node.name : "Tout le contenu";
    const total = DossierBar.count();
    label.textContent = this._filter.trim()
      ? `${base} (${shown}/${total})`
      : `${base} (${total})`;
  },

  _renderChips() {
    document.querySelectorAll("#panel-shadows .hub-type-chip").forEach((c) => {
      c.classList.toggle("active", c.dataset.type === this._type);
    });
  },

  _renderMain() {
    const box = document.getElementById("hub-sections");
    if (!box) return;
    box.innerHTML = "";

    // Requête normalisée UNE fois pour toutes les sections (comme
    // Collection._renderGrid) ; chaque collection filtre ensuite ses membres
    // avec sa propre logique _matchesFilter (searchFields neutre par type).
    const q = Utils.searchNorm(this._filter).trim();
    const words = q ? q.split(/\s+/) : [];

    let total = 0;
    for (const { col, type, label } of this._typeDefs()) {
      if (this._type !== "all" && this._type !== type) continue;
      let ids = DossierBar.memberIds(col);
      if (words.length) ids = this._filterIds(col, ids, words);
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
      const body = this._filter.trim()
        ? `Aucune fiche ne correspond à « ${CardRenderer._esc(this._filter.trim())} ».`
        : selected
          ? "Ce dossier est vide pour ce filtre."
          : "Générez du contenu (PNJ, contacts, serveurs) et rangez-le dans un dossier.";
      box.innerHTML = `<div class="empty-state">
        <span class="empty-state-title">${this._filter.trim() ? "Aucun résultat" : "Rien ici"}</span>
        ${body}
      </div>`;
    }
    this._renderLabel(total);
  },

  /** Restreint une liste d'ids d'une collection aux entités qui matchent la
      recherche transverse, en réutilisant SA logique _matchesFilter (donc son
      searchFields neutre) — pas de résolveur concurrent. `words` est déjà
      normalisé/découpé par _renderMain. */
  _filterIds(col, ids, words) {
    const byId = new Map(col.data.all.map((e) => [e.id, e]));
    return ids.filter((id) => {
      const e = byId.get(id);
      return e && col._matchesFilter(e, words);
    });
  },

  setType(t) {
    this._type = t;
    this.render();
  },

  setFilter(v) {
    this._filter = v || "";
    this._renderMain();
  },

  _wire() {
    if (this._wired) return;
    this._wired = true;
    document.addEventListener("click", (e) => {
      const el = e.target.closest("[data-hub][data-action]");
      if (!el) return;
      if (el.dataset.action === "hub-type") this.setType(el.dataset.type);
    });

    // Recherche transverse : debounce ~130 ms (aligné sur Collection) pour ne
    // reconstruire les sections qu'une fois par salve de frappes.
    document.addEventListener("input", (e) => {
      const el = e.target.closest("[data-hub-filter]");
      if (!el) return;
      const value = el.value;
      clearTimeout(this._filterTimer);
      this._filterTimer = setTimeout(() => this.setFilter(value), 130);
    });
  },
};
