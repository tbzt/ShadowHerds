"use strict";

/* ============================================================
   ENCOUNTER RENDERER — rendu pur du suivi de combat (round,
   liste ordonnée de combattants). Ne modifie rien, ne persiste
   rien : reçoit l'état + les PNJ déjà résolus, retourne du HTML.
   Toutes les interactions sont câblées par Encounter (contrôleur),
   jamais ici.
   ============================================================ */
const EncounterRenderer = {
  /** rows: [{ pnjId, init, hasActed, note, pnj }] — pnj peut être null
      (entité disparue depuis, ex. supprimée des Ombres) : la ligne est
      alors ignorée plutôt que de planter le rendu. */
  render(state, rows) {
    const roundEl = document.getElementById("encounter-round");
    if (roundEl) roundEl.textContent = state.round;

    const list = document.getElementById("encounter-list");
    if (!list) return;

    const visible = rows.filter((r) => r.pnj);
    if (!visible.length) {
      list.innerHTML = `<div class="empty-state">
        <span class="empty-state-title">Aucun combattant</span>
        Ajoutez des PNJ depuis leur carte (bouton « ⚔ Combat »).
      </div>`;
      return;
    }

    list.innerHTML = visible
      .map((r, i) => this._row(r, i === state.turnIndex))
      .join("");
  },

  _row(r, isActive) {
    const { pnjId, init, hasActed, note, pnj } = r;
    const initLabel = init == null ? "—" : String(init);

    return `<div class="encounter-row${isActive ? " active-turn" : ""}${hasActed ? " has-acted" : ""}" data-id="${pnjId}">
      <div class="encounter-init">
        <button class="btn-icon-tiny" data-action="roll-init" data-id="${pnjId}" title="Lancer l'initiative">⚄</button>
        <button class="encounter-init-val" data-action="edit-init" data-id="${pnjId}" title="Modifier l'initiative">${initLabel}</button>
      </div>
      <div class="encounter-main">
        <button class="encounter-name" data-action="focus-combatant" data-id="${pnjId}" title="Voir la fiche">${Utils.escHtml(pnj.name || "")}</button>
        <input type="text" class="encounter-note" placeholder="Note…" value="${Utils.escHtml(note || "")}"
          data-action="set-note" data-id="${pnjId}">
      </div>
      <div class="encounter-controls">
        <button class="btn-icon-tiny" data-action="move-up" data-id="${pnjId}" title="Monter" aria-label="Monter">▲</button>
        <button class="btn-icon-tiny" data-action="move-down" data-id="${pnjId}" title="Descendre" aria-label="Descendre">▼</button>
        <label class="encounter-acted" title="A joué ce round">
          <input type="checkbox" ${hasActed ? "checked" : ""} data-action="toggle-acted" data-id="${pnjId}">
        </label>
        <button class="btn-icon-tiny danger" data-action="remove-combatant" data-id="${pnjId}" title="Retirer">✕</button>
      </div>
    </div>`;
  },
};
