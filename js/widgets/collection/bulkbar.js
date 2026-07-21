"use strict";

/* ============================================================
   BARRE D'ACTIONS EN MASSE — panneau flottant non bloquant,
   ancré en bas d'écran (DOM créé à la volée comme Notepad), mais sans
   backdrop capteur : il doit coexister avec la grille qu'on sélectionne.
   Une seule collection « active » à la fois : la dernière dont la
   sélection est non vide. Ne connaît d'une collection que son API
   publique (selectedIds/clearSelection/removeMany/addManyToGroup/_cfg) —
   jamais de branche par domaine ici.
   ============================================================ */
import { Dialog } from "../kit/dialog.js";
import { Dossiers } from "../journal/dossiers.js";
import { SelectionMode } from "./selectionmode.js";

export const BulkBar = {
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
          // ✕ = « j'ai fini » : vide la sélection ET sort du mode.
          SelectionMode.exit();
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
          this._moveTo(el.dataset.dossierId);
          break;
        case "bulk-link": {
          const menu = document.getElementById("bulk-link-menu");
          if (menu) menu.hidden = !menu.hidden;
          break;
        }
        case "bulk-link-to":
          this._linkToPj(el.dataset.pjId);
          break;
        case "bulk-link-team":
          this._linkToTeam();
          break;
      }
    });

    // Ferme les menus dépliés (Déplacer / Lier) au clic ailleurs (pas de
    // backdrop dédié, la barre doit rester non bloquante).
    document.addEventListener("click", (e) => {
      const move = document.getElementById("bulk-move-menu");
      if (move && !move.hidden && !e.target.closest(".bulk-move-wrap")) {
        move.hidden = true;
      }
      const link = document.getElementById("bulk-link-menu");
      if (link && !link.hidden && !e.target.closest(".bulk-link-wrap")) {
        link.hidden = true;
      }
    });
  },

  /** Vide la sélection de la collection active et referme la barre.
      Appelé par SelectionMode à la sortie du mode. */
  exit() {
    if (this._col) this._col.clearSelection();
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
              `<button class="bulk-move-item" data-action="bulk-move-to" data-dossier-id="${CardRenderer._esc(d.id)}">${CardRenderer._esc(d.name)}</button>`,
          )
          .join("")
      : `<span class="bulk-move-empty">Aucun dossier — créez-en un via « 🏷 Groupes ».</span>`;

    // Rattachement en masse à un PJ (collections dont _cfg.pjLinkable) : la
    // collection fournit la liste des PJ (pjLinkOptions) et exécute le lien
    // (linkManyToPj) — BulkBar ne connaît que cette API, jamais le domaine.
    const pjLinkable = !!this._col._cfg.pjLinkable && typeof this._col.pjLinkOptions === "function";
    let linkBtn = "";
    if (pjLinkable) {
      const pjs = this._col.pjLinkOptions();
      // Raccourci « toute l'équipe active » en tête du menu, quand l'équipe a
      // des membres et que la collection expose linkManyToTeam.
      const teamItem =
        typeof this._col.linkManyToTeam === "function" &&
        typeof Characters !== "undefined" &&
        Characters.activeTeamMembers().length
          ? `<button class="bulk-move-item bulk-link-team" data-action="bulk-link-team">${CardRenderer._esc(ContactsBook.teamLinkLabel())}</button>`
          : "";
      const linkMenu = pjs.length
        ? teamItem +
          pjs
            .map(
              (p) =>
                `<button class="bulk-move-item" data-action="bulk-link-to" data-pj-id="${CardRenderer._esc(p.id)}">${CardRenderer._esc(p.name)}</button>`,
            )
            .join("")
        : `<span class="bulk-move-empty">Aucun PJ — créez-en un dans Équipe.</span>`;
      linkBtn = `<span class="bulk-move-wrap bulk-link-wrap">
          <button class="btn-secondary btn-small" data-action="bulk-link">🔗 Lier à un PJ ▾</button>
          <div class="bulk-move-menu" id="bulk-link-menu" hidden>${linkMenu}</div>
        </span>`;
    }

    bar.innerHTML = `
      <span class="bulk-count">${ids.length} sélectionné${ids.length > 1 ? "s" : ""}</span>
      <span class="bulk-actions">
        <span class="bulk-move-wrap">
          <button class="btn-secondary btn-small" data-action="bulk-move">Déplacer vers ▾</button>
          <div class="bulk-move-menu" id="bulk-move-menu" hidden>${moveMenu}</div>
        </span>
        ${linkBtn}
        ${combat ? `<button class="btn-secondary btn-small" data-action="bulk-encounter"><svg class="icon icon-sm" aria-hidden="true"><use href="#ic-combat"></use></svg> Ajouter au combat</button>` : ""}
        <button class="danger-btn btn-small" data-action="bulk-delete">Supprimer</button>
        <button class="btn-icon-tiny" data-action="bulk-clear" title="Annuler la sélection" aria-label="Annuler la sélection">✕</button>
      </span>`;
    bar.classList.add("open");
  },

  /** Rattache les entités sélectionnées au PJ choisi, via l'API publique de
      la collection active (linkManyToPj gère lien, toast et vidage). */
  _linkToPj(pjId) {
    if (!this._col || !pjId || typeof this._col.linkManyToPj !== "function") return;
    this._col.linkManyToPj(this._col.selectedIds(), pjId);
  },

  /** Rattache la sélection à toute l'équipe active (linkManyToTeam gère lien,
      toast et vidage). Symétrique de _linkToPj. */
  _linkToTeam() {
    if (!this._col || typeof this._col.linkManyToTeam !== "function") return;
    this._col.linkManyToTeam(this._col.selectedIds());
  },

  _moveTo(dossierId) {
    if (!this._col || !dossierId) return;
    // Chemin d'écriture unique, partagé avec le glisser-déposer (FileRail).
    // VIS-16 1-bis : la cible est l'ID du dossier (l'appartenance est keyée id).
    this._col.fileInto(this._col.selectedIds(), dossierId);
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

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.BulkBar = BulkBar;
