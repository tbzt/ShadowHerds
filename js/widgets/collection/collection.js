"use strict";

/* ============================================================
   COLLECTION — socle des collections persistées avec groupes
   ------------------------------------------------------------
   Brique commune à Shadows (PNJ), ContactsBook (contacts) et
   Servers (serveurs). Chaque contrôleur de domaine crée UNE
   instance via Collection.create(config) et lui délègue :
   persistance, CRUD de groupes, filtre, rendu sidebar + grille
   et délégation d'événements (data-*).

   La brique ne connaît AUCUN contrôleur : toutes les différences
   (clés Storage, ids DOM, libellés, champs de filtre, rendu de
   carte, entités liées) arrivent par configuration. Ses seules
   dépendances sortantes sont Storage (persistance) et GroupPicker
   (widget d'appartenance multi-groupes), toutes deux descendantes.

   Un contact/PNJ/serveur peut appartenir à PLUSIEURS groupes.
   ============================================================ */
import { BulkBar } from "./bulkbar.js";
import { CardRenderer } from "../card/cardrenderer.js";
import { Dialog } from "../kit/dialog.js";
import { GroupPicker } from "../kit/grouppicker.js";
import { Storage } from "../../core/storage.js";
import { Utils } from "../../core/utils.js";

export const Collection = {
  /** Nom de groupe réservé pour l'épingle rapide — un dossier
      transverse comme un autre, pinné en tête par DossierBar. */
  FAV_GROUP: "★ Favoris",

  /**
   * @param {object} config
   *   key           identifiant court, porté par data-collection="..."
   *   storageKeys   { all, groups } — clés brutes possédées par Storage
   *   dom           { grid, sidebar, label } — ids des conteneurs
   *   labels        libellés FR (voir _defaults ci-dessous)
   *   searchFields  (entity) => string[] — champs indexés par le filtre
   *   renderCard    (entity, ctx) => HTMLElement — corps de carte (domaine)
   *   linked        { isChild, ownerOf, renderChild } | null — entités liées
   *                 sœurs dans data.all (ex : véhicules d'un PNJ)
   *   renderTrailing (entity) => HTMLElement | null — entité liée unique
   *                 imbriquée dans l'entité, pas sœur (ex : spider d'un serveur)
   *   footerSelector sélecteur CSS du footer de carte où ancrer le
   *                 déclencheur de groupes (défaut : ".pnj-card-footer")
   *   combatEligible true si ces entités peuvent rejoindre le
   *                 suivi de combat — affiche le bouton dédié de la
   *                 barre de sélection multiple (Shadows/Characters).
   */
  create(config) {
    const labels = Object.assign({}, this._defaults, config.labels || {});

    const col = {
      key: config.key,
      _cfg: config,
      _labels: labels,
      _wired: false,

      data: { all: [], groups: {} },
      currentGroup: "all",
      filterText: "",
      _selected: new Set(), // ids sélectionnés, éphémère (pas de Storage)

      /* ---- Persistance ---- */
      load() {
        this.data.all = Storage.get(config.storageKeys.all, []);
        this.data.groups = Storage.get(config.storageKeys.groups, {});
      },
      save() {
        Storage.set(config.storageKeys.all, this.data.all);
        Storage.set(config.storageKeys.groups, this.data.groups);
      },

      /* ---- Suppression générique (cascade sur les entités liées) ---- */
      remove(id) {
        const entity = this.data.all.find((e) => e.id === id);
        const doomed = new Set([id]);
        const linked = config.linked;
        if (linked) {
          for (const e of this.data.all) {
            if (linked.isChild(e) && linked.ownerOf(e) === id) doomed.add(e.id);
          }
        }
        // Instantané pour l'annulation, capturé AVANT filtrage : chaque entité
        // retirée avec sa position d'origine dans data.all et son appartenance
        // de groupe (le maître et ses entités liées partent ensemble).
        const snapshot = [];
        this.data.all.forEach((e, i) => {
          if (doomed.has(e.id))
            snapshot.push({ entity: e, index: i, groups: this.groupsOf(e.id) });
        });

        this.data.all = this.data.all.filter((e) => !doomed.has(e.id));
        for (const g of Object.keys(this.data.groups)) {
          this.data.groups[g] = this.data.groups[g].filter(
            (i) => !doomed.has(i),
          );
        }
        this.save();
        this.render();
        if (!entity) return;

        const restore = () => {
          // Ré-insertion aux index d'origine, en ordre croissant : chaque
          // splice replace l'entité dans son créneau exact.
          snapshot
            .slice()
            .sort((a, b) => a.index - b.index)
            .forEach(({ entity, index }) => {
              this.data.all.splice(
                Math.min(index, this.data.all.length),
                0,
                entity,
              );
            });
          for (const { entity, groups } of snapshot) {
            for (const g of groups) {
              if (
                this.data.groups[g] &&
                !this.data.groups[g].includes(entity.id)
              )
                this.data.groups[g].push(entity.id);
            }
          }
          this.save();
          this.render();
        };
        toastUndo(labels.removed(entity), restore);
      },

      /** Suppression en masse : même mécanique que remove() mais
          un seul snapshot fusionné + un seul toastUndo pour N entités
          (au lieu de N appels empilés qui s'écraseraient l'un l'autre). */
      removeMany(ids) {
        const doomed = new Set(ids);
        const linked = config.linked;
        if (linked) {
          for (const e of this.data.all) {
            if (linked.isChild(e) && doomed.has(linked.ownerOf(e))) doomed.add(e.id);
          }
        }
        const snapshot = [];
        this.data.all.forEach((e, i) => {
          if (doomed.has(e.id))
            snapshot.push({ entity: e, index: i, groups: this.groupsOf(e.id) });
        });
        if (!snapshot.length) return;

        this.data.all = this.data.all.filter((e) => !doomed.has(e.id));
        for (const g of Object.keys(this.data.groups)) {
          this.data.groups[g] = this.data.groups[g].filter((i) => !doomed.has(i));
        }
        this.save();
        this.render();

        const restore = () => {
          snapshot
            .slice()
            .sort((a, b) => a.index - b.index)
            .forEach(({ entity, index }) => {
              this.data.all.splice(Math.min(index, this.data.all.length), 0, entity);
            });
          for (const { entity, groups } of snapshot) {
            for (const g of groups) {
              if (this.data.groups[g] && !this.data.groups[g].includes(entity.id))
                this.data.groups[g].push(entity.id);
            }
          }
          this.save();
          this.render();
        };
        const n = snapshot.length;
        toastUndo(
          n === 1 ? labels.removed(snapshot[0].entity) : `${n} entités supprimées.`,
          restore,
        );
      },

      /* ---- Sélection multiple ---- */
      toggleSelect(id, checked) {
        if (checked) this._selected.add(id);
        else this._selected.delete(id);
        const input = document.querySelector(
          `[data-collection="${this.key}"][data-action="toggle-select"][data-id="${id}"]`,
        );
        const card = input && input.closest(".bulk-selectable");
        if (card) card.classList.toggle("bulk-selected", checked);
        BulkBar.update(this);
      },
      selectedIds() {
        return [...this._selected];
      },
      clearSelection() {
        this._selected.clear();
        this.render();
        BulkBar.update(this);
      },

      /* ---- Groupes ---- */
      addGroup() {
        Dialog.prompt({
          title: "Nouveau groupe",
          label: "Nom du groupe",
          placeholder: "ex. Gangers, Corpo, Renforts…",
          confirmLabel: "Créer",
        }).then((name) => {
          if (!name || !name.trim()) return;
          const key = name.trim();
          if (key === "all") {
            toast("Nom réservé.", "warning");
            return;
          }
          if (!this.data.groups[key]) this.data.groups[key] = [];
          this.save();
          this.render();
          toast(labels.createdGroup(key));
        });
      },

      removeGroup(key) {
        Dialog.confirm({
          title: "Supprimer le groupe",
          message: labels.removeConfirm(key),
          confirmLabel: "Supprimer",
          danger: true,
        }).then((ok) => {
          if (!ok) return;
          delete this.data.groups[key];
          if (this.currentGroup === key) this.currentGroup = "all";
          this.save();
          this.render();
        });
      },

      renameGroup(key) {
        Dialog.prompt({
          title: "Renommer le groupe",
          label: "Nouveau nom",
          value: key,
          confirmLabel: "Renommer",
        }).then((newName) => {
          if (!newName || !newName.trim() || newName.trim() === key) return;
          const newKey = newName.trim();
          if (this.data.groups[newKey]) {
            toast("Ce nom existe déjà.", "warning");
            return;
          }
          this.data.groups[newKey] = this.data.groups[key];
          delete this.data.groups[key];
          if (this.currentGroup === key) this.currentGroup = newKey;
          this.save();
          this.render();
        });
      },

      /** Ajoute/retire une entité d'un groupe sans toucher aux autres
          (appartenance multi-groupes). Le tableau est créé à la volée à
          la première assignation : permet de ranger dans un dossier que
          cette collection ne contenait pas encore (jointure par nom). */
      toggleGroup(id, groupKey, checked) {
        if (checked && !this.data.groups[groupKey])
          this.data.groups[groupKey] = [];
        const arr = this.data.groups[groupKey];
        if (!arr) return;
        const has = arr.includes(id);
        if (checked && !has) arr.push(id);
        if (!checked && has)
          this.data.groups[groupKey] = arr.filter((i) => i !== id);
        this.save();
        this.render();
      },

      /** Déplace N entités vers un dossier en un seul save()+render(),
          plutôt que d'enchaîner toggleGroup() qui re-rendrait à chaque id. */
      addManyToGroup(ids, groupKey) {
        if (!this.data.groups[groupKey]) this.data.groups[groupKey] = [];
        const arr = this.data.groups[groupKey];
        for (const id of ids) if (!arr.includes(id)) arr.push(id);
        this.save();
        this.render();
      },

      groupsOf(id) {
        return Object.keys(this.data.groups).filter((g) =>
          this.data.groups[g].includes(id),
        );
      },

      switchGroup(g) {
        this.currentGroup = g;
        this.render();
      },

      /* ---- Filtre de recherche ---- */
      setFilter(v) {
        this.filterText = v || "";
        this._renderGrid();
      },
      // `words` = requête déjà normalisée et découpée (calculée UNE fois par
      // _renderGrid, hors de la boucle de filtrage). Ne normalise plus ici que
      // le foin propre à l'entité.
      _matchesFilter(entity, words) {
        if (!words.length) return true;
        const hay = Utils.searchNorm(
          config.searchFields(entity).filter(Boolean).join(" "),
        );
        return words.every((word) => hay.includes(word));
      },

      /* ---- Rendu ---- */
      render() {
        // Toute mutation de data.all passe par save()+render() : on invalide
        // ici le cache childrenByOwner. La frappe du filtre passe par
        // setFilter → _renderGrid (jamais render()), donc le cache survit aux
        // frappes successives et data.all n'est plus rebalayé à chaque touche.
        this._childrenByOwner = null;
        this._wire();
        this._renderSidebar();
        this._renderGrid();
        // Notifie un agrégateur éventuel (ex : Hub) qu'une mutation a eu
        // lieu, sans que le socle connaisse la couche haute : c'est elle
        // qui injecte le callback via config.onChange.
        if (config.onChange) config.onChange();
      },

      _renderSidebar() {
        const container = document.getElementById(config.dom.sidebar);
        if (!container) return;
        const groups = Object.keys(this.data.groups);
        const dc = `data-collection="${this.key}"`;

        const allActive = this.currentGroup === "all" ? "active" : "";
        let html = `<div class="group-item ${allActive}" ${dc} data-action="switch-group" data-group="all">
          <span class="group-item-icon">${labels.allIcon}</span>
          <span class="group-item-name">${labels.allName}</span>
          <span class="group-item-count">${this.data.all.length}</span>
        </div>`;

        for (const g of groups) {
          const count = this.data.groups[g].length;
          const active = this.currentGroup === g ? "active" : "";
          const gEsc = CardRenderer._esc(g);
          const gAttr = CardRenderer._esc(g);
          html += `<div class="group-item ${active}" ${dc} data-action="switch-group" data-group="${gAttr}">
            <span class="group-item-icon">▸</span>
            <span class="group-item-name">${gEsc}</span>
            <span class="group-item-count">${count}</span>
            <span class="group-item-actions">
              <button class="btn-icon-tiny" ${dc} data-action="rename-group" data-group="${gAttr}" title="Renommer">✎</button>
              <button class="btn-icon-tiny danger" ${dc} data-action="remove-group" data-group="${gAttr}" title="Supprimer">✕</button>
            </span>
          </div>`;
        }

        container.innerHTML = html;

        const label =
          config.dom.label && document.getElementById(config.dom.label);
        if (label) {
          label.textContent =
            this.currentGroup === "all"
              ? labels.allSummary(this.data.all.length)
              : labels.groupSummary(
                  this.currentGroup,
                  (this.data.groups[this.currentGroup] || []).length,
                );
        }
      },

      _renderGrid() {
        const grid = document.getElementById(config.dom.grid);
        if (!grid) return;
        grid.innerHTML = "";

        let list = this.data.all;
        if (this.currentGroup !== "all") {
          const ids = this.data.groups[this.currentGroup] || [];
          list = this.data.all.filter((e) => ids.includes(e.id));
        }
        // Le plus récent en premier (data.all reste en ordre d'insertion).
        list = list.slice().reverse();
        const unfiltered = list.length;
        // Requête normalisée calculée une seule fois pour toute la liste.
        const q = Utils.searchNorm(this.filterText).trim();
        const words = q ? q.split(/\s+/) : [];
        list = list.filter((e) => this._matchesFilter(e, words));

        if (!list.length) {
          grid.innerHTML =
            unfiltered > 0 && this.filterText.trim()
              ? `<div class="empty-state">
                  <span class="empty-state-title">Aucun résultat</span>
                  ${labels.noMatch(CardRenderer._esc(this.filterText.trim()))}
                </div>`
              : `<div class="empty-state">
                  <span class="empty-state-title">${labels.emptyTitle}</span>
                  ${labels.emptyBody}
                </div>`;
          return;
        }

        this._renderList(grid, list);
      },

      /** Rend une liste d'entités (déjà filtrée/ordonnée) dans un conteneur,
          avec déclencheur de groupes, entités liées et entité imbriquée.
          Extrait de _renderGrid pour être réutilisable par un agrégateur
          externe (Hub) qui rend les membres d'un dossier hors de la grille
          propre à la collection. */
      _renderList(grid, list, context) {
        // Point d'entrée commun à _renderGrid ET renderMembers (Hub, écrans
        // de génération) : y poser _wire() garantit la délégation (dont le
        // glisser-déposer B1) même pour les collections qui n'appellent
        // jamais render() sur ce chemin (Characters évite l'appel exprès,
        // cf. son initPanel, pour ne pas boucler avec l'onChange DossierBar).
        this._wire();
        const allGroups = Object.keys(this.data.groups);
        const linked = config.linked;
        // Les entités liées suivent la carte de leur maître. Table mémoïsée :
        // reconstruite seulement après une mutation (render() remet à null),
        // pas à chaque frappe du filtre.
        if (!this._childrenByOwner) {
          const map = {};
          if (linked) {
            for (const e of this.data.all) {
              if (linked.isChild(e)) (map[linked.ownerOf(e)] ||= []).push(e);
            }
          }
          this._childrenByOwner = map;
        }
        const childrenByOwner = this._childrenByOwner;

        for (const entity of list) {
          if (linked && linked.isChild(entity)) continue; // rendue sous son maître
          const card = config.renderCard(entity, {
            allGroups,
            groupsIn: this.groupsOf(entity.id),
            collection: this,
            context,
          });
          // Toujours affiché : le popover permet de créer un premier
          // groupe à la volée même quand aucun n'existe encore.
          this._appendGroupTrigger(card, entity.id);
          this._appendReorderHandle(card, entity.id);
          this._appendSelectCheckbox(card, entity.id);
          grid.appendChild(card);
          for (const child of childrenByOwner[entity.id] || []) {
            grid.appendChild(linked.renderChild(child));
          }
          // Entité liée unique, imbriquée dans l'entité (ex : spider
          // d'un serveur) plutôt que sœur dans data.all.
          if (config.renderTrailing) {
            const extra = config.renderTrailing(entity);
            if (extra) grid.appendChild(extra);
          }
        }
      },

      /** Rend, dans un conteneur fourni, les entités dont l'id est listé
          (les plus récentes d'abord, comme la grille propre). Utilisé par
          le Hub pour composer une section par type dans une vue de dossier.
          `context` (ex. "library") descend jusqu'au rendu de carte pour
          adapter la densité à l'usage (consultation vs génération). */
      renderMembers(grid, ids, context) {
        const set = new Set(ids);
        const list = this.data.all.filter((e) => set.has(e.id));
        this._renderList(grid, list.slice().reverse(), context);
      },

      /** Bouton d'appartenance multi-groupes, uniforme sur toute carte.
          Ouvre le popover partagé (GroupPicker) par délégation. */
      _appendGroupTrigger(card, id) {
        const footer = card.querySelector(
          config.footerSelector || ".pnj-card-footer",
        );
        if (!footer) return;
        const groups = this.groupsOf(id);
        const gLabel =
          groups.length === 0
            ? "Groupes"
            : groups.length === 1
              ? groups[0]
              : `${groups.length} groupes`;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className =
          "group-picker-trigger" + (groups.length ? " has-groups" : "");
        btn.title = "Gérer les groupes";
        btn.dataset.collection = this.key;
        btn.dataset.action = "open-picker";
        btn.dataset.id = id;
        btn.innerHTML = `<span class="group-picker-trigger-icon">🏷</span><span class="group-picker-trigger-label">${CardRenderer._esc(gLabel)}</span>`;
        footer.prepend(btn);

        // Épingle rapide : même groupe multi-appartenance que le
        // bouton ci-dessus, juste une case réservée bascule en un clic —
        // aucun nouveau mécanisme de persistance.
        const pinned = groups.includes(Collection.FAV_GROUP);
        const pin = document.createElement("button");
        pin.type = "button";
        pin.className = "group-picker-trigger" + (pinned ? " has-groups" : "");
        pin.title = pinned ? "Retirer des favoris" : "Épingler aux favoris";
        pin.dataset.collection = this.key;
        pin.dataset.action = "toggle-pin";
        pin.dataset.id = id;
        pin.innerHTML = `<span class="group-picker-trigger-icon">★</span>`;
        footer.prepend(pin);
      },

      /** Poignée de réorganisation (Vague B1), dans le pied-gauche à côté de
          ★/🏷 — jamais de contrôle au repos (doctrine « Chrome de carte »),
          révélée uniquement par la classe `reordering` sur <body> (posée
          par ReorderMode). Un vrai <button> focusable : les flèches ↑/↓ au
          clavier sont le canal d'accessibilité de base, le glisser au
          pointeur/doigt est l'enrichissement progressif par-dessus. */
      _appendReorderHandle(card, id) {
        const footer = card.querySelector(
          config.footerSelector || ".pnj-card-footer",
        );
        if (!footer) return;
        card.dataset.reorderId = id;
        const handle = document.createElement("button");
        handle.type = "button";
        handle.className = "reorder-handle";
        handle.title = "Glisser pour réordonner (ou flèches ↑/↓)";
        handle.setAttribute("aria-label", "Réordonner");
        handle.textContent = "⠿";
        footer.prepend(handle);
      },

      /** Case à cocher de sélection multiple, en coin de carte —
          la classe marqueur passe la carte en position:relative, générique
          quel que soit le renderer de carte utilisé par le domaine. */
      _appendSelectCheckbox(card, id) {
        card.classList.add("bulk-selectable");
        const checked = this._selected.has(id);
        if (checked) card.classList.add("bulk-selected");
        const label = document.createElement("label");
        label.className = "bulk-select-check";
        label.title = "Sélectionner";
        label.innerHTML = `<input type="checkbox" data-collection="${this.key}" data-action="toggle-select" data-id="${id}"${checked ? " checked" : ""}>`;
        card.prepend(label);
      },

      /* ---- Délégation d'événements (modèle ContentModal) ----
         Un seul écouteur par instance, filtré sur data-collection. */
      _wire() {
        if (this._wired) return;
        this._wired = true;
        const mine = `[data-action][data-collection="${this.key}"]`;

        document.addEventListener("click", (e) => {
          const el = e.target.closest(mine);
          if (!el) return;
          switch (el.dataset.action) {
            case "switch-group":
              this.switchGroup(el.dataset.group);
              break;
            case "add-group":
              this.addGroup();
              break;
            case "rename-group":
              this.renameGroup(el.dataset.group);
              break;
            case "remove-group":
              this.removeGroup(el.dataset.group);
              break;
            case "open-picker":
              GroupPicker.open(this, el.dataset.id, el);
              break;
            case "toggle-pin": {
              const pinned = this.groupsOf(el.dataset.id).includes(
                Collection.FAV_GROUP,
              );
              this.toggleGroup(el.dataset.id, Collection.FAV_GROUP, !pinned);
              break;
            }
          }
        });

        document.addEventListener("change", (e) => {
          const el = e.target.closest(
            `[data-action="toggle-select"][data-collection="${this.key}"]`,
          );
          if (!el) return;
          this.toggleSelect(el.dataset.id, el.checked);
        });

        document.addEventListener("input", (e) => {
          const el = e.target.closest(
            `[data-action="filter"][data-collection="${this.key}"]`,
          );
          if (!el) return;
          // Debounce : la grille est reconstruite au plus une fois par salve
          // de frappes (~130 ms), pas à chaque touche. La valeur est capturée
          // maintenant car l'input peut avoir changé au déclenchement.
          const value = el.value;
          clearTimeout(this._filterTimer);
          this._filterTimer = setTimeout(() => this.setFilter(value), 130);
        });

        this._initReorderDrag();
        this._wireReorderKeys();
      },

      /* ---- Réorganisation manuelle (Vague B1) ----
         Même patron que Encounter._initDrag/_dragMove/_dragEnd (Pointer
         Events, DOM réordonné en direct pendant le glisser, commit au
         relâcher seulement) — pas extrait en utilitaire partagé pour ne pas
         toucher un mécanisme combat-critique déjà stable ; la forme de
         l'algorithme reste la même aux deux endroits.
         Simplification assumée : reorderByIds/moveUp/moveDown opèrent sur
         data.all en entier, y compris quand la vue affichée est filtrée par
         dossier (DossierBar) — le résultat reste toujours correct (aucune
         entité perdue, les ids hors du glisser sont préservés en fin de
         liste), simplement moins intuitif dans ce cas précis. Le cas
         d'usage principal (dossier « Tout ») n'est pas affecté. */
      moveUp(id) {
        // "Monter" à l'écran = plus récent = index plus grand dans data.all
        // (le rendu affiche data.all inversé, le plus récent en tête).
        const idx = this.data.all.findIndex((e) => e.id === id);
        if (idx === -1 || idx >= this.data.all.length - 1) return;
        this._reorderSwap(idx, idx + 1);
      },
      moveDown(id) {
        const idx = this.data.all.findIndex((e) => e.id === id);
        if (idx <= 0) return;
        this._reorderSwap(idx, idx - 1);
      },
      _reorderSwap(i, j) {
        const arr = this.data.all;
        [arr[i], arr[j]] = [arr[j], arr[i]];
        this._afterReorder();
      },
      /** Réordonne data.all selon un ordre d'AFFICHAGE (plus récent en
          tête, comme rendu par _renderGrid) — même patron que
          Encounter.reorderByIds : reconstruction par Map, toute entité
          absente de displayIds (liée, filtrée hors vue) est conservée en
          fin, jamais perdue. */
      reorderByIds(displayIds) {
        const storageIds = displayIds.slice().reverse();
        const byId = new Map(this.data.all.map((e) => [e.id, e]));
        const next = [];
        for (const id of storageIds) {
          const e = byId.get(id);
          if (e) {
            next.push(e);
            byId.delete(id);
          }
        }
        for (const e of byId.values()) next.push(e);
        this.data.all = next;
        this._afterReorder();
      },
      /** Referme la boucle avec le rafraîchissement propre à chaque
          domaine : render() (générique, suffisant pour Characters dont la
          grille est le rendu natif) PUIS refreshGrid() si le contrôleur en
          expose un (Contacts/Servers, dont l'écran de génération est une
          vue externe à la grille native — cf. ContactsBook.refreshGrid). */
      _afterReorder() {
        this.save();
        this.render();
        if (typeof this.refreshGrid === "function") this.refreshGrid();
      },
      /** Conteneur réellement visible où glisser (Contacts/Servers y
          affichent leurs cartes hors de dom.grid, cf. dragGrid). */
      _dragGridEl() {
        return document.getElementById(config.dom.dragGrid || config.dom.grid);
      },
      _initReorderDrag() {
        const grid = this._dragGridEl();
        if (!grid) return;
        grid.addEventListener("pointerdown", (e) => {
          const handle = e.target.closest(".reorder-handle");
          if (!handle) return;
          const card = handle.closest("[data-reorder-id]");
          if (!card) return;
          e.preventDefault();
          this._rdrag = { card, grid };
          card.classList.add("dragging");
          try {
            handle.setPointerCapture(e.pointerId);
          } catch (_) {}
          const move = (ev) => this._reorderDragMove(ev);
          const up = (ev) => {
            try {
              handle.releasePointerCapture(ev.pointerId);
            } catch (_) {}
            document.removeEventListener("pointermove", move);
            document.removeEventListener("pointerup", up);
            document.removeEventListener("pointercancel", up);
            this._reorderDragEnd();
          };
          document.addEventListener("pointermove", move);
          document.addEventListener("pointerup", up);
          document.addEventListener("pointercancel", up);
        });
      },
      /** Déplace la carte saisie parmi ses voisines selon la position Y du
          pointeur (comparée au milieu de chaque cible), DOM seul — l'état
          n'est réécrit qu'au relâcher (_reorderDragEnd). */
      _reorderDragMove(ev) {
        if (!this._rdrag) return;
        ev.preventDefault();
        const { card, grid } = this._rdrag;
        const targets = [
          ...grid.querySelectorAll("[data-reorder-id]:not(.dragging)"),
        ];
        let before = null;
        for (const t of targets) {
          const box = t.getBoundingClientRect();
          if (ev.clientY < box.top + box.height / 2) {
            before = t;
            break;
          }
        }
        if (before) grid.insertBefore(card, before);
        else grid.appendChild(card);
      },
      _reorderDragEnd() {
        if (!this._rdrag) return;
        const { card, grid } = this._rdrag;
        card.classList.remove("dragging");
        this._rdrag = null;
        const ids = [...grid.querySelectorAll("[data-reorder-id]")].map(
          (c) => c.dataset.reorderId,
        );
        this.reorderByIds(ids);
      },
      /** Flèches ↑/↓ sur la poignée focus (a11y — Vector) : canal de base,
          le glisser est l'enrichissement progressif par-dessus. */
      _wireReorderKeys() {
        const grid = this._dragGridEl();
        if (!grid) return;
        grid.addEventListener("keydown", (e) => {
          if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
          const handle = e.target.closest(".reorder-handle");
          if (!handle) return;
          const id = handle.closest("[data-reorder-id]")?.dataset.reorderId;
          if (!id) return;
          e.preventDefault();
          if (e.key === "ArrowUp") this.moveUp(id);
          else this.moveDown(id);
          // _afterReorder() -> render() reconstruit tout le DOM de façon
          // SYNCHRONE (aucune des trois collections ne diffère son rendu) :
          // le focus est perdu sans ce recentrage, appelé ici sans délai
          // (pas de requestAnimationFrame — le nouveau nœud existe déjà).
          document
            .querySelector(`[data-reorder-id="${CSS.escape(id)}"] .reorder-handle`)
            ?.focus();
        });
      },
    };

    return col;
  },

  /* Libellés par défaut — chaque collection surcharge ce qui la concerne. */
  _defaults: {
    allIcon: "◈",
    allName: "Tous",
    allSummary: (n) => `Tous (${n})`,
    groupSummary: (name, n) => `${name} (${n})`,
    removeConfirm: (key) => `Supprimer le groupe "${key}" ?`,
    createdGroup: (key) => `Groupe "${key}" créé.`,
    emptyTitle: "Vide",
    emptyBody: "",
    noMatch: (q) => `Aucun résultat pour « ${q} ».`,
    removed: (e) => `${e.name} supprimé.`,
  },
};

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.Collection = Collection;
