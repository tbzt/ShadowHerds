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
    return { round: 1, pass: 1, turnIndex: 0, combatants: [] };
  },

  state: null,

  /* ---- Persistance (édition-scopée, comme Shadows/Servers) ---- */
  load() {
    this.state = Storage.get(this._KEY, null) || this._empty();
    // Rétro-compat : scènes persistées avant l'ajout des passes d'initiative.
    if (this.state.pass == null) this.state.pass = 1;
    // La sidebar doit refléter la scène dès le chargement de l'édition, pas
    // seulement à l'ouverture du tracker — reset de la fiche active d'une
    // édition à l'autre (les pnjId ne collisionnent jamais entre éditions,
    // c'est une garde défensive plutôt qu'un cas réel).
    EncounterRenderer.resetActiveCard();
    this._render();
  },

  /** Règles de round de l'édition active (relance, passes) lues via
      l'API neutre du module d'édition — jamais de branche `App.edition`
      ici (cf. CONTRIBUTING). Défaut prudent : relance chaque round, sans
      passes, pour une édition qui ne déclarerait pas de combatModel. */
  _model() {
    return (
      (App.editionModule && App.editionModule.combatModel) || {
        rerollEachRound: true,
        passDecrement: 0,
      }
    );
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

  /** Ajout groupé (CH-Q8) : dédup, UN seul commit + UN seul toast. */
  addMany(ids) {
    let n = 0;
    for (const id of ids) {
      if (id && !this._find(id)) {
        this.state.combatants.push({ pnjId: id, init: null, hasActed: false, note: "" });
        n++;
      }
    }
    if (n) this._commit();
    toast(
      n
        ? `${n} combattant${n > 1 ? "s" : ""} ajouté${n > 1 ? "s" : ""} au suivi de combat.`
        : "Déjà dans le suivi de combat.",
    );
    return n;
  },

  /** PJ ad-hoc : le MJ suit les tours des joueurs sans fiche (elle vit chez
      le joueur). Combattant sans entité de pool, identifié par un pnjId
      synthétique `pj-…` et porteur de son propre nom + kind. Init en saisie
      inline dans la ligne ; jamais de dés stockés. Saisie du nom via le
      Dialog interne (jamais de prompt() natif). */
  async addPJ() {
    const name = await Dialog.prompt({
      title: "Ajouter un PJ",
      label: "Nom du PJ",
      placeholder: "Nom du personnage joueur",
      confirmLabel: "Ajouter",
    });
    if (name === null) return;
    const n = name.trim();
    if (!n) return;
    this.state.combatants.push({
      pnjId: "pj-" + Utils.uid(),
      name: n,
      kind: "pj",
      init: null,
      hasActed: false,
      note: "",
    });
    this._commit();
  },

  /** Entités ajoutables depuis le tracker : exactement les pools que
      PnjLookup sait résoudre (générés, Ombres portées, personnages
      jouables, spiders Matrice), moins ceux déjà en scène. Esprits
      libres et créatures générés vivent aussi dans Gen.pool, donc
      listés ici. */
  _candidates() {
    const inScene = new Set(this.state.combatants.map((c) => c.pnjId));
    const all = [
      ...Gen.pool,
      ...Shadows.data.all,
      ...Characters.data.all,
      ...Servers.data.all.map((s) => s.spider).filter(Boolean),
    ];
    const seen = new Set();
    return all.filter((p) => {
      if (!p || inScene.has(p.id) || seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
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

  async clear() {
    const ok = await Dialog.confirm({
      title: "Vider la scène",
      message: "Retirer tous les combattants de la scène ?",
      confirmLabel: "Vider",
      danger: true,
    });
    if (!ok) return;
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

  /** Lance l'initiative via l'accesseur neutre du module d'édition
      (App.editionModule.initiativeFor) : jamais de lecture directe d'un
      champ pnj.init édition-spécifique ici (cf. CONTRIBUTING). */
  /** Cœur du lancer d'initiative, sans re-rendu : réutilisé en boucle par
      rollAllInit et nextRound (un seul _commit en fin). Retourne true si une
      initiative chiffrée a bien été posée. */
  _rollInit(pnjId, silent) {
    const c = this._find(pnjId);
    const pnj = c && PnjLookup.find(pnjId);
    if (!c || !pnj) return false; // PJ ad-hoc / entité disparue : init manuelle conservée
    const spec = App.editionModule && App.editionModule.initiativeFor(pnj);
    if (!spec) {
      if (!silent) toast("Pas d'initiative chiffrée pour cette édition — classez ce PNJ manuellement (▲▼).");
      return false;
    }
    // DiceRoller pose pnj.lastInit (champ neutre, déjà utilisé par les
    // cartes) : on le relit après le lancer plutôt que de recalculer.
    // silent (lancer groupé) : pas d'overlay de tirage — les N overlays
    // s'écraseraient et seul le dernier resterait visible ; les scores
    // s'affichent directement dans la liste du suivi.
    DiceRoller.rollInitiative(spec.base, spec.dice, pnjId, "", { silent });
    c.init = pnj.lastInit ? pnj.lastInit.total : c.init;
    return true;
  },

  rollInit(pnjId) {
    this._rollInit(pnjId);
    this._commit();
  },

  /** Ne lance que les combattants sans initiative encore posée : ne
      recouvre jamais une valeur déjà lancée ou saisie à la main. Lancer
      groupé silencieux (pas d'overlay par combattant) : les scores
      apparaissent directement dans la liste, on confirme d'un toast. */
  rollAllInit() {
    let rolled = 0;
    for (const c of this.state.combatants) {
      if (c.init == null && this._rollInit(c.pnjId, true)) rolled++;
    }
    this._commit();
    toast(
      rolled
        ? `Initiative lancée (${rolled} combattant${rolled > 1 ? "s" : ""}).`
        : "Rien à lancer : initiatives déjà posées ou saisie manuelle requise.",
    );
  },

  /** Tri automatique décroissant par initiative (confort quand la valeur
      existe) ; les combattants sans init (null) restent en fin de liste.
      Reset du tour courant au premier de la nouvelle liste. Le tri manuel
      (▲▼) reste le mécanisme de base pour Anarchy, sans init chiffrée. */
  _sortInPlace() {
    this.state.combatants.sort((a, b) => {
      if (a.init == null && b.init == null) return 0;
      if (a.init == null) return 1;
      if (b.init == null) return -1;
      return b.init - a.init;
    });
  },

  sortByInit() {
    this._sortInPlace();
    this.state.turnIndex = this._firstEligibleIndex();
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

  /** Déplace le combattant actif (celui dont c'est le tour) d'un cran et
      garde le tour sur lui — pilotage clavier ↑/↓ (CH-Q3). */
  moveActive(dir) {
    const cs = this.state.combatants;
    const i = this.state.turnIndex;
    const j = i + dir;
    if (j < 0 || j >= cs.length) return;
    [cs[i], cs[j]] = [cs[j], cs[i]];
    this.state.turnIndex = j;
    this._commit();
  },

  /* ---- Tours / rounds / passes d'initiative ---- */
  markActed(pnjId, acted) {
    const c = this._find(pnjId);
    if (!c) return;
    c.hasActed = !!acted;
    this._commit();
  },

  /** Un combattant agit-il dans la passe courante ? Sans passes
      (passDecrement falsy, ex. SR6/Anarchy) tout le monde est éligible.
      Avec passes (SR5) : score effectif = init − (passe−1)×décrément, > 0. */
  _eligible(c) {
    const dec = this._model().passDecrement;
    if (!dec) return true;
    return c.init != null && c.init - (this.state.pass - 1) * dec > 0;
  },

  _firstEligibleIndex() {
    return this._nextEligibleIndex(-1);
  },
  _nextEligibleIndex(after) {
    const cs = this.state.combatants;
    for (let i = after + 1; i < cs.length; i++) {
      if (this._eligible(cs[i])) return i;
    }
    return -1;
  },

  nextTurn() {
    const cs = this.state.combatants;
    if (!cs.length) return;
    const current = cs[this.state.turnIndex];
    if (current) current.hasActed = true;

    const next = this._nextEligibleIndex(this.state.turnIndex);
    if (next !== -1) {
      this.state.turnIndex = next;
      this._commit();
      return;
    }

    // Fin de la passe courante. Une passe suivante existe (SR5) si un
    // combattant garde un score effectif > 0 après un nouveau −décrément.
    const dec = this._model().passDecrement;
    if (dec && cs.some((c) => c.init != null && c.init - this.state.pass * dec > 0)) {
      this.state.pass++;
      cs.forEach((c) => (c.hasActed = false));
      this.state.turnIndex = this._firstEligibleIndex();
      this._commit();
      toast("Passe d'initiative " + this.state.pass);
      return;
    }
    this.nextRound();
  },

  nextRound() {
    const model = this._model();
    this.state.round++;
    this.state.pass = 1;
    this.state.combatants.forEach((c) => (c.hasActed = false));
    // SR5/SR6 : nouvelle initiative à chaque tour de combat. Anarchy
    // (rerollEachRound:false) conserve l'ordre rangé à la main.
    if (model.rerollEachRound) {
      for (const c of this.state.combatants) this._rollInit(c.pnjId, true);
      this._sortInPlace();
    }
    this.state.turnIndex = this._firstEligibleIndex();
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
    // PJ ad-hoc / entité disparue : pas de fiche à afficher.
    if (!PnjLookup.find(pnjId)) return;
    this.close();
    const panel = Shadows.data.all.some((p) => p.id === pnjId)
      ? "shadows"
      : Servers.findSpider(pnjId)
        ? "matrix"
        : "generator";
    App.showPanel(panel);
    UI.focusOwner(pnjId);
  },

  /* ---- Moniteurs (réutiliser un PNJ « frais ») ---- */
  /** Remet à zéro tous les moniteurs d'un PNJ : générique et édition-
      agnostique (toute clé finissant par « Filled » — phys/stun/mon/ment/
      mat, léger/grave/incap Anarchy), donc aucune branche d'édition ici.
      C'est l'opération inverse d'UI.toggleMonitor et suit le même chemin de
      persistance. Retourne true si un moniteur a réellement été effacé. */
  _resetMonitors(pnj) {
    if (!pnj) return false;
    let changed = false;
    for (const k of Object.keys(pnj)) {
      if (k.endsWith("Filled") && pnj[k]) {
        pnj[k] = 0;
        changed = true;
      }
    }
    return changed;
  },

  /** Bouton « réinitialiser les moniteurs » d'une carte de combat. */
  healCombatant(pnjId) {
    const pnj = PnjLookup.find(pnjId);
    if (!this._resetMonitors(pnj)) return;
    Shadows.save();
    CardRenderer.refresh(pnj);
    toast("Moniteurs réinitialisés.");
  },

  /** Fin de scène : soigne tous les combattants résolvables d'un coup. */
  async healAll() {
    const ok = await Dialog.confirm({
      title: "Fin de scène",
      message: "Réinitialiser les moniteurs de tous les combattants (les remettre « frais ») ?",
      confirmLabel: "Tout soigner",
    });
    if (!ok) return;
    let n = 0;
    for (const c of this.state.combatants) {
      const pnj = PnjLookup.find(c.pnjId);
      if (this._resetMonitors(pnj)) {
        CardRenderer.refresh(pnj);
        n++;
      }
    }
    if (n) Shadows.save();
    toast(
      n
        ? `Moniteurs réinitialisés (${n} combattant${n > 1 ? "s" : ""}).`
        : "Aucun moniteur à réinitialiser.",
    );
  },

  /* ---- Rendu ---- */
  _rows() {
    return this.state.combatants.map((c) => ({
      ...c,
      // Un PJ ad-hoc n'est résolu par aucun pool : on synthétise l'objet
      // d'affichage minimal (nom + drapeau _adhoc) pour ne jamais le filtrer.
      pnj: PnjLookup.find(c.pnjId) || (c.name ? { id: c.pnjId, name: c.name, _adhoc: true } : null),
    }));
  },
  /** Rendu complet (liste, fiche du combattant actif, résumé sidebar) —
      factorisé pour être appelable aussi bien après un commit qu'au
      chargement initial de l'édition (sidebar à jour sans ouvrir le
      tracker). */
  _render() {
    const rows = this._rows();
    const model = this._model();
    EncounterRenderer.render(this.state, rows, model);
    EncounterRenderer.renderActiveCard(rows, this.state);
    EncounterRenderer.renderSidebar(this.state, rows, model);
  },
  _commit() {
    this.save();
    this._render();
    this._renderPicker();
  },

  /** Ne (re)rend le panneau d'ajout que s'il est ouvert : évite de recalculer
      la liste des candidats à chaque commit inutilement. */
  _renderPicker() {
    const panel = document.getElementById("encounter-add-panel");
    if (panel && !panel.hidden) EncounterRenderer.renderPicker(this._candidates());
  },

  toggleAddPicker() {
    const panel = document.getElementById("encounter-add-panel");
    if (!panel) return;
    panel.hidden = !panel.hidden;
    if (!panel.hidden) EncounterRenderer.renderPicker(this._candidates());
  },

  /* ---- Overlay ---- */
  open() {
    const overlay = document.getElementById("encounter-overlay");
    overlay.classList.add("open");
    // CH-M4 : dock latéral non bloquant ≥641px (le Hub reste utilisable
    // derrière, ex. suivre une intrusion en cours) ; plein écran réel en
    // dessous (pas de place pour cohabiter) — aria-modal reflète lequel.
    overlay.setAttribute(
      "aria-modal",
      window.matchMedia("(max-width: 640px)").matches ? "true" : "false",
    );
    this._render();
    this._renderPicker();
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
        case "toggle-add-picker":
          this.toggleAddPicker();
          break;
        case "add-candidate":
          this.add(id);
          this._renderPicker();
          break;
        case "add-pj":
          this.addPJ();
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
        case "move-up":
          this.moveUp(id);
          break;
        case "move-down":
          this.moveDown(id);
          break;
        case "remove-combatant":
          this.remove(id);
          break;
        case "heal-combatant":
          this.healCombatant(id);
          break;
        case "heal-all":
          this.healAll();
          break;
        case "focus-combatant":
          this.focusCombatant(id);
          break;
      }
    });

    overlay.addEventListener("change", (e) => {
      const acted = e.target.closest('[data-action="toggle-acted"]');
      if (acted) {
        this.markActed(acted.dataset.id, acted.checked);
        return;
      }
      // Initiative saisie inline dans la ligne (remplace l'ancien prompt) :
      // 'change' plutôt que 'input' — la valeur n'est committée qu'au blur/
      // Entrée, donc le re-rendu de _commit ne casse pas la frappe en cours.
      const init = e.target.closest('[data-action="set-init"]');
      if (init) this.setInit(init.dataset.id, init.value);
    });

    overlay.addEventListener("input", (e) => {
      const note = e.target.closest('[data-action="set-note"]');
      if (note) {
        this.setNote(note.dataset.id, note.value);
        return;
      }
      const filter = e.target.closest('[data-action="filter-candidates"]');
      if (filter) EncounterRenderer.filterCandidates(filter.value);
    });

    // Raccourcis clavier du tracker (CH-Q3), actifs seulement overlay ouvert.
    // En capture pour passer AVANT les raccourcis globaux d'app.js — sinon
    // « r » y déclenche le lanceur de dés au lieu de relancer l'init.
    // Garde-fous : jamais pendant une saisie (champ init/note) ni quand un
    // Dialog est ouvert par-dessus. Échap n'est pas capté ici : il retombe
    // sur le handler global d'app.js, qui ferme l'overlay.
    document.addEventListener(
      "keydown",
      (e) => {
        if (!overlay.classList.contains("open")) return;
        const tag = (e.target.tagName || "").toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select") return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const dlg = document.getElementById("dialog-overlay");
        if (dlg && dlg.classList.contains("open")) return;

        let handled = true;
        switch (e.key) {
          case " ":
          case "n":
          case "N":
            this.nextTurn();
            break;
          case "r":
          case "R":
            this.rollAllInit();
            break;
          case "ArrowUp":
            this.moveActive(-1);
            break;
          case "ArrowDown":
            this.moveActive(1);
            break;
          default:
            handled = false;
        }
        if (handled) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      },
      true,
    );
  },
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => Encounter.init());
} else {
  Encounter.init();
}
