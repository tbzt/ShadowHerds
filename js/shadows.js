'use strict';

/* ============================================================
   SHADOWS — Ombres portées (bibliothèque de PNJ sauvegardés)
   ============================================================ */
const Shadows = {
  data: {
    all:    [],   // tableau de tous les PNJ
    groups: {},   // { nom: [id, id, ...] }
  },
  currentGroup: 'all',

  /* ---- Persistance ---- */
  load() {
    this.data.all    = Storage.get('shadows_all', []);
    this.data.groups = Storage.get('shadows_groups', {});
  },

  save() {
    Storage.set('shadows_all',    this.data.all);
    Storage.set('shadows_groups', this.data.groups);
  },

  /* ---- Sauvegarder un PNJ depuis le générateur ---- */
  savePNJ(id) {
    // Chercher dans le pool du générateur
    const pnj = Gen.findInPool(id);
    if (!pnj) { toast('PNJ introuvable dans le pool.'); return; }

    if (this.data.all.find(p => p.id === id)) {
      toast('Déjà sauvegardé dans les Ombres.');
      return;
    }

    this.data.all.push(pnj);
    this.save();
    this.render();
    toast(`✓ ${pnj.name} ajouté aux Ombres.`);

    // Met à jour le footer de la card générée
    const card = document.querySelector(`.pnj-card[data-id="${id}"]`);
    if (card) {
      const footer = card.querySelector('.pnj-card-footer');
      if (footer) {
        footer.innerHTML = `<span class="card-saved-label">✓ Sauvegardé</span>
          <button class="card-action-btn ghost" onclick="EditModal.open('${id}')">Éditer</button>`;
      }
    }
  },

  /* ---- Supprimer un PNJ ---- */
  removePNJ(id) {
    const pnj = this.data.all.find(p => p.id === id);
    const name = pnj ? pnj.name : 'Figurant';

    this.data.all = this.data.all.filter(p => p.id !== id);
    // Retirer de tous les groupes
    for (const g of Object.keys(this.data.groups)) {
      this.data.groups[g] = this.data.groups[g].filter(i => i !== id);
    }

    this.save();
    this.render();
    toast(`${name} supprimé.`);
  },

  /* ---- Groupes ---- */
  addGroup() {
    const name = prompt('Nom du groupe :');
    if (!name || !name.trim()) return;
    const key = name.trim();
    if (key === 'all') { toast('Nom réservé.'); return; }
    if (!this.data.groups[key]) this.data.groups[key] = [];
    this.save();
    this.render();
    toast(`Groupe "${key}" créé.`);
  },

  removeGroup(key) {
    if (!confirm(`Supprimer le groupe "${key}" ? (Les PNJ restent dans les Ombres.)`)) return;
    delete this.data.groups[key];
    if (this.currentGroup === key) this.currentGroup = 'all';
    this.save();
    this.render();
  },

  addPNJToGroup(pnjId, groupKey) {
    if (!this.data.groups[groupKey]) return;
    if (!this.data.groups[groupKey].includes(pnjId)) {
      this.data.groups[groupKey].push(pnjId);
      this.save();
    }
  },

  switchGroup(g) {
    this.currentGroup = g;
    this.render();
  },

  /* ---- Rendu ---- */
  render() {
    this._renderTabs();
    this._renderGrid();
  },

  _renderTabs() {
    const container = document.getElementById('group-tabs');
    const groups = Object.keys(this.data.groups);

    let html = `<button class="group-tab ${this.currentGroup === 'all' ? 'active' : ''}"
      onclick="Shadows.switchGroup('all')">Tous (${this.data.all.length})</button>`;

    for (const g of groups) {
      const count = this.data.groups[g].length;
      const active = this.currentGroup === g ? 'active' : '';
      html += `<button class="group-tab deletable ${active}" onclick="Shadows.switchGroup('${g}')">
        ${g} (${count})
        <span class="group-tab-del" onclick="event.stopPropagation(); Shadows.removeGroup('${g}')">✕</span>
      </button>`;
    }

    container.innerHTML = html;
  },

  _renderGrid() {
    const grid = document.getElementById('shadows-grid');
    grid.innerHTML = '';

    let list = this.data.all;
    if (this.currentGroup !== 'all') {
      const ids = this.data.groups[this.currentGroup] || [];
      list = this.data.all.filter(p => ids.includes(p.id));
    }

    if (!list.length) {
      grid.innerHTML = `<div class="empty-state">
        <span class="empty-state-title">Aucun figurant ici</span>
        Générez des PNJ et sauvegardez-les depuis le générateur.
      </div>`;
      return;
    }

    for (const pnj of list) {
      const card = CardRenderer.render(pnj, ['edit', 'remove']);
      grid.appendChild(card);
    }
  },
};
