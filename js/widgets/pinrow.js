"use strict";

/* ============================================================
   RANGÉE D'ÉPINGLES — une rangée d'accès rapide, pas un système :
   fiches du dossier ouvert (DossierBar.current) + fiches consultées via
   la palette en session. État 100% en mémoire (aucune clé
   Storage) — s'efface au rechargement, comme le dossier ouvert lui-même.

   Insérée dans le shell (index.html, entre #topbar et #main-body) donc
   visible sur tous les panneaux, y compris combat/Matrice, sans z-index
   ni position:fixed. Réutilise Palette._reveal pour la navigation — pas
   de 2ᵉ résolveur nom→panneau.
   ============================================================ */
import { CardRenderer } from "./cardrenderer.js";
import { DossierBar } from "./dossierbar.js";
import { Palette } from "./palette.js";

export const PinRow = {
  _MAX_CONSULTED: 12,
  _consulted: [], // [{id, type, name}], plus récent en tête
  _collapsed: false,

  // Correspondance type de résultat (Palette) ↔ collection porteuse.
  _TYPED_COLS: [
    { col: () => Shadows, type: "pnj" },
    { col: () => Characters, type: "pj" },
    { col: () => ContactsBook, type: "contact" },
    { col: () => Servers, type: "server" },
  ],

  init() {
    DossierBar.subscribe(() => this.render());
    const row = document.getElementById("pin-row");
    if (!row) return;
    row.addEventListener("click", (e) => {
      const toggle = e.target.closest('[data-action="pinrow-toggle"]');
      if (toggle) {
        this._collapsed = !this._collapsed;
        this.render();
        return;
      }
      const chip = e.target.closest("[data-pinrow-id]");
      if (chip) Palette._reveal({ id: chip.dataset.pinrowId, type: chip.dataset.pinrowType, name: chip.dataset.pinrowName });
    });
  },

  /** Appelé par Palette._reveal à chaque navigation explicite vers une
      fiche : c'est le seul signal de « consultation » retenu (garde-fou
      de sobriété — pas d'instrumentation de chaque rendu de carte). */
  noteConsulted(r) {
    if (!r || !r.id) return;
    this._consulted = this._consulted.filter((e) => e.id !== r.id);
    this._consulted.unshift({ id: r.id, type: r.type, name: r.name });
    this._consulted.length = Math.min(this._consulted.length, this._MAX_CONSULTED);
    this.render();
  },

  /** Membres du dossier ouvert (DossierBar.current), typés. Vide si
      « Tout » est sélectionné (pas de dossier ouvert). */
  _dossierEntries() {
    if (DossierBar.current === "all") return [];
    const out = [];
    for (const { col, type } of this._TYPED_COLS) {
      for (const id of DossierBar.memberIds(col())) {
        const e = PnjLookup.find(id);
        if (e) out.push({ id, type, name: e.name || "Sans nom" });
      }
    }
    return out;
  },

  /** L'équipe active (Characters.activeTeamMembers — tous les PJ
      par défaut, ou le dossier désigné) est épinglée en permanence, pas
      seulement quand son dossier est ouvert : « toujours à portée de
      pouce ». Réutilise le calcul existant, aucun 2ᵉ concept d'équipe. */
  _teamEntries() {
    if (typeof Characters === "undefined") return [];
    return Characters.activeTeamMembers().map((p) => ({ id: p.id, type: "pj", name: p.name || "Sans nom" }));
  },

  render() {
    const row = document.getElementById("pin-row");
    if (!row) return;
    const team = this._teamEntries();
    const seenTeam = new Set(team.map((e) => e.id));
    const dossier = this._dossierEntries().filter((e) => !seenTeam.has(e.id));
    const seen = new Set([...seenTeam, ...dossier.map((e) => e.id)]);
    const consulted = this._consulted.filter((e) => !seen.has(e.id));

    if (!team.length && !dossier.length && !consulted.length) {
      row.hidden = true;
      row.innerHTML = "";
      return;
    }
    row.hidden = false;

    if (this._collapsed) {
      const n = team.length + dossier.length + consulted.length;
      row.innerHTML = `<button class="pin-row-toggle" data-action="pinrow-toggle" aria-label="Déplier la rangée d'épingles"><svg class="icon icon-sm" aria-hidden="true"><use href="#ic-chevron"></use></svg> ${n} fiche${n > 1 ? "s" : ""}</button>`;
      return;
    }

    const label = DossierBar.currentNode()?.name;
    const chip = (e) => {
      // Avatar PJ constant (couleur+anneau+initiale), résolu une fois
      // par entrée — même entité que celle déjà chargée par PnjLookup
      // ci-dessus pour les entrées dossier ; retrouvée à la volée ici pour
      // team/consulted (listes courtes, coût négligeable).
      const avatar = e.type === "pj" ? CardRenderer._pcAvatar(PnjLookup.find(e.id)) : "";
      return `<button class="pin-chip" data-pinrow-id="${e.id}" data-pinrow-type="${e.type}" data-pinrow-name="${CardRenderer._esc(e.name)}" title="${CardRenderer._esc(e.name)}">${avatar}${CardRenderer._esc(e.name)}</button>`;
    };

    row.innerHTML = `
      <button class="pin-row-toggle" data-action="pinrow-toggle" aria-label="Replier la rangée d'épingles">▾</button>
      ${label ? `<span class="pin-row-label">${CardRenderer._esc(label)}</span>` : ""}
      <div class="pin-row-chips">
        ${team.map(chip).join("")}
        ${team.length && dossier.length ? `<span class="pin-row-sep"></span>` : ""}
        ${dossier.map(chip).join("")}
        ${consulted.length && (team.length || dossier.length) ? `<span class="pin-row-sep"></span>` : ""}
        ${consulted.map(chip).join("")}
      </div>`;
  },
};

/* Auto-init APRÈS le reste des scripts : `init()` dépend de modules de
   couche haute (Settings…) chargés plus loin dans index.html. Ne pas
   tester `readyState === "loading"` — il vaut déjà "interactive" quand
   les scripts différés s'exécutent, l'init partait donc trop tôt.
   DOMContentLoaded, lui, ne se déclenche qu'une fois TOUS les scripts
   différés exécutés. */
if (document.readyState === "complete") {
  PinRow.init();
} else {
  document.addEventListener("DOMContentLoaded", () => PinRow.init(), { once: true });
}

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.PinRow = PinRow;
