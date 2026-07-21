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
import { CardRenderer } from "../card/cardrenderer.js";
import { Collection } from "../collection/collection.js";
import { Dialog } from "../kit/dialog.js";
import { DiceLog } from "../dice/dicelog.js";
import { Dossiers } from "./dossiers.js";

export const DossierBar = {
  current: "all", // id de dossier, ou "all"
  _mounts: [], // ids de conteneurs où rendre l'arbre
  _listeners: [], // rappelés à chaque changement (hub, grilles de génération)
  _wired: false,

  // Plafond dur : 4 niveaux (racine = profondeur 0 → petit-petit-enfant = 3).
  // Au-delà, l'indentation et la charge cognitive débordent la sidebar mobile
  // (cf. mémoire project_responsive_target). Le modèle Dossiers reste illimité ;
  // c'est une limite d'UI, appliquée au rendu du bouton « + » et à la création.
  MAX_DEPTH: 3,

  /** Profondeur d'un nœud (racine = 0), en remontant les parents. Le garde-fou
      à 50 est purement défensif — move() interdit déjà les cycles. */
  _depthOf(id) {
    let depth = 0;
    let node = Dossiers.get(id);
    while (node && node.parentId != null && depth < 50) {
      depth++;
      node = Dossiers.get(node.parentId);
    }
    return depth;
  },

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

  /** Historiquement : tout groupe nommé d'une collection devenait un dossier
      (jointure par nom). Depuis VIS-16 1-bis l'appartenance est keyée par ID de
      dossier — les clés de groupe SONT des ids de nœuds (ou des orphelins
      inertes). La réconciliation par nom n'a plus lieu d'être ; l'import de
      données legacy keyées par nom est re-keyé à l'import (`backup.js`). No-op
      conservé pour ne pas toucher ses appelants. */
  syncDossiers() {},

  /* ---- Sélection & destination ---- */

  /** Clés d'appartenance d'un nœud + tous ses sous-groupes. Depuis VIS-16 1-bis
      l'appartenance est keyée par ID de dossier (plus par nom) : ce sont donc
      les ids du nœud et de ses descendants (un membre d'un sous-groupe
      appartient aussi à son dossier parent). */
  _keysUnder(id) {
    return [...Dossiers.descendantIds(id)];
  },

  /** Clés couvertes par la sélection courante ; null = « Tout ». */
  currentKeys() {
    return this.current === "all" ? null : this._keysUnder(this.current);
  },

  _idsForKeys(col, keys) {
    if (!keys) return col.data.all.map((e) => e.id);
    const set = new Set();
    for (const key of keys) {
      for (const id of col.data.groups[key] || []) set.add(id);
    }
    return [...set];
  },

  /** Ids des membres d'une collection pour la sélection courante — ou pour un
      dossier DONNÉ (`dossierId`), sans changer la sélection courante : le
      poste de commandement « Jouer » (V4-b) liste le casting d'un run précis
      qui n'est pas forcément le dossier ouvert. Défaut = comportement
      historique (sélection courante), donc additif pour tous les appelants. */
  memberIds(col, dossierId = this.current) {
    const keys = dossierId === "all" ? null : this._keysUnder(dossierId);
    return this._idsForKeys(col, keys);
  },

  _countFor(keys) {
    return this._cols().reduce(
      (n, col) => n + this._idsForKeys(col, keys).length,
      0,
    );
  },

  /** VIS-9 — miroir « Rangé dans » : nœuds Dossiers qui contiennent l'entité
      `id`, quelle que soit sa collection. Lecture seule, aucune donnée neuve :
      l'appartenance est jointe PAR NOM (comme tout ce module), donc on récolte
      les noms de groupes via `groupsOf` sur chaque collection puis on mappe
      vers les nœuds du registre. Un groupe sans nœud correspondant (cas
      théorique avant syncDossiers) est simplement ignoré par le filtre. */
  dossiersOf(id) {
    const keys = new Set();
    for (const col of this._cols()) {
      for (const key of col.groupsOf(id)) keys.add(key);
    }
    return Dossiers.list().filter((d) => keys.has(d.id));
  },

  /** Nombre total d'entités (tous types) dans la sélection courante. */
  count() {
    return this._countFor(this.currentKeys());
  },

  /** Nœud dossier sélectionné, ou null pour « Tout ». */
  currentNode() {
    return this.current === "all" ? null : Dossiers.get(this.current);
  },

  /** Pose le dossier courant comme destination sur les trois collections
      (via leur `currentGroup`). Le classement à la génération s'appuie
      dessus (cf. Shadows.savePNJ, ContactsBook.generate, Servers.create). */
  _applyCurrent() {
    // VIS-16 1-bis : l'appartenance est keyée par ID → la destination des
    // collections est l'ID du dossier courant (plus le nom).
    const key = this.current === "all" ? "all" : this.current;
    for (const col of this._cols()) col.currentGroup = key;
  },

  select(id) {
    this.current = id;
    this._applyCurrent();
    // Miroir vers la vérité unique `App.context` (persistée). Réentrée
    // inoffensive au boot (App.context.load → select → setDossier garde sur
    // l'égalité). Adaptateur progressif : `current` reste la source lue par le
    // code en place, `App.context` s'ajoute au-dessus.
    if (typeof App !== "undefined" && App.context) App.context.setDossier(id);
    this.render();
    this._notify();
  },

  /* ---- Rendu ---- */
  render() {
    this.syncDossiers();
    for (const id of this._mounts) this._renderInto(id);
    // Garde le fil d'Ariane en phase avec tout changement de la barre
    // (renommage, suppression, comptes) — App.context détient le focus, la
    // barre en est un miroir d'affichage.
    if (typeof App !== "undefined" && App.context) App.context.render();
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
    // Favoris épinglé en tête, hors boucle des racines — dossier
    // réservé créé à la volée par syncDossiers() dès la première épingle.
    const fav = Dossiers.roots().find((d) => d.name === Collection.FAV_GROUP);
    if (fav) html += this._nodeHtml(fav, 0, true);
    for (const d of Dossiers.roots()) {
      if (fav && d.id === fav.id) continue;
      html += this._nodeTreeHtml(d, 0);
    }
    box.innerHTML = html;
  },

  /** Un nœud puis tous ses descendants, en profondeur (DFS), indentés par
      `depth`. La hiérarchie de données est illimitée ; seul le rendu du
      bouton « + » est plafonné (cf. MAX_DEPTH), pas le parcours. */
  _nodeTreeHtml(node, depth) {
    let html = this._nodeHtml(node, depth);
    for (const child of Dossiers.children(node.id)) {
      html += this._nodeTreeHtml(child, depth + 1);
    }
    return html;
  },

  /** Ligne de l'arbre : dossier (racine) ou sous-groupe (isSub). Le nœud
      Favoris (isFav) est réservé : pas de sous-groupe/renommer/supprimer. */
  _nodeHtml(node, depth, isFav = false) {
    const active = this.current === node.id ? "active" : "";
    const nameEsc = CardRenderer._esc(node.name);
    const isSub = depth > 0;
    const sub = isSub ? " group-subitem" : "";
    // Indent piloté par --depth (clampé au plafond visuel), pas un handler.
    const style = isSub ? ` style="--depth:${Math.min(depth, this.MAX_DEPTH)}"` : "";
    if (isFav) {
      return `<div class="group-item ${active}" data-dossier-bar data-action="switch-dossier" data-dossier="${node.id}">
        <span class="group-item-icon">★</span>
        <span class="group-item-name">${nameEsc}</span>
        <span class="group-item-count">${this._countFor(this._keysUnder(node.id))}</span>
      </div>`;
    }
    // « + » masqué au dernier niveau : un enfant dépasserait MAX_DEPTH.
    const addBtn = depth < this.MAX_DEPTH
      ? `<button class="btn-icon-tiny" data-dossier-bar data-action="add-subgroup" data-parent="${node.id}" title="Nouveau sous-groupe">+</button>`
      : "";
    // Pastille de type (hiérarchie de campagne) : le glyphe du slot d'icône
    // signale campagne/run ; un dossier non typé garde son glyphe de position
    // (▸/↳). Réutilise le slot existant — aucun CSS neuf.
    const posIcon = isSub ? "↳" : "▸";
    const icon =
      node.kind === "campaign" ? "❖"
        : node.kind === "run" ? "◆"
          : node.kind === "scene" ? "▷"
            : posIcon;
    const kindTitle =
      node.kind === "campaign" ? "Campagne"
        : node.kind === "run" ? "Run"
          : node.kind === "scene" ? "Scène"
            : "";
    // Typage a posteriori (menu ⋯) — réutilise le popover .card-menu déjà câblé
    // (CardMenu.bindDelegation) : aucun CSS ni handler neuf, juste des items
    // data-action="set-kind" pris par la délégation de cette barre.
    const kindItem = (k, label) =>
      `<button type="button" role="menuitem" class="card-menu-item" data-dossier-bar data-action="set-kind" data-kind="${k}" data-dossier="${node.id}">${node.kind === k ? "✓ " : ""}${label}</button>`;
    // R4 : geste « rencontre » (ouvrir/fermer), seul concept d'UI neuf de ce
    // chantier — un seul item, réutilise le même popover ⋯ que le typage
    // (aucun CSS/handler neuf). Visible seulement sur un dossier « run ».
    const rencontreItem =
      node.kind === "run"
        ? Encounter.activeDossierId === node.id
          ? `<button type="button" role="menuitem" class="card-menu-item" data-dossier-bar data-action="close-rencontre" data-dossier="${node.id}">⏹ Fermer la rencontre</button>`
          : `<button type="button" role="menuitem" class="card-menu-item" data-dossier-bar data-action="open-rencontre" data-dossier="${node.id}">▶ ${Encounter.hasStash(node.id) ? "Rouvrir" : "Ouvrir"} la rencontre</button>`
        : "";
    // VIS-16 étape 1 : créer une scène (cellule de jeu) sous un run. Réutilise
    // le popover ⋯ et la délégation existants — aucun CSS ni handler neuf.
    const sceneItem =
      node.kind === "run"
        ? `<button type="button" role="menuitem" class="card-menu-item" data-dossier-bar data-action="add-scene" data-dossier="${node.id}">▷ Nouvelle scène</button>`
        : "";
    // VIS-16 étape 5 : dupliquer une campagne pour la mener avec une autre équipe
    // (copie de la prépa, état de jeu vierge). Réservé aux campagnes.
    const duplicateItem =
      node.kind === "campaign"
        ? `<button type="button" role="menuitem" class="card-menu-item" data-dossier-bar data-action="duplicate-dossier" data-dossier="${node.id}">⎘ Dupliquer (autre équipe)</button>`
        : "";
    const typeMenu = `<button type="button" class="card-kebab btn-icon-tiny" data-card-menu-toggle aria-haspopup="true" aria-expanded="false" title="Type de dossier" aria-label="Type de dossier">⋯</button>
        <div class="card-menu" role="menu" hidden>
          ${kindItem("campaign", "Campagne")}
          ${kindItem("run", "Run")}
          ${node.kind ? `<button type="button" role="menuitem" class="card-menu-item" data-dossier-bar data-action="set-kind" data-kind="" data-dossier="${node.id}">Retirer le type</button>` : ""}
          ${sceneItem}
          ${duplicateItem}
          ${rencontreItem}
        </div>`;
    return `<div class="group-item${sub} ${active}"${style} data-dossier-bar data-action="switch-dossier" data-dossier="${node.id}">
      <span class="group-item-icon"${kindTitle ? ` title="${kindTitle}"` : ""}>${icon}</span>
      <span class="group-item-name">${nameEsc}</span>
      <span class="group-item-count">${this._countFor(this._keysUnder(node.id))}</span>
      <span class="group-item-actions">
        ${addBtn}
        <button class="btn-icon-tiny" data-dossier-bar data-action="rename-dossier" data-dossier="${node.id}" title="Renommer">✎</button>
        <button class="btn-icon-tiny danger" data-dossier-bar data-action="remove-dossier" data-dossier="${node.id}" title="Supprimer">✕</button>
        ${typeMenu}
      </span>
    </div>`;
  },

  /* ---- CRUD (cascade sur les collections, jointure par nom) ---- */
  addDossier() {
    // 1b : le « + » demande d'abord le TYPE — la structure Campagne › Run ›
    // Scène veut du typé par défaut — puis le nom, et crée le dossier DÉJÀ
    // typé (au lieu de « créer neutre puis typer via ⋯ »). La création reste
    // côté Dossiers (propriétaire de l'arbre) ; « Jouer » n'y touche pas.
    Dialog.choose({
      title: "Nouveau dossier",
      message: "Quel type ?",
      options: [
        { value: "run", label: "◆ Nouveau run", primary: true },
        { value: "campaign", label: "❖ Nouvelle campagne" },
        { value: "plain", label: "Dossier simple" },
      ],
    }).then((choice) => {
      if (!choice) return;
      this._createDossier(choice === "plain" ? null : choice);
    });
  },

  /** Prompte le nom puis crée un dossier, optionnellement typé run/campaign
      (jointure par nom inchangée). Appelé par le choix de type du « + ». */
  _createDossier(kind) {
    Dialog.prompt({
      title:
        kind === "campaign"
          ? "Nouvelle campagne"
          : kind === "run"
            ? "Nouveau run"
            : "Nouveau dossier",
      label: `Nom ${kind === "campaign" ? "de la campagne" : kind === "run" ? "du run" : "du dossier"}`,
      placeholder:
        kind === "run"
          ? "ex. Extraction Aztechnology…"
          : kind === "campaign"
            ? "ex. Chronique de Seattle…"
            : "ex. Équipe A…",
      confirmLabel: "Créer",
    }).then((name) => {
      if (!name || !name.trim()) return;
      const clean = name.trim();
      if (Dossiers.list().some((d) => d.name === clean)) {
        toast("Ce dossier existe déjà.", "warning");
        return;
      }
      const d = Dossiers.add(clean, null, kind);
      if (d) this.select(d.id);
      toast(
        `« ${clean} » créé${kind === "campaign" ? "e" : ""}${kind === "run" ? " (run ◆)" : kind === "campaign" ? " (campagne ❖)" : ""}.`,
      );
    });
  },

  addSubgroup(parentId) {
    if (this._depthOf(parentId) >= this.MAX_DEPTH) {
      toast("Profondeur maximale atteinte (4 niveaux).", "warning");
      return;
    }
    Dialog.prompt({
      title: "Nouveau sous-groupe",
      label: "Nom du sous-groupe",
      confirmLabel: "Créer",
    }).then((name) => {
      if (!name || !name.trim()) return;
      const clean = name.trim();
      if (Dossiers.list().some((x) => x.name === clean)) {
        toast("Ce nom existe déjà.", "warning");
        return;
      }
      const d = Dossiers.add(clean, parentId);
      if (d) this.select(d.id);
      toast(`Sous-groupe « ${clean} » créé.`);
    });
  },

  /** VIS-16 étape 1 : crée une scène (nœud typé `scene`) sous un run. La scène
      est la cellule de jeu — son cast et ses outils s'y rattacheront par
      référence (étapes 2-3). Réutilise l'unicité de nom (l'appartenance des
      collections se joint par nom de dossier). */
  addScene(runId) {
    const run = Dossiers.get(runId);
    if (!run || run.kind !== "run") return;
    if (this._depthOf(runId) >= this.MAX_DEPTH) {
      toast("Profondeur maximale atteinte (4 niveaux).", "warning");
      return;
    }
    Dialog.prompt({
      title: "Nouvelle scène",
      label: "Nom de la scène",
      placeholder: "ex. La rencontre au marché…",
      confirmLabel: "Créer",
    }).then((name) => {
      if (!name || !name.trim()) return;
      const clean = name.trim();
      // Noms de scène NON uniques (appartenance par id, VIS-16 1-bis) : deux
      // runs peuvent avoir chacun « La rencontre ».
      const d = Dossiers.add(clean, runId, "scene");
      if (d) this.select(d.id);
      toast(`Scène « ${clean} » créée (▷).`);
    });
  },

  renameDossier(id) {
    const d = Dossiers.get(id);
    if (!d) return;
    if (d.name === Collection.FAV_GROUP) {
      toast("Dossier réservé (Favoris).", "warning");
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
        toast("Ce nom existe déjà.", "warning");
        return;
      }
      Dossiers.rename(id, newName);
      // VIS-16 1-bis : l'appartenance est keyée par ID → renommer ne change
      // qu'un libellé, aucune migration de clé de groupe (fin de la casse
      // silencieuse au renommage, cf. mémoire identités-SIN).
      this._applyCurrent();
      this.render();
      this._notify();
    });
  },

  /** Type (ou dé-type) un dossier dans la hiérarchie de campagne. Le dossier
      Favoris est réservé : jamais typé. Additif — n'affecte ni les membres ni
      les groupes des collections, seulement la structure Dossiers. */
  setDossierKind(id, kind) {
    const d = Dossiers.get(id);
    if (!d || d.name === Collection.FAV_GROUP) return;
    Dossiers.setKind(id, kind);
    this.render();
    this._notify();
    toast(
      kind === "campaign"
        ? `« ${d.name} » est une campagne.`
        : kind === "run"
          ? `« ${d.name} » est un run.`
          : `Type retiré de « ${d.name} ».`,
    );
  },

  removeDossier(id) {
    const d = Dossiers.get(id);
    if (!d) return;
    if (d.name === Collection.FAV_GROUP) {
      toast("Dossier réservé (Favoris).", "warning");
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
      const keys = this._keysUnder(id);
      Dossiers.remove(id);
      for (const col of this._cols()) {
        let changed = false;
        for (const key of keys) {
          if (col.data.groups[key]) {
            delete col.data.groups[key];
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

  /** VIS-16 étape 5 — duplique une campagne pour une autre équipe : copie la
      structure (Dossiers.duplicateSubtree) puis re-pointe l'appartenance PAR ID
      sur les nouveaux nœuds (le casting suit la copie, PAR RÉFÉRENCE — les Actifs
      ne sont pas dupliqués). Aucun état de jeu (Encounter) copié : la partie
      repart vierge. */
  duplicateDossier(id) {
    const node = Dossiers.get(id);
    if (!node || node.kind !== "campaign") return;
    const res = Dossiers.duplicateSubtree(id);
    if (!res) return;
    for (const col of this._cols()) {
      let changed = false;
      for (const [oldId, newId] of Object.entries(res.idMap)) {
        const members = col.data.groups[oldId];
        if (Array.isArray(members) && members.length) {
          col.data.groups[newId] = [...members];
          changed = true;
        }
      }
      if (changed) col.save();
    }
    this.render();
    this._notify();
    toast(`« ${node.name} » dupliqué — nouvelle partie, prépa copiée.`);
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
        case "add-scene":
          this.addScene(el.dataset.dossier);
          break;
        case "rename-dossier":
          this.renameDossier(el.dataset.dossier);
          break;
        case "remove-dossier":
          this.removeDossier(el.dataset.dossier);
          break;
        case "duplicate-dossier":
          this.duplicateDossier(el.dataset.dossier);
          break;
        case "set-kind":
          this.setDossierKind(el.dataset.dossier, el.dataset.kind || null);
          break;
        case "open-rencontre":
          this.openRencontre(el.dataset.dossier);
          break;
        case "close-rencontre":
          this.closeRencontre(el.dataset.dossier);
          break;
      }
    });
  },

  /** R4 : geste unifiant « ouvrir la rencontre » — restaure la scène (init +
      serveur lié, R1), pose le contexte (filtre journal des jets R3, dossier
      courant → carnet R2 qui s'ouvre dessus), ouvre le tracker. Aucune
      nouvelle entrée de nav : le tracker est l'overlay déjà existant. */
  openRencontre(dossierId) {
    if (!dossierId) return;
    Encounter.restore(dossierId);
    this.select(dossierId); // dossier courant = carnet courant (R2)
    Encounter.open();
    toast(`Rencontre « ${Dossiers.nameOf(dossierId) || "?"} » ouverte.`);
  },

  /** Fermer la rencontre : snapshot (R1) + retrait du contexte actif. Sur un
      run, offre le débrief (VIS-7) au moment naturel — proposé, jamais imposé
      (toastAction, socle VIS-2 ; Debrief lu en global pour éviter un cycle
      d'import dossierbar ↔ debrief). */
  closeRencontre(dossierId) {
    if (!dossierId) return;
    Encounter.stash(dossierId);
    if (DiceLog._filter === DiceLog._ENCOUNTER_FILTER) DiceLog._filter = "all";
    Encounter.close();
    this.render();
    const name = Dossiers.nameOf(dossierId) || "?";
    if (Dossiers.kindOf(dossierId) === "run" && typeof Debrief !== "undefined") {
      toastAction(`Rencontre « ${name} » rangée.`, "Débriefer", () =>
        Debrief.open(dossierId),
      );
    } else {
      toast(`Rencontre « ${name} » rangée.`);
    }
  },
};

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.DossierBar = DossierBar;
