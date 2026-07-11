"use strict";

/* ============================================================
   GROUP PICKER — popover d'appartenance multi-groupes
   ------------------------------------------------------------
   Widget partagé par toutes les collections (Shadows, Contacts,
   Servers). Une entité peut appartenir à plusieurs groupes à la
   fois. Un seul panneau flottant (hors grille), repositionné sur
   le déclencheur cliqué ; feuille basse sur mobile (voir CSS).

   Agnostique : reçoit l'instance de collection concernée et ne
   dialogue avec elle que via son API publique (data.groups,
   groupsOf, toggleGroup, save, render). Câblage interne par
   délégation, sans aucun handler inline.
   ============================================================ */
const GroupPicker = {
  _collection: null,
  _id: null,

  _ensure() {
    if (document.getElementById("group-picker-panel")) return;

    const backdrop = document.createElement("div");
    backdrop.id = "group-picker-backdrop";
    backdrop.addEventListener("click", () => this.close());
    document.body.appendChild(backdrop);

    const panel = document.createElement("div");
    panel.id = "group-picker-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Groupes de l'entité");
    document.body.appendChild(panel);

    // Délégation locale au panneau (re-rendu à chaque toggle).
    panel.addEventListener("change", (e) => {
      const cb = e.target.closest('input[type="checkbox"][data-group]');
      if (!cb || !this._collection) return;
      this._collection.toggleGroup(this._id, cb.dataset.group, cb.checked);
      this._render();
    });
    panel.addEventListener("click", (e) => {
      const el = e.target.closest("[data-action]");
      if (!el) return;
      if (el.dataset.action === "close") this.close();
      if (el.dataset.action === "create") this.createAndAssign();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.close();
    });
    window.addEventListener("resize", () => {
      if (this._id) this.close();
    });
  },

  open(collection, id, triggerEl) {
    this._ensure();
    this._collection = collection;
    this._id = id;
    this._render();
    document.getElementById("group-picker-backdrop").classList.add("open");
    document.getElementById("group-picker-panel").classList.add("open");
    this._position(triggerEl);
  },

  close() {
    const panel = document.getElementById("group-picker-panel");
    const backdrop = document.getElementById("group-picker-backdrop");
    if (panel) panel.classList.remove("open");
    if (backdrop) backdrop.classList.remove("open");
    this._collection = null;
    this._id = null;
  },

  /** Ancre le panneau sous le déclencheur (desktop/iPad). Sur mobile,
      la feuille basse est positionnée entièrement en CSS. */
  _position(triggerEl) {
    const panel = document.getElementById("group-picker-panel");
    if (!panel || !triggerEl || window.innerWidth <= 640) return;
    const r = triggerEl.getBoundingClientRect();
    const panelW = 240;
    let left = r.right - panelW;
    left = Math.max(8, Math.min(left, window.innerWidth - panelW - 8));
    const estHeight = Math.min(320, panel.offsetHeight || 220);
    let top = r.bottom + 6;
    if (top + estHeight > window.innerHeight - 8) {
      top = Math.max(8, r.top - estHeight - 6);
    }
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  },

  _render() {
    const panel = document.getElementById("group-picker-panel");
    if (!panel || !this._collection) return;
    const current = this._collection.groupsOf(this._id); // noms de dossiers

    // Liste transverse : dossiers + sous-groupes du registre partagé, pour
    // ranger une entité dans un dossier même si sa collection ne le contient
    // pas encore. Appartenance jointe par nom.
    let rows = "";
    for (const root of Dossiers.roots()) {
      rows += this._rowHtml(root, current, false);
      for (const child of Dossiers.children(root.id)) {
        rows += this._rowHtml(child, current, true);
      }
    }
    if (!rows)
      rows = `<div class="group-picker-empty">Aucun dossier pour l'instant.</div>`;

    panel.innerHTML = `
      <div class="group-picker-head">
        <span class="group-picker-title">Dossiers</span>
        <button class="btn-icon-tiny" data-action="close" aria-label="Fermer">✕</button>
      </div>
      <div class="group-picker-list">${rows}</div>
      <button class="group-picker-new" data-action="create">+ Nouveau dossier</button>`;
  },

  _rowHtml(node, currentNames, isSub) {
    const checked = currentNames.includes(node.name) ? "checked" : "";
    const nameEsc = CardRenderer._esc(node.name);
    return `<label class="group-picker-row${isSub ? " is-sub" : ""}">
      <input type="checkbox" ${checked} data-group="${nameEsc}">
      <span>${nameEsc}</span>
    </label>`;
  },

  /** Crée un groupe et y assigne directement l'entité courante. */
  createAndAssign() {
    const col = this._collection;
    if (!col) return;
    const id = this._id;
    Dialog.prompt({
      title: "Nouveau groupe",
      label: "Nom du groupe",
      placeholder: "ex. Gangers, Corpo, Renforts…",
      confirmLabel: "Créer",
    }).then((name) => {
      // Le popover a pu être fermé entre-temps : on revalide la cible.
      if (!name || !name.trim() || this._collection !== col || this._id !== id)
        return;
      const key = name.trim();
      if (key === "all") {
        toast("Nom réservé.", "warning");
        return;
      }
      if (col.data.groups[key]) {
        toast("Ce nom existe déjà.", "warning");
        return;
      }
      col.data.groups[key] = [id];
      col.save();
      col.render();
      this._render();
      toast(`Groupe "${key}" créé et entité ajoutée.`);
    });
  },
};
