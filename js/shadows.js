"use strict";

/* ============================================================
   SHADOWS — Ombres portées (bibliothèque de PNJ)
   Layout : sidebar groupes à gauche, grille à droite
   ============================================================ */
const Shadows = {
  data: {
    all: [],
    groups: {},
  },
  currentGroup: "all",

  /* ---- Persistance ---- */
  load() {
    this.data.all = Storage.get("shadows_all", []);
    this.data.groups = Storage.get("shadows_groups", {});
  },

  save() {
    Storage.set("shadows_all", this.data.all);
    Storage.set("shadows_groups", this.data.groups);
  },

  /* ---- Sauvegarder un PNJ depuis le générateur ---- */
  savePNJ(id, targetGroup) {
    const pnj = Gen.findInPool(id);
    if (!pnj) {
      toast("PNJ introuvable dans le pool.");
      return;
    }

    if (this.data.all.find((p) => p.id === id)) {
      toast("Déjà sauvegardé dans les Ombres.");
      return;
    }

    // Si des groupes existent et qu'aucun groupe n'est spécifié, proposer un picker
    const groups = Object.keys(this.data.groups);
    if (!targetGroup && groups.length > 0) {
      this._pickGroupThenSave(pnj, groups);
      return;
    }

    this._doSave(pnj, targetGroup || null);
  },

  _pickGroupThenSave(pnj, groups) {
    // Afficher un mini-picker inline
    const card = document.querySelector(`.pnj-card[data-id="${pnj.id}"]`);
    if (!card) {
      this._doSave(pnj, null);
      return;
    }

    const footer = card.querySelector(".pnj-card-footer");
    if (!footer) {
      this._doSave(pnj, null);
      return;
    }

    const opts = groups
      .map(
        (g) =>
          `<button class="btn-secondary btn-small" style="margin:2px;"
        onclick="Shadows._doSaveFromCard('${pnj.id}', '${g.replace(/'/g, "\\'")}')">
        ${g}
      </button>`,
      )
      .join("");

    footer.innerHTML = `
      <div style="font-size:0.65rem;color:var(--text-dim);margin-bottom:4px;">Ajouter au groupe :</div>
      ${opts}
      <button class="btn-icon" style="margin:2px;" onclick="Shadows._doSaveFromCard('${pnj.id}', null)">
        Sans groupe
      </button>`;
  },

  _doSaveFromCard(id, group) {
    const pnj = Gen.findInPool(id);
    if (!pnj) return;
    this._doSave(pnj, group);
  },

  _doSave(pnj, group) {
    this.data.all.push(pnj);
    if (group && this.data.groups[group]) {
      this.data.groups[group].push(pnj.id);
    }
    this.save();
    this.render();
    toast(`✓ ${pnj.name} ajouté aux Ombres${group ? ` → ${group}` : ""}.`);

    // Mettre à jour le footer de la card dans le générateur
    const card = document.querySelector(`.pnj-card[data-id="${pnj.id}"]`);
    if (card) {
      const footer = card.querySelector(".pnj-card-footer");
      if (footer) {
        footer.innerHTML = `<span class="card-saved-label">✓ Sauvegardé</span>
          <button class="card-action-btn ghost" onclick="EditModal.open('${pnj.id}')">Éditer</button>`;
      }
    }
  },

  /* ---- Supprimer un PNJ ---- */
  removePNJ(id) {
    const pnj = this.data.all.find((p) => p.id === id);
    const name = pnj ? pnj.name : "Figurant";
    this.data.all = this.data.all.filter((p) => p.id !== id);
    for (const g of Object.keys(this.data.groups)) {
      this.data.groups[g] = this.data.groups[g].filter((i) => i !== id);
    }
    this.save();
    this.render();
    toast(`${name} supprimé.`);
  },

  /* ---- Groupes ---- */
  addGroup() {
    const name = prompt("Nom du groupe :");
    if (!name || !name.trim()) return;
    const key = name.trim();
    if (key === "all") {
      toast("Nom réservé.");
      return;
    }
    if (!this.data.groups[key]) this.data.groups[key] = [];
    this.save();
    this.render();
    toast(`Groupe "${key}" créé.`);
  },

  removeGroup(key) {
    if (
      !confirm(
        `Supprimer le groupe "${key}" ? (Les PNJ restent dans les Ombres.)`,
      )
    )
      return;
    delete this.data.groups[key];
    if (this.currentGroup === key) this.currentGroup = "all";
    this.save();
    this.render();
  },

  renameGroup(key) {
    const newName = prompt("Nouveau nom :", key);
    if (!newName || !newName.trim() || newName.trim() === key) return;
    const newKey = newName.trim();
    if (this.data.groups[newKey]) {
      toast("Ce nom existe déjà.");
      return;
    }
    this.data.groups[newKey] = this.data.groups[key];
    delete this.data.groups[key];
    if (this.currentGroup === key) this.currentGroup = newKey;
    this.save();
    this.render();
  },

  /* ---- Déplacer un PNJ vers un groupe ---- */
  movePNJToGroup(id, targetGroup) {
    // Retirer des autres groupes
    for (const g of Object.keys(this.data.groups)) {
      this.data.groups[g] = this.data.groups[g].filter((i) => i !== id);
    }
    // Ajouter au nouveau groupe (si pas "all")
    if (targetGroup !== "all" && this.data.groups[targetGroup]) {
      if (!this.data.groups[targetGroup].includes(id)) {
        this.data.groups[targetGroup].push(id);
      }
    }
    this.save();
    this.render();
  },

  groupsOfPNJ(id) {
    return Object.keys(this.data.groups).filter((g) =>
      this.data.groups[g].includes(id),
    );
  },

  switchGroup(g) {
    this.currentGroup = g;
    this.render();
  },

  /* ---- Sauvegarder tous les PNJ visibles dans le groupe courant ---- */
  saveAllVisible() {
    if (this.currentGroup === "all") {
      toast("Sélectionnez un groupe d'abord.");
      return;
    }
    const ids = this.data.groups[this.currentGroup] || [];
    let added = 0;
    for (const pnj of this.data.all) {
      if (!ids.includes(pnj.id)) {
        this.data.groups[this.currentGroup].push(pnj.id);
        added++;
      }
    }
    this.save();
    this.render();
    toast(
      added > 0
        ? `${added} PNJ ajoutés au groupe.`
        : "Tous les PNJ sont déjà dans ce groupe.",
    );
  },

  /* ---- Rendu ---- */
  render() {
    this._renderSidebar();
    this._renderGrid();
  },

  _renderSidebar() {
    const container = document.getElementById("shadows-group-list");
    if (!container) return;
    const groups = Object.keys(this.data.groups);

    const allActive = this.currentGroup === "all" ? "active" : "";
    let html = `<div class="group-item ${allActive}" onclick="Shadows.switchGroup('all')">
      <span class="group-item-icon">◈</span>
      <span class="group-item-name">Tous</span>
      <span class="group-item-count">${this.data.all.length}</span>
    </div>`;

    for (const g of groups) {
      const count = this.data.groups[g].length;
      const active = this.currentGroup === g ? "active" : "";
      const gSafe = g.replace(/'/g, "\\'");
      html += `<div class="group-item ${active}" onclick="Shadows.switchGroup('${gSafe}')">
        <span class="group-item-icon">▸</span>
        <span class="group-item-name">${g}</span>
        <span class="group-item-count">${count}</span>
        <span class="group-item-actions">
          <button class="btn-icon-tiny" onclick="event.stopPropagation(); Shadows.renameGroup('${gSafe}')" title="Renommer">✎</button>
          <button class="btn-icon-tiny danger" onclick="event.stopPropagation(); Shadows.removeGroup('${gSafe}')" title="Supprimer">✕</button>
        </span>
      </div>`;
    }

    container.innerHTML = html;

    // Label du groupe courant dans la toolbar
    const label = document.getElementById("shadows-group-label");
    if (label) {
      label.textContent =
        this.currentGroup === "all"
          ? `Tous les figurants (${this.data.all.length})`
          : `${this.currentGroup} (${(this.data.groups[this.currentGroup] || []).length})`;
    }
  },

  _renderGrid() {
    const grid = document.getElementById("shadows-grid");
    if (!grid) return;
    grid.innerHTML = "";

    let list = this.data.all;
    if (this.currentGroup !== "all") {
      const ids = this.data.groups[this.currentGroup] || [];
      list = this.data.all.filter((p) => ids.includes(p.id));
    }

    if (!list.length) {
      grid.innerHTML = `<div class="empty-state">
        <span class="empty-state-title">Aucun figurant ici</span>
        Générez des PNJ et sauvegardez-les depuis le générateur.
      </div>`;
      return;
    }

    const allGroups = Object.keys(this.data.groups);
    for (const pnj of list) {
      const card = CardRenderer.render(pnj, ["edit", "remove"]);
      // Ajouter le sélecteur de groupe sur chaque card
      if (allGroups.length > 0) {
        this._appendGroupSelector(card, pnj.id, allGroups);
      }
      grid.appendChild(card);
    }
  },

  _appendGroupSelector(card, id, groups) {
    const currentGroups = this.groupsOfPNJ(id);
    const footer = card.querySelector(".pnj-card-footer");
    if (!footer) return;

    const opts = ["— Sans groupe —", ...groups]
      .map((g) => {
        const val = g === "— Sans groupe —" ? "all" : g;
        const sel = currentGroups.includes(g) ? "selected" : "";
        return `<option value="${val}" ${sel}>${g}</option>`;
      })
      .join("");

    const sel = document.createElement("select");
    sel.className = "group-select-inline";
    sel.title = "Déplacer vers un groupe";
    sel.innerHTML = opts;
    sel.onchange = () => {
      Shadows.movePNJToGroup(id, sel.value);
    };

    footer.prepend(sel);
  },
};
