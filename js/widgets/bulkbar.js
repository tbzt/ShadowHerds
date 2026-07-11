"use strict";

/* ============================================================
   BARRE D'ACTIONS EN MASSE (CH-Q10) — panneau flottant non bloquant,
   ancré en bas d'écran (DOM créé à la volée comme Notepad), mais sans
   backdrop capteur : il doit coexister avec la grille qu'on sélectionne.
   Une seule collection « active » à la fois : la dernière dont la
   sélection est non vide. Ne connaît d'une collection que son API
   publique (selectedIds/clearSelection/removeMany/addManyToGroup/_cfg) —
   jamais de branche par domaine ici.
   ============================================================ */
const BulkBar = {
  _col: null,

  _ensure() {
    if (document.getElementById("bulk-bar")) return;
    const bar = document.createElement("div");
    bar.id = "bulk-bar";
    bar.setAttribute("role", "toolbar");
    bar.setAttribute("aria-label", "Actions sur la sélection");
    document.body.appendChild(bar);

    bar.addEventListener("click", (e) => {
      const el = e.target.closest("[data-action]");
      if (!el) return;
      switch (el.dataset.action) {
        case "bulk-clear":
          if (this._col) this._col.clearSelection();
          break;
        case "bulk-delete":
          this._delete();
          break;
        case "bulk-encounter":
          this._addToEncounter();
          break;
        case "bulk-move": {
          const menu = document.getElementById("bulk-move-menu");
          if (menu) menu.hidden = !menu.hidden;
          break;
        }
        case "bulk-move-to":
          this._moveTo(el.dataset.dossierName);
          break;
      }
    });

    // Ferme le menu « Déplacer vers » au clic ailleurs (pas de backdrop
    // dédié, la barre doit rester non bloquante).
    document.addEventListener("click", (e) => {
      const menu = document.getElementById("bulk-move-menu");
      if (menu && !menu.hidden && !e.target.closest(".bulk-move-wrap")) {
        menu.hidden = true;
      }
    });
  },

  /** Appelé par Collection à chaque changement de sélection. */
  update(collection) {
    this._ensure();
    if (collection.selectedIds().length > 0) this._col = collection;
    else if (this._col === collection) this._col = null;
    this._render();
  },

  _render() {
    const bar = document.getElementById("bulk-bar");
    const ids = this._col ? this._col.selectedIds() : [];
    if (!ids.length) {
      bar.classList.remove("open");
      bar.innerHTML = "";
      return;
    }
    const combat = !!this._col._cfg.combatEligible;
    const dossiers = Dossiers.roots();
    const moveMenu = dossiers.length
      ? dossiers
          .map(
            (d) =>
              `<button class="bulk-move-item" data-action="bulk-move-to" data-dossier-name="${CardRenderer._esc(d.name)}">${CardRenderer._esc(d.name)}</button>`,
          )
          .join("")
      : `<span class="bulk-move-empty">Aucun dossier — créez-en un via « 🏷 Groupes ».</span>`;
    bar.innerHTML = `
      <span class="bulk-count">${ids.length} sélectionné${ids.length > 1 ? "s" : ""}</span>
      <span class="bulk-actions">
        <span class="bulk-move-wrap">
          <button class="btn-secondary btn-small" data-action="bulk-move">Déplacer vers ▾</button>
          <div class="bulk-move-menu" id="bulk-move-menu" hidden>${moveMenu}</div>
        </span>
        ${combat ? `<button class="btn-secondary btn-small" data-action="bulk-encounter">⚔ Ajouter au combat</button>` : ""}
        <button class="danger-btn btn-small" data-action="bulk-delete">Supprimer</button>
        <button class="btn-icon-tiny" data-action="bulk-clear" title="Annuler la sélection" aria-label="Annuler la sélection">✕</button>
      </span>`;
    bar.classList.add("open");
  },

  _moveTo(name) {
    if (!this._col || !name) return;
    this._col.addManyToGroup(this._col.selectedIds(), name);
    toast(`Déplacé vers « ${name} ».`);
    this._col.clearSelection();
  },

  async _delete() {
    if (!this._col) return;
    const col = this._col;
    const ids = col.selectedIds();
    const ok = await Dialog.confirm({
      title: "Supprimer la sélection",
      message: `Supprimer ${ids.length} entité${ids.length > 1 ? "s" : ""} ? Action annulable quelques secondes.`,
      confirmLabel: "Supprimer",
      danger: true,
    });
    if (!ok) return;
    col.removeMany(ids);
    col.clearSelection();
  },

  _addToEncounter() {
    if (!this._col) return;
    const col = this._col;
    Encounter.addMany(col.selectedIds());
    col.clearSelection();
  },
};
