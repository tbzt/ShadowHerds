"use strict";

/* ============================================================
   DOSSIER BAR — barre de dossiers partagée (sélection courante)
   ------------------------------------------------------------
   Widget d'interface monté sur plusieurs panneaux (hub + écrans
   de génération). Il détient LA sélection de dossier courante,
   partagée par tous : c'est à la fois le filtre du hub et le
   DOSSIER DE DESTINATION des écrans de génération.

   Rendu de l'arbre (dossiers + sous-groupes) dans chaque conteneur
   monté, CRUD de dossiers (avec cascade sur les collections), et
   synchronisation du registre Dossiers avec les groupes réels.

   Destination : à chaque changement, pose `currentGroup` sur les
   trois collections (= nom du dossier, ou "all"). Le classement à
   la génération réutilise ce `currentGroup` déjà présent dans
   Collection — aucun nouveau système d'appartenance.

   Dépendances descendantes : Dossiers, Shadows/ContactsBook/Servers
   (lecture des comptes + pilotage de currentGroup), CardRenderer._esc.
   ============================================================ */
const DossierBar = {
  current: "all", // id de dossier, ou "all"
  _mounts: [], // ids de conteneurs où rendre l'arbre
  _listeners: [], // rappelés à chaque changement (hub, grilles de génération)
  _wired: false,

  _cols() {
    return [Shadows, ContactsBook, Servers, Characters];
  },

  /** À appeler une fois les collections chargées. Réconcilie le registre,
      applique la destination courante, câble la délégation, et route les
      mutations des collections vers refresh() (comptes de l'arbre + abonnés). */
  init() {
    Dossiers.load();
    this.syncDossiers();
    this._applyCurrent();
    for (const col of this._cols()) col._cfg.onChange = () => this.refresh();
    this._wire();
  },

  /** Re-rend l'arbre (comptes à jour) et notifie les vues abonnées (hub,
      grilles de génération). Appelé sur toute mutation de collection. */
  refresh() {
    this.render();
    this._notify();
  },

  mount(containerId) {
    if (!this._mounts.includes(containerId)) this._mounts.push(containerId);
  },

  subscribe(fn) {
    if (!this._listeners.includes(fn)) this._listeners.push(fn);
  },
  _notify() {
    for (const fn of this._listeners) fn();
  },

  /** Réconcilie : tout groupe nommé présent dans une collection devient un
      dossier (ajout non destructif, jointure par nom). Idempotent. */
  syncDossiers() {
    const known = new Set(Dossiers.list().map((d) => d.name));
    for (const col of this._cols()) {
      for (const name of Object.keys(col.data.groups || {})) {
        if (name !== "all" && !known.has(name)) {
          Dossiers.add(name);
          known.add(name);
        }
      }
    }
  },

  /* ---- Sélection & destination ---- */

  /** Noms d'un nœud + tous ses sous-groupes (un membre d'un sous-groupe
      appartient aussi à son dossier parent). */
  _namesUnder(id) {
    return [...Dossiers.descendantIds(id)]
      .map((i) => Dossiers.nameOf(i))
      .filter(Boolean);
  },

  /** Noms couverts par la sélection courante ; null = « Tout ». */
  currentNames() {
    return this.current === "all" ? null : this._namesUnder(this.current);
  },

  _idsForNames(col, names) {
    if (!names) return col.data.all.map((e) => e.id);
    const set = new Set();
    for (const name of names) {
      for (const id of col.data.groups[name] || []) set.add(id);
    }
    return [...set];
  },

  /** Ids des membres d'une collection pour la sélection courante. */
  memberIds(col) {
    return this._idsForNames(col, this.currentNames());
  },

  _countFor(names) {
    return this._cols().reduce(
      (n, col) => n + this._idsForNames(col, names).length,
      0,
    );
  },

  /** Nombre total d'entités (tous types) dans la sélection courante. */
  count() {
    return this._countFor(this.currentNames());
  },

  /** Nœud dossier sélectionné, ou null pour « Tout ». */
  currentNode() {
    return this.current === "all" ? null : Dossiers.get(this.current);
  },

  /** Pose le dossier courant comme destination sur les trois collections
      (via leur `currentGroup`). Le classement à la génération s'appuie
      dessus (cf. Shadows.savePNJ, ContactsBook.generate, Servers.create). */
  _applyCurrent() {
    const name = this.current === "all" ? "all" : Dossiers.nameOf(this.current);
    for (const col of this._cols()) col.currentGroup = name || "all";
  },

  select(id) {
    this.current = id;
    this._applyCurrent();
    this.render();
    this._notify();
  },

  /* ---- Rendu ---- */
  render() {
    this.syncDossiers();
    for (const id of this._mounts) this._renderInto(id);
  },

  _renderInto(containerId) {
    const box = document.getElementById(containerId);
    if (!box) return;
    const allActive = this.current === "all" ? "active" : "";
    let html = `<div class="group-item ${allActive}" data-dossier-bar data-action="switch-dossier" data-dossier="all">
      <span class="group-item-icon">◈</span>
      <span class="group-item-name">Tout</span>
      <span class="group-item-count">${this._countFor(null)}</span>
    </div>`;
    // Favoris (CH-Q9) épinglé en tête, hors boucle des racines — dossier
    // réservé créé à la volée par syncDossiers() dès la première épingle.
    const fav = Dossiers.roots().find((d) => d.name === Collection.FAV_GROUP);
    if (fav) html += this._nodeHtml(fav, false, true);
    for (const d of Dossiers.roots()) {
      if (fav && d.id === fav.id) continue;
      html += this._nodeHtml(d, false);
      for (const child of Dossiers.children(d.id)) {
        html += this._nodeHtml(child, true);
      }
    }
    box.innerHTML = html;
  },

  /** Ligne de l'arbre : dossier (racine) ou sous-groupe (isSub). Le nœud
      Favoris (isFav) est réservé : pas de sous-groupe/renommer/supprimer. */
  _nodeHtml(node, isSub, isFav = false) {
    const active = this.current === node.id ? "active" : "";
    const nameEsc = CardRenderer._esc(node.name);
    const sub = isSub ? " group-subitem" : "";
    if (isFav) {
      return `<div class="group-item ${active}" data-dossier-bar data-action="switch-dossier" data-dossier="${node.id}">
        <span class="group-item-icon">★</span>
        <span class="group-item-name">${nameEsc}</span>
        <span class="group-item-count">${this._countFor(this._namesUnder(node.id))}</span>
      </div>`;
    }
    const addBtn = isSub
      ? ""
      : `<button class="btn-icon-tiny" data-dossier-bar data-action="add-subgroup" data-parent="${node.id}" title="Nouveau sous-groupe">+</button>`;
    return `<div class="group-item${sub} ${active}" data-dossier-bar data-action="switch-dossier" data-dossier="${node.id}">
      <span class="group-item-icon">${isSub ? "↳" : "▸"}</span>
      <span class="group-item-name">${nameEsc}</span>
      <span class="group-item-count">${this._countFor(this._namesUnder(node.id))}</span>
      <span class="group-item-actions">
        ${addBtn}
        <button class="btn-icon-tiny" data-dossier-bar data-action="rename-dossier" data-dossier="${node.id}" title="Renommer">✎</button>
        <button class="btn-icon-tiny danger" data-dossier-bar data-action="remove-dossier" data-dossier="${node.id}" title="Supprimer">✕</button>
      </span>
    </div>`;
  },

  /* ---- CRUD (cascade sur les collections, jointure par nom) ---- */
  addDossier() {
    Dialog.prompt({
      title: "Nouveau dossier",
      label: "Nom du dossier",
      placeholder: "ex. Run Aztechnology, Équipe A…",
      confirmLabel: "Créer",
    }).then((name) => {
      if (!name || !name.trim()) return;
      const clean = name.trim();
      if (Dossiers.list().some((d) => d.name === clean)) {
        toast("Ce dossier existe déjà.");
        return;
      }
      const d = Dossiers.add(clean);
      if (d) this.select(d.id);
      toast(`Dossier « ${clean} » créé.`);
    });
  },

  addSubgroup(parentId) {
    Dialog.prompt({
      title: "Nouveau sous-groupe",
      label: "Nom du sous-groupe",
      confirmLabel: "Créer",
    }).then((name) => {
      if (!name || !name.trim()) return;
      const clean = name.trim();
      if (Dossiers.list().some((x) => x.name === clean)) {
        toast("Ce nom existe déjà.");
        return;
      }
      const d = Dossiers.add(clean, parentId);
      if (d) this.select(d.id);
      toast(`Sous-groupe « ${clean} » créé.`);
    });
  },

  renameDossier(id) {
    const d = Dossiers.get(id);
    if (!d) return;
    if (d.name === Collection.FAV_GROUP) {
      toast("Dossier réservé (Favoris).");
      return;
    }
    const oldName = d.name;
    Dialog.prompt({
      title: "Renommer",
      label: "Nouveau nom",
      value: oldName,
      confirmLabel: "Renommer",
    }).then((input) => {
      if (!input || !input.trim() || input.trim() === oldName) return;
      const newName = input.trim();
      if (Dossiers.list().some((x) => x.name === newName)) {
        toast("Ce nom existe déjà.");
        return;
      }
      Dossiers.rename(id, newName);
      for (const col of this._cols()) {
        if (col.data.groups[oldName]) {
          col.data.groups[newName] = col.data.groups[oldName];
          delete col.data.groups[oldName];
          col.save();
        }
      }
      this._applyCurrent();
      this.render();
      this._notify();
    });
  },

  removeDossier(id) {
    const d = Dossiers.get(id);
    if (!d) return;
    if (d.name === Collection.FAV_GROUP) {
      toast("Dossier réservé (Favoris).");
      return;
    }
    const isParent = Dossiers.children(id).length > 0;
    const msg = isParent
      ? `Supprimer « ${d.name} » et ses sous-groupes ? (Le contenu reste dans la bibliothèque.)`
      : `Supprimer « ${d.name} » ? (Le contenu reste dans la bibliothèque.)`;
    Dialog.confirm({
      title: "Supprimer le dossier",
      message: msg,
      confirmLabel: "Supprimer",
      danger: true,
    }).then((ok) => {
      if (!ok) return;
      const names = this._namesUnder(id);
      Dossiers.remove(id);
      for (const col of this._cols()) {
        let changed = false;
        for (const name of names) {
          if (col.data.groups[name]) {
            delete col.data.groups[name];
            changed = true;
          }
        }
        if (changed) col.save();
      }
      if (!Dossiers.has(this.current)) this.current = "all";
      this._applyCurrent();
      this.render();
      this._notify();
    });
  },

  _wire() {
    if (this._wired) return;
    this._wired = true;
    document.addEventListener("click", (e) => {
      const el = e.target.closest("[data-dossier-bar][data-action]");
      if (!el) return;
      switch (el.dataset.action) {
        case "switch-dossier":
          this.select(el.dataset.dossier);
          break;
        case "add-dossier":
          this.addDossier();
          break;
        case "add-subgroup":
          this.addSubgroup(el.dataset.parent);
          break;
        case "rename-dossier":
          this.renameDossier(el.dataset.dossier);
          break;
        case "remove-dossier":
          this.removeDossier(el.dataset.dossier);
          break;
      }
    });
  },
};
