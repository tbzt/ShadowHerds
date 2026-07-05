"use strict";

/* ============================================================
   ENCOUNTER — tracker de combat (initiative, tours, rounds)
   Une seule scène active par édition, persistée via Storage.
   Ne stocke que des pnjId ; les PNJ résident dans leurs pools
   d'origine (Gen.pool / Shadows / Servers) et sont résolus via
   PnjLookup à chaque rendu. Le rendu (pur) est délégué à
   EncounterRenderer.
   ============================================================ */
const Encounter = {
  _KEY: "encounter_current",
  _empty() {
    return { round: 1, turnIndex: 0, combatants: [] };
  },

  state: null,

  /* ---- Persistance (édition-scopée, comme Shadows/Servers) ---- */
  load() {
    this.state = Storage.get(this._KEY, null) || this._empty();
  },
  save() {
    Storage.set(this._KEY, this.state);
  },

  _find(pnjId) {
    return this.state.combatants.find((c) => c.pnjId === pnjId) || null;
  },

  /* ---- Composition de la scène ---- */
  add(pnjId) {
    if (!pnjId || this._find(pnjId)) return;
    this.state.combatants.push({ pnjId, init: null, hasActed: false, note: "" });
    this._commit();
    toast("Ajouté au suivi de combat.");
  },

  remove(pnjId) {
    const idx = this.state.combatants.findIndex((c) => c.pnjId === pnjId);
    if (idx === -1) return;
    this.state.combatants.splice(idx, 1);
    const max = Math.max(0, this.state.combatants.length - 1);
    if (this.state.turnIndex > idx) this.state.turnIndex--;
    this.state.turnIndex = Utils.clamp(this.state.turnIndex, 0, max);
    this._commit();
  },

  clear() {
    if (!confirm("Vider la scène de combat ?")) return;
    this.state = this._empty();
    this._commit();
  },

  /* ---- Initiative ---- */
  setInit(pnjId, value) {
    const c = this._find(pnjId);
    if (!c) return;
    const n = parseInt(value, 10);
    c.init = Number.isFinite(n) ? n : null;
    this._commit();
  },

  /** Saisie manuelle (toujours possible, même pour les éditions sans
      initiative chiffrée comme Anarchy). */
  editInit(pnjId) {
    const c = this._find(pnjId);
    if (!c) return;
    const v = prompt("Initiative :", c.init != null ? String(c.init) : "");
    if (v === null) return;
    this.setInit(pnjId, v.trim());
  },

  /** Lance l'initiative via l'accesseur neutre du module d'édition
      (App.editionModule.initiativeFor) : jamais de lecture directe d'un
      champ pnj.init édition-spécifique ici (cf. CONTRIBUTING). */
  rollInit(pnjId) {
    const c = this._find(pnjId);
    const pnj = c && PnjLookup.find(pnjId);
    if (!c || !pnj) return;
    const spec = App.editionModule && App.editionModule.initiativeFor(pnj);
    if (!spec) {
      toast("Pas d'initiative chiffrée pour cette édition — classez ce PNJ manuellement (▲▼).");
      return;
    }
    // DiceRoller pose pnj.lastInit (champ neutre, déjà utilisé par les
    // cartes) : on le relit après le lancer plutôt que de recalculer.
    DiceRoller.rollInitiative(spec.base, spec.dice, pnjId);
    c.init = pnj.lastInit ? pnj.lastInit.total : c.init;
    this._commit();
  },

  /** Ne lance que les combattants sans initiative encore posée : ne
      recouvre jamais une valeur déjà lancée ou saisie à la main. */
  rollAllInit() {
    for (const c of this.state.combatants) {
      if (c.init == null) this.rollInit(c.pnjId);
    }
  },

  /** Tri automatique décroissant par initiative (confort quand la valeur
      existe) ; les combattants sans init (null) restent en fin de liste.
      Reset du tour courant au premier de la nouvelle liste. Le tri manuel
      (▲▼) reste le mécanisme de base pour Anarchy, sans init chiffrée. */
  sortByInit() {
    this.state.combatants.sort((a, b) => {
      if (a.init == null && b.init == null) return 0;
      if (a.init == null) return 1;
      if (b.init == null) return -1;
      return b.init - a.init;
    });
    this.state.turnIndex = 0;
    this._commit();
  },

  /* ---- Tri manuel (nécessaire : Anarchy n'a pas d'initiative chiffrée) ---- */
  moveUp(pnjId) {
    const idx = this.state.combatants.findIndex((c) => c.pnjId === pnjId);
    if (idx > 0) this._swap(idx, idx - 1);
  },
  moveDown(pnjId) {
    const idx = this.state.combatants.findIndex((c) => c.pnjId === pnjId);
    if (idx !== -1 && idx < this.state.combatants.length - 1) this._swap(idx, idx + 1);
  },
  _swap(i, j) {
    const arr = this.state.combatants;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    this._commit();
  },

  /* ---- Tours / rounds ---- */
  markActed(pnjId, acted) {
    const c = this._find(pnjId);
    if (!c) return;
    c.hasActed = !!acted;
    this._commit();
  },

  nextTurn() {
    const combatants = this.state.combatants;
    if (!combatants.length) return;
    const current = combatants[this.state.turnIndex];
    if (current) current.hasActed = true;
    const nextIdx = this.state.turnIndex + 1;
    if (nextIdx >= combatants.length) {
      this.nextRound();
      return;
    }
    this.state.turnIndex = nextIdx;
    this._commit();
  },

  nextRound() {
    this.state.round++;
    this.state.turnIndex = 0;
    this.state.combatants.forEach((c) => (c.hasActed = false));
    this._commit();
  },

  setNote(pnjId, text) {
    const c = this._find(pnjId);
    if (!c) return;
    c.note = text;
    // Pas de _commit() ici : un re-rendu complet ferait perdre le focus/
    // curseur du champ en cours de saisie. Sauvegarde silencieuse.
    this.save();
  },

  /** Ferme l'overlay, bascule sur le panel où vit réellement ce PNJ
      (Ombres / Générateur / Matrice) et le met en surbrillance — réutilise
      UI.focusOwner tel quel, aucune logique de moniteur dupliquée ici. */
  focusCombatant(pnjId) {
    this.close();
    const panel = Shadows.data.all.some((p) => p.id === pnjId)
      ? "shadows"
      : Servers.findSpider(pnjId)
        ? "matrix"
        : "generator";
    App.showPanel(panel);
    UI.focusOwner(pnjId);
  },

  /* ---- Rendu ---- */
  _rows() {
    return this.state.combatants.map((c) => ({ ...c, pnj: PnjLookup.find(c.pnjId) }));
  },
  _commit() {
    this.save();
    EncounterRenderer.render(this.state, this._rows());
  },

  /* ---- Overlay ---- */
  open() {
    document.getElementById("encounter-overlay").classList.add("open");
    EncounterRenderer.render(this.state, this._rows());
  },
  close() {
    const el = document.getElementById("encounter-overlay");
    if (el) el.classList.remove("open");
  },

  /** Délégation globale, scopée au conteneur (jamais recréé — modèle
      EditModal.init() : seul le contenu de #encounter-list change). */
  init() {
    const overlay = document.getElementById("encounter-overlay");
    if (!overlay) return;

    overlay.addEventListener("click", (e) => {
      const el = e.target.closest("[data-action]");
      if (!el) return;
      const id = el.dataset.id;
      switch (el.dataset.action) {
        case "encounter-close":
          this.close();
          break;
        case "roll-all-init":
          this.rollAllInit();
          break;
        case "sort-init":
          this.sortByInit();
          break;
        case "next-turn":
          this.nextTurn();
          break;
        case "next-round":
          this.nextRound();
          break;
        case "clear-encounter":
          this.clear();
          break;
        case "roll-init":
          this.rollInit(id);
          break;
        case "edit-init":
          this.editInit(id);
          break;
        case "move-up":
          this.moveUp(id);
          break;
        case "move-down":
          this.moveDown(id);
          break;
        case "remove-combatant":
          this.remove(id);
          break;
        case "focus-combatant":
          this.focusCombatant(id);
          break;
      }
    });

    overlay.addEventListener("change", (e) => {
      const el = e.target.closest('[data-action="toggle-acted"]');
      if (el) this.markActed(el.dataset.id, el.checked);
    });

    overlay.addEventListener("input", (e) => {
      const el = e.target.closest('[data-action="set-note"]');
      if (el) this.setNote(el.dataset.id, el.value);
    });
  },
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => Encounter.init());
} else {
  Encounter.init();
}
